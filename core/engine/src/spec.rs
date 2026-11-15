//! JSON pattern files.
//!
//! ```json
//! {
//!   "bpm": 120,
//!   "shuffle": 0.0,
//!   "accent": 0.5,
//!   "flam": 0.5,
//!   "voices": {
//!     "kick":       { "steps": "X--- x--- X--- x---", "tune": 0.5, "decay": 0.5, "level": 1.0 },
//!     "snare":      { "steps": "---- X--- ---- X---", "snappy": 0.6 },
//!     "closed_hat": { "steps": "x-x- x-x- x-x- x-x-", "mute": false }
//!   },
//!   "render": { "bars": 2, "sample_rate": 48000, "tail_seconds": 0.5 }
//! }
//! ```
//!
//! Voices: `kick`, `snare`, `low_tom`, `mid_tom`, `high_tom`, `rim`, `clap`,
//! `closed_hat`, `open_hat`, `cowbell`. Absent voices are silent.
//!
//! Step notation: one character per step, `-`/`.` off, `x` hit, `X` accented
//! hit, `f` flammed hit, `F` accented flammed hit; spaces are ignored.
//! Every field except `steps` has a default.

use serde::{Deserialize, Serialize};

use dsp::{KickParams, VoiceParams};
use sequencer::{Pattern, PatternParseError, Track, VariationMode, VoiceId};

use crate::Engine;

/// A complete pattern file.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PatternSpec {
    /// Tempo for the internal clock.
    #[serde(default = "default_bpm")]
    pub bpm: f64,
    /// Shuffle amount `0..=1`.
    #[serde(default)]
    pub shuffle: f32,
    /// Accent amount `0..=1`.
    #[serde(default = "default_half")]
    pub accent: f32,
    /// Flam spacing `0..=1`.
    #[serde(default = "default_half")]
    pub flam: f32,
    /// Non-destructive organic micro-timing and velocity humanize `0..=1`.
    #[serde(default, skip_serializing_if = "is_zero_f32")]
    pub humanize: f32,
    /// Active loop length in steps (`1..=16`, default `16`).
    #[serde(
        default = "default_last_step",
        skip_serializing_if = "is_default_last_step"
    )]
    pub last_step: u8,
    /// Bar variation mode (`0` = A, `1` = B, `2` = AB, `3` = C, `4` = D, `5` = ABCD 64-step).
    #[serde(default, skip_serializing_if = "is_zero_u8")]
    pub variation: u8,
    /// Momentary non-destructive `[FILL]` hold.
    #[serde(default, skip_serializing_if = "is_false")]
    pub fill: bool,
    /// Auto-fill turnaround interval in bars (`0` = off, `2`, `4`, `8`).
    #[serde(default, skip_serializing_if = "is_zero_u8")]
    pub auto_fill_bars: u8,
    /// Multi-era drum kit voice model (`0` = Classic reference, `1..=7` = eras).
    #[serde(default, skip_serializing_if = "is_zero_u8")]
    pub kit_model: u8,
    /// Cymbal mode bitmask (`bit 0` = Ride on OpenHat, `bit 1` = Crash on Cowbell).
    #[serde(default, skip_serializing_if = "is_zero_u8")]
    pub cymbal_mode: u8,
    /// Per-voice steps and controls.
    #[serde(default)]
    pub voices: VoicesSpec,
    /// Offline render settings (output gain and limiter also apply live).
    #[serde(default)]
    pub render: RenderSpec,
}

/// The voices section. Voices that are absent stay silent.
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct VoicesSpec {
    /// Bass drum.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub kick: Option<VoiceSpec>,
    /// Snare drum.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub snare: Option<VoiceSpec>,
    /// Low tom.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub low_tom: Option<VoiceSpec>,
    /// Mid tom.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mid_tom: Option<VoiceSpec>,
    /// High tom.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub high_tom: Option<VoiceSpec>,
    /// Rimshot.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rim: Option<VoiceSpec>,
    /// Hand clap.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub clap: Option<VoiceSpec>,
    /// Closed hi-hat.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub closed_hat: Option<VoiceSpec>,
    /// Open hi-hat.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub open_hat: Option<VoiceSpec>,
    /// Cowbell.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cowbell: Option<VoiceSpec>,
}

impl VoicesSpec {
    /// The entry for a voice.
    #[must_use]
    pub fn get(&self, voice: VoiceId) -> Option<&VoiceSpec> {
        match voice {
            VoiceId::Kick => self.kick.as_ref(),
            VoiceId::Snare => self.snare.as_ref(),
            VoiceId::LowTom => self.low_tom.as_ref(),
            VoiceId::MidTom => self.mid_tom.as_ref(),
            VoiceId::HighTom => self.high_tom.as_ref(),
            VoiceId::Rim => self.rim.as_ref(),
            VoiceId::Clap => self.clap.as_ref(),
            VoiceId::ClosedHat => self.closed_hat.as_ref(),
            VoiceId::OpenHat => self.open_hat.as_ref(),
            VoiceId::Cowbell => self.cowbell.as_ref(),
        }
    }

    /// Mutable entry for a voice.
    pub fn get_mut(&mut self, voice: VoiceId) -> &mut Option<VoiceSpec> {
        match voice {
            VoiceId::Kick => &mut self.kick,
            VoiceId::Snare => &mut self.snare,
            VoiceId::LowTom => &mut self.low_tom,
            VoiceId::MidTom => &mut self.mid_tom,
            VoiceId::HighTom => &mut self.high_tom,
            VoiceId::Rim => &mut self.rim,
            VoiceId::Clap => &mut self.clap,
            VoiceId::ClosedHat => &mut self.closed_hat,
            VoiceId::OpenHat => &mut self.open_hat,
            VoiceId::Cowbell => &mut self.cowbell,
        }
    }
}

/// One voice's steps and TR-style controls.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct VoiceSpec {
    /// Step notation (see module docs).
    pub steps: String,
    /// Optional secondary Bar B step notation for 32-step `A+B` or 64-step `A-D` chaining.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub steps_b: Option<String>,
    /// Optional Bar C step notation for 64-step `A-D` chaining.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub steps_c: Option<String>,
    /// Optional Bar D step notation for 64-step `A-D` chaining.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub steps_d: Option<String>,
    /// Optional custom Fill bar step notation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub steps_fill: Option<String>,
    /// `0..=1`.
    #[serde(default = "default_half")]
    pub tune: f32,
    /// `0..=1`.
    #[serde(default = "default_half")]
    pub decay: f32,
    /// `0..=1`.
    #[serde(default = "default_half")]
    pub tone: f32,
    /// `0..=1` (snare).
    #[serde(default = "default_half")]
    pub snappy: f32,
    /// `0..=1`.
    #[serde(default = "default_one")]
    pub level: f32,
    /// Per-voice auxiliary Echo send `0..=1`.
    #[serde(default, skip_serializing_if = "is_zero_f32")]
    pub echo_send: f32,
    /// Per-voice auxiliary Reverb send `0..=1`.
    #[serde(default, skip_serializing_if = "is_zero_f32")]
    pub reverb_send: f32,
    /// Per-voice Acid Filter bus assignment `0..=1`.
    #[serde(default, skip_serializing_if = "is_zero_f32")]
    pub filter_send: f32,
    /// Muted tracks keep their steps but play nothing.
    #[serde(default, skip_serializing_if = "is_false")]
    pub mute: bool,
    /// Soloed tracks silence non-soloed voices on the mixer bus.
    #[serde(default, skip_serializing_if = "is_false")]
    pub solo: bool,
}

impl VoiceSpec {
    /// A voice with these steps and default controls.
    #[must_use]
    pub fn new(steps: &str) -> Self {
        Self {
            steps: steps.to_string(),
            steps_b: None,
            steps_c: None,
            steps_d: None,
            steps_fill: None,
            tune: 0.5,
            decay: 0.5,
            tone: 0.5,
            snappy: 0.5,
            level: 1.0,
            echo_send: 0.0,
            reverb_send: 0.0,
            filter_send: 0.0,
            mute: false,
            solo: false,
        }
    }

    /// Per-voice FX sends `[echo, reverb, filter]`.
    #[must_use]
    pub fn fx_sends(&self) -> [f32; 3] {
        [self.echo_send, self.reverb_send, self.filter_send]
    }

    /// The DSP controls.
    #[must_use]
    pub fn params(&self) -> VoiceParams {
        VoiceParams {
            tune: self.tune,
            decay: self.decay,
            tone: self.tone,
            snappy: self.snappy,
            level: self.level,
        }
    }
}

/// Offline render settings.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RenderSpec {
    /// Pattern repetitions.
    #[serde(default = "default_bars")]
    pub bars: u32,
    /// Output sample rate.
    #[serde(default = "default_sample_rate")]
    pub sample_rate: u32,
    /// Seconds appended after the last bar so the final hits ring out.
    #[serde(default = "default_tail")]
    pub tail_seconds: f32,
    /// Master output gain.
    #[serde(default = "default_one")]
    pub output_gain: f32,
    /// Soft safety limiter.
    #[serde(default)]
    pub limiter: bool,
    /// Block size used when stepping the engine; exercises block boundaries.
    #[serde(default = "default_block_size")]
    pub block_size: usize,
}

impl Default for RenderSpec {
    fn default() -> Self {
        Self {
            bars: default_bars(),
            sample_rate: default_sample_rate(),
            tail_seconds: default_tail(),
            output_gain: 1.0,
            limiter: false,
            block_size: default_block_size(),
        }
    }
}

fn default_bpm() -> f64 {
    120.0
}
fn default_half() -> f32 {
    0.5
}
fn default_one() -> f32 {
    1.0
}
fn default_bars() -> u32 {
    2
}
fn default_sample_rate() -> u32 {
    48_000
}
fn default_tail() -> f32 {
    0.5
}
fn default_block_size() -> usize {
    256
}
fn default_last_step() -> u8 {
    sequencer::STEP_COUNT as u8
}
#[allow(clippy::trivially_copy_pass_by_ref)]
fn is_false(b: &bool) -> bool {
    !*b
}
#[allow(clippy::trivially_copy_pass_by_ref)]
fn is_zero_f32(v: &f32) -> bool {
    *v == 0.0
}
#[allow(clippy::trivially_copy_pass_by_ref)]
fn is_zero_u8(v: &u8) -> bool {
    *v == 0
}
#[allow(clippy::trivially_copy_pass_by_ref)]
fn is_default_last_step(v: &u8) -> bool {
    *v == sequencer::STEP_COUNT as u8
}

/// Errors from loading a pattern file.
#[derive(Debug)]
pub enum SpecError {
    /// Malformed JSON or unknown fields.
    Json(serde_json::Error),
    /// Bad step notation for the named voice.
    Steps(&'static str, PatternParseError),
}

impl std::fmt::Display for SpecError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Json(e) => write!(f, "invalid pattern JSON: {e}"),
            Self::Steps(voice, e) => write!(f, "bad steps for {voice}: {e}"),
        }
    }
}

impl std::error::Error for SpecError {}

impl From<serde_json::Error> for SpecError {
    fn from(e: serde_json::Error) -> Self {
        Self::Json(e)
    }
}

impl PatternSpec {
    /// Parses a pattern file.
    pub fn from_json(json: &str) -> Result<Self, SpecError> {
        let spec: Self = serde_json::from_str(json)?;
        spec.pattern()?; // validate notation up front
        Ok(spec)
    }

    /// Serialises to pretty JSON.
    #[must_use]
    pub fn to_json(&self) -> String {
        serde_json::to_string_pretty(self).expect("PatternSpec is always serialisable")
    }

    /// The sequencer pattern this file describes.
    pub fn pattern(&self) -> Result<Pattern, SpecError> {
        let mut pattern = Pattern::empty();
        pattern.shuffle = self.shuffle;
        pattern.accent = self.accent;
        pattern.flam = self.flam;
        pattern.humanize = self.humanize;
        pattern.last_step = self.last_step.clamp(1, sequencer::STEP_COUNT as u8);
        pattern.variation = match self.variation {
            1 => VariationMode::B,
            2 => VariationMode::AB,
            3 => VariationMode::C,
            4 => VariationMode::D,
            5 => VariationMode::ABCD,
            _ => VariationMode::A,
        };
        pattern.fill_active = self.fill;
        pattern.auto_fill_bars = self.auto_fill_bars;
        for voice in VoiceId::ALL {
            if let Some(v) = self.voices.get(voice) {
                let mut track =
                    Track::parse(&v.steps).map_err(|e| SpecError::Steps(voice.name(), e))?;
                track.mute = v.mute;
                *pattern.track_mut(voice) = track;
                if let Some(sb) = v.steps_b.as_deref() {
                    let mut tb = Track::parse(sb).map_err(|e| SpecError::Steps(voice.name(), e))?;
                    tb.mute = v.mute;
                    pattern.tracks_b[voice.index()] = tb;
                    pattern.has_b = true;
                } else {
                    pattern.tracks_b[voice.index()] = track;
                }
                if let Some(sc) = v.steps_c.as_deref() {
                    let mut tc = Track::parse(sc).map_err(|e| SpecError::Steps(voice.name(), e))?;
                    tc.mute = v.mute;
                    pattern.tracks_c[voice.index()] = tc;
                    pattern.has_c = true;
                } else {
                    pattern.tracks_c[voice.index()] = track;
                }
                if let Some(sd) = v.steps_d.as_deref() {
                    let mut td = Track::parse(sd).map_err(|e| SpecError::Steps(voice.name(), e))?;
                    td.mute = v.mute;
                    pattern.tracks_d[voice.index()] = td;
                    pattern.has_d = true;
                } else {
                    pattern.tracks_d[voice.index()] = pattern.tracks_b[voice.index()];
                }
                if let Some(sf) = v.steps_fill.as_deref() {
                    let mut tf = Track::parse(sf).map_err(|e| SpecError::Steps(voice.name(), e))?;
                    tf.mute = v.mute;
                    pattern.tracks_fill[voice.index()] = tf;
                    pattern.has_fill = true;
                } else {
                    pattern.tracks_fill[voice.index()] = track;
                }
            }
        }
        Ok(pattern)
    }

    /// Solo bitmask encoded by per-voice `solo` flags.
    #[must_use]
    pub fn solo_mask(&self) -> u16 {
        let mut mask = 0u16;
        for voice in VoiceId::ALL {
            if self.voices.get(voice).is_some_and(|v| v.solo) {
                mask |= 1u16 << voice.index();
            }
        }
        mask
    }

    /// Per-voice FX sends `[echo, reverb, filter]` (zeros when absent).
    #[must_use]
    pub fn voice_fx_sends(&self, voice: VoiceId) -> [f32; 3] {
        self.voices.get(voice).map_or([0.0; 3], VoiceSpec::fx_sends)
    }

    /// Controls for a voice (defaults when the voice is absent).
    #[must_use]
    pub fn voice_params(&self, voice: VoiceId) -> VoiceParams {
        self.voices
            .get(voice)
            .map_or_else(VoiceParams::default, VoiceSpec::params)
    }

    /// Kick controls (defaults when the voice is absent).
    #[must_use]
    pub fn kick_params(&self) -> KickParams {
        let p = self.voice_params(VoiceId::Kick);
        KickParams {
            tune: p.tune,
            decay: p.decay,
            level: p.level,
        }
    }

    /// Total frames an offline render of this file produces.
    #[must_use]
    pub fn render_frames(&self) -> usize {
        let sr = f64::from(self.render.sample_rate);
        let beats = f64::from(self.render.bars) * sequencer::STEP_COUNT as f64 * 0.25;
        let body = beats * sr * 60.0 / self.bpm;
        let tail = f64::from(self.render.tail_seconds) * sr;
        (body + tail).round() as usize
    }

    /// Builds an engine, applies this file and renders it offline.
    pub fn render(&self) -> Result<Vec<f32>, SpecError> {
        let mut engine = Engine::new(self.render.sample_rate as f32);
        engine.load_spec(self)?;
        // Play exactly `bars` bars; the tail is the last hits ringing out.
        engine.set_stop_after(Some(
            u64::from(self.render.bars) * sequencer::STEP_COUNT as u64,
        ));
        engine.start();
        Ok(engine.render_frames(self.render_frames(), self.render.block_size))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const MINIMAL: &str = r#"{ "voices": { "kick": { "steps": "x---x---x---x---" } } }"#;

    #[test]
    fn defaults_fill_in() {
        let spec = PatternSpec::from_json(MINIMAL).unwrap();
        assert_eq!(spec.bpm, 120.0);
        assert_eq!(spec.render.bars, 2);
        assert_eq!(spec.kick_params(), KickParams::default());
        assert_eq!(spec.voice_params(VoiceId::Snare), VoiceParams::default());
        // 2 bars at 120 BPM = 4 s = 192 000 frames, plus 0.5 s tail.
        assert_eq!(spec.render_frames(), 216_000);
    }

    #[test]
    fn rejects_unknown_fields_and_bad_steps() {
        assert!(PatternSpec::from_json(r#"{ "bpm": 120, "swing": 1 }"#).is_err());
        assert!(PatternSpec::from_json(
            r#"{ "voices": { "cymbal": { "steps": "----------------" } } }"#
        )
        .is_err());
        let bad = r#"{ "voices": { "snare": { "steps": "x---" } } }"#;
        assert!(matches!(
            PatternSpec::from_json(bad),
            Err(SpecError::Steps("snare", _))
        ));
    }

    #[test]
    fn every_voice_parses_with_mute_and_flam() {
        let mut spec = PatternSpec::from_json(MINIMAL).unwrap();
        for v in VoiceId::ALL {
            let mut vs = VoiceSpec::new("f--- ---- X--- ----");
            vs.mute = v == VoiceId::Clap;
            *spec.voices.get_mut(v) = Some(vs);
        }
        let again = PatternSpec::from_json(&spec.to_json()).unwrap();
        assert_eq!(spec, again);
        let pattern = again.pattern().unwrap();
        assert!(pattern.track(VoiceId::Clap).mute);
        assert!(pattern.track(VoiceId::Cowbell).steps[0].flam);
    }

    #[test]
    fn round_trips_through_json() {
        let spec = PatternSpec::from_json(MINIMAL).unwrap();
        let again = PatternSpec::from_json(&spec.to_json()).unwrap();
        assert_eq!(spec, again);
    }

    #[test]
    fn renders_audio() {
        let spec = PatternSpec::from_json(MINIMAL).unwrap();
        let audio = spec.render().unwrap();
        assert_eq!(audio.len(), spec.render_frames());
        assert!(audio.iter().any(|&s| s != 0.0));
        assert!(audio.iter().all(|s| s.is_finite()));
    }

    #[test]
    fn four_bar_abcd_chain_round_trips_and_renders() {
        let json = r#"{
            "bpm": 124,
            "variation": 5,
            "voices": {
                "kick": {
                    "steps":   "X---x---X---x---",
                    "steps_b": "X---x---X---x-x-",
                    "steps_c": "X---x---X---X---",
                    "steps_d": "X---x-x-X-x-X-X-"
                }
            },
            "render": { "bars": 4 }
        }"#;
        let spec = PatternSpec::from_json(json).unwrap();
        let pattern = spec.pattern().unwrap();
        assert_eq!(pattern.variation, VariationMode::ABCD);
        assert!(pattern.has_b && pattern.has_c && pattern.has_d);
        assert_eq!(
            pattern.tracks_d[VoiceId::Kick.index()].steps[14],
            sequencer::Step::ACCENT
        );
        let again = PatternSpec::from_json(&spec.to_json()).unwrap();
        assert_eq!(spec, again);
        let audio = spec.render().unwrap();
        assert_eq!(audio.len(), spec.render_frames());
        assert!(audio.iter().any(|&s| s != 0.0));
    }
}
