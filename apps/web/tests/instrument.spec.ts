import { expect, test } from "@playwright/test";
import {
  app,
  openDrawer,
  base64Url,
  expectClean,
  expectPhoneLayout,
  expectPlayheadAdvances,
  guard,
  peakDb,
  play,
  reopen,
  settledUrl,
  step,
  VOICE_IDS,
} from "./support/helpers";

test.afterEach(({ page }) => expectClean(page));

test("plays: playhead advances, meter shows a level, Stop clears", async ({ page }) => {
  const errors = guard(page);
  await page.goto("/");
  await expect(app(page)).toHaveAttribute("data-playing-step", "-1");
  await play(page);
  await expectPlayheadAdvances(page, 4);
  // The default groove has kicks: the decaying peak shows real level.
  await expect.poll(() => peakDb(page), { timeout: 10_000 }).toBeGreaterThan(-30);
  await expect(page.locator("#meter")).toHaveAttribute("aria-valuetext", /dBFS/);
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(app(page)).toHaveAttribute("data-playing-step", "-1");
  expect(errors).toEqual([]);
});

test("Space toggles play from anywhere but text fields", async ({ page }) => {
  guard(page);
  await page.goto("/");
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("Space");
  await expect(page.locator("#status")).toHaveAttribute("data-state", "running", { timeout: 15_000 });
  await expect(page.locator("#play")).toHaveAttribute("aria-pressed", "true");
  // A focused step button: Space still means play/stop, not "toggle step".
  await step(page, "kick", 2).focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#play")).toHaveAttribute("aria-pressed", "false");
  await expect(step(page, "kick", 2)).toHaveAttribute("data-state", "off");
  // Enter toggles the focused step; arrows move.
  await page.keyboard.press("Enter");
  await expect(step(page, "kick", 2)).toHaveAttribute("data-state", "on");
  await page.keyboard.press("ArrowDown");
  await expect(step(page, "snare", 2)).toBeFocused();
});

test("every voice toggles and round-trips through the URL", async ({ page }) => {
  const errors = guard(page);
  await page.goto("/");
  await play(page); // the core validates every pattern we send it
  await page.getByRole("button", { name: "Clear" }).click();
  for (const [i, voice] of VOICE_IDS.entries()) {
    const n = i + 1;
    const s = step(page, voice, n);
    await expect(s).toHaveAttribute("data-state", "off");
    await s.click();
    await expect(s).toHaveAttribute("data-state", "on");
    await step(page, voice, 16 - i).click();
    await step(page, voice, 16 - i).click();
    await expect(step(page, voice, 16 - i)).toHaveAttribute("data-state", "accent");
  }
  await expect(page.locator("#status")).toHaveAttribute("data-state", "running");
  const url = await settledUrl(page);
  expect(url).toContain("#p=");
  await page.goto("about:blank");
  await page.goto(url);
  for (const [i, voice] of VOICE_IDS.entries()) {
    await expect(step(page, voice, i + 1)).toHaveAttribute("data-state", "on");
    await expect(step(page, voice, 16 - i)).toHaveAttribute("data-state", "accent");
  }
  // Untouched steps stay off.
  await expect(step(page, "cowbell", 1)).toHaveAttribute("data-state", "off");
  expect(errors).toEqual([]);
});

test("flam edit mode toggles flams with distinct states", async ({ page }) => {
  guard(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Clear" }).click();
  const a = step(page, "snare", 5);
  const b = step(page, "snare", 13);
  await a.click(); // hit
  await b.click();
  await b.click(); // accent
  const flamMode = page.getByRole("button", { name: "Flam edit" });
  await flamMode.click();
  await expect(flamMode).toHaveAttribute("aria-pressed", "true");
  await a.click();
  await b.click();
  await expect(a).toHaveAttribute("data-state", "flam");
  await expect(b).toHaveAttribute("data-state", "accent-flam");
  // An empty step becomes a flammed hit; toggling again leaves the hit.
  const c = step(page, "snare", 7);
  await c.click();
  await expect(c).toHaveAttribute("data-state", "flam");
  await c.click();
  await expect(c).toHaveAttribute("data-state", "on");
  await flamMode.click();
  // Normal taps keep the flam through hit → accent → off.
  await a.click();
  await expect(a).toHaveAttribute("data-state", "accent-flam");
  await a.click();
  await expect(a).toHaveAttribute("data-state", "off");
  // Persisted as f/F in the pattern.
  await reopen(page);
  await expect(b).toHaveAttribute("data-state", "accent-flam");
});

test("mute silences a voice and survives a reload", async ({ page }) => {
  guard(page);
  await page.goto("/");
  await page.getByRole("combobox", { name: "Load a preset pattern" }).selectOption("bare-kick");
  await play(page);
  await expect.poll(() => peakDb(page), { timeout: 10_000 }).toBeGreaterThan(-30);
  const mute = page.getByRole("button", { name: "Mute Bass drum" }).first();
  await mute.click();
  await expect(page.locator('.row[data-voice="kick"]')).toHaveClass(/muted/);
  await expect(mute).toHaveAttribute("aria-pressed", "true");
  // The meter falls ~20 dB/s once the kick stops.
  await expect.poll(() => peakDb(page), { timeout: 10_000 }).toBeLessThan(-45);
  await reopen(page);
  await expect(page.locator('.row[data-voice="kick"]')).toHaveClass(/muted/);
});

test("presets load original patterns and undo restores", async ({ page }) => {
  guard(page);
  await page.goto("/");
  const select = page.getByRole("combobox", { name: "Load a preset pattern" });
  const options = await select.locator("option").allTextContents();
  expect(options.length).toBeGreaterThanOrEqual(5); // placeholder + 4 or more
  for (const name of ["Basement Four", "Night Shift", "Circuit Break", "Late Swing"]) {
    expect(options).toContain(name);
  }
  await select.selectOption({ label: "Night Shift" });
  await expect(page.locator("#bpm")).toHaveValue("132");
  await expect(step(page, "closed_hat", 3)).toHaveAttribute("data-state", "accent");
  await expect(step(page, "low_tom", 3)).toHaveAttribute("data-state", "on");
  await select.selectOption({ label: "Late Swing" });
  await expect(page.locator("#bpm")).toHaveValue("112");
  await expect(step(page, "snare", 5)).toHaveAttribute("data-state", "accent-flam");
  await expect(page.locator("#shuffle-out")).toHaveText("60%");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("#bpm")).toHaveValue("132");
  await page.keyboard.press("Control+z");
  await expect(page.locator("#bpm")).toHaveValue("124");
  await page.keyboard.press("Control+Shift+z");
  await expect(page.locator("#bpm")).toHaveValue("132");
});

test("an old kick-only link still loads", async ({ page }) => {
  guard(page);
  // Exactly what the first web shell wrote into the URL.
  const old = {
    bpm: 128,
    shuffle: 0.25,
    accent: 1,
    voices: { kick: { steps: "X---x---X---x-x-", tune: 0.3, decay: 0.7, level: 0.9 } },
    render: { output_gain: 1, limiter: true },
  };
  await page.goto(`/#p=${base64Url(JSON.stringify(old))}`);
  await expect(page.locator("#bpm")).toHaveValue("128");
  await expect(step(page, "kick", 1)).toHaveAttribute("data-state", "accent");
  await expect(step(page, "kick", 5)).toHaveAttribute("data-state", "on");
  await expect(step(page, "kick", 15)).toHaveAttribute("data-state", "on");
  await expect(step(page, "kick", 2)).toHaveAttribute("data-state", "off");
  await expect(step(page, "snare", 1)).toHaveAttribute("data-state", "off");
  await expect(page.locator("#limiter")).toBeChecked();
  await expect(page.locator("#vc-tune-out")).toHaveText("30%");
  await expect(page.locator("#shuffle-out")).toHaveText("25%");
  await play(page);
  await expectPlayheadAdvances(page, 3);
});

test("voice panel shows each voice's controls", async ({ page }) => {
  guard(page);
  await page.goto("/");
  const expected: Record<string, string[]> = {
    BD: ["tune", "decay", "level"],
    SD: ["tune", "tone", "snappy", "decay", "level"],
    LT: ["tune", "decay", "level"],
    RS: ["tune", "tone", "decay", "level"],
    CP: ["tone", "decay", "level"],
    CH: ["tone", "decay", "level"],
    OH: ["tone", "decay", "level"],
    CB: ["tune", "tone", "decay", "level"],
  };
  for (const [short, controls] of Object.entries(expected)) {
    await page.locator(".voice-btn", { hasText: new RegExp(`${short}$`) }).click();
    const got = await page.locator("#voice-controls input[data-control]").evaluateAll((els) =>
      els.map((e) => (e as HTMLInputElement).dataset.control),
    );
    expect(got, short).toEqual(controls);
  }
  // A control change lands in the pattern.
  await page.locator('[data-select="snare"]').click();
  await page.locator("#vc-snappy").fill("0.8");
  await expect(page.locator("#vc-snappy-out")).toHaveText("80%");
  await reopen(page);
  await page.locator('[data-select="snare"]').click();
  await expect(page.locator("#vc-snappy")).toHaveValue("0.8");
});

test("master: gain in dB and limiter round-trip", async ({ page }) => {
  guard(page);
  await page.goto("/");
  await openDrawer(page, "settings");
  await page.locator("#gain").fill("-6");
  await expect(page.locator("#gain-out")).toHaveText("−6.0 dB");
  await page.locator("#limiter").check();
  await reopen(page);
  await expect(page.locator("#gain-out")).toHaveText("−6.0 dB");
  await expect(page.locator("#limiter")).toBeChecked();
});

test("share and import without dialogs", async ({ page }) => {
  const errors = guard(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Share" }).click();
  await expect(page.locator("#share-msg")).toContainText(/Link (copied|selected)/);
  const link = await page.locator("#share-link").inputValue();
  expect(link).toContain("#p=");
  const code = await page.locator("#share-code").inputValue();
  expect(link.endsWith(code)).toBe(true);
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(step(page, "kick", 1)).toHaveAttribute("data-state", "off");
  await openDrawer(page, "share");
  await page.locator("#import").fill(link);
  await page.locator("#import").press("Enter");
  await expect(page.locator("#share-msg")).toHaveText("Pattern loaded.");
  await expect(step(page, "kick", 1)).toHaveAttribute("data-state", "accent");
  await page.locator("#import").fill("not a code!");
  await page.getByRole("button", { name: "Load" }).click();
  await expect(page.locator("#share-msg")).toContainText("not a player5 pattern");
  expect(errors).toEqual([]);
});

test("phone width: no horizontal scroll, 16 px gutter", async ({ page }) => {
  guard(page);
  await page.goto("/");
  await expectPhoneLayout(page);
  await play(page);
  await expectPhoneLayout(page);
});

test("tap tempo sets the BPM and reaches the engine", async ({ page }) => {
  guard(page);
  await page.goto("/");
  await play(page);
  const tap = page.locator("#tap");
  for (let i = 0; i < 5; i++) {
    await tap.dispatchEvent("pointerdown");
    await page.waitForTimeout(500);
  }
  // 500 ms apart ≈ 120 BPM (timer and event jitter allowed).
  await expect.poll(async () => Number(await page.locator("#bpm").inputValue())).toBeGreaterThan(110);
  expect(Number(await page.locator("#bpm").inputValue())).toBeLessThan(130);
  await expect
    .poll(async () => Number(await page.locator("#clock").getAttribute("data-tempo")))
    .toBeCloseTo(Number(await page.locator("#bpm").inputValue()), 1);
});

test("garbage in the hash or the import field never breaks the page", async ({ page }) => {
  const errors = guard(page);
  const hostile = {
    bpm: "fast",
    shuffle: 7,
    accent: -3,
    flam: null,
    voices: {
      kick: { steps: 42, tune: "x", level: 1e999 },
      snare: { steps: "<img src=x onerror=alert(1)> XXXX", mute: "yes" },
      cymbal: { steps: "xxxx" },
    },
    render: { output_gain: -5, limiter: "yes", bars: 99 },
  };
  const hashes = [
    "#p=!!!",
    "#p=A",
    "#p=AAAA",
    `#p=${base64Url("[]")}`,
    `#p=${base64Url("null")}`,
    `#p=${base64Url('"a string"')}`,
    `#p=${base64Url('{"__proto__":{"polluted":1},"voices":{"__proto__":{"steps":"xxxx"}}}')}`,
    `#p=${base64Url(JSON.stringify(hostile))}`,
    `#p=${"A".repeat(100_000)}`,
  ];
  for (const hash of hashes) {
    await page.goto("about:blank");
    await page.goto(`/${hash}`);
    await expect(page.locator("#bpm"), hash.slice(0, 40)).toHaveValue(/^\d+(\.\d+)?$/);
    // The page settles on a valid pattern and writes it back to the URL.
    const code = await page.locator("#share-code").inputValue();
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    await expect.poll(() => page.url()).toContain(`#p=${code}`);
    expect(await page.evaluate(() => "polluted" in ({} as object))).toBe(false);
  }
  // The hostile object, sanitised: defaults and clamps, no stray markup.
  await page.goto("about:blank");
  await page.goto(`/#p=${base64Url(JSON.stringify(hostile))}`);
  await expect(page.locator("#bpm")).toHaveValue("120");
  await expect(page.locator("#shuffle-out")).toHaveText("100%");
  await expect(page.locator("#accent-out")).toHaveText("0%");
  await expect(page.locator("#gain-out")).toHaveText("−∞ dB");
  await expect(page.locator("#limiter")).not.toBeChecked();
  await expect(page.locator(".row.muted")).toHaveCount(0);
  await expect(page.locator("#app img")).toHaveCount(0);
  const states = await page
    .locator('.step[data-voice="snare"]')
    .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.state));
  expect(states).toHaveLength(16);
  for (const s of states) expect(["off", "on", "accent"]).toContain(s);
  // ...and the core accepts it.
  await play(page);
  await expectPlayheadAdvances(page, 3);
  // The import field rejects junk without touching the pattern.
  await openDrawer(page, "share");
  const before = await page.locator("#share-code").inputValue();
  for (const junk of ["   ", "#p=", "p=%%%", "https://example.com/#p=@@@", "x".repeat(5000)]) {
    await page.locator("#import").fill(junk);
    await page.locator("#import").press("Enter");
    await expect(page.locator("#share-msg")).toContainText("not a player5 pattern");
    await expect(page.locator("#share-code")).toHaveValue(before);
  }
  expect(errors).toEqual([]);
});

test("the skip link focuses the grid and keeps the pattern in the URL", async ({ page }) => {
  guard(page);
  await page.goto("/");
  const url = await settledUrl(page);
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to the pattern" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(step(page, "kick", 1)).toBeFocused();
  expect(page.url()).toBe(url);
});

test("RMX-1000 Station mode: X-Pad overdub, Scene FX, Isolator, Release lever and phone layout", async ({ page }) => {
  const errors = guard(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Clear" }).click();
  await page.locator("#mode-rmx").click();
  await expect(app(page)).toHaveAttribute("data-surface", "rmx");
  await expect(page.locator("#rmx-panel")).toBeVisible();
  await expect(page.locator("#grid-panel")).toBeHidden();

  // Enable Overdub and trigger Clap on the X-Pad (with Quantize enabled by default)
  await expect(page.locator("#rmx-quantize")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#rmx-overdub").click();
  await expect(page.locator("#rmx-overdub")).toHaveAttribute("aria-pressed", "true");
  await page.locator('[data-xpad-slot="2"]').click();
  await expect(page.locator("#rmx-readout")).toContainText("X-PAD CLAP 1/8 · QUANT");

  // Select Scene FX (SPIRAL UP) and set level
  await page.locator('[data-scene-fx="spiral_up"]').click();
  await page.locator("#rmx-scene-amount").fill("0.65");
  await expect(page.locator("#rmx-scene-amount-out")).toHaveText("65%");
  await expect(page.locator("#rmx-readout")).toContainText("SPIRAL UP 65%");

  // Pull and release the Release FX lever: resets Scene FX to 0%
  const lever = page.locator("#rmx-release-lever");
  await lever.dispatchEvent("pointerdown");
  await expect(lever).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => window.dispatchEvent(new PointerEvent("pointerup")));
  await expect(lever).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#rmx-scene-amount-out")).toHaveText("0%");

  // Check phone layout in RMX mode
  await expectPhoneLayout(page);

  // Switch back to Step Sequencer and verify Overdub recorded the Clap hit
  await page.locator("#mode-seq").click();
  await expect(app(page)).toHaveAttribute("data-surface", "sequencer");
  await expect(step(page, "clap", 1)).toHaveAttribute("data-state", "accent");
  expect(errors).toEqual([]);
});

test("Nu-Disco, House, and Techno presets and analog drum kit selector retune voices without erasing steps", async ({ page }) => {
  const errors = guard(page);
  await page.goto("/");
  const presetSelect = page.getByRole("combobox", { name: "Load a preset pattern" });
  const kitSelect = page.getByRole("combobox", { name: "Load a drum kit voicing" });

  // Verify Nu-Disco, House, and Techno presets load with their kits
  await presetSelect.selectOption({ label: "Parisian Filter" });
  await expect(page.locator("#bpm")).toHaveValue("120");
  await expect(app(page)).toHaveAttribute("data-kit", "studio-disco");
  await expect(step(page, "clap", 5)).toHaveAttribute("data-state", "accent-flam");

  await presetSelect.selectOption({ label: "Warehouse Jack" });
  await expect(presetSelect).toHaveValue("warehouse-jack");
  await expect(kitSelect).toHaveValue("sub-boom");
  await expect(page.locator("#bpm")).toHaveValue("126");
  await expect(app(page)).toHaveAttribute("data-kit", "sub-boom");
  await expect(page.locator("#vc-tune-out")).toHaveText("12%");
  await expect(page.locator("#vc-decay-out")).toHaveText("94%");

  // Switch drum kit voicing to TR-9O9 · Club Punch while keeping Warehouse Jack steps
  await kitSelect.selectOption({ label: "TR-9O9 · Club Punch" });
  await expect(presetSelect).toHaveValue("warehouse-jack");
  await expect(kitSelect).toHaveValue("club-punch");
  await expect(app(page)).toHaveAttribute("data-kit", "club-punch");
  await expect(page.locator("#vc-tune-out")).toHaveText("68%");
  await expect(page.locator("#vc-decay-out")).toHaveText("46%");
  await expect(step(page, "kick", 15)).toHaveAttribute("data-state", "on");

  // Load Peak-Time Techno preset
  await presetSelect.selectOption({ label: "Sub Basement Rumble" });
  await expect(page.locator("#bpm")).toHaveValue("134");
  await expect(app(page)).toHaveAttribute("data-kit", "warehouse-raw");
  await expect(step(page, "low_tom", 2)).toHaveAttribute("data-state", "on");
  expect(errors).toEqual([]);
});

test("MacBook Air keyboard bindings and 3Blue1Brown How-To video explainer (Step Sequencer vs RMX-1000 guides)", async ({ page }) => {
  const errors = guard(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Clear" }).click();

  // Select Snare (Digit2), toggle Step 5 (KeyG) to hit, and Shift+Step 13 (KeyB) to flam
  await page.keyboard.press("Digit2");
  await expect(page.locator("#voice-title")).toContainText("Snare");
  await page.keyboard.press("KeyG");
  await expect(step(page, "snare", 5)).toHaveAttribute("data-state", "on");
  await page.keyboard.press("Shift+KeyB");
  await expect(step(page, "snare", 13)).toHaveAttribute("data-state", "flam");

  // Switch drum kit via KeyU (TR-9O9 · Club Punch) and adjust BPM via BracketRight
  await page.keyboard.press("KeyU");
  await expect(app(page)).toHaveAttribute("data-kit", "club-punch");
  await page.keyboard.press("BracketRight");
  await expect(page.locator("#bpm")).toHaveValue("125");

  // Open the 3Blue1Brown How-To video explainer with '?' (Slash) in Step Sequencer mode
  await page.keyboard.press("Slash");
  const modal = page.locator("#how-to-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toHaveAttribute("data-guide-mode", "sequencer");
  await page.locator("#howto-more summary").click();
  await expect(page.locator("#howto-qs-seq")).toBeVisible();
  await expect(page.locator("#howto-qs-rmx")).toBeHidden();
  await expect(page.locator("#manim-canvas")).toBeVisible();
  await page.locator('[data-howto-chapter="2"]').click();
  await expect(page.locator("#howto-caption")).toContainText("TR-8O8");

  // Switch to the RMX-1000 Station Guide inside the How-To modal
  await page.locator("#howto-mode-rmx").click();
  await expect(modal).toHaveAttribute("data-guide-mode", "rmx");
  await expect(page.locator("#howto-qs-rmx")).toBeVisible();
  await expect(page.locator("#howto-qs-seq")).toBeHidden();
  await expect(page.locator("#howto-caption")).toContainText("RMX-1000 Station");

  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
  expect(errors).toEqual([]);
});

test("Maschine Groove/Humanize/Auto-Fill, Per-Sample & Group FX visual cues/shortcuts, and Ableton Link clock mode", async ({ page }) => {
  const errors = guard(page);
  await page.goto("/");

  // 1. Select MPC 62% Swing Pocket from Groove pocket selector
  const grooveSelect = page.locator("#groove-template");
  await grooveSelect.selectOption("mpc62");
  await expect(page.locator("#shuffle-out")).toHaveText("48%");
  await expect(page.locator("#humanize-out")).toHaveText("28%");

  // 2. Trigger 1-Bar Auto-Fill (Alt+KeyF) -> fills steps 13..16
  await page.keyboard.press("Alt+KeyF");
  await expect(step(page, "snare", 15)).toHaveAttribute("data-state", "flam");
  await expect(step(page, "snare", 16)).toHaveAttribute("data-state", "accent-flam");

  // 3. Per-Sample FX: toggle Dub Echo on Snare via Ctrl+Digit2 and Reverb via row RV LED
  await page.keyboard.press("Control+Digit2");
  const snareRow = page.locator('.row[data-voice="snare"]');
  await expect(snareRow).toHaveAttribute("data-fx", "echo");
  await expect(snareRow.locator('[data-voice-fx="echo"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#vfx-readout")).toContainText("SD:EC");

  await snareRow.locator('[data-voice-fx="reverb"]').click();
  await expect(snareRow).toHaveAttribute("data-fx", "multi");
  await expect(page.locator("#vfx-readout")).toContainText("SD:EC+RV");

  // 4. Group FX: Shift+W toggles Dub Echo on Closed + Open Hi-Hats
  await page.keyboard.press("Shift+KeyW");
  await expect(page.locator("#grp-fx-hats")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('.row[data-voice="closed_hat"]')).toHaveAttribute("data-fx", "echo");
  await expect(page.locator('.row[data-voice="open_hat"]')).toHaveAttribute("data-fx", "echo");

  // Clear all Per-Voice FX via Alt+KeyX
  await page.keyboard.press("Alt+KeyX");
  await expect(page.locator("#vfx-readout")).toHaveText("DRY · NO VOICE FX");
  await expect(snareRow).not.toHaveAttribute("data-fx");

  // 5. Ableton Link clock source selection
  await openDrawer(page, "clock");
  await page.locator(".seg label", { hasText: /^Ableton Link$/ }).click();
  await expect(page.locator("#clock")).toHaveAttribute("data-source", "link");
  await expect(page.locator("#link-url")).toBeVisible();
  await expect(page.locator("#link-peers")).toBeVisible();
  await expect(page.locator("#bpm")).toBeDisabled();

  // Switch back to Internal clock
  await page.locator(".seg label", { hasText: /^Internal$/ }).click();
  await expect(page.locator("#clock")).toHaveAttribute("data-source", "internal");
  await expect(page.locator("#bpm")).toBeEnabled();

  expect(errors).toEqual([]);
});

test("MacBook Air 13-inch Booth Split fits 1280x800 and 1440x800 above the fold without scroll", async ({ page }) => {
  const errors = guard(page);
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto("/");

  // Enter Booth Split via top tab
  await page.locator("#mode-booth").click();
  await expect(app(page)).toHaveAttribute("data-surface", "booth");
  await expect(page.locator("#grid-panel")).toBeVisible();
  await expect(page.locator("#rmx-panel")).toBeVisible();
  await expect(page.locator("#voice-panel")).toBeVisible();
  // Clock & sync lives behind the sync pill; closed by default.
  await expect(page.locator("#clock")).toBeHidden();
  await expect(page.locator("#sync-pill")).toBeVisible();

  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    const fit = await page.evaluate(() => {
      const gridRect = document.getElementById("grid-panel")!.getBoundingClientRect();
      const rmxRect = document.getElementById("rmx-panel")!.getBoundingClientRect();
      const clockRect = document.getElementById("clock")!.getBoundingClientRect();
      return {
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        gridRight: gridRect.right,
        rmxLeft: rmxRect.left,
        clockBottom: clockRect.bottom,
        rmxBottom: rmxRect.bottom,
      };
    });
    // Side-by-side columns (Sequencer left, RMX-1000 right) and 100% above 800px fold
    expect(fit.rmxLeft).toBeGreaterThanOrEqual(fit.gridRight);
    expect(fit.clockBottom).toBeLessThanOrEqual(800);
    expect(fit.rmxBottom).toBeLessThanOrEqual(800);
    expect(fit.scrollHeight).toBeLessThanOrEqual(800);
    expect(fit.scrollWidth).toBeLessThanOrEqual(fit.clientWidth);
  }

  // Shift+Backquote toggles Booth Split off and back on
  await page.keyboard.press("Shift+Backquote");
  await expect(app(page)).toHaveAttribute("data-surface", "sequencer");
  await page.keyboard.press("Shift+Backquote");
  await expect(app(page)).toHaveAttribute("data-surface", "booth");

  // Also stacks cleanly on 390x844 phone viewports with 16px side gutters
  await expectPhoneLayout(page);
  expect(errors).toEqual([]);
});

test("TR-8S A/B/A+B variations, Last Step, Solo, Kick Attack, Ride/Crash modes & URL round-trip", async ({ page }) => {
  const errors = guard(page);
  await page.goto("/");

  // Bank A starts with Kick step 1 = accent; switch to Bank B and turn Kick step 1 off
  await expect(step(page, "kick", 1)).toHaveAttribute("data-state", "accent");
  await page.locator("#var-bank-b").click();
  await expect(page.locator("#var-bank-b")).toHaveAttribute("aria-pressed", "true");
  await step(page, "kick", 1).click(); // accent -> off in Bank B
  await expect(step(page, "kick", 1)).toHaveAttribute("data-state", "off");

  // Switching back to Bank A preserves Kick step 1 = accent
  await page.locator("#var-bank-a").click();
  await expect(step(page, "kick", 1)).toHaveAttribute("data-state", "accent");

  // Chain A+B (32-step phrase) & set polymetric Last Step = 12
  await page.locator("#var-bank-ab").click();
  await expect(page.locator("#var-bank-ab")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#last-step").selectOption("12");
  await expect(step(page, "kick", 13)).toHaveClass(/past-last/);

  // Right-click (contextmenu) toggles Accent directly on Snare step 2
  await step(page, "snare", 2).click({ button: "right" });
  await expect(step(page, "snare", 2)).toHaveAttribute("data-state", "accent");

  // Solo Snare, adjust Kick Attack, switch OH -> 9O9 Ride & CB -> 9O9 Crash, open 10-Ch Mixer
  await page.locator('.solo[data-solo="snare"]').click();
  await expect(page.locator('.row[data-voice="kick"]')).toHaveClass(/muted/);
  await page.locator("#vc-kick-attack").fill("0.75");
  await page.locator("#vc-kick-attack").dispatchEvent("input");
  await expect(page.locator("#vc-kick-attack-out")).toHaveText("75%");

  await page.locator('[data-select="open_hat"]').click();
  await page.locator("#vc-oh-ride").click();
  await expect(page.locator("#vc-oh-ride")).toHaveText("9O9 Ride");

  await page.locator('[data-select="cowbell"]').click();
  await page.locator("#vc-cb-crash").click();
  await expect(page.locator("#vc-cb-crash")).toHaveText("9O9 Crash");

  await page.locator("#mixer-toggle").click();
  await expect(page.locator("#mixer-drawer")).toBeVisible();

  // Reload from #p= link and verify state round-trips
  await reopen(page);
  await expect(page.locator("#var-bank-ab")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#last-step")).toHaveValue("12");
  await expect(page.locator('.solo[data-solo="snare"]')).toHaveAttribute("aria-pressed", "true");
  await page.locator("#var-bank-b").click();
  await expect(step(page, "kick", 1)).toHaveAttribute("data-state", "off");
  expect(errors).toEqual([]);
});

test("Unified AudioWorklet RMX-1000 DSP: 24 dB/oct isolator full kill silences output and recovers", async ({ page }) => {
  const errors = guard(page);
  await page.goto("/");
  await page.locator("#mode-booth").click();
  await play(page);

  await expect.poll(() => peakDb(page), { timeout: 10_000 }).toBeGreaterThan(-30);

  // Engage true 0.0 (-inf dB) full kill across all 3 Linkwitz-Riley isolator bands
  await page.locator("#rmx-kill-low").click();
  await page.locator("#rmx-kill-mid").click();
  await page.locator("#rmx-kill-high").click();
  await expect.poll(() => peakDb(page), { timeout: 5_000 }).toBeLessThan(-45);

  // Reset RMX FX -> drum output immediately recovers on the unified bus
  await page.locator("#rmx-reset").click();
  await expect.poll(() => peakDb(page), { timeout: 5_000 }).toBeGreaterThan(-30);
  expect(errors).toEqual([]);
});

test("RMX-1000 X-Pad quantization locks to heard beat under output latency, shuffle, and Last Step", async ({ page }) => {
  const errors = guard(page);
  const pattern = {
    bpm: 110,
    shuffle: 0.45,
    last_step: 12,
    voices: {
      kick: { steps: "X---X---X---X---" },
      snare: { steps: "----------------" },
    },
  };
  await page.goto(`/#p=${base64Url(JSON.stringify(pattern))}`);
  await page.locator("#mode-booth").click();

  // Select Snare on Bank A slot 1 before arming Overdub, then arm Overdub with Quantize ON
  await expect(page.locator("#rmx-quantize")).toHaveAttribute("aria-pressed", "true");
  await page.locator('[data-xpad-slot="1"]').click();
  await page.locator("#rmx-overdub").click();
  await expect(page.locator("#rmx-overdub")).toHaveAttribute("aria-pressed", "true");

  await play(page);
  await expectPlayheadAdvances(page, 2);

  // Fire X-Pad Snare right at the moment heard playhead enters Step 5 (index 4 = beat 1.00).
  // Even though AudioWorklet/ScriptProcessor render head is ahead by outputLatency, heardBeat
  // quantization must snap to Step 5 (index 4), NOT push forward to Step 6 (index 5).
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const appEl = document.getElementById("app")!;
        let sawPrior = false;
        const tick = () => {
          const cur = Number(appEl.dataset.playingStep);
          if (cur === 3) sawPrior = true;
          if (sawPrior && cur === 4) {
            const pad = document.querySelector<HTMLButtonElement>('[data-xpad-slot="1"]')!;
            pad.dispatchEvent(
              new PointerEvent("pointerdown", {
                bubbles: true,
                cancelable: true,
                button: 0,
              }),
            );
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );

  await expect(step(page, "snare", 5)).toHaveAttribute("data-state", "accent");
  await expect(step(page, "snare", 6)).toHaveAttribute("data-state", "off");

  // Clear Snare and hold 1/8 Touch Roll while Overdub + Quantize are active (with 45% shuffle & Last Step = 12)
  await page.locator("#rmx-voice-clear").click();
  await expect(step(page, "snare", 5)).toHaveAttribute("data-state", "off");

  const roll8 = page.locator('[data-roll-div="8"]');
  await roll8.dispatchEvent("pointerdown", { button: 0 });
  await page.waitForTimeout(1100);
  await page.evaluate(() => window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true })));

  // Every recorded 1/8 roll hit must land on 0-based even 8th-note indices (data-step 1, 3, 5, 7, 9, 11)
  const snareStates = await page.evaluate(() =>
    Array.from({ length: 16 }, (_, i) =>
      document.querySelector(`.step[data-voice="snare"][data-step="${i + 1}"]`)?.getAttribute("data-state") ?? "off",
    ),
  );
  const activeIndices = snareStates
    .map((st, idx) => (st !== "off" ? idx : -1))
    .filter((idx) => idx >= 0);
  expect(activeIndices.length).toBeGreaterThanOrEqual(2);
  for (const idx of activeIndices) {
    expect(idx % 2).toBe(0);
    expect(idx).toBeLessThan(12);
  }
  expect(errors).toEqual([]);
});

test("Hardware visual/color schemes switch palettes cleanly and persist across reload", async ({ page }) => {
  const errors = guard(page);
  await page.goto("/");

  // Default 8O8 Booth theme starts on #0f1115 dark background
  const defaultBg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  expect(defaultBg).toBe("rgb(15, 17, 21)");

  await openDrawer(page, "settings");
  const themeSelect = page.locator("#theme-select");
  await expect(themeSelect).toHaveValue("default");

  // Switch to 9O9 Silver light industrial chassis
  await themeSelect.selectOption("tr-silver");
  await expect(app(page)).toHaveAttribute("data-theme", "tr-silver");
  const silverStyle = await page.evaluate(() => ({
    bg: getComputedStyle(document.documentElement).backgroundColor,
    scheme: getComputedStyle(document.documentElement).colorScheme,
  }));
  expect(silverStyle.bg).toBe("rgb(207, 211, 218)");
  expect(silverStyle.scheme).toBe("light");

  // Cycle through 8O8 Classic, TR-8S Neon, Pioneer CDJ, and NI Maschine
  for (const id of ["tr-classic", "tr-neon", "pioneer", "maschine"] as const) {
    await themeSelect.selectOption(id);
    await expect(app(page)).toHaveAttribute("data-theme", id);
  }

  // Reload and verify NI Maschine theme persisted in storage
  await page.reload();
  await expect(app(page)).toHaveAttribute("data-theme", "maschine");
  await expect(themeSelect).toHaveValue("maschine");
  expect(errors).toEqual([]);
});

test("64-step 4-bar A/B/C/D and A-D chain variations edit independent bars, copy forward, and round-trip via #p=", async ({ page }) => {
  const errors = guard(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Clear" }).click();

  // Bar A: place Snare hit on step 5
  await step(page, "snare", 5).click();
  await expect(step(page, "snare", 5)).toHaveAttribute("data-state", "on");

  // Copy A -> B, then add Snare step 13 on Bar B
  await page.locator("#var-copy-ab").click();
  await expect(page.locator("#var-bank-b")).toHaveAttribute("aria-pressed", "true");
  await expect(step(page, "snare", 5)).toHaveAttribute("data-state", "on");
  await step(page, "snare", 13).click();

  // Select Bar C, place Clap on step 9; select Bar D, inject Auto-Fill turnaround
  await page.locator("#var-bank-c").click();
  await expect(page.locator("#var-bank-c")).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Clear" }).click();
  await step(page, "clap", 9).click();
  await expect(step(page, "clap", 9)).toHaveAttribute("data-state", "on");

  await page.locator("#var-bank-d").click();
  await expect(page.locator("#var-bank-d")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#var-fill").click();
  await expect(step(page, "snare", 16)).toHaveAttribute("data-state", "accent-flam");

  // Engage 64-step 4-bar A-D chain and verify live bar inspection keeps A-D active
  await page.locator("#var-bank-abcd").click();
  await expect(page.locator("#var-bank-abcd")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#var-bank-a").click();
  await expect(page.locator("#var-bank-abcd")).toHaveAttribute("aria-pressed", "true");
  await expect(step(page, "snare", 13)).toHaveAttribute("data-state", "off");

  // Reload from URL #p= hash and verify all 4 bars + 64-step A-D mode survived
  await reopen(page);
  await expect(page.locator("#var-bank-abcd")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#var-bank-b").click();
  await expect(step(page, "snare", 13)).toHaveAttribute("data-state", "on");
  await page.locator("#var-bank-c").click();
  await expect(step(page, "clap", 9)).toHaveAttribute("data-state", "on");
  await page.locator("#var-bank-d").click();
  await expect(step(page, "snare", 16)).toHaveAttribute("data-state", "accent-flam");
  expect(errors).toEqual([]);
});

test("Pioneer DJS-1000 Deck mode: 8 Scenes, 4x4 RGB Pads, independent deck state & zero-scroll Booth Split swap", async ({ page }) => {
  const errors = guard(page);
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto("/");
  const trSnare3Before = (await step(page, "snare", 3).getAttribute("data-state")) ?? "off";

  // Switch to standalone DJS-1000 Deck surface -> auto-solos DJS-1000 ON and TR Drums OFF
  await page.locator("#mode-djs").click();
  await expect(app(page)).toHaveAttribute("data-surface", "djs");
  await expect(page.locator("#djs-panel")).toBeVisible();
  await expect(page.locator("#grid-panel")).toBeHidden();
  await expect(page.locator("#power-djs")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#power-tr")).toHaveAttribute("aria-pressed", "false");

  // Launch Scene 2 -> loads 4-bar 64-step scene on DJS-1000 without overwriting TR Drums
  await page.locator('[data-djs-scene="1"]').click();
  await expect(page.locator('[data-djs-scene="1"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-djs-bar="abcd"]')).toHaveAttribute("aria-pressed", "true");

  // Select Snare via Pad 2 in TRACK PLAY mode, then toggle step 3 on front-edge 16-step strip
  await page.locator('[data-djs-pad="1"]').dispatchEvent("pointerdown", { button: 0 });
  await expect(page.locator("#djs-screen-track")).toContainText("SD SNARE");
  const djsStep3 = page.locator('[data-djs-step="3"]');
  const beforeState = await djsStep3.getAttribute("data-state");
  await djsStep3.click();
  const editedDjsState = await djsStep3.getAttribute("data-state");
  expect(editedDjsState).not.toBe(beforeState ?? "off");

  // Switch pad modes (MUTE / SOLO, 16-PAD PITCH, HOT ROLL) and Capture Scene
  await page.locator('[data-djs-pad-mode="mute"]').click();
  await expect(page.locator('[data-djs-pad-mode="mute"]')).toHaveAttribute("aria-pressed", "true");
  await page.locator('[data-djs-pad-mode="scale"]').click();
  await expect(page.locator('[data-djs-pad="7"]')).toContainText("0 st");
  await page.locator('[data-djs-pad-mode="slice"]').click();
  await expect(page.locator('[data-djs-pad="2"]')).toContainText("1/16");
  await page.locator("#djs-capture-scene").click();
  await expect(page.locator('[data-djs-scene="1"]')).toContainText("Custom");

  // Verify 390x844 phone layout on DJS-1000 surface
  await expectPhoneLayout(page);

  // Enter MacBook Air 13" Booth Split and swap left deck from TR Grid -> DJS-1000 -> TR Grid
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.locator("#mode-booth").click();
  await expect(page.locator("#booth-swap-djs")).toBeVisible();
  await page.locator("#booth-swap-djs").click();
  await expect(app(page)).toHaveAttribute("data-booth-deck", "djs");
  await expect(page.locator("#djs-panel")).toBeVisible();
  await expect(page.locator("#rmx-panel")).toBeVisible();
  await expect(page.locator("#power-djs")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#power-tr")).toHaveAttribute("aria-pressed", "false");

  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    const fit = await page.evaluate(() => {
      const djsRect = document.getElementById("djs-panel")!.getBoundingClientRect();
      const rmxRect = document.getElementById("rmx-panel")!.getBoundingClientRect();
      const clockRect = document.getElementById("clock")!.getBoundingClientRect();
      return {
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        djsRight: djsRect.right,
        rmxLeft: rmxRect.left,
        clockBottom: clockRect.bottom,
        rmxBottom: rmxRect.bottom,
      };
    });
    expect(fit.rmxLeft).toBeGreaterThanOrEqual(fit.djsRight);
    expect(fit.clockBottom).toBeLessThanOrEqual(800);
    expect(fit.rmxBottom).toBeLessThanOrEqual(800);
    expect(fit.scrollHeight).toBeLessThanOrEqual(800);
    expect(fit.scrollWidth).toBeLessThanOrEqual(fit.clientWidth);
  }

  // Swap back to TR Grid inside Booth Split -> TR Drums kept its own independent pattern
  await page.locator("#booth-swap-tr").click();
  await expect(app(page)).toHaveAttribute("data-booth-deck", "sequencer");
  await expect(page.locator("#grid-panel")).toBeVisible();
  await expect(page.locator("#power-tr")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#power-djs")).toHaveAttribute("aria-pressed", "false");
  await expect(step(page, "snare", 3)).toHaveAttribute("data-state", trSnare3Before);

  // Swap back to DJS-1000 -> DJS retained its own edited Scene 2 pattern
  await page.locator("#booth-swap-djs").click();
  await expect(page.locator('[data-djs-step="3"]')).toHaveAttribute("data-state", editedDjsState!);
  expect(errors).toEqual([]);
});

test("Individual Machine ON/OFF switches and explicit Save / Reset startup persistence", async ({ page }) => {
  const errors = guard(page);
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto("/");

  // Default power state: TR Drums ON, DJS-1000 OFF, RMX-1000 ON
  await expect(page.locator("#power-tr")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#power-djs")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#power-rmx")).toHaveAttribute("aria-pressed", "true");

  await play(page);
  await expect.poll(() => peakDb(page), { timeout: 10_000 }).toBeGreaterThan(-30);

  // Turn OFF TR Drums (now both TR and DJS are OFF) -> output falls silent
  await page.locator("#power-tr").click();
  await expect(page.locator("#power-tr")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#grid-panel")).toHaveAttribute("data-machine-off", "true");
  await expect.poll(() => peakDb(page), { timeout: 10_000 }).toBeLessThan(-45);

  // Turn ON DJS-1000 alone -> DJS-1000 scene plays audio
  await page.locator("#power-djs").click();
  await expect(page.locator("#power-djs")).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => peakDb(page), { timeout: 10_000 }).toBeGreaterThan(-30);

  // Turn ON TR Drums too -> both machines layer simultaneously and manual mix survives surface switch
  await page.locator("#power-tr").click();
  await expect(page.locator("#power-tr")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#power-djs")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#mode-booth").click();
  await expect(page.locator("#power-tr")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#power-djs")).toHaveAttribute("aria-pressed", "true");

  // Engage RMX-1000 3-band Isolator kill -> silences master, then toggle RMX-1000 OFF -> dry drums return
  await page.locator("#rmx-kill-low").click();
  await page.locator("#rmx-kill-mid").click();
  await page.locator("#rmx-kill-high").click();
  await expect.poll(() => peakDb(page), { timeout: 10_000 }).toBeLessThan(-42);

  await page.locator("#power-rmx").click();
  await expect(page.locator("#power-rmx")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#rmx-panel")).toHaveAttribute("data-machine-off", "true");
  await expect(page.locator("#rmx-readout")).toContainText("BYPASSED");
  await expect.poll(() => peakDb(page), { timeout: 10_000 }).toBeGreaterThan(-30);

  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await page.locator("#mode-seq").click();

  // Unsaved edits do NOT leak into fresh "/" startup
  await page.locator("#reset-btn").click();
  await expect(step(page, "kick", 1)).toHaveAttribute("data-state", "accent");
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(step(page, "kick", 1)).toHaveAttribute("data-state", "off");
  await expect(page.locator("#save-btn")).toHaveAttribute("data-save-state", "dirty");

  await page.goto("about:blank");
  await page.goto("/");
  await expect(step(page, "kick", 1)).toHaveAttribute("data-state", "accent");

  // Explicit Save persists startup session across fresh "/" opens
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(step(page, "kick", 1)).toHaveAttribute("data-state", "off");
  await page.locator("#save-btn").click();
  await expect(page.locator("#save-btn")).toHaveAttribute("data-save-state", "saved");

  await page.goto("about:blank");
  await page.goto("/");
  await expect(step(page, "kick", 1)).toHaveAttribute("data-state", "off");

  // Prominent Reset restores factory default on all machines & clears saved startup session + URL hash
  await page.locator("#reset-btn").click();
  await expect(step(page, "kick", 1)).toHaveAttribute("data-state", "accent");
  await expect(page.locator("#save-btn")).toHaveAttribute("data-save-state", "clean");
  expect(page.url()).not.toContain("#p=");

  await page.goto("about:blank");
  await page.goto("/");
  await expect(step(page, "kick", 1)).toHaveAttribute("data-state", "accent");
  expect(errors).toEqual([]);
});

test("DJS-1000 & RMX-1000 full MacBook Air hotkeys and 5-tab 3Blue1Brown How-To + DJ Sync guide", async ({ page }) => {
  const errors = guard(page);
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto("/");

  // 1. DJS-1000 4x4 left-hand pad keys, Pad Mode keys (5..8), Scene keys (9/0), Live Rec (U)
  await page.locator("#mode-djs").click();
  await page.keyboard.press("KeyQ"); // Pad 5 = HT High Tom
  await expect(page.locator("#djs-screen-track")).toContainText("HT HIGH TOM");
  await page.keyboard.press("Digit2"); // Pad 2 = SD Snare
  await expect(page.locator("#djs-screen-track")).toContainText("SD SNARE");
  await page.keyboard.press("Digit6"); // Mute / Solo pad mode
  await expect(page.locator('[data-djs-pad-mode="mute"]')).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Digit7"); // 16-Pad Pitch mode
  await expect(page.locator('[data-djs-pad-mode="scale"]')).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Digit0"); // Next Scene (S2)
  await expect(page.locator('[data-djs-scene="1"]')).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("KeyU"); // Live Rec armed
  await expect(page.locator("#djs-live-rec")).toHaveAttribute("aria-pressed", "true");

  // 2. RMX-1000 Isolator Kill keys (Q/W/E), Scene FX keys (O + J), Overdub (C), Reset (.)
  await page.locator("#mode-rmx").click();
  await page.keyboard.press("KeyQ");
  await page.keyboard.press("KeyW");
  await page.keyboard.press("KeyE");
  await expect(page.locator("#rmx-kill-low")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#rmx-kill-mid")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#rmx-kill-high")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("KeyO"); // SPIRAL UP -> auto-bumps level to 35%
  await expect(page.locator("#rmx-readout")).toContainText("SPIRAL UP 35%");
  await page.keyboard.press("KeyJ"); // +10% -> 45%
  await expect(page.locator("#rmx-scene-amount-out")).toHaveText("45%");
  await page.keyboard.press("KeyC");
  await expect(page.locator("#rmx-overdub")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Period"); // Reset RMX FX
  await expect(page.locator("#rmx-kill-low")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#rmx-scene-amount-out")).toHaveText("0%");

  // 3. Clock 'Sync Guide' button opens How-To directly on DJ Sync (CDJ / Ableton Link / MIDI)
  await openDrawer(page, "clock");
  await page.locator("#clock-sync-help").click();
  const modal = page.locator("#how-to-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toHaveAttribute("data-guide-mode", "sync");
  await page.locator("#howto-more summary").click();
  await expect(page.locator("#howto-qs-sync")).toBeVisible();
  await expect(page.locator("#howto-caption")).toContainText("Pioneer CDJ Sync");

  await page.locator("#howto-mode-traktor").click();
  await expect(modal).toHaveAttribute("data-guide-mode", "traktor");
  await expect(page.locator("#howto-qs-traktor")).toBeVisible();
  await expect(page.locator("#howto-caption")).toContainText("Pattern Player");

  await page.locator("#howto-mode-djs").click();
  await expect(modal).toHaveAttribute("data-guide-mode", "djs");
  await expect(page.locator("#howto-qs-djs")).toBeVisible();
  await expect(page.locator("#howto-caption")).toContainText("DJS-1000 Deck");

  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
  expect(errors).toEqual([]);
});

test("Traktor Pro 4+ Pattern Player: heavy sub kits, Breakbeat patterns, Buildup-to-Drop UX & Booth Split fit", async ({ page }) => {
  const errors = guard(page);
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto("/");

  // Verify Breakbeat presets exist in TR Preset selector too
  const presetSelect = page.getByRole("combobox", { name: "Load a preset pattern" });
  await presetSelect.selectOption("warehouse-break");
  await expect(page.locator("#bpm")).toHaveValue("132");

  // Switch to Pattern Player -> auto-solos Pattern Player ON
  await page.locator("#mode-traktor").click();
  await expect(app(page)).toHaveAttribute("data-surface", "traktor");
  await expect(page.locator("#power-traktor")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#power-tr")).toHaveAttribute("aria-pressed", "false");

  // Launch UK Sub Break via Digit0, toggle Kick Cut (.) & Ducking (U)
  await page.keyboard.press("Digit0");
  await expect(page.locator("#trk-readout")).toContainText("UK SUB BREAK");
  await page.keyboard.press("Period");
  await expect(page.locator("#trk-kick-cut")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("KeyU");
  await expect(page.locator("#trk-ducking")).toHaveAttribute("aria-pressed", "true");

  // Engage dramatic 1-click Buildup (KeyQ = ECHO + HPF FILTER) -> arms Drop, then Release Into Drop (KeyR)
  await play(page);
  await expect.poll(() => peakDb(page), { timeout: 10_000 }).toBeGreaterThan(-35);
  await page.keyboard.press("KeyQ");
  await expect(page.locator("#trk-drop-btn")).toHaveAttribute("data-armed", "true");
  await expect(page.locator("#trk-buildup-status")).toContainText("Echo riser");

  await page.keyboard.press("KeyR");
  await expect(page.locator("#trk-drop-btn")).toHaveAttribute("data-armed", "false");
  await expect(page.locator("#trk-buildup-status")).toContainText("Dropped!");
  await page.getByRole("button", { name: "Stop", exact: true }).click();

  // Check 390x844 phone layout on Pattern Player
  await expectPhoneLayout(page);

  // Check zero-scroll 1440x800 and 1280x800 Booth Split with Pattern Player on left + RMX-1000 on right
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.locator("#mode-booth").click();
  await page.locator("#booth-swap-trk").click();
  await expect(app(page)).toHaveAttribute("data-booth-deck", "traktor");
  await expect(page.locator("#traktor-panel")).toBeVisible();
  await expect(page.locator("#rmx-panel")).toBeVisible();

  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    const fit = await page.evaluate(() => {
      const trkRect = document.getElementById("traktor-panel")!.getBoundingClientRect();
      const rmxRect = document.getElementById("rmx-panel")!.getBoundingClientRect();
      const clockRect = document.getElementById("clock")!.getBoundingClientRect();
      return {
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        trkRight: trkRect.right,
        rmxLeft: rmxRect.left,
        clockBottom: clockRect.bottom,
        rmxBottom: rmxRect.bottom,
      };
    });
    expect(fit.rmxLeft).toBeGreaterThanOrEqual(fit.trkRight);
    expect(fit.clockBottom).toBeLessThanOrEqual(800);
    expect(fit.rmxBottom).toBeLessThanOrEqual(800);
    expect(fit.scrollHeight).toBeLessThanOrEqual(800);
    expect(fit.scrollWidth).toBeLessThanOrEqual(fit.clientWidth);
  }
  expect(errors).toEqual([]);
});

test("Active/Passive machine toggles, hotkey machine switching, and zero cross-machine bleed", async ({ page }) => {
  const errors = guard(page);
  await page.setViewportSize({ width: 1440, height: 820 });
  await page.goto("/");

  // 1. Hotkey switch to Pattern Player (Alt+Digit2) -> Pattern Player is ACTIVE & owns hotkeys
  await page.keyboard.press("Alt+Digit2");
  await expect(app(page)).toHaveAttribute("data-surface", "traktor");
  await expect(page.locator("#power-traktor")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#kb-target-pill")).toHaveAttribute("data-target", "traktor");
  // Shortcut strips appear only while ⌘ is held or "Always show" is on.
  await expect(page.locator(".trk-hotkey-strip")).toBeHidden();

  // Zero bleed check: pressing KeyR or Control+Digit2 on Pattern Player never touches RMX lever or TR Drums FX
  await page.keyboard.down("KeyR");
  await expect(page.locator("#rmx-release-lever")).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.up("KeyR");
  await page.keyboard.press("Control+Digit2");
  await expect(page.locator("#vfx-readout")).toContainText("DRY");

  // 2. Toggle Pattern Player PASSIVE via Backslash (\) -> hotkeys ignore passive machine instead of waking it
  await page.keyboard.press("Backslash");
  await expect(page.locator("#power-traktor")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#kb-target-pill")).toHaveAttribute("data-passive", "true");
  await page.keyboard.press("Digit0"); // Would select UK Sub Break if active
  await expect(page.locator("#power-traktor")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator('[data-trk-pattern="9"]')).toHaveAttribute("aria-pressed", "false");

  // Re-activate via Backslash (\) -> Digit0 now selects UK Sub Break cleanly
  await page.keyboard.press("Backslash");
  await expect(page.locator("#power-traktor")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Digit0");
  await expect(page.locator('[data-trk-pattern="9"]')).toHaveAttribute("aria-pressed", "true");

  // 3. Toggle individual machines via Alt+Shift+1..4 & switch Booth Split focus via Alt+Backquote
  await page.keyboard.press("Alt+Shift+Digit1"); // Activate TR Drums alongside Pattern Player
  await expect(page.locator("#power-tr")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Alt+Digit5"); // Switch to Booth Split
  await expect(app(page)).toHaveAttribute("data-surface", "booth");
  await page.keyboard.press("Alt+Backquote"); // Swap Booth focus to RMX-1000
  await expect(page.locator("#kb-target-pill")).toHaveAttribute("data-target", "rmx");
  await page.keyboard.press("KeyQ"); // Toggles RMX Kill Low ONLY
  await expect(page.locator("#rmx-kill-low")).toHaveAttribute("aria-pressed", "true");

  expect(errors).toEqual([]);
});
