// 3Blue1Brown-style visual explainer videos, ASD-STE100 quick-start procedures,
// DJ Booth Sync guide (Pioneer CDJ Pro DJ Link, Ableton Link, USB/DIN MIDI),
// and interactive MacBook Air keyboard map for all player5 devices.

export type GuideMode = "sequencer" | "traktor" | "djs" | "rmx" | "sync";

export interface Chapter {
  id: number;
  title: string;
  startSec: number;
  endSec: number;
}

export const EXPLAINER_DURATION_SEC = 120;

export const SEQ_CHAPTERS: readonly Chapter[] = [
  {
    id: 0,
    title: "1 · 16-Step Circle & 64-Step Bars",
    startSec: 0,
    endSec: 30,
  },
  {
    id: 1,
    title: "2 · 10 Voices, Kits & ON AIR",
    startSec: 30,
    endSec: 60,
  },
  {
    id: 2,
    title: "3 · TR-8O8 / 9O9 / CR-78 Circuits",
    startSec: 60,
    endSec: 90,
  },
  {
    id: 3,
    title: "4 · Groove, Voice FX & Save/Reset",
    startSec: 90,
    endSec: 120,
  },
];

export const TRAKTOR_CHAPTERS: readonly Chapter[] = [
  {
    id: 0,
    title: "1 · Heavy Sub Kits & 12 Patterns",
    startSec: 0,
    endSec: 30,
  },
  {
    id: 1,
    title: "2 · Bass Weight, Pitch & Ducking",
    startSec: 30,
    endSec: 60,
  },
  {
    id: 2,
    title: "3 · Buildup → Drop FX [Q/W/E/R]",
    startSec: 60,
    endSec: 90,
  },
  {
    id: 3,
    title: "4 · 2×8 Step Strip & Local WAV",
    startSec: 90,
    endSec: 120,
  },
];

export const DJS_CHAPTERS: readonly Chapter[] = [
  {
    id: 0,
    title: "1 · 4×4 Pad Grid & Left-Hand Keys",
    startSec: 0,
    endSec: 30,
  },
  {
    id: 1,
    title: "2 · 4 Pad Modes ([5]–[8])",
    startSec: 30,
    endSec: 60,
  },
  {
    id: 2,
    title: "3 · 8 Scenes & 64-Step Live Rec",
    startSec: 60,
    endSec: 90,
  },
  {
    id: 3,
    title: "4 · Touch Strip & CDJ Beat Sync",
    startSec: 90,
    endSec: 120,
  },
];

export const RMX_CHAPTERS: readonly Chapter[] = [
  {
    id: 0,
    title: "1 · 4-Stage Signal Chain & Bypass",
    startSec: 0,
    endSec: 30,
  },
  {
    id: 1,
    title: "2 · X-Pad [1–4] & Roll Ribbon [5–0]",
    startSec: 30,
    endSec: 60,
  },
  {
    id: 2,
    title: "3 · Isolator Kills [Q/W/E] & Scene FX",
    startSec: 60,
    endSec: 90,
  },
  {
    id: 3,
    title: "4 · Release FX Lever [Hold R] & [T]",
    startSec: 90,
    endSec: 120,
  },
];

export const SYNC_CHAPTERS: readonly Chapter[] = [
  {
    id: 0,
    title: "1 · Pioneer CDJ & Pro DJ Link",
    startSec: 0,
    endSec: 30,
  },
  {
    id: 1,
    title: "2 · Ableton Link (Wi-Fi & Tabs)",
    startSec: 30,
    endSec: 60,
  },
  {
    id: 2,
    title: "3 · USB / DIN MIDI Clock (24 PPQN)",
    startSec: 60,
    endSec: 90,
  },
  {
    id: 3,
    title: "4 · Latency Offset & Phase Nudge",
    startSec: 90,
    endSec: 120,
  },
];

export const CHAPTERS = SEQ_CHAPTERS;

interface Caption {
  from: number;
  to: number;
  text: string;
}

// Captions written to ASD-STE100 (~80% strictness): active voice, concise single-concept sentences, consistent UI labels.
const SEQ_CAPTIONS: readonly Caption[] = [
  {
    from: 0,
    to: 10,
    text: "Step Sequencer: One bar contains 4 beats, divided into 16 sixteenth-note steps around a repeating phase circle.",
  },
  {
    from: 10,
    to: 20,
    text: "The phase circle maps directly to your keyboard: Home Row (A–K) edits Steps 1–8, and Bottom Row (Z–,) edits Steps 9–16.",
  },
  {
    from: 20,
    to: 30,
    text: "Press a step key to cycle Off, Hit, and Accent. Chain Bars A, B, C, and D to build a 64-step 4-bar phrase.",
  },
  {
    from: 30,
    to: 40,
    text: "Press number keys 1–0 to select one of the 10 drum voices. Hold Shift + 1–0 to audition a drum sound live.",
  },
  {
    from: 40,
    to: 50,
    text: "Hold Option (⌥) + 1–0 to mute a voice. Use the ON AIR switches to solo TR Drums or layer TR Drums with DJS-1000.",
  },
  {
    from: 50,
    to: 60,
    text: "Press Y, U, I, O, or P (or open Drum kit) to load TR-8O8, TR-9O9, TR-7O7, TR-6O6, TR-72x, or CR-78 voice circuits.",
  },
  {
    from: 60,
    to: 70,
    text: "Voice Circuits: TR-8O8 uses a Bridged-T sub-bass resonator. TR-9O9 adds a fast pitch-envelope transient for club punch.",
  },
  {
    from: 70,
    to: 80,
    text: "Closed Hat and Open Hat sum 6 metallic square oscillators. Triggering Closed Hat chokes a ringing Open Hat automatically.",
  },
  {
    from: 80,
    to: 90,
    text: "TR-7O7 provides tight studio snare transients, TR-72x adds Latin percussion, and CR-78 generates warm woodblock clave tones.",
  },
  {
    from: 90,
    to: 100,
    text: "Groove & Fill: Adjust Shuffle to delay even steps. Press ⌥+G to humanize, ⌥+V for variation, and ⌥+F for a 1-bar fill.",
  },
  {
    from: 100,
    to: 110,
    text: "Voice FX: Press Ctrl + 1–0 for per-voice Dub Echo, ⌥+E/R/D for Echo/Reverb/Filter, or Shift+Q/W/E for group echo sends.",
  },
  {
    from: 110,
    to: 120,
    text: "Session Control: Fresh builds open clean. Click Save to store your startup pattern, or click Reset to restore factory defaults.",
  },
];

const DJS_CAPTIONS: readonly Caption[] = [
  {
    from: 0,
    to: 10,
    text: "DJS-1000 Deck: The 16 RGB Performance Pads map 1-to-1 to a 4×4 block on the left side of your MacBook Air keyboard.",
  },
  {
    from: 10,
    to: 20,
    text: "Press 1 2 3 4 for Pads 1–4, Q W E R for Pads 5–8, A S D F for Pads 9–12, and Z X C V for Pads 13–16.",
  },
  {
    from: 20,
    to: 30,
    text: "Every pad key plays sound immediately, even when transport is stopped. Hold Shift with a pad key to trigger an accented hit.",
  },
  {
    from: 30,
    to: 40,
    text: "Pad Modes: Press 5 for TRACK PLAY (10 drum voices + 6 macros) or press 6 for MUTE / SOLO stem control.",
  },
  {
    from: 40,
    to: 50,
    text: "Press 7 for 16-PAD PITCH to play chromatic semitones (-7 st to +8 st, with Pad 8 / key R as the 0 st root note).",
  },
  {
    from: 50,
    to: 60,
    text: "Press 8 for HOT ROLL. Hold any pad key (1–4, Q–R, A–F, Z–V) to fire quantized 1/4 to 1/32 pitched rolls; release to stop.",
  },
  {
    from: 60,
    to: 70,
    text: "Scenes & Bars: Press 9 and 0 (or ⌥+1–8) to launch Scenes S1–S8. Press P to capture your current groove into the active Scene.",
  },
  {
    from: 70,
    to: 80,
    text: "Press I to select Bar A, B, C, or D. Press O to cycle between a 1-bar loop, 32-step A+B chain, and 64-step A–D chain.",
  },
  {
    from: 80,
    to: 90,
    text: "Press Y to toggle QUANTIZE and press U to arm LIVE REC. While playing, pad hits record directly into the active bar.",
  },
  {
    from: 90,
    to: 100,
    text: "Touch Strip: Hold G (1/4), H (1/8), J (1/16), or K (1/32) for Note Repeat or Pitch Bend. Press T to switch strip mode.",
  },
  {
    from: 100,
    to: 110,
    text: "CDJ Transport: Press B for BEAT SYNC, press N for CUE (Beat 1.1 reset), and press M or , to mute or solo the selected track.",
  },
  {
    from: 110,
    to: 120,
    text: "DJS-1000 maintains its own pattern separate from TR Drums. Use ON AIR in the transport bar to solo one deck or layer both.",
  },
];

const RMX_CAPTIONS: readonly Caption[] = [
  {
    from: 0,
    to: 10,
    text: "RMX-1000 Station: Audio passes through 4 live stages: X-Pad Sampler → 3-Band Isolator → Scene FX → Release FX Lever.",
  },
  {
    from: 10,
    to: 20,
    text: "Press Backquote (`) to cycle standalone decks, or press Shift + Backquote to open MacBook Air 13-inch Booth Split.",
  },
  {
    from: 20,
    to: 30,
    text: "Press , (Comma) to bypass RMX-1000 cleanly, or press . (Period) to reset all RMX-1000 knobs and kills to flat defaults.",
  },
  {
    from: 30,
    to: 40,
    text: "X-Pad FX: Press 1, 2, 3, or 4 to trigger the 4 X-Pad drum slots. Press K to switch between Bank A and Bank B.",
  },
  {
    from: 40,
    to: 50,
    text: "Touch Roll Ribbon: Hold 5, 6, 7, 8, 9, or 0 to roll the active X-Pad voice at 1/1, 1/2, 1/4, 1/8, 1/16, or 1/32.",
  },
  {
    from: 50,
    to: 60,
    text: "Press Z for Quantize, X for Latch Roll, C for Overdub, V for Pad Mute, and B / N to shift X-Pad pitch down or up.",
  },
  {
    from: 60,
    to: 70,
    text: "Isolator FX: Press Q, W, or E to toggle KILL LOW, KILL MID, and KILL HIGH (-inf dB Linkwitz-Riley crossover kills).",
  },
  {
    from: 70,
    to: 80,
    text: "Press M (or Shift + Q/W/E/R) to switch Isolator modes between ISOLATOR, CUT/ADD, TRANS/ROLL, and GATE/DRIVE.",
  },
  {
    from: 80,
    to: 90,
    text: "Scene FX: Press Y U I O P for Build-Up FX, press A S D F G for Break-Down FX, and press H / J to lower or raise Scene Level.",
  },
  {
    from: 90,
    to: 100,
    text: "Release FX: Press T to choose VINYL BRAKE, ECHO, or BACK SPIN. Hold R at peak tension to pull the spring-loaded lever.",
  },
  {
    from: 100,
    to: 110,
    text: "While you hold R, the dry drum mix mutes and only the turntable brake, back-spin, or echo tail plays.",
  },
  {
    from: 110,
    to: 120,
    text: "When you release R, the lever snaps back, resets Scene FX Level to 0%, and drops the clean drum groove on Beat 1.",
  },
];

const TRAKTOR_CAPTIONS: readonly Caption[] = [
  {
    from: 0,
    to: 10,
    text: "Pattern Player: Emulates Traktor Pro 4+ minimalist DJ layering with heavy synthesized sub-bass, techno, house, and breakbeats.",
  },
  {
    from: 10,
    to: 20,
    text: "Press keys 1–0, -, or = to launch 12 pre-baked patterns: Sub Rumble, Offbeat Sub, House Rollers, and Breakbeats.",
  },
  {
    from: 20,
    to: 30,
    text: "Press K to toggle KICK CUT. KICK CUT mutes the 4/4 kick so sub-bass, breaks, and hats layer cleanly over a playing CDJ track.",
  },
  {
    from: 30,
    to: 40,
    text: "Sound Shaping: Press Y and I (or use the Kit menu) to select Berlin Sub Rumble, Hard Industrial, Acid Sub, or UK Sub & Break.",
  },
  {
    from: 40,
    to: 50,
    text: "Adjust VOLUME and BASS WEIGHT to boost 42–60 Hz sub sustain. Press B and N to shift PITCH down or up (-12 to +12 semitones).",
  },
  {
    from: 50,
    to: 60,
    text: "Adjust DECAY from tight minimal clicks to long warehouse sub tails. Press U to engage DUCKING for sidechain pump.",
  },
  {
    from: 60,
    to: 70,
    text: "Buildup FX: Tap once to latch (or hold) Q for ECHO + HPF FILTER, W for NOISE + FILTER SWEEP, E for SPIRAL + ROLL, or T for SUB KILL.",
  },
  {
    from: 70,
    to: 80,
    text: "During a buildup, the high-pass filter sweeps upward and attenuates low sub-bass while dramatic echo or white noise rises.",
  },
  {
    from: 80,
    to: 90,
    text: "Press R (or click RELEASE INTO DROP!) on Beat 1. Filter and FX clear immediately, and full sub-bass drops onto the active pattern.",
  },
  {
    from: 90,
    to: 100,
    text: "2×8 Step Strip: Select SUB BASS, SNARE / BREAK, HI-HATS, or CLAP / PERC to inspect or edit the 16 steps.",
  },
  {
    from: 100,
    to: 110,
    text: "Press Home Row A–K for Steps 1–8 and Bottom Row Z–, for Steps 9–16. Press P to restore the selected pattern's factory steps.",
  },
  {
    from: 110,
    to: 120,
    text: "Click '+ Load WAV' to layer your own local WAV, MP3, or OGG sample offline (Traktor artist packs require Traktor Pro 4).",
  },
];

const SYNC_CAPTIONS: readonly Caption[] = [
  {
    from: 0,
    to: 10,
    text: "Pioneer CDJ Sync: Connect your Mac to the same Ethernet switch as your CDJ-2000NXS2, CDJ-3000, and DJM mixer.",
  },
  {
    from: 10,
    to: 20,
    text: "Run player5-bridge with '--source prolink' (or '--source opus' for AlphaTheta Opus Quad) to read UDP 50000–50002 packets.",
  },
  {
    from: 20,
    to: 30,
    text: "In the Clock panel, select Bridge and click Connect. Set Follow to Tempo master to lock BPM and 4-beat bar phase.",
  },
  {
    from: 30,
    to: 40,
    text: "Ableton Link: Syncs tempo and 4-beat bar quantum over Wi-Fi or LAN with Ableton Live, Traktor, Serato, and Rekordbox.",
  },
  {
    from: 40,
    to: 50,
    text: "Select Ableton Link in the Clock panel. Two browser tabs on one Mac sync immediately; run player5-bridge for LAN peers.",
  },
  {
    from: 50,
    to: 60,
    text: "Enable Start/Stop Sync to follow Link transport launches, or click Push Pattern BPM to set the session tempo.",
  },
  {
    from: 60,
    to: 70,
    text: "MIDI Clock: Connect a USB-MIDI cable or audio interface MIDI In from an external mixer, synth, or drum machine.",
  },
  {
    from: 70,
    to: 80,
    text: "Select MIDI in Chrome or Edge and choose your MIDI port. The engine filters 24-PPQN clock jitter with a smooth PLL.",
  },
  {
    from: 80,
    to: 90,
    text: "No sync cable available? Select Tap and press T four times on the beat, then use ; and ' to keep phase aligned.",
  },
  {
    from: 90,
    to: 100,
    text: "Zero-Drift Calibration: Laptop speakers, DAC buffers, or adapters add fixed audio output delay relative to your DJ mixer.",
  },
  {
    from: 100,
    to: 110,
    text: "Click Sync Click and adjust Latency offset (ms) until the rim-click aligns with the CDJ beat in your headphones.",
  },
  {
    from: 110,
    to: 120,
    text: "Enable 1-Bar Launch so pressing Play arms the sequencer and starts cleanly on Beat 1.1 of the next bar.",
  },
];

// 3Blue1Brown visual palette
const C_BG = "#0b0d14";
const C_GRID = "#162032";
const C_AXIS = "#2b3b55";
const C_BLUE = "#58c4dd";
const C_YELLOW = "#f7d154";
const C_RED = "#fc6255";
const C_GREEN = "#83c167";
const C_PURPLE = "#b189c6";
const C_TEAL = "#5cd0b3";
const C_TEXT = "#ecebe6";
const C_MUTED = "#8e96a8";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

interface KeyCap {
  code: string;
  label: string;
  seqSub: string;
  djsSub: string;
  rmxSub: string;
  syncSub: string;
  seqColor: string;
  djsColor: string;
  rmxColor: string;
  syncColor: string;
}

const kcap = (
  code: string,
  label: string,
  seqSub: string,
  seqColor: string,
  djsSub: string,
  djsColor: string,
  rmxSub: string,
  rmxColor: string,
  syncSub: string,
  syncColor: string,
): KeyCap => ({
  code,
  label,
  seqSub,
  djsSub,
  rmxSub,
  syncSub,
  seqColor,
  djsColor,
  rmxColor,
  syncColor,
});

const MACBOOK_ROWS: readonly (readonly KeyCap[])[] = [
  [
    kcap("Backquote", "`", "Cycle Deck", C_PURPLE, "Cycle Deck", C_PURPLE, "Cycle Deck", C_PURPLE, "Booth ⇧`", C_PURPLE),
    kcap("Digit1", "1", "BD Kick", C_BLUE, "Pad 1 BD", C_BLUE, "X-Pad 1", C_BLUE, "Voice 1", C_MUTED),
    kcap("Digit2", "2", "SD Snare", C_BLUE, "Pad 2 SD", C_BLUE, "X-Pad 2", C_BLUE, "Voice 2", C_MUTED),
    kcap("Digit3", "3", "LT Tom", C_BLUE, "Pad 3 LT", C_BLUE, "X-Pad 3", C_BLUE, "Voice 3", C_MUTED),
    kcap("Digit4", "4", "MT Tom", C_BLUE, "Pad 4 MT", C_BLUE, "X-Pad 4", C_BLUE, "Voice 4", C_MUTED),
    kcap("Digit5", "5", "HT Tom", C_BLUE, "Mode: Play", C_TEAL, "Roll 1/1", C_YELLOW, "Voice 5", C_MUTED),
    kcap("Digit6", "6", "RS Rim", C_BLUE, "Mode: Mute", C_TEAL, "Roll 1/2", C_YELLOW, "Voice 6", C_MUTED),
    kcap("Digit7", "7", "CP Clap", C_BLUE, "Mode: Pitch", C_TEAL, "Roll 1/4", C_YELLOW, "Voice 7", C_MUTED),
    kcap("Digit8", "8", "CH Hat", C_BLUE, "Mode: Roll", C_TEAL, "Roll 1/8", C_YELLOW, "Voice 8", C_MUTED),
    kcap("Digit9", "9", "OH Hat", C_BLUE, "Scene −", C_PURPLE, "Roll 1/16", C_YELLOW, "Voice 9", C_MUTED),
    kcap("Digit0", "0", "CB Bell", C_BLUE, "Scene +", C_PURPLE, "Roll 1/32", C_YELLOW, "Voice 10", C_MUTED),
    kcap("Minus", "−", "BPM −1", C_YELLOW, "BPM −1", C_YELLOW, "BPM −1", C_YELLOW, "BPM −1", C_YELLOW),
    kcap("Equal", "=", "BPM +1", C_YELLOW, "BPM +1", C_YELLOW, "BPM +1", C_YELLOW, "BPM +1", C_YELLOW),
    kcap("Backspace", "⌫", "Clear Row", C_RED, "Clear Trk", C_RED, "Erase Pad", C_RED, "Clear", C_RED),
  ],
  [
    kcap("KeyQ", "Q", "Prev Pat", C_PURPLE, "Pad 5 HT", C_BLUE, "KILL LOW", C_RED, "⌥1–5 View", C_PURPLE),
    kcap("KeyW", "W", "Next Pat", C_PURPLE, "Pad 6 RS", C_BLUE, "KILL MID", C_RED, "⌥⇧1–4 Actv", C_GREEN),
    kcap("KeyE", "E", "Flam Edit", C_PURPLE, "Pad 7 CP", C_BLUE, "KILL HIGH", C_RED, "⌥~ Focus", C_TEAL),
    kcap("KeyR", "R", "Hold Fill", C_RED, "Pad 8 CH", C_BLUE, "HOLD LEVER", C_RED, "Device R", C_RED),
    kcap("KeyT", "T", "Tap BPM", C_YELLOW, "Strip Mode", C_YELLOW, "Rel Mode", C_YELLOW, "Tap Beat", C_YELLOW),
    kcap("KeyY", "Y", "TR-8O8", C_TEAL, "Quantize", C_TEAL, "BPF Echo", C_BLUE, "Kit 8O8", C_MUTED),
    kcap("KeyU", "U", "TR-9O9", C_TEAL, "Live Rec", C_RED, "Echo FX", C_BLUE, "Kit 9O9", C_MUTED),
    kcap("KeyI", "I", "TR-7O7", C_TEAL, "Bar A–D", C_PURPLE, "Noise FX", C_BLUE, "Kit 7O7", C_MUTED),
    kcap("KeyO", "O", "TR-6O6", C_TEAL, "Chain 64", C_PURPLE, "Spiral Up", C_BLUE, "Kit 6O6", C_MUTED),
    kcap("KeyP", "P", "9O9 Drive", C_TEAL, "Capture", C_YELLOW, "Reverb Up", C_BLUE, "9O9 Drive", C_MUTED),
    kcap("BracketLeft", "[", "BPM −1", C_YELLOW, "BPM −1", C_YELLOW, "BPM −1", C_YELLOW, "BPM −1", C_YELLOW),
    kcap("BracketRight", "]", "BPM +1", C_YELLOW, "BPM +1", C_YELLOW, "BPM +1", C_YELLOW, "BPM +1", C_YELLOW),
    kcap("Backslash", "\\", "Actv/Pass", C_GREEN, "Actv/Pass", C_GREEN, "Actv/Pass", C_GREEN, "Actv/Pass", C_GREEN),
  ],
  [
    kcap("KeyA", "A", "Step 1", C_GREEN, "Pad 9 OH", C_BLUE, "HPF Echo", C_PURPLE, "Step 1", C_MUTED),
    kcap("KeyS", "S", "Step 2", C_GREEN, "Pad 10 CB", C_BLUE, "LPF Echo", C_PURPLE, "Step 2", C_MUTED),
    kcap("KeyD", "D", "Step 3", C_GREEN, "Pad 11 BD+", C_BLUE, "Crush FX", C_PURPLE, "Step 3", C_MUTED),
    kcap("KeyF", "F", "Step 4", C_GREEN, "Pad 12 SD×2", C_BLUE, "Spiral Dn", C_PURPLE, "Step 4", C_MUTED),
    kcap("KeyG", "G", "Step 5", C_GREEN, "Strip 1/4", C_YELLOW, "Reverb Dn", C_PURPLE, "⌥G Human", C_MUTED),
    kcap("KeyH", "H", "Step 6", C_GREEN, "Strip 1/8", C_YELLOW, "FX Lvl −", C_YELLOW, "Step 6", C_MUTED),
    kcap("KeyJ", "J", "Step 7", C_GREEN, "Strip 1/16", C_YELLOW, "FX Lvl +", C_YELLOW, "Step 7", C_MUTED),
    kcap("KeyK", "K", "Step 8", C_GREEN, "Strip 1/32", C_YELLOW, "Bank A/B", C_TEAL, "Step 8", C_MUTED),
    kcap("KeyL", "L", "Re-sync", C_YELLOW, "Re-sync", C_YELLOW, "Re-sync", C_YELLOW, "SNAP BAR", C_GREEN),
    kcap("Semicolon", ";", "Nudge −", C_YELLOW, "Nudge −", C_YELLOW, "Nudge −", C_YELLOW, "NUDGE −1ms", C_GREEN),
    kcap("Quote", "'", "Nudge +", C_YELLOW, "Nudge +", C_YELLOW, "Nudge +", C_YELLOW, "NUDGE +1ms", C_GREEN),
  ],
  [
    kcap("KeyZ", "Z", "Step 9", C_GREEN, "Pad 13 Dub", C_BLUE, "Quantize", C_TEAL, "⌘Z Undo", C_MUTED),
    kcap("KeyX", "X", "Step 10", C_GREEN, "Pad 14 Roll", C_BLUE, "Latch Roll", C_TEAL, "⌥X Dry FX", C_MUTED),
    kcap("KeyC", "C", "Step 11", C_GREEN, "Pad 15 Ride", C_BLUE, "Overdub", C_RED, "Step 11", C_MUTED),
    kcap("KeyV", "V", "Step 12", C_GREEN, "Pad 16 Crsh", C_BLUE, "Pad Mute", C_RED, "⌥V Variat", C_MUTED),
    kcap("KeyB", "B", "Step 13", C_GREEN, "BEAT SYNC", C_TEAL, "Pitch −1st", C_YELLOW, "DJS Sync", C_TEAL),
    kcap("KeyN", "N", "Step 14", C_GREEN, "CUE 1.1", C_RED, "Pitch +1st", C_YELLOW, "DJS Cue", C_RED),
    kcap("KeyM", "M", "Step 15", C_GREEN, "Mute Trk", C_RED, "Iso Mode", C_TEAL, "Step 15", C_MUTED),
    kcap("Comma", ",", "Step 16", C_GREEN, "Solo Trk", C_YELLOW, "FX Bypass", C_RED, "Step 16", C_MUTED),
    kcap("Period", ".", "Mute Row", C_RED, "Hold Drop", C_RED, "Reset FX", C_YELLOW, "Mute / FX", C_MUTED),
    kcap("Slash", "?", "How To", C_YELLOW, "How To", C_YELLOW, "How To", C_YELLOW, "Close ?", C_YELLOW),
  ],
];

export class HowToExplainer {
  private readonly modal: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx2d: CanvasRenderingContext2D;
  private readonly playBtn: HTMLButtonElement;
  private readonly scrub: HTMLInputElement;
  private readonly timeOut: HTMLElement;
  private readonly captionEl: HTMLElement;
  private readonly soundBtn: HTMLButtonElement;
  private readonly speedBtn: HTMLButtonElement;
  private readonly keyFeedbackEl: HTMLElement;
  private readonly chapterBtns: HTMLButtonElement[];
  private readonly modeSeqBtn: HTMLButtonElement;
  private readonly modeTrkBtn: HTMLButtonElement | null;
  private readonly modeDjsBtn: HTMLButtonElement | null;
  private readonly modeRmxBtn: HTMLButtonElement;
  private readonly modeSyncBtn: HTMLButtonElement | null;
  private readonly qsSeqEl: HTMLElement;
  private readonly qsTrkEl: HTMLElement | null;
  private readonly qsDjsEl: HTMLElement | null;
  private readonly qsRmxEl: HTMLElement;
  private readonly qsSyncEl: HTMLElement | null;
  private readonly qsTitleEl: HTMLElement;
  private readonly kbHeadingEl: HTMLElement;

  private openState = false;
  private guideMode: GuideMode = "sequencer";
  private playing = false;
  private currentSec = 0;
  private speed = 1;
  private soundOn = false;
  private lastFrameMs = 0;
  private rafId = 0;
  private lastChimeStep = -1;
  private activeCodes = new Set<string>();
  private audioCtx: AudioContext | null = null;

  constructor(root: HTMLElement) {
    this.modal = root.querySelector<HTMLElement>("#how-to-modal")!;
    this.canvas = root.querySelector<HTMLCanvasElement>("#manim-canvas")!;
    this.ctx2d = this.canvas.getContext("2d")!;
    this.playBtn = root.querySelector<HTMLButtonElement>("#howto-play")!;
    this.scrub = root.querySelector<HTMLInputElement>("#howto-scrub")!;
    this.timeOut = root.querySelector<HTMLElement>("#howto-time")!;
    this.captionEl = root.querySelector<HTMLElement>("#howto-caption")!;
    this.soundBtn = root.querySelector<HTMLButtonElement>("#howto-sound")!;
    this.speedBtn = root.querySelector<HTMLButtonElement>("#howto-speed")!;
    this.keyFeedbackEl = root.querySelector<HTMLElement>("#howto-live-key")!;
    this.chapterBtns = [...root.querySelectorAll<HTMLButtonElement>("[data-howto-chapter]")];
    this.modeSeqBtn = root.querySelector<HTMLButtonElement>("#howto-mode-seq")!;
    this.modeTrkBtn = root.querySelector<HTMLButtonElement>("#howto-mode-traktor");
    this.modeDjsBtn = root.querySelector<HTMLButtonElement>("#howto-mode-djs");
    this.modeRmxBtn = root.querySelector<HTMLButtonElement>("#howto-mode-rmx")!;
    this.modeSyncBtn = root.querySelector<HTMLButtonElement>("#howto-mode-sync");
    this.qsSeqEl = root.querySelector<HTMLElement>("#howto-qs-seq")!;
    this.qsTrkEl = root.querySelector<HTMLElement>("#howto-qs-traktor");
    this.qsDjsEl = root.querySelector<HTMLElement>("#howto-qs-djs");
    this.qsRmxEl = root.querySelector<HTMLElement>("#howto-qs-rmx")!;
    this.qsSyncEl = root.querySelector<HTMLElement>("#howto-qs-sync");
    this.qsTitleEl = root.querySelector<HTMLElement>("#howto-qs-title")!;
    this.kbHeadingEl = root.querySelector<HTMLElement>("#howto-kb-title")!;

    this.bind(root);
    this.syncGuideModeDom();
    this.renderUi();
  }

  get isOpen(): boolean {
    return this.openState;
  }

  get mode(): GuideMode {
    return this.guideMode;
  }

  private resolveMode(mode: GuideMode | "booth", rootDeck?: string): GuideMode {
    if (
      mode === "rmx" ||
      mode === "djs" ||
      mode === "traktor" ||
      mode === "sync" ||
      mode === "sequencer"
    ) {
      return mode;
    }
    return rootDeck === "djs" ? "djs" : rootDeck === "traktor" ? "traktor" : "sequencer";
  }

  setGuideMode(mode: GuideMode | "booth", boothDeck?: string): void {
    const resolved = this.resolveMode(mode, boothDeck);
    if (this.guideMode === resolved) return;
    this.guideMode = resolved;
    this.currentSec = 0;
    this.syncGuideModeDom();
    this.renderUi();
    if (this.openState) this.drawFrame();
  }

  open(mode?: GuideMode | "booth", boothDeck?: string): void {
    if (mode) {
      this.guideMode = this.resolveMode(mode, boothDeck);
      this.currentSec = 0;
      this.syncGuideModeDom();
    }
    if (this.openState) {
      this.renderUi();
      this.drawFrame();
      return;
    }
    this.openState = true;
    this.modal.hidden = false;
    this.playing = true;
    this.lastFrameMs = performance.now();
    this.scheduleFrame();
    this.renderUi();
  }

  close(): void {
    if (!this.openState) return;
    this.openState = false;
    this.playing = false;
    this.modal.hidden = true;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.renderUi();
  }

  toggle(mode?: GuideMode | "booth", boothDeck?: string): void {
    if (this.openState) this.close();
    else this.open(mode, boothDeck);
  }

  /** Highlights a pressed MacBook Air key live in the explainer diagram and canvas. */
  notifyKeyDown(code: string, description: string): void {
    this.activeCodes.add(code);
    const cap = this.modal.querySelector<HTMLElement>(`[data-key-code="${code}"]`);
    cap?.classList.add("kb-live");
    if (this.openState && description) {
      this.keyFeedbackEl.textContent = `Live Key: ${description}`;
      this.drawFrame();
    }
  }

  notifyKeyUp(code: string): void {
    this.activeCodes.delete(code);
    const cap = this.modal.querySelector<HTMLElement>(`[data-key-code="${code}"]`);
    cap?.classList.remove("kb-live");
    if (this.openState) this.drawFrame();
  }

  private activeChapters(): readonly Chapter[] {
    switch (this.guideMode) {
      case "traktor":
        return TRAKTOR_CHAPTERS;
      case "djs":
        return DJS_CHAPTERS;
      case "rmx":
        return RMX_CHAPTERS;
      case "sync":
        return SYNC_CHAPTERS;
      default:
        return SEQ_CHAPTERS;
    }
  }

  private activeCaptions(): readonly Caption[] {
    switch (this.guideMode) {
      case "traktor":
        return TRAKTOR_CAPTIONS;
      case "djs":
        return DJS_CAPTIONS;
      case "rmx":
        return RMX_CAPTIONS;
      case "sync":
        return SYNC_CAPTIONS;
      default:
        return SEQ_CAPTIONS;
    }
  }

  private syncGuideModeDom(): void {
    const m = this.guideMode;
    this.modal.dataset.guideMode = m;
    this.modeSeqBtn.setAttribute("aria-pressed", String(m === "sequencer"));
    this.modeTrkBtn?.setAttribute("aria-pressed", String(m === "traktor"));
    this.modeDjsBtn?.setAttribute("aria-pressed", String(m === "djs"));
    this.modeRmxBtn.setAttribute("aria-pressed", String(m === "rmx"));
    this.modeSyncBtn?.setAttribute("aria-pressed", String(m === "sync"));

    this.qsSeqEl.hidden = m !== "sequencer";
    if (this.qsTrkEl) this.qsTrkEl.hidden = m !== "traktor";
    if (this.qsDjsEl) this.qsDjsEl.hidden = m !== "djs";
    this.qsRmxEl.hidden = m !== "rmx";
    if (this.qsSyncEl) this.qsSyncEl.hidden = m !== "sync";

    const chapters = this.activeChapters();
    for (const [idx, btn] of this.chapterBtns.entries()) {
      const ch = chapters[idx];
      if (ch) btn.textContent = ch.title;
    }

    this.qsTitleEl.textContent =
      m === "traktor"
        ? "Operating Procedure · Pattern Player (Traktor Pro 4+ Mode)"
        : m === "djs"
          ? "Operating Procedure · Pioneer DJS-1000 Deck"
          : m === "rmx"
            ? "Operating Procedure · Pioneer RMX-1000 Station"
            : m === "sync"
              ? "Sync Procedure · Pioneer CDJ, Ableton Link & MIDI Clock"
              : "Operating Procedure · TR-REC 64-Step Drum Sequencer";

    this.kbHeadingEl.textContent = "Your keyboard is the machine";

    const trkOverrides: Record<string, [string, string]> = {
      Digit1: ["Pat 1 Sub", C_BLUE],
      Digit2: ["Pat 2 Off", C_BLUE],
      Digit3: ["Pat 3 Acid", C_BLUE],
      Digit4: ["Pat 4 Driv", C_BLUE],
      Digit5: ["Pat 5 Hse", C_TEAL],
      Digit6: ["Pat 6 Clap", C_TEAL],
      Digit7: ["Pat 7 Deep", C_TEAL],
      Digit8: ["Pat 8 Top", C_TEAL],
      Digit9: ["Pat 9 Brk1", C_PURPLE],
      Digit0: ["Pat 10 Brk2", C_PURPLE],
      Minus: ["Pat 11 Brk3", C_PURPLE],
      Equal: ["Pat 12 Brk4", C_PURPLE],
      KeyQ: ["Echo+HPF↑", C_YELLOW],
      KeyW: ["Noise+Swp↑", C_YELLOW],
      KeyE: ["Spiral+Rl↑", C_YELLOW],
      KeyR: ["DROP NOW!", C_RED],
      KeyT: ["SubKill+Rv", C_YELLOW],
      KeyY: ["Prev Kit", C_TEAL],
      KeyU: ["Ducking", C_GREEN],
      KeyI: ["Next Kit", C_TEAL],
      KeyO: ["Stem Cycle", C_PURPLE],
      KeyP: ["Reset Pat", C_RED],
      Period: ["KICK CUT", C_RED],
      Backslash: ["Actv/Pass", C_GREEN],
    };

    for (const cap of this.modal.querySelectorAll<HTMLElement>("[data-key-code]")) {
      const code = cap.dataset.keyCode ?? "";
      let subText =
        (m === "rmx"
          ? cap.dataset.rmxSub
          : m === "djs"
            ? cap.dataset.djsSub
            : m === "sync"
              ? cap.dataset.syncSub
              : cap.dataset.seqSub) ?? "";
      let accentColor =
        (m === "rmx"
          ? cap.dataset.rmxColor
          : m === "djs"
            ? cap.dataset.djsColor
            : m === "sync"
              ? cap.dataset.syncColor
              : cap.dataset.seqColor) ?? C_BLUE;
      if (m === "traktor" && trkOverrides[code]) {
        subText = trkOverrides[code]![0];
        accentColor = trkOverrides[code]![1];
      }
      const label = cap.dataset.keyLabel ?? "";
      cap.dataset.keyDesc = `${label} → ${subText}`;
      cap.title = `${label}: ${subText}`;
      cap.style.setProperty("--kb-accent", accentColor);
      const span = cap.querySelector("span");
      if (span) span.textContent = subText;
    }
  }

  private bind(root: HTMLElement): void {
    root.querySelector<HTMLButtonElement>("#how-to-btn")?.addEventListener("click", () => {
      const s = (root.dataset.surface as GuideMode | "booth" | undefined) ?? "sequencer";
      this.toggle(s, root.dataset.boothDeck);
    });
    root.querySelector<HTMLButtonElement>("#clock-sync-help")?.addEventListener("click", () => {
      this.open("sync");
    });
    root.querySelector<HTMLButtonElement>("#howto-close")?.addEventListener("click", () => this.close());
    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) this.close();
    });

    this.modeSeqBtn.addEventListener("click", () => this.setGuideMode("sequencer"));
    this.modeTrkBtn?.addEventListener("click", () => this.setGuideMode("traktor"));
    this.modeDjsBtn?.addEventListener("click", () => this.setGuideMode("djs"));
    this.modeRmxBtn.addEventListener("click", () => this.setGuideMode("rmx"));
    this.modeSyncBtn?.addEventListener("click", () => this.setGuideMode("sync"));

    this.playBtn.addEventListener("click", () => {
      this.playing = !this.playing;
      if (this.playing) {
        if (this.currentSec >= EXPLAINER_DURATION_SEC - 0.1) this.currentSec = 0;
        this.lastFrameMs = performance.now();
        this.scheduleFrame();
      }
      this.renderUi();
    });

    this.scrub.addEventListener("input", () => {
      this.currentSec = Number(this.scrub.value);
      this.renderUi();
      this.drawFrame();
    });

    for (const btn of this.chapterBtns) {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.howtoChapter);
        const ch = this.activeChapters()[idx];
        if (!ch) return;
        this.currentSec = ch.startSec;
        this.playing = true;
        this.lastFrameMs = performance.now();
        this.scheduleFrame();
        this.renderUi();
        this.drawFrame();
      });
    }

    this.speedBtn.addEventListener("click", () => {
      this.speed =
        this.speed === 1 ? 0.75 : this.speed === 0.75 ? 0.5 : this.speed === 0.5 ? 1.25 : 1;
      this.speedBtn.textContent = `${this.speed}×`;
    });

    this.soundBtn.addEventListener("click", () => {
      this.soundOn = !this.soundOn;
      this.soundBtn.setAttribute("aria-pressed", String(this.soundOn));
      this.soundBtn.textContent = this.soundOn ? "Chimes: ON" : "Chimes: OFF";
      if (this.soundOn) this.playChime(528, 0.12);
    });

    for (const cap of this.modal.querySelectorAll<HTMLElement>("[data-key-code]")) {
      cap.addEventListener("click", () => {
        const code = cap.dataset.keyCode ?? "";
        const label = cap.dataset.keyDesc ?? code;
        this.keyFeedbackEl.textContent = `Key: ${label}`;
        this.activeCodes.add(code);
        cap.classList.add("kb-live");
        this.drawFrame();
        setTimeout(() => {
          this.activeCodes.delete(code);
          cap.classList.remove("kb-live");
          if (this.openState) this.drawFrame();
        }, 450);
      });
    }
  }

  private scheduleFrame(): void {
    if (!this.rafId && this.openState) {
      this.rafId = requestAnimationFrame((now) => this.tick(now));
    }
  }

  private tick(now: number): void {
    this.rafId = 0;
    if (!this.openState) return;
    if (this.playing) {
      const dt = Math.min(0.1, Math.max(0, (now - this.lastFrameMs) / 1000));
      this.lastFrameMs = now;
      // Calm 3Blue1Brown pacing: steady 1x real-time progression across 30s chapters
      this.currentSec += dt * this.speed;
      if (this.currentSec >= EXPLAINER_DURATION_SEC) {
        this.currentSec = 0;
      }
      const chimeIdx = Math.floor(this.currentSec * 0.5);
      if (this.soundOn && chimeIdx !== this.lastChimeStep) {
        this.lastChimeStep = chimeIdx;
        const scale = [261.6, 329.6, 392.0, 523.25, 659.25];
        const freq = scale[chimeIdx % scale.length]!;
        if (chimeIdx % 2 === 0) this.playChime(freq, 0.05);
      }
      this.renderUi();
    }
    this.drawFrame();
    if (this.playing) {
      this.scheduleFrame();
    }
  }

  private playChime(freq: number, gainVal: number): void {
    try {
      const Ctor =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.audioCtx ??= new Ctor();
      if (this.audioCtx.state === "suspended") void this.audioCtx.resume();
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const g = this.audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(gainVal, now);
      g.gain.exponentialRampToValueAtTime(0.0005, now + 0.35);
      osc.connect(g);
      g.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } catch {
      /* ignore audio context restrictions */
    }
  }

  private formatTime(sec: number): string {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? "0" : ""}${rem}`;
  }

  private renderUi(): void {
    this.playBtn.textContent = this.playing ? "Pause" : "Play";
    this.playBtn.setAttribute("aria-pressed", String(this.playing));
    this.scrub.value = this.currentSec.toFixed(2);
    this.timeOut.textContent = `${this.formatTime(this.currentSec)} / ${this.formatTime(EXPLAINER_DURATION_SEC)}`;

    const chapters = this.activeChapters();
    const ch =
      chapters.find((c) => this.currentSec >= c.startSec && this.currentSec < c.endSec) ?? chapters[0]!;
    for (const [idx, btn] of this.chapterBtns.entries()) {
      btn.setAttribute("aria-pressed", String(idx === ch.id));
    }

    const captions = this.activeCaptions();
    const cap =
      captions.find((c) => this.currentSec >= c.from && this.currentSec < c.to) ??
      captions[captions.length - 1]!;
    if (this.captionEl.textContent !== cap.text) {
      this.captionEl.textContent = cap.text;
    }
  }

  private drawFrame(): void {
    const ctx = this.ctx2d;
    const W = 720;
    const H = 340;
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
    }

    const t = this.currentSec;

    // 1. Deep 3Blue1Brown Manim background + subtle coordinate lattice
    ctx.fillStyle = C_BG;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = C_GRID;
    ctx.lineWidth = 1;
    const gridStep = 36;
    for (let x = gridStep; x < W; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = gridStep; y < H; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // 2. Dispatch across all 5 guides (20 distinct 30-second visual chapters)
    if (this.guideMode === "traktor") {
      if (t < 30) this.drawTraktorChapter1KitsAndPatterns(ctx, W, H, t);
      else if (t < 60) this.drawTraktorChapter2ShapingAndDucking(ctx, W, H, t - 30);
      else if (t < 90) this.drawTraktorChapter3BuildupDrop(ctx, W, H, t - 60);
      else this.drawTraktorChapter4StepStrip(ctx, W, H, t - 90);
    } else if (this.guideMode === "djs") {
      if (t < 30) this.drawDjsChapter1PadMatrix(ctx, W, H, t);
      else if (t < 60) this.drawDjsChapter2PadModes(ctx, W, H, t - 30);
      else if (t < 90) this.drawDjsChapter3ScenesAndChain(ctx, W, H, t - 60);
      else this.drawDjsChapter4TouchStripAndSync(ctx, W, H, t - 90);
    } else if (this.guideMode === "rmx") {
      if (t < 30) this.drawRmxChapter1SignalFlow(ctx, W, H, t);
      else if (t < 60) this.drawRmxChapter2XPadRibbon(ctx, W, H, t - 30);
      else if (t < 90) this.drawRmxChapter3IsolatorAndScene(ctx, W, H, t - 60);
      else this.drawRmxChapter4ReleaseLever(ctx, W, H, t - 90);
    } else if (this.guideMode === "sync") {
      if (t < 30) this.drawSyncChapter1ProDjLink(ctx, W, H, t);
      else if (t < 60) this.drawSyncChapter2AbletonLink(ctx, W, H, t - 30);
      else if (t < 90) this.drawSyncChapter3MidiPll(ctx, W, H, t - 60);
      else this.drawSyncChapter4LatencyAlignment(ctx, W, H, t - 90);
    } else {
      if (t < 30) this.drawSeqChapter1PhaseCircle(ctx, W, H, t);
      else if (t < 60) this.drawSeqChapter2VoiceMatrix(ctx, W, H, t - 30);
      else if (t < 90) this.drawSeqChapter3TrCircuits(ctx, W, H, t - 60);
      else this.drawSeqChapter4SwingAndSync(ctx, W, H, t - 90);
    }
  }

  // =========================================================================
  // GUIDE 1: TR-REC STEP SEQUENCER (4 CHAPTERS)
  // =========================================================================

  private drawSeqChapter1PhaseCircle(
    ctx: CanvasRenderingContext2D,
    _W: number,
    _H: number,
    localT: number,
  ): void {
    const cx = 160;
    const cy = 168;
    const R = 90;
    const morph = smoothstep(7, 17, localT);

    ctx.fillStyle = C_TEXT;
    ctx.font = 'italic 18px Georgia, "Times New Roman", serif';
    ctx.fillText("Step Sequencer · 16-Step Phase Circle  →  Home & Bottom Rows", 24, 32);

    ctx.strokeStyle = C_AXIS;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - R - 18, cy);
    ctx.lineTo(cx + R + 18, cy);
    ctx.moveTo(cx, cy - R - 18);
    ctx.lineTo(cx, cy + R + 18);
    ctx.stroke();

    ctx.strokeStyle = C_BLUE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    const phase = (localT * 0.14) % 1;
    const activeStep = Math.floor(phase * 16);
    const angle = phase * Math.PI * 2 - Math.PI / 2;
    const vx = cx + Math.cos(angle) * R;
    const vy = cy + Math.sin(angle) * R;

    ctx.strokeStyle = C_YELLOW;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(vx, vy);
    ctx.stroke();

    ctx.fillStyle = C_YELLOW;
    ctx.beginPath();
    ctx.arc(vx, vy, 5, 0, Math.PI * 2);
    ctx.fill();

    const stepKeys = ["A", "S", "D", "F", "G", "H", "J", "K", "Z", "X", "C", "V", "B", "N", "M", ","];
    const hitSteps = new Set([0, 4, 8, 12, 2, 6, 10, 14]);
    const accentSteps = new Set([0, 8]);

    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
      const sx = cx + Math.cos(a) * R;
      const sy = cy + Math.sin(a) * R;

      const row = i < 8 ? 0 : 1;
      const col = i % 8;
      const tx = 340 + col * 44 + row * 12;
      const ty = 122 + row * 66;

      const x = sx + (tx - sx) * morph;
      const y = sy + (ty - sy) * morph;
      const isCurrent = i === activeStep;
      const isAccent = accentSteps.has(i);
      const isHit = hitSteps.has(i);

      if (morph > 0.03 && morph < 0.98) {
        ctx.strokeStyle = "rgba(88, 196, 221, 0.22)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      ctx.fillStyle = isCurrent
        ? "rgba(247, 209, 84, 0.28)"
        : isAccent
          ? "rgba(252, 98, 85, 0.22)"
          : isHit
            ? "rgba(131, 193, 103, 0.18)"
            : "rgba(22, 32, 50, 0.85)";
      ctx.strokeStyle = isCurrent ? C_YELLOW : isAccent ? C_RED : isHit ? C_GREEN : C_BLUE;
      ctx.lineWidth = isCurrent ? 2.4 : 1.5;

      ctx.beginPath();
      ctx.roundRect(x - 18, y - 19, 36, 38, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = C_TEXT;
      ctx.font = "bold 13px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(stepKeys[i]!, x, y - 2);

      ctx.fillStyle = isCurrent ? C_YELLOW : C_MUTED;
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(String(i + 1), x, y + 13);
    }
    ctx.textAlign = "left";

    if (morph > 0.35) {
      ctx.fillStyle = C_GREEN;
      ctx.font = 'italic 13.5px Georgia, "Times New Roman", serif';
      ctx.fillText("Home Row (Steps 1–8):  A  S  D  F  G  H  J  K", 340, 86);
      ctx.fillText("Bottom Row (Steps 9–16):  Z  X  C  V  B  N  M  ,", 350, 234);
    }

    // 4-Bar 64-Step Chain indicator on late beat of Chapter 1
    const chainAlpha = smoothstep(18, 22, localT);
    if (chainAlpha > 0.02) {
      ctx.save();
      ctx.globalAlpha = chainAlpha;
      const activeBar = Math.floor((localT * 0.35) % 4);
      const bars = ["BAR A (1–16)", "BAR B (17–32)", "BAR C (33–48)", "BAR D (49–64)"];
      for (let b = 0; b < 4; b++) {
        const bx = 64 + b * 154;
        const on = b === activeBar;
        ctx.fillStyle = on ? "rgba(177, 137, 198, 0.28)" : "rgba(18, 25, 40, 0.9)";
        ctx.strokeStyle = on ? C_YELLOW : C_PURPLE;
        ctx.lineWidth = on ? 2.1 : 1.3;
        ctx.beginPath();
        ctx.roundRect(bx, 282, 140, 34, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = on ? C_YELLOW : C_TEXT;
        ctx.font = "bold 11px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "center";
        ctx.fillText(bars[b]!, bx + 70, 304);
      }
      ctx.restore();
      ctx.textAlign = "left";
    }
  }

  private drawSeqChapter2VoiceMatrix(
    ctx: CanvasRenderingContext2D,
    _W: number,
    _H: number,
    localT: number,
  ): void {
    ctx.fillStyle = C_TEXT;
    ctx.font = 'italic 18px Georgia, "Times New Roman", serif';
    ctx.fillText("Step Sequencer · [1 – 0] Drum Voices, Classic Kits & ON AIR", 24, 32);

    const voices = ["BD", "SD", "LT", "MT", "HT", "RS", "CP", "CH", "OH", "CB"];
    const names = ["Kick", "Snare", "LoTom", "MidTom", "HiTom", "Rim", "Clap", "ClHat", "OpHat", "Bell"];
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
    const scanIdx = Math.floor((localT * 0.4) % 10);

    for (let i = 0; i < 10; i++) {
      const x = 44 + i * 64;
      const y = 60;
      const active = i === scanIdx || this.activeCodes.has(`Digit${keys[i]}`);

      ctx.fillStyle = active ? "rgba(88, 196, 221, 0.26)" : "rgba(22, 32, 50, 0.88)";
      ctx.strokeStyle = active ? C_YELLOW : C_BLUE;
      ctx.lineWidth = active ? 2.4 : 1.4;
      ctx.beginPath();
      ctx.roundRect(x, y, 54, 58, 7);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = C_TEXT;
      ctx.font = "bold 15px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(keys[i]!, x + 27, y + 19);

      ctx.fillStyle = active ? C_YELLOW : C_BLUE;
      ctx.font = "bold 11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(voices[i]!, x + 27, y + 36);

      ctx.fillStyle = C_MUTED;
      ctx.font = "9.5px system-ui, sans-serif";
      ctx.fillText(names[i]!, x + 27, y + 50);
    }

    const modY = 136;
    const boxes = [
      {
        title: "Press [1 .. 0]",
        line1: "Select drum row for",
        line2: "step editing & knobs",
        color: C_BLUE,
      },
      {
        title: "Shift + [1 .. 0]",
        line1: "Trigger drum voice",
        line2: "live with velocity",
        color: C_YELLOW,
      },
      {
        title: "ON AIR Switches",
        line1: "Solo TR Drums or",
        line2: "layer with DJS-1000",
        color: C_GREEN,
      },
    ];

    for (let b = 0; b < boxes.length; b++) {
      const item = boxes[b]!;
      const bx = 42 + b * 220;
      ctx.fillStyle = "rgba(18, 25, 40, 0.9)";
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(bx, modY, 204, 62, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = item.color;
      ctx.font = "bold 13px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "left";
      ctx.fillText(item.title, bx + 12, modY + 21);

      ctx.fillStyle = C_TEXT;
      ctx.font = "12px system-ui, -apple-system, sans-serif";
      ctx.fillText(item.line1, bx + 12, modY + 39);
      ctx.fillText(item.line2, bx + 12, modY + 54);
    }

    const kits = [
      { k: "Y", model: "TR-8O8", sub: "Sub Boom" },
      { k: "U", model: "TR-9O9", sub: "Club Punch" },
      { k: "I", model: "TR-7O7", sub: "Studio PCM" },
      { k: "O", model: "TR-6O6", sub: "Acid Silver" },
      { k: "P", model: "TR-9O9+", sub: "Overdrive" },
      { k: "Menu", model: "TR-72x", sub: "Latin Perc" },
      { k: "Menu", model: "CR-78", sub: "Vintage" },
    ];
    const activeKit = Math.floor((localT * 0.28) % kits.length);
    for (let k = 0; k < kits.length; k++) {
      const kx = 28 + k * 96;
      const ky = 224;
      const on = k === activeKit;
      ctx.fillStyle = on ? "rgba(92, 208, 179, 0.25)" : "rgba(22, 32, 50, 0.88)";
      ctx.strokeStyle = on ? C_YELLOW : C_TEAL;
      ctx.lineWidth = on ? 2.2 : 1.4;
      ctx.beginPath();
      ctx.roundRect(kx, ky, 88, 72, 7);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = on ? C_YELLOW : C_TEAL;
      ctx.font = "bold 13px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(kits[k]!.model, kx + 44, ky + 22);

      ctx.fillStyle = C_TEXT;
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(kits[k]!.sub, kx + 44, ky + 41);

      ctx.fillStyle = C_MUTED;
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(`Key: ${kits[k]!.k}`, kx + 44, ky + 59);
    }
    ctx.textAlign = "left";
  }

  private drawSeqChapter3TrCircuits(
    ctx: CanvasRenderingContext2D,
    _W: number,
    _H: number,
    localT: number,
  ): void {
    ctx.fillStyle = C_TEXT;
    ctx.font = 'italic 18px Georgia, "Times New Roman", serif';
    ctx.fillText("Step Sequencer · TR Drum Machine Analog & PCM Voice Circuits", 24, 32);

    const panels = [
      {
        title: "TR-8O8 Sub Kick vs TR-9O9 Club Kick",
        subtitle: "8O8 Bridged-T sub resonator · 9O9 2-stage pitch transient",
        color: C_BLUE,
        y0: 92,
      },
      {
        title: "6-Oscillator Metallic Hats & Choke",
        subtitle: "6 inharmonic square waves · Closed Hat chokes Open Hat",
        color: C_YELLOW,
        y0: 188,
      },
      {
        title: "TR-7O7 Snare · TR-72x Latin · CR-78 Wood",
        subtitle: "Gated snare snap · Bongo/Conga/Agogo · CR-78 woodblock",
        color: C_RED,
        y0: 284,
      },
    ];

    const pulsePhase = (localT * 0.2) % 1;

    for (let p = 0; p < panels.length; p++) {
      const pan = panels[p]!;
      ctx.fillStyle = pan.color;
      ctx.font = 'bold 14px Georgia, "Times New Roman", serif';
      ctx.fillText(pan.title, 26, pan.y0 - 18);

      ctx.fillStyle = C_MUTED;
      ctx.font = "12px system-ui, -apple-system, sans-serif";
      ctx.fillText(pan.subtitle, 26, pan.y0 + 2);

      const xStart = 325;
      const xWidth = 365;
      ctx.strokeStyle = C_AXIS;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xStart, pan.y0);
      ctx.lineTo(xStart + xWidth, pan.y0);
      ctx.stroke();

      ctx.strokeStyle = pan.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let ix = 0; ix <= xWidth; ix++) {
        const u = ix / xWidth;
        let sample = 0;
        if (p === 0) {
          const env = Math.exp(-u * 4.2);
          const instPhase = 2 * Math.PI * (12 * u - 2.8 * Math.exp(-u * 10));
          sample = env * Math.sin(instPhase - pulsePhase * Math.PI * 2);
        } else if (p === 1) {
          const env = Math.exp(-u * 7.5);
          const s =
            Math.sin(u * 85 + localT * 1.6) +
            Math.sin(u * 127 - localT * 1.2) +
            Math.sin(u * 159 + localT * 1.9);
          sample = (s / 3) * env;
        } else {
          const strikes = [0, 0.09, 0.19, 0.28];
          let env = 0;
          for (const st of strikes) {
            if (u >= st) env = Math.max(env, Math.exp(-(u - st) * 18));
          }
          if (u >= 0.28) env = Math.max(env, 0.45 * Math.exp(-(u - 0.28) * 3.8));
          const carrier = Math.sin(u * 160 + localT * 2.2) * Math.cos(u * 112);
          sample = env * carrier;
        }
        const py = pan.y0 - sample * 28;
        if (ix === 0) ctx.moveTo(xStart + ix, py);
        else ctx.lineTo(xStart + ix, py);
      }
      ctx.stroke();
    }
  }

  private drawSeqChapter4SwingAndSync(
    ctx: CanvasRenderingContext2D,
    _W: number,
    _H: number,
    localT: number,
  ): void {
    ctx.fillStyle = C_TEXT;
    ctx.font = 'italic 18px Georgia, "Times New Roman", serif';
    ctx.fillText("Step Sequencer · Shuffle Timing, Voice FX & Save / Reset", 24, 32);

    const swingAmount = 0.5 + 0.5 * Math.sin(localT * 0.4);
    ctx.fillStyle = C_BLUE;
    ctx.font = 'bold 13.5px Georgia, "Times New Roman", serif';
    ctx.fillText("Shuffle Timing: Even Sixteenth Steps (2, 4, 6, 8) Delay Smoothly", 34, 66);

    const barLeft = 42;
    const barW = 636;
    ctx.strokeStyle = C_AXIS;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(barLeft, 102);
    ctx.lineTo(barLeft + barW, 102);
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      const straightX = barLeft + (i / 7) * barW;
      const isEvenStep = i % 2 === 1;
      const swungX = isEvenStep ? straightX + swingAmount * 26 : straightX;

      ctx.strokeStyle = C_MUTED;
      ctx.beginPath();
      ctx.moveTo(straightX, 92);
      ctx.lineTo(straightX, 112);
      ctx.stroke();

      ctx.fillStyle = isEvenStep ? C_YELLOW : C_GREEN;
      ctx.beginPath();
      ctx.arc(swungX, 102, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = C_TEXT;
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(`Step ${i + 1}`, swungX, 128);
    }

    const cards = [
      {
        title: "Groove & Fill [⌥G / ⌥V / ⌥F]",
        sub1: "Humanize timing drift,",
        sub2: "Variation & 1-Bar Auto-Fill",
        color: C_PURPLE,
      },
      {
        title: "Voice & Group FX [Ctrl+1–0]",
        sub1: "Row EC/RV/FL · ⌥E/R/D",
        sub2: "⇧Q Snare · ⇧W Hats · ⇧E Toms",
        color: C_YELLOW,
      },
      {
        title: "Save & Factory Reset",
        sub1: "Save stores startup session",
        sub2: "Reset clears all 3 machines",
        color: C_GREEN,
      },
    ];

    for (let c = 0; c < cards.length; c++) {
      const card = cards[c]!;
      const cx = 36 + c * 222;
      const cy = 164;
      ctx.fillStyle = "rgba(18, 26, 42, 0.92)";
      ctx.strokeStyle = card.color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(cx, cy, 204, 88, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = card.color;
      ctx.font = "bold 12.5px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "left";
      ctx.fillText(card.title, cx + 12, cy + 26);

      ctx.fillStyle = C_TEXT;
      ctx.font = "12px system-ui, -apple-system, sans-serif";
      ctx.fillText(card.sub1, cx + 12, cy + 50);
      ctx.fillText(card.sub2, cx + 12, cy + 68);
    }

    ctx.fillStyle = C_YELLOW;
    ctx.font = 'italic 14px Georgia, "Times New Roman", serif';
    ctx.textAlign = "center";
    ctx.fillText(
      "Open the DJ Sync tab above for Pioneer CDJ Pro DJ Link, Ableton Link & MIDI setup",
      360,
      304,
    );
    ctx.textAlign = "left";
  }

  // =========================================================================
  // GUIDE 2: PIONEER DJS-1000 DECK (4 CHAPTERS)
  // =========================================================================

  private drawDjsChapter1PadMatrix(
    ctx: CanvasRenderingContext2D,
    _W: number,
    _H: number,
    localT: number,
  ): void {
    ctx.fillStyle = C_TEXT;
    ctx.font = 'italic 18px Georgia, "Times New Roman", serif';
    ctx.fillText("DJS-1000 Deck · Bijection from 4×4 Left-Hand Keys to 16 RGB Pads", 24, 32);

    const keyGrid = [
      ["1", "2", "3", "4"],
      ["Q", "W", "E", "R"],
      ["A", "S", "D", "F"],
      ["Z", "X", "C", "V"],
    ];
    const codeGrid = [
      ["Digit1", "Digit2", "Digit3", "Digit4"],
      ["KeyQ", "KeyW", "KeyE", "KeyR"],
      ["KeyA", "KeyS", "KeyD", "KeyF"],
      ["KeyZ", "KeyX", "KeyC", "KeyV"],
    ];
    const padLabels = [
      ["BD", "SD", "LT", "MT"],
      ["HT", "RS", "CP", "CH"],
      ["OH", "CB", "BD+", "SD×2"],
      ["DUB", "ROLL", "RIDE", "CRSH"],
    ];
    const rowColors = [C_RED, C_YELLOW, C_BLUE, C_GREEN];

    const scanPad = Math.floor((localT * 0.65) % 16);
    const linkAlpha = smoothstep(3, 10, localT);

    ctx.fillStyle = C_MUTED;
    ctx.font = "bold 11.5px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("MACBOOK AIR LEFT-HAND 4×4", 54, 62);
    ctx.fillText("DJS-1000 4×4 PERFORMANCE PADS", 422, 62);

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const idx = r * 4 + c;
        const code = codeGrid[r]![c]!;
        const isLive = this.activeCodes.has(code);
        const active = isLive || idx === scanPad;
        const kx = 54 + c * 52 + r * 8;
        const ky = 78 + r * 50;
        const px = 422 + c * 64;
        const py = 74 + r * 52;
        const col = rowColors[r]!;

        if (active && linkAlpha > 0.05) {
          ctx.save();
          ctx.globalAlpha = linkAlpha;
          ctx.strokeStyle = C_YELLOW;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(kx + 42, ky + 20);
          ctx.bezierCurveTo(kx + 115, ky + 20, px - 75, py + 22, px, py + 22);
          ctx.stroke();
          ctx.restore();
        }

        // Left: MacBook keycap
        ctx.fillStyle = active ? "rgba(247, 209, 84, 0.28)" : "rgba(20, 28, 44, 0.9)";
        ctx.strokeStyle = active ? C_YELLOW : col;
        ctx.lineWidth = active ? 2.4 : 1.4;
        ctx.beginPath();
        ctx.roundRect(kx, ky, 42, 40, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = C_TEXT;
        ctx.font = "bold 14px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "center";
        ctx.fillText(keyGrid[r]![c]!, kx + 21, ky + 25);

        // Right: DJS-1000 RGB Pad
        ctx.fillStyle = active ? "rgba(88, 196, 221, 0.3)" : "rgba(18, 25, 40, 0.92)";
        ctx.strokeStyle = active ? C_YELLOW : col;
        ctx.lineWidth = active ? 2.6 : 1.6;
        ctx.beginPath();
        ctx.roundRect(px, py, 56, 44, 7);
        ctx.fill();
        ctx.stroke();

        if (active) {
          const ripple = ((localT * 1.4) % 1) * 10;
          ctx.strokeStyle = "rgba(247, 209, 84, 0.45)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.roundRect(px - ripple * 0.5, py - ripple * 0.5, 56 + ripple, 44 + ripple, 9);
          ctx.stroke();
        }

        ctx.fillStyle = active ? C_YELLOW : col;
        ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillText(padLabels[r]![c]!, px + 28, py + 20);
        ctx.fillStyle = C_MUTED;
        ctx.font = "9.5px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillText(`P${idx + 1} [${keyGrid[r]![c]!}]`, px + 28, py + 35);
      }
    }
    ctx.textAlign = "center";
    ctx.fillStyle = C_GREEN;
    ctx.font = 'italic 14px Georgia, "Times New Roman", serif';
    ctx.fillText(
      "Every pad triggers sound immediately — hold Shift + pad key for an accented hit",
      360,
      314,
    );
    ctx.textAlign = "left";
  }

  private drawDjsChapter2PadModes(
    ctx: CanvasRenderingContext2D,
    _W: number,
    _H: number,
    localT: number,
  ): void {
    ctx.fillStyle = C_TEXT;
    ctx.font = 'italic 18px Georgia, "Times New Roman", serif';
    ctx.fillText("DJS-1000 · 4 Performance Pad Modes on Keys [5], [6], [7], [8]", 24, 32);

    const modes = [
      { key: "5", name: "TRACK PLAY", sub: "10 Drums + 6 Macros", color: C_BLUE },
      { key: "6", name: "MUTE / SOLO", sub: "Stem Cuts & All-On", color: C_GREEN },
      { key: "7", name: "16-PAD PITCH", sub: "Chromatic -7..+8 st", color: C_PURPLE },
      { key: "8", name: "HOT ROLL", sub: "4 Divs × 4 Pitches", color: C_YELLOW },
    ];
    const activeMode = Math.floor(localT / 7.5) % 4;

    for (let m = 0; m < 4; m++) {
      const mx = 28 + m * 170;
      const my = 54;
      const on = m === activeMode;
      ctx.fillStyle = on ? "rgba(88, 196, 221, 0.24)" : "rgba(18, 25, 40, 0.9)";
      ctx.strokeStyle = on ? C_YELLOW : modes[m]!.color;
      ctx.lineWidth = on ? 2.4 : 1.4;
      ctx.beginPath();
      ctx.roundRect(mx, my, 156, 58, 7);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = on ? C_YELLOW : modes[m]!.color;
      ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(`[${modes[m]!.key}] ${modes[m]!.name}`, mx + 78, my + 24);
      ctx.fillStyle = C_TEXT;
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(modes[m]!.sub, mx + 78, my + 44);
    }
    ctx.textAlign = "left";

    // Left lower diagram: 16-Pad Chromatic Pitch exponential curve f_k = f_0 * 2^((k-7)/12)
    ctx.fillStyle = "rgba(18, 25, 40, 0.9)";
    ctx.strokeStyle = activeMode === 2 ? C_YELLOW : C_PURPLE;
    ctx.lineWidth = activeMode === 2 ? 2.2 : 1.5;
    ctx.beginPath();
    ctx.roundRect(28, 130, 324, 180, 9);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = C_PURPLE;
    ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("[7] 16-PAD PITCH: f(k) = f₀ · 2^((k−7)/12)", 44, 154);

    const gx = 48;
    const gy = 274;
    const gw = 284;
    const gh = 96;
    ctx.strokeStyle = C_AXIS;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + gw, gy);
    ctx.stroke();

    ctx.strokeStyle = C_PURPLE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let k = 0; k < 16; k++) {
      const x = gx + (k / 15) * gw;
      const ratio = Math.pow(2, (k - 7) / 12); // ~0.667 .. ~1.587
      const norm = (ratio - 0.65) / 0.98;
      const y = gy - norm * gh;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    for (let k = 0; k < 16; k++) {
      const x = gx + (k / 15) * gw;
      const ratio = Math.pow(2, (k - 7) / 12);
      const y = gy - ((ratio - 0.65) / 0.98) * gh;
      const isRoot = k === 7;
      ctx.fillStyle = isRoot ? C_YELLOW : C_BLUE;
      ctx.beginPath();
      ctx.arc(x, y, isRoot ? 5.5 : 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = C_YELLOW;
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("Pad 8 [Key R] = 0 st Root · Range: −7 st .. +8 st", 44, 296);

    // Right lower diagram: Hot Roll 4x4 Cartesian product {1/4, 1/8, 1/16, 1/32} x {0, +3, +7, -5 st}
    ctx.fillStyle = "rgba(18, 25, 40, 0.9)";
    ctx.strokeStyle = activeMode === 3 ? C_YELLOW : C_TEAL;
    ctx.lineWidth = activeMode === 3 ? 2.2 : 1.5;
    ctx.beginPath();
    ctx.roundRect(368, 130, 324, 180, 9);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = C_TEAL;
    ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("[8] HOT ROLL MATRIX (HOLD PAD KEY)", 384, 154);

    const divs = ["1/4", "1/8", "1/16", "1/32"];
    const semis = ["0st", "+3st", "+7st", "−5st"];
    const rollScan = Math.floor((localT * 0.9) % 16);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cx = 386 + c * 72;
        const cy = 168 + r * 31;
        const on = r * 4 + c === rollScan && activeMode === 3;
        ctx.fillStyle = on ? "rgba(247, 209, 84, 0.3)" : "rgba(12, 18, 30, 0.9)";
        ctx.strokeStyle = on ? C_YELLOW : C_AXIS;
        ctx.lineWidth = on ? 2 : 1;
        ctx.beginPath();
        ctx.roundRect(cx, cy, 66, 25, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = on ? C_YELLOW : C_TEXT;
        ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${divs[c]} ${semis[r]}`, cx + 33, cy + 16);
      }
    }
    ctx.textAlign = "left";
  }

  private drawDjsChapter3ScenesAndChain(
    ctx: CanvasRenderingContext2D,
    _W: number,
    _H: number,
    localT: number,
  ): void {
    ctx.fillStyle = C_TEXT;
    ctx.font = 'italic 18px Georgia, "Times New Roman", serif';
    ctx.fillText("DJS-1000 · 8 Scenes [9/0], Capture [P] & 64-Step Live Rec [U]", 24, 32);

    const sceneColors = [C_BLUE, C_RED, C_YELLOW, C_GREEN, C_PURPLE, C_YELLOW, C_RED, C_TEAL];
    const activeScene = Math.floor((localT * 0.25) % 8);

    ctx.fillStyle = C_MUTED;
    ctx.font = "bold 11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("8 SCENE SLOTS  —  Press [9] / [0] or [⌥+1..8] to Switch  ·  Press [P] to Capture", 34, 60);

    for (let s = 0; s < 8; s++) {
      const sx = 34 + s * 82;
      const sy = 72;
      const on = s === activeScene;
      ctx.fillStyle = on ? "rgba(88, 196, 221, 0.26)" : "rgba(18, 26, 42, 0.9)";
      ctx.strokeStyle = on ? C_YELLOW : sceneColors[s]!;
      ctx.lineWidth = on ? 2.4 : 1.4;
      ctx.beginPath();
      ctx.roundRect(sx, sy, 74, 46, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = on ? C_YELLOW : C_TEXT;
      ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(`SCENE ${s + 1}`, sx + 37, sy + 21);
      ctx.fillStyle = C_MUTED;
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText("64 Steps", sx + 37, sy + 37);
    }

    // 4-Bar x 16-Step = 64-Step Quantized Live Overdub Timeline
    ctx.textAlign = "left";
    ctx.fillStyle = C_TEAL;
    ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("64-STEP BAR CHAIN [I = Bar A–D · O = Chain 64]  +  QUANTIZE [Y]  +  LIVE REC [U]", 34, 152);

    const step64 = Math.floor((localT * 3.2) % 64);
    const activeBarIdx = Math.floor(step64 / 16);
    const barNames = ["BAR A", "BAR B", "BAR C", "BAR D"];

    for (let b = 0; b < 4; b++) {
      const bx = 34 + b * 166;
      const by = 168;
      const isBar = b === activeBarIdx;
      ctx.fillStyle = isBar ? "rgba(92, 208, 179, 0.2)" : "rgba(16, 23, 36, 0.9)";
      ctx.strokeStyle = isBar ? C_YELLOW : C_TEAL;
      ctx.lineWidth = isBar ? 2.2 : 1.3;
      ctx.beginPath();
      ctx.roundRect(bx, by, 156, 86, 7);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isBar ? C_YELLOW : C_TEXT;
      ctx.font = "bold 11.5px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(barNames[b]!, bx + 10, by + 20);

      for (let st = 0; st < 16; st++) {
        const rx = bx + 10 + (st % 8) * 17.5;
        const ry = by + 32 + Math.floor(st / 8) * 22;
        const isHead = isBar && st === step64 % 16;
        const hasHit = st % 4 === 0 || (b === 3 && st >= 13);
        ctx.fillStyle = isHead ? C_YELLOW : hasHit ? C_RED : "rgba(43, 59, 85, 0.65)";
        ctx.fillRect(rx, ry, 13, 14);
      }
    }

    ctx.fillStyle = C_GREEN;
    ctx.font = 'italic 14px Georgia, "Times New Roman", serif';
    ctx.textAlign = "center";
    ctx.fillText(
      "When LIVE REC [U] and QUANTIZE [Y] are active, pad hits snap cleanly to the nearest 16th step",
      360,
      298,
    );
    ctx.textAlign = "left";
  }

  private drawDjsChapter4TouchStripAndSync(
    ctx: CanvasRenderingContext2D,
    _W: number,
    _H: number,
    localT: number,
  ): void {
    ctx.fillStyle = C_TEXT;
    ctx.font = 'italic 18px Georgia, "Times New Roman", serif';
    ctx.fillText("DJS-1000 · Touch Strip [G H J K] & CDJ Beat Sync [B / N]", 24, 32);

    // Left card: Touch Strip Note Repeat & Pitch Bend
    ctx.fillStyle = "rgba(18, 25, 40, 0.92)";
    ctx.strokeStyle = C_YELLOW;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(28, 56, 320, 248, 9);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = C_YELLOW;
    ctx.font = "bold 12.5px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("LEFT TOUCH STRIP · [T] REPEAT / PITCH", 44, 82);

    const stripCells = [
      { div: "1/32", key: "Hold K", pulses: 16 },
      { div: "1/16", key: "Hold J", pulses: 10 },
      { div: "1/8", key: "Hold H", pulses: 6 },
      { div: "1/4", key: "Hold G", pulses: 4 },
    ];
    const activeCell = Math.floor((localT * 0.35) % 4);
    for (let i = 0; i < 4; i++) {
      const sy = 98 + i * 46;
      const on = i === activeCell;
      ctx.fillStyle = on ? "rgba(247, 209, 84, 0.28)" : "rgba(12, 17, 28, 0.9)";
      ctx.strokeStyle = on ? C_YELLOW : C_AXIS;
      ctx.lineWidth = on ? 2.2 : 1.2;
      ctx.beginPath();
      ctx.roundRect(44, sy, 128, 36, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = on ? C_YELLOW : C_TEXT;
      ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(`${stripCells[i]!.div} · ${stripCells[i]!.key}`, 56, sy + 22);

      // Pulse train preview
      const n = stripCells[i]!.pulses;
      for (let p = 0; p < n; p++) {
        const px = 188 + (p / Math.max(1, n - 1)) * 140;
        ctx.strokeStyle = on ? C_YELLOW : C_MUTED;
        ctx.lineWidth = on ? 2.2 : 1.2;
        ctx.beginPath();
        ctx.moveTo(px, sy + 30);
        ctx.lineTo(px, sy + 10);
        ctx.stroke();
      }
    }

    // Right card: CDJ Phase Vector Lock (BEAT SYNC [B], CUE [N], Nudge [; / '])
    ctx.fillStyle = "rgba(18, 25, 40, 0.92)";
    ctx.strokeStyle = C_TEAL;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(368, 56, 324, 248, 9);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = C_TEAL;
    ctx.font = "bold 12.5px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("CDJ TRANSPORT · [B] SYNC · [N] CUE", 384, 82);

    const cx = 530;
    const cy = 176;
    const R = 64;
    ctx.strokeStyle = C_AXIS;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    const masterAngle = ((localT * 0.5) % 1) * Math.PI * 2 - Math.PI / 2;
    const lockFactor = smoothstep(4, 14, localT % 20);
    const djsAngle = masterAngle + (1 - lockFactor) * 0.9;

    // Master CDJ vector (Cyan)
    ctx.strokeStyle = C_BLUE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(masterAngle) * R, cy + Math.sin(masterAngle) * R);
    ctx.stroke();

    // DJS-1000 vector converging to Master (Yellow)
    ctx.strokeStyle = C_YELLOW;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(djsAngle) * (R - 8), cy + Math.sin(djsAngle) * (R - 8));
    ctx.stroke();

    ctx.fillStyle = lockFactor > 0.85 ? C_GREEN : C_YELLOW;
    ctx.font = "bold 11.5px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      lockFactor > 0.85 ? "BEAT SYNC LOCKED (Δφ = 0.0 ms)" : "CONVERGING TO MASTER BEAT...",
      530,
      268,
    );
    ctx.fillStyle = C_MUTED;
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("[;] / ['] Phase Nudge  ·  [ [ ] / [ ] ] BPM", 530, 290);
    ctx.textAlign = "left";
  }

  // =========================================================================
  // GUIDE 3: PIONEER RMX-1000 STATION (4 CHAPTERS)
  // =========================================================================

  private drawRmxChapter1SignalFlow(
    ctx: CanvasRenderingContext2D,
    _W: number,
    _H: number,
    localT: number,
  ): void {
    ctx.fillStyle = C_TEXT;
    ctx.font = 'italic 18px Georgia, "Times New Roman", serif';
    ctx.fillText("RMX-1000 Station · 4-Stage Signal Chain & Full Keyboard Control", 24, 32);

    const stages = [
      {
        title: "1. X-PAD FX",
        sub1: "Pads 1–4 · Bank [K]",
        sub2: "Roll Ribbon [5–0]",
        sub3: "Z Quant · X Latch · C Rec",
        color: C_BLUE,
      },
      {
        title: "2. ISOLATOR FX",
        sub1: "Kill Low/Mid/Hi [Q/W/E]",
        sub2: "Mode Cycle [M]",
        sub3: "24 dB/oct Linkwitz-Riley",
        color: C_TEAL,
      },
      {
        title: "3. SCENE FX",
        sub1: "Build Up [Y U I O P]",
        sub2: "Break Down [A S D F G]",
        sub3: "Scene Level [H / J]",
        color: C_YELLOW,
      },
      {
        title: "4. RELEASE FX",
        sub1: "Hold [R] Spring Lever",
        sub2: "Mode [T]: Brake/Echo/Spin",
        sub3: "[,] Bypass · [.] Reset FX",
        color: C_RED,
      },
    ];

    const activeStage = Math.floor((localT * 0.25) % 4);
    for (let i = 0; i < stages.length; i++) {
      const st = stages[i]!;
      const x = 24 + i * 172;
      const y = 78;
      const w = 154;
      const h = 154;
      const on = i === activeStage;

      ctx.fillStyle = on ? "rgba(88, 196, 221, 0.2)" : "rgba(18, 26, 42, 0.9)";
      ctx.strokeStyle = on ? C_YELLOW : st.color;
      ctx.lineWidth = on ? 2.6 : 1.6;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 9);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = on ? C_YELLOW : st.color;
      ctx.font = "bold 13px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(st.title, x + 12, y + 28);

      ctx.fillStyle = C_TEXT;
      ctx.font = "11.5px system-ui, -apple-system, sans-serif";
      ctx.fillText(st.sub1, x + 12, y + 62);
      ctx.fillText(st.sub2, x + 12, y + 88);
      ctx.fillStyle = C_MUTED;
      ctx.fillText(st.sub3, x + 12, y + 116);

      if (i < stages.length - 1) {
        const ax = x + w + 3;
        const ay = y + h / 2;
        ctx.strokeStyle = C_YELLOW;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax + 12, ay);
        ctx.stroke();
      }
    }

    ctx.fillStyle = C_GREEN;
    ctx.font = 'italic 14px Georgia, "Times New Roman", serif';
    ctx.textAlign = "center";
    ctx.fillText(
      "Press [,] to bypass RMX-1000 cleanly, or press [Shift + `] for MacBook Air 13\" Booth Split",
      360,
      286,
    );
    ctx.textAlign = "left";
  }

  private drawRmxChapter2XPadRibbon(
    ctx: CanvasRenderingContext2D,
    _W: number,
    _H: number,
    localT: number,
  ): void {
    ctx.fillStyle = C_TEXT;
    ctx.font = 'italic 18px Georgia, "Times New Roman", serif';
    ctx.fillText("RMX-1000 · X-Pad Slots [1–4], Roll Ribbon [5–0] & Overdub [C]", 24, 32);

    const pads = [
      { slot: "PAD 1 · BD Kick", keys: "Key [1]" },
      { slot: "PAD 2 · SD Snare", keys: "Key [2]" },
      { slot: "PAD 3 · CP Clap", keys: "Key [3]" },
      { slot: "PAD 4 · CH Hi-Hat", keys: "Key [4] · [K] Bank" },
    ];
    const activePad = Math.floor((localT * 0.35) % 4);
    for (let p = 0; p < 4; p++) {
      const px = 34 + p * 166;
      const py = 58;
      const on = p === activePad || this.activeCodes.has(`Digit${p + 1}`);
      ctx.fillStyle = on ? "rgba(88, 196, 221, 0.28)" : "rgba(20, 30, 46, 0.9)";
      ctx.strokeStyle = on ? C_YELLOW : C_BLUE;
      ctx.lineWidth = on ? 2.4 : 1.5;
      ctx.beginPath();
      ctx.roundRect(px, py, 152, 62, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = C_TEXT;
      ctx.font = "bold 12.5px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(pads[p]!.slot, px + 76, py + 25);

      ctx.fillStyle = on ? C_YELLOW : C_MUTED;
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(pads[p]!.keys, px + 76, py + 45);
    }

    const divs = [
      { label: "1/1", key: "Hold 5", pulses: 1 },
      { label: "1/2", key: "Hold 6", pulses: 2 },
      { label: "1/4", key: "Hold 7", pulses: 4 },
      { label: "1/8", key: "Hold 8", pulses: 8 },
      { label: "1/16", key: "Hold 9", pulses: 16 },
      { label: "1/32", key: "Hold 0", pulses: 24 },
    ];
    const activeDivIdx = Math.floor((localT * 0.26) % 6);

    ctx.fillStyle = C_YELLOW;
    ctx.font = 'bold 13px Georgia, "Times New Roman", serif';
    ctx.textAlign = "left";
    ctx.fillText("TOUCH ROLL RIBBON  —  Hold Keys [5, 6, 7, 8, 9, 0]  ·  Pitch [B / N]:", 34, 152);

    for (let d = 0; d < divs.length; d++) {
      const dx = 34 + d * 110;
      const dy = 166;
      const isRoll = d === activeDivIdx;
      ctx.fillStyle = isRoll ? "rgba(247, 209, 84, 0.3)" : "rgba(18, 28, 44, 0.92)";
      ctx.strokeStyle = isRoll ? C_YELLOW : C_TEAL;
      ctx.lineWidth = isRoll ? 2.4 : 1.4;
      ctx.beginPath();
      ctx.roundRect(dx, dy, 100, 62, 7);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = C_TEXT;
      ctx.font = "bold 15px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(divs[d]!.label, dx + 50, dy + 25);

      ctx.fillStyle = isRoll ? C_YELLOW : C_TEAL;
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(divs[d]!.key, dx + 50, dy + 46);
    }

    const pulses = divs[activeDivIdx]!.pulses;
    const trainLeft = 42;
    const trainW = 636;
    ctx.strokeStyle = C_AXIS;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(trainLeft, 274);
    ctx.lineTo(trainLeft + trainW, 274);
    ctx.stroke();

    for (let k = 0; k < pulses; k++) {
      const px = trainLeft + (k / Math.max(1, pulses - 1)) * trainW;
      ctx.strokeStyle = C_YELLOW;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(px, 274);
      ctx.lineTo(px, 248);
      ctx.stroke();
    }
    ctx.fillStyle = C_MUTED;
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "[Z] Quantize  ·  [X] Latch Roll  ·  [C] Overdub  ·  [V] Pad Mute  ·  [⌫] Erase Pad",
      360,
      310,
    );
    ctx.textAlign = "left";
  }

  private drawRmxChapter3IsolatorAndScene(
    ctx: CanvasRenderingContext2D,
    _W: number,
    _H: number,
    localT: number,
  ): void {
    ctx.fillStyle = C_TEXT;
    ctx.font = 'italic 18px Georgia, "Times New Roman", serif';
    ctx.fillText("RMX-1000 · Isolator Kills [Q / W / E] & Scene FX [Y–P / A–G]", 24, 32);

    ctx.fillStyle = "rgba(18, 25, 40, 0.9)";
    ctx.strokeStyle = C_TEAL;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(28, 56, 310, 248, 9);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = C_TEAL;
    ctx.font = "bold 12.5px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("ISOLATOR FX · [Q/W/E] KILL · [M] MODE", 44, 82);

    const bands = [
      { name: "[Q] LOW (Sub & Kick)", kill: Math.floor(localT / 6) % 3 === 0 || this.activeCodes.has("KeyQ"), color: C_RED },
      { name: "[W] MID (Snare & Body)", kill: Math.floor(localT / 6) % 3 === 1 || this.activeCodes.has("KeyW"), color: C_YELLOW },
      { name: "[E] HIGH (Hats & Air)", kill: Math.floor(localT / 6) % 3 === 2 || this.activeCodes.has("KeyE"), color: C_BLUE },
    ];
    for (let b = 0; b < bands.length; b++) {
      const band = bands[b]!;
      const by = 104 + b * 62;
      ctx.fillStyle = C_TEXT;
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(band.name, 44, by + 14);

      ctx.fillStyle = "rgba(11, 13, 20, 0.9)";
      ctx.fillRect(44, by + 22, 186, 16);
      const fillW = band.kill ? 6 : 152;
      ctx.fillStyle = band.kill ? C_RED : band.color;
      ctx.fillRect(44, by + 22, fillW, 16);

      ctx.fillStyle = band.kill ? C_RED : C_MUTED;
      ctx.font = "bold 11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(band.kill ? "KILL (-∞dB)" : "0 dB LIVE", 240, by + 34);
    }

    ctx.fillStyle = "rgba(18, 25, 40, 0.9)";
    ctx.strokeStyle = C_BLUE;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(362, 56, 330, 248, 9);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = C_BLUE;
    ctx.font = "bold 12.5px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("SCENE FX · LEVEL [H] −10% / [J] +10%", 378, 82);

    const buildProgress = (localT * 0.1) % 1;
    const gx = 382;
    const gy = 224;
    const gw = 290;
    const gh = 106;

    ctx.strokeStyle = C_AXIS;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + gw, gy);
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx, gy - gh);
    ctx.stroke();

    ctx.strokeStyle = C_BLUE;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let ix = 0; ix <= gw; ix++) {
      const u = ix / gw;
      const y = gy - u * u * gh;
      if (ix === 0) ctx.moveTo(gx + ix, y);
      else ctx.lineTo(gx + ix, y);
    }
    ctx.stroke();

    const dotX = gx + buildProgress * gw;
    const dotY = gy - buildProgress * buildProgress * gh;
    ctx.fillStyle = C_YELLOW;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = C_TEXT;
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("[Y U I O P] BPF · Echo · Noise · Spiral↑ · Rev↑", 378, 254);
    ctx.fillStyle = C_MUTED;
    ctx.fillText("[A S D F G] HPF · LPF · Crush · Spiral↓ · Rev↓", 378, 276);
  }

  private drawRmxChapter4ReleaseLever(
    ctx: CanvasRenderingContext2D,
    _W: number,
    _H: number,
    localT: number,
  ): void {
    ctx.fillStyle = C_TEXT;
    ctx.font = 'italic 18px Georgia, "Times New Roman", serif';
    ctx.fillText("RMX-1000 · Release FX Mode [T] & Spring Lever [Hold R]", 24, 32);

    const cycle = (localT % 15) / 15;
    const isBuild = cycle < 0.55;
    const isHoldR = (cycle >= 0.55 && cycle < 0.8) || this.activeCodes.has("KeyR");

    const phaseTitle = isHoldR
      ? "PHASE 2: HOLD [R] — RELEASE FX ENGAGED (Dry Mix Muted · Brake / Spin / Echo)"
      : isBuild
        ? "PHASE 1: PRESS [J] TO RAISE SCENE FX — Building Tension Toward Beat 1"
        : "PHASE 3: RELEASE [R] — Scene FX Resets to 0% & Clean Beat Returns!";

    ctx.fillStyle = isHoldR ? C_RED : isBuild ? C_BLUE : C_GREEN;
    ctx.font = "bold 13px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(phaseTitle, 32, 68);

    const gx = 42;
    const gy = 216;
    const gw = 636;
    const gh = 110;

    ctx.strokeStyle = C_AXIS;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + gw, gy);
    ctx.stroke();

    ctx.strokeStyle = C_BLUE;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let ix = 0; ix <= gw; ix++) {
      const u = ix / gw;
      const level = u < 0.55 ? u / 0.55 : u < 0.8 ? 1 - (u - 0.55) / 0.25 : 0;
      const py = gy - level * gh;
      if (ix === 0) ctx.moveTo(gx + ix, py);
      else ctx.lineTo(gx + ix, py);
    }
    ctx.stroke();

    const curX = gx + cycle * gw;
    ctx.strokeStyle = C_YELLOW;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(curX, gy - gh - 12);
    ctx.lineTo(curX, gy + 12);
    ctx.stroke();

    const modes = [
      { name: "[T] VINYL BRAKE", desc: "Turntable motor power-off slowdown" },
      { name: "[T] ECHO OUT", desc: "Feedback delay tail into silence" },
      { name: "[T] BACK SPIN", desc: "Rapid platter whip-back sweep" },
    ];
    for (let m = 0; m < modes.length; m++) {
      const mx = 38 + m * 218;
      const my = 244;
      ctx.fillStyle = isHoldR ? "rgba(252, 98, 85, 0.22)" : "rgba(18, 26, 42, 0.9)";
      ctx.strokeStyle = isHoldR ? C_RED : C_YELLOW;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(mx, my, 204, 64, 7);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isHoldR ? C_YELLOW : C_TEXT;
      ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(modes[m]!.name, mx + 12, my + 24);

      ctx.fillStyle = C_MUTED;
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(modes[m]!.desc, mx + 12, my + 45);
    }
  }

  // =========================================================================
  // GUIDE 4: DJ BOOTH SYNC — PIONEER CDJ, ABLETON LINK & MIDI (4 CHAPTERS)
  // =========================================================================

  private drawSyncChapter1ProDjLink(
    ctx: CanvasRenderingContext2D,
    _W: number,
    _H: number,
    localT: number,
  ): void {
    ctx.fillStyle = C_TEXT;
    ctx.font = 'italic 18px Georgia, "Times New Roman", serif';
    ctx.fillText("DJ Sync · Pioneer CDJ / DJM Pro DJ Link Ethernet Topology", 24, 32);

    const nodes = [
      { x: 28, y: 84, w: 148, h: 112, title: "CDJ / DJM RIG", l1: "CDJ-2000NXS2/3000", l2: "Tempo Master Deck", l3: "Beat 1..4 + Pitch", col: C_BLUE },
      { x: 204, y: 84, w: 136, h: 112, title: "LAN SWITCH", l1: "Cat5e/Cat6 Cable", l2: "UDP 50000–50002", l3: "Broadcast Beats", col: C_TEAL },
      { x: 368, y: 84, w: 152, h: 112, title: "player5-bridge", l1: "--source prolink", l2: "(or --source opus)", l3: "ws://127.0.0.1:17505", col: C_YELLOW },
      { x: 548, y: 84, w: 144, h: 112, title: "undeck5 APP", l1: "Clock → Bridge", l2: "Follow: Master", l3: "Sample-Accurate", col: C_GREEN },
    ];

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]!;
      ctx.fillStyle = "rgba(18, 26, 42, 0.92)";
      ctx.strokeStyle = n.col;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(n.x, n.y, n.w, n.h, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = n.col;
      ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(n.title, n.x + 10, n.y + 24);
      ctx.fillStyle = C_TEXT;
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(n.l1, n.x + 10, n.y + 50);
      ctx.fillText(n.l2, n.x + 10, n.y + 72);
      ctx.fillStyle = C_MUTED;
      ctx.font = "10.5px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(n.l3, n.x + 10, n.y + 94);

      if (i < nodes.length - 1) {
        const x0 = n.x + n.w;
        const x1 = nodes[i + 1]!.x;
        const ym = n.y + n.h / 2;
        ctx.strokeStyle = C_AXIS;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0, ym);
        ctx.lineTo(x1, ym);
        ctx.stroke();

        const pkt = ((localT * 0.7 + i * 0.25) % 1);
        const px = x0 + pkt * (x1 - x0);
        ctx.fillStyle = C_YELLOW;
        ctx.beginPath();
        ctx.arc(px, ym, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Terminal command box at bottom
    ctx.fillStyle = "rgba(10, 14, 22, 0.95)";
    ctx.strokeStyle = C_BLUE;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(28, 226, 664, 84, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = C_YELLOW;
    ctx.font = "bold 11.5px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("TERMINAL COMMAND (PIONEER PRO DJ LINK):", 44, 250);
    ctx.fillStyle = C_TEXT;
    ctx.font = "12.5px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("cargo run --release -p player5-bridge -- --source prolink --web apps/web/dist", 44, 274);
    ctx.fillStyle = C_MUTED;
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("AlphaTheta Opus Quad: replace '--source prolink' with '--source opus'", 44, 296);
  }

  private drawSyncChapter2AbletonLink(
    ctx: CanvasRenderingContext2D,
    _W: number,
    _H: number,
    localT: number,
  ): void {
    ctx.fillStyle = C_TEXT;
    ctx.font = 'italic 18px Georgia, "Times New Roman", serif';
    ctx.fillText("DJ Sync · Ableton Link 4-Beat Quantum Circle (Wi-Fi / LAN & Tabs)", 24, 32);

    const cx = 360;
    const cy = 172;
    const R = 74;

    ctx.strokeStyle = C_TEAL;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    const beatPhase = (localT * 0.45) % 4;
    const angle = (beatPhase / 4) * Math.PI * 2 - Math.PI / 2;
    for (let b = 0; b < 4; b++) {
      const ba = (b / 4) * Math.PI * 2 - Math.PI / 2;
      const bx = cx + Math.cos(ba) * R;
      const by = cy + Math.sin(ba) * R;
      const on = Math.floor(beatPhase) === b;
      ctx.fillStyle = on ? C_YELLOW : C_TEAL;
      ctx.beginPath();
      ctx.arc(bx, by, on ? 7 : 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = C_YELLOW;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * (R - 6), cy + Math.sin(angle) * (R - 6));
    ctx.stroke();

    ctx.fillStyle = C_TEXT;
    ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.fillText(`QUANTUM 4 · BEAT ${Math.floor(beatPhase) + 1}`, cx, cy + R + 24);

    const peers = [
      { x: 36, y: 74, name: "Ableton Live", sub: "UDP 20808 Peer", col: C_BLUE },
      { x: 36, y: 196, name: "Traktor / Serato", sub: "Wi-Fi Link On", col: C_PURPLE },
      { x: 516, y: 74, name: "Rekordbox / DJay", sub: "Link Enabled", col: C_YELLOW },
      { x: 516, y: 196, name: "undeck5 Tabs", sub: "Zero-Setup Mesh", col: C_GREEN },
    ];

    for (const p of peers) {
      ctx.fillStyle = "rgba(18, 26, 42, 0.92)";
      ctx.strokeStyle = p.col;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, 168, 66, 8);
      ctx.fill();
      ctx.stroke();

      const targetX = p.x < cx ? p.x + 168 : p.x;
      const edgeX = p.x < cx ? cx - R - 8 : cx + R + 8;
      ctx.strokeStyle = "rgba(92, 208, 179, 0.45)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(targetX, p.y + 33);
      ctx.lineTo(edgeX, cy + (p.y < 140 ? -24 : 24));
      ctx.stroke();

      ctx.fillStyle = p.col;
      ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "left";
      ctx.fillText(p.name, p.x + 12, p.y + 26);
      ctx.fillStyle = C_MUTED;
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(p.sub, p.x + 12, p.y + 47);
    }

    ctx.textAlign = "center";
    ctx.fillStyle = C_GREEN;
    ctx.font = 'italic 13.5px Georgia, "Times New Roman", serif';
    ctx.fillText(
      "Select Clock → Ableton Link · Click Join Link · Optional: Enable Start/Stop Sync",
      360,
      314,
    );
    ctx.textAlign = "left";
  }

  private drawSyncChapter3MidiPll(
    ctx: CanvasRenderingContext2D,
    _W: number,
    _H: number,
    localT: number,
  ): void {
    ctx.fillStyle = C_TEXT;
    ctx.font = 'italic 18px Georgia, "Times New Roman", serif';
    ctx.fillText("DJ Sync · USB / DIN MIDI Clock (24 PPQN) & PLL Jitter Filter", 24, 32);

    // Top row: Raw 24 PPQN USB/DIN MIDI pulses with micro-jitter
    ctx.fillStyle = C_RED;
    ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("1. RAW MIDI 0xF8 TIMING PULSES (24 PULSES PER QUARTER NOTE + USB JITTER)", 34, 70);

    const x0 = 42;
    const w = 636;
    ctx.strokeStyle = C_AXIS;
    ctx.beginPath();
    ctx.moveTo(x0, 114);
    ctx.lineTo(x0 + w, 114);
    ctx.stroke();

    for (let i = 0; i < 24; i++) {
      const jitter = Math.sin(i * 3.7 + localT * 2.2) * 5.5;
      const px = x0 + (i / 23) * w + jitter;
      const isQuarter = i % 6 === 0;
      ctx.strokeStyle = isQuarter ? C_YELLOW : C_RED;
      ctx.lineWidth = isQuarter ? 2.4 : 1.4;
      ctx.beginPath();
      ctx.moveTo(px, 114);
      ctx.lineTo(px, isQuarter ? 82 : 92);
      ctx.stroke();
    }

    // Middle box: PLL Filter
    ctx.fillStyle = "rgba(18, 28, 44, 0.94)";
    ctx.strokeStyle = C_BLUE;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(170, 140, 380, 54, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = C_BLUE;
    ctx.font = "bold 12.5px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.fillText("PHASE-LOCKED LOOP (PLL) SMOOTHING FILTER", 360, 163);
    ctx.fillStyle = C_MUTED;
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("Rejects USB packet jitter · Tracks 0xFA Start & 0xFC Stop", 360, 182);

    // Bottom row: Clean Sample-Accurate AudioWorklet Step Grid
    ctx.textAlign = "left";
    ctx.fillStyle = C_GREEN;
    ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("2. LOCKED AUDIOWORKLET 16TH-NOTE GRID (STEADY TEMPO · ZERO FLUTTER)", 34, 224);

    ctx.strokeStyle = C_AXIS;
    ctx.beginPath();
    ctx.moveTo(x0, 268);
    ctx.lineTo(x0 + w, 268);
    ctx.stroke();

    const activeIdx = Math.floor((localT * 3) % 16);
    for (let s = 0; s < 16; s++) {
      const sx = x0 + (s / 15) * w;
      const on = s === activeIdx;
      ctx.fillStyle = on ? C_YELLOW : s % 4 === 0 ? C_GREEN : C_TEAL;
      ctx.beginPath();
      ctx.arc(sx, 268, on ? 7 : 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = C_TEXT;
    ctx.font = 'italic 13.5px Georgia, "Times New Roman", serif';
    ctx.textAlign = "center";
    ctx.fillText(
      "Use Chrome or Edge for Web MIDI · Or select Tap and press [T] 4× to match vinyl by ear",
      360,
      312,
    );
    ctx.textAlign = "left";
  }

  private drawSyncChapter4LatencyAlignment(
    ctx: CanvasRenderingContext2D,
    _W: number,
    _H: number,
    localT: number,
  ): void {
    ctx.fillStyle = C_TEXT;
    ctx.font = 'italic 18px Georgia, "Times New Roman", serif';
    ctx.fillText("DJ Sync · Calibrating Latency Offset, Sync Click & 1-Bar Launch", 24, 32);

    const align = smoothstep(4, 15, localT % 20);
    const delayPx = (1 - align) * 78;

    const x0 = 54;
    const w = 612;

    // Reference CDJ Kick Transient
    ctx.fillStyle = C_BLUE;
    ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("CDJ / MIXER HEADPHONE BEAT (REFERENCE t = 0 ms)", x0, 68);

    ctx.strokeStyle = C_BLUE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let ix = 0; ix <= w; ix++) {
      const d = (ix - 180) / 140;
      const y = 104 - (d >= 0 ? Math.exp(-d * 4.5) * Math.sin(d * 28) * 26 : 0);
      if (ix === 0) ctx.moveTo(x0 + ix, y);
      else ctx.lineTo(x0 + ix, y);
    }
    ctx.stroke();

    // Laptop Output Transient shifting left as Latency Offset compensates hardware buffer
    ctx.fillStyle = align > 0.9 ? C_GREEN : C_YELLOW;
    ctx.fillText(
      align > 0.9
        ? "undeck5 OUTPUT AFTER LATENCY OFFSET + PHASE NUDGE (Δt = 0.0 ms · TIGHT!)"
        : `undeck5 SPEAKER OUTPUT BEFORE CALIBRATION (+${Math.round((1 - align) * 24)} ms DAC DELAY)`,
      x0,
      154,
    );

    ctx.strokeStyle = align > 0.9 ? C_GREEN : C_YELLOW;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let ix = 0; ix <= w; ix++) {
      const d = (ix - (180 + delayPx)) / 140;
      const y = 192 - (d >= 0 ? Math.exp(-d * 4.5) * Math.sin(d * 28) * 26 : 0);
      if (ix === 0) ctx.moveTo(x0 + ix, y);
      else ctx.lineTo(x0 + ix, y);
    }
    ctx.stroke();

    // Vertical alignment reference line at Beat 1.1
    ctx.strokeStyle = "rgba(247, 209, 84, 0.5)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x0 + 180, 74);
    ctx.lineTo(x0 + 180, 218);
    ctx.stroke();
    ctx.setLineDash([]);

    const steps = [
      { k: "1. Sync Click", d: "Adjust Latency offset (ms)", col: C_BLUE },
      { k: "2. Nudge [; / ']", d: "Trim phase by ±1 ms", col: C_YELLOW },
      { k: "3. 1-Bar Launch", d: "Start cleanly on Beat 1.1", col: C_GREEN },
    ];
    for (let i = 0; i < 3; i++) {
      const sx = 42 + i * 218;
      ctx.fillStyle = "rgba(18, 26, 42, 0.92)";
      ctx.strokeStyle = steps[i]!.col;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(sx, 240, 200, 62, 7);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = steps[i]!.col;
      ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(steps[i]!.k, sx + 12, 264);
      ctx.fillStyle = C_TEXT;
      ctx.font = "11.5px system-ui, sans-serif";
      ctx.fillText(steps[i]!.d, sx + 12, 286);
    }
  }

  // =========================================================================
  // GUIDE 5: PATTERN PLAYER — TRAKTOR PRO 4+ MODE (4 CHAPTERS)
  // =========================================================================

  private drawTraktorChapter1KitsAndPatterns(
    ctx: CanvasRenderingContext2D,
    _W: number,
    _H: number,
    localT: number,
  ): void {
    ctx.fillStyle = C_TEXT;
    ctx.font = 'italic 18px Georgia, "Times New Roman", serif';
    ctx.fillText("Pattern Player · Heavy Sub-Bass Kits & 12 Layering Patterns", 24, 32);

    const groups = [
      { title: "SUB / TECHNO [1–4]", items: ["1 Sub Rumble", "2 Offbeat Sub", "3 Acid Sub", "4 Warehouse"], col: C_BLUE },
      { title: "HOUSE GROOVES [5–8]", items: ["5 Sub-Jack", "6 French Lift", "7 Deep Pulse", "8 Top Addon"], col: C_TEAL },
      { title: "BREAKBEATS [9,0,−,=]", items: ["9 Warehs Brk", "0 UK Sub Brk", "− Euphoric", "= Electro Brk"], col: C_PURPLE },
    ];
    const activeIdx = Math.floor((localT * 0.45) % 12);

    for (let g = 0; g < 3; g++) {
      const grp = groups[g]!;
      const gx = 28 + g * 226;
      ctx.fillStyle = grp.col;
      ctx.font = "bold 11.5px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(grp.title, gx, 62);

      for (let i = 0; i < 4; i++) {
        const idx = g * 4 + i;
        const on = idx === activeIdx;
        const py = 74 + i * 42;
        ctx.fillStyle = on ? "rgba(88, 196, 221, 0.28)" : "rgba(18, 25, 40, 0.9)";
        ctx.strokeStyle = on ? C_YELLOW : grp.col;
        ctx.lineWidth = on ? 2.3 : 1.3;
        ctx.beginPath();
        ctx.roundRect(gx, py, 210, 34, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = on ? C_YELLOW : C_TEXT;
        ctx.font = "bold 11.5px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillText(grp.items[i]!, gx + 12, py + 21);
      }
    }

    ctx.fillStyle = "rgba(18, 26, 42, 0.92)";
    ctx.strokeStyle = C_GREEN;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(28, 254, 664, 58, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = C_GREEN;
    ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("[K] KICK CUT — MUTES 4/4 KICK SO HEAVY SUB + BREAKS + HATS RIDE CLEANLY OVER CDJ TRACKS", 44, 278);
    ctx.fillStyle = C_MUTED;
    ctx.font = "11.5px system-ui, sans-serif";
    ctx.fillText("7 synthesized heavy-bass kits built in (Berlin Sub Rumble, Hard Industrial, Acid Sub, UK Sub & Break)", 44, 299);
  }

  private drawTraktorChapter2ShapingAndDucking(
    ctx: CanvasRenderingContext2D,
    _W: number,
    _H: number,
    localT: number,
  ): void {
    ctx.fillStyle = C_TEXT;
    ctx.font = 'italic 18px Georgia, "Times New Roman", serif';
    ctx.fillText("Pattern Player · Bass Weight, Pitch [B/N], Decay & Sidechain Ducking [U]", 24, 32);

    // Left panel: Sub-bass decay & weight envelope
    ctx.fillStyle = "rgba(18, 25, 40, 0.92)";
    ctx.strokeStyle = C_BLUE;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(28, 56, 320, 248, 9);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = C_BLUE;
    ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("BASS WEIGHT + DECAY ENVELOPE e^(−t/τ)", 44, 82);

    const tau = 0.25 + 0.65 * (0.5 + 0.5 * Math.sin(localT * 0.5));
    ctx.strokeStyle = C_YELLOW;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let ix = 0; ix <= 280; ix++) {
      const u = ix / 280;
      const env = Math.exp(-u / tau);
      const y = 240 - env * Math.sin(u * 42) * 62 - env * 40;
      if (ix === 0) ctx.moveTo(48 + ix, y);
      else ctx.lineTo(48 + ix, y);
    }
    ctx.stroke();

    ctx.fillStyle = C_MUTED;
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("Pitch [B/N]: −12 .. +12 st  ·  Kit [Y/I]", 44, 282);

    // Right panel: Traktor-style Sidechain Ducking pump curve across 4 beats
    ctx.fillStyle = "rgba(18, 25, 40, 0.92)";
    ctx.strokeStyle = C_GREEN;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(368, 56, 324, 248, 9);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = C_GREEN;
    ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("[U] DUCKING — SIDECHAIN PUMP CURVE", 384, 82);

    ctx.strokeStyle = C_GREEN;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let ix = 0; ix <= 284; ix++) {
      const beatFrac = ((ix / 284) * 4) % 1;
      const pump = 1 - 0.72 * Math.exp(-beatFrac * 5.5);
      const y = 236 - pump * 112;
      if (ix === 0) ctx.moveTo(388 + ix, y);
      else ctx.lineTo(388 + ix, y);
    }
    ctx.stroke();

    ctx.fillStyle = C_TEXT;
    ctx.font = "11.5px system-ui, sans-serif";
    ctx.fillText("Attenuates steady tops around accented downbeats", 384, 266);
    ctx.fillStyle = C_MUTED;
    ctx.fillText("so offbeat sub-toms & hats breathe with the track", 384, 286);
  }

  private drawTraktorChapter3BuildupDrop(
    ctx: CanvasRenderingContext2D,
    _W: number,
    _H: number,
    localT: number,
  ): void {
    ctx.fillStyle = C_TEXT;
    ctx.font = 'italic 18px Georgia, "Times New Roman", serif';
    ctx.fillText("Pattern Player · One-Button Buildup [Q/W/E/T] → Release Into Drop [R]", 24, 32);

    const cycle = (localT % 14) / 14;
    const building = cycle < 0.68;
    const p = building ? cycle / 0.68 : 0;

    ctx.fillStyle = building ? C_YELLOW : C_GREEN;
    ctx.font = "bold 13px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(
      building
        ? `BUILDING TENSION (${Math.round(p * 100)}%) — HPF Sweeps Up + Echo/Noise Rises + Sub Attenuates`
        : "RELEASE INTO DROP [R]! — Filter Wide Open + 100% Heavy Sub Slams Onto Active Pattern!",
      28,
      64,
    );

    const gx = 42;
    const gy = 216;
    const gw = 636;
    const gh = 116;

    ctx.strokeStyle = C_AXIS;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + gw, gy);
    ctx.stroke();

    // Echo/Noise/HPF Riser curve (Yellow)
    ctx.strokeStyle = C_YELLOW;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let ix = 0; ix <= gw; ix++) {
      const u = ix / gw;
      const riser = u < 0.68 ? u / 0.68 : 0;
      const y = gy - riser * gh;
      if (ix === 0) ctx.moveTo(gx + ix, y);
      else ctx.lineTo(gx + ix, y);
    }
    ctx.stroke();

    // Sub-Bass Weight curve (Red/Green inverse: cuts during build, slams 100% at 0.68 drop!)
    ctx.strokeStyle = C_RED;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let ix = 0; ix <= gw; ix++) {
      const u = ix / gw;
      const sub = u < 0.68 ? Math.max(0.05, 1 - (u / 0.68) * 0.95) : 1.0;
      const y = gy - sub * (gh * 0.82);
      if (ix === 0) ctx.moveTo(gx + ix, y);
      else ctx.lineTo(gx + ix, y);
    }
    ctx.stroke();

    const curX = gx + cycle * gw;
    ctx.strokeStyle = C_BLUE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(curX, gy - gh - 10);
    ctx.lineTo(curX, gy + 10);
    ctx.stroke();

    const macros = [
      ["[Q] ECHO + HPF", C_BLUE],
      ["[W] NOISE + SWEEP", C_TEAL],
      ["[E] SPIRAL + ROLL", C_PURPLE],
      ["[R] DROP NOW!", C_RED],
    ] as const;
    for (let m = 0; m < 4; m++) {
      const mx = 34 + m * 166;
      ctx.fillStyle = m === 3 && !building ? "rgba(252, 98, 85, 0.3)" : "rgba(18, 26, 42, 0.92)";
      ctx.strokeStyle = macros[m]![1];
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.roundRect(mx, 248, 152, 54, 7);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = macros[m]![1];
      ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(macros[m]![0], mx + 76, 280);
    }
    ctx.textAlign = "left";
  }

  private drawTraktorChapter4StepStrip(
    ctx: CanvasRenderingContext2D,
    _W: number,
    _H: number,
    localT: number,
  ): void {
    ctx.fillStyle = C_TEXT;
    ctx.font = 'italic 18px Georgia, "Times New Roman", serif';
    ctx.fillText("Pattern Player · Minimalist 2×8 Step Strip [A–K / Z–,] & Local WAV", 24, 32);

    const keys = ["A", "S", "D", "F", "G", "H", "J", "K", "Z", "X", "C", "V", "B", "N", "M", ","];
    const head = Math.floor((localT * 3.2) % 16);
    const activeSteps = new Set([0, 2, 3, 6, 8, 10, 11, 14]);

    ctx.fillStyle = C_TEAL;
    ctx.font = "bold 12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("[O] CYCLE STEM LAYER:  SUB BASS  ·  SNARE / BREAK  ·  HI-HATS  ·  CLAP / PERC", 42, 68);

    for (let i = 0; i < 16; i++) {
      const row = i < 8 ? 0 : 1;
      const col = i % 8;
      const sx = 42 + col * 80;
      const sy = 88 + row * 74;
      const isHead = i === head;
      const isOn = activeSteps.has(i);

      ctx.fillStyle = isHead
        ? "rgba(247, 209, 84, 0.32)"
        : isOn
          ? "rgba(92, 208, 179, 0.25)"
          : "rgba(18, 26, 42, 0.9)";
      ctx.strokeStyle = isHead ? C_YELLOW : isOn ? C_TEAL : C_AXIS;
      ctx.lineWidth = isHead ? 2.4 : 1.5;
      ctx.beginPath();
      ctx.roundRect(sx, sy, 68, 56, 7);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = C_TEXT;
      ctx.font = "bold 14px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(`Step ${i + 1}`, sx + 34, sy + 24);
      ctx.fillStyle = isHead ? C_YELLOW : C_MUTED;
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(`[${keys[i]}]`, sx + 34, sy + 44);
    }
    ctx.textAlign = "center";
    ctx.fillStyle = C_GREEN;
    ctx.font = 'italic 14px Georgia, "Times New Roman", serif';
    ctx.fillText(
      "Press [P] to restore factory steps · Click '+ Load WAV' to layer local one-shot audio files offline",
      360,
      298,
    );
    ctx.textAlign = "left";
  }
}

export function howToModalMarkup(): string {
  const chapterButtons = SEQ_CHAPTERS.map(
    (c) =>
      `<button type="button" class="howto-ch-btn" data-howto-chapter="${c.id}" aria-pressed="${c.id === 0}">${c.title}</button>`,
  ).join("");

  const keyboardLegend = MACBOOK_ROWS.map(
    (row, rIdx) =>
      `<div class="kb-row kb-row-${rIdx}">${row
        .map(
          (k) =>
            `<button type="button" class="kb-cap" style="--kb-accent:${k.seqColor}" data-key-code="${k.code}" data-key-label="${k.label}" data-seq-sub="${k.seqSub}" data-djs-sub="${k.djsSub}" data-rmx-sub="${k.rmxSub}" data-sync-sub="${k.syncSub}" data-seq-color="${k.seqColor}" data-djs-color="${k.djsColor}" data-rmx-color="${k.rmxColor}" data-sync-color="${k.syncColor}" data-key-desc="${k.label} → ${k.seqSub}" title="${k.label}: ${k.seqSub}"><kbd>${k.label}</kbd><span>${k.seqSub}</span></button>`,
        )
        .join("")}</div>`,
  ).join("");

  return `
  <div id="how-to-modal" class="howto-backdrop" role="dialog" aria-modal="true" aria-labelledby="howto-title" data-guide-mode="sequencer" hidden>
    <div class="panel howto-modal">
      <div class="panel-head howto-head">
        <div>
          <h2 id="howto-title">Quick guide</h2>
        </div>
        <div class="howto-mode-tabs" role="group" aria-label="Choose guide section">
          <button id="howto-mode-seq" type="button" class="howto-mode-tab" aria-pressed="true">TR Drums</button>
          <button id="howto-mode-traktor" type="button" class="howto-mode-tab" aria-pressed="false">Pattern Player</button>
          <button id="howto-mode-djs" type="button" class="howto-mode-tab" aria-pressed="false">DJS-1000</button>
          <button id="howto-mode-rmx" type="button" class="howto-mode-tab" aria-pressed="false">RMX FX</button>
          <button id="howto-mode-sync" type="button" class="howto-mode-tab" aria-pressed="false">Sync</button>
        </div>
        <button id="howto-close" type="button" class="small" aria-label="Close How To guide">Close</button>
      </div>

      <section class="howto-quick-wrap" aria-label="30-second guide">
        <div class="howto-quick" data-mode="sequencer">
          <h3>TR Drums in 30 seconds</h3>
          <p class="hq-lead">Works like a real drum machine.</p>
          <div class="hq-steps"><div class="hq-step"><span class="hq-num">1</span><b>Press Play</b><p>Space bar, or the orange button.</p></div><div class="hq-step"><span class="hq-num">2</span><b>Click squares</b><p>Each row is a drum, each column a 16th note.</p></div><div class="hq-step"><span class="hq-num">3</span><b>Pick a pattern</b><p>Start from a pattern and change it.</p></div></div>
        </div>
        <div class="howto-quick" data-mode="traktor">
          <h3>Pattern Player in 30 seconds</h3>
          <p class="hq-lead">Layer a ready-made groove over the DJ's track.</p>
          <div class="hq-steps"><div class="hq-step"><span class="hq-num">1</span><b>Tap a pattern</b><p>Techno, house or breaks. It starts on the next bar.</p></div><div class="hq-step"><span class="hq-num">2</span><b>Kick off</b><p>Turn your kick off so it doesn't fight the DJ's kick.</p></div><div class="hq-step"><span class="hq-num">3</span><b>Hold a buildup</b><p>Hold Echo, Noise, Snare or Reverb. Let go on the 1 to drop.</p></div></div>
        </div>
        <div class="howto-quick" data-mode="djs">
          <h3>DJS-1000 in 30 seconds</h3>
          <p class="hq-lead">16 pads and 8 scenes, like the Pioneer sampler.</p>
          <div class="hq-steps"><div class="hq-step"><span class="hq-num">1</span><b>Hit the pads</b><p>Click them, or use 1–4 / Q–R / A–F / Z–V.</p></div><div class="hq-step"><span class="hq-num">2</span><b>Change scene</b><p>Scenes swap the whole pattern. Press 9 or 0.</p></div><div class="hq-step"><span class="hq-num">3</span><b>Roll</b><p>Hold the touch strip for fast repeats.</p></div></div>
        </div>
        <div class="howto-quick" data-mode="rmx">
          <h3>RMX FX in 30 seconds</h3>
          <p class="hq-lead">Effects on everything you play.</p>
          <div class="hq-steps"><div class="hq-step"><span class="hq-num">1</span><b>Kill a band</b><p>Q, W, E cut the lows, mids or highs.</p></div><div class="hq-step"><span class="hq-num">2</span><b>Add a scene effect</b><p>Pick an echo, noise or spiral and raise the level.</p></div><div class="hq-step"><span class="hq-num">3</span><b>Pull the lever</b><p>Hold R through the build, let go to drop.</p></div></div>
        </div>
        <div class="howto-quick" data-mode="sync">
          <h3>Sync in 30 seconds</h3>
          <p class="hq-lead">Lock undeck5 to the DJs.</p>
          <div class="hq-steps"><div class="hq-step"><span class="hq-num">1</span><b>Connect</b><p>Ethernet to the booth switch for CDJs, or the same Wi-Fi for Ableton Link.</p></div><div class="hq-step"><span class="hq-num">2</span><b>Start the bridge</b><p>Run player5-bridge on your laptop (see README).</p></div><div class="hq-step"><span class="hq-num">3</span><b>Pick the source</b><p>Click the clock button at the top and choose CDJ / bridge or Ableton Link.</p></div></div>
        </div>
      </section>

      <details class="howto-more howto-keys" id="howto-keys">
        <summary>Keyboard map · press a key to try it</summary>
      <div class="howto-kb-section">
        <div class="panel-head">
          <h3 id="howto-kb-title">Your keyboard is the machine</h3>
          <span class="hint">Press a key to try it</span>
        </div>
        <div class="kb-diagram" role="group" aria-label="MacBook Air keyboard shortcuts">
          ${keyboardLegend}
        </div>
      </div>
      </details>
      <details class="howto-more" id="howto-more">
        <summary>Full manual, animated video &amp; all shortcuts</summary>
      <section class="howto-quickstart" id="howto-quickstart" aria-label="Step-by-step quick start">
        <div class="panel-head">
          <h3 id="howto-qs-title">Operating Procedure · TR-REC 64-Step Drum Sequencer</h3>
          <output id="howto-live-key" class="howto-live-key" aria-live="polite">Press any MacBook key to test it live</output>
        </div>

        <ol class="howto-steps" id="howto-qs-seq">
          <li>
            <strong>1. Switch machines (<kbd>⌥1</kbd>–<kbd>⌥5</kbd>) and toggle Active / Passive (<kbd>&#92;</kbd> or <kbd>⌥⇧1</kbd>–<kbd>⌥⇧4</kbd>):</strong>
            Press <kbd>Space</kbd> to start transport. Press <kbd>⌥1</kbd>–<kbd>⌥5</kbd> (or <kbd>&#96;</kbd>) to switch views, and press <kbd>&#92;</kbd> to toggle the viewed machine <strong>ACTIVE</strong> or <strong>PASSIVE</strong> (<kbd>⇧&#92;</kbd> solos it). Device hotkeys control <strong>only</strong> the focused ACTIVE machine.
          </li>
          <li>
            <strong>2. Select or audition the 10 drum voices (<kbd>1</kbd>–<kbd>0</kbd>) &amp; swap kits (<kbd>Y</kbd>–<kbd>P</kbd>):</strong>
            Press <kbd>1</kbd>–<kbd>0</kbd> to select a drum row, hold <kbd>Shift</kbd> + <kbd>1</kbd>–<kbd>0</kbd> to trigger it live, or press <kbd>.</kbd> to mute it. Press <kbd>Y</kbd> <kbd>U</kbd> <kbd>I</kbd> <kbd>O</kbd> <kbd>P</kbd> to load <strong>TR-8O8</strong>, <strong>TR-9O9</strong>, <strong>TR-7O7</strong>, <strong>TR-6O6</strong>, or <strong>9O9 Drive</strong> kits.
          </li>
          <li>
            <strong>3. Edit 16 steps and 64-step bar chains (<kbd>A</kbd>–<kbd>K</kbd> &amp; <kbd>Z</kbd>–<kbd>,</kbd>):</strong>
            Press Home Row <kbd>A</kbd>–<kbd>K</kbd> for <strong>Steps 1–8</strong> and Bottom Row <kbd>Z</kbd>–<kbd>,</kbd> for <strong>Steps 9–16</strong> (Off → Hit → Accent; hold <kbd>Shift</kbd> or press <kbd>E</kbd> for Flam). Click <strong>Copy→</strong> and <strong>A–D</strong> to chain 4 bars (64 steps).
          </li>
          <li>
            <strong>4. Apply Groove, Momentary Fill (<kbd>Hold R</kbd>), Voice FX, Save &amp; Reset:</strong>
            Hold <kbd>R</kbd> for a live fill, or press <kbd>⌥+G</kbd> (Humanize), <kbd>⌥+V</kbd> (Variation), and <kbd>⌥+F</kbd> (1-Bar Fill). Press <kbd>Ctrl</kbd>+<kbd>1</kbd>–<kbd>0</kbd> for voice Dub Echo. Click <strong>Save</strong> to store your startup rig, or click <strong>Reset</strong> for factory defaults.
          </li>
        </ol>

        <ol class="howto-steps" id="howto-qs-traktor" hidden>
          <li>
            <strong>1. Launch pre-built Heavy Sub, House, or Breakbeat patterns (<kbd>1</kbd>–<kbd>0</kbd>, <kbd>−</kbd>, <kbd>=</kbd>):</strong>
            Ensure Pattern Player is <strong>ACTIVE</strong> (<kbd>&#92;</kbd> toggles Active/Passive; <kbd>⌥1</kbd>–<kbd>⌥5</kbd> switches machines). Press <kbd>1</kbd>–<kbd>0</kbd>, <kbd>−</kbd>, <kbd>=</kbd> to launch 12 Techno Sub, House, and Breakbeat loops. Press <kbd>.</kbd> (<strong>KICK CUT</strong>) to mute the 4/4 kick over a DJ track.
          </li>
          <li>
            <strong>2. Shape heavy bass weight, pitch, decay, and sidechain ducking:</strong>
            Press <kbd>Y</kbd> / <kbd>I</kbd> (or open <strong>Kit</strong>) to choose a heavy sub kit. Adjust <strong>VOLUME</strong>, <strong>BASS WEIGHT</strong>, and <strong>DECAY</strong>, press <kbd>⌥+B</kbd> / <kbd>⌥+N</kbd> to shift <strong>PITCH</strong> (−12 to +12 st), and press <kbd>U</kbd> to enable <strong>DUCKING</strong>.
          </li>
          <li>
            <strong>3. Perform one-button Buildup FX and Release Into Drop (<kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> <kbd>T</kbd> → <kbd>R</kbd>):</strong>
            Tap once to latch (or hold) <kbd>Q</kbd> (<strong>ECHO + HPF FILTER</strong>), <kbd>W</kbd> (<strong>NOISE + FILTER SWEEP</strong>), <kbd>E</kbd> (<strong>SPIRAL + SNARE ROLL</strong>), or <kbd>T</kbd> (<strong>SUB KILL + REVERB</strong>). Press <kbd>R</kbd> (<strong>RELEASE INTO DROP!</strong>) on Beat 1 to open the filter and slam full sub-bass back onto the active pattern.
          </li>
          <li>
            <strong>4. Edit the 2×8 Step Strip or load local WAV samples (<kbd>A</kbd>–<kbd>K</kbd>, <kbd>Z</kbd>–<kbd>,</kbd>, <kbd>O</kbd>, <kbd>P</kbd>):</strong>
            Press <kbd>O</kbd> to select <strong>SUB BASS</strong>, <strong>SNARE / BREAK</strong>, <strong>HI-HATS</strong>, or <strong>CLAP / PERC</strong>, tap <kbd>A</kbd>–<kbd>K</kbd> / <kbd>Z</kbd>–<kbd>,</kbd> to toggle steps 1–16, press <kbd>P</kbd> to reset steps, or click <strong>+ Load WAV</strong> to layer local audio files offline.
          </li>
        </ol>

        <ol class="howto-steps" id="howto-qs-djs" hidden>
          <li>
            <strong>1. Play the 4×4 RGB Performance Pads from your left hand:</strong>
            Press <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> (Pads 1–4), <kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd> (Pads 5–8), <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> <kbd>F</kbd> (Pads 9–12), and <kbd>Z</kbd> <kbd>X</kbd> <kbd>C</kbd> <kbd>V</kbd> (Pads 13–16). Every pad triggers audio immediately; hold <kbd>Shift</kbd> for accented hits.
          </li>
          <li>
            <strong>2. Switch the 4 Pad Modes (<kbd>5</kbd> <kbd>6</kbd> <kbd>7</kbd> <kbd>8</kbd>):</strong>
            Press <kbd>5</kbd> for <strong>TRACK PLAY</strong> (10 drums + 6 macros), <kbd>6</kbd> for <strong>MUTE / SOLO</strong> stem cuts, <kbd>7</kbd> for <strong>16-PAD PITCH</strong> chromatic semitones (<kbd>R</kbd> = 0 st root), and <kbd>8</kbd> for <strong>HOT ROLL</strong> (hold any pad to roll).
          </li>
          <li>
            <strong>3. Launch 8 Scenes and record 64-step bars (<kbd>9</kbd>/<kbd>0</kbd>, <kbd>Y</kbd>, <kbd>U</kbd>, <kbd>I</kbd>, <kbd>O</kbd>, <kbd>P</kbd>):</strong>
            Press <kbd>9</kbd> / <kbd>0</kbd> (or <kbd>⌥+1–8</kbd>) to load <strong>Scenes S1–S8</strong>, and press <kbd>P</kbd> to <strong>Capture</strong>. Press <kbd>Y</kbd> for <strong>QUANTIZE</strong>, <kbd>U</kbd> for <strong>LIVE REC</strong>, <kbd>I</kbd> to select Bar A–D, and <kbd>O</kbd> to chain 64 steps.
          </li>
          <li>
            <strong>4. Operate the Touch Strip and CDJ Deck Controls (<kbd>G</kbd>–<kbd>K</kbd>, <kbd>T</kbd>, <kbd>B</kbd>, <kbd>N</kbd>):</strong>
            Hold <kbd>G</kbd> (<kbd>1/4</kbd>), <kbd>H</kbd> (<kbd>1/8</kbd>), <kbd>J</kbd> (<kbd>1/16</kbd>), or <kbd>K</kbd> (<kbd>1/32</kbd>) on the Touch Strip, and press <kbd>T</kbd> to toggle Repeat/Pitch. Press <kbd>B</kbd> for <strong>BEAT SYNC</strong>, <kbd>N</kbd> for <strong>CUE</strong>, and hold <kbd>.</kbd> for RMX Release FX.
          </li>
        </ol>

        <ol class="howto-steps" id="howto-qs-rmx" hidden>
          <li>
            <strong>1. Trigger X-Pad drums (<kbd>1</kbd>–<kbd>4</kbd>) and Beat Rolls (<kbd>5</kbd>–<kbd>0</kbd>):</strong>
            Press <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> to play the 4 X-Pad drum slots, and press <kbd>K</kbd> to switch <strong>Bank A / Bank B</strong>. Hold <kbd>5</kbd> <kbd>6</kbd> <kbd>7</kbd> <kbd>8</kbd> <kbd>9</kbd> <kbd>0</kbd> to roll at <strong>1/1</strong> to <strong>1/32</strong>. Press <kbd>Z</kbd> (Quantize), <kbd>X</kbd> (Latch), <kbd>C</kbd> (Overdub), <kbd>V</kbd> (Mute), and <kbd>B</kbd>/<kbd>N</kbd> (Pitch).
          </li>
          <li>
            <strong>2. Punch 3-Band Isolator Kills (<kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd>) and Modes (<kbd>M</kbd>):</strong>
            Press <kbd>Q</kbd> for <strong>KILL LOW</strong>, <kbd>W</kbd> for <strong>KILL MID</strong>, and <kbd>E</kbd> for <strong>KILL HIGH</strong> (also available anywhere via <kbd>Ctrl+Q/W/E</kbd>). Press <kbd>M</kbd> (or <kbd>⇧+Q/W/E/R</kbd>) to switch between <em>Isolator</em>, <em>Cut/Add</em>, <em>Trans/Roll</em>, and <em>Gate/Drive</em>.
          </li>
          <li>
            <strong>3. Engage Build-Up (<kbd>Y</kbd>–<kbd>P</kbd>) and Break-Down (<kbd>A</kbd>–<kbd>G</kbd>) Scene FX:</strong>
            Press <kbd>Y</kbd> <kbd>U</kbd> <kbd>I</kbd> <kbd>O</kbd> <kbd>P</kbd> to select a <strong>Build Up</strong> FX or <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> <kbd>F</kbd> <kbd>G</kbd> to select a <strong>Break Down</strong> FX. Press <kbd>H</kbd> and <kbd>J</kbd> to lower or raise <strong>Scene Level</strong> (<kbd>⇧+H</kbd> = 0%, <kbd>⇧+J</kbd> = 100%).
          </li>
          <li>
            <strong>4. Pull the Release FX Lever to drop cleanly (Hold <kbd>R</kbd>):</strong>
            Press <kbd>T</kbd> to choose <strong>Vinyl Brake</strong>, <strong>Echo</strong>, or <strong>Back Spin</strong>. Hold <kbd>R</kbd> at peak build-up; when you release <kbd>R</kbd>, Scene FX resets to 0% and the dry groove drops on Beat 1. Press <kbd>,</kbd> to bypass RMX or <kbd>.</kbd> to reset FX.
          </li>
        </ol>

        <ol class="howto-steps" id="howto-qs-sync" hidden>
          <li>
            <strong>1. Sync with Pioneer CDJs &amp; DJM Mixers (Pro DJ Link / Opus Quad):</strong>
            Connect your Mac to the DJ Ethernet switch. Run <code>cargo run --release -p player5-bridge -- --source prolink --web apps/web/dist</code> (use <code>--source opus</code> for Opus Quad). In <strong>Clock</strong>, select <strong>Bridge</strong>, click <strong>Connect</strong>, and set <strong>Follow</strong> to <strong>Tempo master</strong>.
          </li>
          <li>
            <strong>2. Sync with Ableton Link (Ableton Live, Traktor, Serato, Rekordbox):</strong>
            In <strong>Clock</strong>, select <strong>Ableton Link</strong>. Browser tabs on the same Mac sync automatically. To sync over Wi-Fi/LAN with DJ or DAW apps on UDP port 20808, run <code>player5-bridge</code> and click <strong>Join Link</strong>. Enable <strong>Start/Stop Sync</strong> to follow session launches.
          </li>
          <li>
            <strong>3. Sync with USB / DIN MIDI Clock or Manual Tap Tempo:</strong>
            Connect a USB-MIDI interface, open undeck5 in Chrome or Edge, select <strong>MIDI</strong> in <strong>Clock</strong>, and choose your MIDI input port (24 PPQN + Start/Stop). For vinyl or analog setups without sync data, select <strong>Tap</strong> and press <kbd>T</kbd> 4 times on the beat.
          </li>
          <li>
            <strong>4. Calibrate Zero-Latency Alignment (Sync Click, Nudge &amp; 1-Bar Launch):</strong>
            Click <strong>Sync Click</strong> and adjust <strong>Latency offset (ms)</strong> until the rim-click matches your DJ headphones. Use <kbd>;</kbd> and <kbd>'</kbd> (<strong>Phase nudge</strong>) for ±1 ms alignment, press <kbd>L</kbd> to snap to Beat 1.1, and enable <strong>1-Bar Launch</strong> for quantized starts.
          </li>
        </ol>
      </section>

      <div class="howto-chapters" role="group" aria-label="Video chapters">
        ${chapterButtons}
      </div>

      <div class="howto-stage">
        <canvas id="manim-canvas" width="720" height="340" aria-label="3Blue1Brown style visual explainer animation"></canvas>
        <p id="howto-caption" class="howto-caption" aria-live="polite"></p>
      </div>

      <div class="howto-transport">
        <button id="howto-play" type="button" class="toggle" aria-pressed="true">Pause</button>
        <input id="howto-scrub" type="range" min="0" max="120" step="0.1" value="0" aria-label="Video timeline" />
        <output id="howto-time" class="mono-out">0:00 / 2:00</output>
        <button id="howto-speed" type="button" class="small" title="Playback speed">1×</button>
        <button id="howto-sound" type="button" class="toggle small" aria-pressed="false" title="Toggle harmonic chapter chimes">Chimes: OFF</button>
      </div>

      </details>
    </div>
  </div>`;
}
