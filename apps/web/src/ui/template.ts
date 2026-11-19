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
  const trPerf = `
    <div class="tr-perf-strip" role="region" aria-label="Groove and effects">
      <div class="tr-perf-col groove-col">
        <div class="tr-perf-head">
          <span class="label">Groove</span>
        </div>
        <div class="tr-perf-row">
          <select id="groove-template" aria-label="Groove pocket template" title="Swing and feel template">
            <option value="">Groove…</option>${grooveOptions}
          </select>
          ${knob("humanize", "Humanize", 0, 1, 0.01)}
        </div>
        <div class="tr-perf-actions">
          <button id="var-humanize" type="button" class="small" data-key="⌥G" title="Loosen timing and velocity (⌥G)">Humanize</button>
          <button id="var-mutate" type="button" class="small" data-key="⌥V" title="Make a variation of this pattern (⌥V)">Variation</button>
          <button id="var-fill" type="button" class="small" data-key="⌥F" title="Write a drum fill into steps 13–16 (⌥F)">Auto-fill</button>
        </div>
      </div>

      <div class="tr-perf-col vfx-col">
        <div class="tr-perf-head">
          <span class="label">Effects on the selected drum</span>
          <output id="vfx-readout" class="vfx-readout" aria-live="polite">DRY · NO VOICE FX</output>
        </div>
        <div class="tr-perf-row vfx-row">
          <div class="vfx-chips" role="group" aria-label="Selected voice and group FX toggles">
            <button id="vfx-echo" type="button" class="toggle small fx-chip fx-echo" data-key="⌥E" aria-pressed="false" title="Echo on the selected drum (⌥E)">Echo</button>
            <button id="vfx-reverb" type="button" class="toggle small fx-chip fx-reverb" data-key="⌥R" aria-pressed="false" title="Reverb on the selected drum (⌥R)">Reverb</button>
            <button id="vfx-filter" type="button" class="toggle small fx-chip fx-filter" data-key="⌥D" aria-pressed="false" title="Filter on the selected drum (⌥D)">Filter</button>
            <button id="grp-fx-snare" type="button" class="toggle small grp-chip" data-key="⇧Q" aria-pressed="false" title="Echo on snare, clap and rim (⇧Q)">Snare echo</button>
            <button id="grp-fx-hats" type="button" class="toggle small grp-chip" data-key="⇧W" aria-pressed="false" title="Echo on the hi-hats (⇧W)">Hats echo</button>
            <button id="grp-fx-toms" type="button" class="toggle small grp-chip" data-key="⇧E" aria-pressed="false" title="Echo on toms and cowbell (⇧E)">Toms echo</button>
            <button id="vfx-clear" type="button" class="small" data-key="⌥X" title="Turn all drum effects off (⌥X)">All dry</button>
          </div>
          ${knob("vfx-level", "Effect amount", 0, 1, 0.01)}
        </div>
      </div>
    </div>`;
  return `
  <a class="skip" href="#grid">Skip to the pattern</a>
  <header class="top">
    <h1 class="logo">player<span>5</span></h1>
    <nav class="mode-tabs" role="group" aria-label="Machines">
      <div class="mtab" data-mach="tr">
        <button id="power-tr" type="button" class="mach-btn mach-tr mtab-power" aria-pressed="true" aria-label="TR Drums on or off" title="Turn TR Drums on / off"><i class="mach-led" aria-hidden="true"></i><em id="power-tr-state" class="mach-state sr-only">ACTIVE</em></button>
        <button id="mode-seq" type="button" class="mode-tab" data-key="⌥1" aria-pressed="true" title="TR Drums (⌥1)">TR Drums</button>
      </div>
      <div class="mtab" data-mach="traktor">
        <button id="power-traktor" type="button" class="mach-btn mach-trk mtab-power" aria-pressed="false" aria-label="Pattern Player on or off" title="Turn Pattern Player on / off"><i class="mach-led" aria-hidden="true"></i><em id="power-trk-state" class="mach-state sr-only">PASSIVE</em></button>
        <button id="mode-traktor" type="button" class="mode-tab" data-key="⌥2" aria-pressed="false" title="Pattern Player (⌥2)">Pattern Player</button>
      </div>
      <div class="mtab" data-mach="djs">
        <button id="power-djs" type="button" class="mach-btn mach-djs mtab-power" aria-pressed="false" aria-label="DJS-1000 on or off" title="Turn DJS-1000 on / off"><i class="mach-led" aria-hidden="true"></i><em id="power-djs-state" class="mach-state sr-only">PASSIVE</em></button>
        <button id="mode-djs" type="button" class="mode-tab" data-key="⌥3" aria-pressed="false" title="DJS-1000 pads &amp; scenes (⌥3)">DJS-1000</button>
      </div>
      <div class="mtab" data-mach="rmx">
        <button id="power-rmx" type="button" class="mach-btn mach-rmx mtab-power" aria-pressed="true" aria-label="RMX-1000 effects on or off" title="Turn RMX-1000 effects on / off"><i class="mach-led" aria-hidden="true"></i><em id="power-rmx-state" class="mach-state sr-only">ACTIVE</em></button>
        <button id="mode-rmx" type="button" class="mode-tab" data-key="⌥4" aria-pressed="false" title="RMX-1000 remix effects (⌥4)">RMX FX</button>
      </div>
      <button id="mode-booth" type="button" class="mode-tab mode-tab-booth" data-key="⌥5" aria-pressed="false" title="Two machines side by side for a 13-inch laptop (⌥5)">Split</button>
    </nav>
    <div class="top-actions">
      <div id="meter" class="meter top-meter" role="meter" aria-label="Output peak level" aria-valuemin="-48" aria-valuemax="0" aria-valuenow="-48" aria-valuetext="silent" data-peak-db="-inf" title="Output level">
        <div class="meter-fill" id="meter-fill"></div>
        <div class="meter-mark"></div>
      </div>
      <button id="sync-pill" type="button" class="sync-pill" aria-expanded="false" aria-controls="clock" title="Clock &amp; sync: CDJs, Ableton Link, MIDI"><i class="sync-dot" aria-hidden="true"></i><span id="sync-pill-label">Internal clock</span></button>
      <div class="bpm" role="group" aria-labelledby="bpm-label">
        <div class="bpm-row">
          <button type="button" class="sq" data-bpm="-1" aria-label="Tempo down" title="Tempo down 1 BPM (Shift: 0.1)">−</button>
          <input id="bpm" type="number" inputmode="decimal" min="20" max="400" step="0.01" aria-labelledby="bpm-label" />
          <button type="button" class="sq" data-bpm="1" aria-label="Tempo up" title="Tempo up 1 BPM (Shift: 0.1)">+</button>
          <button type="button" id="tap" class="tap" data-key="T" aria-keyshortcuts="T" title="Tap tempo (T)">Tap</button>
        </div>
        <span class="label bpm-label" id="bpm-label">BPM</span>
      </div>
      <button id="play" class="play" type="button" aria-pressed="false" aria-keyshortcuts="Space">Play</button>
      <button id="how-to-btn" type="button" class="howto-btn icon-btn" aria-keyshortcuts="?" aria-label="Quick guide" title="Quick guide (?)">?</button>
      <button id="settings-btn" type="button" class="icon-btn" aria-expanded="false" aria-controls="settings-drawer" aria-label="Settings" title="Settings: output volume, theme, keyboard shortcuts">⋯</button>
    </div>
    <div class="top-status sr-only">
      <span id="engine-mode" class="engine-mode" title="Audio engine runtime"></span>
      <span id="status" class="status" role="status" aria-live="polite">audio off</span>
      <output id="meter-out" class="meter-out">−∞ dBFS</output>
    </div>
    <output id="kb-target-pill" class="kb-target-pill keys-only" data-passive="false" aria-live="polite" title="Machine that receives your keyboard shortcuts">⌨ KEYS → TR DRUMS</output>
    <button id="install" type="button" class="install" hidden>Install</button>
  </header>

  <section class="panel drawer settings-drawer" id="settings-drawer" aria-label="Settings">
    <div class="drawer-head">
      <h2>Settings</h2>
      <button id="settings-close" type="button" class="small" aria-label="Close settings">Done</button>
    </div>
    <div class="drawer-grid">
      <section class="master" aria-labelledby="master-title">
        <h3 id="master-title">Output</h3>
        ${knob("gain", "Volume", -24, 12, 0.5)}
        <label class="switch" for="limiter">
          <input id="limiter" type="checkbox" role="switch" />
          <span>Safety limiter</span>
        </label>
      </section>
      <section aria-labelledby="look-title">
        <h3 id="look-title">Look &amp; keys</h3>
        <label class="field" for="theme-select"><span class="label">Colour theme</span>
          <select id="theme-select" class="theme-select" aria-label="Visual color scheme">
            <option value="default">8O8 Booth</option>
            <option value="tr-classic">8O8 Classic</option>
            <option value="tr-silver">9O9 Silver</option>
            <option value="tr-neon">TR-8S Neon</option>
            <option value="pioneer">Pioneer CDJ</option>
            <option value="maschine">NI Maschine</option>
          </select>
        </label>
        <label class="switch" for="show-keys">
          <input id="show-keys" type="checkbox" role="switch" />
          <span>Always show keyboard shortcuts <small>(or hold ⌘)</small></span>
        </label>
      </section>
      <section aria-labelledby="session-title">
        <h3 id="session-title">Session</h3>
        <p class="hint">Save keeps your patterns for next time. Reset returns every machine to factory sounds.</p>
      </section>
    </div>
  </section>

  <section class="panel transport devbar" aria-label="Pattern tools">
    <div class="tools">
      <span class="devbar-title" id="devbar-title">TR Drums</span>
      <select id="preset" class="tr-only" aria-label="Load a preset pattern" title="Pattern">
        <option value="">Pattern…</option>${presetOptions}
      </select>
      <select id="kit" class="tr-only" aria-label="Load a drum kit voicing" title="Drum kit sound">
        <option value="">Kit…</option>${kitOptions}
      </select>
      <button id="samples-open-btn" type="button" class="samples-open-btn" title="Use your own Native Instruments or WAV drum sounds">My sounds</button>
      <button id="feel-btn" type="button" class="toggle feel-btn" aria-pressed="false" aria-controls="feel-drawer" title="Swing, accent and flam amount">Feel</button>
      <button id="flam-mode" type="button" class="toggle tr-only" aria-pressed="false" title="While on, tapping a step toggles its flam">Flam edit</button>
      <span class="tools-spacer" aria-hidden="true"></span>
      <button id="undo" type="button" aria-keyshortcuts="Control+Z Meta+Z" title="Undo (⌘Z)">Undo</button>
      <button id="clear" type="button" title="Clear every step on this machine (Undo brings it back)">Clear</button>
      <button id="share" type="button" title="${o.single ? "Copy the pattern code" : "Copy a link to this pattern"}">Share</button>
      <div class="session-actions" role="group" aria-label="Session save and factory reset">
        <button id="save-btn" type="button" class="save-btn" title="Save patterns &amp; machine on/off so they load next time">Save</button>
        <button id="reset-btn" type="button" class="reset-btn" title="Reset every machine to factory defaults">Reset</button>
      </div>
    </div>
    <div class="feel drawer-inline" id="feel-drawer">
      ${knob("shuffle", "Swing")}
      ${knob("accent", "Accent")}
      ${knob("flam", "Flam")}
    </div>
  </section>

  <div class="booth-deck" id="booth-deck">
  <section class="panel rmx-panel" id="rmx-panel" aria-labelledby="rmx-title" hidden>
    <div class="panel-head rmx-head">
      <div class="rmx-brand">
        <h2 id="rmx-title">RMX FX</h2>
        <output id="rmx-readout" class="rmx-readout" aria-live="polite">BPF ECHO 0% · X-PAD SNARE 1/8</output>
      </div>
      <div class="rmx-head-actions">
        <button id="panel-power-rmx" type="button" class="panel-power-btn mach-rmx" aria-pressed="true" title="Turn RMX-1000 effects on / off"><i class="mach-led" aria-hidden="true"></i><span id="panel-power-rmx-label">On</span></button>
        <button id="booth-focus-rmx" type="button" class="small booth-only-btn kb-focus-btn" aria-pressed="false" title="Send keyboard shortcuts to the effects (⌥~)">Keys here</button>
        <button id="rmx-ext-in" type="button" class="toggle small"${o.single ? " hidden" : ""} aria-pressed="false" title="Route external stereo audio input (loopback / mixer return) through the RMX-1000 FX engine">Ext in</button>
        <button id="rmx-reset" type="button" class="small" data-key="." title="Reset all RMX-1000 FX parameters (.)">Reset FX</button>
      </div>
    </div>

    <div class="rmx-grid">
      <div class="rmx-box rmx-iso" role="group" aria-labelledby="rmx-iso-heading">
        <div class="rmx-box-head">
          <h3 id="rmx-iso-heading">Isolator</h3>
          <span class="hint">Kill lows, mids or highs</span>
        </div>
        <div class="rmx-modes" role="group" aria-label="Isolator FX mode">
          <button type="button" data-iso-mode="isolator" aria-pressed="true">Isolator</button>
          <button type="button" data-iso-mode="cut_add" aria-pressed="false">Cut / add</button>
          <button type="button" data-iso-mode="trans_roll" aria-pressed="false">Trans / roll</button>
          <button type="button" data-iso-mode="gate_drive" aria-pressed="false">Gate / drive</button>
        </div>
        <div class="rmx-iso-bands">
          <div class="rmx-band">
            <label class="knob" for="rmx-iso-low">
              <span class="knob-label">Low <output id="rmx-iso-low-out" for="rmx-iso-low">0 dB</output></span>
              <input id="rmx-iso-low" type="range" min="-48" max="6" step="1" value="0" />
            </label>
            <button id="rmx-kill-low" type="button" class="toggle small" data-key="Q" title="Kill Low band (Q in RMX · Ctrl+Q anywhere)" aria-pressed="false">Kill lows</button>
          </div>
          <div class="rmx-band">
            <label class="knob" for="rmx-iso-mid">
              <span class="knob-label">Mid <output id="rmx-iso-mid-out" for="rmx-iso-mid">0 dB</output></span>
              <input id="rmx-iso-mid" type="range" min="-48" max="6" step="1" value="0" />
            </label>
            <button id="rmx-kill-mid" type="button" class="toggle small" data-key="W" title="Kill Mid band (W in RMX · Ctrl+W anywhere)" aria-pressed="false">Kill mids</button>
          </div>
          <div class="rmx-band">
            <label class="knob" for="rmx-iso-high">
              <span class="knob-label">High <output id="rmx-iso-high-out" for="rmx-iso-high">0 dB</output></span>
              <input id="rmx-iso-high" type="range" min="-48" max="6" step="1" value="0" />
            </label>
            <button id="rmx-kill-high" type="button" class="toggle small" data-key="E" title="Kill High band (E in RMX · Ctrl+E anywhere)" aria-pressed="false">Kill highs</button>
          </div>
        </div>
      </div>

      <div class="rmx-box rmx-xpad" role="group" aria-labelledby="rmx-xpad-heading">
        <div class="rmx-box-head">
          <h3 id="rmx-xpad-heading">Drum pads</h3>
          <div class="rmx-xpad-head-btns">
            <button id="rmx-quantize" type="button" class="toggle small" data-key="Z" aria-pressed="true" title="Snap X-Pad hits &amp; Touch Roll Ribbon to the beat grid (Z)">Quantize</button>
            <button id="rmx-bank" type="button" class="toggle small" data-key="K" title="Switch X-Pad Bank A / Bank B (K)" aria-pressed="false">Bank A (BD/SD/CP/CH)</button>
          </div>
        </div>
        <div class="rmx-pads" role="group" aria-label="X-Pad drum voices">
          <button type="button" class="rmx-pad-btn" data-xpad-slot="0" data-key="1" aria-pressed="false">Kick</button>
          <button type="button" class="rmx-pad-btn" data-xpad-slot="1" data-key="2" aria-pressed="true">Snare</button>
          <button type="button" class="rmx-pad-btn" data-xpad-slot="2" data-key="3" aria-pressed="false">Clap</button>
          <button type="button" class="rmx-pad-btn" data-xpad-slot="3" data-key="4" aria-pressed="false">Hi-hat</button>
        </div>
        <div class="rmx-strip-wrap">
          <span class="label">Roll</span>
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
            <span class="knob-label">Pitch <output id="rmx-pitch-out" for="rmx-pitch">0 st</output></span>
            <input id="rmx-pitch" type="range" min="-1" max="1" step="0.05" value="0" />
          </label>
          <div class="rmx-xpad-actions">
            <button id="rmx-roll-latch" type="button" class="toggle small" data-key="X" aria-pressed="false" title="Hold roll continuously (X)">Latch roll</button>
            <button id="rmx-overdub" type="button" class="toggle small" data-key="C" aria-pressed="false" title="Record X-Pad hits into the 16-step pattern (C)">Overdub</button>
            <button id="rmx-voice-mute" type="button" class="toggle small" data-key="V" aria-pressed="false" title="Silence selected X-Pad voice in pattern (V)">Pad mute</button>
            <button id="rmx-voice-clear" type="button" class="small" data-key="⌫" title="Erase selected X-Pad voice steps (Delete)">Erase pad</button>
          </div>
        </div>
      </div>

      <div class="rmx-box rmx-scene" role="group" aria-labelledby="rmx-scene-heading">
        <div class="rmx-box-head">
          <h3 id="rmx-scene-heading">Scene FX</h3>
          <span class="hint keys-only">Y–P Build · A–G Break · H/J Level</span>
        </div>
        <div class="rmx-scene-banks">
          <div class="rmx-scene-col">
            <span class="label rmx-build-label">Build up</span>
            <button type="button" class="rmx-fx-btn build" data-scene-fx="bpf_echo" data-key="Y" aria-pressed="true">BPF echo</button>
            <button type="button" class="rmx-fx-btn build" data-scene-fx="echo" data-key="U" aria-pressed="false">Echo</button>
            <button type="button" class="rmx-fx-btn build" data-scene-fx="noise" data-key="I" aria-pressed="false">Noise</button>
            <button type="button" class="rmx-fx-btn build" data-scene-fx="spiral_up" data-key="O" aria-pressed="false">Spiral up</button>
            <button type="button" class="rmx-fx-btn build" data-scene-fx="reverb_up" data-key="P" aria-pressed="false">Reverb up</button>
          </div>
          <div class="rmx-scene-col">
            <span class="label rmx-break-label">Break down</span>
            <button type="button" class="rmx-fx-btn break" data-scene-fx="hpf_echo" data-key="A" aria-pressed="false">HPF echo</button>
            <button type="button" class="rmx-fx-btn break" data-scene-fx="lpf_echo" data-key="S" aria-pressed="false">LPF echo</button>
            <button type="button" class="rmx-fx-btn break" data-scene-fx="crush_echo" data-key="D" aria-pressed="false">Crush echo</button>
            <button type="button" class="rmx-fx-btn break" data-scene-fx="spiral_down" data-key="F" aria-pressed="false">Spiral down</button>
            <button type="button" class="rmx-fx-btn break" data-scene-fx="reverb_down" data-key="G" aria-pressed="false">Reverb down</button>
          </div>
        </div>
        <div class="rmx-scene-knobs">
          <label class="knob" for="rmx-scene-amount">
            <span class="knob-label">Level <output id="rmx-scene-amount-out" for="rmx-scene-amount">0%</output></span>
            <input id="rmx-scene-amount" type="range" min="0" max="1" step="0.01" value="0" />
          </label>
          <label class="knob" for="rmx-scene-sub">
            <span class="knob-label">Tone <output id="rmx-scene-sub-out" for="rmx-scene-sub">50%</output></span>
            <input id="rmx-scene-sub" type="range" min="0" max="1" step="0.01" value="0.5" />
          </label>
          <label class="knob" for="rmx-scene-sub2">
            <span class="knob-label">Mod <output id="rmx-scene-sub2-out" for="rmx-scene-sub2">50%</output></span>
            <input id="rmx-scene-sub2" type="range" min="0" max="1" step="0.01" value="0.5" />
          </label>
        </div>
      </div>
    </div>

    <div class="rmx-release" role="group" aria-labelledby="rmx-release-heading">
      <div class="rmx-release-modes">
        <span class="label" id="rmx-release-heading">Release</span>
        <button type="button" data-release-mode="vinyl_brake" aria-pressed="true">Vinyl brake</button>
        <button type="button" data-release-mode="echo" aria-pressed="false">Echo</button>
        <button type="button" data-release-mode="back_spin" aria-pressed="false">Back spin</button>
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
        <h2 id="trk-title">Pattern Player</h2>
        <output id="trk-readout" class="trk-readout" aria-live="polite">BERLIN SUB RUMBLE · SUB RUMBLE 16TH</output>
      </div>
      <div class="trk-head-actions">
        <button id="panel-power-traktor" type="button" class="panel-power-btn mach-trk" aria-pressed="false" title="Turn Pattern Player on / off"><i class="mach-led" aria-hidden="true"></i><span id="panel-power-trk-label">Off</span></button>
        <button id="booth-swap-tr-from-trk" type="button" class="small booth-only-btn" title="Switch Booth Split left deck to TR-REC 10x16 Step Grid">TR Grid ⇄</button>
        <button id="trk-kick-cut" type="button" class="toggle small" data-key="." aria-pressed="false" title="Turn the kick off so you don't clash with the DJ's kick (.)">Kick off</button>
        <button id="trk-ducking" type="button" class="toggle small" data-key="U" aria-pressed="false" title="Pump the sound around the kick (U)">Duck</button>
        <button id="trk-load-sample" type="button" class="small" title="Add your own WAV/MP3 one-shot">+ Sample</button>
        <input id="trk-sample-file" type="file" accept="audio/*" hidden />
      </div>
    </div>

    <div class="trk-hotkey-strip keys-only" aria-label="Pattern Player keyboard shortcuts">
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
        <span class="label">Kit</span>
        <select id="trk-kit" aria-label="Pattern Player heavy bass and percussion kit">${trkKitOptions}</select>
      </label>
      <label class="knob" for="trk-volume">
        <span class="knob-label">Volume <output id="trk-volume-out" for="trk-volume">100%</output></span>
        <input id="trk-volume" type="range" min="0" max="1.2" step="0.02" value="1" />
      </label>
      <label class="knob" for="trk-bass">
        <span class="knob-label">Bass <output id="trk-bass-out" for="trk-bass">75%</output></span>
        <input id="trk-bass" type="range" min="0" max="1" step="0.02" value="0.75" />
      </label>
      <label class="knob" for="trk-pitch">
        <span class="knob-label">Pitch <output id="trk-pitch-out" for="trk-pitch">0 st</output></span>
        <input id="trk-pitch" type="range" min="-12" max="12" step="1" value="0" />
      </label>
      <label class="knob" for="trk-decay">
        <span class="knob-label">Decay <output id="trk-decay-out" for="trk-decay">68%</output></span>
        <input id="trk-decay" type="range" min="0.1" max="1" step="0.02" value="0.68" />
      </label>
    </div>

    <div class="trk-patterns-section" role="group" aria-label="Pre-built Techno, House and Breakbeat layer patterns">
      <div class="trk-sec-head">
        <span class="label">Patterns</span>
        <div class="trk-genre-filter" role="group" aria-label="Filter patterns by genre">
          <button type="button" class="toggle small" data-trk-filter="all" aria-pressed="true">All</button>
          <button type="button" class="toggle small" data-trk-filter="Sub / Techno" aria-pressed="false">Techno</button>
          <button type="button" class="toggle small" data-trk-filter="House / Groove" aria-pressed="false">House</button>
          <button type="button" class="toggle small" data-trk-filter="Breakbeat" aria-pressed="false">Breaks</button>
        </div>
      </div>
      <div class="trk-pat-grid">${trkPatternButtons}</div>
    </div>

    <div class="trk-buildup-box" role="group" aria-label="One-button Buildup FX and Release Into Drop">
      <div class="trk-buildup-head">
        <span class="label">Buildup</span>
        <output id="trk-buildup-status" class="trk-buildup-status" data-state="idle" aria-live="polite">Hold a buildup, let go on the 1</output>
      </div>
      <div class="trk-buildup-row">
        <button type="button" class="trk-build-btn" data-trk-buildup="echo_hpf" data-key="Q" aria-pressed="false" title="Echo with a rising filter (Q)">Echo riser</button>
        <button type="button" class="trk-build-btn" data-trk-buildup="noise_filter" data-key="W" aria-pressed="false" title="White noise sweeping up (W)">Noise sweep</button>
        <button type="button" class="trk-build-btn" data-trk-buildup="spiral_roll" data-key="E" aria-pressed="false" title="Snare roll that speeds up (E)">Snare roll</button>
        <button type="button" class="trk-build-btn" data-trk-buildup="sub_reverb" data-key="T" aria-pressed="false" title="Bass out, big reverb wash (T)">Reverb wash</button>
        <button id="trk-drop-btn" type="button" class="trk-drop-btn" data-key="R" data-armed="false" title="Drop back into the full groove (R)">Drop</button>
      </div>
      <div class="trk-buildup-meter" aria-hidden="true"><div id="trk-buildup-fill" class="trk-buildup-fill"></div></div>
    </div>

    <div class="trk-seq-footer" role="group" aria-label="Pattern Player 2x8 16-step sequencer">
      <div class="trk-seq-bar">
        <span id="trk-stem-label" class="trk-stem-label">Bass line · tap to edit</span>
        <div class="trk-stem-tabs" role="group" aria-label="Select Pattern Player stem layer to edit (O cycles stems)">
          <button type="button" class="toggle small" data-trk-stem="sub" aria-pressed="true" title="Edit the bass line (O cycles)">Bass</button>
          <button type="button" class="toggle small" data-trk-stem="snare" aria-pressed="false" title="Edit the snare (O cycles)">Snare</button>
          <button type="button" class="toggle small" data-trk-stem="hats" aria-pressed="false" title="Edit the hi-hats (O cycles)">Hats</button>
          <button type="button" class="toggle small" data-trk-stem="perc" aria-pressed="false" title="Edit claps &amp; percussion (O cycles)">Clap</button>
          <button id="trk-reset-pat" type="button" class="small" data-key="P" title="Put this pattern back to how it was (P)">Reset</button>
        </div>
      </div>
      <div id="trk-step-grid" class="trk-step-grid"></div>
    </div>
  </section>

  <section class="panel djs-panel" id="djs-panel" aria-labelledby="djs-title" hidden>
    <div class="panel-head djs-head">
      <div class="djs-brand">
        <h2 id="djs-title">DJS-1000</h2>
        <span id="djs-sync-badge" class="djs-sync-badge" data-locked="false">Internal</span>
      </div>
      <div class="djs-head-actions">
        <button id="panel-power-djs" type="button" class="panel-power-btn mach-djs" aria-pressed="false" title="Turn DJS-1000 on / off"><i class="mach-led" aria-hidden="true"></i><span id="panel-power-djs-label">Off</span></button>
        <button id="booth-swap-tr" type="button" class="small booth-only-btn" title="Switch Booth Split left deck to TR-REC 10x16 Step Grid">TR Grid ⇄</button>
        <button id="djs-quantize" type="button" class="toggle small" data-key="Y" aria-pressed="true" title="Snap DJS-1000 pads &amp; rolls to the beat grid (Y)">Quantize</button>
        <button id="djs-live-rec" type="button" class="toggle small djs-rec-btn" data-key="U" aria-pressed="false" title="Overdub live pad hits into the active bar (U)">Record</button>
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
        <span class="label" title="Press 9 / 0 (or ⌥1–8) to switch scenes">Scenes</span>
        <div class="djs-scenes">${sceneButtons}</div>
        <button id="djs-capture-scene" type="button" class="small" data-key="P" title="Snapshot current 64-step pattern into active Scene slot (P)">Capture</button>
      </div>
    </div>

    <div class="djs-body">
      <div class="djs-strip-col" role="group" aria-label="DJS-1000 Touch Strip">
        <div class="djs-strip-modes">
          <button type="button" class="small" data-djs-strip-mode="repeat" aria-pressed="true" title="Touch Strip triggers quantized Note Repeat (Toggle: T)">Repeat</button>
          <button type="button" class="small" data-djs-strip-mode="pitch" aria-pressed="false" title="Touch Strip triggers Pitch Bend intervals (Toggle: T)">Pitch</button>
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
          <button type="button" class="small" data-djs-pad-mode="track" data-key="5" aria-pressed="true" title="Track Play mode (5)">Play</button>
          <button type="button" class="small" data-djs-pad-mode="mute" data-key="6" aria-pressed="false" title="Mute / Solo mode (6)">Mute / solo</button>
          <button type="button" class="small" data-djs-pad-mode="scale" data-key="7" aria-pressed="false" title="16-Pad Chromatic Pitch mode (7)">Pitch pads</button>
          <button type="button" class="small" data-djs-pad-mode="slice" data-key="8" aria-pressed="false" title="Hot Roll division x pitch mode (8)">Roll</button>
        </div>
        <div id="djs-pad-grid" class="djs-pad-grid" role="group" aria-label="16 multicolor RGB performance pads"></div>
      </div>

      <div class="djs-deck-col" role="group" aria-label="CDJ Tempo &amp; Pro DJ Link controls">
        <button id="djs-beat-sync" type="button" class="toggle small djs-sync-btn" data-key="B" aria-pressed="false" title="Lock to Pro DJ Link Bridge / Ableton Link or snap beat phase (B)">Beat sync</button>
        <div class="djs-nudge-row">
          <button id="djs-nudge-down" type="button" class="small" title="Phase nudge earlier (−2 ms, Shift: −0.5 ms · ;)">Nudge −</button>
          <button id="djs-nudge-up" type="button" class="small" title="Phase nudge later (+2 ms, Shift: +0.5 ms · ')">Nudge +</button>
        </div>
        <label class="djs-tempo-wrap" for="djs-tempo-slider">
          <span class="label">TEMPO ±6% <output id="djs-tempo-out" for="djs-tempo-slider">+0.0%</output></span>
          <input id="djs-tempo-slider" type="range" min="-6" max="6" step="0.1" value="0" />
        </label>
        <button id="djs-tempo-reset" type="button" class="small" title="Reset CDJ tempo slider to 0.0%">Reset 0%</button>
        <div class="djs-cdj-bezel">
          <button id="djs-cue" type="button" class="djs-cue-btn" data-key="N" title="Cue / Reset bar phase to Beat 1.1 (N)">Cue</button>
          <button id="djs-play" type="button" class="djs-play-btn" aria-pressed="false" title="Start / Stop sequencer transport (Space)">Play / pause</button>
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
        <h2 id="grid-title">TR Drums</h2>
      </div>
      <div class="grid-head-right">
        <button id="booth-swap-trk" type="button" class="small booth-only-btn" title="Show Pattern Player on the left">Pattern Player ⇄</button>
        <button id="booth-swap-djs" type="button" class="small booth-only-btn" title="Show DJS-1000 on the left">DJS-1000 ⇄</button>
        <span class="hint" id="grid-hint"></span>
      </div>
    </div>

    <div class="tr-var-bar" role="region" aria-label="Bars, loop length and mixer">
      <div class="tr-bank-group" role="group" aria-label="Bars A to D">
        <span class="label">Bar</span>
        <button id="var-bank-a" type="button" class="toggle small" aria-pressed="true" title="Play &amp; edit bar A">A</button>
        <button id="var-bank-b" type="button" class="toggle small" aria-pressed="false" title="Play &amp; edit bar B">B</button>
        <button id="var-bank-c" type="button" class="toggle small" aria-pressed="false" title="Play &amp; edit bar C">C</button>
        <button id="var-bank-d" type="button" class="toggle small" aria-pressed="false" title="Play &amp; edit bar D">D</button>
        <button id="var-bank-ab" type="button" class="toggle small" aria-pressed="false" title="Loop bars A and B (32 steps)">A+B</button>
        <button id="var-bank-abcd" type="button" class="toggle small" aria-pressed="false" title="Loop all four bars (64 steps)">A–D</button>
        <button id="var-copy-ab" type="button" class="small" title="Copy this bar into the next one">Copy →</button>
        <button id="var-follow" type="button" class="toggle small" aria-pressed="false" title="Show the bar that is playing">Follow</button>
      </div>
      <div class="tr-loop-group">
        <button id="fill-hold" type="button" class="toggle small fill-btn" data-key="R" aria-pressed="false" title="Hold for a drum fill (R)">Fill</button>
        <label class="inline-field" for="last-step">
          <span class="label">Length</span>
          <select id="last-step" aria-label="Last step" title="Loop length in steps">${lastStepOptions}</select>
        </label>
        <select id="auto-fill-bars" aria-label="Auto-fill interval" title="Play a fill automatically">
          <option value="0">Auto-fill off</option>
          <option value="2">Fill every 2 bars</option>
          <option value="4">Fill every 4 bars</option>
          <option value="8">Fill every 8 bars</option>
        </select>
        <button id="mixer-toggle" type="button" class="toggle small" aria-pressed="false" title="Show level faders for every drum">Mixer</button>
        <button id="panel-power-tr" type="button" class="panel-power-btn mach-tr" aria-pressed="true" title="Turn TR Drums on / off"><i class="mach-led" aria-hidden="true"></i><span id="panel-power-tr-label">On</span></button>
      </div>
    </div>

    <div id="mixer-drawer" class="mixer-drawer" hidden role="region" aria-label="10-channel level &amp; solo mixer"></div>
    <div id="grid" class="grid" tabindex="-1"></div>
    ${trPerf}
  </section>

  <div class="split">
    <section class="panel voice-panel" id="voice-panel" aria-labelledby="voice-title">
      <div class="panel-head">
        <h2 id="voice-title">Voice</h2>
        <span class="hint">Click a drum name to edit its sound</span>
      </div>
      <div id="voice-controls" class="knobs"></div>
      <div id="voice-extra" class="voice-extra"></div>
    </section>
  </div>
  </div>
  </div>

  <section class="panel clock drawer" id="clock" aria-labelledby="clock-title" data-source="internal" data-lock="off">
    <div class="panel-head">
      <div class="clock-brand">
        <h2 id="clock-title">Clock &amp; sync</h2>
        <button id="clock-sync-help" type="button" class="small clock-help-btn" title="How to sync with CDJs, Ableton Link and MIDI">How to sync</button>
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
      <button id="clock-close" type="button" class="small drawer-close" aria-label="Close clock settings">Done</button>
    </div>
  </section>

  <section class="panel share drawer" id="share-panel" aria-labelledby="share-title">
    <div class="panel-head"><h2 id="share-title">Share &amp; import</h2><button id="share-close" type="button" class="small drawer-close" aria-label="Close share">Done</button></div>
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

  <div id="samples-modal" class="samples-backdrop" hidden role="dialog" aria-modal="true" aria-labelledby="samples-title">
    <div class="samples-modal">
      <div class="panel-head samples-head">
        <div>
          <span class="howto-badge">OWNED SAMPLE LOADER · WAV / AIFF / NI LIBRARIES</span>
          <h2 id="samples-title">Plug In Your Own Sounds &amp; ★ Favorites</h2>
        </div>
        <button id="samples-close" type="button" class="small" aria-label="Close Sample Browser">Close (Esc)</button>
      </div>
      <div class="samples-toolbar">
        <button id="samples-pick-folder" type="button" class="toggle">+ Load NI / WAV Folder</button>
        <input id="samples-folder-input" type="file" webkitdirectory multiple accept="audio/*" hidden />
        <button id="samples-autofill" type="button" class="small">Auto-Fill Kit</button>
        <button id="samples-fav-filter" type="button" class="toggle small" aria-pressed="false">★ Favorites Only</button>
        <button id="samples-clear-all" type="button" class="small">Revert All to SYNTH</button>
      </div>
      <div id="samples-libs" class="samples-libs" role="group" aria-label="Sample libraries"></div>
      <div id="samples-slots" class="samples-slots" role="group" aria-label="10 drum voice slots"></div>
      <div id="samples-list" class="samples-list" role="region" aria-label="Available drum hits"></div>
    </div>
  </div>

  <div id="first-run-hint" class="first-run-hint" hidden role="note">
    <span id="first-run-text">New here? Click squares to add drum hits · <kbd>Space</kbd> plays · hold <kbd>⌘</kbd> to see shortcuts · <kbd>?</kbd> for a 30-second guide</span>
    <button id="first-run-close" type="button" class="small" aria-label="Dismiss tip">✕</button>
  </div>`;
}
