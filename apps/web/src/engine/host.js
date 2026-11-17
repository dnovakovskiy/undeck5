// The engine host: drives one lockstep P5Engine (core/ffi) block by block and
// processes stereo Per-Voice FX returns + Pioneer RMX-1000 DSP (24 dB/oct
// Linkwitz-Riley 3-band isolator, 10 Scene FX with dual-tap pitch-shifted
// Spiral Up/Down, 4-second ring-buffer Vinyl Brake / Back Spin Release FX,
// sample-accurate X-Pad Beat Roll, and post-RMX safety limiter) on the same
// audio render clock.
//
// Plain JavaScript with no imports and no network or console use, because its
// source is shipped verbatim into the AudioWorklet (ADR-0010).

/** Decaying peak meter: about 20 dB per second fall. */
const METER_FALL_DB_PER_S = 20;
/** Status messages per second (tempo, lock, beat, peak, phase error). */
const STATUS_HZ = 20;

const VOICE_NAMES = [
  "kick",
  "snare",
  "low_tom",
  "mid_tom",
  "high_tom",
  "rim",
  "clap",
  "closed_hat",
  "open_hat",
  "cowbell",
];

const SQRT2 = 1.4142135623730951;
const TWO_PI = 6.283185307179586;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function softClip(x) {
  if (x > 3) return 1;
  if (x < -3) return -1;
  const x2 = x * x;
  return (x * (27 + x2)) / (27 + 9 * x2);
}

/** 2nd-order Butterworth TPT SVF state: 2 floats [ic1, ic2]. */
function svfCoeffs(fc, sr, r2) {
  const g = Math.tan((Math.PI * clamp(fc, 20, sr * 0.46)) / sr);
  const a1 = 1 / (1 + g * (g + r2));
  const a2 = g * a1;
  const a3 = g * a2;
  return [a1, a2, a3, r2];
}

export class EngineHost {
  /**
   * @param {any} api core exports (wasm instance exports or the JS core)
   * @param {number} sampleRate
   * @param {(msg: any) => void} post sends a message to the main thread
   */
  constructor(api, sampleRate, post) {
    this.api = api;
    this.sampleRate = sampleRate;
    this.post = post;
    this.engine = api.p5_engine_new(sampleRate);
    if (!this.engine) throw new Error("p5_engine_new failed");

    this.capFrames = 0;
    this.dryPtr = 0;
    this.echoPtr = 0;
    this.reverbPtr = 0;
    this.filterPtr = 0;
    this.viewBuffer = null;
    this.dryView = null;
    this.echoView = null;
    this.reverbView = null;
    this.filterView = null;
    this.outBufL = new Float32Array(2048);
    this.outBufR = new Float32Array(2048);
    this.outPair = [this.outBufL, this.outBufR];

    this.offset = null;
    this.lastStep = -2;
    this.peak = 0;
    this.fallPerFrame = Math.pow(10, -METER_FALL_DB_PER_S / 20 / sampleRate);
    this.fallFrames = 0;
    this.fallFactor = 1;
    this.statusEvery = Math.round(sampleRate / STATUS_HZ);
    this.sinceStatus = 0;
    this.alive = true;

    // PRNG state for X-Pad drum synth & Scene FX noise jet
    this.rng = 0x2468ace1;

    // Per-Voice FX Stereo Returns (pre-allocated)
    this.vfxLevel = 0.75;
    this.vfxActiveFrames = 0;
    this.vEchoLen = Math.max(4096, Math.ceil(sampleRate * 2.0));
    this.vEchoL = new Float32Array(this.vEchoLen);
    this.vEchoR = new Float32Array(this.vEchoLen);
    this.vEchoPos = 0;
    this.vEchoLpL = 0;
    this.vEchoLpR = 0;
    this.vEchoHpL = 0;
    this.vEchoHpR = 0;

    // 4-Comb + 2-Allpass Stereo Space Reverb (shared by Voice Reverb + Scene Reverb)
    const srScale = sampleRate / 44100;
    const combLens = [1557, 1617, 1491, 1422];
    this.combL = combLens.map((n) => new Float32Array(Math.max(64, Math.round(n * srScale))));
    this.combR = combLens.map((n) => new Float32Array(Math.max(64, Math.round((n + 23) * srScale))));
    this.combIdxL = new Int32Array(4);
    this.combIdxR = new Int32Array(4);
    this.combStoreL = new Float32Array(4);
    this.combStoreR = new Float32Array(4);
    const apLens = [225, 556];
    this.apL = apLens.map((n) => new Float32Array(Math.max(32, Math.round(n * srScale))));
    this.apR = apLens.map((n) => new Float32Array(Math.max(32, Math.round((n + 19) * srScale))));
    this.apIdxL = new Int32Array(2);
    this.apIdxR = new Int32Array(2);

    // Acid Filter SVF state on Per-Voice Filter bus
    this.vFltEnv = 0;
    this.vFltStateL = new Float64Array(2);
    this.vFltStateR = new Float64Array(2);

    // External Live Input gain
    this.extGain = 0;

    // Pioneer RMX-1000 state
    this.rmx = {
      sceneFx: "bpf_echo",
      sceneAmount: 0,
      sceneSub: 0.5,
      sceneSub2: 0.5,
      isoMode: "isolator",
      isoLow: 0,
      isoMid: 0,
      isoHigh: 0,
      killLow: false,
      killMid: false,
      killHigh: false,
      releaseMode: "vinyl_brake",
      releaseHeld: false,
      xpadVoiceIdx: 1,
      xpadPitch: 0,
      xpadRollDiv: 8,
      xpadRolling: false,
      xpadOverdub: false,
      xpadQuantize: true,
    };

    // 24 dB/oct Linkwitz-Riley 3-Band Isolator (250 Hz & 2800 Hz)
    this.lr250 = svfCoeffs(250, sampleRate, SQRT2);
    this.lr2800 = svfCoeffs(2800, sampleRate, SQRT2);
    // 12 stereo SVF stages (24 floats per channel: low1, low2, hp1, hp2, lowApLp1, lowApLp2, lowApHp1, lowApHp2, mid1, mid2, hi1, hi2)
    this.isoStL = new Float64Array(24);
    this.isoStR = new Float64Array(24);
    this.isoMix = 0;
    this.gLow = 1;
    this.gMid = 1;
    this.gHigh = 1;
    this.isoSmooth = 1 - Math.exp(-1 / (0.004 * sampleRate));
    this.isoEnv = 0;

    // Scene FX stereo delay + dual-tap grain pitch shifter (Spiral Up/Down)
    this.scDelayLen = Math.max(8192, Math.ceil(sampleRate * 2.0));
    this.scDelayL = new Float32Array(this.scDelayLen);
    this.scDelayR = new Float32Array(this.scDelayLen);
    this.scDelayPos = 0;
    this.scTailFrames = 0;
    this.scSvfL = new Float64Array(2);
    this.scSvfR = new Float64Array(2);
    this.scFbLpL = 0;
    this.scFbLpR = 0;
    this.grainLen = 4096;
    this.grainBufL = new Float32Array(this.grainLen);
    this.grainBufR = new Float32Array(this.grainLen);
    this.grainWrite = 0;
    this.grainPhase = 0;
    this.crushHoldL = 0;
    this.crushHoldR = 0;
    this.crushCount = 0;
    this.noiseSvfL = new Float64Array(2);
    this.noiseSvfR = new Float64Array(2);

    // 4-Second Stereo Circular Ring Buffer for Release FX (Vinyl Brake / Back Spin / Echo Out)
    this.relLen = Math.max(8192, Math.ceil(sampleRate * 4.0));
    this.relBufL = new Float32Array(this.relLen);
    this.relBufR = new Float32Array(this.relLen);
    this.relWritePos = 0;
    this.relReadPos = 0;
    this.relSpeed = 1;
    this.relAge = 0;
    this.wasReleaseHeld = false;
    this.relEchoLpL = 0;
    this.relEchoLpR = 0;

    // Sample-accurate X-Pad polyphonic voice pool (8 voices, zero GC) + pending quantized hits
    this.xpadPool = [];
    for (let k = 0; k < 8; k++) {
      this.xpadPool.push({
        active: false,
        voiceIdx: 0,
        age: 0,
        dur: 0,
        phase1: 0,
        phase2: 0,
        freq: 100,
        vel: 0,
        pitchMul: 1,
        lp: 0,
        bp: 0,
      });
    }
    this.pendingPads = [];
    for (let k = 0; k < 8; k++) {
      this.pendingPads.push({
        active: false,
        id: 0,
        framesLeft: 0,
        voiceIdx: 0,
        pitch: 0,
        velocity: 0,
        stepIdx: -1,
        overdub: false,
      });
    }
    this.nextRollBeat = -1;
    this.rollAbsStep = 0;
    this.rollStartHeardBeat = -1;
    this.lastRollHitBeat = -1e9;
    this.freeRollRemaining = 0;
    this.patternShuffle = 0;
    this.patternLastStep = 16;

    // Sync Calibration Click pulse
    this.syncClickAge = -1;
    this.syncClickPhase = 0;

    // 10-Voice Custom WAV Sampler Layer (user-loaded local NI / WAV kits)
    this.customSamples = new Array(10).fill(null);
    this.sampleMeta = { variation: 0, lastStep: 16, accent: 0.6, flam: 0.4, voices: [] };
    this.nextSampleAbsStep = -1;
    this.samplePool = [];
    for (let k = 0; k < 16; k++) {
      this.samplePool.push({
        active: false,
        voiceIdx: 0,
        pos: 0,
        rate: 1,
        vel: 0,
        delayFrames: 0,
        maxFrames: 0,
        ageFrames: 0,
      });
    }

    // Post-RMX Stereo Safety Limiter (-0.3 dBFS ceiling)
    this.limGain = 1;
    this.limRel = Math.exp(-1 / (0.06 * sampleRate));

    post({ type: "ready", abi: api.p5_abi_version(), sampleRate });
  }

  nextNoise() {
    let s = this.rng | 0;
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    this.rng = s;
    return (s >>> 0) / 2147483648 - 1;
  }

  spawnSampleHit(voiceIdx, rate, vel, decay, delayFrames) {
    const bank = this.customSamples[voiceIdx];
    if (!bank || !bank.pcm || !bank.pcm.length || vel <= 0.001) return;
    // Closed hat (7) chokes Open hat (8) cleanly, just like the analog circuit
    if (voiceIdx === 7) {
      for (let k = 0; k < this.samplePool.length; k++) {
        const s = this.samplePool[k];
        if (s.active && s.voiceIdx === 8) {
          s.maxFrames = Math.min(s.maxFrames || s.ageFrames + 400, s.ageFrames + 260);
        }
      }
    }
    let pick = this.samplePool[0];
    let oldest = -1;
    for (let k = 0; k < this.samplePool.length; k++) {
      const s = this.samplePool[k];
      if (!s.active) {
        pick = s;
        break;
      }
      if (s.ageFrames > oldest) {
        oldest = s.ageFrames;
        pick = s;
      }
    }
    pick.active = true;
    pick.voiceIdx = voiceIdx;
    pick.pos = 0;
    pick.rate = clamp(rate, 0.25, 4.0);
    pick.vel = clamp(vel, 0, 1.35);
    pick.delayFrames = Math.max(0, delayFrames | 0);
    pick.ageFrames = 0;
    const len = bank.pcm.length;
    pick.maxFrames = decay >= 0.95 ? len : Math.max(900, Math.round(len * (0.12 + decay * 0.92)));
  }

  sampleWavVoices() {
    let sum = 0;
    for (let k = 0; k < this.samplePool.length; k++) {
      const s = this.samplePool[k];
      if (!s.active) continue;
      if (s.delayFrames > 0) {
        s.delayFrames--;
        continue;
      }
      const bank = this.customSamples[s.voiceIdx];
      if (!bank || !bank.pcm) {
        s.active = false;
        continue;
      }
      const pcm = bank.pcm;
      const idx = Math.floor(s.pos);
      if (idx >= pcm.length - 1 || s.ageFrames >= s.maxFrames) {
        s.active = false;
        continue;
      }
      const frac = s.pos - idx;
      const raw = pcm[idx] + (pcm[idx + 1] - pcm[idx]) * frac;
      let env = 1;
      const rem = s.maxFrames - s.ageFrames;
      if (rem < 360) env = Math.max(0, rem / 360);
      sum += raw * s.vel * env;
      s.pos += s.rate;
      s.ageFrames++;
    }
    return sum;
  }

  triggerSampleStep(absStep) {
    const meta = this.sampleMeta;
    const voices = meta.voices;
    if (!voices || !voices.length) return;
    const loopLen = Math.max(1, Math.min(16, meta.lastStep | 0 || 16));
    const stepInBar = ((absStep % loopLen) + loopLen) % loopLen;
    const barCycle = Math.floor(absStep / loopLen);
    const variation = meta.variation | 0;
    let barSlot = 0;
    if (variation === 1) barSlot = 1;
    else if (variation === 3) barSlot = 2;
    else if (variation === 4) barSlot = 3;
    else if (variation === 2) barSlot = barCycle % 2;
    else if (variation === 5) barSlot = ((barCycle % 4) + 4) % 4;

    const anySolo = voices.some((v) => v && v.solo);
    const accentBoost = 1 + (+meta.accent || 0.6) * 0.35;
    const flamDelayFrames = Math.round((0.012 + (+meta.flam || 0.4) * 0.022) * this.sampleRate);

    for (let vIdx = 0; vIdx < 10; vIdx++) {
      if (!this.customSamples[vIdx]) continue;
      const v = voices[vIdx];
      if (!v || v.mute || (anySolo && !v.solo)) continue;
      const barStr =
        barSlot === 1
          ? v.steps_b || v.steps
          : barSlot === 2
            ? v.steps_c || v.steps
            : barSlot === 3
              ? v.steps_d || v.steps
              : v.steps;
      const ch = barStr && barStr[stepInBar] ? barStr[stepInBar] : "-";
      if (ch === "-") continue;
      const baseLvl = typeof v.level === "number" ? v.level : 0.85;
      const tune = typeof v.tune === "number" ? v.tune : 0.5;
      const decay = typeof v.decay === "number" ? v.decay : 0.85;
      const rate = Math.pow(2, (tune - 0.5) * 2);
      const isAcc = ch === "X" || ch === "F";
      const isFlam = ch === "f" || ch === "F";
      const vel = baseLvl * (isAcc ? accentBoost : 0.86);
      this.spawnSampleHit(vIdx, rate, vel, decay, 0);
      if (isFlam) {
        this.spawnSampleHit(vIdx, rate, vel * 0.72, decay, flamDelayFrames);
      }
    }
  }

  spawnXPadVoice(voiceIdx, pitch, velocity) {
    if (voiceIdx >= 0 && voiceIdx < 10 && this.customSamples[voiceIdx]) {
      const vm = this.sampleMeta.voices?.[voiceIdx];
      const tune = vm && typeof vm.tune === "number" ? vm.tune : 0.5;
      const decay = vm && typeof vm.decay === "number" ? vm.decay : 0.85;
      const lvl = vm && typeof vm.level === "number" ? vm.level : 0.9;
      this.spawnSampleHit(voiceIdx, Math.pow(2, (tune - 0.5) * 2 + pitch), velocity * lvl, decay, 0);
      return;
    }
    // Closed Hat (7) chokes ringing Open Hat (8) on X-Pad too
    if (voiceIdx === 7) {
      for (let i = 0; i < 8; i++) {
        const slot = this.xpadPool[i];
        if (slot.active && slot.voiceIdx === 8) slot.active = false;
      }
    }
    let target = this.xpadPool[0];
    for (let i = 0; i < 8; i++) {
      const slot = this.xpadPool[i];
      if (!slot.active) {
        target = slot;
        break;
      }
      if (slot.age > target.age) target = slot;
    }
    const sr = this.sampleRate;
    const pMul = Math.pow(2, clamp(pitch, -1.5, 1.5));
    let durSec = 0.22;
    let baseFreq = 120;
    switch (voiceIdx) {
      case 0: // kick
        durSec = 0.34;
        baseFreq = 54;
        break;
      case 1: // snare
        durSec = 0.22;
        baseFreq = 185;
        break;
      case 2: // low_tom
        durSec = 0.28;
        baseFreq = 98;
        break;
      case 3: // mid_tom
        durSec = 0.25;
        baseFreq = 148;
        break;
      case 4: // high_tom
        durSec = 0.22;
        baseFreq = 215;
        break;
      case 5: // rim
        durSec = 0.075;
        baseFreq = 490;
        break;
      case 6: // clap
        durSec = 0.26;
        baseFreq = 1200;
        break;
      case 7: // closed_hat
        durSec = 0.085;
        baseFreq = 6400;
        break;
      case 8: // open_hat
        durSec = 0.38;
        baseFreq = 6400;
        break;
      case 9: // cowbell
        durSec = 0.24;
        baseFreq = 540;
        break;
    }
    target.active = true;
    target.voiceIdx = voiceIdx;
    target.age = 0;
    target.dur = Math.max(64, Math.round((durSec * sr) / Math.sqrt(pMul)));
    target.phase1 = 0;
    target.phase2 = 0;
    target.freq = baseFreq * pMul;
    target.vel = clamp(velocity, 0, 1.2);
    target.pitchMul = pMul;
    target.lp = 0;
    target.bp = 0;
  }

  sampleXPadVoices() {
    let sum = 0;
    const sr = this.sampleRate;
    for (let i = 0; i < 8; i++) {
      const v = this.xpadPool[i];
      if (!v.active) continue;
      const t = v.age / sr;
      const u = v.age / v.dur;
      if (u >= 1) {
        v.active = false;
        continue;
      }
      v.age++;
      const env = Math.pow(1 - u, 2.4);
      let s = 0;
      switch (v.voiceIdx) {
        case 0: {
          // Punchy pitched club kick
          const f = v.freq * (1 + 3.2 * Math.exp(-t * 58));
          v.phase1 += (TWO_PI * f) / sr;
          s = Math.sin(v.phase1) * Math.pow(1 - u, 1.7) * 0.95;
          break;
        }
        case 1: {
          // Snare: dual body + crisp wire noise
          const f = v.freq * (1 + 0.9 * Math.exp(-t * 45));
          v.phase1 += (TWO_PI * f) / sr;
          const n = this.nextNoise();
          v.lp += 0.38 * (n - v.lp);
          const hp = n - v.lp;
          s = (Math.sin(v.phase1) * Math.exp(-t * 22) * 0.55 + hp * env * 0.75) * 0.9;
          break;
        }
        case 2:
        case 3:
        case 4: {
          // Tuned toms
          const f = v.freq * (1 + 1.15 * Math.exp(-t * 32));
          v.phase1 += (TWO_PI * f) / sr;
          s = Math.sin(v.phase1) * env * 0.85;
          break;
        }
        case 5: {
          // Rimshot
          v.phase1 += (TWO_PI * v.freq) / sr;
          v.phase2 += (TWO_PI * v.freq * 2.18) / sr;
          s = softClip((Math.sin(v.phase1) + 0.7 * Math.sin(v.phase2)) * 1.8) * Math.exp(-t * 55) * 0.75;
          break;
        }
        case 6: {
          // 4-burst analog hand-clap
          const n = this.nextNoise();
          v.bp += 0.26 * (n - v.bp);
          const burst =
            t < 0.032 ? ((t * 1000) % 8 < 5.5 ? 1 : 0.2) : Math.exp(-(t - 0.032) * 16) * 0.72;
          s = (n - v.bp) * burst * 0.78;
          break;
        }
        case 7:
        case 8: {
          // Metallic 6-ratio hi-hat shimmer + highpass noise
          const n = this.nextNoise();
          v.phase1 += (TWO_PI * 523 * v.pitchMul) / sr;
          v.phase2 += (TWO_PI * 811 * v.pitchMul) / sr;
          const sq = (Math.sin(v.phase1) > 0 ? 0.4 : -0.4) + (Math.sin(v.phase2) > 0 ? 0.4 : -0.4);
          const mix = n * 0.65 + sq * 0.45;
          v.lp += 0.52 * (mix - v.lp);
          const decayExp = v.voiceIdx === 7 ? Math.exp(-t * 48) : Math.exp(-t * 11);
          s = (mix - v.lp) * decayExp * 0.72;
          break;
        }
        case 9: {
          // Dual-square cowbell (540 / 800 Hz ratio)
          v.phase1 += (TWO_PI * v.freq) / sr;
          v.phase2 += (TWO_PI * v.freq * 1.481) / sr;
          const sq = (Math.sin(v.phase1) > 0 ? 0.5 : -0.5) + (Math.sin(v.phase2) > 0 ? 0.5 : -0.5);
          v.bp += 0.18 * (sq - v.bp);
          s = v.bp * Math.exp(-t * 16) * 0.75;
          break;
        }
      }
      sum += s * v.vel;
    }
    return sum;
  }

  clearSceneBuffers() {
    this.scDelayL.fill(0);
    this.scDelayR.fill(0);
    this.grainBufL.fill(0);
    this.grainBufR.fill(0);
    this.scFbLpL = 0;
    this.scFbLpR = 0;
    this.scSvfL[0] = 0;
    this.scSvfL[1] = 0;
    this.scSvfR[0] = 0;
    this.scSvfR[1] = 0;
    this.scTailFrames = 0;
  }

  /** Exact beat position of an absolute 16th-note step (matching Rust Pattern::step_beat). */
  stepToBeat(absStep) {
    const base = absStep * 0.25;
    return (absStep & 1) !== 0 ? base + this.patternShuffle * (0.25 / 3) : base;
  }

  /** Nearest absolute 16th-note step index to `beat` (accounting for shuffle). */
  nearestStepAtBeat(beat) {
    const approx = Math.floor(beat * 4);
    let bestStep = approx;
    let bestDist = 1e9;
    for (let s = approx - 1; s <= approx + 2; s++) {
      const d = Math.abs(beat - this.stepToBeat(s));
      if (d < bestDist) {
        bestDist = d;
        bestStep = s;
      }
    }
    return bestStep;
  }

  /** Earliest absolute 16th-note step index whose swung beat >= `minBeat - 1e-6`. */
  ceilStepAtBeat(minBeat) {
    let s = Math.floor(minBeat * 4) - 1;
    while (this.stepToBeat(s) < minBeat - 1e-6) s++;
    return s;
  }

  /** Handles one control message (between render calls). */
  onMessage(msg) {
    if (!this.alive || !msg) return;
    const api = this.api;
    const e = this.engine;
    switch (msg.type) {
      case "pattern": {
        const bytes = msg.bytes;
        const ptr = api.p5_alloc(bytes.length);
        new Uint8Array(api.memory.buffer, ptr, bytes.length).set(bytes);
        const rc = api.p5_engine_load_pattern_json(e, ptr);
        api.p5_free(ptr, bytes.length);
        if (rc !== 0) this.post({ type: "error", fatal: false, message: "pattern rejected (" + rc + ")" });
        break;
      }
      case "start":
        api.p5_engine_start(e);
        break;
      case "start-quantized":
        if (typeof api.p5_engine_start_quantized === "function") {
          api.p5_engine_start_quantized(e, +msg.quantum || 4);
        } else {
          api.p5_engine_start(e);
        }
        break;
      case "stop":
        api.p5_engine_stop(e);
        this.nextSampleAbsStep = -1;
        break;
      case "clock-mode":
        api.p5_engine_set_clock_mode(e, msg.mode | 0);
        break;
      case "observe":
        api.p5_engine_observe(e, +msg.sample, msg.kind | 0, +msg.phase, +msg.bpm);
        break;
      case "midi":
        api.p5_engine_midi(e, msg.code | 0, +msg.sample);
        break;
      case "tap":
        api.p5_engine_tap(e, +msg.sample);
        break;
      case "resync":
        api.p5_engine_resync(e);
        break;
      case "nudge":
        api.p5_engine_set_nudge_ms(e, +msg.ms);
        break;
      case "latency":
        api.p5_engine_set_latency_ms(e, +msg.ms);
        break;
      case "set-voice-sample": {
        const vIdx = msg.voiceIdx | 0;
        if (vIdx >= 0 && vIdx < 10 && msg.pcm && msg.pcm.length > 0) {
          this.customSamples[vIdx] = {
            pcm: msg.pcm instanceof Float32Array ? msg.pcm : new Float32Array(msg.pcm),
            name: typeof msg.name === "string" ? msg.name : "Sample",
          };
        }
        break;
      }
      case "clear-voice-sample": {
        const vIdx = msg.voiceIdx | 0;
        if (vIdx >= 0 && vIdx < 10) {
          this.customSamples[vIdx] = null;
        }
        break;
      }
      case "clear-all-samples":
        this.customSamples.fill(null);
        break;
      case "sample-meta":
        if (msg.meta && typeof msg.meta === "object") {
          this.sampleMeta = msg.meta;
        }
        break;
      case "trigger-voice": {
        const vIdx = msg.voiceIdx | 0;
        const vel = +msg.velocity || 0.9;
        if (vIdx >= 0 && vIdx < 10 && this.customSamples[vIdx]) {
          const vm = this.sampleMeta.voices?.[vIdx];
          const tune = vm && typeof vm.tune === "number" ? vm.tune : 0.5;
          const decay = vm && typeof vm.decay === "number" ? vm.decay : 0.85;
          const lvl = vm && typeof vm.level === "number" ? vm.level : 0.9;
          this.spawnSampleHit(vIdx, Math.pow(2, (tune - 0.5) * 2), vel * lvl, decay, 0);
        } else if (typeof api.p5_engine_trigger_voice === "function") {
          api.p5_engine_trigger_voice(e, vIdx, vel);
        } else {
          this.spawnXPadVoice(vIdx, 0, vel);
        }
        break;
      }
      case "grid-meta":
        this.patternShuffle = clamp(+msg.shuffle || 0, 0, 1);
        this.patternLastStep = clamp(msg.lastStep | 0 || 16, 1, 16);
        break;
      case "trigger-pad": {
        const step = api.p5_engine_playing_step(e);
        const renderBeat = api.p5_engine_beat(e);
        const tempo = Math.max(20, api.p5_engine_tempo(e) || 124);
        const loopLen = Math.max(1, Math.min(16, this.patternLastStep | 0));
        let delayFrames = 0;
        let stepIdx = -1;
        if (step >= 0 && renderBeat >= 0) {
          const heardBeat =
            typeof msg.heardBeat === "number" && msg.heardBeat >= 0 ? msg.heardBeat : renderBeat;
          if (msg.quantize) {
            const targetAbsStep = this.nearestStepAtBeat(heardBeat);
            const targetBeat = this.stepToBeat(targetAbsStep);
            const diffBeats = targetBeat - renderBeat;
            delayFrames =
              diffBeats > 0 ? Math.round(((diffBeats * 60) / tempo) * this.sampleRate) : 0;
            stepIdx = ((targetAbsStep % loopLen) + loopLen) % loopLen;
          } else {
            const curAbsStep = Math.floor(heardBeat * 4);
            stepIdx = ((curAbsStep % loopLen) + loopLen) % loopLen;
          }
        }
        let queued = false;
        for (let i = 0; i < 8; i++) {
          const p = this.pendingPads[i];
          if (!p.active) {
            p.active = true;
            p.id = msg.id | 0;
            p.framesLeft = delayFrames;
            p.voiceIdx = msg.voiceIdx | 0;
            p.pitch = +msg.pitch || 0;
            p.velocity = +msg.velocity || 0.9;
            p.stepIdx = stepIdx;
            p.overdub = !!msg.overdub;
            queued = true;
            break;
          }
        }
        if (!queued) {
          this.spawnXPadVoice(msg.voiceIdx | 0, +msg.pitch || 0, +msg.velocity || 0.9);
          this.post({ type: "pad-triggered", id: msg.id | 0, stepIdx });
        }
        break;
      }
      case "rmx-state": {
        const s = msg.state;
        if (s && typeof s === "object") {
          const prevRolling = this.rmx.xpadRolling;
          const prevDiv = this.rmx.xpadRollDiv;
          this.rmx.sceneFx = typeof s.sceneFx === "string" ? s.sceneFx : null;
          this.rmx.sceneAmount = clamp(+s.sceneAmount || 0, 0, 1);
          this.rmx.sceneSub = clamp(s.sceneSub !== undefined ? +s.sceneSub : 0.5, 0, 1);
          this.rmx.sceneSub2 = clamp(s.sceneSub2 !== undefined ? +s.sceneSub2 : 0.5, 0, 1);
          this.rmx.isoMode = typeof s.isoMode === "string" ? s.isoMode : "isolator";
          this.rmx.isoLow = clamp(+s.isoLow || 0, -48, 6);
          this.rmx.isoMid = clamp(+s.isoMid || 0, -48, 6);
          this.rmx.isoHigh = clamp(+s.isoHigh || 0, -48, 6);
          this.rmx.killLow = !!s.killLow;
          this.rmx.killMid = !!s.killMid;
          this.rmx.killHigh = !!s.killHigh;
          this.rmx.releaseMode = typeof s.releaseMode === "string" ? s.releaseMode : "vinyl_brake";
          this.rmx.releaseHeld = !!s.releaseHeld;
          const vIdx = VOICE_NAMES.indexOf(String(s.xpadVoice || "snare"));
          this.rmx.xpadVoiceIdx = vIdx >= 0 ? vIdx : 1;
          this.rmx.xpadPitch = clamp(+s.xpadPitch || 0, -1, 1);
          this.rmx.xpadRollDiv = +s.xpadRollDiv || 8;
          this.rmx.xpadRolling = !!s.xpadRolling;
          this.rmx.xpadOverdub = !!s.xpadOverdub;
          this.rmx.xpadQuantize = s.xpadQuantize !== false;
          if (!this.rmx.xpadRolling) {
            this.nextRollBeat = -1;
            this.rollStartHeardBeat = -1;
            this.lastRollHitBeat = -1e9;
            this.freeRollRemaining = 0;
          } else if (!prevRolling) {
            this.nextRollBeat = -1;
            this.rollStartHeardBeat =
              typeof s.rollStartHeardBeat === "number" ? s.rollStartHeardBeat : -1;
            this.lastRollHitBeat = -1e9;
            this.freeRollRemaining = 0;
          } else if (this.rmx.xpadRollDiv !== prevDiv) {
            // Smooth ribbon slide: keep phase locked to beat grid without double-triggering
            this.nextRollBeat = -2;
          }
        }
        break;
      }
      case "vfx-level":
        this.vfxLevel = clamp(+msg.level || 0, 0, 1);
        break;
      case "ext-gain":
        this.extGain = clamp(+msg.gain || 0, 0, 2);
        break;
      case "sync-click":
        this.syncClickAge = 0;
        this.syncClickPhase = 0;
        break;
      case "dispose":
        api.p5_engine_stop(e);
        this.alive = false;
        break;
    }
    if (msg.type !== "observe" && msg.type !== "midi") this.sinceStatus = this.statusEvery;
  }

  ensureBuffers(frames) {
    const api = this.api;
    if (frames > this.capFrames) {
      if (this.dryPtr) {
        const oldBytes = this.capFrames * 4;
        api.p5_free(this.dryPtr, oldBytes);
        api.p5_free(this.echoPtr, oldBytes);
        api.p5_free(this.reverbPtr, oldBytes);
        api.p5_free(this.filterPtr, oldBytes);
      }
      this.capFrames = frames;
      const bytes = frames * 4;
      this.dryPtr = api.p5_alloc(bytes);
      this.echoPtr = api.p5_alloc(bytes);
      this.reverbPtr = api.p5_alloc(bytes);
      this.filterPtr = api.p5_alloc(bytes);
      this.viewBuffer = null;
      this.outBufL = new Float32Array(frames);
      this.outBufR = new Float32Array(frames);
    }
    const buffer = api.memory.buffer;
    if (this.viewBuffer !== buffer || !this.dryView || this.dryView.length !== frames) {
      this.dryView = new Float32Array(buffer, this.dryPtr, frames);
      this.echoView = new Float32Array(buffer, this.echoPtr, frames);
      this.reverbView = new Float32Array(buffer, this.reverbPtr, frames);
      this.filterView = new Float32Array(buffer, this.filterPtr, frames);
      this.viewBuffer = buffer;
    }
    if (this.outPair[0].length !== frames) {
      this.outPair = [this.outBufL.subarray(0, frames), this.outBufR.subarray(0, frames)];
    }
  }

  /** Step one stereo sample through the 4-comb + 2-allpass reverb. */
  stepReverb(inSample, feedback, damp) {
    let outL = 0;
    let outR = 0;
    for (let k = 0; k < 4; k++) {
      const bL = this.combL[k];
      const iL = this.combIdxL[k];
      const yL = bL[iL];
      const stL = yL * (1 - damp) + this.combStoreL[k] * damp;
      this.combStoreL[k] = stL;
      bL[iL] = inSample + stL * feedback;
      this.combIdxL[k] = iL + 1 >= bL.length ? 0 : iL + 1;
      outL += yL;

      const bR = this.combR[k];
      const iR = this.combIdxR[k];
      const yR = bR[iR];
      const stR = yR * (1 - damp) + this.combStoreR[k] * damp;
      this.combStoreR[k] = stR;
      bR[iR] = inSample + stR * feedback;
      this.combIdxR[k] = iR + 1 >= bR.length ? 0 : iR + 1;
      outR += yR;
    }
    outL *= 0.22;
    outR *= 0.22;
    for (let k = 0; k < 2; k++) {
      const aL = this.apL[k];
      const iL = this.apIdxL[k];
      const bufOutL = aL[iL];
      aL[iL] = outL + bufOutL * 0.5;
      outL = bufOutL - outL * 0.5;
      this.apIdxL[k] = iL + 1 >= aL.length ? 0 : iL + 1;

      const aR = this.apR[k];
      const iR = this.apIdxR[k];
      const bufOutR = aR[iR];
      aR[iR] = outR + bufOutR * 0.5;
      outR = bufOutR - outR * 0.5;
      this.apIdxR[k] = iR + 1 >= aR.length ? 0 : iR + 1;
    }
    this.revOutL = outL;
    this.revOutR = outR;
  }

  /** Step one channel through the 24 dB/oct Linkwitz-Riley 3-band crossover. */
  stepIsolatorChannel(x, st, gLow, gMid, gHigh) {
    const c1 = this.lr250;
    const c2 = this.lr2800;

    // 1. Low branch: LP4 at 250 Hz (stages 0, 2)
    let v3 = x - st[1];
    let v1 = c1[0] * st[0] + c1[1] * v3;
    let v2 = st[1] + c1[1] * st[0] + c1[2] * v3;
    st[0] = 2 * v1 - st[0];
    st[1] = 2 * v2 - st[1];
    let lp1 = v2;

    v3 = lp1 - st[3];
    v1 = c1[0] * st[2] + c1[1] * v3;
    v2 = st[3] + c1[1] * st[2] + c1[2] * v3;
    st[2] = 2 * v1 - st[2];
    st[3] = 2 * v2 - st[3];
    const lowRaw = v2;

    // 2. Mid+High branch: HP4 at 250 Hz (stages 4, 6)
    v3 = x - st[5];
    v1 = c1[0] * st[4] + c1[1] * v3;
    v2 = st[5] + c1[1] * st[4] + c1[2] * v3;
    st[4] = 2 * v1 - st[4];
    st[5] = 2 * v2 - st[5];
    const hp1 = x - c1[3] * v1 - v2;

    v3 = hp1 - st[7];
    v1 = c1[0] * st[6] + c1[1] * v3;
    v2 = st[7] + c1[1] * st[6] + c1[2] * v3;
    st[6] = 2 * v1 - st[6];
    st[7] = 2 * v2 - st[7];
    const midHigh = hp1 - c1[3] * v1 - v2;

    // 3. Phase-align Low through AP_2800 = LP4_2800(lowRaw) + HP4_2800(lowRaw) (stages 8..15)
    v3 = lowRaw - st[9];
    v1 = c2[0] * st[8] + c2[1] * v3;
    v2 = st[9] + c2[1] * st[8] + c2[2] * v3;
    st[8] = 2 * v1 - st[8];
    st[9] = 2 * v2 - st[9];
    const lapLp1 = v2;

    v3 = lapLp1 - st[11];
    v1 = c2[0] * st[10] + c2[1] * v3;
    v2 = st[11] + c2[1] * st[10] + c2[2] * v3;
    st[10] = 2 * v1 - st[10];
    st[11] = 2 * v2 - st[11];
    const lapLp2 = v2;

    v3 = lowRaw - st[13];
    v1 = c2[0] * st[12] + c2[1] * v3;
    v2 = st[13] + c2[1] * st[12] + c2[2] * v3;
    st[12] = 2 * v1 - st[12];
    st[13] = 2 * v2 - st[13];
    const lapHp1 = lowRaw - c2[3] * v1 - v2;

    v3 = lapHp1 - st[15];
    v1 = c2[0] * st[14] + c2[1] * v3;
    v2 = st[15] + c2[1] * st[14] + c2[2] * v3;
    st[14] = 2 * v1 - st[14];
    st[15] = 2 * v2 - st[15];
    const lapHp2 = lapHp1 - c2[3] * v1 - v2;
    const low = lapLp2 + lapHp2;

    // 4. Split MidHigh at 2800 Hz -> Mid (LP4 stages 16..19) & High (HP4 stages 20..23)
    v3 = midHigh - st[17];
    v1 = c2[0] * st[16] + c2[1] * v3;
    v2 = st[17] + c2[1] * st[16] + c2[2] * v3;
    st[16] = 2 * v1 - st[16];
    st[17] = 2 * v2 - st[17];
    const mLp1 = v2;

    v3 = mLp1 - st[19];
    v1 = c2[0] * st[18] + c2[1] * v3;
    v2 = st[19] + c2[1] * st[18] + c2[2] * v3;
    st[18] = 2 * v1 - st[18];
    st[19] = 2 * v2 - st[19];
    const mid = v2;

    v3 = midHigh - st[21];
    v1 = c2[0] * st[20] + c2[1] * v3;
    v2 = st[21] + c2[1] * st[20] + c2[2] * v3;
    st[20] = 2 * v1 - st[20];
    st[21] = 2 * v2 - st[21];
    const hHp1 = midHigh - c2[3] * v1 - v2;

    v3 = hHp1 - st[23];
    v1 = c2[0] * st[22] + c2[1] * v3;
    v2 = st[23] + c2[1] * st[22] + c2[2] * v3;
    st[22] = 2 * v1 - st[22];
    st[23] = 2 * v2 - st[23];
    const high = hHp1 - c2[3] * v1 - v2;

    return low * gLow + mid * gMid + high * gHigh;
  }

  isoTargetGain(db, kill) {
    if (kill || db <= -47.5) return 0;
    if (db < -36) return ((db + 48) / 12) * 0.015848931924611134;
    return Math.pow(10, db / 20);
  }

  /**
   * Renders `frames` stereo samples and returns `[outL, outR]` (valid until
   * the next call). `contextFrame` is the audio-context frame this block
   * starts at.
   */
  processStereo(frames, contextFrame, inL, inR) {
    const api = this.api;
    const e = this.engine;
    const sr = this.sampleRate;
    const position = api.p5_engine_position_f64(e);
    const offset = contextFrame - position;
    if (offset !== this.offset) {
      this.offset = offset;
      this.post({ type: "offset", offset: offset });
    }

    this.ensureBuffers(frames);
    if (typeof api.p5_engine_render_buses === "function") {
      api.p5_engine_render_buses(e, this.dryPtr, this.echoPtr, this.reverbPtr, this.filterPtr, frames);
    } else {
      api.p5_engine_render(e, this.dryPtr, frames);
      this.echoView.fill(0);
      this.reverbView.fill(0);
      this.filterView.fill(0);
    }
    // Re-check buffer in case WASM linear memory grew during render
    if (this.viewBuffer !== api.memory.buffer) this.ensureBuffers(frames);

    const dry = this.dryView;
    const echoIn = this.echoView;
    const revIn = this.reverbView;
    const fltIn = this.filterView;
    const outL = this.outPair[0];
    const outR = this.outPair[1];

    const step = api.p5_engine_playing_step(e);
    const endBeat = api.p5_engine_beat(e);
    const tempo = clamp(api.p5_engine_tempo(e) || 124, 30, 300);
    const beatSec = 60 / tempo;
    const beatsPerSample = 1 / (beatSec * sr);
    const startBeat = endBeat - frames * beatsPerSample;

    const rmx = this.rmx;
    const tLow = this.isoTargetGain(rmx.isoLow, rmx.killLow);
    const tMid = this.isoTargetGain(rmx.isoMid, rmx.killMid);
    const tHigh = this.isoTargetGain(rmx.isoHigh, rmx.killHigh);
    const isoActive =
      rmx.isoMode !== "isolator" ||
      rmx.killLow ||
      rmx.killMid ||
      rmx.killHigh ||
      Math.abs(rmx.isoLow) > 0.05 ||
      Math.abs(rmx.isoMid) > 0.05 ||
      Math.abs(rmx.isoHigh) > 0.05;

    const sceneAmt = rmx.sceneFx ? rmx.sceneAmount : 0;
    const sceneSub = rmx.sceneSub;
    const sceneSub2 = rmx.sceneSub2;
    if (sceneAmt > 0.002) {
      this.scTailFrames = Math.round(sr * 2.4);
    }

    // Release FX rising/falling edge transitions
    if (rmx.releaseHeld && !this.wasReleaseHeld) {
      this.wasReleaseHeld = true;
      this.relReadPos = (this.relWritePos - 1 + this.relLen) % this.relLen;
      this.relSpeed = 1;
      this.relAge = 0;
      this.relEchoLpL = 0;
      this.relEchoLpR = 0;
    } else if (!rmx.releaseHeld && this.wasReleaseHeld) {
      this.wasReleaseHeld = false;
      this.clearSceneBuffers();
    }

    // Precompute block-rate Scene FX filter coeffs when active
    let scCoeffs = null;
    let noiseCoeffs = null;
    if (sceneAmt > 0.002 || this.scTailFrames > 0) {
      let fc = 1200;
      let r2 = 1.0;
      if (rmx.sceneFx === "bpf_echo") {
        fc = 220 * Math.pow(16, sceneAmt);
        r2 = 1 / (0.9 + sceneSub * 3.2);
      } else if (rmx.sceneFx === "hpf_echo") {
        fc = 80 * Math.pow(45, sceneAmt);
        r2 = 1 / (0.8 + sceneSub * 2.5);
      } else if (rmx.sceneFx === "lpf_echo") {
        fc = 14000 * Math.pow(0.035, sceneAmt);
        r2 = 1 / (0.8 + sceneSub * 2.5);
      } else if (rmx.sceneFx === "reverb_up") {
        fc = 260 * Math.pow(12, sceneAmt);
        r2 = 1.1;
      } else if (rmx.sceneFx === "reverb_down") {
        fc = 8000 * Math.pow(0.06, sceneAmt);
        r2 = 1.1;
      }
      scCoeffs = svfCoeffs(fc, sr, r2);
      if (rmx.sceneFx === "noise") {
        const nfc = 180 * Math.pow(38, sceneAmt);
        const nr2 = 1 / (1.8 + sceneSub * 6.0);
        noiseCoeffs = svfCoeffs(nfc, sr, nr2);
      }
    }

    const vEchoTap = clamp(Math.round(beatSec * 0.5 * sr), 64, this.vEchoLen - 4);
    const vEchoTapL = vEchoTap;
    const vEchoTapR = vEchoTap;
    const hasExt = this.extGain > 0.001 && inL !== null && inL !== undefined;
    const loopLen = Math.max(1, Math.min(16, this.patternLastStep | 0));

    let blockPeak = 0;

    for (let i = 0; i < frames; i++) {
      // 1. Sample-accurate pending quantized X-Pad triggers
      for (let pIdx = 0; pIdx < 8; pIdx++) {
        const p = this.pendingPads[pIdx];
        if (!p.active) continue;
        if (p.framesLeft <= 0) {
          p.active = false;
          this.spawnXPadVoice(p.voiceIdx, p.pitch, p.velocity);
          this.post({ type: "pad-triggered", id: p.id, stepIdx: p.stepIdx });
        } else {
          p.framesLeft--;
        }
      }

      // 2. Sample-accurate X-Pad Beat Roll (latency-aware + shuffle & last_step synced)
      const curBeat = startBeat + i * beatsPerSample;
      if (rmx.xpadRolling) {
        const div = rmx.xpadRollDiv || 8;
        const divBeats = 4 / div;
        if (step >= 0 && curBeat >= -0.25) {
          if (this.nextRollBeat === -1) {
            if (!rmx.xpadQuantize) {
              this.nextRollBeat = curBeat;
              this.rollAbsStep = this.ceilStepAtBeat(curBeat);
            } else {
              const heard = this.rollStartHeardBeat >= 0 ? this.rollStartHeardBeat : curBeat;
              if (div === 16) {
                let s0 = this.nearestStepAtBeat(heard);
                let b0 = this.stepToBeat(s0);
                const b1 = this.stepToBeat(s0 + 1);
                if (b0 < curBeat && curBeat > b0 + (b1 - b0) * 0.65) {
                  s0 = this.ceilStepAtBeat(curBeat);
                  b0 = this.stepToBeat(s0);
                }
                this.rollAbsStep = s0;
                this.nextRollBeat = b0;
              } else {
                const gridUnit = Math.min(1.0, divBeats);
                const prevGrid = Math.floor(heard / gridUnit) * gridUnit;
                const nextGrid = prevGrid + gridUnit;
                const catchWin = Math.min(0.18, gridUnit * 0.42);
                const catchPrev =
                  heard - prevGrid <= catchWin && curBeat <= prevGrid + divBeats * 0.65;
                this.nextRollBeat = catchPrev ? prevGrid : nextGrid;
                if (this.nextRollBeat < curBeat && curBeat > this.nextRollBeat + divBeats * 0.65) {
                  this.nextRollBeat = Math.ceil((curBeat - 1e-6) / gridUnit) * gridUnit;
                }
              }
            }
          } else if (this.nextRollBeat === -2) {
            // Smooth division slide on ribbon without double-triggering
            const minNext = Math.max(curBeat, this.lastRollHitBeat + divBeats * 0.45);
            if (rmx.xpadQuantize && div === 16) {
              this.rollAbsStep = this.ceilStepAtBeat(minNext);
              this.nextRollBeat = this.stepToBeat(this.rollAbsStep);
            } else if (rmx.xpadQuantize) {
              const g = Math.min(1.0, divBeats);
              this.nextRollBeat = Math.ceil((minNext - 1e-6) / g) * g;
            } else {
              this.nextRollBeat = minNext;
            }
          } else if (this.nextRollBeat < curBeat - Math.max(divBeats * 2, 1.0)) {
            if (rmx.xpadQuantize && div === 16) {
              this.rollAbsStep = this.ceilStepAtBeat(curBeat);
              this.nextRollBeat = this.stepToBeat(this.rollAbsStep);
            } else if (rmx.xpadQuantize) {
              const g = Math.min(1.0, divBeats);
              this.nextRollBeat = Math.ceil((curBeat - 1e-6) / g) * g;
            } else {
              this.nextRollBeat = curBeat;
            }
          }
          if (curBeat >= this.nextRollBeat) {
            const hitBeat = this.nextRollBeat;
            this.lastRollHitBeat = curBeat;
            if (rmx.xpadQuantize && div === 16) {
              do {
                this.rollAbsStep++;
                this.nextRollBeat = this.stepToBeat(this.rollAbsStep);
              } while (this.nextRollBeat <= curBeat);
            } else {
              do {
                this.nextRollBeat += divBeats;
              } while (this.nextRollBeat <= curBeat);
            }
            const accent = div >= 16 || Math.abs(hitBeat - Math.round(hitBeat)) < 0.02;
            this.spawnXPadVoice(rmx.xpadVoiceIdx, rmx.xpadPitch, accent ? 0.96 : 0.82);
            if (rmx.xpadOverdub && div <= 16) {
              const absStep = rmx.xpadQuantize
                ? this.nearestStepAtBeat(hitBeat)
                : Math.floor(hitBeat * 4);
              const sIdx = ((absStep % loopLen) + loopLen) % loopLen;
              this.post({
                type: "overdub",
                voiceIdx: rmx.xpadVoiceIdx,
                stepIdx: sIdx,
                accent,
                pitch: rmx.xpadPitch,
              });
            }
          }
        } else {
          if (this.freeRollRemaining <= 0) {
            this.freeRollRemaining = Math.max(64, Math.round(divBeats * beatSec * sr));
            this.spawnXPadVoice(rmx.xpadVoiceIdx, rmx.xpadPitch, 0.9);
          }
          this.freeRollRemaining--;
        }
      }

      // 2b. Sample-accurate trigger for any user-loaded WAV kit voices
      if (step >= 0 && curBeat >= -0.05) {
        if (this.nextSampleAbsStep < 0) {
          this.nextSampleAbsStep = this.ceilStepAtBeat(curBeat);
        } else if (curBeat < this.stepToBeat(this.nextSampleAbsStep) - 2.0) {
          this.nextSampleAbsStep = this.ceilStepAtBeat(curBeat);
        }
        let guard = 0;
        while (curBeat >= this.stepToBeat(this.nextSampleAbsStep) && guard++ < 4) {
          this.triggerSampleStep(this.nextSampleAbsStep);
          this.nextSampleAbsStep++;
        }
      }

      // 3. Dry mix + X-Pad voices + Custom WAV Sample Pool + Sync Click + External Input
      let sigL = dry[i];
      let sigR = sigL;

      const wavSample = this.sampleWavVoices();
      if (wavSample !== 0) {
        sigL += wavSample;
        sigR += wavSample;
      }

      const xpadSample = this.sampleXPadVoices();
      if (xpadSample !== 0) {
        sigL += xpadSample;
        sigR += xpadSample;
      }

      if (this.syncClickAge >= 0) {
        const clickDur = Math.round(0.012 * sr);
        if (this.syncClickAge >= clickDur) {
          this.syncClickAge = -1;
        } else {
          const cu = this.syncClickAge / clickDur;
          this.syncClickPhase += (TWO_PI * 1650) / sr;
          const click = Math.sin(this.syncClickPhase) * Math.pow(1 - cu, 3) * 0.7;
          sigL += click;
          sigR += click;
          this.syncClickAge++;
        }
      }

      if (hasExt) {
        sigL += (inL[i] || 0) * this.extGain;
        sigR += ((inR ? inR[i] : inL[i]) || 0) * this.extGain;
      }

      // 4. Per-Voice Stereo FX Returns (Ping-Pong Dub Echo, Space Reverb, Acid SVF Filter)
      const eIn = echoIn[i];
      const rIn = revIn[i];
      const fIn = fltIn[i];
      if (eIn > 1e-6 || eIn < -1e-6 || rIn > 1e-6 || rIn < -1e-6 || fIn > 1e-6 || fIn < -1e-6) {
        this.vfxActiveFrames = Math.round(sr * 3.0);
      }

      let sharedRevUsed = false;
      if (this.vfxActiveFrames > 0) {
        this.vfxActiveFrames--;
        const vLvl = this.vfxLevel;

        // Stereo Ping-Pong Dub Echo
        const readIdxL = (this.vEchoPos - vEchoTapL + this.vEchoLen) % this.vEchoLen;
        const readIdxR = (this.vEchoPos - vEchoTapR + this.vEchoLen) % this.vEchoLen;
        const dL = this.vEchoL[readIdxL];
        const dR = this.vEchoR[readIdxR];
        // Warm analog tape bandpass (HP ~180 Hz, LP ~2600 Hz)
        this.vEchoHpL += 0.025 * (dL - this.vEchoHpL);
        this.vEchoHpR += 0.025 * (dR - this.vEchoHpR);
        this.vEchoLpL += 0.28 * (dL - this.vEchoHpL - this.vEchoLpL);
        this.vEchoLpR += 0.28 * (dR - this.vEchoHpR - this.vEchoLpR);
        const fbL = softClip(eIn * 0.9 + this.vEchoLpR * 0.56);
        const fbR = softClip(eIn * 0.65 + this.vEchoLpL * 0.56);
        this.vEchoL[this.vEchoPos] = fbL;
        this.vEchoR[this.vEchoPos] = fbR;
        this.vEchoPos = this.vEchoPos + 1 >= this.vEchoLen ? 0 : this.vEchoPos + 1;
        sigL += this.vEchoLpL * 0.88 * vLvl;
        sigR += this.vEchoLpR * 0.88 * vLvl;

        // Stereo Space Reverb
        const sceneWantsReverb =
          sceneAmt > 0.002 && (rmx.sceneFx === "reverb_up" || rmx.sceneFx === "reverb_down");
        if (!sceneWantsReverb) {
          this.stepReverb(rIn * 0.65, 0.82, 0.26);
          sharedRevUsed = true;
          sigL += this.revOutL * 0.95 * vLvl;
          sigR += this.revOutR * 0.95 * vLvl;
        }

        // Acid Resonant Envelope-Followed SVF Filter + Drive
        const absF = fIn < 0 ? -fIn : fIn;
        this.vFltEnv = absF > this.vFltEnv ? this.vFltEnv + 0.02 * (absF - this.vFltEnv) : this.vFltEnv * 0.9992;
        const acidFc = 380 + this.vFltEnv * 3600;
        const ac = svfCoeffs(acidFc, sr, 0.26); // Q ~ 3.8
        const fstL = this.vFltStateL;
        const fv3 = fIn - fstL[1];
        const fv1 = ac[0] * fstL[0] + ac[1] * fv3;
        const fv2 = fstL[1] + ac[1] * fstL[0] + ac[2] * fv3;
        fstL[0] = 2 * fv1 - fstL[0];
        fstL[1] = 2 * fv2 - fstL[1];
        const acidSample = softClip((fv1 * 1.9 + fv2 * 0.6) * 2.1) * 0.78 * vLvl;
        sigL += acidSample;
        sigR += acidSample * 0.94;
      }

      // 5. 24 dB/oct Linkwitz-Riley 3-Band Isolator + 4 Rhythmic Modes
      const targetIsoMix = isoActive ? 1 : 0;
      this.isoMix += (targetIsoMix - this.isoMix) * this.isoSmooth;
      if (targetIsoMix === 0 && this.isoMix < 1e-4) this.isoMix = 0;
      else if (targetIsoMix === 1 && this.isoMix > 0.9999) this.isoMix = 1;

      if (this.isoMix > 0) {
        this.gLow += (tLow - this.gLow) * this.isoSmooth;
        this.gMid += (tMid - this.gMid) * this.isoSmooth;
        this.gHigh += (tHigh - this.gHigh) * this.isoSmooth;
        if (tLow === 0 && this.gLow < 1e-5) this.gLow = 0;
        if (tMid === 0 && this.gMid < 1e-5) this.gMid = 0;
        if (tHigh === 0 && this.gHigh < 1e-5) this.gHigh = 0;

        let effLow = this.gLow;
        let effMid = this.gMid;
        let effHigh = this.gHigh;

        if (rmx.isoMode === "cut_add" && curBeat >= 0) {
          const ph8 = ((curBeat * 2) % 1 + 1) % 1;
          const pulse = ph8 < 0.5 ? 1 : 0.25;
          if (rmx.isoLow > 0.5) effLow *= 0.6 + 0.6 * pulse;
          if (rmx.isoMid > 0.5) effMid *= 0.6 + 0.6 * pulse;
          if (rmx.isoHigh > 0.5) effHigh *= 0.6 + 0.6 * pulse;
        }

        let isoL = this.stepIsolatorChannel(sigL, this.isoStL, effLow, effMid, effHigh);
        let isoR = this.stepIsolatorChannel(sigR, this.isoStR, effLow, effMid, effHigh);

        if (rmx.isoMode === "trans_roll") {
          let ph16;
          if (curBeat >= 0) {
            let s16 = Math.floor(curBeat * 4);
            if (curBeat < this.stepToBeat(s16)) s16--;
            else if (curBeat >= this.stepToBeat(s16 + 1)) s16++;
            const t0 = this.stepToBeat(s16);
            const t1 = this.stepToBeat(s16 + 1);
            ph16 = clamp((curBeat - t0) / Math.max(0.05, t1 - t0), 0, 1);
          } else {
            ph16 = ((this.sinceStatus * 8) / sr) % 1;
          }
          const duty = 0.48;
          const gate = ph16 < duty ? 1 : 0.06;
          isoL *= gate;
          isoR *= gate;
        } else if (rmx.isoMode === "gate_drive") {
          const lvl = Math.max(isoL < 0 ? -isoL : isoL, isoR < 0 ? -isoR : isoR);
          this.isoEnv = lvl > this.isoEnv ? lvl : this.isoEnv * 0.9985;
          const gate = this.isoEnv > 0.045 ? 1 : this.isoEnv / 0.045;
          isoL = softClip(isoL * 2.2) * gate;
          isoR = softClip(isoR * 2.2) * gate;
        }

        sigL = sigL * (1 - this.isoMix) + isoL * this.isoMix;
        sigR = sigR * (1 - this.isoMix) + isoR * this.isoMix;
      }

      // 6. 10 Pioneer RMX-1000 Scene FX (Build Up & Break Down)
      if (sceneAmt > 0.002 || this.scTailFrames > 0) {
        if (sceneAmt <= 0.002 && this.scTailFrames > 0) this.scTailFrames--;
        const fx = rmx.sceneFx;

        if (fx === "noise" && noiseCoeffs) {
          const nL = this.nextNoise();
          const nR = this.nextNoise();
          const stL = this.noiseSvfL;
          const v3L = nL - stL[1];
          const bpL = noiseCoeffs[0] * stL[0] + noiseCoeffs[1] * v3L;
          const lpL = stL[1] + noiseCoeffs[1] * stL[0] + noiseCoeffs[2] * v3L;
          stL[0] = 2 * bpL - stL[0];
          stL[1] = 2 * lpL - stL[1];

          const stR = this.noiseSvfR;
          const v3R = nR - stR[1];
          const bpR = noiseCoeffs[0] * stR[0] + noiseCoeffs[1] * v3R;
          const lpR = stR[1] + noiseCoeffs[1] * stR[0] + noiseCoeffs[2] * v3R;
          stR[0] = 2 * bpR - stR[0];
          stR[1] = 2 * lpR - stR[1];

          const pump =
            sceneSub2 > 0.1 && curBeat >= 0
              ? 1 - sceneSub2 * 0.65 * (0.5 + 0.5 * Math.cos(TWO_PI * curBeat * 2))
              : 1;
          const jetGain = sceneAmt * 0.52 * pump;
          sigL += bpL * jetGain;
          sigR += bpR * jetGain;
        } else if (fx === "spiral_up" || fx === "spiral_down") {
          // Dual-tap rotating-grain pitch-shifted spiral feedback delay
          const dir = fx === "spiral_up" ? 1 : -1;
          const pitchSt = dir * (1 + sceneAmt * 7 + sceneSub2 * 5);
          const ratio = Math.pow(2, pitchSt / 12);
          let spiralBeats;
          if (rmx.xpadQuantize !== false) {
            const divs = [1.0, 0.75, 0.5, 0.375, 0.25, 0.1875, 0.125, 0.0625];
            const rawIdx = clamp(Math.floor(sceneAmt * divs.length), 0, divs.length - 1);
            spiralBeats = fx === "spiral_up" ? divs[rawIdx] : divs[divs.length - 1 - rawIdx];
          } else {
            spiralBeats = fx === "spiral_up" ? 0.75 - sceneAmt * 0.58 : 0.18 + sceneAmt * 0.65;
          }
          const spiralSec = beatSec * spiralBeats;
          const dSamples = clamp(Math.round(spiralSec * sr), 64, this.scDelayLen - 4);
          const rd = (this.scDelayPos - dSamples + this.scDelayLen) % this.scDelayLen;
          const delL = this.scDelayL[rd];
          const delR = this.scDelayR[rd];

          // Write delay output into grain buffer & read two 180-deg Hann-windowed taps
          const gw = this.grainWrite;
          this.grainBufL[gw] = sigL * 0.6 + delL;
          this.grainBufR[gw] = sigR * 0.6 + delR;
          this.grainWrite = gw + 1 >= this.grainLen ? 0 : gw + 1;

          const rate = (1 - ratio) / this.grainLen;
          this.grainPhase = (this.grainPhase + rate + 1) % 1;
          const phA = this.grainPhase;
          const phB = (phA + 0.5) % 1;
          const winA = 0.5 - 0.5 * Math.cos(TWO_PI * phA);
          const winB = 0.5 - 0.5 * Math.cos(TWO_PI * phB);

          const readGrain = (buf, ph) => {
            const pos = (gw - ph * (this.grainLen - 8) + this.grainLen) % this.grainLen;
            const idx0 = pos | 0;
            const frac = pos - idx0;
            const idx1 = idx0 + 1 >= this.grainLen ? 0 : idx0 + 1;
            return buf[idx0] * (1 - frac) + buf[idx1] * frac;
          };

          const shL = readGrain(this.grainBufL, phA) * winA + readGrain(this.grainBufL, phB) * winB;
          const shR = readGrain(this.grainBufR, phA) * winA + readGrain(this.grainBufR, phB) * winB;

          const fb = 0.28 + sceneSub * 0.54;
          this.scFbLpL += 0.35 * (shL - this.scFbLpL);
          this.scFbLpR += 0.35 * (shR - this.scFbLpR);
          this.scDelayL[this.scDelayPos] = softClip(this.scFbLpR * fb);
          this.scDelayR[this.scDelayPos] = softClip(this.scFbLpL * fb);
          this.scDelayPos = this.scDelayPos + 1 >= this.scDelayLen ? 0 : this.scDelayPos + 1;

          const wet = sceneAmt * 0.78;
          sigL += shL * wet;
          sigR += shR * wet;
        } else if (fx === "reverb_up" || fx === "reverb_down") {
          const revInMono = (sigL + sigR) * 0.4 + (sharedRevUsed ? 0 : revIn[i] * 0.5);
          const fb = 0.76 + sceneAmt * 0.16;
          const damp = fx === "reverb_up" ? 0.12 : 0.48;
          this.stepReverb(revInMono, fb, damp);
          let wL = this.revOutL;
          let wR = this.revOutR;
          if (scCoeffs) {
            const stL = this.scSvfL;
            const v3L = wL - stL[1];
            const bpL = scCoeffs[0] * stL[0] + scCoeffs[1] * v3L;
            const lpL = stL[1] + scCoeffs[1] * stL[0] + scCoeffs[2] * v3L;
            stL[0] = 2 * bpL - stL[0];
            stL[1] = 2 * lpL - stL[1];
            wL = fx === "reverb_up" ? wL - scCoeffs[3] * bpL - lpL : lpL;

            const stR = this.scSvfR;
            const v3R = wR - stR[1];
            const bpR = scCoeffs[0] * stR[0] + scCoeffs[1] * v3R;
            const lpR = stR[1] + scCoeffs[1] * stR[0] + scCoeffs[2] * v3R;
            stR[0] = 2 * bpR - stR[0];
            stR[1] = 2 * lpR - stR[1];
            wR = fx === "reverb_up" ? wR - scCoeffs[3] * bpR - lpR : lpR;
          }
          const wet = sceneAmt * 0.85;
          sigL = sigL * (1 - sceneAmt * 0.28) + wL * wet;
          sigR = sigR * (1 - sceneAmt * 0.28) + wR * wet;
        } else if (scCoeffs) {
          // bpf_echo, echo, hpf_echo, lpf_echo, crush_echo
          let procL = sigL;
          let procR = sigR;
          if (fx === "crush_echo") {
            const decim = Math.max(1, Math.round(1 + sceneAmt * 18));
            if (this.crushCount <= 0) {
              this.crushCount = decim;
              const steps = Math.max(3, Math.round(28 - sceneAmt * 24));
              this.crushHoldL = Math.round(sigL * steps) / steps;
              this.crushHoldR = Math.round(sigR * steps) / steps;
            }
            this.crushCount--;
            procL = sigL * (1 - sceneAmt * 0.75) + softClip(this.crushHoldL * 1.5) * sceneAmt * 0.85;
            procR = sigR * (1 - sceneAmt * 0.75) + softClip(this.crushHoldR * 1.5) * sceneAmt * 0.85;
          } else if (fx === "bpf_echo" || fx === "hpf_echo" || fx === "lpf_echo") {
            const stL = this.scSvfL;
            const v3L = sigL - stL[1];
            const bpL = scCoeffs[0] * stL[0] + scCoeffs[1] * v3L;
            const lpL = stL[1] + scCoeffs[1] * stL[0] + scCoeffs[2] * v3L;
            stL[0] = 2 * bpL - stL[0];
            stL[1] = 2 * lpL - stL[1];
            const fltL = fx === "bpf_echo" ? bpL : fx === "lpf_echo" ? lpL : sigL - scCoeffs[3] * bpL - lpL;

            const stR = this.scSvfR;
            const v3R = sigR - stR[1];
            const bpR = scCoeffs[0] * stR[0] + scCoeffs[1] * v3R;
            const lpR = stR[1] + scCoeffs[1] * stR[0] + scCoeffs[2] * v3R;
            stR[0] = 2 * bpR - stR[0];
            stR[1] = 2 * lpR - stR[1];
            const fltR = fx === "bpf_echo" ? bpR : fx === "lpf_echo" ? lpR : sigR - scCoeffs[3] * bpR - lpR;

            const blend = clamp(sceneAmt * 1.2, 0, 1);
            procL = sigL * (1 - blend * 0.65) + fltL * blend;
            procR = sigR * (1 - blend * 0.65) + fltR * blend;
          }

          // Sub2 selects musical division: <33% dotted-8th (3/16), 33-66% 8th (1/8), >66% 16th (1/16)
          const divMult = sceneSub2 < 0.33 ? 0.75 : sceneSub2 > 0.66 ? 0.25 : 0.5;
          const dSamples = clamp(Math.round(beatSec * divMult * sr), 64, this.scDelayLen - 4);
          const rd = (this.scDelayPos - dSamples + this.scDelayLen) % this.scDelayLen;
          const delL = this.scDelayL[rd];
          const delR = this.scDelayR[rd];
          this.scFbLpL += 0.32 * (delL - this.scFbLpL);
          this.scFbLpR += 0.32 * (delR - this.scFbLpR);
          const fb = sceneAmt > 0.002 ? 0.22 + sceneSub * 0.58 : 0.42;
          this.scDelayL[this.scDelayPos] = softClip((sceneAmt > 0.002 ? procL * 0.82 : 0) + this.scFbLpR * fb);
          this.scDelayR[this.scDelayPos] = softClip((sceneAmt > 0.002 ? procR * 0.52 : 0) + this.scFbLpL * fb);
          this.scDelayPos = this.scDelayPos + 1 >= this.scDelayLen ? 0 : this.scDelayPos + 1;

          const wet = sceneAmt > 0.002 ? sceneAmt * 0.72 : 0.45;
          sigL = procL + this.scFbLpL * wet;
          sigR = procR + this.scFbLpR * wet;
        }
      }

      // 7. 4-Second Stereo Circular Ring Buffer Release FX (Vinyl Brake / Back Spin / Echo Out)
      if (!rmx.releaseHeld) {
        this.relBufL[this.relWritePos] = sigL;
        this.relBufR[this.relWritePos] = sigR;
        this.relWritePos = this.relWritePos + 1 >= this.relLen ? 0 : this.relWritePos + 1;
      } else {
        const relSec = this.relAge / sr;
        this.relAge++;
        if (rmx.releaseMode === "vinyl_brake") {
          // Exponential turntable platter motor-off pitch deceleration (1.0x -> 0.0x)
          const brakeTau = 0.22 + sceneSub * 0.45;
          this.relSpeed = Math.exp(-relSec / brakeTau);
          if (this.relSpeed < 0.012) {
            sigL = 0;
            sigR = 0;
          } else {
            const idx0 = this.relReadPos | 0;
            const frac = this.relReadPos - idx0;
            const idx1 = idx0 + 1 >= this.relLen ? 0 : idx0 + 1;
            const env = clamp(this.relSpeed * 1.15, 0, 1);
            sigL = (this.relBufL[idx0] * (1 - frac) + this.relBufL[idx1] * frac) * env;
            sigR = (this.relBufR[idx0] * (1 - frac) + this.relBufR[idx1] * frac) * env;
            this.relReadPos += this.relSpeed;
            if (this.relReadPos >= this.relLen) this.relReadPos -= this.relLen;
          }
        } else if (rmx.releaseMode === "back_spin") {
          // Rapid reverse platter whip-back (-3.8x) with high-frequency slip-mat sizzle & fade
          const whip = relSec < 0.04 ? 1 - (relSec / 0.04) * 4.8 : -3.8 * Math.exp(-(relSec - 0.04) * 2.1);
          this.relSpeed = whip;
          const env = Math.exp(-relSec * 1.85);
          if (env < 0.008) {
            sigL = 0;
            sigR = 0;
          } else {
            const idx0 = this.relReadPos | 0;
            const frac = this.relReadPos - idx0;
            const idx1 = idx0 + 1 >= this.relLen ? 0 : idx0 + 1;
            sigL = (this.relBufL[idx0] * (1 - frac) + this.relBufL[idx1] * frac) * env;
            sigR = (this.relBufR[idx0] * (1 - frac) + this.relBufR[idx1] * frac) * env;
            this.relReadPos = (this.relReadPos + this.relSpeed + this.relLen) % this.relLen;
          }
        } else {
          // Release Echo Out: cut incoming dry signal and ring out regenerative quarter-note dub echo
          const dSamples = clamp(Math.round(beatSec * 0.5 * sr), 64, this.relLen - 4);
          const rd = (this.relWritePos - dSamples + this.relLen) % this.relLen;
          const eL = this.relBufL[rd];
          const eR = this.relBufR[rd];
          this.relEchoLpL += 0.28 * (eL - this.relEchoLpL);
          this.relEchoLpR += 0.28 * (eR - this.relEchoLpR);
          const fb = 0.78;
          this.relBufL[this.relWritePos] = this.relEchoLpR * fb;
          this.relBufR[this.relWritePos] = this.relEchoLpL * fb;
          this.relWritePos = this.relWritePos + 1 >= this.relLen ? 0 : this.relWritePos + 1;
          sigL = this.relEchoLpL * 0.92;
          sigR = this.relEchoLpR * 0.92;
        }
      }

      // 8. Post-RMX Stereo Safety Limiter (-0.3 dBFS ceiling = 0.966)
      const absL = sigL < 0 ? -sigL : sigL;
      const absR = sigR < 0 ? -sigR : sigR;
      const maxAbs = absL > absR ? absL : absR;
      const ceiling = 0.966;
      const needed = maxAbs > ceiling ? ceiling / maxAbs : 1;
      if (needed < this.limGain) {
        this.limGain = needed;
      } else {
        this.limGain = needed - (needed - this.limGain) * this.limRel;
      }
      sigL *= this.limGain;
      sigR *= this.limGain;

      outL[i] = sigL;
      outR[i] = sigR;

      const pk = maxAbs * this.limGain;
      if (pk > blockPeak) blockPeak = pk;
    }

    if (frames !== this.fallFrames) {
      this.fallFrames = frames;
      this.fallFactor = Math.pow(this.fallPerFrame, frames);
    }
    const fallen = this.peak * this.fallFactor;
    this.peak = blockPeak > fallen ? blockPeak : fallen;

    if (step !== this.lastStep) {
      this.lastStep = step;
      this.post({
        type: "step",
        step: step,
        beat: endBeat,
        tempo: tempo,
        contextFrame: contextFrame + frames,
      });
    }
    this.sinceStatus += frames;
    if (this.sinceStatus >= this.statusEvery) {
      this.sinceStatus = 0;
      this.post({
        type: "status",
        step: step,
        peak: this.peak,
        tempo: tempo,
        beat: endBeat,
        locked: api.p5_engine_clock_locked(e) === 1,
        armed: typeof api.p5_engine_is_armed === "function" ? api.p5_engine_is_armed(e) === 1 : false,
        phaseErrorMs:
          typeof api.p5_engine_phase_error_ms === "function" ? api.p5_engine_phase_error_ms(e) : 0,
        position: position + frames,
        offset: offset,
      });
    }
    return this.outPair;
  }

  /** Mono entry point retained for compatibility. */
  process(frames, contextFrame) {
    return this.processStereo(frames, contextFrame, null, null)[0];
  }
}
