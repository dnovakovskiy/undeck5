// Pioneer RMX-1000 Remix Station state types and defaults.
// All RMX-1000 DSP (24 dB/oct Linkwitz-Riley 3-band isolator, 10 Scene FX
// including dual-tap pitch-shifted Spiral Up/Down, 4-second live ring-buffer
// Vinyl Brake / Back Spin Release FX, sample-accurate X-Pad Beat Roll, and
// post-RMX stereo safety limiter) runs directly inside EngineHost (host.js)
// on the AudioWorklet / audio render thread.

import type { VoiceId } from "../voices";

export type SceneFxId =
  | "bpf_echo"
  | "echo"
  | "noise"
  | "spiral_up"
  | "reverb_up"
  | "hpf_echo"
  | "lpf_echo"
  | "crush_echo"
  | "spiral_down"
  | "reverb_down";

export type IsolatorMode = "isolator" | "cut_add" | "trans_roll" | "gate_drive";
export type ReleaseMode = "vinyl_brake" | "echo" | "back_spin";
export type RollDivision = 1 | 2 | 4 | 8 | 16 | 32;

export interface RmxState {
  sceneFx: SceneFxId | null;
  sceneAmount: number; // 0..1 (Main Knob: Level / Sweep / Time)
  sceneSub: number; // 0..1 (Sub Param 1: Resonance / Feedback)
  sceneSub2?: number; // 0..1 (Sub Param 2: Pitch / Shimmer / Mod)
  isoMode: IsolatorMode;
  isoLow: number; // -48..+6 dB
  isoMid: number; // -48..+6 dB
  isoHigh: number; // -48..+6 dB
  killLow: boolean;
  killMid: boolean;
  killHigh: boolean;
  releaseMode: ReleaseMode;
  releaseHeld: boolean;
  xpadVoice: VoiceId;
  xpadPitch: number; // -1..+1 (-12..+12 semitones)
  xpadRollDiv: RollDivision;
  xpadRolling: boolean;
  xpadOverdub: boolean;
  xpadBankB: boolean;
  xpadQuantize?: boolean;
  extInput?: boolean;
}

export function defaultRmxState(): RmxState {
  return {
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
    xpadVoice: "snare",
    xpadPitch: 0,
    xpadRollDiv: 8,
    xpadRolling: false,
    xpadOverdub: false,
    xpadBankB: false,
    xpadQuantize: true,
    extInput: false,
  };
}
