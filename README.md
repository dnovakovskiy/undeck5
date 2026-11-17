<div align="center">
  <img src="docs/assets/logo.svg" alt="player5 — Local Prototype · 3 Friends: 2x B2B DJs + 1x Laptop Drum Machine" width="560" />
  <br /><br />
  <img src="docs/assets/hero-retrowave-b2b.jpg" alt="View from behind the booth in a Berlin underground warehouse techno club: two DJs mixing B2B across 4 decks while the 3rd friend stands beside them on stage playing a wired laptop drum machine in front of a locked-in crowd" width="100%" />

  <h3>
    Berlin booth. Four CDJs. Two friends intensely pretending to tweak the EQs B2B.<br />
    <em>What is Friend #3 supposed to do — nod politely with an unlit cigarette waiting 40 minutes for a turn?</em>
  </h3>
  <p>
    Plug an Ethernet dongle into the booth switch, hijack the master clock over reverse-engineered Pro DJ Link (or Ableton Link), and declare yourself <strong>Player #5</strong> — casually dropping dub techno sub-bass, breakbeats, and dramatic noise buildups from a MacBook keyboard like it's completely normal.
  </p>
  <p>
    🎬 <a href="docs/assets/player5-overview.mp4"><strong>Watch the 18-Second Live Audio + Video Overview (<code>docs/assets/player5-overview.mp4</code>)</strong></a>
  </p>
</div>

> [!IMPORTANT]
> **Status: Shameless Local Prototype (Runs on Your Laptop Today — Native App Maybe Later)**
> Nobody asked for a Rust drum machine pretending to be a fifth CDJ, yet here we are. `player5` is currently an **early local prototype** meant for living-room afterhours, questionable studio experiments, and crashing your friends' B2B set from a browser tab (or one offline `.html` file + a tiny Rust sync bridge). Because the whole synth and sequencer core (`core/`) is already deterministic Rust, it **may grow up into a native macOS / iPadOS booth app** later.

---

## ⚡ How It Works in 10 Seconds (ADHD-Friendly Edition)

1. **Switch between machines by hotkey (`⌥1`–`⌥5` or `` ` ``)** — **Step Sequencer** (`⌥1`), **Pattern Player** *(Traktor Pro 4+ style, `⌥2`)*, **DJS-1000 Pad Deck** (`⌥3`), **RMX-1000 Remix Station** (`⌥4`), or **13" MacBook Booth Split** (`⌥5` / `Shift + ~`).
2. **Press `Space`** — instant synthesized club drums and heavy sub-bass right out of your laptop, **zero plugins or paid sample packs needed**.
3. **Toggle any machine `ACTIVE` or `PASSIVE` (`\` or `⌥⇧1`–`⌥⇧4`)** — passive machines stay silent and ignore device hotkeys, and the **`⌨ KEYS → …`** badge shows the **single `ACTIVE` machine** currently driven by your keyboard (zero cross-machine collisions!).
4. **Cook a techno buildup & drop with one finger** — on **Pattern Player**, tap or hold **`Q`**, **`W`**, **`E`**, or **`T`** (echo + HPF sweep, white-noise jet, snare spiral, or sub-kill reverb), then hit **`R` (`RELEASE INTO DROP!`)** on Beat 1 to slam full sub-bass back onto the groove.
5. **Glue it to your friends' decks** — plug into the booth Ethernet switch (**Pioneer Pro DJ Link** / **Opus Quad**), hop on Wi-Fi (**Ableton Link**), or use **USB/DIN MIDI** / **Tap Tempo** so your loops stay phase-locked to Decks 1–4.

---

## 🎛️ What It Looks Like in Action

Every surface shares **one sample-accurate clock and Rust/Wasm audio engine**, so switching views or color themes never hiccups. Fresh builds always open clean — click **`Save`** to store your startup rig, or **`Reset`** anytime to wipe back to factory defaults.

### 1. Pattern Player *(Traktor Pro 4+ Style Heavy-Bass Layer Deck)*

Minimalist club layer deck built to ride underneath or on top of a playing DJ track. Every shortcut is printed right on its on-screen key strip and pad corners: punch **`1`–`0`, `-`, `=`** for **12 pre-baked Techno Sub, House, and Breakbeat patterns**, toggle **`KICK CUT` (`.`)** or **`DUCKING` (`U`)** so you never clash with the mixer's kick, and fire **`BUILDUP → DROP FX`** (`Q / W / E / T` → `R`) during breakdowns.

![Pattern Player — Traktor Pro 4+ style layer deck with on-screen hotkey strip, heavy sub-bass kits, UK Sub Breakbeat pattern, and Echo + HPF Filter buildup armed for the drop](docs/assets/screen-pattern-player.png)

- **7 Heavy-Bass Synthesized Kits + Offline WAV Loader:** Ships with `Berlin Sub Rumble`, `Hard Industrial Sub`, `Peak-Time Acid Sub`, `UK Sub & Breakbeat`, `Minimal Sub-Click`, `Chicago Sub-Jack`, and `Top + Sub Layer (No Kick)` — plus **`+ Load WAV`** to drop local `.wav`/`.mp3`/`.ogg` one-shots from your laptop *(commercial artist kits inside Traktor Pro 4 are proprietary bundled assets, so `player5` synthesizes club-weight sub kits natively and supports offline local samples)*.

---

### 2. Three Classic Club Hardware Paradigms + 13" MacBook Booth Split (`⌥5` / `⇧~`)

Pair **TR Grid**, **Pattern Player**, or **DJS-1000** on the left with **Pioneer RMX-1000** on the right on a `1280×800` / `1440×800` screen with zero scrolling — and press **`⌥~`** anytime to swap keyboard focus between the left deck and `RMX-1000`.

![Booth Split — Zero-scroll 1440x800 cockpit pairing the 64-step TR drum machine on the left with the RMX-1000 Remix Station on the right](docs/assets/screen-booth-split.png)

| Machine | Switch / Toggle | Signature Workflow |
| :--- | :--- | :--- |
| **🥁 TR Step Sequencer** | View: `⌥1` · Toggle: `\` or `⌥⇧1` | `10×16` grid with **64-step `A–D` chains**, 7 drum circuits (`TR-8O8`, `TR-9O9`, `TR-7O7`, `TR-6O6`, `TR-72x`, `CR-78`), Breakbeat presets, **`Hold R` Fill**, and **`⌥F` Auto-Fill** |
| **🎛️ Pattern Player** | View: `⌥2` · Toggle: `\` or `⌥⇧2` | **12 Techno / House / Breakbeat loops** (`1–0, -, =`), heavy sub weight, **`KICK CUT` (`.`)**, **`DUCKING` (`U`)**, and **1-button Buildup → Drop (`Q/W/E/T` → `R`)** |
| **🟦 DJS-1000 Deck** | View: `⌥3` · Toggle: `\` or `⌥⇧3` | **8 Scenes** (incl. Breakbeats `S3`, `S6`, `S8`), left-hand **`4×4` RGB Pads** (`1–4 / Q–R / A–F / Z–V`), **Touch Strip** (`G/H/J/K`), and quantized **Live Rec** (`U`) |
| **🌀 RMX-1000 Station** | View: `⌥4` · Toggle: `\` or `⌥⇧4` | **3-Band Isolator Kills** (`Q/W/E`), **10 Scene FX** (`Y–P` Build / `A–G` Break), **X-Pad Roll Ribbon** (`1–4` + `5–0`), and **`Hold R` Release Lever** |

![Pioneer DJS-1000 Deck in Pioneer CDJ color scheme with S3 Warehouse Break scene, 4x4 RGB performance pads, and corner MacBook hotkey badges](docs/assets/screen-djs1000.png)

---

### 3. Interactive 3Blue1Brown Visual Manual & DJ Sync Guide (`?`)

Press **`?`** (or click **`How to · ?`** / **`Sync Guide · ?`**) anytime for **un-rushed 3Blue1Brown-style animated visual chapters**, step-by-step operating procedures, and an interactive MacBook Air keyboard tester.

![Interactive 3Blue1Brown Visual Manual showing Pioneer CDJ Pro DJ Link Ethernet topology and step-by-step DJ Sync procedures](docs/assets/screen-howto-sync.png)

---

## 🛠️ How to Install & Start (Local Prototype)

### Option 0: Zero-Build Offline File (Fastest)

Download **`player5-offline.html`** from the [**`v0.1.0` Release**](https://github.com/dnovakovskiy/player5/releases/tag/v0.1.0) and double-click it in Chrome, Safari, or Edge. Everything (synthesizer, 4 surfaces, visual manual) runs locally with zero server and zero network requests *(note: Pro DJ Link / Ableton Link sync needs the local bridge below)*.

### Option A: Copy-Paste Prompt for Your AI Coding Agent

Using **Antigravity**, **Claude Code**, **Cursor**, or **Codex**? Paste this prompt:

```text
Clone https://github.com/dnovakovskiy/player5.git (if not already cloned), check that Rust (with wasm32-unknown-unknown) and Node.js 20+ are installed, build the WebAssembly DSP core with ./scripts/build-wasm.sh, install web dependencies in apps/web, start the local dev server, and give me the localhost URL to open in Chrome.
```

### Option B: Run Locally from Source (Mac / Linux)

**Prerequisites:** [Node.js 20+](https://nodejs.org/) and [Rust (`rustup`)](https://rustup.rs/).

```sh
git clone https://github.com/dnovakovskiy/player5.git
cd player5
rustup target add wasm32-unknown-unknown
./scripts/build-wasm.sh
cd apps/web && npm install && npm run dev
```

Open **`http://localhost:5173`**, hit **`Space`**, and start annoying your B2B friends. *(Or run `npm run build:single` inside `apps/web` to pack everything into one offline file at `apps/web/dist-single/player5.html`.)*

---

## 🔗 Syncing with Friends' CDJs, Opus Quad, Ableton Link & MIDI

| Booth Setup | What You Need | Exact Setup Steps |
| :--- | :--- | :--- |
| **Pioneer CDJ-2000NXS2 / CDJ-3000 + DJM** *(Pro DJ Link)* | USB-C → Ethernet into the booth LAN switch | Build web (`cd apps/web && npm run build`), then from repo root run `cargo run --release -p player5-bridge -- --source prolink --web apps/web/dist` (use `--source opus` for **AlphaTheta Opus Quad**). Open **`http://localhost:17505`**, select **`Bridge`** in **CLOCK**, click **`Connect`**, and set **Follow** to **`Tempo master`**. |
| **Ableton Live, Traktor Pro 4, Serato, Rekordbox, DJay** *(Ableton Link)* | Same Wi-Fi / LAN | Enable **Link** in your DJ app/DAW, build web (`cd apps/web && npm run build`), then run `cargo run --release -p player5-bridge --features ableton-link -- --source link --web apps/web/dist`. Open **`http://localhost:17505`**, select **`Ableton Link`** in **CLOCK**, and click **`Join Link`**. |
| **Hardware Mixer / Synth MIDI Out** *(24 PPQN)* | USB-MIDI cable + Chrome/Edge | Select **`MIDI`** in **CLOCK** and pick your MIDI input port. |
| **Vinyl / Turntables / Zero Cables** *(Tap + Nudge)* | Just your ears | Select **`Tap`** in **CLOCK**, tap **`T`** 4× on the kick, and nudge phase `±1 ms` with **`;` / `'`** + calibrate speaker delay with **`Sync Click`**. |

---

## 🧭 How Is `player5` Different from Existing GitHub Projects?

Existing open-source repos solve **either** network clock translation (with zero instrument) **or** a single browser drum toy (with zero booth sync):
- **Sync-Only Bridges** (`Deep-Symmetry/beat-link-trigger`, `strikeout/autoblink`, `evanpurkhiser/prolink-go`, `kyleawayan/opus-quad-pro-dj-link-analysis`): Translate Pro DJ Link into MIDI/Link, but require a separate DAW or \$800+ hardware box to make sound.
- **Browser Grooveboxes / Partial Clones** (`io-8O8` web clones, `gdamdam/mpump`, `x-1000`, `noturderek/djs1000-emulator`): Lack native Pioneer Pro DJ Link + Opus Quad + MIDI PLL clock following and don't combine synthesis, pad scenes, pattern layering, and club remix FX in one deterministic engine.
- **`player5`** fuses **every DJ booth sync protocol** (Pro DJ Link, Opus Quad, Ableton Link, 24-PPQN MIDI PLL, Tap + phase/latency offset) directly into a **multi-device Rust/Wasm performance instrument** (`TR-REC` + `Pattern Player` + `DJS-1000` + `RMX-1000`) built for the 3rd friend at a B2B session.

---

<details>
<summary><strong>🧪 Developer Commands &amp; Architecture Docs (Click to expand)</strong></summary>

<br />

```sh
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
cd apps/web && npm run check && npm run verify-wasm && npx playwright test
```

- [`CLAUDE.md`](CLAUDE.md) — architecture conventions & test invariants
- [`apps/bridge/README.md`](apps/bridge/README.md) — `player5-bridge` CLI flags (`prolink`, `opus`, `sim`, Ableton Link)
- [`docs/adr/`](docs/adr/) & [`docs/protocols/`](docs/protocols/) — clean-room protocol & DSP architecture notes

</details>
