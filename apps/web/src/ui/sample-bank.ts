// Local Owned Sample & NI Maschine Kit Manager
//   - Discovers local libraries served by player5-bridge (GET /samples/index.json)
//   - OR lets the user pick ANY local WAV/AIFF/MP3 folder directly in Chrome/Safari
//   - Persists ★ Favorite samples & kits in localStorage
//   - Reports [WAV] vs [SYNTH] state cleanly per drum voice

import type { AudioEngine } from "../engine/audio-engine";
import { loadString, saveString } from "../storage";
import { VOICES, type VoiceId } from "../voices";

export interface SampleCatalogItem {
  name: string;
  category: string;
  path: string;
}

export interface SampleCatalogLibrary {
  id: string;
  name: string;
  count: number;
  samples: SampleCatalogItem[];
}

export interface LoadedVoiceSample {
  name: string;
  source: string; // e.g. "Deep Matter Library" or "Local Folder"
  key: string; // stable favorite key: `${source}::${name}`
}

export interface SampleBankCallbacks {
  audio: AudioEngine;
  onChange(): void;
  onSay(msg: string): void;
}

interface LocalFolderSample {
  name: string;
  category: string;
  file: File;
  key: string;
}

const FAV_KEY = "fav-samples";

const CATEGORY_FOR_VOICE: Readonly<Record<VoiceId, readonly string[]>> = {
  kick: ["kick"],
  snare: ["snare"],
  clap: ["clap"],
  closed_hat: ["closed_hat", "hihat"],
  open_hat: ["open_hat", "closed_hat"],
  rim: ["rim", "perc"],
  low_tom: ["tom", "kick"],
  mid_tom: ["tom", "perc"],
  high_tom: ["tom", "perc"],
  cowbell: ["cowbell", "perc", "rim"],
};

function classifyFileName(pathLower: string, nameLower: string): string {
  if (pathLower.includes("/kick") || nameLower.startsWith("kick") || nameLower.includes(" bd ")) return "kick";
  if (pathLower.includes("/clap") || nameLower.startsWith("clap")) return "clap";
  if (pathLower.includes("/snare") || nameLower.startsWith("snare")) return "snare";
  if (
    nameLower.includes("openhh") ||
    nameLower.includes("open hh") ||
    nameLower.includes("open_hat") ||
    nameLower.startsWith("oh")
  ) {
    return "open_hat";
  }
  if (
    pathLower.includes("/hihat") ||
    pathLower.includes("/hat") ||
    nameLower.includes("closedhh") ||
    nameLower.includes("closed") ||
    nameLower.includes("hh")
  ) {
    return "closed_hat";
  }
  if (pathLower.includes("/rim") || nameLower.includes("rim")) return "rim";
  if (pathLower.includes("/tom") || nameLower.startsWith("tom")) return "tom";
  if (nameLower.includes("cowbell") || nameLower.includes("cb ")) return "cowbell";
  return "perc";
}

export class SampleBankController {
  private loaded: Array<LoadedVoiceSample | null> = new Array(VOICES.length).fill(null);
  private bridgeLibs: SampleCatalogLibrary[] = [];
  private localFolderName = "";
  private localFiles: LocalFolderSample[] = [];
  private favorites = new Set<string>();
  private onlyFavorites = false;
  private selectedVoice: VoiceId = "kick";
  private selectedLibIdx = 0;

  private readonly modal: HTMLElement;
  private readonly dirInput: HTMLInputElement;

  constructor(
    root: HTMLElement,
    private readonly cb: SampleBankCallbacks,
  ) {
    this.modal = root.querySelector<HTMLElement>("#samples-modal")!;
    this.dirInput = root.querySelector<HTMLInputElement>("#samples-folder-input")!;
    this.loadFavorites();
    this.bind(root);
    void this.refreshBridgeCatalog();
  }

  getLoaded(voice: VoiceId): LoadedVoiceSample | null {
    const idx = VOICES.findIndex((v) => v.id === voice);
    return idx >= 0 ? this.loaded[idx] ?? null : null;
  }

  get loadedCount(): number {
    return this.loaded.filter(Boolean).length;
  }

  hasAnyLoaded(): boolean {
    return this.loadedCount > 0;
  }

  /** Returns a boolean mask array matching VOICES[0..9] order. */
  loadedMask(): boolean[] {
    return this.loaded.map((x) => x !== null);
  }

  private loadFavorites(): void {
    try {
      const raw = loadString(FAV_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          for (const k of arr) if (typeof k === "string") this.favorites.add(k);
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
  }

  private saveFavorites(): void {
    saveString(FAV_KEY, JSON.stringify([...this.favorites]));
  }

  isFavorite(key: string): boolean {
    return this.favorites.has(key);
  }

  toggleFavorite(key: string): void {
    if (this.favorites.has(key)) this.favorites.delete(key);
    else this.favorites.add(key);
    this.saveFavorites();
    this.renderModal();
  }

  open(voice: VoiceId = "kick"): void {
    this.selectedVoice = voice;
    this.modal.hidden = false;
    void this.refreshBridgeCatalog();
    this.renderModal();
  }

  close(): void {
    this.modal.hidden = true;
  }

  async refreshBridgeCatalog(): Promise<void> {
    if (__P5_SINGLE__) return;
    try {
      const res = await fetch("/samples/index.json", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { libraries?: SampleCatalogLibrary[] };
      if (Array.isArray(data.libraries)) {
        this.bridgeLibs = data.libraries;
        this.renderModal();
      }
    } catch {
      /* bridge not serving /samples */
    }
  }

  private bind(root: HTMLElement): void {
    root.querySelector("#samples-open-btn")?.addEventListener("click", () => this.open());
    root.querySelector("#samples-close")?.addEventListener("click", () => this.close());
    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) this.close();
    });

    root.querySelector("#samples-pick-folder")?.addEventListener("click", () => this.dirInput.click());
    this.dirInput.addEventListener("change", () => {
      const files = [...(this.dirInput.files ?? [])];
      if (!files.length) return;
      const audioFiles = files.filter((f) => /\.(wav|aif|aiff|mp3|ogg|flac)$/i.test(f.name));
      if (!audioFiles.length) {
        this.cb.onSay("No WAV/AIFF/MP3 files found in that folder.");
        return;
      }
      const firstRel = (audioFiles[0] as File & { webkitRelativePath?: string }).webkitRelativePath ?? "";
      this.localFolderName = firstRel.split("/")[0] || "Local Folder";
      this.localFiles = audioFiles.slice(0, 320).map((file) => {
        const rel = ((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name).toLowerCase();
        const name = file.name.replace(/\.[^.]+$/, "");
        return {
          name,
          category: classifyFileName(rel, name.toLowerCase()),
          file,
          key: `${this.localFolderName}::${name}`,
        };
      });
      this.selectedLibIdx = -1; // focus the newly loaded local folder
      this.renderModal();
      void this.autoFillKitFromCurrentSource();
    });

    root.querySelector("#samples-autofill")?.addEventListener("click", () => {
      void this.autoFillKitFromCurrentSource();
    });

    root.querySelector("#samples-clear-all")?.addEventListener("click", () => {
      this.clearAll();
    });

    root.querySelector("#samples-fav-filter")?.addEventListener("click", () => {
      this.onlyFavorites = !this.onlyFavorites;
      this.renderModal();
    });
  }

  clearAll(): void {
    this.loaded.fill(null);
    this.cb.audio.clearAllVoiceSamples();
    this.cb.onChange();
    this.renderModal();
    this.cb.onSay("Returned all 10 voices to built-in Synth DSP.");
  }

  clearVoice(voice: VoiceId): void {
    const idx = VOICES.findIndex((v) => v.id === voice);
    if (idx < 0) return;
    this.loaded[idx] = null;
    this.cb.audio.clearVoiceSample(idx);
    this.cb.onChange();
    this.renderModal();
  }

  async loadSampleIntoVoice(
    voiceIdx: number,
    name: string,
    source: string,
    fetchBuf: () => Promise<ArrayBuffer>,
  ): Promise<void> {
    try {
      const buf = await fetchBuf();
      const pcm = await this.cb.audio.decodeSampleBytes(buf);
      this.loaded[voiceIdx] = { name, source, key: `${source}::${name}` };
      this.cb.audio.setVoiceSample(voiceIdx, pcm, name);
      this.cb.onChange();
      this.renderModal();
      void this.cb.audio.triggerVoice(VOICES[voiceIdx]!.id, 0.92).catch(() => {});
    } catch {
      this.cb.onSay(`Could not decode '${name}'.`);
    }
  }

  async autoFillKitFromCurrentSource(): Promise<void> {
    if (this.selectedLibIdx === -1 && this.localFiles.length > 0) {
      let count = 0;
      for (let i = 0; i < VOICES.length; i++) {
        const cats = CATEGORY_FOR_VOICE[VOICES[i]!.id];
        const pool = this.localFiles.filter((f) => cats.includes(f.category));
        const pick = pool[Math.floor(Math.random() * Math.min(pool.length, 16))];
        if (pick) {
          await this.loadSampleIntoVoice(i, pick.name, this.localFolderName, () => pick.file.arrayBuffer());
          count++;
        }
      }
      this.cb.onSay(`Loaded ${count} WAV voices from '${this.localFolderName}'.`);
      return;
    }

    if (__P5_SINGLE__) {
      this.cb.onSay("Click '+ Load NI / WAV Folder' to pick a folder from your computer.");
      return;
    }
    const lib = this.bridgeLibs[Math.max(0, this.selectedLibIdx)];
    if (!lib) {
      this.cb.onSay("No local bridge library found — click '+ Load NI / WAV Folder' to pick a folder.");
      return;
    }
    let count = 0;
    for (let i = 0; i < VOICES.length; i++) {
      const cats = CATEGORY_FOR_VOICE[VOICES[i]!.id];
      const pool = lib.samples.filter((s) => cats.includes(s.category));
      const pick = pool[Math.floor(Math.random() * Math.min(pool.length, 20))];
      if (pick) {
        const url = `/samples/file?lib=${encodeURIComponent(lib.id)}&path=${encodeURIComponent(pick.path)}`;
        await this.loadSampleIntoVoice(i, pick.name, lib.name, async () => {
          const r = await fetch(url);
          if (!r.ok) throw new Error("fetch failed");
          return r.arrayBuffer();
        });
        count++;
      }
    }
    this.cb.onSay(`Loaded ${count} WAV voices from '${lib.name}'.`);
  }

  renderModal(): void {
    if (this.modal.hidden) return;
    const favBtn = this.modal.querySelector<HTMLButtonElement>("#samples-fav-filter");
    if (favBtn) favBtn.setAttribute("aria-pressed", String(this.onlyFavorites));

    // 1. Source Tabs (Bridge NI Libraries + Local Folder)
    const libsEl = this.modal.querySelector<HTMLElement>("#samples-libs")!;
    const libBtns: HTMLButtonElement[] = this.bridgeLibs.map((lib, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "toggle small";
      b.textContent = `${lib.name} (${lib.count})`;
      b.setAttribute("aria-pressed", String(this.selectedLibIdx === idx));
      b.addEventListener("click", () => {
        this.selectedLibIdx = idx;
        this.renderModal();
      });
      return b;
    });
    if (this.localFiles.length > 0) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "toggle small";
      b.textContent = `📁 ${this.localFolderName} (${this.localFiles.length})`;
      b.setAttribute("aria-pressed", String(this.selectedLibIdx === -1));
      b.addEventListener("click", () => {
        this.selectedLibIdx = -1;
        this.renderModal();
      });
      libBtns.unshift(b);
    }
    if (!libBtns.length) {
      const hint = document.createElement("span");
      hint.className = "hint";
      hint.textContent = "No bridge library mounted yet — click '+ Load NI / WAV Folder' above to load any folder on your Mac.";
      libsEl.replaceChildren(hint);
    } else {
      libsEl.replaceChildren(...libBtns);
    }

    // 2. 10 Voice Slot Cards showing [WAV] vs [SYNTH]
    const slotsEl = this.modal.querySelector<HTMLElement>("#samples-slots")!;
    slotsEl.replaceChildren(
      ...VOICES.map((v, idx) => {
        const cur = this.loaded[idx];
        const card = document.createElement("button");
        card.type = "button";
        card.className = "sample-slot-card";
        card.setAttribute("aria-pressed", String(this.selectedVoice === v.id));
        card.dataset.hasWav = String(Boolean(cur));
        card.innerHTML =
          `<div class="sample-slot-top"><strong>${v.short}</strong><span class="src-badge ${cur ? "wav" : "synth"}">${cur ? "WAV" : "SYNTH"}</span></div>` +
          `<div class="sample-slot-name">${cur ? cur.name : "Built-in DSP"}</div>`;
        card.addEventListener("click", () => {
          this.selectedVoice = v.id;
          this.renderModal();
        });
        return card;
      }),
    );

    // 3. Matching Samples List for selected voice + ★ Favorites toggle
    const listEl = this.modal.querySelector<HTMLElement>("#samples-list")!;
    const vIdx = Math.max(0, VOICES.findIndex((v) => v.id === this.selectedVoice));
    const curLoaded = this.loaded[vIdx];
    const cats = CATEGORY_FOR_VOICE[this.selectedVoice];

    const headerRow = document.createElement("div");
    headerRow.className = "samples-list-head";
    headerRow.innerHTML = `<span>Assign <strong>${VOICES[vIdx]!.name}</strong> (${curLoaded ? `WAV: ${curLoaded.name}` : "SYNTH DSP"})</span>`;
    if (curLoaded) {
      const clr = document.createElement("button");
      clr.type = "button";
      clr.className = "small";
      clr.textContent = "Revert to SYNTH";
      clr.addEventListener("click", () => this.clearVoice(this.selectedVoice));
      headerRow.appendChild(clr);
    }

    const rows: HTMLElement[] = [headerRow];

    type Candidate = { name: string; source: string; cat: string; key: string; load: () => Promise<ArrayBuffer> };
    let candidates: Candidate[] = [];
    if (this.selectedLibIdx === -1 && this.localFiles.length > 0) {
      candidates = this.localFiles
        .filter((f) => this.onlyFavorites || cats.includes(f.category))
        .map((f) => ({
          name: f.name,
          source: this.localFolderName,
          cat: f.category,
          key: f.key,
          load: () => f.file.arrayBuffer(),
        }));
    } else if (!__P5_SINGLE__) {
      const lib = this.bridgeLibs[Math.max(0, this.selectedLibIdx)];
      if (lib) {
        candidates = lib.samples
          .filter((s) => this.onlyFavorites || cats.includes(s.category))
          .map((s) => ({
            name: s.name,
            source: lib.name,
            cat: s.category,
            key: `${lib.name}::${s.name}`,
            load: async () => {
              const url = `/samples/file?lib=${encodeURIComponent(lib.id)}&path=${encodeURIComponent(s.path)}`;
              const r = await fetch(url);
              if (!r.ok) throw new Error("fetch failed");
              return r.arrayBuffer();
            },
          }));
      }
    }

    if (this.onlyFavorites) {
      candidates = candidates.filter((c) => this.isFavorite(c.key));
    }

    // Sort ★ favorites to top!
    candidates.sort((a, b) => Number(this.isFavorite(b.key)) - Number(this.isFavorite(a.key)));

    for (const item of candidates.slice(0, 60)) {
      const row = document.createElement("div");
      row.className = "sample-pick-row";
      const isFav = this.isFavorite(item.key);
      const isCur = curLoaded?.key === item.key;

      const favBtnEl = document.createElement("button");
      favBtnEl.type = "button";
      favBtnEl.className = "sample-fav-btn";
      favBtnEl.setAttribute("aria-pressed", String(isFav));
      favBtnEl.textContent = isFav ? "★" : "☆";
      favBtnEl.title = isFav ? "Remove from Favorites" : "Star as Favorite";
      favBtnEl.addEventListener("click", () => this.toggleFavorite(item.key));

      const loadBtn = document.createElement("button");
      loadBtn.type = "button";
      loadBtn.className = "sample-load-btn";
      loadBtn.setAttribute("aria-pressed", String(isCur));
      loadBtn.innerHTML = `<span class="src-badge wav">WAV</span><strong>${item.name}</strong><em>${item.cat}</em>`;
      loadBtn.addEventListener("click", () => {
        void this.loadSampleIntoVoice(vIdx, item.name, item.source, item.load);
      });

      row.append(favBtnEl, loadBtn);
      rows.push(row);
    }

    if (candidates.length === 0) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = this.onlyFavorites
        ? "No ★ Favorite samples in this library yet — click ☆ on any sound to star it."
        : "Pick a folder or library above to browse drum hits.";
      rows.push(empty);
    }

    listEl.replaceChildren(...rows);
  }
}
