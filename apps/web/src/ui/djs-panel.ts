// Pioneer DJ DJS-1000 Standalone DJ Sampler & Sequencer surface controller
// (CDJ-form-factor booth deck):
//   - 7" Full-Color Display (Rekordbox-style 4-bar / 16-beat phase scope,
//     Pro DJ Link / Link Beat Sync badge, and 8 live Scene slots + Capture)
//   - Left Touch Strip (Note Repeat 1/4..1/32 & spring-return Pitch Bend)
//   - 4x4 (16-Pad) Multicolor RGB Performance Pads (Track Play, Mute/Solo,
//     16-Pad Chromatic Pitch Scale, and Hot Roll modes)
//   - Right CDJ Deck Strip (Beat Sync, Phase Nudge -/+, +/-6% Tempo Slider,
//     Cue & Play/Pause bezel)
//   - Front-Edge 16-Step Multicolor TR Step Sequencer Strip (Bars A/B/C/D,
//     64-Step A-D Chain, and Live Rec overdub)

import type { AudioEngine } from "../engine/audio-engine";
import type { RmxState, RollDivision } from "../engine/rmx-fx";
import { PRESETS } from "../presets";
import {
  cloneSpec,
  normalizeSteps,
  STEP_COUNT,
  stepsForBar,
  type BarId,
  type PatternSpec,
  type VariationCode,
} from "../spec";
import { VOICES, voiceInfo, type VoiceId } from "../voices";

export type DjsPadMode = "track" | "mute" | "scale" | "slice";
export type DjsStripMode = "repeat" | "pitch";

export interface DjsClockReadout {
  following: boolean;
  source: string;
  locked: boolean;
  bpm: number;
  playing: boolean;
}

export interface DjsCallbacks {
  audio: AudioEngine;
  getRmxState(): RmxState;
  getSpec(): PatternSpec;
  getSelectedVoice(): VoiceId;
  onSelectVoice(voice: VoiceId): void;
  getEditBar(): BarId;
  getPlayingBar(): BarId;
  getPlayingStep(): number;
  onSelectBar(bar: BarId): void;
  onSelectVariation(v: VariationCode): void;
  onToggleStep(voice: VoiceId, step: number, accentOnly: boolean): void;
  onOverdubStep(voice: VoiceId, step: number, accent: boolean, tuneOffset: number): void;
  onToggleMute(voice: VoiceId, soloInstead: boolean): void;
  onGroupMute(group: "kick" | "tops" | "toms" | "unmute_all" | "solo_bd" | "solo_perc"): void;
  onTriggerMacro(
    macro: "bd_accent" | "sd_flam" | "cp_dub" | "ride_toggle" | "crash_toggle",
    eventTimeMs: number,
  ): void;
  onTogglePlay(): void;
  onCueReset(): void;
  onBeatSync(): void;
  onNudge(deltaMs: number): void;
  onTempoFader(bpm: number): void;
  getClockReadout(): DjsClockReadout;
  onLoadScene(spec: PatternSpec, sceneName: string): void;
}

interface SceneSlot {
  name: string;
  color: string;
  spec: PatternSpec;
}

const TRACK_COLORS: Readonly<Record<VoiceId, string>> = {
  kick: "#ff2a55",
  snare: "#ff9500",
  low_tom: "#3b82f6",
  mid_tom: "#6366f1",
  high_tom: "#a855f7",
  rim: "#ec4899",
  clap: "#f43f5e",
  closed_hat: "#00d4ff",
  open_hat: "#06b6d4",
  cowbell: "#22c55e",
};

const HOT_ROLL_CELLS: readonly { div: RollDivision; semi: number; label: string }[] = [
  { div: 4, semi: 0, label: "1/4 · 0st" },
  { div: 8, semi: 0, label: "1/8 · 0st" },
  { div: 16, semi: 0, label: "1/16 · 0st" },
  { div: 32, semi: 0, label: "1/32 · 0st" },
  { div: 4, semi: 3, label: "1/4 · +3st" },
  { div: 8, semi: 3, label: "1/8 · +3st" },
  { div: 16, semi: 3, label: "1/16 · +3st" },
  { div: 32, semi: 3, label: "1/32 · +3st" },
  { div: 4, semi: 7, label: "1/4 · +7st" },
  { div: 8, semi: 7, label: "1/8 · +7st" },
  { div: 16, semi: 7, label: "1/16 · +7st" },
  { div: 32, semi: 7, label: "1/32 · +7st" },
  { div: 4, semi: -5, label: "1/4 · −5st" },
  { div: 8, semi: -5, label: "1/8 · −5st" },
  { div: 16, semi: -5, label: "1/16 · −5st" },
  { div: 32, semi: -5, label: "1/32 · −5st" },
];

function buildDefaultScenes(): SceneSlot[] {
  const palette = [
    "#00c8ff",
    "#ff2a55",
    "#ff9500",
    "#22c55e",
    "#a855f7",
    "#eab308",
    "#ec4899",
    "#38bdf8",
  ];
  return Array.from({ length: 8 }, (_, idx) => {
    const preset = PRESETS[idx % PRESETS.length]!;
    const s = preset.spec();
    // Pre-populate a 4-bar 64-step club progression with subtle Bar D turnaround on Scene slots
    s.variation = 5;
    const sn = s.voices.snare;
    const ch = s.voices.closed_hat;
    s.voices.snare.steps_b = normalizeSteps(sn.steps);
    s.voices.snare.steps_c = normalizeSteps(sn.steps);
    const dChars = [...normalizeSteps(sn.steps)];
    dChars[13] = "x";
    dChars[14] = "f";
    dChars[15] = "X";
    s.voices.snare.steps_d = dChars.join("");
    s.voices.closed_hat.steps_b = normalizeSteps(ch.steps);
    s.voices.closed_hat.steps_c = normalizeSteps(ch.steps);
    s.voices.closed_hat.steps_d = normalizeSteps(ch.steps);
    return {
      name: `S${idx + 1} · ${preset.name.slice(0, 12)}`,
      color: palette[idx]!,
      spec: s,
    };
  });
}

export class DjsPanel {
  private padMode: DjsPadMode = "track";
  private stripMode: DjsStripMode = "repeat";
  private liveRec = false;
  private quantize = true;
  private activeScene = 0;
  private scenes: SceneSlot[] = buildDefaultScenes();
  private baseBpm = 124;
  private pitchPct = 0;
  private activeRollPad = -1;
  private stripActive = false;
  private padButtons: HTMLButtonElement[] = [];
  private stepButtons: HTMLButtonElement[] = [];

  constructor(
    private readonly root: HTMLElement,
    private readonly cb: DjsCallbacks,
  ) {
    this.baseBpm = this.cb.getSpec().bpm;
    this.buildPadsAndSteps();
    this.bind();
    this.render();
  }

  private buildPadsAndSteps(): void {
    const padGrid = this.root.querySelector<HTMLElement>("#djs-pad-grid")!;
    const padNodes: HTMLButtonElement[] = [];
    for (let i = 0; i < 16; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "djs-pad";
      b.dataset.djsPad = String(i);
      b.innerHTML =
        `<span class="djs-pad-idx">${i + 1}</span>` +
        `<span class="djs-pad-main"></span>` +
        `<span class="djs-pad-sub"></span>`;
      padNodes.push(b);
    }
    padGrid.replaceChildren(...padNodes);
    this.padButtons = padNodes;

    const stepRow = this.root.querySelector<HTMLElement>("#djs-step-strip")!;
    const stepNodes: HTMLButtonElement[] = [];
    for (let i = 0; i < STEP_COUNT; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `djs-step q${i >> 2}${i % 4 === 0 ? " beat" : ""}`;
      b.dataset.djsStep = String(i + 1);
      b.setAttribute("aria-label", `DJS step ${i + 1}`);
      b.innerHTML = `<span class="djs-step-num">${i + 1}</span><i class="djs-step-led"></i>`;
      stepNodes.push(b);
    }
    stepRow.replaceChildren(...stepNodes);
    this.stepButtons = stepNodes;
  }

  private bind(): void {
    const $ = <T extends HTMLElement>(id: string) => this.root.querySelector<T>(`#${id}`)!;

    // 8 Scene Launcher buttons + Capture Scene
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-djs-scene]")) {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.djsScene);
        const slot = this.scenes[idx];
        if (!slot) return;
        this.activeScene = idx;
        const copy = cloneSpec(slot.spec);
        this.baseBpm = copy.bpm;
        this.pitchPct = 0;
        this.cb.onLoadScene(copy, slot.name);
        this.render();
      });
    }

    $("djs-capture-scene").addEventListener("click", () => {
      const cur = cloneSpec(this.cb.getSpec());
      const slot = this.scenes[this.activeScene];
      if (slot) {
        slot.spec = cur;
        slot.name = `S${this.activeScene + 1} · Custom ${Math.round(cur.bpm)}`;
      }
      this.render();
    });

    // Pad Modes (Track Play / Mute / 16-Pad Pitch / Hot Roll)
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-djs-pad-mode]")) {
      btn.addEventListener("click", () => {
        this.stopActiveRoll();
        this.padMode = btn.dataset.djsPadMode as DjsPadMode;
        this.render();
      });
    }

    // Quantize & Live Rec toggles
    $("djs-quantize").addEventListener("click", () => {
      this.quantize = !this.quantize;
      this.render();
    });
    $("djs-live-rec").addEventListener("click", () => {
      this.liveRec = !this.liveRec;
      this.render();
    });

    // 16 Performance Pads
    this.padButtons.forEach((btn, idx) => {
      btn.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        this.onPadDown(idx, e.shiftKey, e.timeStamp);
      });
      btn.addEventListener("click", (e) => {
        if (e.detail === 0) {
          this.onPadDown(idx, e.shiftKey, e.timeStamp);
          this.stopActiveRoll();
        }
      });
    });

    const endRoll = () => {
      if (this.activeRollPad >= 0 || this.stripActive) {
        this.stopActiveRoll();
        this.render();
      }
    };
    window.addEventListener("pointerup", endRoll);
    window.addEventListener("pointercancel", endRoll);

    // Left Touch Strip (Note Repeat / Pitch Bend)
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-djs-strip-mode]")) {
      btn.addEventListener("click", () => {
        this.stopActiveRoll();
        this.stripMode = btn.dataset.djsStripMode as DjsStripMode;
        this.render();
      });
    }

    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-djs-strip-div]")) {
      btn.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const val = Number(btn.dataset.djsStripDiv);
        this.stripActive = true;
        if (this.stripMode === "repeat") {
          this.engageRoll(this.cb.getSelectedVoice(), (val || 8) as RollDivision, 0, e.timeStamp);
        } else {
          // Pitch bend momentary trigger (-7, -3, +4, +7 semitones)
          const semi = val === 4 ? -7 : val === 8 ? -3 : val === 16 ? 4 : 7;
          void this.fireVoiceHit(this.cb.getSelectedVoice(), semi / 12, true, e.timeStamp);
        }
        this.render();
      });
    }

    // Right CDJ Deck Strip: Beat Sync, Nudge, Tempo Fader, Cue, Play/Pause
    $("djs-beat-sync").addEventListener("click", () => {
      this.cb.onBeatSync();
      this.render();
    });
    $("djs-nudge-down").addEventListener("click", (e) => {
      this.cb.onNudge(e.shiftKey ? -0.5 : -2);
    });
    $("djs-nudge-up").addEventListener("click", (e) => {
      this.cb.onNudge(e.shiftKey ? 0.5 : 2);
    });

    const tempoSlider = $<HTMLInputElement>("djs-tempo-slider");
    tempoSlider.addEventListener("input", () => {
      if (this.cb.getClockReadout().following) return;
      this.pitchPct = Number(tempoSlider.value);
      const nextBpm = Math.round(this.baseBpm * (1 + this.pitchPct / 100) * 100) / 100;
      this.cb.onTempoFader(nextBpm);
      this.render();
    });
    $("djs-tempo-reset").addEventListener("click", () => {
      if (this.cb.getClockReadout().following) return;
      this.pitchPct = 0;
      tempoSlider.value = "0";
      this.cb.onTempoFader(this.baseBpm);
      this.render();
    });

    $("djs-cue").addEventListener("click", () => this.cb.onCueReset());
    $("djs-play").addEventListener("click", () => this.cb.onTogglePlay());

    // Bottom 16-Step Sequencer Strip + Bar Page buttons
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-djs-bar]")) {
      btn.addEventListener("click", () => {
        const target = btn.dataset.djsBar!;
        if (target === "abcd") {
          this.cb.onSelectVariation(5);
        } else if (target === "ab") {
          this.cb.onSelectVariation(2);
        } else {
          this.cb.onSelectBar(target as BarId);
        }
      });
    }

    this.stepButtons.forEach((btn, i) => {
      btn.addEventListener("click", (e) => {
        this.cb.onToggleStep(this.cb.getSelectedVoice(), i, e.altKey);
      });
      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        this.cb.onToggleStep(this.cb.getSelectedVoice(), i, true);
      });
    });
  }

  private engageRoll(voice: VoiceId, div: RollDivision, pitchShift: number, eventTimeMs: number): void {
    const rmx = { ...this.cb.getRmxState() };
    rmx.xpadVoice = voice;
    rmx.xpadRollDiv = div;
    rmx.xpadPitch = pitchShift;
    rmx.xpadRolling = true;
    rmx.xpadQuantize = this.quantize;
    rmx.xpadOverdub = this.liveRec;
    void this.cb.audio.ensureStarted().catch(() => {});
    this.cb.audio.setRmxState(rmx, eventTimeMs);
  }

  private stopActiveRoll(): void {
    if (this.activeRollPad < 0 && !this.stripActive) return;
    this.activeRollPad = -1;
    this.stripActive = false;
    const rmx = { ...this.cb.getRmxState() };
    rmx.xpadRolling = false;
    this.cb.audio.setRmxState(rmx);
  }

  private async fireVoiceHit(
    voice: VoiceId,
    pitchShift: number,
    accent: boolean,
    eventTimeMs: number,
  ): Promise<void> {
    const prev = this.cb.getRmxState();
    if ((prev.xpadQuantize !== false) !== this.quantize) {
      this.cb.audio.setRmxState({ ...prev, xpadQuantize: this.quantize }, eventTimeMs);
    }
    const stepIdx = await this.cb.audio.triggerRmxPad(
      voice,
      pitchShift,
      accent ? 0.98 : 0.86,
      eventTimeMs,
    );
    if ((prev.xpadQuantize !== false) !== this.quantize) {
      this.cb.audio.setRmxState(prev);
    }
    if (this.liveRec) {
      const liveStep = this.cb.getPlayingStep();
      const target = stepIdx >= 0 ? stepIdx : liveStep >= 0 ? liveStep : 0;
      this.cb.onOverdubStep(voice, target, accent, pitchShift);
    }
  }

  private onPadDown(idx: number, shiftKey: boolean, eventTimeMs: number): void {
    if (this.padMode === "track") {
      if (idx < 10) {
        const v = VOICES[idx]!;
        this.cb.onSelectVoice(v.id);
        void this.fireVoiceHit(v.id, 0, shiftKey, eventTimeMs);
      } else if (idx === 10) {
        this.cb.onTriggerMacro("bd_accent", eventTimeMs);
      } else if (idx === 11) {
        this.cb.onTriggerMacro("sd_flam", eventTimeMs);
      } else if (idx === 12) {
        this.cb.onTriggerMacro("cp_dub", eventTimeMs);
      } else if (idx === 13) {
        this.activeRollPad = idx;
        this.engageRoll("closed_hat", 16, 0, eventTimeMs);
      } else if (idx === 14) {
        this.cb.onTriggerMacro("ride_toggle", eventTimeMs);
      } else if (idx === 15) {
        this.cb.onTriggerMacro("crash_toggle", eventTimeMs);
      }
      this.render();
      return;
    }

    if (this.padMode === "mute") {
      if (idx < 10) {
        const v = VOICES[idx]!;
        this.cb.onToggleMute(v.id, shiftKey);
      } else if (idx === 10) {
        this.cb.onGroupMute("solo_bd");
      } else if (idx === 11) {
        this.cb.onGroupMute("solo_perc");
      } else if (idx === 12) {
        this.cb.onGroupMute("kick");
      } else if (idx === 13) {
        this.cb.onGroupMute("tops");
      } else if (idx === 14) {
        this.cb.onGroupMute("toms");
      } else if (idx === 15) {
        this.cb.onGroupMute("unmute_all");
      }
      return;
    }

    if (this.padMode === "scale") {
      const semi = idx - 7; // -7 .. +8 semitones, Pad 8 (idx 7) = 0 st Root
      const voice = this.cb.getSelectedVoice();
      void this.fireVoiceHit(voice, semi / 12, semi === 0 || shiftKey, eventTimeMs);
      return;
    }

    // Hot Roll / Slice mode
    const cell = HOT_ROLL_CELLS[idx];
    if (!cell) return;
    this.activeRollPad = idx;
    this.engageRoll(this.cb.getSelectedVoice(), cell.div, cell.semi / 12, eventTimeMs);
    this.render();
  }

  syncBaseBpm(bpm: number): void {
    if (Math.abs(this.pitchPct) < 0.01) {
      this.baseBpm = bpm;
    }
  }

  render(): void {
    const $ = <T extends HTMLElement>(id: string) => this.root.querySelector<T>(`#${id}`)!;
    const spec = this.cb.getSpec();
    const sel = this.cb.getSelectedVoice();
    const selInfo = voiceInfo(sel);
    const editBar = this.cb.getEditBar();
    const playingBar = this.cb.getPlayingBar();
    const playingStep = this.cb.getPlayingStep();
    const clk = this.cb.getClockReadout();

    // 7" Touch Screen Header & Beat Phase Scope
    const barIndex = { a: 1, b: 2, c: 3, d: 4 }[playingStep >= 0 ? playingBar : editBar];
    const beatInBar = playingStep >= 0 ? Math.floor(playingStep / 4) + 1 : 1;
    const totalBars = spec.variation === 5 ? 4 : spec.variation === 2 ? 2 : 1;
    $("djs-screen-track").textContent = `TRK ${VOICES.findIndex((v) => v.id === sel) + 1} · ${selInfo.short} ${selInfo.name.toUpperCase()}`;
    $("djs-screen-bpm").textContent = `${clk.bpm.toFixed(1)}`;
    $("djs-screen-bar").textContent = `BAR ${barIndex}.${beatInBar} / ${totalBars}B`;
    const syncBadge = $("djs-sync-badge");
    syncBadge.textContent = clk.following
      ? `${clk.source.toUpperCase()} ${clk.locked ? "SYNC" : "WAIT"}`
      : "INT MASTER";
    syncBadge.dataset.locked = String(clk.following && clk.locked);

    // 16-segment phase bar on 7" screen
    for (const seg of this.root.querySelectorAll<HTMLElement>("[data-djs-phase]")) {
      const idx = Number(seg.dataset.djsPhase);
      seg.classList.toggle("on", idx === playingStep);
      seg.classList.toggle("passed", playingStep >= 0 && idx < playingStep);
    }

    // Scene buttons
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-djs-scene]")) {
      const idx = Number(btn.dataset.djsScene);
      const slot = this.scenes[idx];
      if (!slot) continue;
      btn.textContent = slot.name;
      btn.style.setProperty("--scene-c", slot.color);
      btn.setAttribute("aria-pressed", String(idx === this.activeScene));
    }

    // Mode & Utility toggles
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-djs-pad-mode]")) {
      btn.setAttribute("aria-pressed", String(btn.dataset.djsPadMode === this.padMode));
    }
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-djs-strip-mode]")) {
      btn.setAttribute("aria-pressed", String(btn.dataset.djsStripMode === this.stripMode));
    }
    $("djs-quantize").setAttribute("aria-pressed", String(this.quantize));
    $("djs-live-rec").setAttribute("aria-pressed", String(this.liveRec));
    $("djs-beat-sync").setAttribute("aria-pressed", String(clk.following));
    $("djs-play").setAttribute("aria-pressed", String(clk.playing));
    $("djs-play").textContent = clk.playing ? "PLAYING" : "PLAY / PAUSE";

    const tempoSlider = $<HTMLInputElement>("djs-tempo-slider");
    tempoSlider.disabled = clk.following;
    if (!clk.following && Math.abs(this.pitchPct) < 0.01) {
      this.baseBpm = spec.bpm;
    }
    const pctStr = `${this.pitchPct >= 0 ? "+" : ""}${this.pitchPct.toFixed(1)}%`;
    $("djs-tempo-out").textContent = clk.following ? "LOCK" : pctStr;

    // 16 RGB Performance Pads
    const anySolo = VOICES.some((v) => spec.voices[v.id].solo);
    this.padButtons.forEach((btn, idx) => {
      const main = btn.querySelector<HTMLElement>(".djs-pad-main")!;
      const sub = btn.querySelector<HTMLElement>(".djs-pad-sub")!;
      btn.classList.toggle("rolling", idx === this.activeRollPad);

      if (this.padMode === "track") {
        if (idx < 10) {
          const v = VOICES[idx]!;
          const sv = spec.voices[v.id];
          const muted = sv.mute || (anySolo && !sv.solo);
          btn.style.setProperty("--pad-c", TRACK_COLORS[v.id]);
          main.textContent = v.short;
          sub.textContent = muted ? "MUTED" : v.name;
          btn.dataset.padState = v.id === sel ? "selected" : muted ? "muted" : "ready";
        } else {
          const macros = [
            ["BD+", "SUB ACCENT", "#ff2a55"],
            ["SD×2", "FLAM HIT", "#ff9500"],
            ["CP EC", "DUB THROW", "#f43f5e"],
            ["CH 16", "HOLD ROLL", "#00d4ff"],
            ["RIDE", (spec.cymbal_mode & 1) !== 0 ? "9O9 ON" : "HAT MODE", "#06b6d4"],
            ["CRASH", (spec.cymbal_mode & 2) !== 0 ? "9O9 ON" : "BELL MODE", "#22c55e"],
          ] as const;
          const m = macros[idx - 10]!;
          btn.style.setProperty("--pad-c", m[2]);
          main.textContent = m[0];
          sub.textContent = m[1];
          btn.dataset.padState = "macro";
        }
      } else if (this.padMode === "mute") {
        if (idx < 10) {
          const v = VOICES[idx]!;
          const sv = spec.voices[v.id];
          const muted = sv.mute || (anySolo && !sv.solo);
          btn.style.setProperty("--pad-c", sv.solo ? "#ffcc00" : muted ? "#ef4444" : "#22c55e");
          main.textContent = v.short;
          sub.textContent = sv.solo ? "SOLO" : sv.mute ? "MUTED" : "ON AIR";
          btn.dataset.padState = muted ? "muted" : "selected";
        } else {
          const grp = [
            ["SOLO BD", "KICK ONLY", "#ffcc00"],
            ["SOLO PRC", "SN/CP/TOM", "#ffcc00"],
            ["KILL BD", "KICK MUTE", "#ef4444"],
            ["KILL TOP", "HATS/CLAP", "#ef4444"],
            ["KILL TOM", "TOMS/BELL", "#ef4444"],
            ["ALL ON", "UNMUTE ALL", "#22c55e"],
          ] as const;
          const g = grp[idx - 10]!;
          btn.style.setProperty("--pad-c", g[2]);
          main.textContent = g[0];
          sub.textContent = g[1];
          btn.dataset.padState = "macro";
        }
      } else if (this.padMode === "scale") {
        const semi = idx - 7;
        const isRoot = semi === 0;
        btn.style.setProperty("--pad-c", isRoot ? "#ffffff" : TRACK_COLORS[sel]);
        main.textContent = `${semi > 0 ? "+" : ""}${semi} st`;
        sub.textContent = isRoot ? `${selInfo.short} ROOT` : selInfo.short;
        btn.dataset.padState = isRoot ? "selected" : "ready";
      } else {
        const cell = HOT_ROLL_CELLS[idx]!;
        btn.style.setProperty("--pad-c", "#00c8ff");
        main.textContent = `1/${cell.div}`;
        sub.textContent = `${cell.semi >= 0 ? "+" : ""}${cell.semi} st`;
        btn.dataset.padState = idx === this.activeRollPad ? "selected" : "ready";
      }
    });

    // Bottom 16-Step Sequencer Strip for Selected Track + Active Bar
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>("[data-djs-bar]")) {
      const b = btn.dataset.djsBar!;
      const pressed =
        b === "abcd"
          ? spec.variation === 5
          : b === "ab"
            ? spec.variation === 2
            : editBar === b && (spec.variation !== 2 || b === "a" || b === "b");
      btn.setAttribute("aria-pressed", String(pressed));
      btn.classList.toggle(
        "chain-active",
        playingStep >= 0 && (spec.variation === 2 || spec.variation === 5) && b === playingBar,
      );
    }

    $("djs-strip-track-label").textContent = `${selInfo.short} · BAR ${editBar.toUpperCase()}`;
    const stepsStr = stepsForBar(spec.voices[sel], editBar);
    const barMatchesPlayhead =
      playingStep >= 0 &&
      (spec.variation === 0 ||
        spec.variation === 1 ||
        spec.variation === 3 ||
        spec.variation === 4 ||
        playingBar === editBar);

    this.stepButtons.forEach((btn, i) => {
      const ch = stepsStr[i] ?? "-";
      btn.dataset.state =
        ch === "-" ? "off" : ch === "x" ? "on" : ch === "X" ? "accent" : ch === "f" ? "flam" : "accent-flam";
      btn.style.setProperty("--step-c", TRACK_COLORS[sel]);
      btn.classList.toggle("past-last", i >= spec.last_step);
      btn.classList.toggle("playing", barMatchesPlayhead && i === playingStep);
    });
  }
}
