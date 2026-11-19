// Pioneer RMX-1000 Remix Station surface controller:
//   - X-PAD FX (Bank A/B drum pads, interactive 1/1..1/32 touch roll ribbon,
//     Latch Roll, Pitch shift, and live 16-step Overdub recording)
//   - SCENE FX (5 Build Up + 5 Break Down processors with Main + Sub knobs)
//   - ISOLATOR FX (3-Band Low/Mid/High EQ + Kill switches + 4 modes)
//   - RELEASE FX (Spring-loaded Vinyl Brake / Echo / Back Spin exit lever)

import type { AudioEngine } from "../engine/audio-engine";
import {
  defaultRmxState,
  type IsolatorMode,
  type ReleaseMode,
  type RmxState,
  type RollDivision,
  type SceneFxId,
} from "../engine/rmx-fx";
import type { VoiceId } from "../voices";

export interface RmxCallbacks {
  audio: AudioEngine;
  /** Current BPM (followed tempo or internal pattern BPM). */
  getBpm(): number;
  /** Current playing step (0..15, or -1 when stopped). */
  getStep(): number;
  /** Punches a hit into the running pattern when Overdub is enabled. */
  onOverdubHit(voice: VoiceId, step: number, accent: boolean, tuneOffset: number): void;
  /** Toggles mute on a voice in the pattern. */
  onToggleVoiceMute(voice: VoiceId): void;
  /** Clears a voice's steps in the pattern. */
  onClearVoice(voice: VoiceId): void;
  /** Queries whether a voice is currently muted in the pattern. */
  isVoiceMuted(voice: VoiceId): boolean;
}

interface PadDef {
  id: VoiceId;
  short: string;
  label: string;
}

const BANK_A: readonly PadDef[] = [
  { id: "kick", short: "BD", label: "KICK" },
  { id: "snare", short: "SD", label: "SNARE" },
  { id: "clap", short: "CP", label: "CLAP" },
  { id: "closed_hat", short: "CH", label: "HI-HAT" },
];

const BANK_B: readonly PadDef[] = [
  { id: "low_tom", short: "LT", label: "TOM" },
  { id: "rim", short: "RS", label: "RIM" },
  { id: "open_hat", short: "OH", label: "OPEN HAT" },
  { id: "cowbell", short: "CB", label: "COWBELL" },
];

const SCENE_LABELS: Readonly<Record<SceneFxId, string>> = {
  bpf_echo: "BPF ECHO",
  echo: "ECHO",
  noise: "NOISE",
  spiral_up: "SPIRAL UP",
  reverb_up: "REVERB UP",
  hpf_echo: "HPF ECHO",
  lpf_echo: "LPF ECHO",
  crush_echo: "CRUSH ECHO",
  spiral_down: "SPIRAL DOWN",
  reverb_down: "REVERB DOWN",
};

const ROLL_DIVS: readonly RollDivision[] = [1, 2, 4, 8, 16, 32];

export class RmxPanel {
  private state: RmxState = defaultRmxState();
  private bypassed = false;
  private rollPointerDown = false;
  private rollStartY = 0;
  private rollBasePitch = 0;
  private rollLatched = false;
  private overdubStepCursor = 0;
  private flashTimers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
  private rotaryRefs: {
    input: HTMLInputElement;
    arc: SVGCircleElement;
    needle: SVGLineElement;
    min: number;
    max: number;
  }[] = [];

  constructor(
    private readonly root: HTMLElement,
    private readonly cb: RmxCallbacks,
  ) {
    this.cb.audio.setRmxRollOverdubHandler((voice, stepIdx, accent, pitch) => {
      if (this.state.xpadOverdub && !this.bypassed) {
        this.cb.onOverdubHit(voice, stepIdx, accent, pitch);
      }
    });
    this.enhanceRotaryKnobs();
    this.bind();
    this.render();
  }

  get current(): RmxState {
    return this.state;
  }

  get effectiveState(): RmxState {
    return this.bypassed ? defaultRmxState() : this.state;
  }

  get isBypassed(): boolean {
    return this.bypassed;
  }

  setBypassed(bypassed: boolean): void {
    if (bypassed) {
      this.stopRoll();
      this.rollPointerDown = false;
      this.state.releaseHeld = false;
    }
    this.bypassed = bypassed;
    this.root.dataset.machineOff = String(bypassed);
    this.pushState();
  }

  reset(): void {
    this.stopRoll();
    this.rollPointerDown = false;
    this.rollLatched = false;
    if (this.state.extInput) {
      void this.cb.audio.setExternalInput(false);
    }
    this.state = defaultRmxState();
    this.pushState();
  }

  private flashEl(selector: string): void {
    const el = this.root.querySelector<HTMLElement>(selector);
    if (!el) return;
    const prev = this.flashTimers.get(el);
    if (prev !== undefined) clearTimeout(prev);
    el.classList.add("kb-flash");
    const t = setTimeout(() => {
      el.classList.remove("kb-flash");
      this.flashTimers.delete(el);
    }, 170);
    this.flashTimers.set(el, t);
  }

  /** Triggers one of the 4 X-Pad slots (0..3) in the active bank. */
  triggerPadSlot(slot: number, eventTimeMs?: number): void {
    if (this.bypassed) return;
    const bank = this.state.xpadBankB ? BANK_B : BANK_A;
    const pad = bank[slot];
    if (!pad) return;
    this.state.xpadVoice = pad.id;
    this.flashEl(`[data-xpad-slot="${slot}"]`);
    this.firePadHit(true, eventTimeMs);
    this.pushState(eventTimeMs);
  }

  /** Triggers any of the 10 voices directly through the RMX X-Pad synth & overdub. */
  triggerVoicePad(voice: VoiceId, accent = true, eventTimeMs?: number): void {
    if (this.bypassed) return;
    this.state.xpadVoice = voice;
    this.firePadHit(accent, eventTimeMs);
    this.pushState(eventTimeMs);
  }

  /** Engages or releases the spring-loaded Release FX lever from keyboard shortcuts. */
  setReleaseLever(held: boolean): void {
    if (held) {
      if (this.bypassed || this.state.releaseHeld) return;
      void this.cb.audio.ensureStarted().catch(() => {});
      this.state.releaseHeld = true;
      this.pushState();
    } else {
      if (!this.state.releaseHeld) return;
      this.state.releaseHeld = false;
      this.state.sceneAmount = 0;
      if (!this.rollLatched) this.stopRoll();
      this.pushState();
    }
  }

  /** Starts a beat-roll division from a held keyboard key. */
  holdRoll(div: RollDivision, eventTimeMs?: number): void {
    this.startRoll(div, eventTimeMs);
  }

  /** Ends a keyboard-held beat roll unless Latch Roll is active. */
  releaseRoll(): void {
    if (!this.rollLatched && !this.rollPointerDown) {
      this.stopRoll();
      this.pushState();
    }
  }

  toggleKill(band: "low" | "mid" | "high"): boolean {
    const key = band === "low" ? "killLow" : band === "mid" ? "killMid" : "killHigh";
    this.state[key] = !this.state[key];
    this.flashEl(`#rmx-kill-${band}`);
    this.pushState();
    return this.state[key];
  }

  setIsoMode(mode: IsolatorMode): void {
    this.state.isoMode = mode;
    this.flashEl(`[data-iso-mode="${mode}"]`);
    this.pushState();
  }

  cycleIsoMode(): IsolatorMode {
    const order: readonly IsolatorMode[] = ["isolator", "cut_add", "trans_roll", "gate_drive"];
    const cur = order.indexOf(this.state.isoMode);
    const next = order[(cur + 1) % order.length]!;
    this.setIsoMode(next);
    return next;
  }

  selectSceneFx(fx: SceneFxId): { label: string; pct: number } {
    this.state.sceneFx = fx;
    if (this.state.sceneAmount < 0.02) {
      this.state.sceneAmount = 0.35;
    }
    if (!this.bypassed && this.state.sceneAmount > 0.02) {
      void this.cb.audio.ensureStarted().catch(() => {});
    }
    this.flashEl(`[data-scene-fx="${fx}"]`);
    this.pushState();
    return { label: SCENE_LABELS[fx], pct: Math.round(this.state.sceneAmount * 100) };
  }

  setSceneAmount(amount: number): number {
    this.state.sceneAmount = Math.max(0, Math.min(1, Math.round(amount * 100) / 100));
    if (!this.bypassed && this.state.sceneAmount > 0.02) {
      void this.cb.audio.ensureStarted().catch(() => {});
    }
    this.pushState();
    return Math.round(this.state.sceneAmount * 100);
  }

  adjustSceneAmount(delta: number): number {
    return this.setSceneAmount(this.state.sceneAmount + delta);
  }

  cycleReleaseMode(): ReleaseMode {
    const order: readonly ReleaseMode[] = ["vinyl_brake", "echo", "back_spin"];
    const cur = order.indexOf(this.state.releaseMode);
    const next = order[(cur + 1) % order.length]!;
    this.state.releaseMode = next;
    this.flashEl(`[data-release-mode="${next}"]`);
    this.pushState();
    return next;
  }

  toggleBank(): boolean {
    this.state.xpadBankB = !this.state.xpadBankB;
    const bank = this.state.xpadBankB ? BANK_B : BANK_A;
    if (!bank.some((p) => p.id === this.state.xpadVoice)) {
      this.state.xpadVoice = bank[0]!.id;
    }
    this.flashEl("#rmx-bank");
    this.pushState();
    return this.state.xpadBankB;
  }

  toggleQuantize(): boolean {
    this.state.xpadQuantize = !(this.state.xpadQuantize !== false);
    this.flashEl("#rmx-quantize");
    this.pushState();
    return this.state.xpadQuantize;
  }

  toggleLatchRoll(eventTimeMs?: number): boolean {
    this.rollLatched = !this.rollLatched;
    this.flashEl("#rmx-roll-latch");
    if (this.rollLatched) {
      this.startRoll(this.state.xpadRollDiv, eventTimeMs);
    } else if (!this.rollPointerDown) {
      this.stopRoll();
      this.pushState(eventTimeMs);
    } else {
      this.render();
    }
    return this.rollLatched;
  }

  toggleOverdub(): boolean {
    this.state.xpadOverdub = !this.state.xpadOverdub;
    this.flashEl("#rmx-overdub");
    this.pushState();
    return this.state.xpadOverdub;
  }

  togglePadMute(): boolean {
    this.cb.onToggleVoiceMute(this.state.xpadVoice);
    this.flashEl("#rmx-voice-mute");
    this.render();
    return this.cb.isVoiceMuted(this.state.xpadVoice);
  }

  clearPadVoice(): void {
    this.cb.onClearVoice(this.state.xpadVoice);
    this.flashEl("#rmx-voice-clear");
    this.render();
  }

  adjustPitchSemitones(deltaSemi: number): number {
    const curSemi = Math.round(this.state.xpadPitch * 12);
    const nextSemi = Math.max(-12, Math.min(12, curSemi + deltaSemi));
    this.state.xpadPitch = Math.round((nextSemi / 12) * 1000) / 1000;
    this.pushState();
    return nextSemi;
  }

  resetPitch(): void {
    this.state.xpadPitch = 0;
    this.pushState();
  }

  private enhanceRotaryKnobs(): void {
    const circ = 2 * Math.PI * 13;
    const arcSpan = circ * 0.75; // 270 deg sweep
    for (const knob of this.root.querySelectorAll<HTMLElement>(".knob")) {
      const input = knob.querySelector<HTMLInputElement>('input[type="range"]');
      if (!input || knob.querySelector(".rotary-dial")) continue;
      const min = Number(input.min || 0);
      const max = Number(input.max || 1);
      const step = Number(input.step || 0.01);
      const resetVal = input.id.includes("scene-sub") ? 0.5 : 0;

      const dial = document.createElement("span");
      dial.className = "rotary-dial";
      dial.setAttribute("aria-hidden", "true");
      dial.title = "Drag up/down (Shift: fine) · Double-click to reset";
      dial.innerHTML =
        `<svg class="rotary-svg" viewBox="0 0 36 36">` +
        `<circle class="rotary-track" cx="18" cy="18" r="13" stroke-dasharray="${arcSpan.toFixed(2)} ${circ.toFixed(2)}" />` +
        `<circle class="rotary-arc" cx="18" cy="18" r="13" stroke-dasharray="0 ${circ.toFixed(2)}" />` +
        `<line class="rotary-needle" x1="18" y1="18" x2="18" y2="6.5" />` +
        `</svg>`;
      knob.classList.add("has-rotary");
      knob.prepend(dial);

      const arc = dial.querySelector("circle.rotary-arc") as SVGCircleElement | null;
      const needle = dial.querySelector("line.rotary-needle") as SVGLineElement | null;
      if (arc && needle) {
        this.rotaryRefs.push({ input, arc, needle, min, max });
      }

      let dragging = false;
      let startY = 0;
      let startVal = 0;
      dial.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        dragging = true;
        startY = e.clientY;
        startVal = Number(input.value);
        try {
          dial.setPointerCapture(e.pointerId);
        } catch {
          /* ignore synthetic pointer events */
        }
      });
      dial.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const scale = e.shiftKey ? 360 : 110;
        const delta = ((startY - e.clientY) / scale) * (max - min);
        const raw = Math.max(min, Math.min(max, startVal + delta));
        const snapped = Math.round(raw / step) * step;
        const fixed = Number(snapped.toFixed(4));
        if (Number(input.value) !== fixed) {
          input.value = String(fixed);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
      const stopDrag = () => {
        dragging = false;
      };
      dial.addEventListener("pointerup", stopDrag);
      dial.addEventListener("pointercancel", stopDrag);
      dial.addEventListener("dblclick", (e) => {
        e.preventDefault();
        input.value = String(resetVal);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
  }

  private syncRotaryVisuals(): void {
    const circ = 2 * Math.PI * 13;
    const arcSpan = circ * 0.75;
    for (const r of this.rotaryRefs) {
      const val = Number(r.input.value);
      const norm = r.max > r.min ? Math.max(0, Math.min(1, (val - r.min) / (r.max - r.min))) : 0;
      const deg = -135 + norm * 270;
      r.needle.setAttribute("transform", `rotate(${deg.toFixed(1)} 18 18)`);
      const activeLen = arcSpan * norm;
      r.arc.setAttribute("stroke-dasharray", `${activeLen.toFixed(2)} ${circ.toFixed(2)}`);
    }
  }

  private bind(): void {
    const $ = <T extends HTMLElement>(id: string) => this.root.querySelector<T>(`#${id}`)!;

    // Reset all RMX FX
    $("rmx-reset").addEventListener("click", () => {
      this.reset();
    });

    // External Live Stereo Input toggle (hidden in single-file build)
    const extBtn = this.root.querySelector<HTMLButtonElement>("#rmx-ext-in");
    extBtn?.addEventListener("click", () => {
      const want = !this.state.extInput;
      void this.cb.audio.setExternalInput(want).then((ok) => {
        this.state.extInput = ok;
        this.pushState();
      });
    });

    // Scene FX buttons (Build Up + Break Down)
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-scene-fx]")) {
      btn.addEventListener("click", () => {
        const fx = btn.dataset.sceneFx as SceneFxId;
        this.state.sceneFx = fx;
        this.pushState();
      });
    }

    const sceneAmt = $<HTMLInputElement>("rmx-scene-amount");
    sceneAmt.addEventListener("input", () => {
      this.state.sceneAmount = Number(sceneAmt.value);
      // If user turns up NOISE or any Scene FX while audio is idle, boot AudioContext so NOISE is audible
      if (!this.bypassed && this.state.sceneAmount > 0.02) {
        void this.cb.audio.ensureStarted().catch(() => {});
      }
      this.pushState();
    });

    const sceneSub = $<HTMLInputElement>("rmx-scene-sub");
    sceneSub.addEventListener("input", () => {
      this.state.sceneSub = Number(sceneSub.value);
      this.pushState();
    });
    sceneSub.addEventListener("dblclick", () => {
      this.state.sceneSub = 0.5;
      this.pushState();
    });

    const sceneSub2 = this.root.querySelector<HTMLInputElement>("#rmx-scene-sub2");
    if (sceneSub2) {
      sceneSub2.addEventListener("input", () => {
        this.state.sceneSub2 = Number(sceneSub2.value);
        this.pushState();
      });
      sceneSub2.addEventListener("dblclick", () => {
        this.state.sceneSub2 = 0.5;
        this.pushState();
      });
    }
    sceneAmt.addEventListener("dblclick", () => {
      this.state.sceneAmount = 0;
      this.pushState();
    });

    // Isolator FX modes + bands + kills
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-iso-mode]")) {
      btn.addEventListener("click", () => {
        this.state.isoMode = btn.dataset.isoMode as IsolatorMode;
        this.pushState();
      });
    }

    const bindIso = (id: string, key: "isoLow" | "isoMid" | "isoHigh") => {
      const el = $<HTMLInputElement>(id);
      el.addEventListener("input", () => {
        this.state[key] = Number(el.value);
        this.pushState();
      });
      el.addEventListener("dblclick", () => {
        this.state[key] = 0;
        this.pushState();
      });
    };
    bindIso("rmx-iso-low", "isoLow");
    bindIso("rmx-iso-mid", "isoMid");
    bindIso("rmx-iso-high", "isoHigh");

    const bindKill = (id: string, key: "killLow" | "killMid" | "killHigh") => {
      $(id).addEventListener("click", () => {
        this.state[key] = !this.state[key];
        this.pushState();
      });
    };
    bindKill("rmx-kill-low", "killLow");
    bindKill("rmx-kill-mid", "killMid");
    bindKill("rmx-kill-high", "killHigh");

    // X-Pad Quantize & Bank A/B toggles
    const qBtn = this.root.querySelector<HTMLButtonElement>("#rmx-quantize");
    if (qBtn) {
      qBtn.addEventListener("click", () => {
        this.state.xpadQuantize = !(this.state.xpadQuantize !== false);
        this.pushState();
      });
    }

    $("rmx-bank").addEventListener("click", () => {
      this.state.xpadBankB = !this.state.xpadBankB;
      const bank = this.state.xpadBankB ? BANK_B : BANK_A;
      if (!bank.some((p) => p.id === this.state.xpadVoice)) {
        this.state.xpadVoice = bank[0]!.id;
      }
      this.pushState();
    });

    // X-Pad 4 Voice Pads (pointerdown for zero finger-lift lag + keyboard click fallback)
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-xpad-slot]")) {
      btn.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const slot = Number(btn.dataset.xpadSlot);
        this.triggerPadSlot(slot, e.timeStamp);
      });
      btn.addEventListener("click", (e) => {
        if (e.detail === 0) {
          const slot = Number(btn.dataset.xpadSlot);
          this.triggerPadSlot(slot, e.timeStamp);
        }
      });
    }

    // X-Pad Pitch
    const pitch = $<HTMLInputElement>("rmx-pitch");
    pitch.addEventListener("input", () => {
      this.state.xpadPitch = Number(pitch.value);
      this.pushState();
    });
    pitch.addEventListener("dblclick", () => {
      this.state.xpadPitch = 0;
      this.pushState();
    });

    // X-Pad Overdub, Latch Roll, Voice Mute, Voice Clear
    $("rmx-overdub").addEventListener("click", () => {
      this.state.xpadOverdub = !this.state.xpadOverdub;
      this.pushState();
    });

    $("rmx-roll-latch").addEventListener("click", (e) => {
      this.rollLatched = !this.rollLatched;
      if (this.rollLatched) {
        this.startRoll(this.state.xpadRollDiv, e.timeStamp);
      } else if (!this.rollPointerDown) {
        this.stopRoll();
        this.pushState(e.timeStamp);
      } else {
        this.render();
      }
    });

    $("rmx-voice-mute").addEventListener("click", () => {
      this.cb.onToggleVoiceMute(this.state.xpadVoice);
      this.render();
    });

    $("rmx-voice-clear").addEventListener("click", () => {
      this.cb.onClearVoice(this.state.xpadVoice);
      this.render();
    });

    // X-Pad Touch Roll Strip (6 division buttons + continuous drag across strip)
    const strip = $("rmx-xpad-strip");
    const divFromPoint = (clientX: number): RollDivision => {
      const rect = strip.getBoundingClientRect();
      if (rect.width <= 0) return this.state.xpadRollDiv;
      const ratio = Math.max(0, Math.min(0.999, (clientX - rect.left) / rect.width));
      const idx = Math.floor(ratio * ROLL_DIVS.length);
      return ROLL_DIVS[idx] ?? 8;
    };

    for (const btn of strip.querySelectorAll<HTMLButtonElement>("[data-roll-div]")) {
      btn.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const div = Number(btn.dataset.rollDiv) as RollDivision;
        this.rollPointerDown = true;
        this.rollStartY = e.clientY;
        this.rollBasePitch = this.state.xpadPitch;
        this.startRoll(div, e.timeStamp);
      });
      btn.addEventListener("click", (e) => {
        // Keyboard Enter/Space activation on a division button triggers one roll burst
        if (e.detail === 0) {
          const div = Number(btn.dataset.rollDiv) as RollDivision;
          this.state.xpadRollDiv = div;
          this.firePadHit(div >= 16, e.timeStamp);
          this.pushState(e.timeStamp);
        }
      });
    }

    strip.addEventListener("pointermove", (e) => {
      if (!this.rollPointerDown) return;
      const div = divFromPoint(e.clientX);
      let changed = false;
      if (div !== this.state.xpadRollDiv) {
        this.state.xpadRollDiv = div;
        changed = true;
      }
      const dy = this.rollStartY - e.clientY;
      if (Math.abs(dy) > 8) {
        const nextPitch = Math.max(-1, Math.min(1, Math.round((this.rollBasePitch + dy / 75) * 20) / 20));
        if (nextPitch !== this.state.xpadPitch) {
          this.state.xpadPitch = nextPitch;
          changed = true;
        }
      }
      if (changed) this.pushState();
    });

    const endPointerRoll = () => {
      if (!this.rollPointerDown) return;
      this.rollPointerDown = false;
      if (!this.rollLatched) {
        this.stopRoll();
        this.pushState();
      }
    };
    window.addEventListener("pointerup", endPointerRoll);
    window.addEventListener("pointercancel", endPointerRoll);

    // Release FX modes + spring-loaded lever
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-release-mode]")) {
      btn.addEventListener("click", () => {
        this.state.releaseMode = btn.dataset.releaseMode as ReleaseMode;
        this.pushState();
      });
    }

    const lever = $("rmx-release-lever");
    const engageLever = () => {
      if (this.bypassed || this.state.releaseHeld) return;
      void this.cb.audio.ensureStarted().catch(() => {});
      this.state.releaseHeld = true;
      this.pushState();
    };
    const releaseLever = () => {
      if (!this.state.releaseHeld) return;
      this.state.releaseHeld = false;
      // Like hardware RMX-1000: releasing the exit lever clears Scene FX build-up
      this.state.sceneAmount = 0;
      if (!this.rollLatched) this.stopRoll();
      this.pushState();
    };

    lever.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      engageLever();
    });
    lever.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === "r" || e.key === "R") && !e.repeat) {
        engageLever();
      }
    });
    lever.addEventListener("keyup", (e) => {
      if (e.key === "Enter" || e.key === "r" || e.key === "R") {
        releaseLever();
      }
    });
    window.addEventListener("pointerup", releaseLever);
    window.addEventListener("pointercancel", releaseLever);
  }

  private startRoll(div: RollDivision, eventTimeMs?: number): void {
    this.state.xpadRollDiv = div;
    if (this.bypassed) {
      this.render();
      return;
    }
    this.state.xpadRolling = true;
    void this.cb.audio.ensureStarted().catch(() => {});
    this.pushState(eventTimeMs);
  }

  private stopRoll(): void {
    this.state.xpadRolling = false;
  }

  private firePadHit(accent: boolean, eventTimeMs?: number): void {
    if (this.bypassed) return;
    const velocity = accent ? 1.0 : 0.85;
    const voice = this.state.xpadVoice;
    const pitch = this.state.xpadPitch;
    const overdub = this.state.xpadOverdub;
    const liveStep = this.cb.getStep();
    // If Overdub is armed, record immediately when stopped (or using current/quantized step when playing)
    if (overdub && liveStep < 0) {
      const targetStep = this.overdubStepCursor++ % 16;
      this.cb.onOverdubHit(voice, targetStep, accent, pitch);
    }
    void this.cb.audio.triggerRmxPad(voice, pitch, velocity, eventTimeMs).then((quantizedStep) => {
      if (overdub && liveStep >= 0 && !this.bypassed) {
        const targetStep = quantizedStep >= 0 ? quantizedStep : liveStep;
        this.cb.onOverdubHit(voice, targetStep, accent, pitch);
      }
    });
  }

  private pushState(eventTimeMs?: number): void {
    this.cb.audio.setRmxState(this.bypassed ? defaultRmxState() : this.state, eventTimeMs);
    this.render();
  }

  render(): void {
    const $ = <T extends HTMLElement>(id: string) => this.root.querySelector<T>(`#${id}`)!;
    const s = this.state;

    // Header readout
    const fxName = s.sceneFx ? SCENE_LABELS[s.sceneFx] : "BYPASS";
    const fxPct = `${Math.round(s.sceneAmount * 100)}%`;
    const bank = s.xpadBankB ? BANK_B : BANK_A;
    const activePad = bank.find((p) => p.id === s.xpadVoice) ?? BANK_A[0]!;
    const qTag = s.xpadQuantize !== false ? " · QUANT" : "";
    $("rmx-readout").textContent = this.bypassed
      ? "BYPASSED · RMX-1000 OFF"
      : s.releaseHeld
        ? `RELEASE · ${s.releaseMode.replace("_", " ").toUpperCase()}`
        : `${fxName} ${fxPct} · X-PAD ${activePad.label} 1/${s.xpadRollDiv}${qTag}`;

    // Scene FX buttons & sliders
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-scene-fx]")) {
      const on = btn.dataset.sceneFx === s.sceneFx;
      btn.setAttribute("aria-pressed", String(on));
    }
    const sceneAmt = $<HTMLInputElement>("rmx-scene-amount");
    if (sceneAmt.value !== String(s.sceneAmount)) sceneAmt.value = String(s.sceneAmount);
    $("rmx-scene-amount-out").textContent = fxPct;

    const sceneSub = $<HTMLInputElement>("rmx-scene-sub");
    if (sceneSub.value !== String(s.sceneSub)) sceneSub.value = String(s.sceneSub);
    $("rmx-scene-sub-out").textContent = `${Math.round(s.sceneSub * 100)}%`;

    const sceneSub2 = this.root.querySelector<HTMLInputElement>("#rmx-scene-sub2");
    if (sceneSub2) {
      const sub2Val = s.sceneSub2 ?? 0.5;
      if (sceneSub2.value !== String(sub2Val)) sceneSub2.value = String(sub2Val);
      const sub2Out = this.root.querySelector<HTMLElement>("#rmx-scene-sub2-out");
      if (sub2Out) sub2Out.textContent = `${Math.round(sub2Val * 100)}%`;
    }
    const extBtn = this.root.querySelector<HTMLButtonElement>("#rmx-ext-in");
    if (extBtn) extBtn.setAttribute("aria-pressed", String(Boolean(s.extInput)));

    // Isolator FX
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-iso-mode]")) {
      btn.setAttribute("aria-pressed", String(btn.dataset.isoMode === s.isoMode));
    }
    const fmtIso = (db: number, kill: boolean) =>
      kill || db <= -47.5 ? "KILL" : `${db > 0 ? "+" : ""}${Math.round(db)} dB`;

    const isoLow = $<HTMLInputElement>("rmx-iso-low");
    if (isoLow.value !== String(s.isoLow)) isoLow.value = String(s.isoLow);
    $("rmx-iso-low-out").textContent = fmtIso(s.isoLow, s.killLow);
    $("rmx-kill-low").setAttribute("aria-pressed", String(s.killLow));

    const isoMid = $<HTMLInputElement>("rmx-iso-mid");
    if (isoMid.value !== String(s.isoMid)) isoMid.value = String(s.isoMid);
    $("rmx-iso-mid-out").textContent = fmtIso(s.isoMid, s.killMid);
    $("rmx-kill-mid").setAttribute("aria-pressed", String(s.killMid));

    const isoHigh = $<HTMLInputElement>("rmx-iso-high");
    if (isoHigh.value !== String(s.isoHigh)) isoHigh.value = String(s.isoHigh);
    $("rmx-iso-high-out").textContent = fmtIso(s.isoHigh, s.killHigh);
    $("rmx-kill-high").setAttribute("aria-pressed", String(s.killHigh));

    // X-Pad Quantize, Bank & Voice Pads
    const qBtn = this.root.querySelector<HTMLButtonElement>("#rmx-quantize");
    if (qBtn) {
      qBtn.setAttribute("aria-pressed", String(s.xpadQuantize !== false));
    }
    const bankBtn = $("rmx-bank");
    bankBtn.textContent = s.xpadBankB ? "Bank B (LT/RS/OH/CB)" : "Bank A (BD/SD/CP/CH)";
    bankBtn.setAttribute("aria-pressed", String(s.xpadBankB));

    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-xpad-slot]")) {
      const slot = Number(btn.dataset.xpadSlot);
      const pad = bank[slot];
      if (!pad) continue;
      btn.textContent = `${pad.short} · ${pad.label}`;
      btn.setAttribute("aria-pressed", String(pad.id === s.xpadVoice));
      btn.dataset.voice = pad.id;
    }

    const pitch = $<HTMLInputElement>("rmx-pitch");
    if (pitch.value !== String(s.xpadPitch)) pitch.value = String(s.xpadPitch);
    const semi = Math.round(s.xpadPitch * 12);
    $("rmx-pitch-out").textContent = `${semi > 0 ? "+" : ""}${semi} st`;

    $("rmx-overdub").setAttribute("aria-pressed", String(s.xpadOverdub));
    $("rmx-roll-latch").setAttribute("aria-pressed", String(this.rollLatched));
    const muted = this.cb.isVoiceMuted(s.xpadVoice);
    $("rmx-voice-mute").setAttribute("aria-pressed", String(muted));

    // X-Pad Roll Strip divisions
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-roll-div]")) {
      const div = Number(btn.dataset.rollDiv);
      const active = div === s.xpadRollDiv;
      btn.setAttribute("aria-pressed", String(active));
      btn.classList.toggle("rolling", active && s.xpadRolling);
    }

    // Release FX
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-release-mode]")) {
      btn.setAttribute("aria-pressed", String(btn.dataset.releaseMode === s.releaseMode));
    }
    const lever = $("rmx-release-lever");
    lever.setAttribute("aria-pressed", String(s.releaseHeld));
    lever.textContent = s.releaseHeld ? "Holding · let go to drop" : "Hold to release";
    this.syncRotaryVisuals();
  }
}
