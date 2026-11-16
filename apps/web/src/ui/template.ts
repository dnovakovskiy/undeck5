// Static markup of the instrument. Dynamic parts (grid rows, voice
// controls, device lists) are filled in by the modules that own them.

import { GROOVE_TEMPLATES } from "../groove";
import { KITS, PRESETS, type PresetCategory } from "../presets";
import { howToModalMarkup } from "./how-to";

export interface TemplateOptions {
  single: boolean;
  bridge: boolean;
  midi: boolean;
  /** window.isSecureContext: Web MIDI (and the AudioWorklet) need it. */
  secure: boolean;
}

const knob = (id: string, label: string, min = 0, max = 1, step = 0.01) => `
  <label class="knob" for="${id}">
    <span class="knob-label">${label} <output id="${id}-out" for="${id}"></output></span>
    <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" />
  </label>`;

export function template(o: TemplateOptions): string {
  const categories: PresetCategory[] = ["Core Booth", "Nu-Disco", "House", "Techno"];
  const presetOptions = categories
    .map((cat) => {
      const items = PRESETS.filter((p) => p.category === cat)
        .map((p) => `<option value="${p.id}" title="${p.blurb}">${p.name}</option>`)
        .join("");
      return `<optgroup label="${cat}">${items}</optgroup>`;
    })
    .join("");
  const kitOptions = KITS.map(
    (k) => `<option value="${k.id}" title="${k.blurb}">${k.name}</option>`,
  ).join("");
  const grooveOptions = GROOVE_TEMPLATES.map(
    (g) => `<option value="${g.id}" title="${g.blurb}">${g.name}</option>`,
  ).join("");
  const lastStepOptions = Array.from({ length: 16 }, (_, idx) => {
    const n = 16 - idx;
    return `<option value="${n}">${n} stp</option>`;
  }).join("");
  const unavailable = o.single
    ? "Bridge and MIDI clock need the full app; they are switched off in this embedded copy."
    : !o.bridge && !o.midi
      ? "Bridge and MIDI clock are not available in this browser."
      : !o.midi
        ? o.secure
          ? "MIDI clock needs a browser with Web MIDI (Chrome, Edge)."
          : "MIDI clock needs a secure page: open the app over https or from localhost."
        : "";
  const phaseSegments = Array.from(
    { length: 16 },
    (_, idx) => `<i data-djs-phase="${idx}" class="${idx % 4 === 0 ? "beat" : ""}"></i>`,
  ).join("");
  const sceneButtons = Array.from(
    { length: 8 },
    (_, idx) =>
      `<button type="button" class="djs-scene-btn" data-djs-scene="${idx}" aria-pressed="${idx === 0}">S${idx + 1}</button>`,
  ).join("");
  return `
  <a class="skip" href="#grid">Skip to the pattern</a>
  <header class="top">
    <h1 class="logo">player<span>5</span></h1>
    <div class="mode-tabs" role="group" aria-label="Surface mode">
      <button id="mode-seq" type="button" class="mode-tab" aria-pressed="true" title="Classic TR-style 16/64-step drum machine">Step Sequencer</button>
      <button id="mode-djs" type="button" class="mode-tab" aria-pressed="false" title="Pioneer DJ DJS-1000 CDJ-format standalone DJ sampler &amp; 64-step sequencer">DJS-1000 Deck</button>
      <button id="mode-rmx" type="button" class="mode-tab" aria-pressed="false" title="Pioneer RMX-1000 4-section remix station">RMX-1000 Station</button>
      <button id="mode-booth" type="button" class="mode-tab" aria-pressed="false" title="MacBook Air 13-inch split performance view: Sequencer/DJS + RMX-1000 side by side (Shift + ~)">Booth Split</button>
    </div>
    <select id="theme-select" class="theme-select" aria-label="Visual color scheme" title="Switch hardware visual &amp; color scheme">
      <option value="default">8O8 Booth</option>
      <option value="tr-classic">8O8 Classic</option>
      <option value="tr-silver">9O9 Silver</option>
      <option value="tr-neon">TR-8S Neon</option>
      <option value="pioneer">Pioneer CDJ</option>
      <option value="maschine">NI Maschine</option>
    </select>
    <button id="how-to-btn" type="button" class="howto-btn" aria-keyshortcuts="?" title="Open 3Blue1Brown-style video explainer &amp; MacBook Air keyboard guide (?)">How to · ?</button>
    <div class="top-status">
      <span id="engine-mode" class="engine-mode" title="Audio engine runtime"></span>
      <span id="status" class="status" role="status" aria-live="polite">audio off</span>
    </div>
    <button id="install" type="button" class="install" hidden>Install</button>
  </header>

  <section class="panel transport" aria-label="Transport">
    <button id="play" class="play" type="button" aria-pressed="false" aria-keyshortcuts="Space">Play</button>
    <div class="bpm" role="group" aria-labelledby="bpm-label">
      <span class="label" id="bpm-label">BPM</span>
      <div class="bpm-row">
        <button type="button" class="sq" data-bpm="-1" aria-label="Tempo down" title="Tempo down 1 BPM (Shift: 0.1)">−</button>
        <input id="bpm" type="number" inputmode="decimal" min="20" max="400" step="0.01" aria-labelledby="bpm-label" />
        <button type="button" class="sq" data-bpm="1" aria-label="Tempo up" title="Tempo up 1 BPM (Shift: 0.1)">+</button>
        <button type="button" id="tap" class="tap" aria-keyshortcuts="T" title="Tap tempo (T)">Tap</button>
      </div>
    </div>
    <div class="feel">
      ${knob("shuffle", "Shuffle")}
      ${knob("accent", "Accent")}
      ${knob("flam", "Flam")}
    </div>
    <div class="tools">
      <div class="machine-switches" role="group" aria-label="Machine audio switches">
        <span class="mach-group-label" aria-hidden="true">ON AIR</span>
        <button id="power-tr" type="button" class="mach-btn mach-tr" aria-pressed="true" title="Toggle TR Drum Machine sequencer audio ON or OFF">
          <i class="mach-led" aria-hidden="true"></i><span>TR Drums</span>
        </button>
        <button id="power-djs" type="button" class="mach-btn mach-djs" aria-pressed="false" title="Toggle Pioneer DJS-1000 standalone sequencer audio ON or OFF">
          <i class="mach-led" aria-hidden="true"></i><span>DJS-1000</span>
        </button>
        <button id="power-rmx" type="button" class="mach-btn mach-rmx" aria-pressed="true" title="Toggle Pioneer RMX-1000 FX station ON or Bypass">
          <i class="mach-led" aria-hidden="true"></i><span>RMX-1000</span>
        </button>
      </div>
      <button id="flam-mode" type="button" class="toggle" aria-pressed="false" title="While on, tapping a step toggles its flam">Flam edit</button>
      <select id="preset" aria-label="Load a preset pattern">
        <option value="">Presets…</option>${presetOptions}
      </select>
      <select id="kit" aria-label="Load a drum kit voicing" title="Switch analog drum machine voicing without changing the step pattern">
        <option value="">Drum kit…</option>${kitOptions}
      </select>
      <button id="undo" type="button" aria-keyshortcuts="Control+Z Meta+Z" title="Undo (Ctrl/Cmd+Z)">Undo</button>
      <button id="clear" type="button" title="Clear every step on active machine (undo restores)">Clear</button>
      <button id="share" type="button" title="${o.single ? "Copy the pattern code" : "Copy a link to this pattern"}">Share</button>
      <div class="session-actions" role="group" aria-label="Session save and factory reset">
        <button id="save-btn" type="button" class="save-btn" title="Save current patterns &amp; machine ON/OFF switches so they reload next session">Save</button>
        <button id="reset-btn" type="button" class="reset-btn" title="Reset all machines, FX &amp; saved startup pattern back to clean factory default">Reset</button>
      </div>
    </div>
  </section>

  <div class="booth-deck" id="booth-deck">
  <section class="panel rmx-panel" id="rmx-panel" aria-labelledby="rmx-title" hidden>
    <div class="panel-head rmx-head">
      <div class="rmx-brand">
        <h2 id="rmx-title">RMX-1000 · Remix Station</h2>
        <output id="rmx-readout" class="rmx-readout" aria-live="polite">BPF ECHO 0% · X-PAD SNARE 1/8</output>
      </div>
      <div class="rmx-head-actions">
        <button id="panel-power-rmx" type="button" class="panel-power-btn mach-rmx" aria-pressed="true" title="Toggle RMX-1000 FX station ON or Bypass"><i class="mach-led" aria-hidden="true"></i><span id="panel-power-rmx-label">FX ON</span></button>
        <button id="rmx-ext-in" type="button" class="toggle small"${o.single ? " hidden" : ""} aria-pressed="false" title="Route external stereo audio input (loopback / mixer return) through the RMX-1000 FX engine">EXT IN</button>
        <button id="rmx-reset" type="button" class="small" title="Reset all RMX-1000 FX parameters">Reset FX</button>
      </div>
    </div>

    <div class="rmx-grid">
      <div class="rmx-box rmx-iso" role="group" aria-labelledby="rmx-iso-heading">
        <div class="rmx-box-head">
          <h3 id="rmx-iso-heading">ISOLATOR FX</h3>
          <span class="hint">3-band EQ &amp; rhythmic gate</span>
        </div>
        <div class="rmx-modes" role="group" aria-label="Isolator FX mode">
          <button type="button" data-iso-mode="isolator" aria-pressed="true">ISOLATOR</button>
          <button type="button" data-iso-mode="cut_add" aria-pressed="false">CUT/ADD</button>
          <button type="button" data-iso-mode="trans_roll" aria-pressed="false">TRANS/ROLL</button>
          <button type="button" data-iso-mode="gate_drive" aria-pressed="false">GATE/DRIVE</button>
        </div>
        <div class="rmx-iso-bands">
          <div class="rmx-band">
            <label class="knob" for="rmx-iso-low">
              <span class="knob-label">LOW <output id="rmx-iso-low-out" for="rmx-iso-low">0 dB</output></span>
              <input id="rmx-iso-low" type="range" min="-48" max="6" step="1" value="0" />
            </label>
            <button id="rmx-kill-low" type="button" class="toggle small" aria-pressed="false">KILL LOW</button>
          </div>
          <div class="rmx-band">
            <label class="knob" for="rmx-iso-mid">
              <span class="knob-label">MID <output id="rmx-iso-mid-out" for="rmx-iso-mid">0 dB</output></span>
              <input id="rmx-iso-mid" type="range" min="-48" max="6" step="1" value="0" />
            </label>
            <button id="rmx-kill-mid" type="button" class="toggle small" aria-pressed="false">KILL MID</button>
          </div>
          <div class="rmx-band">
            <label class="knob" for="rmx-iso-high">
              <span class="knob-label">HIGH <output id="rmx-iso-high-out" for="rmx-iso-high">0 dB</output></span>
              <input id="rmx-iso-high" type="range" min="-48" max="6" step="1" value="0" />
            </label>
            <button id="rmx-kill-high" type="button" class="toggle small" aria-pressed="false">KILL HIGH</button>
          </div>
        </div>
      </div>

      <div class="rmx-box rmx-xpad" role="group" aria-labelledby="rmx-xpad-heading">
        <div class="rmx-box-head">
          <h3 id="rmx-xpad-heading">X-PAD FX</h3>
          <div class="rmx-xpad-head-btns">
            <button id="rmx-quantize" type="button" class="toggle small" aria-pressed="true" title="Snap X-Pad hits &amp; Touch Roll Ribbon to the Step Sequencer beat grid">QUANTIZE</button>
            <button id="rmx-bank" type="button" class="toggle small" aria-pressed="false">Bank A (BD/SD/CP/CH)</button>
          </div>
        </div>
        <div class="rmx-pads" role="group" aria-label="X-Pad drum voices">
          <button type="button" class="rmx-pad-btn" data-xpad-slot="0" aria-pressed="false">BD · KICK</button>
          <button type="button" class="rmx-pad-btn" data-xpad-slot="1" aria-pressed="true">SD · SNARE</button>
          <button type="button" class="rmx-pad-btn" data-xpad-slot="2" aria-pressed="false">CP · CLAP</button>
          <button type="button" class="rmx-pad-btn" data-xpad-slot="3" aria-pressed="false">CH · HI-HAT</button>
        </div>
        <div class="rmx-strip-wrap">
          <span class="label">TOUCH ROLL RIBBON (HOLD OR SLIDE)</span>
          <div id="rmx-xpad-strip" class="rmx-strip" role="group" aria-label="X-Pad beat roll division">
            <button type="button" data-roll-div="1" aria-pressed="false">1/1</button>
            <button type="button" data-roll-div="2" aria-pressed="false">1/2</button>
            <button type="button" data-roll-div="4" aria-pressed="false">1/4</button>
            <button type="button" data-roll-div="8" aria-pressed="true">1/8</button>
            <button type="button" data-roll-div="16" aria-pressed="false">1/16</button>
            <button type="button" data-roll-div="32" aria-pressed="false">1/32</button>
          </div>
        </div>
        <div class="rmx-xpad-controls">
          <label class="knob" for="rmx-pitch">
            <span class="knob-label">PITCH <output id="rmx-pitch-out" for="rmx-pitch">0 st</output></span>
            <input id="rmx-pitch" type="range" min="-1" max="1" step="0.05" value="0" />
          </label>
          <div class="rmx-xpad-actions">
            <button id="rmx-roll-latch" type="button" class="toggle small" aria-pressed="false" title="Hold roll continuously">LATCH ROLL</button>
            <button id="rmx-overdub" type="button" class="toggle small" aria-pressed="false" title="Record X-Pad hits into the 16-step pattern">OVERDUB</button>
            <button id="rmx-voice-mute" type="button" class="toggle small" aria-pressed="false" title="Silence selected X-Pad voice in pattern">PAD MUTE</button>
            <button id="rmx-voice-clear" type="button" class="small" title="Erase selected X-Pad voice steps">ERASE PAD</button>
          </div>
        </div>
      </div>

      <div class="rmx-box rmx-scene" role="group" aria-labelledby="rmx-scene-heading">
        <div class="rmx-box-head">
          <h3 id="rmx-scene-heading">SCENE FX</h3>
          <span class="hint">Build Up &amp; Break Down</span>
        </div>
        <div class="rmx-scene-banks">
          <div class="rmx-scene-col">
            <span class="label rmx-build-label">BUILD UP</span>
            <button type="button" class="rmx-fx-btn build" data-scene-fx="bpf_echo" aria-pressed="true">BPF ECHO</button>
            <button type="button" class="rmx-fx-btn build" data-scene-fx="echo" aria-pressed="false">ECHO</button>
            <button type="button" class="rmx-fx-btn build" data-scene-fx="noise" aria-pressed="false">NOISE</button>
            <button type="button" class="rmx-fx-btn build" data-scene-fx="spiral_up" aria-pressed="false">SPIRAL UP</button>
            <button type="button" class="rmx-fx-btn build" data-scene-fx="reverb_up" aria-pressed="false">REVERB UP</button>
          </div>
          <div class="rmx-scene-col">
            <span class="label rmx-break-label">BREAK DOWN</span>
            <button type="button" class="rmx-fx-btn break" data-scene-fx="hpf_echo" aria-pressed="false">HPF ECHO</button>
            <button type="button" class="rmx-fx-btn break" data-scene-fx="lpf_echo" aria-pressed="false">LPF ECHO</button>
            <button type="button" class="rmx-fx-btn break" data-scene-fx="crush_echo" aria-pressed="false">CRUSH ECHO</button>
            <button type="button" class="rmx-fx-btn break" data-scene-fx="spiral_down" aria-pressed="false">SPIRAL DOWN</button>
            <button type="button" class="rmx-fx-btn break" data-scene-fx="reverb_down" aria-pressed="false">REVERB DOWN</button>
          </div>
        </div>
        <div class="rmx-scene-knobs">
          <label class="knob" for="rmx-scene-amount">
            <span class="knob-label">SCENE LEVEL / TIME <output id="rmx-scene-amount-out" for="rmx-scene-amount">0%</output></span>
            <input id="rmx-scene-amount" type="range" min="0" max="1" step="0.01" value="0" />
          </label>
          <label class="knob" for="rmx-scene-sub">
            <span class="knob-label">SUB PARAM (RESO / FB) <output id="rmx-scene-sub-out" for="rmx-scene-sub">50%</output></span>
            <input id="rmx-scene-sub" type="range" min="0" max="1" step="0.01" value="0.5" />
          </label>
          <label class="knob" for="rmx-scene-sub2">
            <span class="knob-label">SUB 2 (TONE / MOD) <output id="rmx-scene-sub2-out" for="rmx-scene-sub2">50%</output></span>
            <input id="rmx-scene-sub2" type="range" min="0" max="1" step="0.01" value="0.5" />
          </label>
        </div>
      </div>
    </div>

    <div class="rmx-release" role="group" aria-labelledby="rmx-release-heading">
      <div class="rmx-release-modes">
        <span class="label" id="rmx-release-heading">RELEASE FX</span>
        <button type="button" data-release-mode="vinyl_brake" aria-pressed="true">VINYL BRAKE</button>
        <button type="button" data-release-mode="echo" aria-pressed="false">ECHO</button>
        <button type="button" data-release-mode="back_spin" aria-pressed="false">BACK SPIN</button>
      </div>
      <button id="rmx-release-lever" type="button" class="rmx-lever" aria-pressed="false" title="Hold to engage Release FX and clear Scene FX on release">
        PULL RELEASE LEVER (HOLD)
      </button>
    </div>
  </section>

  <div class="booth-seq-col">
  <section class="panel djs-panel" id="djs-panel" aria-labelledby="djs-title" hidden>
    <div class="panel-head djs-head">
      <div class="djs-brand">
        <h2 id="djs-title">DJS-1000 · Pioneer DJ Standalone Sequencer</h2>
        <span id="djs-sync-badge" class="djs-sync-badge" data-locked="false">INT MASTER</span>
      </div>
      <div class="djs-head-actions">
        <button id="panel-power-djs" type="button" class="panel-power-btn mach-djs" aria-pressed="false" title="Toggle Pioneer DJS-1000 sequencer audio ON or OFF"><i class="mach-led" aria-hidden="true"></i><span id="panel-power-djs-label">OFF</span></button>
        <button id="booth-swap-tr" type="button" class="small booth-only-btn" title="Switch Booth Split left deck to TR-REC 10x16 Step Grid">TR Grid ⇄</button>
        <button id="djs-quantize" type="button" class="toggle small" aria-pressed="true" title="Snap DJS-1000 pads &amp; rolls to the beat grid">QUANTIZE</button>
        <button id="djs-live-rec" type="button" class="toggle small djs-rec-btn" aria-pressed="false" title="Overdub live pad hits into the active bar">LIVE REC</button>
      </div>
    </div>

    <div class="djs-screen" role="region" aria-label="DJS-1000 7-inch touch display">
      <div class="djs-screen-top">
        <span id="djs-screen-track" class="djs-screen-track">TRK 1 · BD KICK</span>
        <div class="djs-phase-scope" aria-hidden="true">${phaseSegments}</div>
        <div class="djs-screen-meta">
          <span id="djs-screen-bar" class="djs-screen-bar">BAR 1.1 / 1B</span>
          <strong id="djs-screen-bpm" class="djs-screen-bpm">124.0</strong>
        </div>
      </div>
      <div class="djs-scenes-row" role="group" aria-label="DJS-1000 Scene matrix">
        <span class="label">SCENES</span>
        <div class="djs-scenes">${sceneButtons}</div>
        <button id="djs-capture-scene" type="button" class="small" title="Snapshot current 64-step pattern into active Scene slot">Capture</button>
      </div>
    </div>

    <div class="djs-body">
      <div class="djs-strip-col" role="group" aria-label="DJS-1000 Touch Strip">
        <div class="djs-strip-modes">
          <button type="button" class="small" data-djs-strip-mode="repeat" aria-pressed="true" title="Touch Strip triggers quantized Note Repeat">REPEAT</button>
          <button type="button" class="small" data-djs-strip-mode="pitch" aria-pressed="false" title="Touch Strip triggers Pitch Bend intervals">PITCH</button>
        </div>
        <div class="djs-touch-strip">
          <button type="button" data-djs-strip-div="32">1/32</button>
          <button type="button" data-djs-strip-div="16">1/16</button>
          <button type="button" data-djs-strip-div="8">1/8</button>
          <button type="button" data-djs-strip-div="4">1/4</button>
        </div>
      </div>

      <div class="djs-center-col">
        <div class="djs-pad-modes" role="group" aria-label="DJS-1000 Performance Pad mode">
          <button type="button" class="small" data-djs-pad-mode="track" aria-pressed="true">TRACK PLAY</button>
          <button type="button" class="small" data-djs-pad-mode="mute" aria-pressed="false">MUTE / SOLO</button>
          <button type="button" class="small" data-djs-pad-mode="scale" aria-pressed="false">16-PAD PITCH</button>
          <button type="button" class="small" data-djs-pad-mode="slice" aria-pressed="false">HOT ROLL</button>
        </div>
        <div id="djs-pad-grid" class="djs-pad-grid" role="group" aria-label="16 multicolor RGB performance pads"></div>
      </div>

      <div class="djs-deck-col" role="group" aria-label="CDJ Tempo &amp; Pro DJ Link controls">
        <button id="djs-beat-sync" type="button" class="toggle small djs-sync-btn" aria-pressed="false" title="Lock to Pro DJ Link Bridge / Ableton Link or snap beat phase">BEAT SYNC</button>
        <div class="djs-nudge-row">
          <button id="djs-nudge-down" type="button" class="small" title="Phase nudge earlier (−2 ms, Shift: −0.5 ms)">NUDGE −</button>
          <button id="djs-nudge-up" type="button" class="small" title="Phase nudge later (+2 ms, Shift: +0.5 ms)">NUDGE +</button>
        </div>
        <label class="djs-tempo-wrap" for="djs-tempo-slider">
          <span class="label">TEMPO ±6% <output id="djs-tempo-out" for="djs-tempo-slider">+0.0%</output></span>
          <input id="djs-tempo-slider" type="range" min="-6" max="6" step="0.1" value="0" />
        </label>
        <button id="djs-tempo-reset" type="button" class="small" title="Reset CDJ tempo slider to 0.0%">RESET 0%</button>
        <div class="djs-cdj-bezel">
          <button id="djs-cue" type="button" class="djs-cue-btn" title="Cue / Reset bar phase to Beat 1.1">CUE</button>
          <button id="djs-play" type="button" class="djs-play-btn" aria-pressed="false" title="Start / Stop sequencer transport">PLAY / PAUSE</button>
        </div>
      </div>
    </div>

    <div class="djs-seq-footer" role="group" aria-label="DJS-1000 16-step multicolor sequencer strip">
      <div class="djs-seq-bar-row">
        <span id="djs-strip-track-label" class="djs-strip-track-label">BD · BAR A</span>
        <div class="djs-bar-tabs" role="group" aria-label="DJS-1000 64-step bar pages">
          <button type="button" class="toggle small" data-djs-bar="a" aria-pressed="true">A</button>
          <button type="button" class="toggle small" data-djs-bar="b" aria-pressed="false">B</button>
          <button type="button" class="toggle small" data-djs-bar="c" aria-pressed="false">C</button>
          <button type="button" class="toggle small" data-djs-bar="d" aria-pressed="false">D</button>
          <button type="button" class="toggle small" data-djs-bar="ab" aria-pressed="false" title="32-step 2-bar chain">A+B</button>
          <button type="button" class="toggle small" data-djs-bar="abcd" aria-pressed="false" title="64-step 4-bar chain">A–D (64)</button>
        </div>
      </div>
      <div id="djs-step-strip" class="djs-step-strip"></div>
    </div>
  </section>

  <section class="panel grid-panel" id="grid-panel" aria-labelledby="grid-title">
    <div class="panel-head">
      <div class="grid-brand">
        <h2 id="grid-title">TR-REC Pattern · 64-Step Sequencer</h2>
        <span class="tr-color-key" aria-hidden="true">
          <i class="c1">1–4</i><i class="c2">5–8</i><i class="c3">9–12</i><i class="c4">13–16</i>
        </span>
      </div>
      <div class="grid-head-right">
        <button id="panel-power-tr" type="button" class="panel-power-btn mach-tr" aria-pressed="true" title="Toggle TR Drum Machine sequencer audio ON or OFF"><i class="mach-led" aria-hidden="true"></i><span id="panel-power-tr-label">ON AIR</span></button>
        <button id="booth-swap-djs" type="button" class="small booth-only-btn" title="Switch Booth Split left deck to Pioneer DJS-1000 Sampler/Sequencer">DJS-1000 ⇄</button>
        <span class="hint" id="grid-hint"></span>
      </div>
    </div>

    <div class="tr-var-bar" role="region" aria-label="TR-8S 64-Step Pattern Variations, Last Step &amp; Mixer">
      <div class="tr-bank-group" role="group" aria-label="Pattern A/B/C/D 64-step variation">
        <span class="label">BAR</span>
        <button id="var-bank-a" type="button" class="toggle small" aria-pressed="true" title="Play &amp; edit 16-step Bar A (Steps 1–16)">A</button>
        <button id="var-bank-b" type="button" class="toggle small" aria-pressed="false" title="Play &amp; edit 16-step Bar B (Steps 17–32)">B</button>
        <button id="var-bank-c" type="button" class="toggle small" aria-pressed="false" title="Play &amp; edit 16-step Bar C (Steps 33–48)">C</button>
        <button id="var-bank-d" type="button" class="toggle small" aria-pressed="false" title="Play &amp; edit 16-step Bar D (Steps 49–64)">D</button>
        <button id="var-bank-ab" type="button" class="toggle small" aria-pressed="false" title="Chain A + B into a 32-step 2-bar phrase">A+B</button>
        <button id="var-bank-abcd" type="button" class="toggle small" aria-pressed="false" title="Chain A → B → C → D into a 64-step 4-bar phrase">A–D</button>
        <button id="var-copy-ab" type="button" class="small" title="Duplicate active bar into the next bar (A→B→C→D)">Copy→</button>
        <button id="var-follow" type="button" class="toggle small" aria-pressed="false" title="Auto-follow playing bar page during 32/64-step chains">Follow</button>
      </div>
      <div class="tr-loop-group">
        <label class="inline-field" for="last-step">
          <span class="label">LAST</span>
          <select id="last-step" aria-label="Last step" title="Polymetric loop length (1 to 16 steps)">${lastStepOptions}</select>
        </label>
        <button id="fill-hold" type="button" class="toggle small fill-btn" aria-pressed="false" title="Hold for momentary real-time TR-8S turnaround fill">FILL [Hold]</button>
        <select id="auto-fill-bars" aria-label="Auto-fill interval" title="Automatically trigger fill bar every N bars">
          <option value="0">Auto-Fill: Off</option>
          <option value="2">Every 2 Bars</option>
          <option value="4">Every 4 Bars</option>
          <option value="8">Every 8 Bars</option>
        </select>
        <button id="mixer-toggle" type="button" class="toggle small" aria-pressed="false" title="Toggle 10-channel TR-8S fader mixer">10-Ch Mixer</button>
      </div>
    </div>

    <div class="tr-perf-strip" role="region" aria-label="Groove, Variation &amp; Per-Sample FX">
      <div class="tr-perf-col groove-col">
        <div class="tr-perf-head">
          <span class="label">GROOVE / HUMANIZE / VARIATION</span>
          <span class="hint">Maschine feel &amp; TR-8S auto-fill</span>
        </div>
        <div class="tr-perf-row">
          <select id="groove-template" aria-label="Groove pocket template" title="Apply a Groove swing + humanize feel template">
            <option value="">Groove pocket…</option>${grooveOptions}
          </select>
          ${knob("humanize", "Humanize", 0, 1, 0.01)}
        </div>
        <div class="tr-perf-actions">
          <button id="var-humanize" type="button" class="small" title="Humanize accents, flams &amp; ghost notes (⌥+G)">Humanize [⌥G]</button>
          <button id="var-mutate" type="button" class="small" title="Generate musical pattern variation on active voices (⌥+V)">Variation [⌥V]</button>
          <button id="var-fill" type="button" class="small" title="Inject a 1-bar TR-8S drum fill into steps 13–16 (⌥+F)">Auto-Fill [⌥F]</button>
        </div>
      </div>

      <div class="tr-perf-col vfx-col">
        <div class="tr-perf-head">
          <span class="label">PER-SAMPLE &amp; GROUP FX SENDS</span>
          <output id="vfx-readout" class="vfx-readout" aria-live="polite">DRY · NO VOICE FX</output>
        </div>
        <div class="tr-perf-row vfx-row">
          <div class="vfx-chips" role="group" aria-label="Selected voice and group FX toggles">
            <button id="vfx-echo" type="button" class="toggle small fx-chip fx-echo" aria-pressed="false" title="Toggle tempo-synced Dub Echo on selected voice (⌥+E or Ctrl+1..0)">Echo [⌥E]</button>
            <button id="vfx-reverb" type="button" class="toggle small fx-chip fx-reverb" aria-pressed="false" title="Toggle Space Reverb on selected voice (⌥+R)">Reverb [⌥R]</button>
            <button id="vfx-filter" type="button" class="toggle small fx-chip fx-filter" aria-pressed="false" title="Toggle Acid Resonant Filter + Drive on selected voice (⌥+D)">Filter [⌥D]</button>
            <button id="grp-fx-snare" type="button" class="toggle small grp-chip" aria-pressed="false" title="Drop Dub Echo on Snare + Clap + Rimshot group (Shift+Q)">Snare+Clap Echo [⇧Q]</button>
            <button id="grp-fx-hats" type="button" class="toggle small grp-chip" aria-pressed="false" title="Drop Dub Echo on Closed + Open Hi-Hats group (Shift+W)">Hi-Hats Echo [⇧W]</button>
            <button id="grp-fx-toms" type="button" class="toggle small grp-chip" aria-pressed="false" title="Drop Dub Echo on Low/Mid/High Toms + Cowbell group (Shift+E)">Toms+Perc Echo [⇧E]</button>
            <button id="vfx-clear" type="button" class="small" title="Clear all per-sample and group FX sends (⌥+X)">Dry [⌥X]</button>
          </div>
          ${knob("vfx-level", "FX Send", 0, 1, 0.01)}
        </div>
      </div>
    </div>

    <div id="mixer-drawer" class="mixer-drawer" hidden role="region" aria-label="10-channel level &amp; solo mixer"></div>
    <div id="grid" class="grid" tabindex="-1"></div>
  </section>

  <div class="split">
    <section class="panel voice-panel" id="voice-panel" aria-labelledby="voice-title">
      <div class="panel-head">
        <h2 id="voice-title">Voice</h2>
        <span class="hint">select a row label</span>
      </div>
      <div id="voice-controls" class="knobs"></div>
      <div id="voice-extra" class="voice-extra"></div>
    </section>

    <section class="panel master" aria-labelledby="master-title">
      <div class="panel-head"><h2 id="master-title">Master</h2></div>
      ${knob("gain", "Output", -24, 12, 0.5)}
      <label class="switch" for="limiter">
        <input id="limiter" type="checkbox" role="switch" />
        <span>Safety limiter</span>
      </label>
      <div class="meter-wrap">
        <div id="meter" class="meter" role="meter" aria-label="Output peak level" aria-valuemin="-48" aria-valuemax="0" aria-valuenow="-48" aria-valuetext="silent" data-peak-db="-inf">
          <div class="meter-fill" id="meter-fill"></div>
          <div class="meter-mark" title="−6 dBFS: default peak level"></div>
        </div>
        <div class="meter-scale" aria-hidden="true"><span>−48</span><span>−24</span><span class="m6">−6</span><span>0</span></div>
        <output id="meter-out" class="meter-out">−∞ dBFS</output>
      </div>
    </section>
  </div>
  </div>
  </div>

  <section class="panel clock" id="clock" aria-labelledby="clock-title" data-source="internal" data-lock="off">
    <div class="panel-head">
      <h2 id="clock-title">Clock</h2>
      <div class="seg" role="radiogroup" aria-label="Clock source">
        <label><input type="radio" name="clock-source" value="internal" checked /><span>Internal</span></label>
        <label><input type="radio" name="clock-source" value="tap" /><span>Tap</span></label>
        <label${o.bridge ? "" : " hidden"}><input type="radio" name="clock-source" value="link"${o.bridge ? "" : " disabled"} /><span>Ableton Link</span></label>
        <label${o.bridge ? "" : " hidden"}><input type="radio" name="clock-source" value="bridge"${o.bridge ? "" : " disabled"} /><span>Bridge</span></label>
        <label${o.midi ? "" : " hidden"}><input type="radio" name="clock-source" value="midi"${o.midi ? "" : " disabled"} /><span>MIDI</span></label>
      </div>
    </div>
    ${unavailable ? `<p class="hint unavailable" id="clock-unavailable">${unavailable}</p>` : ""}
    <div class="readout">
      <div class="cell"><span class="label">Tempo</span><output id="clock-tempo" class="big">—</output></div>
      <div class="cell"><span class="label">Lock</span><output id="clock-lock" class="big">—</output></div>
      <div class="cell"><span class="label">Drift</span><output id="clock-drift" class="big">—</output></div>
      <div class="cell"><span class="label">Bar</span>
        <span class="beats" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <output id="clock-beat" class="beat-num" aria-label="Beat in bar">–</output>
      </div>
    </div>
    <p class="source-status"><span id="source-status" aria-live="polite"></span><span id="source-detail" class="source-detail"></span></p>

    <div class="source-panel" data-for="tap">
      <button id="tap-pad" type="button" class="tap-pad" aria-keyshortcuts="T">Tap the beat</button>
    </div>
    <div class="source-panel" data-for="link">
      <div class="row-fields">
        <label class="field grow" for="link-url"><span class="label">Ableton Link Bridge URL (LAN UDP 20808 + Browser Mesh)</span>
          <input id="link-url" type="text" spellcheck="false" autocomplete="off" inputmode="url" /></label>
        <button id="link-connect" type="button">Join Link</button>
        <output id="link-peers" class="link-peers-badge" aria-live="polite">0 peers</output>
      </div>
      <div class="row-fields link-session-bar">
        <label class="switch compact-switch" for="link-start-stop">
          <input id="link-start-stop" type="checkbox" role="switch" />
          <span>Start/Stop Sync</span>
        </label>
        <button id="link-bpm-down" type="button" class="small" title="Nudge Ableton Link session tempo down 1 BPM (Shift: 0.1)">Link −1</button>
        <button id="link-bpm-up" type="button" class="small" title="Nudge Ableton Link session tempo up 1 BPM (Shift: 0.1)">Link +1</button>
        <button id="link-push-bpm" type="button" class="small" title="Broadcast pattern BPM to all Ableton Link peers">Push Pattern BPM</button>
      </div>
      <p class="hint">Syncs tempo, 4-beat bar phase &amp; Start/Stop transport with Ableton Live, Traktor, or Serato over Wi-Fi/LAN via player5-bridge, plus automatic browser-tab Link mesh.</p>
    </div>
    <div class="source-panel" data-for="bridge">
      <div class="row-fields">
        <label class="field grow" for="bridge-url"><span class="label">Bridge URL</span>
          <input id="bridge-url" type="text" spellcheck="false" autocomplete="off" inputmode="url" /></label>
        <button id="bridge-connect" type="button">Connect</button>
      </div>
      <div class="row-fields">
        <label class="field" for="bridge-follow"><span class="label">Follow</span>
          <select id="bridge-follow"><option value="master">Tempo master</option></select></label>
      </div>
      <ul id="bridge-devices" class="devices" aria-label="Devices on the network"></ul>
    </div>
    <div class="source-panel" data-for="midi">
      <label class="field" for="midi-input"><span class="label">MIDI input</span>
        <select id="midi-input"><option value="">—</option></select></label>
    </div>

    <div class="clock-controls">
      <div class="field" role="group" aria-labelledby="nudge-label">
        <span class="label" id="nudge-label">Phase nudge</span>
        <div class="inline">
          <button type="button" class="sq" id="nudge-down" aria-label="Nudge earlier" title="1 ms earlier (Shift: 10 ms)">−</button>
          <output id="nudge-out" class="mono-out">0 ms</output>
          <button type="button" class="sq" id="nudge-up" aria-label="Nudge later" title="1 ms later (Shift: 10 ms)">+</button>
          <button type="button" id="nudge-reset" class="small" title="Reset nudge">0</button>
        </div>
      </div>
      <label class="field" for="latency"><span class="label">Latency offset (ms)</span>
        <input id="latency" type="number" step="1" min="-250" max="250" inputmode="numeric" /></label>
      <label class="switch compact-switch" for="quant-launch" title="When synced externally, arm Play to start cleanly on the next 4-beat bar downbeat">
        <input id="quant-launch" type="checkbox" role="switch" />
        <span>1-Bar Launch</span>
      </label>
      <button id="sync-click" type="button" class="small" title="Fire a calibration rim-click through the output to dial in Latency offset by ear">Sync Click</button>
      <label class="field" id="audio-sink-wrap" for="audio-sink" hidden><span class="label">Audio output</span>
        <select id="audio-sink"><option value="">System Default</option></select></label>
      <button id="resync" type="button" title="Snap to the source (internal: restart the bar)">Re-sync</button>
    </div>
  </section>

  <section class="panel share" id="share-panel" aria-labelledby="share-title">
    <div class="panel-head"><h2 id="share-title">Share &amp; import</h2></div>
    <div class="share-row"${o.single ? " hidden" : ""}>
      <label for="share-link">Link</label>
      <input id="share-link" type="text" readonly spellcheck="false" />
      <button id="copy-link" type="button">Copy</button>
    </div>
    <div class="share-row">
      <label for="share-code">Pattern code</label>
      <input id="share-code" type="text" readonly spellcheck="false" />
      <button id="copy-code" type="button">Copy</button>
    </div>
    <div class="share-row">
      <label for="import">Import</label>
      <input id="import" type="text" spellcheck="false" autocomplete="off" placeholder="paste a pattern code or link" />
      <button id="import-btn" type="button">Load</button>
    </div>
    <p id="share-msg" class="hint" role="status" aria-live="polite"></p>
  </section>

  ${howToModalMarkup()}

  <footer class="foot">
    <span>Space play · 1–0 voices · Ctrl+1–0 echo · ⇧Q/W/E group echo · ⌥G/V/F groove/fill · A–K / Z–, steps · Y–P kits · ? how to</span>
    <span>TR-inspired drum machine for Ableton Link &amp; the Pioneer DJ booth</span>
  </footer>`;
}
