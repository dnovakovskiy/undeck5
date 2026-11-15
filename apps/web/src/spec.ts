// The pattern file format shared with the Rust core
// (core/engine/src/spec.rs), the #p= URL-hash codec and the "pattern code"
// used where URLs cannot carry state.
//
// In the app every voice is always present (`PatternSpec`). On the wire
// (URL hash, pattern code, the JSON the core loads) the spec is compacted:
// voices that are silent with default controls are omitted and controls at
// their default are left out, which the core fills back in identically.

import { CONTROL_DEFAULTS, CONTROL_IDS, VOICE_IDS, type ControlId, type VoiceId } from "./voices";

export const STEP_COUNT = 16;

/** Step symbols: off, hit, accent, flam, accent + flam. */
export type StepChar = "-" | "x" | "X" | "f" | "F";

export type BarId = "a" | "b" | "c" | "d";
export const BAR_IDS: readonly BarId[] = ["a", "b", "c", "d"] as const;

export interface VoiceSpec {
  steps: string;
  steps_b?: string;
  steps_c?: string;
  steps_d?: string;
  steps_fill?: string;
  tune: number;
  decay: number;
  tone: number;
  snappy: number;
  level: number;
  echo_send: number;
  reverb_send: number;
  filter_send: number;
  mute: boolean;
  solo: boolean;
}

export interface RenderSpec {
  output_gain: number;
  limiter: boolean;
}

/** 0=A, 1=B, 2=A+B (32 stp), 3=C, 4=D, 5=A-D (64 stp). */
export type VariationCode = 0 | 1 | 2 | 3 | 4 | 5;

export interface PatternSpec {
  bpm: number;
  shuffle: number;
  humanize: number;
  accent: number;
  flam: number;
  last_step: number;
  variation: VariationCode;
  fill: boolean;
  auto_fill_bars: number;
  kit_model: number;
  cymbal_mode: number;
  voices: Record<VoiceId, VoiceSpec>;
  render: RenderSpec;
}

export const EMPTY_STEPS = "-".repeat(STEP_COUNT);
export const BPM_MIN = 20;
export const BPM_MAX = 400;
export const GAIN_MAX = 4;

export function defaultVoice(steps = EMPTY_STEPS): VoiceSpec {
  return {
    steps,
    ...CONTROL_DEFAULTS,
    echo_send: 0,
    reverb_send: 0,
    filter_send: 0,
    mute: false,
    solo: false,
  };
}

/** A blank pattern: no steps, core defaults everywhere. */
export function emptySpec(bpm = 124): PatternSpec {
  const voices = {} as Record<VoiceId, VoiceSpec>;
  for (const id of VOICE_IDS) voices[id] = defaultVoice();
  return {
    bpm,
    shuffle: 0,
    humanize: 0,
    accent: 0.5,
    flam: 0.5,
    last_step: STEP_COUNT,
    variation: 0,
    fill: false,
    auto_fill_bars: 0,
    kit_model: 0,
    cymbal_mode: 0,
    voices,
    render: { output_gain: 1, limiter: false },
  };
}

export function cloneSpec(spec: PatternSpec): PatternSpec {
  return JSON.parse(JSON.stringify(spec)) as PatternSpec;
}

// ---- steps ----

/** Strips grouping spaces, maps '.' to '-', drops unknown symbols, pads/truncates to 16. */
export function normalizeSteps(steps: string): string {
  const s = steps
    .replace(/\s+/g, "")
    .replace(/[^-xXfF.]/g, "-")
    .replace(/\./g, "-");
  return (s + EMPTY_STEPS).slice(0, STEP_COUNT);
}

export function stepAt(steps: string, index: number): StepChar {
  return (normalizeSteps(steps)[index] ?? "-") as StepChar;
}

function withStep(steps: string, index: number, c: StepChar): string {
  const chars = [...normalizeSteps(steps)];
  chars[index] = c;
  return chars.join("");
}

export function setStep(steps: string, index: number, c: StepChar): string {
  return withStep(steps, index, c);
}

/** Normal tap: off → hit → accent → off. A flammed step stays flammed. */
export function cycleStep(steps: string, index: number): string {
  const next: Record<StepChar, StepChar> = { "-": "x", x: "X", X: "-", f: "F", F: "-" };
  return withStep(steps, index, next[stepAt(steps, index)]);
}

/** Direct accent toggle (Right-click / Option-click): off/hit → accent, accent → off. */
export function toggleAccent(steps: string, index: number): string {
  const next: Record<StepChar, StepChar> = { "-": "X", x: "X", X: "-", f: "F", F: "f" };
  return withStep(steps, index, next[stepAt(steps, index)]);
}

/** Flam-mode tap: toggles the flam on a step (an empty step becomes a flammed hit). */
export function toggleFlam(steps: string, index: number): string {
  const next: Record<StepChar, StepChar> = { "-": "f", x: "f", X: "F", f: "x", F: "X" };
  return withStep(steps, index, next[stepAt(steps, index)]);
}

export function describeStep(c: StepChar): string {
  return { "-": "off", x: "hit", X: "accent", f: "flam", F: "accent flam" }[c];
}

export function stepsForBar(v: VoiceSpec, bar: BarId): string {
  switch (bar) {
    case "a":
      return normalizeSteps(v.steps);
    case "b":
      return normalizeSteps(v.steps_b ?? v.steps);
    case "c":
      return normalizeSteps(v.steps_c ?? v.steps);
    case "d":
      return normalizeSteps(v.steps_d ?? v.steps_b ?? v.steps);
  }
}

export function setStepsForBar(v: VoiceSpec, bar: BarId, steps: string): void {
  const norm = normalizeSteps(steps);
  switch (bar) {
    case "a":
      v.steps = norm;
      break;
    case "b":
      v.steps_b = norm;
      break;
    case "c":
      v.steps_c = norm;
      break;
    case "d":
      v.steps_d = norm;
      break;
  }
}

// ---- sanitising ----

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, places: number) => {
  const k = 10 ** places;
  return Math.round(v * k) / k;
};
const num = (v: unknown, fallback: number): number => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
};
const unit = (v: unknown, fallback: number) => round(clamp(num(v, fallback), 0, 1), 3);

/**
 * Brings any parsed object into range. Unknown fields are dropped and
 * missing ones take the core's defaults, so old links (kick only, no flam)
 * load unchanged.
 */
export function sanitize(input: unknown): PatternSpec {
  const d = emptySpec();
  if (!input || typeof input !== "object") return d;
  const o = input as Record<string, unknown>;
  const voicesIn = (o.voices && typeof o.voices === "object" ? o.voices : {}) as Record<string, unknown>;
  const renderIn = (o.render && typeof o.render === "object" ? o.render : {}) as Record<string, unknown>;
  const voices = {} as Record<VoiceId, VoiceSpec>;
  for (const id of VOICE_IDS) {
    const v = (voicesIn[id] && typeof voicesIn[id] === "object" ? voicesIn[id] : {}) as Record<string, unknown>;
    const out = defaultVoice(normalizeSteps(typeof v.steps === "string" ? v.steps : EMPTY_STEPS));
    if (typeof v.steps_b === "string") out.steps_b = normalizeSteps(v.steps_b);
    if (typeof v.steps_c === "string") out.steps_c = normalizeSteps(v.steps_c);
    if (typeof v.steps_d === "string") out.steps_d = normalizeSteps(v.steps_d);
    if (typeof v.steps_fill === "string") out.steps_fill = normalizeSteps(v.steps_fill);
    for (const c of CONTROL_IDS) out[c] = unit(v[c], CONTROL_DEFAULTS[c]);
    out.echo_send = unit(v.echo_send, 0);
    out.reverb_send = unit(v.reverb_send, 0);
    out.filter_send = unit(v.filter_send, 0);
    out.mute = v.mute === true;
    out.solo = v.solo === true;
    voices[id] = out;
  }
  const rawVar = Math.round(clamp(num(o.variation, 0), 0, 5));
  const rawAutoFill = Math.round(clamp(num(o.auto_fill_bars, 0), 0, 16));
  const autoFillBars = rawAutoFill === 2 || rawAutoFill === 4 || rawAutoFill === 8 ? rawAutoFill : 0;
  return {
    bpm: round(clamp(num(o.bpm, 120), BPM_MIN, BPM_MAX), 2),
    shuffle: unit(o.shuffle, 0),
    humanize: unit(o.humanize, 0),
    accent: unit(o.accent, 0.5),
    flam: unit(o.flam, 0.5),
    last_step: Math.round(clamp(num(o.last_step, STEP_COUNT), 1, STEP_COUNT)),
    variation: (rawVar >= 1 && rawVar <= 5 ? rawVar : 0) as VariationCode,
    fill: o.fill === true,
    auto_fill_bars: autoFillBars,
    kit_model: Math.round(clamp(num(o.kit_model, 0), 0, 7)),
    cymbal_mode: Math.round(clamp(num(o.cymbal_mode, 0), 0, 3)),
    voices,
    render: {
      output_gain: round(clamp(num(renderIn.output_gain, 1), 0, GAIN_MAX), 4),
      limiter: renderIn.limiter === true,
    },
  };
}

// ---- wire format ----

type WireVoice = {
  steps: string;
  steps_b?: string;
  steps_c?: string;
  steps_d?: string;
  steps_fill?: string;
  echo_send?: number;
  reverb_send?: number;
  filter_send?: number;
  mute?: true;
  solo?: true;
} & Partial<Record<ControlId, number>>;

/** The compact JSON object the core and the URL carry. */
export function toWire(spec: PatternSpec): Record<string, unknown> {
  const voices: Record<string, WireVoice> = {};
  for (const id of VOICE_IDS) {
    const v = spec.voices[id];
    const normA = normalizeSteps(v.steps);
    const w: WireVoice = { steps: normA };
    let interesting = normA !== EMPTY_STEPS || v.mute || v.solo;
    if (typeof v.steps_b === "string") {
      const normB = normalizeSteps(v.steps_b);
      if (normB !== normA) {
        w.steps_b = normB;
        interesting = true;
      }
    }
    if (typeof v.steps_c === "string") {
      const normC = normalizeSteps(v.steps_c);
      if (normC !== normA) {
        w.steps_c = normC;
        interesting = true;
      }
    }
    if (typeof v.steps_d === "string") {
      const normD = normalizeSteps(v.steps_d);
      const fallbackD = typeof v.steps_b === "string" ? normalizeSteps(v.steps_b) : normA;
      if (normD !== fallbackD) {
        w.steps_d = normD;
        interesting = true;
      }
    }
    if (typeof v.steps_fill === "string") {
      const normF = normalizeSteps(v.steps_fill);
      if (normF !== EMPTY_STEPS && normF !== normA) {
        w.steps_fill = normF;
        interesting = true;
      }
    }
    for (const c of CONTROL_IDS) {
      if (v[c] !== CONTROL_DEFAULTS[c]) {
        w[c] = v[c];
        interesting = true;
      }
    }
    if (v.echo_send > 0) {
      w.echo_send = v.echo_send;
      interesting = true;
    }
    if (v.reverb_send > 0) {
      w.reverb_send = v.reverb_send;
      interesting = true;
    }
    if (v.filter_send > 0) {
      w.filter_send = v.filter_send;
      interesting = true;
    }
    if (v.mute) w.mute = true;
    if (v.solo) w.solo = true;
    if (interesting) voices[id] = w;
  }
  const wire: Record<string, unknown> = {
    bpm: spec.bpm,
    shuffle: spec.shuffle,
    accent: spec.accent,
    flam: spec.flam,
    voices,
  };
  if (spec.humanize > 0) wire.humanize = spec.humanize;
  if (spec.last_step !== STEP_COUNT) wire.last_step = spec.last_step;
  if (spec.variation !== 0) wire.variation = spec.variation;
  if (spec.fill) wire.fill = true;
  if (spec.auto_fill_bars > 0) wire.auto_fill_bars = spec.auto_fill_bars;
  if (spec.kit_model > 0) wire.kit_model = spec.kit_model;
  if (spec.cymbal_mode > 0) wire.cymbal_mode = spec.cymbal_mode;
  if (spec.render.output_gain !== 1 || spec.render.limiter) {
    wire.render = { output_gain: spec.render.output_gain, limiter: spec.render.limiter };
  }
  return wire;
}

export function toJson(spec: PatternSpec): string {
  return JSON.stringify(toWire(spec));
}

/** JSON the core accepts, as NUL-terminated UTF-8 for the engine host. */
export function specBytes(spec: PatternSpec): Uint8Array {
  const body = new TextEncoder().encode(toJson(spec));
  const out = new Uint8Array(body.length + 1);
  out.set(body);
  return out;
}

// ---- URL hash and pattern code: base64url(JSON) ----

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** The pattern code: the base64url payload of a #p= link. */
export function encodeCode(spec: PatternSpec): string {
  return toBase64Url(toJson(spec));
}

export function decodeCode(code: string): PatternSpec | null {
  if (!/^[A-Za-z0-9_-]+$/.test(code)) return null;
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(code));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return sanitize(parsed);
  } catch {
    return null;
  }
}

export function encodeHash(spec: PatternSpec): string {
  return "#p=" + encodeCode(spec);
}

export function decodeHash(hash: string): PatternSpec | null {
  const m = /^#p=([A-Za-z0-9_-]+)$/.exec(hash);
  return m ? decodeCode(m[1]!) : null;
}

/**
 * Accepts what people paste: a bare pattern code, "#p=<code>", or a whole
 * link containing "#p=<code>". Whitespace (line wraps in chat apps) is
 * ignored.
 */
export function parsePatternInput(text: string): PatternSpec | null {
  const t = text.replace(/\s+/g, "");
  if (!t) return null;
  const m = /#p=([A-Za-z0-9_-]+)/.exec(t);
  return decodeCode(m ? m[1]! : t.replace(/^p=/, ""));
}
