# Changelog

## v0.1.0 — First Local Prototype Release

> **Status:** Early local prototype running in your browser, offline single-file HTML (`player5.html`), and local Rust sync bridge (`player5-bridge`). Built on a deterministic Rust DSP + Sequencer core (`core/`) as the foundation for an eventual native booth app.

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
