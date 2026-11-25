# Changelog

## v0.2.0: Renamed to `undeck5`, Hobbyist-Friendly UI v2 & Local NI / WAV Sampler

> **Status:** Local prototype, now dramatically cleaner for hobbyist DJs, with your own Native Instruments / `.wav` drum samples plugged straight into the AudioWorklet engine.

### UI v2: Hobbyist-First Declutter
- **78% fewer words & 67% fewer controls above the fold** on TR Drums (565 → 127 words, 208 → 68 non-step controls); Pattern Player and RMX FX now fit cleanly in `1440×900` with zero scrolling, and MacBook Air 13" **Split** stays zero-scroll at `1280×800` / `1440×800`.
- **One place for machine power:** LED power dots sit directly on each top tab (**TR Drums**, **Pattern Player**, **DJS-1000**, **RMX FX**, **Split**) instead of three redundant status strips.
- **Drawers for secondary controls:** **Clock & sync** lives behind the top sync pill (`Internal clock` / `Link · locked`), **Output volume, limiter, colour themes & shortcuts toggle** live behind `⋯` (**Settings**), **Feel** (Swing/Accent/Flam) expands inline, and **Share / Import** opens on demand.
- **Shortcuts on demand:** On-screen hotkey clutter is hidden by default. **Hold `⌘`** anytime (or flip *Always show keyboard shortcuts* in Settings) to reveal every key badge.
- **Readable drum rows & sentence-case controls:** Full drum names (`Kick`, `Snare`, `Closed hat`) with subtle grey codes (`BD`, `SD`, `CH`), hover-reveal `S / M / FX` buttons, and calmer sentence-case labels across DJS-1000 and RMX FX.
- **Pattern Player layout:** Added **All / Techno / House / Breaks** genre filter chips, larger pattern tiles, and 4 separate buildup buttons (**Echo riser**, **Noise sweep**, **Snare roll**, **Reverb wash**) + **Drop** stacked on the right.
- **30-Second Quick Guide (`?`):** Opens to a 3-step visual card per machine (~65 words), with the interactive **Keyboard map** and full **3Blue1Brown animated manual** tucked neatly inside expandable `<details>` sections.

### Owned Samples (NI Maschine / Local `.wav` Kits)
- **10-Voice AudioWorklet Sampler (`My sounds`):** Load any local `.wav` drum folder from your laptop (e.g. NI Maschine 2 Factory, Deep Matter, Expansions) with automatic voice mapping (`Auto-Fill Kit`), `★ Favorites` pinning, and clear `[WAV]` vs `[SYNTH]` badges.
- **Automatic Bridge Discovery:** `player5-bridge` auto-discovers Native Instruments sample folders in `/Users/Shared` on macOS (or any `--samples-dir`) and serves them locally at `/samples/index.json` without copying copyrighted audio into the repo.
- **3 New Berlin Presets** + refreshed sparse architecture diagrams (`devices-overview.svg`, `setup-diagram.svg`) and Retina UI screenshots.

---

## v0.1.0: First Local Prototype Release

> **Status:** Early local prototype running in your browser, offline single-file HTML (`undeck5.html`), and local Rust sync bridge (`player5-bridge`). Built on a deterministic Rust DSP + Sequencer core (`core/`) as the foundation for an eventual native booth app.

### 4 Performance Surfaces on One Clock
- **Step Sequencer (`⌥1`):** Classic `10×16` drum grid with 64-step `A–D` bar chains, 7 analog-inspired drum circuits (`TR-8O8`, `TR-9O9`, `TR-7O7`, `TR-6O6`, `TR-72x`, `CR-78`), Breakbeat presets, Groove/Humanize/Auto-Fill, Per-Sample & Group FX, and `Hold R` momentary fill.
- **Pattern Player (`⌥2`, Traktor Pro 4+ Style):** Minimalist layer deck with 7 heavy sub-bass kits, 12 pre-baked Techno Sub / House / Breakbeat loops, `KICK CUT`, `DUCKING`, offline `+ Load WAV` sample layering, and tempo-synced **Buildup → Post-Filter Drop Tail** (`Q/W/E/T` → `R`).
- **DJS-1000 Deck (`⌥3`):** 8-Scene launcher (including Breakbeats), left-hand `4×4` RGB pad matrix (`1–4 / Q–R / A–F / Z–V`), 4 Pad Modes, `1/4–1/32` Touch Strip rolls, and quantized `LIVE REC`.
- **RMX-1000 Station (`⌥4`) & 13" MacBook Booth Split (`⌥5` / `⇧~`):** 3-Band Isolator (`24 dB/oct` Linkwitz-Riley), 10 Scene FX, X-Pad Beat Roll, Release FX Lever, and zero-scroll dual cockpit (`1280×800` / `1440×800`).

### Booth Sync Protocols (`core/clock` + `apps/bridge`)
- **Pioneer Pro DJ Link (`--source prolink`):** CDJ-2000NXS2 / CDJ-3000 / DJM beat & bar-phase follower over Ethernet.
- **AlphaTheta Opus Quad (`--source opus`):** Standalone 4-deck unit support.
- **Ableton Link (`--source link`):** Real-time LAN UDP `20808` peer sync + Start/Stop sync + live idle BPM display + browser-tab mesh.
- **USB / DIN MIDI Clock (24 PPQN PLL)**, **Tap Tempo (`T`)**, **`Sync Click`**, **`Latency offset (ms)`**, and **1-Bar Launch**.

### UX, Safety & Learning
- **Active / Passive Machine Routing:** Toggle each machine **`ACTIVE`** or **`PASSIVE`** (`\` or `⌥⇧1–4`) with single-target `⌨ KEYS → …` routing so hotkeys never bleed across machines.
- **Explicit Session Control:** Clean startup defaults with **`Save`** and **`Reset`**.
- **5-Tab 3Blue1Brown Visual Manual (`?`):** Animated explainers & live MacBook Air key tester for every device plus CDJ / Ableton Link / MIDI sync.
