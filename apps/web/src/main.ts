import "./style.css";
import { midiSupported } from "./clock/midi";
import { AudioEngine, type AudioState, type EngineMode, type EngineStatus } from "./engine/audio-engine";
import {
  applyAutoFill,
  clearAllVoiceFx,
  cloneVoiceFxMap,
  defaultVoiceFxMap,
  GROOVE_TEMPLATES,
  humanizePattern,
  isGroupEchoActive,
  mutatePattern,
  toggleGroupFx,
  type VoiceFxKind,
  type VoiceFxMap,
} from "./groove";
import { applyKitToSpec, DEFAULT_PRESET, KITS, PRESETS } from "./presets";
import { setupPwa } from "./pwa";
import {
  BAR_IDS,
  BPM_MAX,
  BPM_MIN,
  cloneSpec,
  cycleStep,
  decodeCode,
  decodeHash,
  EMPTY_STEPS,
  encodeCode,
  normalizeSteps,
  parsePatternInput,
  sanitize,
  setStep,
  setStepsForBar,
  specBytes,
  STEP_COUNT,
  stepsForBar,
  toggleAccent,
  toggleFlam,
  type BarId,
  type PatternSpec,
  type StepChar,
  type VariationCode,
  type VoiceSpec,
} from "./spec";
import { loadString, saveString } from "./storage";
import { ClockPanel, type SourceKind } from "./ui/clock-panel";
import { defaultDjsSpec, DjsPanel } from "./ui/djs-panel";
import { Grid } from "./ui/grid";
import { HowToExplainer } from "./ui/how-to";
import { formatDb, Meter } from "./ui/meter";
import { RmxPanel } from "./ui/rmx-panel";
import { template } from "./ui/template";
import {
  defaultTraktorSpec,
  TraktorPanel,
  type BuildupMacroId,
  type TraktorStemId,
} from "./ui/traktor-panel";
import { CONTROL_LABELS, VOICES, voiceInfo, type ControlId, type VoiceId } from "./voices";

// ---- environment ----

const SINGLE = __P5_SINGLE__;
const bridgeOk = !SINGLE && typeof WebSocket === "function";
const midiOk = !SINGLE && midiSupported();

// ---- state ----

// Purge legacy auto-persisted pattern key so opening a fresh build never loads unsaved edits.
saveString("pattern", null);

interface SavedSession {
  v: 1;
  trCode: string;
  trkCode?: string;
  djsCode: string;
  presetId: string;
  kitId: string;
  voiceFxLevel: number;
  powerTr: boolean;
  powerTraktor?: boolean;
  powerDjs: boolean;
  powerRmx: boolean;
  manualDeckMix: boolean;
}

interface HistoryEntry {
  spec: PatternSpec;
  traktorSpec?: PatternSpec;
  djsSpec?: PatternSpec;
  djsEditBank?: BarId;
  presetId: string;
  kitId: string;
  grooveId?: string;
  humanize?: number;
  voiceFx?: VoiceFxMap;
  voiceFxLevel?: number;
  powerTr?: boolean;
  powerTraktor?: boolean;
  powerDjs?: boolean;
  powerRmx?: boolean;
  manualDeckMix?: boolean;
}

function findMatchingPresetId(s: PatternSpec): string {
  const code = encodeCode(s);
  return PRESETS.find((p) => encodeCode(p.spec()) === code)?.id ?? "";
}

function initialEditBar(s: PatternSpec): BarId {
  if (s.variation === 1) return "b";
  if (s.variation === 3) return "c";
  if (s.variation === 4) return "d";
  return "a";
}

function loadInitialSession(): {
  tr: PatternSpec;
  trk: PatternSpec;
  djs: PatternSpec;
  presetId?: string;
  kitId?: string;
  vfxLevel: number;
  pTr: boolean;
  pTrk: boolean;
  pDjs: boolean;
  pRmx: boolean;
  manualMix: boolean;
  saved: boolean;
} {
  let rawHash = "";
  try {
    rawHash = location.hash;
  } catch {
    /* no usable location */
  }
  const hadInitialHash = rawHash.length > 1;
  const fromHash = hadInitialHash ? decodeHash(rawHash) : null;
  if (fromHash) {
    const trk = defaultTraktorSpec();
    trk.bpm = fromHash.bpm;
    trk.render = { ...fromHash.render };
    const djs = defaultDjsSpec();
    djs.bpm = fromHash.bpm;
    djs.render = { ...fromHash.render };
    return {
      tr: fromHash,
      trk,
      djs,
      vfxLevel: 0.72,
      pTr: true,
      pTrk: false,
      pDjs: false,
      pRmx: true,
      manualMix: false,
      saved: false,
    };
  }
  if (!hadInitialHash) {
    const rawSaved = loadString("saved-session");
    if (rawSaved) {
      try {
        const parsed = JSON.parse(rawSaved) as Partial<SavedSession>;
        const tr = parsed.trCode ? decodeCode(parsed.trCode) : null;
        if (tr) {
          const trk = (parsed.trkCode ? decodeCode(parsed.trkCode) : null) ?? defaultTraktorSpec();
          trk.bpm = tr.bpm;
          trk.render = { ...tr.render };
          const djs = (parsed.djsCode ? decodeCode(parsed.djsCode) : null) ?? defaultDjsSpec();
          djs.bpm = tr.bpm;
          djs.render = { ...tr.render };
          return {
            tr,
            trk,
            djs,
            presetId: typeof parsed.presetId === "string" ? parsed.presetId : undefined,
            kitId: typeof parsed.kitId === "string" ? parsed.kitId : undefined,
            vfxLevel: typeof parsed.voiceFxLevel === "number" ? parsed.voiceFxLevel : 0.72,
            pTr: parsed.powerTr !== false,
            pTrk: Boolean(parsed.powerTraktor),
            pDjs: Boolean(parsed.powerDjs),
            pRmx: parsed.powerRmx !== false,
            manualMix: Boolean(parsed.manualDeckMix),
            saved: true,
          };
        }
      } catch {
        saveString("saved-session", null);
      }
    }
  }
  const tr = DEFAULT_PRESET.spec();
  const trk = defaultTraktorSpec();
  trk.bpm = tr.bpm;
  trk.render = { ...tr.render };
  const djs = defaultDjsSpec();
  djs.bpm = tr.bpm;
  djs.render = { ...tr.render };
  return {
    tr,
    trk,
    djs,
    vfxLevel: 0.72,
    pTr: true,
    pTrk: false,
    pDjs: false,
    pRmx: true,
    manualMix: false,
    saved: false,
  };
}

const startup = loadInitialSession();
let spec: PatternSpec = startup.tr;
let traktorSpec: PatternSpec = startup.trk;
let djsSpec: PatternSpec = startup.djs;
let activePresetId = startup.presetId ?? findMatchingPresetId(spec);
let activeKitId = startup.kitId ?? PRESETS.find((p) => p.id === activePresetId)?.kitId ?? "";
let activeGrooveId = "";
let humanizeAmount = spec.humanize;
let voiceFx: VoiceFxMap = defaultVoiceFxMap();
let voiceFxLevel = startup.vfxLevel;
let selected: VoiceId = "kick";
let flamMode = false;
let editBank: BarId = initialEditBar(spec);
let djsEditBank: BarId = initialEditBar(djsSpec);
let followBars = false;
let mixerOpen = false;
let powerTr = startup.pTr;
let powerTraktor = startup.pTrk;
let powerDjs = startup.pDjs;
let powerRmx = startup.pRmx;
let manualDeckMix = startup.manualMix;
let hasSavedSession = startup.saved;
let isDirty = false;
let justSavedFlash = false;
let saveFlashTimer: ReturnType<typeof setTimeout> | undefined;
let booting = true;
/** Step being heard (the playhead). */
let playingStep = -1;
let playingBar: BarId = "a";
let djsPlayingBar: BarId = "a";

function syncFxFromSpec(s: PatternSpec): void {
  humanizeAmount = s.humanize;
  for (const v of VOICES) {
    const sv = s.voices[v.id];
    voiceFx[v.id] = {
      echo: sv.echo_send > 0.05,
      reverb: sv.reverb_send > 0.05,
      filter: sv.filter_send > 0.05,
    };
  }
  editBank = initialEditBar(s);
}

function syncFxIntoSpec(s: PatternSpec): void {
  s.humanize = humanizeAmount;
  for (const v of VOICES) {
    const f = voiceFx[v.id];
    const sv = s.voices[v.id];
    sv.echo_send = f.echo ? 0.85 : 0;
    sv.reverb_send = f.reverb ? 0.85 : 0;
    sv.filter_send = f.filter ? 0.85 : 0;
  }
}

syncFxFromSpec(spec);
/** Step at the engine's render position, as posted by the audio runtime. */
let renderedStep = -1;
let playheadFrame = 0;
const undoStack: string[] = [];
const redoStack: string[] = [];
let lastCheckpoint = { key: "", at: 0 };
/** While the user is typing a tempo, renders leave the BPM field alone. */
let bpmEditing = false;

// ---- DOM ----

const app = document.getElementById("app")!;
const secure = typeof isSecureContext === "boolean" ? isSecureContext : true;
app.innerHTML = template({ single: SINGLE, bridge: bridgeOk, midi: midiOk, secure });
if (SINGLE) app.dataset.build = "single";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const themeSelect = $<HTMLSelectElement>("theme-select");
const playBtn = $<HTMLButtonElement>("play");
const bpmInput = $<HTMLInputElement>("bpm");
const tapBtn = $<HTMLButtonElement>("tap");
const bpmButtons = [...app.querySelectorAll<HTMLButtonElement>("[data-bpm]")];
const shuffle = $<HTMLInputElement>("shuffle");
const accent = $<HTMLInputElement>("accent");
const flam = $<HTMLInputElement>("flam");
const flamModeBtn = $<HTMLButtonElement>("flam-mode");
const presetSelect = $<HTMLSelectElement>("preset");
const kitSelect = $<HTMLSelectElement>("kit");
const grooveSelect = $<HTMLSelectElement>("groove-template");
const humanizeInput = $<HTMLInputElement>("humanize");
const vfxLevelInput = $<HTMLInputElement>("vfx-level");
const vfxReadout = $<HTMLOutputElement>("vfx-readout");
const undoBtn = $<HTMLButtonElement>("undo");
const saveBtn = $<HTMLButtonElement>("save-btn");
const resetBtn = $<HTMLButtonElement>("reset-btn");
const powerTrBtn = $<HTMLButtonElement>("power-tr");
const powerTrkBtn = $<HTMLButtonElement>("power-traktor");
const powerDjsBtn = $<HTMLButtonElement>("power-djs");
const powerRmxBtn = $<HTMLButtonElement>("power-rmx");
const panelPowerTrBtn = $<HTMLButtonElement>("panel-power-tr");
const panelPowerTrkBtn = $<HTMLButtonElement>("panel-power-traktor");
const panelPowerDjsBtn = $<HTMLButtonElement>("panel-power-djs");
const panelPowerRmxBtn = $<HTMLButtonElement>("panel-power-rmx");
const gain = $<HTMLInputElement>("gain");
const limiter = $<HTMLInputElement>("limiter");
const voiceControls = $<HTMLDivElement>("voice-controls");
const voiceExtra = $<HTMLDivElement>("voice-extra");
const mixerDrawer = $<HTMLDivElement>("mixer-drawer");
const lastStepSelect = $<HTMLSelectElement>("last-step");
const autoFillSelect = $<HTMLSelectElement>("auto-fill-bars");
const fillHoldBtn = $<HTMLButtonElement>("fill-hold");
const shareLink = $<HTMLInputElement>("share-link");
const shareCode = $<HTMLInputElement>("share-code");
const importInput = $<HTMLInputElement>("import");
const shareMsg = $<HTMLParagraphElement>("share-msg");

// ---- hardware visual / color schemes ----

type ThemeId = "default" | "tr-classic" | "tr-silver" | "tr-neon" | "pioneer" | "maschine";
const THEME_IDS: readonly ThemeId[] = [
  "default",
  "tr-classic",
  "tr-silver",
  "tr-neon",
  "pioneer",
  "maschine",
];
const THEME_BG: Readonly<Record<ThemeId, string>> = {
  default: "#0f1115",
  "tr-classic": "#141311",
  "tr-silver": "#cfd3da",
  "tr-neon": "#07080c",
  pioneer: "#0c0e13",
  maschine: "#12151c",
};

function applyTheme(theme: ThemeId): void {
  if (theme === "default") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
  app.dataset.theme = theme;
  themeSelect.value = theme;
  const metaTheme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (metaTheme) metaTheme.content = THEME_BG[theme];
  const metaScheme = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (metaScheme) metaScheme.content = theme === "tr-silver" ? "light" : "dark";
}

const savedTheme = loadString("theme") as ThemeId | null;
applyTheme(savedTheme && THEME_IDS.includes(savedTheme) ? savedTheme : "default");
themeSelect.addEventListener("change", () => {
  const next = THEME_IDS.includes(themeSelect.value as ThemeId)
    ? (themeSelect.value as ThemeId)
    : "default";
  applyTheme(next);
  saveString("theme", next);
});

const audio = new AudioEngine({
  onState: (state, detail) => renderStatus(state, detail),
  onStep: (step) => {
    renderedStep = audio.playing ? step : -1;
    if (renderedStep < 0) playingStep = -1;
    renderPlayhead();
    if (renderedStep >= 0 && !playheadFrame) playheadFrame = requestAnimationFrame(followPlayhead);
  },
  onStatus: (status) => onEngineStatus(status),
});

type SurfaceMode = "sequencer" | "traktor" | "djs" | "rmx" | "booth";
let surfaceMode: SurfaceMode = "sequencer";
let boothLeftDeck: "sequencer" | "traktor" | "djs" = "sequencer";
app.dataset.surface = surfaceMode;
app.dataset.boothDeck = boothLeftDeck;

function isDjsFocused(): boolean {
  return surfaceMode === "djs" || (surfaceMode === "booth" && boothLeftDeck === "djs");
}

function isTraktorFocused(): boolean {
  return surfaceMode === "traktor" || (surfaceMode === "booth" && boothLeftDeck === "traktor");
}

function focusedSpec(): PatternSpec {
  if (isDjsFocused()) return djsSpec;
  if (isTraktorFocused()) return traktorSpec;
  return spec;
}

function toggleVoiceFx(voice: VoiceId, fx: VoiceFxKind): void {
  checkpoint(`vfx-${voice}-${fx}`);
  voiceFx[voice][fx] = !voiceFx[voice][fx];
  commit();
}

function editVoiceSteps(voice: VoiceId, fn: (steps: string) => string): void {
  const v = spec.voices[voice];
  setStepsForBar(v, editBank, fn(stepsForBar(v, editBank)));
}

function editDjsVoiceSteps(voice: VoiceId, fn: (steps: string) => string): void {
  const v = djsSpec.voices[voice];
  setStepsForBar(v, djsEditBank, fn(stepsForBar(v, djsEditBank)));
}

function ensureSpecBarsPopulated(targetSpec: PatternSpec, upToBar: BarId): void {
  for (const voice of VOICES) {
    const sv = targetSpec.voices[voice.id];
    if (upToBar === "b" || upToBar === "c" || upToBar === "d") {
      sv.steps_b ??= normalizeSteps(sv.steps);
    }
    if (upToBar === "c" || upToBar === "d") {
      sv.steps_c ??= normalizeSteps(sv.steps);
    }
    if (upToBar === "d") {
      sv.steps_d ??= normalizeSteps(sv.steps_b ?? sv.steps);
    }
  }
}

function ensureBarsPopulated(upToBar: BarId): void {
  ensureSpecBarsPopulated(spec, upToBar);
}

function singleBarVariation(bar: BarId): VariationCode {
  return bar === "b" ? 1 : bar === "c" ? 3 : bar === "d" ? 4 : 0;
}

function selectBar(bar: BarId): void {
  checkpoint("variation-bank");
  ensureBarsPopulated(bar);
  editBank = bar;
  if (spec.variation === 5) {
    // Keep 64-step A–D chain running while inspecting/editing any bar page
  } else if (spec.variation === 2 && (bar === "a" || bar === "b")) {
    // Keep 32-step A+B chain running while inspecting/editing Bar A or Bar B
  } else {
    spec.variation = singleBarVariation(bar);
  }
  commit();
}

function selectChainVariation(target: VariationCode): void {
  checkpoint("variation-bank");
  if (target === 5) {
    ensureBarsPopulated("d");
    spec.variation = spec.variation === 5 ? singleBarVariation(editBank) : 5;
  } else if (target === 2) {
    ensureBarsPopulated("b");
    if (spec.variation === 2) {
      spec.variation = singleBarVariation(editBank === "b" ? "b" : "a");
    } else {
      if (editBank === "c" || editBank === "d") editBank = "a";
      spec.variation = 2;
    }
  } else {
    spec.variation = target;
    editBank = initialEditBar(spec);
  }
  commit();
}

function selectDjsBar(bar: BarId): void {
  checkpoint("djs-variation-bank");
  ensureSpecBarsPopulated(djsSpec, bar);
  djsEditBank = bar;
  if (djsSpec.variation === 5) {
    // Keep 64-step A–D chain running while inspecting/editing any bar page
  } else if (djsSpec.variation === 2 && (bar === "a" || bar === "b")) {
    // Keep 32-step A+B chain running while inspecting/editing Bar A or Bar B
  } else {
    djsSpec.variation = singleBarVariation(bar);
  }
  commit();
}

function selectDjsChainVariation(target: VariationCode): void {
  checkpoint("djs-variation-bank");
  if (target === 5) {
    ensureSpecBarsPopulated(djsSpec, "d");
    djsSpec.variation = djsSpec.variation === 5 ? singleBarVariation(djsEditBank) : 5;
  } else if (target === 2) {
    ensureSpecBarsPopulated(djsSpec, "b");
    if (djsSpec.variation === 2) {
      djsSpec.variation = singleBarVariation(djsEditBank === "b" ? "b" : "a");
    } else {
      if (djsEditBank === "c" || djsEditBank === "d") djsEditBank = "a";
      djsSpec.variation = 2;
    }
  } else {
    djsSpec.variation = target;
    djsEditBank = initialEditBar(djsSpec);
  }
  commit();
}

function overdubStepIntoSpec(
  targetSpec: PatternSpec,
  targetEditBar: BarId,
  targetPlayBar: BarId,
  voice: VoiceId,
  stepIdx: number,
  isAccent: boolean,
  tuneOffset: number,
): void {
  checkpoint(`overdub-${voice}`);
  const v = targetSpec.voices[voice];
  const targetBar: BarId =
    playingStep >= 0 && (targetSpec.variation === 2 || targetSpec.variation === 5)
      ? targetPlayBar
      : targetEditBar;
  ensureSpecBarsPopulated(targetSpec, targetBar);
  const chars = [...normalizeSteps(stepsForBar(v, targetBar))];
  const index = Math.max(0, Math.min(STEP_COUNT - 1, stepIdx));
  chars[index] = isAccent ? "X" : "x";
  setStepsForBar(v, targetBar, chars.join(""));
  if (Math.abs(tuneOffset) > 0.01) {
    v.tune = Math.max(0, Math.min(1, Math.round((0.5 + tuneOffset * 0.45) * 100) / 100));
  }
  commit();
}

const grid = new Grid($("grid"), {
  onStep(voice, step) {
    checkpoint();
    editVoiceSteps(voice, (s) => (flamMode ? toggleFlam(s, step) : cycleStep(s, step)));
    commit();
  },
  onPaintStep(voice, step, ch: StepChar) {
    checkpoint("paint-steps");
    editVoiceSteps(voice, (s) => setStep(s, step, ch));
    commit();
  },
  onAccentStep(voice, step) {
    checkpoint();
    editVoiceSteps(voice, (s) => toggleAccent(s, step));
    commit();
  },
  onSelect(voice) {
    selected = voice;
    renderVoicePanel();
    renderGrid();
    renderGrooveAndFxControls();
    renderMixerDrawer();
    djs.render();
  },
  onMute(voice) {
    checkpoint();
    spec.voices[voice].mute = !spec.voices[voice].mute;
    commit();
  },
  onSolo(voice) {
    checkpoint();
    spec.voices[voice].solo = !spec.voices[voice].solo;
    commit();
  },
  onToggleFx(voice, fx) {
    toggleVoiceFx(voice, fx);
  },
});

const meter = new Meter($("meter"), $("meter-fill"), $("meter-out"));

const clock = new ClockPanel(
  $("clock"),
  {
    audio,
    tap: (ms) => tap(ms),
    onSourceChange: (source, previous) => onSourceChange(source, previous),
    getPatternBpm: () => spec.bpm,
    onExternalTransport: (wantPlaying) => {
      if (wantPlaying !== audio.playing) void togglePlay(true);
    },
  },
  { bridge: bridgeOk, midi: midiOk },
);

const rmx = new RmxPanel($("rmx-panel"), {
  audio,
  getBpm: () => (clock.following && audio.lastStatus ? audio.lastStatus.tempo : spec.bpm),
  getStep: () => playingStep,
  onOverdubHit(voice, stepIdx, isAccent, tuneOffset) {
    if (!powerTr && powerDjs) {
      overdubStepIntoSpec(djsSpec, djsEditBank, djsPlayingBar, voice, stepIdx, isAccent, tuneOffset);
    } else {
      overdubStepIntoSpec(spec, editBank, playingBar, voice, stepIdx, isAccent, tuneOffset);
    }
  },
  onToggleVoiceMute(voice) {
    checkpoint();
    const target = !powerTr && powerDjs ? djsSpec : spec;
    target.voices[voice].mute = !target.voices[voice].mute;
    commit();
  },
  onClearVoice(voice) {
    checkpoint();
    if (!powerTr && powerDjs) {
      setStepsForBar(djsSpec.voices[voice], djsEditBank, EMPTY_STEPS);
    } else {
      setStepsForBar(spec.voices[voice], editBank, EMPTY_STEPS);
    }
    commit();
  },
  isVoiceMuted: (voice) => (!powerTr && powerDjs ? djsSpec : spec).voices[voice].mute,
});

const djs = new DjsPanel($("djs-panel"), {
  audio,
  getRmxState: () => rmx.effectiveState,
  getSpec: () => djsSpec,
  getSelectedVoice: () => selected,
  onSelectVoice(voice) {
    selected = voice;
    renderVoicePanel();
    renderGrid();
    renderGrooveAndFxControls();
    renderMixerDrawer();
    djs.render();
  },
  getEditBar: () => djsEditBank,
  getPlayingBar: () => djsPlayingBar,
  getPlayingStep: () => playingStep,
  onSelectBar: (bar) => selectDjsBar(bar),
  onSelectVariation: (v) => selectDjsChainVariation(v),
  onToggleStep(voice, step, accentOnly) {
    checkpoint();
    editDjsVoiceSteps(voice, (s) =>
      accentOnly ? toggleAccent(s, step) : flamMode ? toggleFlam(s, step) : cycleStep(s, step),
    );
    commit();
  },
  onOverdubStep(voice, stepIdx, accentHit, tuneOffset) {
    overdubStepIntoSpec(djsSpec, djsEditBank, djsPlayingBar, voice, stepIdx, accentHit, tuneOffset);
  },
  onToggleMute(voice, soloInstead) {
    checkpoint();
    if (soloInstead) djsSpec.voices[voice].solo = !djsSpec.voices[voice].solo;
    else djsSpec.voices[voice].mute = !djsSpec.voices[voice].mute;
    commit();
  },
  onGroupMute(group) {
    checkpoint(`djs-grp-${group}`);
    if (group === "unmute_all") {
      for (const v of VOICES) {
        djsSpec.voices[v.id].mute = false;
        djsSpec.voices[v.id].solo = false;
      }
    } else if (group === "solo_bd") {
      const already =
        djsSpec.voices.kick.solo &&
        VOICES.every((v) => v.id === "kick" || !djsSpec.voices[v.id].solo);
      for (const v of VOICES) djsSpec.voices[v.id].solo = !already && v.id === "kick";
    } else if (group === "solo_perc") {
      const perc: VoiceId[] = ["snare", "clap", "rim", "low_tom", "mid_tom", "high_tom"];
      const already = perc.every((id) => djsSpec.voices[id].solo);
      for (const v of VOICES) djsSpec.voices[v.id].solo = !already && perc.includes(v.id);
    } else if (group === "kick") {
      djsSpec.voices.kick.mute = !djsSpec.voices.kick.mute;
    } else if (group === "tops") {
      const tops: VoiceId[] = ["closed_hat", "open_hat", "clap"];
      const nextMute = !tops.every((id) => djsSpec.voices[id].mute);
      for (const id of tops) djsSpec.voices[id].mute = nextMute;
    } else if (group === "toms") {
      const toms: VoiceId[] = ["low_tom", "mid_tom", "high_tom", "cowbell"];
      const nextMute = !toms.every((id) => djsSpec.voices[id].mute);
      for (const id of toms) djsSpec.voices[id].mute = nextMute;
    }
    commit();
  },
  onTriggerMacro(macro, eventTimeMs) {
    switch (macro) {
      case "bd_accent":
        void audio.triggerRmxPad("kick", -0.15, 1.0, eventTimeMs);
        break;
      case "sd_flam":
        void audio.triggerRmxPad("snare", 0, 0.72, eventTimeMs);
        setTimeout(() => void audio.triggerRmxPad("snare", 0.05, 0.98), 26);
        break;
      case "cp_dub":
        checkpoint("djs-cp-echo");
        djsSpec.voices.clap.echo_send = 0.85;
        commit();
        void audio.triggerVoice("clap", 0.96).catch(() => {});
        break;
      case "ride_toggle":
        checkpoint("djs-cymbal-mode");
        djsSpec.cymbal_mode ^= 1;
        commit();
        void audio.triggerVoice("open_hat", 0.92).catch(() => {});
        break;
      case "crash_toggle":
        checkpoint("djs-cymbal-mode");
        djsSpec.cymbal_mode ^= 2;
        commit();
        void audio.triggerVoice("cowbell", 0.95).catch(() => {});
        break;
    }
  },
  onTogglePlay: () => void togglePlay(),
  onCueReset() {
    audio.resync();
    if (!audio.playing) {
      playingStep = -1;
      playingBar = editBank;
      djsPlayingBar = djsEditBank;
      renderPlayhead();
    }
  },
  onBeatSync() {
    if (clock.following) {
      clock.setSource("internal");
    } else if (bridgeOk) {
      clock.setSource("link");
    } else {
      audio.resync();
    }
  },
  onNudge: (deltaMs) => clock.adjustNudge(deltaMs),
  onTempoFader: (bpm) => setBpm(bpm, "djs-tempo"),
  getClockReadout: () => ({
    following: clock.following,
    source: clock.source,
    locked: $("clock").dataset.lock === "locked",
    bpm: clock.following && audio.lastStatus ? audio.lastStatus.tempo : spec.bpm,
    playing: audio.playing,
  }),
  onLoadScene(sceneSpec, sceneName) {
    checkpoint(`djs-scene-${sceneName}`);
    const next = sceneSpec;
    next.render = { ...spec.render };
    djsSpec = next;
    spec.bpm = djsSpec.bpm;
    djsEditBank = initialEditBar(djsSpec);
    commit();
    say(`Loaded ${sceneName} on DJS-1000`);
  },
});

const traktor = new TraktorPanel($("traktor-panel"), {
  audio,
  getSpec: () => traktorSpec,
  getPlayingStep: () => playingStep,
  isPlaying: () => audio.playing,
  onCommitSpec(next, reason) {
    checkpoint(reason ?? "trk-edit");
    traktorSpec = next;
    commit();
  },
  getBaseRmxState: () => rmx.current,
  isRmxBypassed: () => rmx.isBypassed,
  onSay: (msg) => say(msg),
});

const howTo = new HowToExplainer(app);

// ---- surface mode & individual machine power switches ----

function renderMachinePowerControls(): void {
  powerTrBtn.setAttribute("aria-pressed", String(powerTr));
  powerTrkBtn.setAttribute("aria-pressed", String(powerTraktor));
  powerDjsBtn.setAttribute("aria-pressed", String(powerDjs));
  powerRmxBtn.setAttribute("aria-pressed", String(powerRmx));

  panelPowerTrBtn.setAttribute("aria-pressed", String(powerTr));
  $("panel-power-tr-label").textContent = powerTr ? "ON AIR" : "OFF";
  $("grid-panel").dataset.machineOff = String(!powerTr);

  panelPowerTrkBtn.setAttribute("aria-pressed", String(powerTraktor));
  $("panel-power-trk-label").textContent = powerTraktor ? "ON AIR" : "OFF";
  traktor.setPowered(powerTraktor);

  panelPowerDjsBtn.setAttribute("aria-pressed", String(powerDjs));
  $("panel-power-djs-label").textContent = powerDjs ? "ON AIR" : "OFF";
  djs.setPowered(powerDjs);

  panelPowerRmxBtn.setAttribute("aria-pressed", String(powerRmx));
  $("panel-power-rmx-label").textContent = powerRmx ? "FX ON" : "BYPASS";
  if (rmx.isBypassed !== !powerRmx) {
    rmx.setBypassed(!powerRmx);
  } else {
    $("rmx-panel").dataset.machineOff = String(!powerRmx);
  }

  app.dataset.powerTr = String(powerTr);
  app.dataset.powerTraktor = String(powerTraktor);
  app.dataset.powerDjs = String(powerDjs);
  app.dataset.powerRmx = String(powerRmx);
}

function renderSessionButtons(): void {
  if (justSavedFlash) {
    saveBtn.textContent = "Saved ✓";
    saveBtn.dataset.saveState = "saved";
  } else if (isDirty) {
    saveBtn.textContent = "Save ●";
    saveBtn.dataset.saveState = "dirty";
  } else if (hasSavedSession) {
    saveBtn.textContent = "Saved";
    saveBtn.dataset.saveState = "saved";
  } else {
    saveBtn.textContent = "Save";
    saveBtn.dataset.saveState = "clean";
  }
}

function setSurfaceMode(mode: SurfaceMode): void {
  surfaceMode = mode;
  app.dataset.surface = mode;
  app.dataset.boothDeck = boothLeftDeck;
  $("mode-seq").setAttribute("aria-pressed", String(mode === "sequencer"));
  $("mode-traktor").setAttribute("aria-pressed", String(mode === "traktor"));
  $("mode-djs").setAttribute("aria-pressed", String(mode === "djs"));
  $("mode-rmx").setAttribute("aria-pressed", String(mode === "rmx"));
  $("mode-booth").setAttribute("aria-pressed", String(mode === "booth"));
  $("rmx-panel").hidden = mode !== "rmx" && mode !== "booth";
  $("traktor-panel").hidden = !(mode === "traktor" || (mode === "booth" && boothLeftDeck === "traktor"));
  $("djs-panel").hidden = !(mode === "djs" || (mode === "booth" && boothLeftDeck === "djs"));
  $("grid-panel").hidden = !(mode === "sequencer" || (mode === "booth" && boothLeftDeck === "sequencer"));
  $("voice-panel").hidden = mode === "rmx" || mode === "traktor" || (mode === "booth" && boothLeftDeck === "traktor");
  if (mode !== "booth") $("share-panel").classList.remove("open-in-booth");

  // Auto-solo the active drum deck unless the user manually toggled machine switches to mix/mute them
  if (!manualDeckMix) {
    if (mode === "traktor" || (mode === "booth" && boothLeftDeck === "traktor")) {
      if (powerTr || powerDjs || !powerTraktor) {
        powerTraktor = true;
        powerTr = false;
        powerDjs = false;
        pushEnginePattern();
      }
    } else if (mode === "djs" || (mode === "booth" && boothLeftDeck === "djs")) {
      if (powerTr || powerTraktor || !powerDjs) {
        powerDjs = true;
        powerTr = false;
        powerTraktor = false;
        pushEnginePattern();
      }
    } else if (mode === "sequencer" || (mode === "booth" && boothLeftDeck === "sequencer")) {
      if (!powerTr || powerDjs || powerTraktor) {
        powerTr = true;
        powerTraktor = false;
        powerDjs = false;
        pushEnginePattern();
      }
    }
  }
  renderMachinePowerControls();
  renderVoicePanel();
  renderTransportFeel();
  howTo.setGuideMode(mode, boothLeftDeck);
  djs.render();
  traktor.render();
}

$("mode-seq").addEventListener("click", () => setSurfaceMode("sequencer"));
$("mode-traktor").addEventListener("click", () => setSurfaceMode("traktor"));
$("mode-djs").addEventListener("click", () => setSurfaceMode("djs"));
$("mode-rmx").addEventListener("click", () => setSurfaceMode("rmx"));
$("mode-booth").addEventListener("click", () => setSurfaceMode("booth"));
$("booth-swap-trk").addEventListener("click", () => {
  boothLeftDeck = "traktor";
  setSurfaceMode("booth");
});
$("booth-swap-tr-from-trk").addEventListener("click", () => {
  boothLeftDeck = "sequencer";
  setSurfaceMode("booth");
});
$("booth-swap-djs").addEventListener("click", () => {
  boothLeftDeck = "djs";
  setSurfaceMode("booth");
});
$("booth-swap-tr").addEventListener("click", () => {
  boothLeftDeck = "sequencer";
  setSurfaceMode("booth");
});

function toggleTrPower(): void {
  checkpoint("power-tr");
  powerTr = !powerTr;
  manualDeckMix = true;
  commit();
}

function toggleTraktorPower(): void {
  checkpoint("power-traktor");
  powerTraktor = !powerTraktor;
  manualDeckMix = true;
  commit();
}

function toggleDjsPower(): void {
  checkpoint("power-djs");
  powerDjs = !powerDjs;
  manualDeckMix = true;
  commit();
}

function toggleRmxPower(): void {
  checkpoint("power-rmx");
  powerRmx = !powerRmx;
  rmx.setBypassed(!powerRmx);
  commit();
}

powerTrBtn.addEventListener("click", toggleTrPower);
panelPowerTrBtn.addEventListener("click", toggleTrPower);
powerTrkBtn.addEventListener("click", toggleTraktorPower);
panelPowerTrkBtn.addEventListener("click", toggleTraktorPower);
powerDjsBtn.addEventListener("click", toggleDjsPower);
panelPowerDjsBtn.addEventListener("click", toggleDjsPower);
powerRmxBtn.addEventListener("click", toggleRmxPower);
panelPowerRmxBtn.addEventListener("click", toggleRmxPower);

// ---- rendering ----

const pct = (v: number) => `${Math.round(v * 100)}%`;
const gainDb = (g: number) => (g > 0 ? 20 * Math.log10(g) : -Infinity);

function renderGrid(): void {
  grid.render(spec, selected, voiceFx, editBank);
}

function formatVoicePhys(voice: VoiceId, v: VoiceSpec, cymbalMode = spec.cymbal_mode): string {
  const lvlDb = v.level > 0.001 ? `${(20 * Math.log10(v.level)).toFixed(1)} dB` : "−∞ dB";
  switch (voice) {
    case "kick":
      return `${Math.round(36 + v.tune * 59)} Hz · ${Math.round(120 + v.decay * 860)} ms · ${lvlDb}`;
    case "snare":
      return `${Math.round(135 + v.tune * 130)} Hz · ${Math.round(80 + v.decay * 340)} ms · ${lvlDb}`;
    case "low_tom":
      return `${Math.round(68 + v.tune * 57)} Hz · ${Math.round(130 + v.decay * 490)} ms · ${lvlDb}`;
    case "mid_tom":
      return `${Math.round(105 + v.tune * 80)} Hz · ${Math.round(115 + v.decay * 440)} ms · ${lvlDb}`;
    case "high_tom":
      return `${Math.round(155 + v.tune * 120)} Hz · ${Math.round(100 + v.decay * 390)} ms · ${lvlDb}`;
    case "rim":
      return `${Math.round(420 + v.tune * 920)} Hz · 38 ms · ${lvlDb}`;
    case "clap":
      return `4-burst · ${Math.round(90 + v.decay * 370)} ms · ${lvlDb}`;
    case "closed_hat":
      return `${Math.round(320 + v.tune * 360)} Hz · ${Math.round(28 + v.decay * 87)} ms · ${lvlDb}`;
    case "open_hat":
      return `${(cymbalMode & 1) !== 0 ? "9O9 Ride" : "6-Osc Hat"} · ${Math.round(140 + v.decay * 680)} ms · ${lvlDb}`;
    case "cowbell":
      return `${(cymbalMode & 2) !== 0 ? "9O9 Crash" : `${Math.round(510 + v.tune * 85)} Hz`} · ${lvlDb}`;
  }
}

function renderMixerDrawer(): void {
  $("mixer-toggle").setAttribute("aria-pressed", String(mixerOpen));
  mixerDrawer.hidden = !mixerOpen;
  if (!mixerOpen) return;
  if (!mixerDrawer.children.length) {
    mixerDrawer.replaceChildren(
      ...VOICES.map((voice) => {
        const strip = document.createElement("div");
        strip.className = "mixer-strip";
        strip.dataset.mixerVoice = voice.id;
        strip.innerHTML =
          `<button type="button" class="mixer-sel" data-msel="${voice.id}">${voice.short}</button>` +
          `<input type="range" class="mixer-fader" min="0" max="1" step="0.01" data-mlevel="${voice.id}" aria-label="${voice.name} mixer level" />` +
          `<output class="mixer-out" data-mout="${voice.id}"></output>` +
          `<div class="mixer-btns">` +
          `<button type="button" class="solo" data-msolo="${voice.id}" aria-label="Solo ${voice.name}">S</button>` +
          `<button type="button" class="mute" data-mmute="${voice.id}" aria-label="Mute ${voice.name}">M</button>` +
          `</div>`;
        strip.querySelector<HTMLButtonElement>("[data-msel]")!.addEventListener("click", () => {
          selected = voice.id;
          renderControls();
        });
        const fader = strip.querySelector<HTMLInputElement>("[data-mlevel]")!;
        fader.addEventListener("input", () => {
          checkpoint(`${voice.id}.level`);
          spec.voices[voice.id].level = Number(fader.value);
          commit();
        });
        strip.querySelector<HTMLButtonElement>("[data-msolo]")!.addEventListener("click", () => {
          checkpoint();
          spec.voices[voice.id].solo = !spec.voices[voice.id].solo;
          commit();
        });
        strip.querySelector<HTMLButtonElement>("[data-mmute]")!.addEventListener("click", () => {
          checkpoint();
          spec.voices[voice.id].mute = !spec.voices[voice.id].mute;
          commit();
        });
        return strip;
      }),
    );
  }
  for (const voice of VOICES) {
    const v = spec.voices[voice.id];
    const strip = mixerDrawer.querySelector<HTMLElement>(`[data-mixer-voice="${voice.id}"]`);
    if (!strip) continue;
    strip.classList.toggle("selected", voice.id === selected);
    const fader = strip.querySelector<HTMLInputElement>("[data-mlevel]")!;
    if (fader.value !== String(v.level)) fader.value = String(v.level);
    strip.querySelector<HTMLElement>("[data-mout]")!.textContent = pct(v.level);
    strip.querySelector<HTMLButtonElement>("[data-msolo]")!.setAttribute("aria-pressed", String(v.solo));
    strip.querySelector<HTMLButtonElement>("[data-mmute]")!.setAttribute("aria-pressed", String(v.mute));
  }
}

function renderVariationBar(): void {
  const isChained = spec.variation === 2 || spec.variation === 5;
  $("var-bank-a").setAttribute(
    "aria-pressed",
    String(spec.variation === 0 || (isChained && editBank === "a")),
  );
  $("var-bank-b").setAttribute(
    "aria-pressed",
    String(spec.variation === 1 || (isChained && editBank === "b")),
  );
  $("var-bank-c").setAttribute(
    "aria-pressed",
    String(spec.variation === 3 || (spec.variation === 5 && editBank === "c")),
  );
  $("var-bank-d").setAttribute(
    "aria-pressed",
    String(spec.variation === 4 || (spec.variation === 5 && editBank === "d")),
  );
  $("var-bank-ab").setAttribute("aria-pressed", String(spec.variation === 2));
  $("var-bank-abcd").setAttribute("aria-pressed", String(spec.variation === 5));
  $("var-follow").setAttribute("aria-pressed", String(followBars));
  for (const bar of BAR_IDS) {
    $(`var-bank-${bar}`).classList.toggle(
      "chain-active",
      isChained && playingBar === bar && playingStep >= 0,
    );
  }
  lastStepSelect.value = String(spec.last_step);
  autoFillSelect.value = String(spec.auto_fill_bars);
  fillHoldBtn.setAttribute("aria-pressed", String(spec.fill));
}

function renderGrooveAndFxControls(): void {
  grooveSelect.value = activeGrooveId;
  humanizeInput.value = String(humanizeAmount);
  $("humanize-out").textContent = pct(humanizeAmount);
  vfxLevelInput.value = String(voiceFxLevel);
  $("vfx-level-out").textContent = pct(voiceFxLevel);

  const selFx = voiceFx[selected];
  const selInfo = voiceInfo(selected);
  $("vfx-echo").setAttribute("aria-pressed", String(selFx.echo));
  $("vfx-echo").textContent = `${selInfo.short} Echo [⌥E]`;
  $("vfx-reverb").setAttribute("aria-pressed", String(selFx.reverb));
  $("vfx-reverb").textContent = `${selInfo.short} Reverb [⌥R]`;
  $("vfx-filter").setAttribute("aria-pressed", String(selFx.filter));
  $("vfx-filter").textContent = `${selInfo.short} Filter [⌥D]`;

  $("grp-fx-snare").setAttribute("aria-pressed", String(isGroupEchoActive(voiceFx, "snare_clap")));
  $("grp-fx-hats").setAttribute("aria-pressed", String(isGroupEchoActive(voiceFx, "hats")));
  $("grp-fx-toms").setAttribute("aria-pressed", String(isGroupEchoActive(voiceFx, "toms")));

  // Build concise readout of active per-voice FX
  const activeSummaries: string[] = [];
  for (const v of VOICES) {
    const f = voiceFx[v.id];
    const tags: string[] = [];
    if (f.echo) tags.push("EC");
    if (f.reverb) tags.push("RV");
    if (f.filter) tags.push("FL");
    if (tags.length > 0) activeSummaries.push(`${v.short}:${tags.join("+")}`);
  }
  vfxReadout.textContent =
    activeSummaries.length > 0
      ? `FX ON (${pct(voiceFxLevel)}) · ${activeSummaries.join(" ")}`
      : "DRY · NO VOICE FX";
}

function renderVoicePanel(): void {
  const info = voiceInfo(selected);
  const target = focusedSpec();
  $("voice-title").textContent = `${info.short} · ${info.name}`;
  const v = target.voices[selected];
  const existing = voiceControls.dataset.voice === selected;
  if (!existing) {
    voiceControls.dataset.voice = selected;
    voiceControls.replaceChildren(
      ...info.controls.map((c) => {
        const id = `vc-${c}`;
        const label = document.createElement("label");
        label.className = "knob";
        label.htmlFor = id;
        const head = document.createElement("span");
        head.className = "knob-label";
        head.textContent = `${CONTROL_LABELS[c]} `;
        const out = document.createElement("output");
        out.id = `${id}-out`;
        head.append(out);
        const input = document.createElement("input");
        input.id = id;
        input.type = "range";
        input.min = "0";
        input.max = "1";
        input.step = "0.01";
        input.dataset.control = c;
        input.setAttribute("aria-label", `${info.name} ${CONTROL_LABELS[c].toLowerCase()}`);
        input.addEventListener("input", () => {
          checkpoint(`${selected}.${c}`);
          focusedSpec().voices[selected][c as ControlId] = Number(input.value);
          commit();
        });
        label.append(head, input);
        return label;
      }),
    );
    const mute = document.createElement("button");
    mute.type = "button";
    mute.className = "toggle voice-mute";
    mute.id = "voice-mute";
    mute.textContent = "Mute";
    mute.addEventListener("click", () => {
      checkpoint();
      const s = focusedSpec();
      s.voices[selected].mute = !s.voices[selected].mute;
      commit();
    });
    voiceControls.append(mute);
  }
  for (const input of voiceControls.querySelectorAll<HTMLInputElement>("input[data-control]")) {
    const c = input.dataset.control as ControlId;
    if (input.value !== String(v[c])) input.value = String(v[c]);
    $(`${input.id}-out`).textContent = pct(v[c]);
  }
  const mute = $("voice-mute");
  mute.setAttribute("aria-pressed", String(v.mute));
  mute.setAttribute("aria-label", `Mute ${info.name}`);

  // Extra hardware controls & physical parameter telemetry (#voice-extra)
  if (voiceExtra.dataset.voice !== selected) {
    voiceExtra.dataset.voice = selected;
    const nodes: HTMLElement[] = [];

    const soloBtn = document.createElement("button");
    soloBtn.type = "button";
    soloBtn.id = "voice-solo";
    soloBtn.className = "toggle small voice-solo";
    soloBtn.textContent = "Solo";
    soloBtn.addEventListener("click", () => {
      checkpoint();
      const s = focusedSpec();
      s.voices[selected].solo = !s.voices[selected].solo;
      commit();
    });
    nodes.push(soloBtn);

    if (selected === "kick") {
      const wrap = document.createElement("label");
      wrap.className = "knob extra-knob";
      wrap.htmlFor = "vc-kick-attack";
      wrap.innerHTML =
        `<span class="knob-label">Attack <output id="vc-kick-attack-out"></output></span>` +
        `<input id="vc-kick-attack" type="range" min="0" max="1" step="0.01" aria-label="Bass drum click attack" />`;
      const atk = wrap.querySelector<HTMLInputElement>("input")!;
      atk.addEventListener("input", () => {
        checkpoint("kick.tone");
        focusedSpec().voices.kick.tone = Number(atk.value);
        commit();
      });
      nodes.push(wrap);
    } else if (selected === "open_hat") {
      const rideBtn = document.createElement("button");
      rideBtn.type = "button";
      rideBtn.id = "vc-oh-ride";
      rideBtn.className = "toggle small";
      rideBtn.addEventListener("click", () => {
        checkpoint("cymbal-mode");
        focusedSpec().cymbal_mode ^= 1;
        commit();
      });
      nodes.push(rideBtn);
    } else if (selected === "cowbell") {
      const crashBtn = document.createElement("button");
      crashBtn.type = "button";
      crashBtn.id = "vc-cb-crash";
      crashBtn.className = "toggle small";
      crashBtn.addEventListener("click", () => {
        checkpoint("cymbal-mode");
        focusedSpec().cymbal_mode ^= 2;
        commit();
      });
      nodes.push(crashBtn);
    }

    const phys = document.createElement("output");
    phys.id = "voice-phys";
    phys.className = "voice-phys";
    nodes.push(phys);
    voiceExtra.replaceChildren(...nodes);
  }

  const soloBtn = $<HTMLButtonElement>("voice-solo");
  soloBtn.setAttribute("aria-pressed", String(v.solo));
  soloBtn.setAttribute("aria-label", `Solo ${info.name}`);
  if (selected === "kick") {
    const atk = $<HTMLInputElement>("vc-kick-attack");
    if (atk.value !== String(v.tone)) atk.value = String(v.tone);
    $("vc-kick-attack-out").textContent = pct(v.tone);
  } else if (selected === "open_hat") {
    const isRide = (target.cymbal_mode & 1) !== 0;
    const rideBtn = $<HTMLButtonElement>("vc-oh-ride");
    rideBtn.setAttribute("aria-pressed", String(isRide));
    rideBtn.textContent = isRide ? "9O9 Ride" : "Open Hat";
  } else if (selected === "cowbell") {
    const isCrash = (target.cymbal_mode & 2) !== 0;
    const crashBtn = $<HTMLButtonElement>("vc-cb-crash");
    crashBtn.setAttribute("aria-pressed", String(isCrash));
    crashBtn.textContent = isCrash ? "9O9 Crash" : "8O8 Bell";
  }
  $("voice-phys").textContent = formatVoicePhys(selected, v, target.cymbal_mode);
}

function renderTransportFeel(): void {
  const active = focusedSpec();
  shuffle.value = String(active.shuffle);
  accent.value = String(active.accent);
  flam.value = String(active.flam);
  $("shuffle-out").textContent = pct(active.shuffle);
  $("accent-out").textContent = pct(active.accent);
  $("flam-out").textContent = pct(active.flam);
}

function renderControls(): void {
  renderGrid();
  renderVoicePanel();
  renderGrooveAndFxControls();
  renderVariationBar();
  renderMixerDrawer();
  renderMachinePowerControls();
  renderSessionButtons();
  rmx.render();
  djs.syncBaseBpm(spec.bpm);
  djs.render();
  traktor.render();
  if (!clock.following && !bpmEditing) bpmInput.value = String(spec.bpm);
  renderTransportFeel();
  const db = gainDb(spec.render.output_gain);
  gain.value = String(Number.isFinite(db) ? Math.max(-24, Math.min(12, db)) : -24);
  $("gain-out").textContent = formatDb(Math.round(db * 10) / 10, "dB");
  limiter.checked = spec.render.limiter;
  flamModeBtn.setAttribute("aria-pressed", String(flamMode));
  app.dataset.flamMode = String(flamMode);
  presetSelect.value = activePresetId;
  kitSelect.value = activeKitId;
  if (activePresetId) app.dataset.preset = activePresetId;
  else delete app.dataset.preset;
  if (activeKitId) app.dataset.kit = activeKitId;
  else delete app.dataset.kit;
  $("grid-hint").textContent = flamMode
    ? "flam edit: tap toggles a flam"
    : "tap a step: off → hit → accent · EC/RV/FL: per-voice FX";
  undoBtn.disabled = undoStack.length === 0;
}

/** Steps per beat in the core (sequencer::BEATS_PER_STEP = 0.25). */
const STEPS_PER_BEAT = 4;

function barAtTotalSteps(s: PatternSpec, totalSteps: number, loopLen: number): BarId {
  const barCount = Math.floor(totalSteps / loopLen);
  if (s.variation === 5) return BAR_IDS[barCount % 4]!;
  if (s.variation === 2) return barCount % 2 === 1 ? "b" : "a";
  return initialEditBar(s);
}

function followPlayhead(): void {
  playheadFrame = 0;
  if (!audio.playing || renderedStep < 0) {
    playingStep = -1;
    playingBar = editBank;
    djsPlayingBar = djsEditBank;
    renderPlayhead();
    return;
  }
  const activeDeck = !powerTr && powerDjs ? djsSpec : spec;
  const loopLen = powerTr && powerDjs ? STEP_COUNT : Math.max(1, activeDeck.last_step || STEP_COUNT);
  const beat = audio.beatHeardAt(performance.now());
  let step: number;
  let bar: BarId = initialEditBar(spec);
  let dBar: BarId = initialEditBar(djsSpec);
  if (beat === null) {
    step = renderedStep % loopLen;
  } else if (beat < 0) {
    step = -1;
  } else {
    const totalSteps = Math.floor(beat * STEPS_PER_BEAT);
    step = totalSteps % loopLen;
    bar = barAtTotalSteps(spec, totalSteps, Math.max(1, spec.last_step || STEP_COUNT));
    dBar = barAtTotalSteps(djsSpec, totalSteps, Math.max(1, djsSpec.last_step || STEP_COUNT));
  }
  if (step !== playingStep || bar !== playingBar || dBar !== djsPlayingBar) {
    playingStep = step;
    playingBar = bar;
    djsPlayingBar = dBar;
    if (followBars && (spec.variation === 2 || spec.variation === 5) && step >= 0 && editBank !== bar) {
      editBank = bar;
      renderGrid();
      renderVariationBar();
    }
    renderPlayhead();
  }
  playheadFrame = requestAnimationFrame(followPlayhead);
}

function renderPlayhead(): void {
  const isChained = spec.variation === 2 || spec.variation === 5;
  const gridHead = !isChained || playingBar === editBank ? playingStep : -1;
  grid.setPlayhead(gridHead);
  if (app.dataset.playingStep !== String(playingStep)) app.dataset.playingStep = String(playingStep);
  if (app.dataset.playingBar !== playingBar) app.dataset.playingBar = playingBar;
  const playing = audio.playing;
  playBtn.textContent = playing ? "Stop" : "Play";
  playBtn.setAttribute("aria-pressed", String(playing));
  if (audio.armed) playBtn.dataset.armed = "true";
  else delete playBtn.dataset.armed;
  for (const bar of BAR_IDS) {
    $(`var-bank-${bar}`).classList.toggle(
      "chain-active",
      isChained && playingBar === bar && playingStep >= 0,
    );
  }
  if (!($("djs-panel").hidden)) djs.render();
  if (!($("traktor-panel").hidden)) traktor.render();
}

const MODE_LABEL: Record<EngineMode, string> = {
  worklet: "wasm · AudioWorklet",
  script: "wasm · ScriptProcessor",
  js: "JS core · ScriptProcessor",
};

function renderStatus(state: AudioState, detail?: string): void {
  const el = $("status");
  const sr = audio.sampleRate;
  el.dataset.state = state;
  el.textContent =
    state === "idle"
      ? "audio off — press Play"
      : state === "starting"
        ? "starting audio…"
        : state === "running"
          ? `running${sr ? ` · ${sr / 1000} kHz` : ""}`
          : `audio failed: ${detail ?? "unknown"}`;
  if (audio.mode) {
    app.dataset.engine = audio.mode;
    $("engine-mode").textContent = MODE_LABEL[audio.mode];
  }
  app.removeAttribute("aria-busy");
  clock.onAudioState(state);
  if (state !== "running") renderPlayhead();
}

function onEngineStatus(status: EngineStatus): void {
  meter.set(status.peak);
  clock.onStatus(status);
  if (clock.following) bpmInput.value = status.tempo.toFixed(2);
  if (audio.armed) playBtn.dataset.armed = "true";
  else delete playBtn.dataset.armed;
  if (!$("djs-panel").hidden) djs.render();
}

// ---- multi-machine audio engine routing (TR Drums vs Pioneer DJS-1000) ----

function stepRank(ch: string): number {
  return ch === "F" ? 4 : ch === "X" ? 3 : ch === "f" ? 2 : ch === "x" ? 1 : 0;
}

function mergeStepChar(a: string, b: string): StepChar {
  if (a === "-") return (b as StepChar) || "-";
  if (b === "-") return (a as StepChar) || "-";
  if ((a === "X" && b === "f") || (a === "f" && b === "X")) return "F";
  return stepRank(a) >= stepRank(b) ? (a as StepChar) : (b as StepChar);
}

function audibleStepsForFourBarSlot(
  s: PatternSpec,
  voice: VoiceId,
  slot: BarId,
  anySolo: boolean,
): string {
  const sv = s.voices[voice];
  if (sv.mute || (anySolo && !sv.solo)) return EMPTY_STEPS;
  let srcBar: BarId = slot;
  if (s.variation === 0) srcBar = "a";
  else if (s.variation === 1) srcBar = "b";
  else if (s.variation === 3) srcBar = "c";
  else if (s.variation === 4) srcBar = "d";
  else if (s.variation === 2) srcBar = slot === "b" || slot === "d" ? "b" : "a";
  const raw = normalizeSteps(stepsForBar(sv, srcBar));
  const loop = Math.max(1, Math.min(STEP_COUNT, s.last_step || STEP_COUNT));
  if (loop === STEP_COUNT) return raw;
  let out = "";
  for (let i = 0; i < STEP_COUNT; i++) out += raw[i % loop] ?? "-";
  return out;
}

function buildEngineSpec(): PatternSpec {
  const activeDecks: PatternSpec[] = [];
  if (powerTr) activeDecks.push(spec);
  if (powerTraktor) activeDecks.push(traktorSpec);
  if (powerDjs) activeDecks.push(djsSpec);

  if (activeDecks.length === 0) {
    const silent = cloneSpec(spec);
    silent.variation = 0;
    silent.fill = false;
    silent.auto_fill_bars = 0;
    for (const v of VOICES) {
      const sv = silent.voices[v.id];
      sv.steps = EMPTY_STEPS;
      delete sv.steps_b;
      delete sv.steps_c;
      delete sv.steps_d;
      sv.mute = false;
      sv.solo = false;
    }
    return silent;
  }

  if (activeDecks.length === 1) {
    return activeDecks[0]!;
  }

  // Multiple drum machines are ON AIR: merge all active 4-bar streams sample-accurately
  const merged = cloneSpec(activeDecks[0]!);
  merged.variation = 5;
  merged.last_step = STEP_COUNT;
  const soloFlags = activeDecks.map((d) => VOICES.some((v) => d.voices[v.id].solo));

  for (const v of VOICES) {
    const deckBars = activeDecks.map((d, dIdx) =>
      BAR_IDS.map((b) => audibleStepsForFourBarSlot(d, v.id, b, soloFlags[dIdx]!)),
    );
    const combinedBars = BAR_IDS.map((_, bIdx) => {
      let s = "";
      for (let i = 0; i < STEP_COUNT; i++) {
        let ch: StepChar = "-";
        for (let dIdx = 0; dIdx < deckBars.length; dIdx++) {
          ch = mergeStepChar(ch, deckBars[dIdx]![bIdx]![i] ?? "-");
        }
        s += ch;
      }
      return s;
    });
    const mv = merged.voices[v.id];
    mv.steps = combinedBars[0]!;
    mv.steps_b = combinedBars[1]!;
    mv.steps_c = combinedBars[2]!;
    mv.steps_d = combinedBars[3]!;
    mv.mute = false;
    mv.solo = false;

    const firstWithHits = deckBars.findIndex((bars) => bars.some((b) => b !== EMPTY_STEPS));
    if (firstWithHits > 0) {
      const src = activeDecks[firstWithHits]!.voices[v.id];
      mv.tune = src.tune;
      mv.decay = src.decay;
      mv.tone = src.tone;
      mv.snappy = src.snappy;
      mv.level = src.level;
      mv.echo_send = src.echo_send;
      mv.reverb_send = src.reverb_send;
      mv.filter_send = src.filter_send;
    }
  }
  return sanitize(merged);
}

function pushEnginePattern(): void {
  const engineSpec = buildEngineSpec();
  audio.setPattern(specBytes(engineSpec));
  audio.setKit(powerTr ? activeKitId : "", engineSpec);
}

function buildShareUrl(code: string): string {
  try {
    return `${location.origin}${location.pathname}${location.search}#p=${code}`;
  } catch {
    return `#p=${code}`;
  }
}

interface CommitOptions {
  skipUrlHash?: boolean;
  markModified?: boolean;
}

/** Apply a change everywhere: DOM, audio engine, share fields, and URL hash (never auto-persisting to localStorage). */
function commit(opts?: CommitOptions): void {
  syncFxIntoSpec(spec);
  spec = sanitize(spec);
  traktorSpec.bpm = spec.bpm;
  traktorSpec.render = { ...spec.render };
  traktorSpec = sanitize(traktorSpec);
  djsSpec.bpm = spec.bpm;
  djsSpec.render = { ...spec.render };
  djsSpec = sanitize(djsSpec);
  if (!booting && opts?.markModified !== false) {
    isDirty = true;
    justSavedFlash = false;
  }
  renderControls();
  pushEnginePattern();
  audio.setVoiceFxLevel(voiceFxLevel);
  const code = encodeCode(
    !powerTr && powerTraktor && !powerDjs
      ? traktorSpec
      : !powerTr && powerDjs
        ? djsSpec
        : spec,
  );
  shareCode.value = code;
  if (opts?.skipUrlHash) {
    clearTimeout(urlTimer);
    urlTimer = undefined;
    if (!SINGLE) shareLink.value = buildShareUrl(code);
  } else {
    scheduleUrlWrite();
  }
}

const URL_WRITE_MS = 120;
let urlTimer: ReturnType<typeof setTimeout> | undefined;
let lastUrlWrite = -Infinity;

function scheduleUrlWrite(): void {
  const wait = URL_WRITE_MS - (performance.now() - lastUrlWrite);
  if (wait <= 0) writeUrl();
  else urlTimer ??= setTimeout(writeUrl, wait);
}

function writeUrl(): void {
  clearTimeout(urlTimer);
  urlTimer = undefined;
  lastUrlWrite = performance.now();
  const code = shareCode.value;
  if (!SINGLE) {
    try {
      if (location.hash !== "#p=" + code) history.replaceState(null, "", "#p=" + code);
    } catch {
      /* sandboxed: the share panel still has the code */
    }
    shareLink.value = location.href;
  }
}

// ---- undo ----

function snapshotState(): string {
  const entry: HistoryEntry = {
    spec,
    traktorSpec,
    djsSpec,
    djsEditBank,
    presetId: activePresetId,
    kitId: activeKitId,
    grooveId: activeGrooveId,
    humanize: humanizeAmount,
    voiceFx: cloneVoiceFxMap(voiceFx),
    voiceFxLevel,
    powerTr,
    powerTraktor,
    powerDjs,
    powerRmx,
    manualDeckMix,
  };
  return JSON.stringify(entry);
}

function restoreSnapshot(raw: string): void {
  const parsed = JSON.parse(raw) as HistoryEntry | PatternSpec;
  if (parsed && typeof parsed === "object" && "spec" in parsed) {
    spec = sanitize(parsed.spec);
    if (parsed.traktorSpec) {
      traktorSpec = sanitize(parsed.traktorSpec);
    }
    if (parsed.djsSpec) {
      djsSpec = sanitize(parsed.djsSpec);
      djsEditBank = parsed.djsEditBank ?? initialEditBar(djsSpec);
    }
    activePresetId = parsed.presetId ?? "";
    activeKitId = parsed.kitId ?? "";
    activeGrooveId = parsed.grooveId ?? "";
    humanizeAmount = typeof parsed.humanize === "number" ? parsed.humanize : spec.humanize;
    voiceFx = parsed.voiceFx ? cloneVoiceFxMap(parsed.voiceFx) : defaultVoiceFxMap();
    voiceFxLevel = typeof parsed.voiceFxLevel === "number" ? parsed.voiceFxLevel : 0.72;
    if (typeof parsed.powerTr === "boolean") powerTr = parsed.powerTr;
    if (typeof parsed.powerTraktor === "boolean") powerTraktor = parsed.powerTraktor;
    if (typeof parsed.powerDjs === "boolean") powerDjs = parsed.powerDjs;
    if (typeof parsed.powerRmx === "boolean") {
      powerRmx = parsed.powerRmx;
      rmx.setBypassed(!powerRmx);
    }
    if (typeof parsed.manualDeckMix === "boolean") manualDeckMix = parsed.manualDeckMix;
    editBank = initialEditBar(spec);
  } else {
    spec = sanitize(parsed);
    syncFxFromSpec(spec);
  }
}

/** Saves the current pattern for undo. Same-key changes within 1.5 s (a slider drag) coalesce. */
function checkpoint(key = ""): void {
  const now = performance.now();
  if (key && key === lastCheckpoint.key && now - lastCheckpoint.at < 1500) {
    lastCheckpoint.at = now;
    return;
  }
  lastCheckpoint = { key, at: now };
  undoStack.push(snapshotState());
  if (undoStack.length > 200) undoStack.shift();
  redoStack.length = 0;
}

function undo(): void {
  const prev = undoStack.pop();
  if (prev === undefined) return;
  redoStack.push(snapshotState());
  restoreSnapshot(prev);
  lastCheckpoint = { key: "", at: 0 };
  commit();
}

function redo(): void {
  const next = redoStack.pop();
  if (next === undefined) return;
  undoStack.push(snapshotState());
  restoreSnapshot(next);
  lastCheckpoint = { key: "", at: 0 };
  commit();
}

// ---- transport ----

async function togglePlay(fromExternal = false): Promise<void> {
  if (audio.playing) {
    audio.stop();
  } else {
    try {
      await audio.play();
    } catch {
      /* the status line shows the failure */
    }
  }
  if (!fromExternal) clock.notifyTransport(audio.playing);
  renderPlayhead();
}

playBtn.addEventListener("click", () => void togglePlay());

function setBpm(bpm: number, key: string): void {
  if (!Number.isFinite(bpm)) return;
  checkpoint(key);
  spec.bpm = Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(bpm * 100) / 100));
  commit();
}

bpmInput.addEventListener("input", () => (bpmEditing = true));
bpmInput.addEventListener("blur", () => {
  bpmEditing = false;
  bpmInput.value = String(spec.bpm);
});
bpmInput.addEventListener("change", () => {
  bpmEditing = false;
  setBpm(Number(bpmInput.value), "bpm");
});
for (const b of bpmButtons) {
  b.addEventListener("click", (e) => {
    const dir = Number(b.dataset.bpm);
    setBpm(e.shiftKey ? spec.bpm + dir * 0.1 : Math.round(spec.bpm) + dir, "bpm");
  });
}

// Tap tempo. The tempo is estimated here (and stored in the pattern); the
// tap's time also goes to the engine, which pulls the beat grid onto it.
const taps: number[] = [];
function tap(ms: number): void {
  if (clock.following) return;
  const last = taps[taps.length - 1];
  if (last !== undefined && (ms - last > 2000 || ms <= last)) taps.length = 0;
  taps.push(ms);
  if (taps.length > 8) taps.shift();
  audio.tap(ms);
  if (taps.length >= 2) {
    const span = taps[taps.length - 1]! - taps[0]!;
    setBpm(60_000 / (span / (taps.length - 1)), "tap");
  }
}
tapBtn.addEventListener("pointerdown", (e) => tap(e.timeStamp));
tapBtn.addEventListener("click", (e) => {
  if (e.detail === 0) tap(performance.now());
});

function onSourceChange(source: SourceKind, previous: SourceKind): void {
  const following = source === "link" || source === "bridge" || source === "midi";
  for (const b of [bpmInput, tapBtn, ...bpmButtons]) b.disabled = following;
  bpmInput.title = following
    ? `Tempo follows ${source === "midi" ? "MIDI clock" : source === "link" ? "Ableton Link" : "the bridge"}`
    : "";
  const wasFollowing = previous === "link" || previous === "bridge" || previous === "midi";
  if (wasFollowing && !following && audio.running && audio.lastStatus) {
    // Keep playing at the tempo we were following instead of jumping back.
    setBpm(audio.lastStatus.tempo, "adopt");
  } else {
    bpmInput.value = String(spec.bpm);
  }
}

const bindUnit = (el: HTMLInputElement, key: string, apply: (v: number) => void) =>
  el.addEventListener("input", () => {
    checkpoint(key);
    apply(Number(el.value));
    commit();
  });
bindUnit(shuffle, "shuffle", (v) => (focusedSpec().shuffle = v));
bindUnit(accent, "accent", (v) => (focusedSpec().accent = v));
bindUnit(flam, "flam", (v) => (focusedSpec().flam = v));
bindUnit(gain, "gain", (db) => (spec.render.output_gain = Math.round(10 ** (db / 20) * 10_000) / 10_000));
limiter.addEventListener("change", () => {
  checkpoint();
  spec.render.limiter = limiter.checked;
  commit();
});

// ---- Groove, Humanize, Variation & Per-Sample FX bindings ----

grooveSelect.addEventListener("change", () => {
  const groove = GROOVE_TEMPLATES.find((g) => g.id === grooveSelect.value);
  if (!groove) {
    grooveSelect.value = activeGrooveId;
    return;
  }
  checkpoint("groove-template");
  activeGrooveId = groove.id;
  spec.shuffle = groove.shuffle;
  spec.accent = groove.accent;
  spec.flam = groove.flam;
  humanizeAmount = groove.humanize;
  commit();
});

bindUnit(humanizeInput, "humanize", (v) => {
  humanizeAmount = v;
});

bindUnit(vfxLevelInput, "vfx-level", (v) => {
  voiceFxLevel = v;
});

function triggerHumanizeAction(): void {
  checkpoint("var-humanize");
  if (humanizeAmount < 0.25) humanizeAmount = 0.35;
  spec = humanizePattern(spec, "all", Math.max(0.45, humanizeAmount), editBank);
  commit();
}

function triggerMutateAction(): void {
  checkpoint("var-mutate");
  spec = mutatePattern(spec, "all", 0.55, editBank);
  commit();
}

function triggerAutoFillAction(): void {
  checkpoint("var-fill");
  spec = applyAutoFill(spec, editBank);
  commit();
}

$("var-humanize").addEventListener("click", triggerHumanizeAction);
$("var-mutate").addEventListener("click", triggerMutateAction);
$("var-fill").addEventListener("click", triggerAutoFillAction);

// TR-8S A/B/C/D & 32/64-Step Variations, Polymetric Last Step, Momentary Fill & 10-Ch Mixer
$("var-bank-a").addEventListener("click", () => selectBar("a"));
$("var-bank-b").addEventListener("click", () => selectBar("b"));
$("var-bank-c").addEventListener("click", () => selectBar("c"));
$("var-bank-d").addEventListener("click", () => selectBar("d"));
$("var-bank-ab").addEventListener("click", () => selectChainVariation(2));
$("var-bank-abcd").addEventListener("click", () => selectChainVariation(5));
$("var-copy-ab").addEventListener("click", () => {
  checkpoint("copy-bar");
  const nextBar: BarId =
    editBank === "a" ? "b" : editBank === "b" ? "c" : editBank === "c" ? "d" : "a";
  ensureBarsPopulated(nextBar);
  for (const voice of VOICES) {
    const sv = spec.voices[voice.id];
    setStepsForBar(sv, nextBar, normalizeSteps(stepsForBar(sv, editBank)));
  }
  editBank = nextBar;
  if (spec.variation === 2) {
    if (nextBar === "c" || nextBar === "d") spec.variation = 5;
  } else if (spec.variation !== 5) {
    spec.variation = singleBarVariation(nextBar);
  }
  commit();
});
$("var-follow").addEventListener("click", () => {
  followBars = !followBars;
  renderVariationBar();
});

lastStepSelect.addEventListener("change", () => {
  checkpoint("last-step");
  spec.last_step = Math.max(1, Math.min(STEP_COUNT, Number(lastStepSelect.value) || STEP_COUNT));
  commit();
});

autoFillSelect.addEventListener("change", () => {
  checkpoint("auto-fill-bars");
  spec.auto_fill_bars = Number(autoFillSelect.value) || 0;
  commit();
});

const setFillHold = (held: boolean) => {
  if (spec.fill === held) return;
  spec.fill = held;
  fillHoldBtn.setAttribute("aria-pressed", String(held));
  pushEnginePattern();
};
fillHoldBtn.addEventListener("pointerdown", (e) => {
  if (e.button === 0) {
    e.preventDefault();
    setFillHold(true);
  }
});
window.addEventListener("pointerup", () => setFillHold(false));
window.addEventListener("pointercancel", () => setFillHold(false));

$("mixer-toggle").addEventListener("click", () => {
  mixerOpen = !mixerOpen;
  renderMixerDrawer();
});

$("vfx-echo").addEventListener("click", () => toggleVoiceFx(selected, "echo"));
$("vfx-reverb").addEventListener("click", () => toggleVoiceFx(selected, "reverb"));
$("vfx-filter").addEventListener("click", () => toggleVoiceFx(selected, "filter"));

function triggerGroupEcho(groupId: "snare_clap" | "hats" | "toms"): boolean {
  checkpoint(`grp-fx-${groupId}`);
  const on = toggleGroupFx(voiceFx, groupId, "echo");
  commit();
  return on;
}

$("grp-fx-snare").addEventListener("click", () => triggerGroupEcho("snare_clap"));
$("grp-fx-hats").addEventListener("click", () => triggerGroupEcho("hats"));
$("grp-fx-toms").addEventListener("click", () => triggerGroupEcho("toms"));
$("vfx-clear").addEventListener("click", () => {
  checkpoint("vfx-clear");
  clearAllVoiceFx(voiceFx);
  commit();
});

flamModeBtn.addEventListener("click", () => {
  flamMode = !flamMode;
  renderControls();
});

presetSelect.addEventListener("change", () => {
  const preset = PRESETS.find((p) => p.id === presetSelect.value);
  if (!preset) {
    presetSelect.value = activePresetId;
    return;
  }
  checkpoint();
  const next = preset.spec();
  next.render = { ...spec.render }; // the booth's master settings stay
  if (isDjsFocused()) {
    djsSpec = next;
    spec.bpm = djsSpec.bpm;
    djsEditBank = initialEditBar(djsSpec);
  } else {
    spec = next;
    editBank = initialEditBar(spec);
    activePresetId = preset.id;
    if (preset.kitId) activeKitId = preset.kitId;
  }
  commit();
});

kitSelect.addEventListener("change", () => {
  const kit = KITS.find((k) => k.id === kitSelect.value);
  if (!kit) {
    kitSelect.value = activeKitId;
    return;
  }
  checkpoint();
  if (isDjsFocused()) {
    djsSpec = applyKitToSpec(djsSpec, kit);
  } else {
    spec = applyKitToSpec(spec, kit);
  }
  activeKitId = kit.id;
  commit();
});

$("clear").addEventListener("click", () => {
  checkpoint();
  if (isDjsFocused()) {
    ensureSpecBarsPopulated(djsSpec, djsEditBank);
    for (const v of VOICES) {
      setStepsForBar(djsSpec.voices[v.id], djsEditBank, EMPTY_STEPS);
    }
  } else if (isTraktorFocused()) {
    for (const v of VOICES) {
      traktorSpec.voices[v.id].steps = EMPTY_STEPS;
    }
  } else {
    ensureBarsPopulated(editBank);
    for (const v of VOICES) {
      setStepsForBar(spec.voices[v.id], editBank, EMPTY_STEPS);
    }
  }
  commit();
});

undoBtn.addEventListener("click", undo);

function saveSession(): void {
  syncFxIntoSpec(spec);
  spec = sanitize(spec);
  traktorSpec.bpm = spec.bpm;
  traktorSpec.render = { ...spec.render };
  traktorSpec = sanitize(traktorSpec);
  djsSpec.bpm = spec.bpm;
  djsSpec.render = { ...spec.render };
  djsSpec = sanitize(djsSpec);
  const payload: SavedSession = {
    v: 1,
    trCode: encodeCode(spec),
    trkCode: encodeCode(traktorSpec),
    djsCode: encodeCode(djsSpec),
    presetId: activePresetId,
    kitId: activeKitId,
    voiceFxLevel,
    powerTr,
    powerTraktor,
    powerDjs,
    powerRmx,
    manualDeckMix,
  };
  saveString("saved-session", JSON.stringify(payload));
  saveString("pattern", null);
  hasSavedSession = true;
  isDirty = false;
  justSavedFlash = true;
  clearTimeout(saveFlashTimer);
  saveFlashTimer = setTimeout(() => {
    justSavedFlash = false;
    renderSessionButtons();
  }, 2200);
  writeUrl();
  renderSessionButtons();
  say("Saved startup session — this setup will reload next time you open player5.");
}

function resetAllMachines(): void {
  checkpoint("factory-reset");
  spec = DEFAULT_PRESET.spec();
  activePresetId = DEFAULT_PRESET.id;
  activeKitId = DEFAULT_PRESET.kitId ?? "";
  activeGrooveId = "";
  clearAllVoiceFx(voiceFx);
  syncFxFromSpec(spec);
  voiceFxLevel = 0.72;
  flamMode = false;
  editBank = "a";

  traktorSpec = traktor.reset();
  traktorSpec.bpm = spec.bpm;
  traktorSpec.render = { ...spec.render };

  djsSpec = djs.reset();
  djsSpec.bpm = spec.bpm;
  djsSpec.render = { ...spec.render };
  djsEditBank = initialEditBar(djsSpec);

  rmx.reset();
  powerRmx = true;
  rmx.setBypassed(false);

  manualDeckMix = false;
  if (isDjsFocused()) {
    powerDjs = true;
    powerTr = false;
    powerTraktor = false;
  } else if (isTraktorFocused()) {
    powerTraktor = true;
    powerTr = false;
    powerDjs = false;
  } else {
    powerTr = true;
    powerTraktor = false;
    powerDjs = false;
  }

  saveString("saved-session", null);
  saveString("pattern", null);
  hasSavedSession = false;
  isDirty = false;
  justSavedFlash = false;
  clearTimeout(saveFlashTimer);
  clearTimeout(urlTimer);
  urlTimer = undefined;
  if (!SINGLE) {
    try {
      if (location.hash) {
        history.replaceState(null, "", location.pathname + location.search);
      }
    } catch {
      /* sandboxed */
    }
  }
  commit({ skipUrlHash: true, markModified: false });
  say("Reset all machines to factory default and cleared saved startup state.");
}

saveBtn.addEventListener("click", saveSession);
resetBtn.addEventListener("click", resetAllMachines);

// ---- share & import ----

let msgTimer: ReturnType<typeof setTimeout> | undefined;
function say(text: string): void {
  shareMsg.textContent = text;
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => (shareMsg.textContent = ""), 6000);
}

/** Copies via the Clipboard API; otherwise leaves the text selected in its field. */
async function copyField(field: HTMLInputElement, what: string): Promise<void> {
  const text = field.value;
  try {
    if (!navigator.clipboard || window.origin === "null") throw new Error("no clipboard");
    await Promise.race([
      navigator.clipboard.writeText(text),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("clipboard timeout")), 250)),
    ]);
    say(`${what} copied to the clipboard.`);
    return;
  } catch {
    /* fall through: show it selected */
  }
  field.focus();
  field.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  say(copied ? `${what} copied.` : `${what} selected: copy it with Ctrl/Cmd+C.`);
}

$("share").addEventListener("click", () => {
  if (surfaceMode === "booth") {
    $("share-panel").classList.toggle("open-in-booth");
  }
  $("share-panel").scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  writeUrl();
  void (SINGLE ? copyField(shareCode, "Pattern code") : copyField(shareLink, "Link"));
});
$("copy-link").addEventListener("click", () => {
  writeUrl();
  void copyField(shareLink, "Link");
});
$("copy-code").addEventListener("click", () => void copyField(shareCode, "Pattern code"));
for (const field of [shareLink, shareCode]) field.addEventListener("focus", () => field.select());

function importText(text: string): boolean {
  const next = parsePatternInput(text);
  if (!next) {
    say("That is not a player5 pattern code or link.");
    return false;
  }
  checkpoint();
  if (isDjsFocused()) {
    djsSpec = next;
    spec.bpm = djsSpec.bpm;
    djsEditBank = initialEditBar(djsSpec);
  } else {
    spec = next;
    syncFxFromSpec(spec);
  }
  commit();
  importInput.value = "";
  say("Pattern loaded.");
  return true;
}

importInput.addEventListener("paste", (e) => {
  const text = e.clipboardData?.getData("text") ?? "";
  if (text && importText(text)) e.preventDefault();
});
importInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") importText(importInput.value);
});
$("import-btn").addEventListener("click", () => importText(importInput.value));

if (!SINGLE) {
  window.addEventListener("hashchange", () => {
    const next = decodeHash(location.hash);
    if (next && encodeCode(next) !== encodeCode(spec)) {
      checkpoint();
      spec = next;
      syncFxFromSpec(spec);
      commit();
    }
  });
}

// ---- keyboard ----

// The skip link moves focus into the grid without touching location.hash
// (a "#grid" fragment would replace the #p= pattern in the address bar).
app.querySelector<HTMLAnchorElement>(".skip")?.addEventListener("click", (e) => {
  e.preventDefault();
  app.querySelector<HTMLButtonElement>('#grid .step[tabindex="0"]')?.focus();
});

function isTextEntry(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return true;
  if (t instanceof HTMLInputElement) return !["range", "button", "submit", "reset"].includes(t.type);
  return false;
}

const VOICE_DIGIT_CODES = [
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Digit6",
  "Digit7",
  "Digit8",
  "Digit9",
  "Digit0",
] as const;

const STEP_KEY_CODES = [
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyF",
  "KeyG",
  "KeyH",
  "KeyJ",
  "KeyK",
  "KeyZ",
  "KeyX",
  "KeyC",
  "KeyV",
  "KeyB",
  "KeyN",
  "KeyM",
  "Comma",
] as const;

const KIT_KEY_CODES = ["KeyY", "KeyU", "KeyI", "KeyO", "KeyP"] as const;
const RMX_ROLL_DIVS = [1, 2, 4, 8, 16, 32] as const;
const DJS_PAD_CODES = [
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "KeyQ",
  "KeyW",
  "KeyE",
  "KeyR",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyF",
  "KeyZ",
  "KeyX",
  "KeyC",
  "KeyV",
] as const;
const TRAKTOR_PAT_CODES = [
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Digit6",
  "Digit7",
  "Digit8",
  "Digit9",
  "Digit0",
  "Minus",
  "Equal",
] as const;
const TRAKTOR_STEM_ORDER: readonly TraktorStemId[] = ["sub", "snare", "hats", "perc"];
let activeTrkStemIdx = 0;

function applyPresetByIndex(idx: number): void {
  const wrapped = ((idx % PRESETS.length) + PRESETS.length) % PRESETS.length;
  const preset = PRESETS[wrapped];
  if (!preset) return;
  checkpoint();
  const next = preset.spec();
  next.render = { ...spec.render };
  spec = next;
  editBank = initialEditBar(spec);
  activePresetId = preset.id;
  if (preset.kitId) activeKitId = preset.kitId;
  commit();
}

window.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (e.key === "Escape") {
    if (howTo.isOpen) {
      e.preventDefault();
      howTo.close();
      return;
    }
    if (traktor.isBuildupActive) {
      traktor.releaseIntoDrop();
      return;
    }
    rmx.setReleaseLever(false);
    return;
  }
  if (isTextEntry(e.target)) return;

  if (e.code === "Slash" && !mod && !e.altKey) {
    e.preventDefault();
    if (!e.repeat) howTo.toggle(surfaceMode, boothLeftDeck);
    return;
  }
  if (e.code === "Space" && !mod && !e.altKey) {
    e.preventDefault();
    if (!e.repeat) {
      howTo.notifyKeyDown("Space", "Space → Play / Stop Transport");
      void togglePlay();
    }
    return;
  }
  if (mod && !e.altKey && e.key.toLowerCase() === "z") {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
    return;
  }
  if (mod && !e.altKey && e.key.toLowerCase() === "y") {
    e.preventDefault();
    redo();
    return;
  }

  // Global Ctrl + Q/W/E: Quick RMX-1000 Isolator Kills from any deck
  if (e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
    if (e.code === "KeyQ") {
      e.preventDefault();
      const on = rmx.toggleKill("low");
      howTo.notifyKeyDown(e.code, `Ctrl+Q → RMX Kill Low ${on ? "ON" : "OFF"}`);
      return;
    }
    if (e.code === "KeyW") {
      e.preventDefault();
      const on = rmx.toggleKill("mid");
      howTo.notifyKeyDown(e.code, `Ctrl+W → RMX Kill Mid ${on ? "ON" : "OFF"}`);
      return;
    }
    if (e.code === "KeyE") {
      e.preventDefault();
      const on = rmx.toggleKill("high");
      howTo.notifyKeyDown(e.code, `Ctrl+E → RMX Kill High ${on ? "ON" : "OFF"}`);
      return;
    }
  }

  // Ctrl + 1..0: Toggle Dub Echo send on Voice 1..0 directly
  const vIdx = VOICE_DIGIT_CODES.indexOf(e.code as (typeof VOICE_DIGIT_CODES)[number]);
  if (e.ctrlKey && !e.metaKey && !e.altKey && vIdx >= 0 && !e.repeat) {
    const vInfo = VOICES[vIdx]!;
    e.preventDefault();
    toggleVoiceFx(vInfo.id, "echo");
    const on = voiceFx[vInfo.id].echo;
    howTo.notifyKeyDown(
      e.code,
      `Ctrl+${vIdx === 9 ? 0 : vIdx + 1} → ${vInfo.short} Dub Echo ${on ? "ON" : "OFF"}`,
    );
    return;
  }

  if (mod) return;

  // Global Surface Cycle (` / Shift+`), Tempo ([ / ]), Phase Nudge (; / '), and Re-sync (L)
  if (e.code === "Backquote" && !e.repeat) {
    e.preventDefault();
    if (e.shiftKey) {
      setSurfaceMode(surfaceMode === "booth" ? "sequencer" : "booth");
    } else {
      const nextMode: SurfaceMode =
        surfaceMode === "sequencer"
          ? "traktor"
          : surfaceMode === "traktor"
            ? "djs"
            : surfaceMode === "djs"
              ? "rmx"
              : "sequencer";
      setSurfaceMode(nextMode);
    }
    const label =
      surfaceMode === "booth"
        ? "Booth Split"
        : surfaceMode === "traktor"
          ? "Pattern Player"
          : surfaceMode === "djs"
            ? "DJS-1000 Deck"
            : surfaceMode === "rmx"
              ? "RMX-1000 Station"
              : "Step Sequencer";
    howTo.notifyKeyDown(e.code, `Surface → ${label}`);
    return;
  }
  if (e.code === "BracketLeft" && !e.altKey) {
    if (!clock.following) {
      e.preventDefault();
      setBpm(e.shiftKey ? spec.bpm - 0.1 : Math.round(spec.bpm) - 1, "bpm");
      howTo.notifyKeyDown(e.code, `[ → BPM ${spec.bpm}`);
    }
    return;
  }
  if (e.code === "BracketRight" && !e.altKey) {
    if (!clock.following) {
      e.preventDefault();
      setBpm(e.shiftKey ? spec.bpm + 0.1 : Math.round(spec.bpm) + 1, "bpm");
      howTo.notifyKeyDown(e.code, `] → BPM ${spec.bpm}`);
    }
    return;
  }
  if (e.code === "Semicolon" && !e.altKey) {
    e.preventDefault();
    $<HTMLButtonElement>("nudge-down").dispatchEvent(
      new MouseEvent("click", { shiftKey: e.shiftKey }),
    );
    howTo.notifyKeyDown(e.code, "; → Phase Nudge Earlier");
    return;
  }
  if (e.code === "Quote" && !e.altKey) {
    e.preventDefault();
    $<HTMLButtonElement>("nudge-up").dispatchEvent(
      new MouseEvent("click", { shiftKey: e.shiftKey }),
    );
    howTo.notifyKeyDown(e.code, "' → Phase Nudge Later");
    return;
  }
  if (e.code === "KeyL" && !e.altKey && !e.repeat) {
    e.preventDefault();
    $<HTMLButtonElement>("resync").click();
    howTo.notifyKeyDown(e.code, "L → Re-sync Bar Phase");
    return;
  }

  // =========================================================================
  // DEVICE A: PIONEER DJS-1000 DECK HOTKEYS
  // =========================================================================
  if (isDjsFocused()) {
    if (e.repeat) return;

    // Option + 1..8 -> Direct Scene S1..S8 jump
    if (e.altKey && vIdx >= 0 && vIdx < 8) {
      e.preventDefault();
      const sName = djs.selectScene(vIdx);
      howTo.notifyKeyDown(e.code, `⌥+${vIdx + 1} → DJS ${sName}`);
      return;
    }
    if (e.altKey) return;

    // Left-hand 4x4 Performance Pad Matrix: 1..4 / Q..R / A..F / Z..V -> Pads 1..16
    const padIdx = DJS_PAD_CODES.indexOf(e.code as (typeof DJS_PAD_CODES)[number]);
    if (padIdx >= 0) {
      e.preventDefault();
      if (!powerDjs) {
        powerDjs = true;
        commit();
      }
      const desc = djs.triggerPadFromKey(padIdx, e.shiftKey, e.timeStamp);
      howTo.notifyKeyDown(e.code, desc);
      return;
    }

    switch (e.code) {
      case "Digit5":
        e.preventDefault();
        djs.setPadMode("track");
        howTo.notifyKeyDown(e.code, "5 → DJS Mode: TRACK PLAY");
        return;
      case "Digit6":
        e.preventDefault();
        djs.setPadMode("mute");
        howTo.notifyKeyDown(e.code, "6 → DJS Mode: MUTE / SOLO");
        return;
      case "Digit7":
        e.preventDefault();
        djs.setPadMode("scale");
        howTo.notifyKeyDown(e.code, "7 → DJS Mode: 16-PAD PITCH");
        return;
      case "Digit8":
        e.preventDefault();
        djs.setPadMode("slice");
        howTo.notifyKeyDown(e.code, "8 → DJS Mode: HOT ROLL");
        return;
      case "Digit9": {
        e.preventDefault();
        const sName = djs.stepScene(-1);
        howTo.notifyKeyDown(e.code, `9 → Prev Scene (${sName})`);
        return;
      }
      case "Digit0": {
        e.preventDefault();
        const sName = djs.stepScene(1);
        howTo.notifyKeyDown(e.code, `0 → Next Scene (${sName})`);
        return;
      }
      case "KeyG":
        e.preventDefault();
        if (!powerDjs) {
          powerDjs = true;
          commit();
        }
        howTo.notifyKeyDown(e.code, djs.holdStripDivFromKey(4, e.timeStamp));
        return;
      case "KeyH":
        e.preventDefault();
        if (!powerDjs) {
          powerDjs = true;
          commit();
        }
        howTo.notifyKeyDown(e.code, djs.holdStripDivFromKey(8, e.timeStamp));
        return;
      case "KeyJ":
        e.preventDefault();
        if (!powerDjs) {
          powerDjs = true;
          commit();
        }
        howTo.notifyKeyDown(e.code, djs.holdStripDivFromKey(16, e.timeStamp));
        return;
      case "KeyK":
        e.preventDefault();
        if (!powerDjs) {
          powerDjs = true;
          commit();
        }
        howTo.notifyKeyDown(e.code, djs.holdStripDivFromKey(32, e.timeStamp));
        return;
      case "KeyT": {
        e.preventDefault();
        const sm = djs.toggleStripMode();
        howTo.notifyKeyDown(e.code, `T → Touch Strip Mode: ${sm.toUpperCase()}`);
        return;
      }
      case "KeyY": {
        e.preventDefault();
        const q = djs.toggleQuantize();
        howTo.notifyKeyDown(e.code, `Y → DJS Quantize ${q ? "ON" : "OFF"}`);
        return;
      }
      case "KeyU": {
        e.preventDefault();
        const rec = djs.toggleLiveRec();
        howTo.notifyKeyDown(e.code, `U → DJS Live Rec ${rec ? "ARMED" : "OFF"}`);
        return;
      }
      case "KeyI": {
        e.preventDefault();
        checkpoint("djs-bar");
        const nextIdx = (BAR_IDS.indexOf(djsEditBank) + 1) % BAR_IDS.length;
        djsEditBank = BAR_IDS[nextIdx]!;
        if (djsSpec.variation !== 2 && djsSpec.variation !== 5) {
          djsSpec.variation = (
            djsEditBank === "a" ? 0 : djsEditBank === "b" ? 1 : djsEditBank === "c" ? 3 : 4
          ) as VariationCode;
        }
        commit();
        howTo.notifyKeyDown(e.code, `I → DJS Bar ${djsEditBank.toUpperCase()}`);
        return;
      }
      case "KeyO": {
        e.preventDefault();
        checkpoint("djs-chain");
        djsSpec.variation = djsSpec.variation === 5 ? 0 : djsSpec.variation === 2 ? 5 : 2;
        if (djsSpec.variation !== 0) ensureSpecBarsPopulated(djsSpec, "d");
        commit();
        const modeTxt =
          djsSpec.variation === 5 ? "A–D (64 Steps)" : djsSpec.variation === 2 ? "A+B (32 Steps)" : "1-Bar Loop";
        howTo.notifyKeyDown(e.code, `O → DJS Chain: ${modeTxt}`);
        return;
      }
      case "KeyP": {
        e.preventDefault();
        const cap = djs.captureScene();
        say(`Captured ${cap} on DJS-1000.`);
        howTo.notifyKeyDown(e.code, `P → Captured ${cap}`);
        return;
      }
      case "KeyB":
        e.preventDefault();
        $<HTMLButtonElement>("djs-beat-sync").click();
        howTo.notifyKeyDown(e.code, "B → DJS Beat Sync");
        return;
      case "KeyN":
        e.preventDefault();
        $<HTMLButtonElement>("djs-cue").click();
        howTo.notifyKeyDown(e.code, "N → DJS Cue (Beat 1.1)");
        return;
      case "KeyM":
        e.preventDefault();
        checkpoint();
        djsSpec.voices[selected].mute = !djsSpec.voices[selected].mute;
        commit();
        howTo.notifyKeyDown(
          e.code,
          `M → DJS ${selected.toUpperCase()} ${djsSpec.voices[selected].mute ? "MUTED" : "ON"}`,
        );
        return;
      case "Comma": {
        e.preventDefault();
        checkpoint();
        const nextSolo = !djsSpec.voices[selected].solo;
        for (const v of VOICES) djsSpec.voices[v.id].solo = false;
        djsSpec.voices[selected].solo = nextSolo;
        commit();
        howTo.notifyKeyDown(e.code, `, → DJS ${selected.toUpperCase()} Solo ${nextSolo ? "ON" : "OFF"}`);
        return;
      }
      case "Period":
        e.preventDefault();
        rmx.setReleaseLever(true);
        howTo.notifyKeyDown(e.code, "Hold . → RMX-1000 Release FX Lever");
        return;
      case "Minus":
        if (!clock.following) {
          e.preventDefault();
          setBpm(e.shiftKey ? spec.bpm - 0.1 : Math.round(spec.bpm) - 1, "bpm");
          howTo.notifyKeyDown(e.code, `- → BPM ${spec.bpm}`);
        }
        return;
      case "Equal":
        if (!clock.following) {
          e.preventDefault();
          setBpm(e.shiftKey ? spec.bpm + 0.1 : Math.round(spec.bpm) + 1, "bpm");
          howTo.notifyKeyDown(e.code, `= → BPM ${spec.bpm}`);
        }
        return;
      case "Backspace":
        e.preventDefault();
        checkpoint();
        ensureSpecBarsPopulated(djsSpec, djsEditBank);
        if (e.shiftKey) {
          for (const v of VOICES) setStepsForBar(djsSpec.voices[v.id], djsEditBank, EMPTY_STEPS);
          howTo.notifyKeyDown(e.code, "Shift+Delete → Clear All DJS Tracks");
        } else {
          setStepsForBar(djsSpec.voices[selected], djsEditBank, EMPTY_STEPS);
          howTo.notifyKeyDown(e.code, `Delete → Clear DJS ${selected.toUpperCase()}`);
        }
        commit();
        return;
    }
    return;
  }

  // =========================================================================
  // DEVICE B: PIONEER RMX-1000 REMIX STATION HOTKEYS
  // =========================================================================
  if (surfaceMode === "rmx") {
    if (e.repeat) return;
    if (e.altKey) return;

    // 1..4 -> X-Pad Slots 1..4, 5..0 -> Hold Touch Roll Ribbon (1/1..1/32), Shift+1..0 -> Direct 10 Voices
    if (vIdx >= 0) {
      e.preventDefault();
      if (!powerRmx) {
        powerRmx = true;
        rmx.setBypassed(false);
        commit();
      }
      if (e.shiftKey) {
        const vInfo = VOICES[vIdx]!;
        rmx.triggerVoicePad(vInfo.id, true, e.timeStamp);
        howTo.notifyKeyDown(e.code, `Shift+${vIdx === 9 ? 0 : vIdx + 1} → RMX Trigger ${vInfo.short}`);
        return;
      }
      if (vIdx < 4) {
        rmx.triggerPadSlot(vIdx, e.timeStamp);
        howTo.notifyKeyDown(e.code, `${vIdx + 1} → RMX X-Pad Slot ${vIdx + 1}`);
      } else {
        const div = RMX_ROLL_DIVS[vIdx - 4] ?? 8;
        rmx.holdRoll(div, e.timeStamp);
        howTo.notifyKeyDown(e.code, `Hold ${vIdx === 9 ? 0 : vIdx + 1} → RMX Roll 1/${div}`);
      }
      return;
    }

    switch (e.code) {
      case "KeyQ":
        e.preventDefault();
        if (e.shiftKey) {
          rmx.setIsoMode("isolator");
          howTo.notifyKeyDown(e.code, "Shift+Q → RMX Isolator Mode: ISOLATOR");
        } else {
          const on = rmx.toggleKill("low");
          howTo.notifyKeyDown(e.code, `Q → RMX KILL LOW ${on ? "ON" : "OFF"}`);
        }
        return;
      case "KeyW":
        e.preventDefault();
        if (e.shiftKey) {
          rmx.setIsoMode("cut_add");
          howTo.notifyKeyDown(e.code, "Shift+W → RMX Isolator Mode: CUT/ADD");
        } else {
          const on = rmx.toggleKill("mid");
          howTo.notifyKeyDown(e.code, `W → RMX KILL MID ${on ? "ON" : "OFF"}`);
        }
        return;
      case "KeyE":
        e.preventDefault();
        if (e.shiftKey) {
          rmx.setIsoMode("trans_roll");
          howTo.notifyKeyDown(e.code, "Shift+E → RMX Isolator Mode: TRANS/ROLL");
        } else {
          const on = rmx.toggleKill("high");
          howTo.notifyKeyDown(e.code, `E → RMX KILL HIGH ${on ? "ON" : "OFF"}`);
        }
        return;
      case "KeyR":
        e.preventDefault();
        if (e.shiftKey) {
          rmx.setIsoMode("gate_drive");
          howTo.notifyKeyDown(e.code, "Shift+R → RMX Isolator Mode: GATE/DRIVE");
        } else {
          rmx.setReleaseLever(true);
          howTo.notifyKeyDown(e.code, "Hold R → RMX Release FX Lever Engaged");
        }
        return;
      case "KeyT": {
        e.preventDefault();
        const rm = rmx.cycleReleaseMode();
        howTo.notifyKeyDown(e.code, `T → Release FX Mode: ${rm.replace("_", " ").toUpperCase()}`);
        return;
      }
      case "KeyY": {
        e.preventDefault();
        const res = rmx.selectSceneFx("bpf_echo");
        howTo.notifyKeyDown(e.code, `Y → Scene FX: ${res.label} (${res.pct}%)`);
        return;
      }
      case "KeyU": {
        e.preventDefault();
        const res = rmx.selectSceneFx("echo");
        howTo.notifyKeyDown(e.code, `U → Scene FX: ${res.label} (${res.pct}%)`);
        return;
      }
      case "KeyI": {
        e.preventDefault();
        const res = rmx.selectSceneFx("noise");
        howTo.notifyKeyDown(e.code, `I → Scene FX: ${res.label} (${res.pct}%)`);
        return;
      }
      case "KeyO": {
        e.preventDefault();
        const res = rmx.selectSceneFx("spiral_up");
        howTo.notifyKeyDown(e.code, `O → Scene FX: ${res.label} (${res.pct}%)`);
        return;
      }
      case "KeyP": {
        e.preventDefault();
        const res = rmx.selectSceneFx("reverb_up");
        howTo.notifyKeyDown(e.code, `P → Scene FX: ${res.label} (${res.pct}%)`);
        return;
      }
      case "KeyA": {
        e.preventDefault();
        const res = rmx.selectSceneFx("hpf_echo");
        howTo.notifyKeyDown(e.code, `A → Scene FX: ${res.label} (${res.pct}%)`);
        return;
      }
      case "KeyS": {
        e.preventDefault();
        const res = rmx.selectSceneFx("lpf_echo");
        howTo.notifyKeyDown(e.code, `S → Scene FX: ${res.label} (${res.pct}%)`);
        return;
      }
      case "KeyD": {
        e.preventDefault();
        const res = rmx.selectSceneFx("crush_echo");
        howTo.notifyKeyDown(e.code, `D → Scene FX: ${res.label} (${res.pct}%)`);
        return;
      }
      case "KeyF": {
        e.preventDefault();
        const res = rmx.selectSceneFx("spiral_down");
        howTo.notifyKeyDown(e.code, `F → Scene FX: ${res.label} (${res.pct}%)`);
        return;
      }
      case "KeyG": {
        e.preventDefault();
        const res = rmx.selectSceneFx("reverb_down");
        howTo.notifyKeyDown(e.code, `G → Scene FX: ${res.label} (${res.pct}%)`);
        return;
      }
      case "KeyH": {
        e.preventDefault();
        const p = e.shiftKey ? rmx.setSceneAmount(0) : rmx.adjustSceneAmount(-0.1);
        howTo.notifyKeyDown(e.code, `H → Scene FX Level ${p}%`);
        return;
      }
      case "KeyJ": {
        e.preventDefault();
        const p = e.shiftKey ? rmx.setSceneAmount(1) : rmx.adjustSceneAmount(0.1);
        howTo.notifyKeyDown(e.code, `J → Scene FX Level ${p}%`);
        return;
      }
      case "KeyK": {
        e.preventDefault();
        const isB = rmx.toggleBank();
        howTo.notifyKeyDown(e.code, `K → X-Pad ${isB ? "Bank B (LT/RS/OH/CB)" : "Bank A (BD/SD/CP/CH)"}`);
        return;
      }
      case "KeyZ": {
        e.preventDefault();
        const q = rmx.toggleQuantize();
        howTo.notifyKeyDown(e.code, `Z → X-Pad Quantize ${q ? "ON" : "OFF"}`);
        return;
      }
      case "KeyX": {
        e.preventDefault();
        const l = rmx.toggleLatchRoll(e.timeStamp);
        howTo.notifyKeyDown(e.code, `X → Latch Roll ${l ? "ON" : "OFF"}`);
        return;
      }
      case "KeyC": {
        e.preventDefault();
        const od = rmx.toggleOverdub();
        howTo.notifyKeyDown(e.code, `C → X-Pad Overdub ${od ? "ARMED" : "OFF"}`);
        return;
      }
      case "KeyV": {
        e.preventDefault();
        const m = rmx.togglePadMute();
        howTo.notifyKeyDown(e.code, `V → X-Pad Voice ${m ? "MUTED" : "UNMUTED"}`);
        return;
      }
      case "KeyB": {
        e.preventDefault();
        if (e.shiftKey) {
          rmx.resetPitch();
          howTo.notifyKeyDown(e.code, "Shift+B → X-Pad Pitch 0 st");
        } else {
          const st = rmx.adjustPitchSemitones(-1);
          howTo.notifyKeyDown(e.code, `B → X-Pad Pitch ${st > 0 ? "+" : ""}${st} st`);
        }
        return;
      }
      case "KeyN": {
        e.preventDefault();
        const st = rmx.adjustPitchSemitones(1);
        howTo.notifyKeyDown(e.code, `N → X-Pad Pitch ${st > 0 ? "+" : ""}${st} st`);
        return;
      }
      case "KeyM": {
        e.preventDefault();
        const im = rmx.cycleIsoMode();
        howTo.notifyKeyDown(e.code, `M → Isolator Mode: ${im.replace("_", "/").toUpperCase()}`);
        return;
      }
      case "Comma":
        e.preventDefault();
        toggleRmxPower();
        howTo.notifyKeyDown(e.code, `, → RMX-1000 ${powerRmx ? "FX ON" : "BYPASSED"}`);
        return;
      case "Period":
        e.preventDefault();
        rmx.reset();
        howTo.notifyKeyDown(e.code, ". → RMX-1000 Reset FX");
        return;
      case "Minus":
        if (!clock.following) {
          e.preventDefault();
          setBpm(e.shiftKey ? spec.bpm - 0.1 : Math.round(spec.bpm) - 1, "bpm");
          howTo.notifyKeyDown(e.code, `- → BPM ${spec.bpm}`);
        }
        return;
      case "Equal":
        if (!clock.following) {
          e.preventDefault();
          setBpm(e.shiftKey ? spec.bpm + 0.1 : Math.round(spec.bpm) + 1, "bpm");
          howTo.notifyKeyDown(e.code, `= → BPM ${spec.bpm}`);
        }
        return;
      case "Backspace":
        e.preventDefault();
        rmx.clearPadVoice();
        howTo.notifyKeyDown(e.code, "Delete → Erase Active X-Pad Voice Steps");
        return;
    }
    return;
  }

  // =========================================================================
  // DEVICE C: TRAKTOR PRO 4+ PATTERN PLAYER HOTKEYS
  // =========================================================================
  if (isTraktorFocused()) {
    if (e.repeat) return;

    if (e.altKey) {
      if (e.code === "KeyB") {
        e.preventDefault();
        const st = traktor.adjustPitch(-1);
        howTo.notifyKeyDown(e.code, `⌥+B → Pattern Player Pitch ${st > 0 ? "+" : ""}${st} st`);
      } else if (e.code === "KeyN") {
        e.preventDefault();
        const st = traktor.adjustPitch(1);
        howTo.notifyKeyDown(e.code, `⌥+N → Pattern Player Pitch ${st > 0 ? "+" : ""}${st} st`);
      }
      return;
    }

    // 1..0, -, = -> Launch 12 Pre-baked Layer Patterns
    const patIdx = TRAKTOR_PAT_CODES.indexOf(e.code as (typeof TRAKTOR_PAT_CODES)[number]);
    if (patIdx >= 0) {
      e.preventDefault();
      if (!powerTraktor) {
        powerTraktor = true;
        commit();
      }
      const pName = traktor.selectPattern(patIdx);
      howTo.notifyKeyDown(e.code, `Pattern ${patIdx + 1} → ${pName}`);
      return;
    }

    // Home Row (A..K) + Bottom Row (Z..,) -> Toggle Steps 1..16 on active stem
    const trkStepIdx = STEP_KEY_CODES.indexOf(e.code as (typeof STEP_KEY_CODES)[number]);
    if (trkStepIdx >= 0) {
      e.preventDefault();
      traktor.toggleStep(trkStepIdx, e.shiftKey);
      howTo.notifyKeyDown(e.code, `Step ${trkStepIdx + 1} toggled on Pattern Player`);
      return;
    }

    switch (e.code) {
      case "KeyQ":
        e.preventDefault();
        if (!powerTraktor) {
          powerTraktor = true;
          commit();
        }
        traktor.engageBuildup("echo_hpf", true);
        howTo.notifyKeyDown(e.code, "Q → Buildup: ECHO + HPF FILTER");
        return;
      case "KeyW":
        e.preventDefault();
        if (!powerTraktor) {
          powerTraktor = true;
          commit();
        }
        traktor.engageBuildup("noise_filter", true);
        howTo.notifyKeyDown(e.code, "W → Buildup: NOISE + FILTER SWEEP");
        return;
      case "KeyE":
        e.preventDefault();
        if (!powerTraktor) {
          powerTraktor = true;
          commit();
        }
        traktor.engageBuildup("spiral_roll", true);
        howTo.notifyKeyDown(e.code, "E → Buildup: SPIRAL + SNARE ROLL");
        return;
      case "KeyT":
        e.preventDefault();
        if (!powerTraktor) {
          powerTraktor = true;
          commit();
        }
        traktor.engageBuildup("sub_reverb", true);
        howTo.notifyKeyDown(e.code, "T → Buildup: SUB KILL + REVERB");
        return;
      case "KeyR":
        e.preventDefault();
        if (traktor.isBuildupActive) {
          traktor.releaseIntoDrop();
          howTo.notifyKeyDown(e.code, "R → RELEASE INTO DROP!");
        } else {
          rmx.setReleaseLever(true);
          howTo.notifyKeyDown(e.code, "Hold R → RMX Release FX Lever");
        }
        return;
      case "KeyY": {
        e.preventDefault();
        const kName = traktor.cycleKit(-1);
        howTo.notifyKeyDown(e.code, `Y → Kit: ${kName}`);
        return;
      }
      case "KeyI": {
        e.preventDefault();
        const kName = traktor.cycleKit(1);
        howTo.notifyKeyDown(e.code, `I → Kit: ${kName}`);
        return;
      }
      case "KeyU": {
        e.preventDefault();
        const d = traktor.toggleDucking();
        howTo.notifyKeyDown(e.code, `U → Ducking ${d ? "ON" : "OFF"}`);
        return;
      }
      case "KeyO": {
        e.preventDefault();
        activeTrkStemIdx = (activeTrkStemIdx + 1) % TRAKTOR_STEM_ORDER.length;
        const st = TRAKTOR_STEM_ORDER[activeTrkStemIdx]!;
        traktor.selectStem(st);
        howTo.notifyKeyDown(e.code, `O → Edit Stem: ${st.toUpperCase()}`);
        return;
      }
      case "KeyP":
        e.preventDefault();
        traktor.resetActivePattern();
        howTo.notifyKeyDown(e.code, "P → Reset Pattern Player Steps");
        return;
      case "Period": {
        e.preventDefault();
        const kc = traktor.toggleKickCut();
        howTo.notifyKeyDown(e.code, `. → Kick Cut ${kc ? "ON (No 4/4 Kick)" : "OFF (Full Kick)"}`);
        return;
      }
      case "Backspace":
        e.preventDefault();
        checkpoint();
        for (const v of VOICES) traktorSpec.voices[v.id].steps = EMPTY_STEPS;
        commit();
        howTo.notifyKeyDown(e.code, "Delete → Clear Pattern Player Steps");
        return;
    }
    return;
  }

  // =========================================================================
  // DEVICE D: TR-REC 64-STEP DRUM SEQUENCER HOTKEYS
  // =========================================================================

  // 1. Number Row 1..0: Select Voice, Shift+1..0 Live Drum Trigger, Option+1..0 Mute
  if (vIdx >= 0 && !e.repeat) {
    const vInfo = VOICES[vIdx]!;
    e.preventDefault();
    if (e.altKey) {
      checkpoint();
      spec.voices[vInfo.id].mute = !spec.voices[vInfo.id].mute;
      commit();
      howTo.notifyKeyDown(e.code, `⌥+${vIdx === 9 ? 0 : vIdx + 1} → Mute ${vInfo.short}`);
      return;
    }
    if (e.shiftKey) {
      selected = vInfo.id;
      void audio.triggerVoice(vInfo.id, 0.95).catch(() => {});
      renderVoicePanel();
      renderGrid();
      renderGrooveAndFxControls();
      renderMixerDrawer();
      howTo.notifyKeyDown(e.code, `Shift+${vIdx === 9 ? 0 : vIdx + 1} → Trigger ${vInfo.short}`);
      return;
    }
    selected = vInfo.id;
    grid.setFocus(vIdx, 0, false);
    renderVoicePanel();
    renderGrid();
    renderGrooveAndFxControls();
    renderMixerDrawer();
    djs.render();
    howTo.notifyKeyDown(e.code, `${vIdx === 9 ? 0 : vIdx + 1} → Select ${vInfo.short} (${vInfo.name})`);
    return;
  }

  // Option (Alt) shortcuts for Groove / Variation & Selected-Voice FX
  if (e.altKey && !e.repeat) {
    switch (e.code) {
      case "KeyG":
        e.preventDefault();
        triggerHumanizeAction();
        howTo.notifyKeyDown(e.code, `⌥+G → Humanize Pattern (${pct(humanizeAmount)})`);
        return;
      case "KeyV":
        e.preventDefault();
        triggerMutateAction();
        howTo.notifyKeyDown(e.code, "⌥+V → Pattern Variation");
        return;
      case "KeyF":
        e.preventDefault();
        triggerAutoFillAction();
        howTo.notifyKeyDown(e.code, "⌥+F → 1-Bar Auto-Fill (Steps 13–16)");
        return;
      case "KeyE":
        e.preventDefault();
        toggleVoiceFx(selected, "echo");
        howTo.notifyKeyDown(
          e.code,
          `⌥+E → ${selected.toUpperCase()} Dub Echo ${voiceFx[selected].echo ? "ON" : "OFF"}`,
        );
        return;
      case "KeyR":
        e.preventDefault();
        toggleVoiceFx(selected, "reverb");
        howTo.notifyKeyDown(
          e.code,
          `⌥+R → ${selected.toUpperCase()} Space Reverb ${voiceFx[selected].reverb ? "ON" : "OFF"}`,
        );
        return;
      case "KeyD":
        e.preventDefault();
        toggleVoiceFx(selected, "filter");
        howTo.notifyKeyDown(
          e.code,
          `⌥+D → ${selected.toUpperCase()} Acid Filter ${voiceFx[selected].filter ? "ON" : "OFF"}`,
        );
        return;
      case "KeyX":
        e.preventDefault();
        checkpoint("vfx-clear");
        clearAllVoiceFx(voiceFx);
        commit();
        howTo.notifyKeyDown(e.code, "⌥+X → All Per-Voice FX Cleared (Dry)");
        return;
    }
    return;
  }

  // 2. Home Row (A..K) + Bottom Row (Z..,) -> Steps 1..16
  const stepIdx = STEP_KEY_CODES.indexOf(e.code as (typeof STEP_KEY_CODES)[number]);
  if (stepIdx >= 0 && !e.repeat) {
    e.preventDefault();
    checkpoint();
    editVoiceSteps(selected, (s) =>
      e.shiftKey || flamMode ? toggleFlam(s, stepIdx) : cycleStep(s, stepIdx),
    );
    const rIdx = Math.max(
      0,
      VOICES.findIndex((item) => item.id === selected),
    );
    grid.setFocus(rIdx, stepIdx, false);
    commit();
    howTo.notifyKeyDown(
      e.code,
      `${e.shiftKey ? "Shift+" : ""}Step ${stepIdx + 1} (${selected.toUpperCase()})`,
    );
    return;
  }

  // 3. Kit Voicing Keys Y U I O P -> 5 Analog Drum Machine Kits
  const kitIdx = KIT_KEY_CODES.indexOf(e.code as (typeof KIT_KEY_CODES)[number]);
  if (kitIdx >= 0 && !e.repeat) {
    const kit = KITS[kitIdx];
    if (kit) {
      e.preventDefault();
      checkpoint();
      spec = applyKitToSpec(spec, kit);
      activeKitId = kit.id;
      commit();
      howTo.notifyKeyDown(e.code, `Kit → ${kit.name}`);
    }
    return;
  }

  // 4. Presets, Group FX (Shift+Q/W/E), Flam, RMX Release FX, Tempo & Clear
  switch (e.code) {
    case "KeyQ":
      if (!e.repeat) {
        e.preventDefault();
        if (e.shiftKey) {
          const on = triggerGroupEcho("snare_clap");
          howTo.notifyKeyDown(e.code, `Shift+Q → Snare+Clap+Rim Echo ${on ? "ON" : "OFF"}`);
        } else {
          const cur = PRESETS.findIndex((p) => p.id === app.dataset.preset);
          applyPresetByIndex(cur <= 0 ? PRESETS.length - 1 : cur - 1);
          howTo.notifyKeyDown(e.code, `Q → Preset: ${app.dataset.preset}`);
        }
      }
      break;
    case "KeyW":
      if (!e.repeat) {
        e.preventDefault();
        if (e.shiftKey) {
          const on = triggerGroupEcho("hats");
          howTo.notifyKeyDown(e.code, `Shift+W → Hi-Hats Echo ${on ? "ON" : "OFF"}`);
        } else {
          const cur = PRESETS.findIndex((p) => p.id === app.dataset.preset);
          applyPresetByIndex(cur < 0 ? 1 : cur + 1);
          howTo.notifyKeyDown(e.code, `W → Preset: ${app.dataset.preset}`);
        }
      }
      break;
    case "KeyE":
      if (!e.repeat) {
        e.preventDefault();
        if (e.shiftKey) {
          const on = triggerGroupEcho("toms");
          howTo.notifyKeyDown(e.code, `Shift+E → Toms+Cowbell Echo ${on ? "ON" : "OFF"}`);
        } else {
          flamMode = !flamMode;
          renderControls();
          howTo.notifyKeyDown(e.code, `E → Flam Edit ${flamMode ? "ON" : "OFF"}`);
        }
      }
      break;
    case "KeyR":
      if (!e.repeat) {
        e.preventDefault();
        rmx.setReleaseLever(true);
        howTo.notifyKeyDown(e.code, "Hold R → RMX-1000 Release FX Engaged");
      }
      break;
    case "KeyT":
      if (!e.repeat) {
        tap(e.timeStamp);
        howTo.notifyKeyDown(e.code, "T → Tap Tempo");
      }
      break;
    case "Minus":
      if (!clock.following) {
        e.preventDefault();
        setBpm(e.shiftKey ? spec.bpm - 0.1 : Math.round(spec.bpm) - 1, "bpm");
        howTo.notifyKeyDown(e.code, `- → BPM ${spec.bpm}`);
      }
      break;
    case "Equal":
      if (!clock.following) {
        e.preventDefault();
        setBpm(e.shiftKey ? spec.bpm + 0.1 : Math.round(spec.bpm) + 1, "bpm");
        howTo.notifyKeyDown(e.code, `= → BPM ${spec.bpm}`);
      }
      break;
    case "Period":
      if (!e.repeat) {
        e.preventDefault();
        checkpoint();
        spec.voices[selected].mute = !spec.voices[selected].mute;
        commit();
        howTo.notifyKeyDown(e.code, `. → Mute ${selected.toUpperCase()}`);
      }
      break;
    case "Backspace":
      if (!e.repeat) {
        e.preventDefault();
        checkpoint();
        ensureBarsPopulated(editBank);
        if (e.shiftKey) {
          for (const v of VOICES) {
            setStepsForBar(spec.voices[v.id], editBank, EMPTY_STEPS);
          }
          howTo.notifyKeyDown(e.code, "Shift+Delete → Clear All Voices");
        } else {
          setStepsForBar(spec.voices[selected], editBank, EMPTY_STEPS);
          howTo.notifyKeyDown(e.code, `Delete → Clear ${selected.toUpperCase()}`);
        }
        commit();
      }
      break;
  }
});
window.addEventListener("pagehide", () => {
  if (urlTimer !== undefined) writeUrl();
});
window.addEventListener("keyup", (e) => {
  if (e.code === "Space" && e.target instanceof HTMLButtonElement) e.preventDefault();
  if (e.code === "KeyR" && !isDjsFocused()) rmx.setReleaseLever(false);
  if (e.code === "Period" && isDjsFocused()) rmx.setReleaseLever(false);
  if (isDjsFocused()) {
    djs.releaseKeyHold();
  }
  if (isTraktorFocused()) {
    const map: Partial<Record<string, BuildupMacroId>> = {
      KeyQ: "echo_hpf",
      KeyW: "noise_filter",
      KeyE: "spiral_roll",
      KeyT: "sub_reverb",
    };
    const macro = map[e.code];
    if (macro) traktor.onBuildupInputUp(macro);
  }
  if (
    ["Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0"].includes(e.code) &&
    surfaceMode === "rmx"
  ) {
    rmx.releaseRoll();
  }
  howTo.notifyKeyUp(e.code);
});

// ---- boot ----

if (!SINGLE) setupPwa($<HTMLButtonElement>("install"));
rmx.setBypassed(!powerRmx);
audio.prepare(); // compile the core now; audio itself waits for Play
commit({ markModified: false });
booting = false;
renderPlayhead();
renderStatus("idle");
