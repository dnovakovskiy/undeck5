// Traktor Pro 4+ inspired Pattern Player surface controller:
//   - Minimalist DJ layering sequencer with heavy sub-bass & warehouse kits
//   - 12 pre-baked Techno, House, Sub-Bass & Breakbeat patterns ready to layer
//   - Volume, Bass Weight, Pitch (-12..+12 st), Decay, Kick Cut & Sidechain Ducking
//   - Explicit Buildup -> Drop Macro Bar (1-click or hold Echo+HPF, Noise+Sweep,
//     Spiral+Roll, Sub-Kill+Reverb -> instant Release Into Drop onto active pattern)
//   - Traktor-style 2x8 (16-step) stem step strip + optional local WAV sample layer

import type { AudioEngine } from "../engine/audio-engine";
import { defaultRmxState, type RmxState } from "../engine/rmx-fx";
import {
  cloneSpec,
  cycleStep,
  EMPTY_STEPS,
  normalizeSteps,
  sanitize,
  STEP_COUNT,
  toggleAccent,
  type PatternSpec,
} from "../spec";
import { VOICES, type VoiceId } from "../voices";

export type TraktorStemId = "sub" | "snare" | "hats" | "perc";
export type BuildupMacroId = "echo_hpf" | "noise_filter" | "spiral_roll" | "sub_reverb";

export interface TraktorKitDef {
  id: string;
  name: string;
  kitModel: number;
  kickCutDefault?: boolean;
  blurb: string;
  voices: Partial<Record<VoiceId, { tune: number; decay: number; tone: number; snappy: number; level: number }>>;
}

export interface TraktorPatternDef {
  id: string;
  name: string;
  genre: "Sub / Techno" | "House / Groove" | "Breakbeat";
  keyHint: string;
  kitId: string;
  bpm: number;
  shuffle: number;
  steps: Partial<Record<VoiceId, string>>;
}

export interface TraktorCallbacks {
  audio: AudioEngine;
  getSpec(): PatternSpec;
  getPlayingStep(): number;
  isPlaying(): boolean;
  onCommitSpec(next: PatternSpec, reason?: string): void;
  getBaseRmxState(): RmxState;
  isRmxBypassed(): boolean;
  onSay(msg: string): void;
}

export const TRAKTOR_KITS: readonly TraktorKitDef[] = [
  {
    id: "berlin-sub",
    name: "Berlin Sub Rumble",
    kitModel: 5,
    blurb: "Heavyweight 42 Hz sub-boom kick + 16th warehouse sub-tom rumble & dark claps",
    voices: {
      kick: { tune: 0.1, decay: 0.92, tone: 0.88, snappy: 0.5, level: 1.0 },
      low_tom: { tune: 0.05, decay: 0.9, tone: 0.18, snappy: 0.5, level: 0.94 },
      mid_tom: { tune: 0.22, decay: 0.72, tone: 0.36, snappy: 0.5, level: 0.84 },
      snare: { tune: 0.32, decay: 0.56, tone: 0.72, snappy: 0.92, level: 0.88 },
      clap: { tune: 0.5, decay: 0.84, tone: 0.36, snappy: 0.5, level: 0.86 },
      closed_hat: { tune: 0.42, decay: 0.32, tone: 0.9, snappy: 0.5, level: 0.76 },
      open_hat: { tune: 0.42, decay: 0.82, tone: 0.92, snappy: 0.5, level: 0.82 },
      rim: { tune: 0.38, decay: 0.48, tone: 0.68, snappy: 0.5, level: 0.76 },
    },
  },
  {
    id: "industrial-rave",
    name: "Hard Industrial Sub",
    kitModel: 5,
    blurb: "Overdriven peak-time techno kit with saturated low-end punch & metallic ride",
    voices: {
      kick: { tune: 0.24, decay: 0.86, tone: 0.98, snappy: 0.5, level: 1.0 },
      low_tom: { tune: 0.08, decay: 0.86, tone: 0.3, snappy: 0.5, level: 0.92 },
      snare: { tune: 0.28, decay: 0.68, tone: 0.8, snappy: 0.96, level: 0.9 },
      clap: { tune: 0.5, decay: 0.9, tone: 0.3, snappy: 0.5, level: 0.88 },
      closed_hat: { tune: 0.38, decay: 0.36, tone: 0.96, snappy: 0.5, level: 0.78 },
      open_hat: { tune: 0.38, decay: 0.88, tone: 0.96, snappy: 0.5, level: 0.86 },
    },
  },
  {
    id: "acid-bass",
    name: "Peak-Time Acid Sub",
    kitModel: 2,
    blurb: "Punchy club kick + resonant tuned acid-bass toms & crisp sizzle hats",
    voices: {
      kick: { tune: 0.36, decay: 0.72, tone: 0.94, snappy: 0.5, level: 0.98 },
      low_tom: { tune: 0.14, decay: 0.78, tone: 0.64, snappy: 0.5, level: 0.9 },
      mid_tom: { tune: 0.38, decay: 0.64, tone: 0.72, snappy: 0.5, level: 0.84 },
      high_tom: { tune: 0.62, decay: 0.54, tone: 0.78, snappy: 0.5, level: 0.8 },
      snare: { tune: 0.58, decay: 0.48, tone: 0.84, snappy: 0.94, level: 0.88 },
      closed_hat: { tune: 0.62, decay: 0.38, tone: 0.92, snappy: 0.5, level: 0.76 },
      open_hat: { tune: 0.62, decay: 0.8, tone: 0.92, snappy: 0.5, level: 0.82 },
    },
  },
  {
    id: "uk-bass-break",
    name: "UK Sub & Breakbeat",
    kitModel: 1,
    blurb: "Deep 44 Hz sub-boom bass + tight ghosted breakbeat snare, rim & crisp hats",
    voices: {
      kick: { tune: 0.08, decay: 0.95, tone: 0.28, snappy: 0.5, level: 1.0 },
      low_tom: { tune: 0.04, decay: 0.92, tone: 0.16, snappy: 0.5, level: 0.95 },
      snare: { tune: 0.56, decay: 0.34, tone: 0.78, snappy: 0.9, level: 0.92 },
      clap: { tune: 0.5, decay: 0.54, tone: 0.68, snappy: 0.5, level: 0.82 },
      rim: { tune: 0.62, decay: 0.28, tone: 0.76, snappy: 0.5, level: 0.8 },
      closed_hat: { tune: 0.54, decay: 0.22, tone: 0.86, snappy: 0.5, level: 0.74 },
      open_hat: { tune: 0.54, decay: 0.64, tone: 0.86, snappy: 0.5, level: 0.8 },
    },
  },
  {
    id: "minimal-click",
    name: "Minimal Sub-Click",
    kitModel: 4,
    blurb: "Deep sine sub thump + tight micro-house clicks, rim ticks & dub space",
    voices: {
      kick: { tune: 0.12, decay: 0.82, tone: 0.22, snappy: 0.5, level: 0.98 },
      low_tom: { tune: 0.08, decay: 0.76, tone: 0.14, snappy: 0.5, level: 0.9 },
      snare: { tune: 0.76, decay: 0.18, tone: 0.88, snappy: 0.86, level: 0.8 },
      clap: { tune: 0.5, decay: 0.22, tone: 0.84, snappy: 0.5, level: 0.78 },
      rim: { tune: 0.82, decay: 0.18, tone: 0.88, snappy: 0.5, level: 0.82 },
      closed_hat: { tune: 0.88, decay: 0.14, tone: 0.94, snappy: 0.5, level: 0.72 },
      open_hat: { tune: 0.88, decay: 0.42, tone: 0.94, snappy: 0.5, level: 0.76 },
    },
  },
  {
    id: "chicago-sub",
    name: "Chicago Sub-Jack",
    kitModel: 1,
    blurb: "Warm 8O8 sub-bass boom + classic jackin' house claps, cowbell & open hats",
    voices: {
      kick: { tune: 0.12, decay: 0.94, tone: 0.2, snappy: 0.5, level: 0.98 },
      low_tom: { tune: 0.16, decay: 0.78, tone: 0.16, snappy: 0.5, level: 0.88 },
      snare: { tune: 0.36, decay: 0.28, tone: 0.48, snappy: 0.64, level: 0.86 },
      clap: { tune: 0.5, decay: 0.76, tone: 0.52, snappy: 0.5, level: 0.88 },
      cowbell: { tune: 0.5, decay: 0.62, tone: 0.54, snappy: 0.5, level: 0.78 },
      closed_hat: { tune: 0.44, decay: 0.26, tone: 0.58, snappy: 0.5, level: 0.74 },
      open_hat: { tune: 0.44, decay: 0.68, tone: 0.58, snappy: 0.5, level: 0.8 },
    },
  },
  {
    id: "top-groove",
    name: "Top + Sub Layer (No Kick)",
    kitModel: 2,
    kickCutDefault: true,
    blurb: "Mutes 4/4 kick automatically so offbeat sub-bass, hats & claps layer cleanly over CDJ tracks",
    voices: {
      kick: { tune: 0.2, decay: 0.8, tone: 0.5, snappy: 0.5, level: 0.95 },
      low_tom: { tune: 0.08, decay: 0.84, tone: 0.22, snappy: 0.5, level: 0.92 },
      snare: { tune: 0.6, decay: 0.42, tone: 0.82, snappy: 0.9, level: 0.86 },
      clap: { tune: 0.5, decay: 0.58, tone: 0.74, snappy: 0.5, level: 0.86 },
      closed_hat: { tune: 0.64, decay: 0.32, tone: 0.92, snappy: 0.5, level: 0.78 },
      open_hat: { tune: 0.64, decay: 0.76, tone: 0.92, snappy: 0.5, level: 0.84 },
    },
  },
];

export const TRAKTOR_PATTERNS: readonly TraktorPatternDef[] = [
  // ---- Heavy Sub & Techno (Keys 1..4) ----
  {
    id: "sub-rumble-16",
    name: "Sub Rumble 16th",
    genre: "Sub / Techno",
    keyHint: "1",
    kitId: "berlin-sub",
    bpm: 134,
    shuffle: 0,
    steps: {
      kick: "X---X---X---X---",
      low_tom: "-xx--xx--xx--xx-",
      clap: "----x-------X---",
      closed_hat: "x-x-x-x-x-x-x-x-",
      open_hat: "--X---X---X---X-",
      rim: "---x-------x--x-",
    },
  },
  {
    id: "offbeat-sub",
    name: "Offbeat Sub Bass",
    genre: "Sub / Techno",
    keyHint: "2",
    kitId: "industrial-rave",
    bpm: 135,
    shuffle: 0.06,
    steps: {
      kick: "X---X---X---X---",
      low_tom: "--X---X---X---X-",
      mid_tom: "-------x-------x",
      snare: "----x-------f---",
      clap: "----X-------X---",
      closed_hat: "xxXxxxXxxxXxxxXx",
      open_hat: "--X---X---X---X-",
    },
  },
  {
    id: "acid-tom-bass",
    name: "Acid Sub Arpeggio",
    genre: "Sub / Techno",
    keyHint: "3",
    kitId: "acid-bass",
    bpm: 132,
    shuffle: 0.08,
    steps: {
      kick: "X---X---X---X---",
      low_tom: "X--x--X---x--X--",
      mid_tom: "-x--x--x-x----x-",
      high_tom: "--x-----x--x---x",
      clap: "----X-------X---",
      closed_hat: "x-xxx-xxx-xxx-xx",
      open_hat: "--X---X---X---X-",
    },
  },
  {
    id: "tribal-driver",
    name: "Warehouse Driver",
    genre: "Sub / Techno",
    keyHint: "4",
    kitId: "industrial-rave",
    bpm: 136,
    shuffle: 0.18,
    steps: {
      kick: "X---X---X---X-x-",
      low_tom: "-x-x-x-x-x-x-xx-",
      snare: "--x-F--x--x-F--x",
      clap: "----X-------X---",
      closed_hat: "x-xxx-xxx-xxx-xx",
      open_hat: "--X---X---X---X-",
      cowbell: "--x---x---x---x-",
    },
  },
  // ---- House & Layering Grooves (Keys 5..8 -> Pad click or Shift+1..4) ----
  {
    id: "sub-jack-house",
    name: "Sub-Jack Roller",
    genre: "House / Groove",
    keyHint: "5",
    kitId: "chicago-sub",
    bpm: 126,
    shuffle: 0.32,
    steps: {
      kick: "X---x---X---x-x-",
      low_tom: "--x---X---x---x-",
      snare: "----X--x----X--x",
      clap: "----X-------F---",
      closed_hat: "x-xxx-xxx-xxx-xx",
      open_hat: "--X---X---X---X-",
      cowbell: "------x-------x-",
    },
  },
  {
    id: "french-lift",
    name: "French Clap Lift",
    genre: "House / Groove",
    keyHint: "6",
    kitId: "chicago-sub",
    bpm: 124,
    shuffle: 0.18,
    steps: {
      kick: "X---X---X---X---",
      low_tom: "---x--x----x--X-",
      clap: "----F-------F---",
      rim: "---x--x----x----",
      closed_hat: "x-x-x-x-x-x-x-x-",
      open_hat: "--X---X---X---X-",
    },
  },
  {
    id: "deep-sub-pulse",
    name: "Deep Sub Pulse",
    genre: "House / Groove",
    keyHint: "7",
    kitId: "minimal-click",
    bpm: 123,
    shuffle: 0.38,
    steps: {
      kick: "X---x---X---x---",
      low_tom: "--X----x--X---x-",
      clap: "----x-------x---",
      rim: "-x----x--x----f-",
      closed_hat: "x-xxx-xxx-xxx-xx",
      open_hat: "--x---x---x---X-",
    },
  },
  {
    id: "top-perc-addon",
    name: "DJ Top + Sub Addon",
    genre: "House / Groove",
    keyHint: "8",
    kitId: "top-groove",
    bpm: 126,
    shuffle: 0.24,
    steps: {
      kick: "X---x---X---x---",
      low_tom: "--x---X---x--x--",
      snare: "----x--x-x--x--x",
      clap: "----X-------X---",
      rim: "-x-----x-x------",
      closed_hat: "xx-xxx-xxx-xxx-x",
      open_hat: "--X---X---X---X-",
    },
  },
  // ---- Pre-Baked Breakbeats (Keys 9, 0, -, =) ----
  {
    id: "trk-warehouse-break",
    name: "Warehouse Break",
    genre: "Breakbeat",
    keyHint: "9",
    kitId: "uk-bass-break",
    bpm: 132,
    shuffle: 0.08,
    steps: {
      kick: "X--x--X---x---x-",
      low_tom: "------X---x--X--",
      snare: "----X--f-x--X--f",
      clap: "----x-------X---",
      rim: "--x----x-x----x-",
      closed_hat: "xxXxxxXxxxXxxxXx",
      open_hat: "----------X---X-",
    },
  },
  {
    id: "trk-uk-sub-break",
    name: "UK Sub Break",
    genre: "Breakbeat",
    keyHint: "0",
    kitId: "uk-bass-break",
    bpm: 130,
    shuffle: 0.22,
    steps: {
      kick: "X-----X---x---x-",
      low_tom: "--X--x--X--x--X-",
      snare: "----X--x----F--x",
      clap: "----x-------X---",
      rim: "-x-----x-x---x--",
      closed_hat: "x-xxx-xxx-xxx-xx",
      open_hat: "--x-------x---X-",
    },
  },
  {
    id: "trk-euphoric-break",
    name: "Euphoric Break",
    genre: "Breakbeat",
    keyHint: "-",
    kitId: "acid-bass",
    bpm: 128,
    shuffle: 0.14,
    steps: {
      kick: "X-----x---X---x-",
      low_tom: "---X--x----X----",
      mid_tom: "---------x----x-",
      snare: "----F-------X-x-",
      clap: "----X-------F---",
      closed_hat: "x-x-x-x-x-x-x-x-",
      open_hat: "--X---X---X---X-",
    },
  },
  {
    id: "trk-electro-break",
    name: "Electro Bass Break",
    genre: "Breakbeat",
    keyHint: "=",
    kitId: "chicago-sub",
    bpm: 126,
    shuffle: 0.06,
    steps: {
      kick: "X--x--x---X--x--",
      low_tom: "-------X---x--X-",
      snare: "----X-------X--f",
      clap: "----X-------X---",
      cowbell: "--x---x---x---x-",
      closed_hat: "x-x-x-xxx-x-xXx-",
      open_hat: "------X-------X-",
    },
  },
];

const STEM_PRIMARY_VOICE: Readonly<Record<TraktorStemId, VoiceId>> = {
  sub: "low_tom",
  snare: "snare",
  hats: "closed_hat",
  perc: "clap",
};

const STEM_LABELS: Readonly<Record<TraktorStemId, string>> = {
  sub: "SUB BASS (LT)",
  snare: "SNARE / BREAK",
  hats: "HI-HATS",
  perc: "CLAP / PERC",
};

const BUILDUP_LABELS: Readonly<Record<BuildupMacroId, string>> = {
  echo_hpf: "ECHO + HPF FILTER",
  noise_filter: "NOISE + FILTER SWEEP",
  spiral_roll: "SPIRAL + SNARE ROLL",
  sub_reverb: "SUB KILL + REVERB",
};

function buildSpecFromPattern(pat: TraktorPatternDef, kit: TraktorKitDef): PatternSpec {
  const rawVoices: Record<string, Record<string, unknown>> = {};
  for (const v of VOICES) {
    const kv = kit.voices[v.id];
    rawVoices[v.id] = {
      steps: pat.steps[v.id] ?? EMPTY_STEPS,
      ...(kv ?? {}),
      mute: v.id === "kick" && Boolean(kit.kickCutDefault),
    };
  }
  return sanitize({
    bpm: pat.bpm,
    shuffle: pat.shuffle,
    accent: 0.78,
    flam: 0.42,
    kit_model: kit.kitModel,
    voices: rawVoices,
  });
}

export function defaultTraktorSpec(): PatternSpec {
  return buildSpecFromPattern(TRAKTOR_PATTERNS[0]!, TRAKTOR_KITS[0]!);
}

export class TraktorPanel {
  private powered = false;
  private activePatternIdx = 0;
  private activeKitId = TRAKTOR_KITS[0]!.id;
  private activeStem: TraktorStemId = "sub";
  private volume = 1.0;
  private bassWeight = 0.75;
  private pitchSemi = 0;
  private decayScale = 0.68;
  private ducking = false;
  private kickCut = false;

  // Buildup -> Drop live macro state
  private activeBuildup: BuildupMacroId | null = null;
  private buildupProgress = 0;
  private buildupStartMs = 0;
  private buildupPointerDownMs = 0;
  private buildupRaf = 0;
  private dropFlashUntil = 0;

  // Optional user-loaded local audio sample for heavy custom sub/hit layering
  private customSampleBuffer: AudioBuffer | null = null;
  private customSampleName = "";
  private sampleCtx: AudioContext | null = null;

  private stepButtons: HTMLButtonElement[] = [];

  constructor(
    private readonly root: HTMLElement,
    private readonly cb: TraktorCallbacks,
  ) {
    this.buildStepButtons();
    this.bind();
    this.render();
  }

  get isPowered(): boolean {
    return this.powered;
  }

  get isBuildupActive(): boolean {
    return this.activeBuildup !== null;
  }

  setPowered(on: boolean): void {
    if (!on && this.activeBuildup) {
      this.cancelBuildupSilent();
    }
    this.powered = on;
    this.root.dataset.machineOff = String(!on);
    this.render();
  }

  reset(): PatternSpec {
    this.cancelBuildupSilent();
    this.activePatternIdx = 0;
    this.activeKitId = TRAKTOR_KITS[0]!.id;
    this.activeStem = "sub";
    this.volume = 1.0;
    this.bassWeight = 0.75;
    this.pitchSemi = 0;
    this.decayScale = 0.68;
    this.ducking = false;
    this.kickCut = false;
    const clean = defaultTraktorSpec();
    this.applyShapingToSpec(clean);
    this.render();
    return clean;
  }

  private buildStepButtons(): void {
    const grid = this.root.querySelector<HTMLElement>("#trk-step-grid")!;
    const nodes: HTMLButtonElement[] = [];
    const keys = ["A", "S", "D", "F", "G", "H", "J", "K", "Z", "X", "C", "V", "B", "N", "M", ","];
    for (let i = 0; i < STEP_COUNT; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `trk-step${i % 4 === 0 ? " beat" : ""}`;
      b.dataset.trkStep = String(i + 1);
      b.dataset.key = keys[i]!;
      b.setAttribute("aria-label", `Pattern Player step ${i + 1}`);
      b.innerHTML = `<span class="trk-step-num">${i + 1}</span><i class="trk-step-led"></i>`;
      nodes.push(b);
    }
    grid.replaceChildren(...nodes);
    this.stepButtons = nodes;
  }

  private currentKit(): TraktorKitDef {
    return TRAKTOR_KITS.find((k) => k.id === this.activeKitId) ?? TRAKTOR_KITS[0]!;
  }

  /** Applies Volume, Bass Weight, Pitch (-12..+12 st), Decay, Kick Cut & Ducking onto `s`. */
  private applyShapingToSpec(s: PatternSpec): void {
    const kit = this.currentKit();
    s.kit_model = kit.kitModel;
    const pitchDelta = this.pitchSemi / 24; // -0.5 .. +0.5 around base voice tune
    const decayDelta = (this.decayScale - 0.68) * 0.75;
    const bassBoost = (this.bassWeight - 0.5) * 0.45;

    for (const v of VOICES) {
      const base = kit.voices[v.id] ?? { tune: 0.5, decay: 0.5, tone: 0.5, snappy: 0.5, level: 0.8 };
      const target = s.voices[v.id];
      const isSubVoice = v.id === "kick" || v.id === "low_tom";
      target.tune = Math.max(0.02, Math.min(0.98, base.tune + pitchDelta - (isSubVoice ? bassBoost * 0.28 : 0)));
      target.decay = Math.max(
        0.08,
        Math.min(0.99, base.decay + decayDelta + (isSubVoice ? bassBoost * 0.35 : 0)),
      );
      target.tone = base.tone;
      target.snappy = base.snappy;

      let lvl = base.level * this.volume;
      if (isSubVoice) lvl *= 1 + Math.max(-0.25, bassBoost * 0.55);
      // Ducking slightly attenuates steady highs/percussion relative to accented sub hits for pump
      if (this.ducking && !isSubVoice) lvl *= 0.84;
      target.level = Math.max(0, Math.min(1, lvl));
    }
    s.voices.kick.mute = this.kickCut;
    if (this.ducking) {
      s.accent = Math.min(1, Math.max(s.accent, 0.9));
    }
  }

  private flashEl(selector: string): void {
    const el = this.root.querySelector<HTMLElement>(selector);
    if (!el) return;
    el.classList.remove("kb-flash");
    void el.offsetWidth;
    el.classList.add("kb-flash");
    setTimeout(() => el.classList.remove("kb-flash"), 170);
  }

  selectPattern(idx: number): string {
    const wrapped = ((idx % TRAKTOR_PATTERNS.length) + TRAKTOR_PATTERNS.length) % TRAKTOR_PATTERNS.length;
    const pat = TRAKTOR_PATTERNS[wrapped]!;
    this.activePatternIdx = wrapped;
    this.activeKitId = pat.kitId;
    const kit = this.currentKit();
    this.kickCut = Boolean(kit.kickCutDefault);
    const next = buildSpecFromPattern(pat, kit);
    next.bpm = this.cb.getSpec().bpm;
    next.render = { ...this.cb.getSpec().render };
    this.applyShapingToSpec(next);
    this.cb.onCommitSpec(next, `trk-pat-${pat.id}`);
    if (this.customSampleBuffer && this.powered) {
      this.fireCustomSample(0.9);
    }
    this.render();
    this.flashEl(`[data-trk-pattern="${wrapped}"]`);
    return `${pat.name} (${pat.genre})`;
  }

  selectKit(kitId: string): string {
    const kit = TRAKTOR_KITS.find((k) => k.id === kitId);
    if (!kit) return "";
    this.activeKitId = kit.id;
    if (kit.kickCutDefault !== undefined) {
      this.kickCut = kit.kickCutDefault;
    }
    const next = cloneSpec(this.cb.getSpec());
    this.applyShapingToSpec(next);
    this.cb.onCommitSpec(next, `trk-kit-${kit.id}`);
    this.render();
    return kit.name;
  }

  cycleKit(delta: number): string {
    const cur = TRAKTOR_KITS.findIndex((k) => k.id === this.activeKitId);
    const nextIdx = ((cur + delta) % TRAKTOR_KITS.length + TRAKTOR_KITS.length) % TRAKTOR_KITS.length;
    return this.selectKit(TRAKTOR_KITS[nextIdx]!.id);
  }

  selectStem(stem: TraktorStemId): void {
    this.activeStem = stem;
    this.render();
    this.flashEl(`[data-trk-stem="${stem}"]`);
  }

  toggleStep(stepIdx: number, accentOnly = false): void {
    const voice = STEM_PRIMARY_VOICE[this.activeStem];
    const next = cloneSpec(this.cb.getSpec());
    const curSteps = normalizeSteps(next.voices[voice].steps);
    next.voices[voice].steps = accentOnly ? toggleAccent(curSteps, stepIdx) : cycleStep(curSteps, stepIdx);
    this.applyShapingToSpec(next);
    this.cb.onCommitSpec(next, "trk-step");
    this.render();
    this.flashEl(`[data-trk-step="${stepIdx + 1}"]`);
  }

  toggleKickCut(): boolean {
    this.kickCut = !this.kickCut;
    const next = cloneSpec(this.cb.getSpec());
    this.applyShapingToSpec(next);
    this.cb.onCommitSpec(next, "trk-kick-cut");
    this.render();
    this.flashEl("#trk-kick-cut");
    return this.kickCut;
  }

  toggleDucking(): boolean {
    this.ducking = !this.ducking;
    const next = cloneSpec(this.cb.getSpec());
    this.applyShapingToSpec(next);
    this.cb.onCommitSpec(next, "trk-ducking");
    this.render();
    this.flashEl("#trk-ducking");
    return this.ducking;
  }

  adjustPitch(deltaSemi: number): number {
    this.pitchSemi = Math.max(-12, Math.min(12, this.pitchSemi + deltaSemi));
    const next = cloneSpec(this.cb.getSpec());
    this.applyShapingToSpec(next);
    this.cb.onCommitSpec(next, "trk-pitch");
    this.render();
    return this.pitchSemi;
  }

  resetActivePattern(): void {
    this.selectPattern(this.activePatternIdx);
  }

  // ---- Dramatic One-Button / Hold-to-Build -> Release-Into-Drop UX ----

  engageBuildup(macro: BuildupMacroId, fromPointerOrKeyDown = false): void {
    if (!this.powered) return;
    // Tapping the same latched buildup button a second time drops immediately!
    if (this.activeBuildup === macro && !fromPointerOrKeyDown) {
      this.releaseIntoDrop();
      return;
    }
    this.activeBuildup = macro;
    this.buildupStartMs = performance.now();
    this.buildupPointerDownMs = fromPointerOrKeyDown ? this.buildupStartMs : 0;
    this.buildupProgress = 0.28;
    void this.cb.audio.ensureStarted().catch(() => {});
    this.pushBuildupDsp(this.buildupProgress);
    this.scheduleBuildupTick();
    this.render();
  }

  /** Called on pointerup / keyup: if user held the button >= 280 ms, releasing drops immediately; quick click latches! */
  onBuildupInputUp(macro: BuildupMacroId): void {
    if (this.activeBuildup !== macro) return;
    if (this.buildupPointerDownMs > 0) {
      const heldMs = performance.now() - this.buildupPointerDownMs;
      this.buildupPointerDownMs = 0;
      if (heldMs >= 280) {
        this.releaseIntoDrop();
      }
    }
  }

  releaseIntoDrop(): void {
    const wasBuilding = this.activeBuildup !== null;
    this.activeBuildup = null;
    this.buildupProgress = 0;
    this.buildupPointerDownMs = 0;
    if (this.buildupRaf) {
      cancelAnimationFrame(this.buildupRaf);
      this.buildupRaf = 0;
    }

    // Restore clean base RMX state (filter wide open, echo/noise cleared, full sub restored!)
    const cleanRmx = this.cb.isRmxBypassed() ? defaultRmxState() : { ...this.cb.getBaseRmxState() };
    this.cb.audio.setRmxState(cleanRmx);

    // Fire punchy downbeat Sub Kick + Crash/Open-Hat impact onto the playing pattern!
    if (this.powered) {
      if (wasBuilding) {
        void this.cb.audio.triggerVoice("kick", 1.0).catch(() => {});
        void this.cb.audio.triggerVoice("open_hat", 0.92).catch(() => {});
        if (this.customSampleBuffer) this.fireCustomSample(1.0);
        this.dropFlashUntil = performance.now() + 900;
        this.cb.onSay("DROP! Filter wide open and full sub-bass restored onto active pattern.");
      }
      this.flashEl("#trk-drop-btn");
    }
    this.render();
  }

  private cancelBuildupSilent(): void {
    if (this.buildupRaf) {
      cancelAnimationFrame(this.buildupRaf);
      this.buildupRaf = 0;
    }
    if (this.activeBuildup !== null) {
      this.activeBuildup = null;
      this.buildupProgress = 0;
      this.buildupPointerDownMs = 0;
      const cleanRmx = this.cb.isRmxBypassed() ? defaultRmxState() : { ...this.cb.getBaseRmxState() };
      this.cb.audio.setRmxState(cleanRmx);
    }
  }

  private scheduleBuildupTick(): void {
    if (this.buildupRaf) cancelAnimationFrame(this.buildupRaf);
    const step = (now: number) => {
      if (!this.activeBuildup) {
        this.buildupRaf = 0;
        return;
      }
      // Smooth 4-second dramatic ramp from 28% -> 100% peak tension
      const elapsedSec = Math.max(0, (now - this.buildupStartMs) / 1000);
      this.buildupProgress = Math.min(1, 0.28 + (elapsedSec / 4.0) * 0.72);
      this.pushBuildupDsp(this.buildupProgress);
      this.renderBuildupMeterOnly();
      this.buildupRaf = requestAnimationFrame(step);
    };
    this.buildupRaf = requestAnimationFrame(step);
  }

  private pushBuildupDsp(p: number): void {
    const fx: RmxState = { ...defaultRmxState() };
    switch (this.activeBuildup) {
      case "echo_hpf":
        fx.sceneFx = "hpf_echo";
        fx.sceneAmount = 0.32 + p * 0.62;
        fx.sceneSub = 0.58 + p * 0.3;
        fx.isoLow = -Math.round(14 + p * 34); // sweeps sub out smoothly so the drop hits massive!
        fx.killLow = p > 0.72;
        break;
      case "noise_filter":
        fx.sceneFx = "noise";
        fx.sceneAmount = 0.26 + p * 0.68;
        fx.sceneSub = 0.45 + p * 0.48;
        fx.sceneSub2 = 0.35 + p * 0.6;
        fx.isoLow = -Math.round(10 + p * 32);
        fx.killLow = p > 0.78;
        break;
      case "spiral_roll":
        fx.sceneFx = "spiral_up";
        fx.sceneAmount = 0.3 + p * 0.64;
        fx.sceneSub = 0.5 + p * 0.38;
        fx.xpadVoice = "snare";
        fx.xpadRolling = true;
        fx.xpadQuantize = true;
        fx.xpadRollDiv = p < 0.48 ? 8 : p < 0.82 ? 16 : 32;
        fx.xpadPitch = Math.round(p * 6) / 12;
        fx.isoLow = -Math.round(12 + p * 30);
        break;
      case "sub_reverb":
        fx.sceneFx = "reverb_up";
        fx.sceneAmount = 0.35 + p * 0.6;
        fx.sceneSub = 0.65;
        fx.killLow = true;
        break;
    }
    this.cb.audio.setRmxState(fx);
  }

  private fireCustomSample(gainLevel: number): void {
    if (!this.customSampleBuffer) return;
    try {
      const Ctor =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.sampleCtx ??= new Ctor();
      if (this.sampleCtx.state === "suspended") void this.sampleCtx.resume();
      const src = this.sampleCtx.createBufferSource();
      const gain = this.sampleCtx.createGain();
      src.buffer = this.customSampleBuffer;
      src.playbackRate.value = Math.pow(2, this.pitchSemi / 12);
      gain.gain.value = Math.min(1.2, gainLevel * this.volume);
      src.connect(gain);
      gain.connect(this.sampleCtx.destination);
      src.start();
    } catch {
      /* ignore audio context restrictions */
    }
  }

  private bind(): void {
    const $ = <T extends HTMLElement>(id: string) => this.root.querySelector<T>(`#${id}`)!;

    // Kit selector
    const kitSelect = $<HTMLSelectElement>("trk-kit");
    kitSelect.addEventListener("change", () => {
      if (kitSelect.value) this.selectKit(kitSelect.value);
    });

    // Kick Cut & Ducking toggles
    $("trk-kick-cut").addEventListener("click", () => this.toggleKickCut());
    $("trk-ducking").addEventListener("click", () => this.toggleDucking());
    $("trk-reset-pat").addEventListener("click", () => this.resetActivePattern());

    // Custom local WAV/audio sample loader
    const sampleBtn = $("trk-load-sample");
    const sampleInput = $<HTMLInputElement>("trk-sample-file");
    sampleBtn.addEventListener("click", () => sampleInput.click());
    sampleInput.addEventListener("change", () => {
      const file = sampleInput.files?.[0];
      if (!file) return;
      void file.arrayBuffer().then(async (buf) => {
        try {
          const Ctor =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          this.sampleCtx ??= new Ctor();
          this.customSampleBuffer = await this.sampleCtx.decodeAudioData(buf);
          this.customSampleName = file.name.replace(/\.[^.]+$/, "").slice(0, 14);
          this.fireCustomSample(0.95);
          this.cb.onSay(`Loaded custom sample '${file.name}' into Pattern Player.`);
          this.render();
        } catch {
          this.cb.onSay("Could not decode audio file — try WAV, MP3, or OGG.");
        }
      });
    });

    // 4 Sliders: Volume, Bass Weight, Pitch, Decay
    const bindSlider = (id: string, onVal: (v: number) => void) => {
      const el = $<HTMLInputElement>(id);
      el.addEventListener("input", () => {
        onVal(Number(el.value));
        const next = cloneSpec(this.cb.getSpec());
        this.applyShapingToSpec(next);
        this.cb.onCommitSpec(next, id);
        this.render();
      });
    };
    bindSlider("trk-volume", (v) => (this.volume = v));
    bindSlider("trk-bass", (v) => (this.bassWeight = v));
    bindSlider("trk-pitch", (v) => (this.pitchSemi = Math.round(v)));
    bindSlider("trk-decay", (v) => (this.decayScale = v));

    // 12 Pre-baked Pattern buttons
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-trk-pattern]")) {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.trkPattern);
        this.selectPattern(idx);
      });
    }

    // 4 Buildup Macro buttons (support both 1-click latch AND hold-to-build -> release-to-drop!)
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-trk-buildup]")) {
      const macro = btn.dataset.trkBuildup as BuildupMacroId;
      btn.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        if (this.activeBuildup === macro) {
          this.releaseIntoDrop();
          return;
        }
        this.engageBuildup(macro, true);
      });
      btn.addEventListener("click", (e) => {
        if (e.detail === 0) {
          this.engageBuildup(macro, false);
        }
      });
    }

    const onGlobalPointerUp = () => {
      if (this.activeBuildup && this.buildupPointerDownMs > 0) {
        this.onBuildupInputUp(this.activeBuildup);
      }
    };
    window.addEventListener("pointerup", onGlobalPointerUp);
    window.addEventListener("pointercancel", onGlobalPointerUp);

    // Explicit RELEASE INTO DROP! button
    $("trk-drop-btn").addEventListener("click", () => this.releaseIntoDrop());

    // Stem tabs (Sub/Kick, Snare/Break, Hats, Clap/Perc)
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-trk-stem]")) {
      btn.addEventListener("click", () => {
        this.selectStem(btn.dataset.trkStem as TraktorStemId);
      });
    }

    // 2x8 16-Step buttons
    this.stepButtons.forEach((btn, i) => {
      btn.addEventListener("click", (e) => {
        this.toggleStep(i, e.altKey);
      });
      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        this.toggleStep(i, true);
      });
    });
  }

  private renderBuildupMeterOnly(): void {
    const fill = this.root.querySelector<HTMLElement>("#trk-buildup-fill");
    const status = this.root.querySelector<HTMLElement>("#trk-buildup-status");
    const dropBtn = this.root.querySelector<HTMLButtonElement>("#trk-drop-btn");
    const pct = Math.round(this.buildupProgress * 100);
    if (fill) fill.style.width = `${this.activeBuildup ? pct : 0}%`;
    if (status) {
      if (this.activeBuildup) {
        status.textContent = `${BUILDUP_LABELS[this.activeBuildup]} · ${pct}% — CLICK DROP [R]`;
        status.dataset.state = "building";
      } else if (performance.now() < this.dropFlashUntil) {
        status.textContent = "DROPPED ON ACTIVE PATTERN · FULL SUB LIVE";
        status.dataset.state = "dropped";
      } else {
        status.textContent = "READY · TAP OR HOLD A BUILDUP MACRO";
        status.dataset.state = "idle";
      }
    }
    if (dropBtn) {
      dropBtn.dataset.armed = String(this.activeBuildup !== null);
    }
  }

  render(): void {
    const $ = <T extends HTMLElement>(id: string) => this.root.querySelector<T>(`#${id}`)!;
    const spec = this.cb.getSpec();
    const playingStep = this.cb.getPlayingStep();
    const pat = TRAKTOR_PATTERNS[this.activePatternIdx]!;
    const kit = this.currentKit();

    $("trk-readout").textContent = !this.powered
      ? "PASSIVE · PRESS \\ TO ACTIVATE"
      : this.activeBuildup
        ? `BUILDING · ${BUILDUP_LABELS[this.activeBuildup]}`
        : `${kit.name.toUpperCase()} · ${pat.name.toUpperCase()}${this.kickCut ? " · KICK CUT" : ""}`;

    const kitSelect = $<HTMLSelectElement>("trk-kit");
    if (kitSelect.value !== this.activeKitId) kitSelect.value = this.activeKitId;

    $("trk-kick-cut").setAttribute("aria-pressed", String(this.kickCut));
    $("trk-ducking").setAttribute("aria-pressed", String(this.ducking));
    $("trk-load-sample").textContent = this.customSampleName
      ? `WAV: ${this.customSampleName}`
      : "+ Load WAV";

    const vol = $<HTMLInputElement>("trk-volume");
    if (vol.value !== String(this.volume)) vol.value = String(this.volume);
    $("trk-volume-out").textContent = `${Math.round(this.volume * 100)}%`;

    const bass = $<HTMLInputElement>("trk-bass");
    if (bass.value !== String(this.bassWeight)) bass.value = String(this.bassWeight);
    $("trk-bass-out").textContent = `${Math.round(this.bassWeight * 100)}%`;

    const pitch = $<HTMLInputElement>("trk-pitch");
    if (pitch.value !== String(this.pitchSemi)) pitch.value = String(this.pitchSemi);
    $("trk-pitch-out").textContent = `${this.pitchSemi > 0 ? "+" : ""}${this.pitchSemi} st`;

    const decay = $<HTMLInputElement>("trk-decay");
    if (decay.value !== String(this.decayScale)) decay.value = String(this.decayScale);
    $("trk-decay-out").textContent = `${Math.round(this.decayScale * 100)}%`;

    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-trk-pattern]")) {
      const idx = Number(btn.dataset.trkPattern);
      btn.setAttribute("aria-pressed", String(idx === this.activePatternIdx));
    }

    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-trk-buildup]")) {
      btn.setAttribute("aria-pressed", String(btn.dataset.trkBuildup === this.activeBuildup));
    }
    this.renderBuildupMeterOnly();

    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-trk-stem]")) {
      btn.setAttribute("aria-pressed", String(btn.dataset.trkStem === this.activeStem));
    }

    const voice = STEM_PRIMARY_VOICE[this.activeStem];
    $("trk-stem-label").textContent = `${STEM_LABELS[this.activeStem]} · 16 STEPS [O = NEXT STEM]`;
    const stepsStr = normalizeSteps(spec.voices[voice].steps);

    this.stepButtons.forEach((btn, i) => {
      const ch = stepsStr[i] ?? "-";
      btn.dataset.state =
        ch === "-" ? "off" : ch === "x" ? "on" : ch === "X" ? "accent" : ch === "f" ? "flam" : "accent-flam";
      btn.classList.toggle("playing", playingStep === i);
    });
  }
}
