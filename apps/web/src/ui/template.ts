// Static markup of the instrument. Dynamic parts (grid rows, voice
// controls, device lists) are filled in by the modules that own them.

import { GROOVE_TEMPLATES } from "../groove";
import { KITS, PRESETS, type PresetCategory } from "../presets";
import { howToModalMarkup } from "./how-to";
import { TRAKTOR_KITS, TRAKTOR_PATTERNS } from "./traktor-panel";

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
  const categories: PresetCategory[] = ["Core Booth", "Breakbeat", "Nu-Disco", "House", "Techno"];
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
  const trkKitOptions = TRAKTOR_KITS.map(
    (k) => `<option value="${k.id}" title="${k.blurb}">${k.name}</option>`,
  ).join("");
  const trkPatternButtons = TRAKTOR_PATTERNS.map(
    (p, idx) =>
      `<button type="button" class="trk-pat-btn" data-trk-pattern="${idx}" data-trk-genre="${p.genre}" data-key="${p.keyHint}" aria-pressed="${idx === 0}" title="${p.genre} · ${p.name} (Key ${p.keyHint})"><span class="trk-pat-genre">${p.genre}</span><strong class="trk-pat-name">${p.name}</strong></button>`,
  ).join("");
  return `
  <a class="skip" href="#grid">Skip to the pattern</a>
  <header class="top">
    <h1 class="logo">player<span>5</span></h1>
    <div class="mode-tabs" role="group" aria-label="Surface mode">
      <button id="mode-seq" type="button" class="mode-tab" data-key="⌥1" aria-pressed="true" title="Switch to TR-style 16/64-step drum machine (⌥1 or &#96;)">Step Sequencer</button>
      <button id="mode-traktor" type="button" class="mode-tab" data-key="⌥2" aria-pressed="false" title="Switch to Traktor Pro 4+ Pattern Player (⌥2 or &#96;)">Pattern Player</button>
      <button id="mode-djs" type="button" class="mode-tab" data-key="⌥3" aria-pressed="false" title="Switch to Pioneer DJS-1000 standalone sampler &amp; 64-step sequencer (⌥3 or &#96;)">DJS-1000 Deck</button>
      <button id="mode-rmx" type="button" class="mode-tab" data-key="⌥4" aria-pressed="false" title="Switch to Pioneer RMX-1000 remix station (⌥4 or &#96;)">RMX-1000 Station</button>
      <button id="mode-booth" type="button" class="mode-tab" data-key="⌥5" aria-pressed="false" title="MacBook Air 13-inch split performance view (⌥5 or Shift + ~)">Booth Split</button>
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
      <div class="machine-switches" role="group" aria-label="Machine Active or Passive switches">
        <span class="mach-group-label" aria-hidden="true" title="Toggle each machine ACTIVE or PASSIVE (&#92; toggles current · ⌥⇧1–4 toggles any)">MACHINES</span>
        <button id="power-tr" type="button" class="mach-btn mach-tr" aria-pressed="true" title="Toggle TR Drums ACTIVE / PASSIVE (⌥⇧1 · or &#92; when viewing TR)">
          <i class="mach-led" aria-hidden="true"></i><span>TR Drums</span><em id="power-tr-state" class="mach-state">ACTIVE</em>
        </button>
        <button id="power-traktor" type="button" class="mach-btn mach-trk" aria-pressed="false" title="Toggle Pattern Player ACTIVE / PASSIVE (⌥⇧2 · or &#92; when viewing Pattern Player)">
          <i class="mach-led" aria-hidden="true"></i><span>Pattern Player</span><em id="power-trk-state" class="mach-state">PASSIVE</em>
        </button>
        <button id="power-djs" type="button" class="mach-btn mach-djs" aria-pressed="false" title="Toggle Pioneer DJS-1000 ACTIVE / PASSIVE (⌥⇧3 · or &#92; when viewing DJS-1000)">
          <i class="mach-led" aria-hidden="true"></i><span>DJS-1000</span><em id="power-djs-state" class="mach-state">PASSIVE</em>
        </button>
        <button id="power-rmx" type="button" class="mach-btn mach-rmx" aria-pressed="true" title="Toggle Pioneer RMX-1000 FX ACTIVE / PASSIVE (⌥⇧4 · or &#92; when viewing RMX-1000)">
          <i class="mach-led" aria-hidden="true"></i><span>RMX-1000</span><em id="power-rmx-state" class="mach-state">ACTIVE</em>
        </button>
        <output id="kb-target-pill" class="kb-target-pill" data-passive="false" aria-live="polite" title="Shows which ACTIVE machine currently receives your keyboard hotkeys (⌥1–5 switch view · ⌥~ swap Booth focus · &#92; toggle Active/Passive)">⌨ KEYS → TR DRUMS</output>
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
        <button id="panel-power-rmx" type="button" class="panel-power-btn mach-rmx" aria-pressed="true" title="Toggle RMX-1000 ACTIVE / PASSIVE (&#92; or ⌥⇧4)"><i class="mach-led" aria-hidden="true"></i><span id="panel-power-rmx-label">ACTIVE [&#92;]</span></button>
        <button id="booth-focus-rmx" type="button" class="small booth-only-btn kb-focus-btn" aria-pressed="false" title="Route keyboard hotkeys to RMX-1000 in Booth Split (⌥~)">⌨ Keys [⌥~]</button>
        <button id="rmx-ext-in" type="button" class="toggle small"${o.single ? " hidden" : ""} aria-pressed="false" title="Route external stereo audio input (loopback / mixer return) through the RMX-1000 FX engine">EXT IN</button>
        <button id="rmx-reset" type="button" class="small" data-key="." title="Reset all RMX-1000 FX parameters (.)">Reset FX</button>
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
            <button id="rmx-kill-low" type="button" class="toggle small" data-key="Q" title="Kill Low band (Q in RMX · Ctrl+Q anywhere)" aria-pressed="false">KILL LOW</button>
          </div>
          <div class="rmx-band">
            <label class="knob" for="rmx-iso-mid">
              <span class="knob-label">MID <output id="rmx-iso-mid-out" for="rmx-iso-mid">0 dB</output></span>
              <input id="rmx-iso-mid" type="range" min="-48" max="6" step="1" value="0" />
            </label>
            <button id="rmx-kill-mid" type="button" class="toggle small" data-key="W" title="Kill Mid band (W in RMX · Ctrl+W anywhere)" aria-pressed="false">KILL MID</button>
          </div>
          <div class="rmx-band">
            <label class="knob" for="rmx-iso-high">
              <span class="knob-label">HIGH <output id="rmx-iso-high-out" for="rmx-iso-high">0 dB</output></span>
              <input id="rmx-iso-high" type="range" min="-48" max="6" step="1" value="0" />
            </label>
            <button id="rmx-kill-high" type="button" class="toggle small" data-key="E" title="Kill High band (E in RMX · Ctrl+E anywhere)" aria-pressed="false">KILL HIGH</button>
          </div>
        </div>
      </div>

      <div class="rmx-box rmx-xpad" role="group" aria-labelledby="rmx-xpad-heading">
        <div class="rmx-box-head">
          <h3 id="rmx-xpad-heading">X-PAD FX</h3>
          <div class="rmx-xpad-head-btns">
            <button id="rmx-quantize" type="button" class="toggle small" data-key="Z" aria-pressed="true" title="Snap X-Pad hits &amp; Touch Roll Ribbon to the beat grid (Z)">QUANTIZE</button>
            <button id="rmx-bank" type="button" class="toggle small" data-key="K" title="Switch X-Pad Bank A / Bank B (K)" aria-pressed="false">Bank A (BD/SD/CP/CH)</button>
          </div>
        </div>
        <div class="rmx-pads" role="group" aria-label="X-Pad drum voices">
          <button type="button" class="rmx-pad-btn" data-xpad-slot="0" data-key="1" aria-pressed="false">BD · KICK</button>
          <button type="button" class="rmx-pad-btn" data-xpad-slot="1" data-key="2" aria-pressed="true">SD · SNARE</button>
          <button type="button" class="rmx-pad-btn" data-xpad-slot="2" data-key="3" aria-pressed="false">CP · CLAP</button>
          <button type="button" class="rmx-pad-btn" data-xpad-slot="3" data-key="4" aria-pressed="false">CH · HI-HAT</button>
        </div>
        <div class="rmx-strip-wrap">
          <span class="label">TOUCH ROLL RIBBON (HOLD 5–0 OR SLIDE)</span>
          <div id="rmx-xpad-strip" class="rmx-strip" role="group" aria-label="X-Pad beat roll division">
            <button type="button" data-roll-div="1" data-key="5" aria-pressed="false">1/1</button>
            <button type="button" data-roll-div="2" data-key="6" aria-pressed="false">1/2</button>
            <button type="button" data-roll-div="4" data-key="7" aria-pressed="false">1/4</button>
            <button type="button" data-roll-div="8" data-key="8" aria-pressed="true">1/8</button>
            <button type="button" data-roll-div="16" data-key="9" aria-pressed="false">1/16</button>
            <button type="button" data-roll-div="32" data-key="0" aria-pressed="false">1/32</button>
          </div>
        </div>
        <div class="rmx-xpad-controls">
          <label class="knob" for="rmx-pitch">
            <span class="knob-label">PITCH <output id="rmx-pitch-out" for="rmx-pitch">0 st</output></span>
            <input id="rmx-pitch" type="range" min="-1" max="1" step="0.05" value="0" />
          </label>
          <div class="rmx-xpad-actions">
            <button id="rmx-roll-latch" type="button" class="toggle small" data-key="X" aria-pressed="false" title="Hold roll continuously (X)">LATCH ROLL</button>
            <button id="rmx-overdub" type="button" class="toggle small" data-key="C" aria-pressed="false" title="Record X-Pad hits into the 16-step pattern (C)">OVERDUB</button>
            <button id="rmx-voice-mute" type="button" class="toggle small" data-key="V" aria-pressed="false" title="Silence selected X-Pad voice in pattern (V)">PAD MUTE</button>
            <button id="rmx-voice-clear" type="button" class="small" data-key="⌫" title="Erase selected X-Pad voice steps (Delete)">ERASE PAD</button>
          </div>
        </div>
      </div>

      <div class="rmx-box rmx-scene" role="group" aria-labelledby="rmx-scene-heading">
        <div class="rmx-box-head">
          <h3 id="rmx-scene-heading">SCENE FX</h3>
          <span class="hint">Y–P Build · A–G Break · H/J Level</span>
        </div>
        <div class="rmx-scene-banks">
          <div class="rmx-scene-col">
            <span class="label rmx-build-label">BUILD UP</span>
            <button type="button" class="rmx-fx-btn build" data-scene-fx="bpf_echo" data-key="Y" aria-pressed="true">BPF ECHO</button>
            <button type="button" class="rmx-fx-btn build" data-scene-fx="echo" data-key="U" aria-pressed="false">ECHO</button>
            <button type="button" class="rmx-fx-btn build" data-scene-fx="noise" data-key="I" aria-pressed="false">NOISE</button>
            <button type="button" class="rmx-fx-btn build" data-scene-fx="spiral_up" data-key="O" aria-pressed="false">SPIRAL UP</button>
            <button type="button" class="rmx-fx-btn build" data-scene-fx="reverb_up" data-key="P" aria-pressed="false">REVERB UP</button>
          </div>
          <div class="rmx-scene-col">
            <span class="label rmx-break-label">BREAK DOWN</span>
            <button type="button" class="rmx-fx-btn break" data-scene-fx="hpf_echo" data-key="A" aria-pressed="false">HPF ECHO</button>
            <button type="button" class="rmx-fx-btn break" data-scene-fx="lpf_echo" data-key="S" aria-pressed="false">LPF ECHO</button>
            <button type="button" class="rmx-fx-btn break" data-scene-fx="crush_echo" data-key="D" aria-pressed="false">CRUSH ECHO</button>
            <button type="button" class="rmx-fx-btn break" data-scene-fx="spiral_down" data-key="F" aria-pressed="false">SPIRAL DOWN</button>
            <button type="button" class="rmx-fx-btn break" data-scene-fx="reverb_down" data-key="G" aria-pressed="false">REVERB DOWN</button>
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
      <button id="rmx-release-lever" type="button" class="rmx-lever" data-key="Hold R" aria-pressed="false" title="Hold R to engage Release FX and clear Scene FX on release">
        PULL RELEASE LEVER (HOLD)
      </button>
    </div>
  </section>

  <div class="booth-seq-col">
  <section class="panel traktor-panel" id="traktor-panel" aria-labelledby="trk-title" hidden>
    <div class="panel-head trk-head">
      <div class="trk-brand">
        <h2 id="trk-title">Pattern Player · Traktor Pro 4+ Layer Deck</h2>
        <output id="trk-readout" class="trk-readout" aria-live="polite">BERLIN SUB RUMBLE · SUB RUMBLE 16TH</output>
      </div>
      <div class="trk-head-actions">
        <button id="panel-power-traktor" type="button" class="panel-power-btn mach-trk" aria-pressed="false" title="Toggle Pattern Player ACTIVE / PASSIVE (&#92; or ⌥⇧2)"><i class="mach-led" aria-hidden="true"></i><span id="panel-power-trk-label">PASSIVE [&#92;]</span></button>
        <button id="booth-swap-tr-from-trk" type="button" class="small booth-only-btn" title="Switch Booth Split left deck to TR-REC 10x16 Step Grid">TR Grid ⇄</button>
        <button id="trk-kick-cut" type="button" class="toggle small" data-key="." aria-pressed="false" title="Mute 4/4 Kick so heavy sub-bass, breaks &amp; tops layer cleanly over a playing CDJ track (.)">KICK CUT</button>
        <button id="trk-ducking" type="button" class="toggle small" data-key="U" aria-pressed="false" title="Traktor-style sidechain pump envelope around the downbeat (U)">DUCKING</button>
        <button id="trk-load-sample" type="button" class="small" title="Load a local WAV/MP3/OGG bass or percussion one-shot from your laptop">+ Load WAV</button>
        <input id="trk-sample-file" type="file" accept="audio/*" hidden />
      </div>
    </div>

    <div class="trk-hotkey-strip" aria-label="Pattern Player keyboard shortcuts">
      <span class="trk-hk-title">PATTERN PLAYER KEYS</span>
      <span><kbd>1–0</kbd><kbd>−</kbd><kbd>=</kbd> 12 Patterns</span>
      <span><kbd>Q</kbd><kbd>W</kbd><kbd>E</kbd><kbd>T</kbd> Buildup FX</span>
      <span><kbd>R</kbd> Drop!</span>
      <span><kbd>Y</kbd>/<kbd>I</kbd> Kit</span>
      <span><kbd>⌥B</kbd>/<kbd>⌥N</kbd> Pitch</span>
      <span><kbd>.</kbd> Kick Cut · <kbd>U</kbd> Duck</span>
      <span><kbd>O</kbd> Stem · <kbd>A–K</kbd>/<kbd>Z–,</kbd> Steps 1–16</span>
      <span><kbd>&#92;</kbd> Active/Passive</span>
    </div>

    <div class="trk-controls-bar" role="group" aria-label="Pattern Player Kit and Sound Shaping">
      <label class="field trk-kit-field" for="trk-kit">
        <span class="label">HEAVY BASS / CLUB KIT [Y / I]</span>
        <select id="trk-kit" aria-label="Pattern Player heavy bass and percussion kit">${trkKitOptions}</select>
      </label>
      <label class="knob" for="trk-volume">
        <span class="knob-label">VOLUME <output id="trk-volume-out" for="trk-volume">100%</output></span>
        <input id="trk-volume" type="range" min="0" max="1.2" step="0.02" value="1" />
      </label>
      <label class="knob" for="trk-bass">
        <span class="knob-label">BASS WEIGHT <output id="trk-bass-out" for="trk-bass">75%</output></span>
        <input id="trk-bass" type="range" min="0" max="1" step="0.02" value="0.75" />
      </label>
      <label class="knob" for="trk-pitch">
        <span class="knob-label">PITCH [⌥B / ⌥N] <output id="trk-pitch-out" for="trk-pitch">0 st</output></span>
        <input id="trk-pitch" type="range" min="-12" max="12" step="1" value="0" />
      </label>
      <label class="knob" for="trk-decay">
        <span class="knob-label">DECAY <output id="trk-decay-out" for="trk-decay">68%</output></span>
        <input id="trk-decay" type="range" min="0.1" max="1" step="0.02" value="0.68" />
      </label>
    </div>

    <div class="trk-patterns-section" role="group" aria-label="Pre-built Techno, House and Breakbeat layer patterns">
      <div class="trk-sec-head">
        <span class="label">PRE-BUILT LAYER PATTERNS (TECHNO SUB · HOUSE · BREAKBEAT — KEYS 1..0, −, =)</span>
        <span class="hint">Synced to master clock · Ready to drop over a live DJ track</span>
      </div>
      <div class="trk-pat-grid">${trkPatternButtons}</div>
    </div>

    <div class="trk-buildup-box" role="group" aria-label="One-button Buildup FX and Release Into Drop">
      <div class="trk-buildup-head">
        <span class="label">BUILDUP → DROP FX (TAP ONCE TO LATCH OR HOLD, THEN RELEASE INTO DROP!)</span>
        <output id="trk-buildup-status" class="trk-buildup-status" data-state="idle" aria-live="polite">READY · TAP OR HOLD A BUILDUP MACRO</output>
      </div>
      <div class="trk-buildup-row">
        <button type="button" class="trk-build-btn" data-trk-buildup="echo_hpf" data-key="Q" aria-pressed="false" title="Sweep High-Pass Filter up + dramatic Dub Echo while cutting sub-bass (Q)">ECHO + HPF FILTER</button>
        <button type="button" class="trk-build-btn" data-trk-buildup="noise_filter" data-key="W" aria-pressed="false" title="Swell filtered white-noise jet + resonant sweep over active pattern (W)">NOISE + FILTER SWEEP</button>
        <button type="button" class="trk-build-btn" data-trk-buildup="spiral_roll" data-key="E" aria-pressed="false" title="Accelerating 1/8 → 1/32 snare roll + Spiral Up pitch riser (E)">SPIRAL + SNARE ROLL</button>
        <button type="button" class="trk-build-btn" data-trk-buildup="sub_reverb" data-key="T" aria-pressed="false" title="Kill low sub-bass + wash tops in rising cavern Reverb (T)">SUB KILL + REVERB</button>
        <button id="trk-drop-btn" type="button" class="trk-drop-btn" data-key="R" data-armed="false" title="Slam filter wide open, clear echo/noise &amp; drop full heavy sub-bass onto the playing pattern (R)">RELEASE INTO DROP!</button>
      </div>
      <div class="trk-buildup-meter" aria-hidden="true"><div id="trk-buildup-fill" class="trk-buildup-fill"></div></div>
    </div>

    <div class="trk-seq-footer" role="group" aria-label="Pattern Player 2x8 16-step sequencer">
      <div class="trk-seq-bar">
        <span id="trk-stem-label" class="trk-stem-label">SUB BASS (LT) · 16 STEPS [O = NEXT STEM]</span>
        <div class="trk-stem-tabs" role="group" aria-label="Select Pattern Player stem layer to edit (O cycles stems)">
          <button type="button" class="toggle small" data-trk-stem="sub" aria-pressed="true" title="Edit Sub Bass (Low Tom) steps (Press O to cycle stems)">SUB BASS</button>
          <button type="button" class="toggle small" data-trk-stem="snare" aria-pressed="false" title="Edit Snare / Breakbeat steps (Press O to cycle stems)">SNARE / BREAK</button>
          <button type="button" class="toggle small" data-trk-stem="hats" aria-pressed="false" title="Edit Hi-Hat steps (Press O to cycle stems)">HI-HATS</button>
          <button type="button" class="toggle small" data-trk-stem="perc" aria-pressed="false" title="Edit Clap / Perc steps (Press O to cycle stems)">CLAP / PERC</button>
          <button id="trk-reset-pat" type="button" class="small" data-key="P" title="Restore active pattern to factory steps (P)">Reset Steps</button>
        </div>
      </div>
      <div id="trk-step-grid" class="trk-step-grid"></div>
    </div>
  </section>

  <section class="panel djs-panel" id="djs-panel" aria-labelledby="djs-title" hidden>
    <div class="panel-head djs-head">
      <div class="djs-brand">
        <h2 id="djs-title">DJS-1000 · Pioneer DJ Standalone Sequencer</h2>
        <span id="djs-sync-badge" class="djs-sync-badge" data-locked="false">INT MASTER</span>
      </div>
      <div class="djs-head-actions">
        <button id="panel-power-djs" type="button" class="panel-power-btn mach-djs" aria-pressed="false" title="Toggle Pioneer DJS-1000 ACTIVE / PASSIVE (&#92; or ⌥⇧3)"><i class="mach-led" aria-hidden="true"></i><span id="panel-power-djs-label">PASSIVE [&#92;]</span></button>
        <button id="booth-swap-tr" type="button" class="small booth-only-btn" title="Switch Booth Split left deck to TR-REC 10x16 Step Grid">TR Grid ⇄</button>
        <button id="djs-quantize" type="button" class="toggle small" data-key="Y" aria-pressed="true" title="Snap DJS-1000 pads &amp; rolls to the beat grid (Y)">QUANTIZE</button>
        <button id="djs-live-rec" type="button" class="toggle small djs-rec-btn" data-key="U" aria-pressed="false" title="Overdub live pad hits into the active bar (U)">LIVE REC</button>
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
        <span class="label" title="Press 9 / 0 (or Option+1..8) to switch Scenes">SCENES [9/0]</span>
        <div class="djs-scenes">${sceneButtons}</div>
        <button id="djs-capture-scene" type="button" class="small" data-key="P" title="Snapshot current 64-step pattern into active Scene slot (P)">Capture</button>
      </div>
    </div>

    <div class="djs-body">
      <div class="djs-strip-col" role="group" aria-label="DJS-1000 Touch Strip">
        <div class="djs-strip-modes">
          <button type="button" class="small" data-djs-strip-mode="repeat" aria-pressed="true" title="Touch Strip triggers quantized Note Repeat (Toggle: T)">REPEAT</button>
          <button type="button" class="small" data-djs-strip-mode="pitch" aria-pressed="false" title="Touch Strip triggers Pitch Bend intervals (Toggle: T)">PITCH</button>
        </div>
        <div class="djs-touch-strip">
          <button type="button" data-djs-strip-div="32" data-key="K" title="Hold K for 1/32">1/32</button>
          <button type="button" data-djs-strip-div="16" data-key="J" title="Hold J for 1/16">1/16</button>
          <button type="button" data-djs-strip-div="8" data-key="H" title="Hold H for 1/8">1/8</button>
          <button type="button" data-djs-strip-div="4" data-key="G" title="Hold G for 1/4">1/4</button>
        </div>
      </div>

      <div class="djs-center-col">
        <div class="djs-pad-modes" role="group" aria-label="DJS-1000 Performance Pad mode">
          <button type="button" class="small" data-djs-pad-mode="track" data-key="5" aria-pressed="true" title="Track Play mode (5)">TRACK PLAY</button>
          <button type="button" class="small" data-djs-pad-mode="mute" data-key="6" aria-pressed="false" title="Mute / Solo mode (6)">MUTE / SOLO</button>
          <button type="button" class="small" data-djs-pad-mode="scale" data-key="7" aria-pressed="false" title="16-Pad Chromatic Pitch mode (7)">16-PAD PITCH</button>
          <button type="button" class="small" data-djs-pad-mode="slice" data-key="8" aria-pressed="false" title="Hot Roll division x pitch mode (8)">HOT ROLL</button>
        </div>
        <div id="djs-pad-grid" class="djs-pad-grid" role="group" aria-label="16 multicolor RGB performance pads"></div>
      </div>

      <div class="djs-deck-col" role="group" aria-label="CDJ Tempo &amp; Pro DJ Link controls">
        <button id="djs-beat-sync" type="button" class="toggle small djs-sync-btn" data-key="B" aria-pressed="false" title="Lock to Pro DJ Link Bridge / Ableton Link or snap beat phase (B)">BEAT SYNC</button>
        <div class="djs-nudge-row">
          <button id="djs-nudge-down" type="button" class="small" title="Phase nudge earlier (−2 ms, Shift: −0.5 ms · ;)">NUDGE −</button>
          <button id="djs-nudge-up" type="button" class="small" title="Phase nudge later (+2 ms, Shift: +0.5 ms · ')">NUDGE +</button>
        </div>
        <label class="djs-tempo-wrap" for="djs-tempo-slider">
          <span class="label">TEMPO ±6% <output id="djs-tempo-out" for="djs-tempo-slider">+0.0%</output></span>
          <input id="djs-tempo-slider" type="range" min="-6" max="6" step="0.1" value="0" />
        </label>
        <button id="djs-tempo-reset" type="button" class="small" title="Reset CDJ tempo slider to 0.0%">RESET 0%</button>
        <div class="djs-cdj-bezel">
          <button id="djs-cue" type="button" class="djs-cue-btn" data-key="N" title="Cue / Reset bar phase to Beat 1.1 (N)">CUE</button>
          <button id="djs-play" type="button" class="djs-play-btn" aria-pressed="false" title="Start / Stop sequencer transport (Space)">PLAY / PAUSE</button>
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
        <button id="panel-power-tr" type="button" class="panel-power-btn mach-tr" aria-pressed="true" title="Toggle TR Drum Machine ACTIVE / PASSIVE (&#92; or ⌥⇧1)"><i class="mach-led" aria-hidden="true"></i><span id="panel-power-tr-label">ACTIVE [&#92;]</span></button>
        <button id="booth-swap-trk" type="button" class="small booth-only-btn" title="Switch Booth Split left deck to Traktor-style Pattern Player">Pattern Player ⇄</button>
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
      <div class="clock-brand">
        <h2 id="clock-title">Clock</h2>
        <button id="clock-sync-help" type="button" class="small clock-help-btn" title="Open visual guide for Pioneer CDJ Pro DJ Link, Ableton Link &amp; MIDI sync">Sync Guide · ?</button>
      </div>
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
    <span>Space play · ~ cycle decks · TR: 1–0 voices, A–K/Z–, steps · DJS: 1–4/Q–R/A–F/Z–V 16 pads, 5–8 modes, 9/0 scenes · RMX: 1–4 pads, 5–0 rolls, Q/W/E kills, Y–P/A–G FX, Hold R drop · ? guide</span>
    <span>TR drum machine, DJS-1000 deck &amp; RMX-1000 station for Ableton Link &amp; Pioneer DJ sync</span>
  </footer>`;
}
