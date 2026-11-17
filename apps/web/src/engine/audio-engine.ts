// Main-thread side of the audio path. Owns the AudioContext, picks a
// runtime for the core and forwards patterns, transport, clock, RMX-1000 DSP,
// and per-voice FX messages to EngineHost; reports playhead, meter, armed
// quantized launch, and phase-error sync telemetry back. See ADR-0010.

import hostSource from "./host.js?raw";
import workletSource from "./worklet.js?raw";
import { EngineHost, type CoreApi, type HostEvent, type HostMessage } from "./host.js";
import { defaultRmxState, type RmxState } from "./rmx-fx";
import { TimeMap } from "./timemap";
import type { PatternSpec } from "../spec";
import { VOICE_IDS, type VoiceId } from "../voices";
import wasmBase64 from "virtual:player5/wasm";
import wasmUrl from "virtual:player5/wasm-url";

export type EngineMode = "worklet" | "script" | "js";
export type AudioState = "idle" | "starting" | "running" | "failed";

export interface EngineStatus {
  step: number;
  peak: number;
  tempo: number;
  beat: number;
  locked: boolean;
  armed: boolean;
  phaseErrorMs: number;
  position: number;
}

export interface AudioEvents {
  onState(state: AudioState, detail?: string): void;
  onStep(step: number): void;
  onStatus(status: EngineStatus): void;
}

export interface AudioOutputInfo {
  deviceId: string;
  label: string;
}

/** ScriptProcessor buffer: ~43 ms at 48 kHz, well inside the 100 ms lookahead. */
const SCRIPT_BUFFER = 2048;
const READY_TIMEOUT_MS = 4000;

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Compiles the core. Throws when WebAssembly is unavailable or blocked by CSP. */
async function compileWasm(): Promise<WebAssembly.Module> {
  if (typeof WebAssembly !== "object") throw new Error("no WebAssembly");
  if (__P5_SINGLE__) {
    if (!wasmBase64) throw new Error("wasm not embedded");
    return WebAssembly.compile(base64ToBytes(wasmBase64));
  } else {
    const url = new URL(wasmUrl, document.baseURI).href;
    try {
      return await WebAssembly.compileStreaming(fetch(url));
    } catch (err) {
      if (err instanceof WebAssembly.CompileError) throw err;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`player5.wasm: HTTP ${res.status}`);
      return WebAssembly.compile(await res.arrayBuffer());
    }
  }
}

async function loadJsCore(): Promise<CoreApi> {
  const { createCore } = await import("virtual:player5/core-js");
  return createCore() as CoreApi;
}

export function requestedMode(): EngineMode | null {
  try {
    const m = new URLSearchParams(location.search).get("engine");
    return m === "worklet" || m === "script" || m === "js" ? m : null;
  } catch {
    return null;
  }
}

export function sinkSelectionSupported(): boolean {
  if (__P5_SINGLE__) return false;
  return (
    typeof AudioContext === "function" &&
    "setSinkId" in AudioContext.prototype &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.enumerateDevices
  );
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private node: AudioNode | null = null;
  private worklet: AudioWorkletNode | null = null;
  private script: ScriptProcessorNode | null = null;
  private host: EngineHost | null = null;
  private extStream: MediaStream | null = null;
  private extSource: MediaStreamAudioSourceNode | null = null;
  private rmxState: RmxState = defaultRmxState();
  private gridMeta = { shuffle: 0, lastStep: 16 };
  private voiceFxLevel = 0.75;
  private rollOverdubHandler:
    | ((voice: VoiceId, stepIdx: number, accent: boolean, pitch: number) => void)
    | null = null;
  private nextPadReqId = 1;
  private pendingPadResolvers = new Map<number, (stepIdx: number) => void>();
  private pendingMidi: Array<{ code: number; ms: number }> = [];
  private startPromise: Promise<void> | null = null;
  private wasm: Promise<WebAssembly.Module> | null = null;
  private timeMap: TimeMap | null = null;
  // Desired state, replayed whenever a runtime comes up.
  private patternBytes: Uint8Array | null = null;
  private clockMode = 0;
  private nudgeMs = 0;
  private latencyMs = 0;
  private sinkId = "";
  private wantPlaying = false;
  private quantizedLaunch = false;
  /** What the current runtime was last told (start/stop). */
  private runtimePlaying = false;
  private voiceSamples: Array<{ pcm: Float32Array; name: string } | null> = new Array(10).fill(null);
  private sampleMeta: Record<string, unknown> | null = null;
  private decodeCtx: AudioContext | null = null;

  state: AudioState = "idle";
  mode: EngineMode | null = null;
  lastStatus: EngineStatus | null = null;

  constructor(private readonly events: AudioEvents) {}

  get sampleRate(): number | null {
    return this.ctx?.sampleRate ?? null;
  }

  get playing(): boolean {
    return this.wantPlaying;
  }

  get armed(): boolean {
    return this.wantPlaying && (this.lastStatus?.armed ?? false);
  }

  get running(): boolean {
    return this.state === "running";
  }

  setQuantizedLaunch(enabled: boolean): void {
    this.quantizedLaunch = enabled;
  }

  get isQuantizedLaunch(): boolean {
    return this.quantizedLaunch;
  }

  prepare(): void {
    if (requestedMode() === "js") return;
    this.wasmModule().catch(() => {
      /* reported when Play falls back to another runtime */
    });
  }

  private wasmModule(): Promise<WebAssembly.Module> {
    if (!this.wasm) {
      const pending = compileWasm();
      this.wasm = pending;
      pending.catch((err: unknown) => {
        if (this.wasm === pending && !(err instanceof WebAssembly.CompileError)) this.wasm = null;
      });
    }
    return this.wasm;
  }

  ensureStarted(): Promise<void> {
    if (this.ctx && this.state === "running") {
      return this.ctx.state === "running" ? Promise.resolve() : this.ctx.resume();
    }
    if (!this.startPromise) {
      let ctx: AudioContext;
      try {
        ctx = new AudioContext({ latencyHint: "interactive" });
      } catch (err) {
        this.setState("failed", err instanceof Error ? err.message : String(err));
        return Promise.reject(err);
      }
      this.ctx = ctx;
      this.startPromise = this.boot(ctx).catch((err: unknown) => {
        this.teardown(err instanceof Error ? err.message : String(err));
        throw err;
      });
    }
    return this.startPromise;
  }

  private async boot(ctx: AudioContext): Promise<void> {
    this.setState("starting");
    this.timeMap = new TimeMap(ctx);
    const resumed = ctx.resume().catch(() => {});
    if (this.sinkId && "setSinkId" in ctx) {
      void (ctx as AudioContext & { setSinkId(id: string): Promise<void> })
        .setSinkId(this.sinkId)
        .catch(() => {});
    }
    const forced = requestedMode();
    let module: WebAssembly.Module | null = null;
    let wasmError: unknown = null;
    if (forced !== "js") {
      try {
        module = await this.wasmModule();
      } catch (err) {
        wasmError = err;
        if (forced) throw err;
      }
    }
    if (module && (forced === null || forced === "worklet")) {
      try {
        await this.startWorklet(ctx, module);
        this.mode = "worklet";
      } catch (err) {
        if (forced === "worklet") throw err;
        console.info("player5: AudioWorklet unavailable, rendering on the main thread:", err);
      }
    }
    if (!this.mode && module) {
      const api = (await WebAssembly.instantiate(module, {})).exports as unknown as CoreApi;
      this.startScript(ctx, api);
      this.mode = "script";
    }
    if (!this.mode) {
      const api = await loadJsCore();
      this.startScript(ctx, api);
      this.mode = "js";
      if (wasmError) console.info("player5: WebAssembly unavailable, using the JavaScript core:", wasmError);
    }
    this.replay();
    await resumed;
    if (ctx.state !== "running") await ctx.resume();
    this.setState("running");
  }

  private async startWorklet(ctx: AudioContext, module: WebAssembly.Module): Promise<void> {
    if (!ctx.audioWorklet) throw new Error("AudioWorklet unavailable (insecure context?)");
    const blob = new Blob([hostSource, "\n", workletSource], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    try {
      await ctx.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    const node = new AudioWorkletNode(ctx, "player5", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      processorOptions: { module },
    });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("worklet did not start")), READY_TIMEOUT_MS);
      node.onprocessorerror = () => {
        clearTimeout(timer);
        reject(new Error("worklet processor error"));
      };
      node.port.onmessage = (e: MessageEvent<HostEvent>) => {
        if (e.data.type === "ready") {
          clearTimeout(timer);
          resolve();
        } else if (e.data.type === "error") {
          clearTimeout(timer);
          reject(new Error(e.data.message));
        }
      };
    }).catch((err: unknown) => {
      node.port.onmessage = null;
      throw err;
    });
    node.port.onmessage = (e: MessageEvent<HostEvent>) => this.onHostEvent(e.data);
    node.onprocessorerror = () => this.teardown("audio worklet crashed; press Play to restart");
    node.connect(ctx.destination);
    this.worklet = node;
    this.node = node;
  }

  private startScript(ctx: AudioContext, api: CoreApi): void {
    const host = new EngineHost(api, ctx.sampleRate, (msg) => this.onHostEvent(msg));
    this.host = host;
    this.attachScriptNode(ctx, host, 0);
  }

  private attachScriptNode(ctx: AudioContext, host: EngineHost, inputs: 0 | 2): void {
    if (this.script) {
      this.script.onaudioprocess = null;
      try {
        this.script.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    const node = ctx.createScriptProcessor(SCRIPT_BUFFER, inputs, 2);
    node.onaudioprocess = (e: AudioProcessingEvent) => {
      const out = e.outputBuffer;
      const inp = e.inputBuffer;
      const inL = inputs > 0 && inp.numberOfChannels > 0 ? inp.getChannelData(0) : null;
      const inR = inputs > 0 && inp.numberOfChannels > 1 ? inp.getChannelData(1) : inL;
      let pair: [Float32Array, Float32Array];
      try {
        pair = host.processStereo(out.length, Math.round(e.playbackTime * ctx.sampleRate), inL, inR);
      } catch (err) {
        node.onaudioprocess = null;
        queueMicrotask(() => this.teardown(`engine error: ${err instanceof Error ? err.message : String(err)}`));
        return;
      }
      out.getChannelData(0).set(pair[0]);
      if (out.numberOfChannels > 1) out.getChannelData(1).set(pair[1]);
    };
    node.connect(ctx.destination);
    this.script = node;
    this.node = node;
  }

  private teardown(detail: string): void {
    const ctx = this.ctx;
    if (this.worklet) {
      this.worklet.port.onmessage = null;
      this.worklet.onprocessorerror = null;
    }
    if (this.script) this.script.onaudioprocess = null;
    this.stopExternalInputStream();
    try {
      this.node?.disconnect();
    } catch {
      /* already disconnected */
    }
    for (const resolve of this.pendingPadResolvers.values()) resolve(-1);
    this.pendingPadResolvers.clear();
    this.pendingMidi.length = 0;
    this.worklet = null;
    this.script = null;
    this.host = null;
    this.node = null;
    this.timeMap = null;
    this.ctx = null;
    this.startPromise = null;
    this.mode = null;
    this.lastStatus = null;
    this.wantPlaying = false;
    this.runtimePlaying = false;
    if (ctx) void ctx.close().catch(() => {});
    this.events.onStep(-1);
    this.setState("failed", detail);
  }

  private replay(): void {
    if (this.patternBytes) this.send({ type: "pattern", bytes: this.patternBytes });
    this.send({ type: "grid-meta", shuffle: this.gridMeta.shuffle, lastStep: this.gridMeta.lastStep });
    this.send({ type: "latency", ms: this.latencyMs });
    this.send({ type: "nudge", ms: this.nudgeMs });
    this.send({ type: "clock-mode", mode: this.clockMode });
    this.send({ type: "vfx-level", level: this.voiceFxLevel });
    this.send({ type: "rmx-state", state: this.rmxState as unknown as Record<string, unknown> });
    if (this.sampleMeta) this.send({ type: "sample-meta", meta: this.sampleMeta });
    for (let i = 0; i < this.voiceSamples.length; i++) {
      const s = this.voiceSamples[i];
      if (s) this.send({ type: "set-voice-sample", voiceIdx: i, pcm: s.pcm, name: s.name });
    }
    this.runtimePlaying = false;
    this.syncTransport();
  }

  private syncTransport(): void {
    if (!this.worklet && !this.host) return;
    if (this.wantPlaying === this.runtimePlaying) return;
    this.runtimePlaying = this.wantPlaying;
    if (this.wantPlaying) {
      if (this.quantizedLaunch && this.clockMode > 0) {
        this.send({ type: "start-quantized", quantum: 4 });
      } else {
        this.send({ type: "start" });
      }
    } else {
      this.send({ type: "stop" });
    }
  }

  private send(msg: HostMessage): void {
    if (this.worklet) this.worklet.port.postMessage(msg);
    else if (this.host) this.host.onMessage(msg);
  }

  private onHostEvent(msg: HostEvent): void {
    switch (msg.type) {
      case "offset":
        if (this.timeMap) this.timeMap.offset = msg.offset;
        this.flushPendingMidi();
        break;
      case "step":
        this.events.onStep(this.wantPlaying ? msg.step : -1);
        break;
      case "status": {
        const { type: _t, offset, ...status } = msg;
        this.lastStatus = status;
        if (this.timeMap) {
          this.timeMap.offset = offset;
          this.timeMap.sample();
        }
        this.flushPendingMidi();
        this.events.onStatus(status);
        break;
      }
      case "pad-triggered": {
        const resolve = this.pendingPadResolvers.get(msg.id);
        if (resolve) {
          this.pendingPadResolvers.delete(msg.id);
          resolve(msg.stepIdx);
        }
        break;
      }
      case "overdub": {
        const voice = VOICE_IDS[msg.voiceIdx];
        if (voice && this.rollOverdubHandler) {
          this.rollOverdubHandler(voice, msg.stepIdx, msg.accent, msg.pitch);
        }
        break;
      }
      case "error":
        if (msg.fatal === false) console.warn("player5:", msg.message);
        else this.teardown(msg.message);
        break;
      case "ready":
        break;
    }
  }

  // ---- control surface -------------------------------------------------

  setPattern(bytes: Uint8Array): void {
    this.patternBytes = bytes;
    this.send({ type: "pattern", bytes });
  }

  async play(): Promise<void> {
    this.wantPlaying = true;
    this.syncTransport();
    try {
      await this.ensureStarted();
    } catch (err) {
      this.wantPlaying = false;
      throw err;
    }
    this.syncTransport();
  }

  stop(): void {
    this.wantPlaying = false;
    this.syncTransport();
    if (this.lastStatus) this.lastStatus.armed = false;
    this.events.onStep(-1);
  }

  /** Clock mode code (core/ffi table): 0 internal, 1..4 follow precision. */
  setClockMode(mode: number): void {
    if (mode === 0) this.pendingMidi.length = 0;
    if (mode === this.clockMode) return;
    this.clockMode = mode;
    this.send({ type: "clock-mode", mode });
  }

  setNudgeMs(ms: number): void {
    this.nudgeMs = ms;
    this.send({ type: "nudge", ms });
  }

  setLatencyMs(ms: number): void {
    this.latencyMs = ms;
    this.send({ type: "latency", ms });
  }

  resync(): void {
    this.send({ type: "resync" });
  }

  /** Triggers an audible Sync Calibration click through the engine output. */
  async triggerSyncClick(): Promise<void> {
    await this.ensureStarted();
    this.send({ type: "sync-click" });
  }

  /** Triggers one of the 10 active Rust drum voices live (Shift+1..0 audition). */
  async triggerVoice(voice: VoiceId, velocity = 0.95): Promise<void> {
    await this.ensureStarted();
    const voiceIdx = Math.max(0, VOICE_IDS.indexOf(voice));
    this.send({ type: "trigger-voice", voiceIdx, velocity });
  }

  /** Selects Chrome/Edge audio output device via AudioContext.setSinkId. */
  async setAudioOutputDevice(sinkId: string): Promise<boolean> {
    this.sinkId = sinkId;
    if (!this.ctx || !("setSinkId" in this.ctx)) return false;
    try {
      await (this.ctx as AudioContext & { setSinkId(id: string): Promise<void> }).setSinkId(sinkId);
      return true;
    } catch {
      return false;
    }
  }

  async listAudioOutputs(): Promise<AudioOutputInfo[]> {
    if (!sinkSelectionSupported()) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((d) => d.kind === "audiooutput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || (d.deviceId === "default" ? "System Default Output" : `Output ${i + 1}`),
        }));
    } catch {
      return [];
    }
  }

  /** Routes live external stereo audio (soundcard/loopback) into the RMX-1000 DSP bus. */
  async setExternalInput(enabled: boolean): Promise<boolean> {
    if (__P5_SINGLE__) return false;
    if (!enabled) {
      this.stopExternalInputStream();
      this.send({ type: "ext-gain", gain: 0 });
      return false;
    }
    try {
      await this.ensureStarted();
      if (!this.ctx || !this.node || !navigator.mediaDevices?.getUserMedia) return false;
      this.stopExternalInputStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      if (this.script && this.host) {
        this.attachScriptNode(this.ctx, this.host, 2);
      }
      const src = this.ctx.createMediaStreamSource(stream);
      src.connect(this.node!);
      this.extStream = stream;
      this.extSource = src;
      this.send({ type: "ext-gain", gain: 1 });
      return true;
    } catch {
      this.stopExternalInputStream();
      this.send({ type: "ext-gain", gain: 0 });
      return false;
    }
  }

  private stopExternalInputStream(): void {
    const hadSource = this.extSource !== null;
    try {
      this.extSource?.disconnect();
    } catch {
      /* ignore */
    }
    this.extSource = null;
    if (this.extStream) {
      for (const track of this.extStream.getTracks()) track.stop();
      this.extStream = null;
    }
    if (hadSource && this.script && this.host && this.ctx) {
      this.attachScriptNode(this.ctx, this.host, 0);
    }
  }

  engineSampleAt(ms: number): number | null {
    return this.state === "running" ? (this.timeMap?.engineSampleAt(ms) ?? null) : null;
  }

  beatHeardAt(ms: number): number | null {
    const s = this.lastStatus;
    const sample = this.engineSampleAt(ms);
    const sr = this.sampleRate;
    if (!s || sample === null || !sr) return null;
    return s.beat + ((sample - s.position) / sr) * (s.tempo / 60);
  }

  observe(ms: number, kind: number, phase: number, bpm: number): boolean {
    const sample = this.engineSampleAt(ms);
    if (sample === null) return false;
    this.send({ type: "observe", sample, kind, phase, bpm });
    return true;
  }

  private flushPendingMidi(): void {
    if (!this.pendingMidi.length) return;
    if (this.engineSampleAt(performance.now()) === null) return;
    const queued = this.pendingMidi.splice(0);
    for (const item of queued) {
      const sample = this.engineSampleAt(item.ms);
      if (sample !== null) this.send({ type: "midi", code: item.code, sample });
    }
  }

  midi(code: number, ms: number): boolean {
    this.flushPendingMidi();
    const sample = this.engineSampleAt(ms);
    if (sample === null) {
      if (this.state === "starting" || this.state === "running") {
        if (code === 1) this.pendingMidi.length = 0;
        if (this.pendingMidi.length < 256) this.pendingMidi.push({ code, ms });
      }
      return false;
    }
    this.send({ type: "midi", code, sample });
    return true;
  }

  tap(ms: number): boolean {
    const sample = this.engineSampleAt(ms);
    if (sample === null) return false;
    this.send({ type: "tap", sample });
    return true;
  }

  /** Applies Pioneer RMX-1000 Scene FX, Isolator FX, X-Pad and Release FX parameters. */
  setRmxState(state: RmxState, eventTimeMs?: number): void {
    const wasRolling = this.rmxState.xpadRolling;
    this.rmxState = { ...state };
    const now = performance.now();
    const ts =
      typeof eventTimeMs === "number" && eventTimeMs > 0 && Math.abs(now - eventTimeMs) < 2000
        ? eventTimeMs
        : now;
    const rollStartHeardBeat =
      !wasRolling && state.xpadRolling ? (this.beatHeardAt(ts) ?? -1) : -1;
    this.send({
      type: "rmx-state",
      state: {
        ...(this.rmxState as unknown as Record<string, unknown>),
        rollStartHeardBeat,
      },
    });
  }

  /** Synchronizes shuffle and polymetric loop length with EngineHost RMX quantizer. */
  setKit(_kitId: string, spec: PatternSpec): void {
    this.gridMeta = {
      shuffle: spec.shuffle || 0,
      lastStep: spec.last_step || 16,
    };
    this.send({ type: "grid-meta", shuffle: this.gridMeta.shuffle, lastStep: this.gridMeta.lastStep });
  }

  setRmxRollOverdubHandler(
    fn: ((voice: VoiceId, stepIdx: number, accent: boolean, pitch: number) => void) | null,
  ): void {
    this.rollOverdubHandler = fn;
  }

  /** Updates master stereo return level for Per-Voice FX buses (Echo, Reverb, Acid Filter). */
  setVoiceFxLevel(fxLevel: number): void {
    this.voiceFxLevel = Math.max(0, Math.min(1, fxLevel));
    this.send({ type: "vfx-level", level: this.voiceFxLevel });
  }

  /** Decodes a WAV/AIFF/MP3/OGG buffer into mono Float32Array PCM at the engine sample rate. */
  async decodeSampleBytes(data: ArrayBuffer): Promise<Float32Array> {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = this.ctx ?? (this.decodeCtx ??= new Ctor());
    const decoded = await ctx.decodeAudioData(data.slice(0));
    const len = decoded.length;
    const chs = decoded.numberOfChannels;
    const mono = new Float32Array(len);
    for (let c = 0; c < chs; c++) {
      const ch = decoded.getChannelData(c);
      const scale = 1 / chs;
      for (let i = 0; i < len; i++) mono[i] = (mono[i] ?? 0) + (ch[i] ?? 0) * scale;
    }
    return mono;
  }

  setVoiceSample(voiceIdx: number, pcm: Float32Array, name: string): void {
    if (voiceIdx < 0 || voiceIdx >= 10) return;
    this.voiceSamples[voiceIdx] = { pcm, name };
    this.send({ type: "set-voice-sample", voiceIdx, pcm, name });
  }

  clearVoiceSample(voiceIdx: number): void {
    if (voiceIdx < 0 || voiceIdx >= 10) return;
    this.voiceSamples[voiceIdx] = null;
    this.send({ type: "clear-voice-sample", voiceIdx });
  }

  clearAllVoiceSamples(): void {
    this.voiceSamples.fill(null);
    this.send({ type: "clear-all-samples" });
  }

  setSampleMeta(meta: Record<string, unknown>): void {
    this.sampleMeta = meta;
    this.send({ type: "sample-meta", meta });
  }

  /**
   * Triggers a sample-accurate X-Pad hit inside EngineHost, snapping to the
   * 16th-note grid when playing and Quantize is enabled. Returns the quantized
   * step index (0..15, or -1 when stopped).
   */
  async triggerRmxPad(
    voice: VoiceId,
    pitchShift = 0,
    velocity = 0.9,
    eventTimeMs?: number,
  ): Promise<number> {
    const now = performance.now();
    const ts =
      typeof eventTimeMs === "number" && eventTimeMs > 0 && Math.abs(now - eventTimeMs) < 2000
        ? eventTimeMs
        : now;
    await this.ensureStarted();
    const heardBeat = this.beatHeardAt(ts) ?? -1;
    const voiceIdx = Math.max(0, VOICE_IDS.indexOf(voice));
    const id = this.nextPadReqId++;
    return new Promise<number>((resolve) => {
      const timer = setTimeout(() => {
        if (this.pendingPadResolvers.delete(id)) resolve(-1);
      }, 250);
      this.pendingPadResolvers.set(id, (stepIdx) => {
        clearTimeout(timer);
        resolve(stepIdx);
      });
      this.send({
        type: "trigger-pad",
        id,
        voiceIdx,
        pitch: pitchShift,
        velocity,
        quantize: this.rmxState.xpadQuantize !== false,
        overdub: this.rmxState.xpadOverdub,
        heardBeat,
      });
    });
  }

  private setState(state: AudioState, detail?: string): void {
    this.state = state;
    this.events.onState(state, detail);
  }
}
