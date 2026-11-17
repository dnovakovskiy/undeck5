//! Local sample library index & safe static file serving (`--samples-dir`).
//!
//! Discovers owned drum sample folders on the user's local machine (such as
//! Native Instruments Maschine / Expansion libraries in `/Users/Shared` or
//! custom directories passed via `--samples-dir`) without bundling any
//! copyrighted audio files in the repository.

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use serde_json::{json, Value};

const MAX_FILES_PER_CATEGORY: usize = 60;
const AUDIO_EXTS: [&str; 4] = ["wav", "aif", "aiff", "ogg"];

/// One discovered audio sample entry inside a local library.
#[derive(Clone, Debug)]
pub struct SampleEntry {
    /// Display stem name.
    pub name: String,
    /// Drum slot category (`kick`, `snare`, `clap`, `closed_hat`, `open_hat`, `rim`, `tom`, `cowbell`, `perc`).
    pub category: &'static str,
    /// Path relative to the library root.
    pub rel_path: String,
}

/// A mounted local sample library directory.
#[derive(Clone, Debug)]
pub struct SampleLibrary {
    /// Bridge library identifier (e.g. `lib-0`).
    pub id: String,
    /// Human-readable library name.
    pub name: String,
    /// Canonical filesystem root.
    pub root: PathBuf,
    /// Indexed drum samples inside this library.
    pub entries: Vec<SampleEntry>,
}

/// Catalog of all mounted local sample libraries.
#[derive(Clone, Debug, Default)]
pub struct SampleCatalog {
    /// All indexed libraries available over HTTP.
    pub libraries: Vec<SampleLibrary>,
}

/// Discovers default local sample directories when `--samples-dir` is omitted.
pub fn discover_default_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    let shared = Path::new("/Users/Shared");
    if let Ok(entries) = fs::read_dir(shared) {
        let mut candidates: Vec<PathBuf> = entries
            .flatten()
            .map(|e| e.path())
            .filter(|p| p.is_dir() && p.join("Samples").join("Drums").is_dir())
            .collect();
        // Put Deep Matter & Maschine 2 Factory first if present
        candidates.sort_by_key(|p| {
            let name = p
                .file_name()
                .map(|n| n.to_string_lossy().to_lowercase())
                .unwrap_or_default();
            if name.contains("deep matter") {
                (0, name)
            } else if name.contains("maschine 2 factory library") {
                (1, name)
            } else if name.contains("expansions") {
                (2, name)
            } else {
                (3, name)
            }
        });
        dirs.extend(candidates.into_iter().take(10));
    }
    dirs
}

fn classify_drum_category(rel_lower: &str, name_lower: &str) -> &'static str {
    if rel_lower.contains("/kick") || name_lower.starts_with("kick") || name_lower.contains(" bd ")
    {
        "kick"
    } else if rel_lower.contains("/clap") || name_lower.starts_with("clap") {
        "clap"
    } else if rel_lower.contains("/snare") || name_lower.starts_with("snare") {
        "snare"
    } else if name_lower.contains("openhh")
        || name_lower.contains("open hh")
        || name_lower.contains("open_hat")
        || name_lower.contains("oh ")
        || name_lower.starts_with("oh")
    {
        "open_hat"
    } else if rel_lower.contains("/hihat")
        || rel_lower.contains("/hat")
        || name_lower.contains("closedhh")
        || name_lower.contains("closed")
        || name_lower.contains("hh")
    {
        "closed_hat"
    } else if rel_lower.contains("/rim") || name_lower.contains("rim") {
        "rim"
    } else if rel_lower.contains("/tom") || name_lower.starts_with("tom") {
        "tom"
    } else if name_lower.contains("cowbell") || name_lower.contains("cb ") {
        "cowbell"
    } else {
        "perc"
    }
}

fn is_audio_file(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|ext| AUDIO_EXTS.contains(&ext.to_ascii_lowercase().as_str()))
}

fn clean_lib_name(dir: &Path) -> String {
    let raw = dir
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| "Local Samples".into());
    raw.replace(" Library Library", " Library")
        .trim()
        .to_string()
}

fn walk_samples(
    root: &Path,
    dir: &Path,
    counts: &mut HashMap<&'static str, usize>,
    out: &mut Vec<SampleEntry>,
) {
    let Ok(read) = fs::read_dir(dir) else {
        return;
    };
    let mut paths: Vec<PathBuf> = read.flatten().map(|e| e.path()).collect();
    paths.sort();
    for p in paths {
        if p.is_dir() {
            walk_samples(root, &p, counts, out);
        } else if p.is_file() && is_audio_file(&p) {
            let Ok(rel) = p.strip_prefix(root) else {
                continue;
            };
            let rel_str = rel.to_string_lossy().replace('\\', "/");
            let name = p
                .file_stem()
                .map(|s| s.to_string_lossy().into_owned())
                .unwrap_or_else(|| rel_str.clone());
            let cat = classify_drum_category(&rel_str.to_lowercase(), &name.to_lowercase());
            let c = counts.entry(cat).or_insert(0);
            if *c < MAX_FILES_PER_CATEGORY {
                *c += 1;
                out.push(SampleEntry {
                    name,
                    category: cat,
                    rel_path: rel_str,
                });
            }
        }
    }
}

impl SampleCatalog {
    /// Scans `--samples-dir` directories (or `/Users/Shared` auto-discovered libraries when empty).
    pub fn build(dirs: &[PathBuf]) -> Self {
        let search_dirs = if dirs.is_empty() {
            discover_default_dirs()
        } else {
            dirs.to_vec()
        };
        let mut libraries = Vec::new();
        for (idx, raw_dir) in search_dirs.into_iter().enumerate() {
            let Ok(root) = raw_dir.canonicalize() else {
                continue;
            };
            if !root.is_dir() {
                continue;
            }
            let scan_root = if root.join("Samples").join("Drums").is_dir() {
                root.join("Samples").join("Drums")
            } else {
                root.clone()
            };
            let mut counts = HashMap::new();
            let mut entries = Vec::new();
            walk_samples(&root, &scan_root, &mut counts, &mut entries);
            if entries.is_empty() {
                continue;
            }
            let name = clean_lib_name(&root);
            libraries.push(SampleLibrary {
                id: format!("lib-{idx}"),
                name,
                root,
                entries,
            });
        }
        Self { libraries }
    }

    /// Serializes the discovered sample catalog as JSON for `GET /samples/index.json`.
    pub fn index_json(&self) -> String {
        let libs: Vec<Value> = self
            .libraries
            .iter()
            .map(|lib| {
                let files: Vec<Value> = lib
                    .entries
                    .iter()
                    .map(|e| {
                        json!({
                            "name": e.name,
                            "category": e.category,
                            "path": e.rel_path,
                        })
                    })
                    .collect();
                json!({
                    "id": lib.id,
                    "name": lib.name,
                    "count": lib.entries.len(),
                    "samples": files,
                })
            })
            .collect();
        json!({ "libraries": libs }).to_string()
    }

    /// Resolves a requested sample path only if it stays strictly within its canonical library root.
    pub fn resolve_file(&self, lib_id: &str, rel_path: &str) -> Option<PathBuf> {
        let lib = self.libraries.iter().find(|l| l.id == lib_id)?;
        let candidate = lib.root.join(rel_path);
        let canon = candidate.canonicalize().ok()?;
        if !canon.starts_with(&lib.root) || !canon.is_file() || !is_audio_file(&canon) {
            return None;
        }
        Some(canon)
    }
}
