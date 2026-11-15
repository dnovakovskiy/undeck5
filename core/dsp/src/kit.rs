//! The full kit: every voice, mixed to mono in a fixed order.
//!
//! Slots are indexed by `usize` so this crate stays independent of the
//! sequencer; the engine maps `sequencer::VoiceId::index()` onto [`slot`].
//! The summation order is fixed, which keeps renders bit-reproducible.

use crate::blocks::{Noise, OnePole, Sine, Svf};
use crate::math;
use crate::voice::Voice;
use crate::{
    Clap, ClosedHat, Cowbell, Kick, OpenHat, Param, Rim, Snare, Tom, TomRange, VoiceParams,
};

/// Fixed trim applied to the kit mix (0.75, about −2.5 dB).
///
/// Each voice is calibrated relative to the kick (which peaks near −6 dBFS
/// on its own); hits that coincide in a busy groove add up, so the mix is
/// trimmed once here to keep typical full-kit grooves near the product's
/// default peak of −6 dBFS. A lone kick then peaks near −8.6 dBFS. See
/// ADR-0009.
pub const KIT_HEADROOM: f32 = 0.75;

/// Number of voices in the kit.
pub const VOICE_COUNT: usize = 10;

/// Slot indices. These must match `sequencer::VoiceId` discriminants.
pub mod slot {
    /// Bass drum.
    pub const KICK: usize = 0;
    /// Snare drum.
    pub const SNARE: usize = 1;
    /// Low tom.
    pub const LOW_TOM: usize = 2;
    /// Mid tom.
    pub const MID_TOM: usize = 3;
    /// High tom.
    pub const HIGH_TOM: usize = 4;
    /// Rimshot.
    pub const RIM: usize = 5;
    /// Hand clap.
    pub const CLAP: usize = 6;
    /// Closed hi-hat.
    pub const CLOSED_HAT: usize = 7;
    /// Open hi-hat.
    pub const OPEN_HAT: usize = 8;
    /// Cowbell.
    pub const COWBELL: usize = 9;
}

/// Multi-era drum machine voice character models.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
#[repr(u8)]
pub enum KitModel {
    /// Calibrated reference analogue synthesis (default, golden-master exact).
    #[default]
    Classic = 0,
    /// Deep bridged-T sub-bass, warm snappy snare, singing toms, crisp maraca/hats.
    SubBoom8O8 = 1,
    /// Two-stage punch kick, crisp body snare, hybrid metallic/air hats.
    ClubPunch9O9 = 2,
    /// Mid-forward 1985 studio PCM punch with stepped 12-bit ZOH DAC character.
    Studio7O7 = 3,
    /// Compact silver transistor acid box with fast snappy transients.
    Silver6O6 = 4,
    /// Console-driven warehouse techno kit with asymmetric saturation.
    WarehouseRaw = 5,
    /// Tuned Latin percussion bank (conga/bongo resonators, agogo, cabasa, clave).
    LatinPerc = 6,
    /// Early warm lounge rhythm box with soft pulse kick and woodblock ping.
    VintageCompu = 7,
}

impl KitModel {
    /// Converts a numeric code (`0..=7`) into a [`KitModel`]. Unknown codes map to `Classic`.
    #[must_use]
    pub const fn from_code(code: u8) -> Self {
        match code {
            1 => Self::SubBoom8O8,
            2 => Self::ClubPunch9O9,
            3 => Self::Studio7O7,
            4 => Self::Silver6O6,
            5 => Self::WarehouseRaw,
            6 => Self::LatinPerc,
            7 => Self::VintageCompu,
            _ => Self::Classic,
        }
    }

    /// Numeric code (`0..=7`).
    #[must_use]
    pub const fn code(self) -> u8 {
        self as u8
    }
}

/// Every voice plus its current controls, era character and per-voice FX sends.
#[derive(Clone, Debug)]
pub struct Kit {
    /// Bass drum.
    pub kick: Kick,
    /// Snare drum.
    pub snare: Snare,
    /// Low tom.
    pub low_tom: Tom,
    /// Mid tom.
    pub mid_tom: Tom,
    /// High tom.
    pub high_tom: Tom,
    /// Rimshot.
    pub rim: Rim,
    /// Hand clap.
    pub clap: Clap,
    /// Closed hi-hat.
    pub closed_hat: ClosedHat,
    /// Open hi-hat.
    pub open_hat: OpenHat,
    /// Cowbell.
    pub cowbell: Cowbell,
    sample_rate: f32,
    params: [VoiceParams; VOICE_COUNT],
    kit_model: KitModel,
    cymbal_mode: u8,
    solo_mask: u16,
    fx_sends: [[f32; 3]; VOICE_COUNT],
    // Auxiliary deterministic era processors (zero heap allocation).
    dac_hold: [f32; VOICE_COUNT],
    dac_phase: u8,
    air_noise: Noise,
    air_hp: Svf,
    air_env: [f32; 3],
    air_coef: [f32; 3],
    perc_osc: [Sine; 3],
    perc_env: [f32; 3],
    perc_coef: [f32; 3],
    compu_lp: OnePole,
}

impl Kit {
    /// Every voice idle, default controls.
    #[must_use]
    pub fn new(sample_rate: f32) -> Self {
        let sr = sample_rate.max(1.0);
        let mut kit = Self {
            kick: Kick::new(sr),
            snare: Snare::new(sr),
            low_tom: Tom::new(sr, TomRange::Low),
            mid_tom: Tom::new(sr, TomRange::Mid),
            high_tom: Tom::new(sr, TomRange::High),
            rim: Rim::new(sr),
            clap: Clap::new(sr),
            closed_hat: ClosedHat::new(sr),
            open_hat: OpenHat::new(sr),
            cowbell: Cowbell::new(sr),
            sample_rate: sr,
            params: [VoiceParams::default(); VOICE_COUNT],
            kit_model: KitModel::Classic,
            cymbal_mode: 0,
            solo_mask: 0,
            fx_sends: [[0.0; 3]; VOICE_COUNT],
            dac_hold: [0.0; VOICE_COUNT],
            dac_phase: 0,
            air_noise: Noise::new(0x9A73_5D1F),
            air_hp: Svf::new(7_200.0, 0.85, sr),
            air_env: [0.0; 3],
            air_coef: [
                math::decay_coefficient(0.085, sr),
                math::decay_coefficient(0.045, sr),
                math::decay_coefficient(0.28, sr),
            ],
            perc_osc: [
                Sine::new(195.0, sr),
                Sine::new(285.0, sr),
                Sine::new(415.0, sr),
            ],
            perc_env: [0.0; 3],
            perc_coef: [
                math::decay_coefficient(0.22, sr),
                math::decay_coefficient(0.18, sr),
                math::decay_coefficient(0.14, sr),
            ],
            compu_lp: OnePole::new(7_500.0, sr),
        };
        for s in 0..VOICE_COUNT {
            let p = kit.params[s];
            kit.voice_mut(s).apply_params(&p);
        }
        kit
    }

    fn voice_mut(&mut self, slot: usize) -> &mut dyn Voice {
        match slot {
            slot::KICK => &mut self.kick,
            slot::SNARE => &mut self.snare,
            slot::LOW_TOM => &mut self.low_tom,
            slot::MID_TOM => &mut self.mid_tom,
            slot::HIGH_TOM => &mut self.high_tom,
            slot::RIM => &mut self.rim,
            slot::CLAP => &mut self.clap,
            slot::CLOSED_HAT => &mut self.closed_hat,
            slot::OPEN_HAT => &mut self.open_hat,
            _ => &mut self.cowbell,
        }
    }

    /// Reconfigures every voice for a new sample rate (silences them).
    pub fn set_sample_rate(&mut self, sample_rate: f32) {
        let sr = sample_rate.max(1.0);
        self.sample_rate = sr;
        for s in 0..VOICE_COUNT {
            self.voice_mut(s).set_sample_rate(sr);
        }
        self.air_hp.set(7_200.0, 0.85, sr);
        self.air_hp.reset();
        self.air_coef = [
            math::decay_coefficient(0.085, sr),
            math::decay_coefficient(0.045, sr),
            math::decay_coefficient(0.28, sr),
        ];
        self.perc_coef = [
            math::decay_coefficient(0.22, sr),
            math::decay_coefficient(0.18, sr),
            math::decay_coefficient(0.14, sr),
        ];
        self.compu_lp.set_cutoff(7_500.0, sr);
        self.compu_lp.reset();
        self.dac_hold = [0.0; VOICE_COUNT];
        self.dac_phase = 0;
    }

    /// Current controls for a slot.
    #[must_use]
    pub fn params(&self, slot: usize) -> VoiceParams {
        self.params.get(slot).copied().unwrap_or_default()
    }

    /// Active multi-era kit model.
    #[must_use]
    pub fn kit_model(&self) -> KitModel {
        self.kit_model
    }

    /// Switches the multi-era kit model (`Classic` keeps bit-exact reference synthesis).
    pub fn set_kit_model(&mut self, model: KitModel) {
        if self.kit_model == model {
            return;
        }
        self.kit_model = model;
        self.kick.set_model(model.code());
        for s in 0..VOICE_COUNT {
            let eff = effective_params(s, self.params[s], model);
            self.voice_mut(s).apply_params(&eff);
        }
    }

    /// Active cymbal mode bitmask (`bit 0` = Ride on OpenHat, `bit 1` = Crash on Cowbell).
    #[must_use]
    pub fn cymbal_mode(&self) -> u8 {
        self.cymbal_mode
    }

    /// Sets cymbal mode bitmask (`bit 0` = Ride on OpenHat, `bit 1` = Crash on Cowbell).
    pub fn set_cymbal_mode(&mut self, mode: u8) {
        self.cymbal_mode = mode & 0x03;
        self.open_hat.set_ride_mode((self.cymbal_mode & 0x01) != 0);
        self.cowbell.set_crash_mode((self.cymbal_mode & 0x02) != 0);
    }

    /// Solo bitmask (`0` = no voice soloed; `1 << slot` = soloed voices).
    #[must_use]
    pub fn solo_mask(&self) -> u16 {
        self.solo_mask
    }

    /// Sets the solo bitmask (`0` = all unmuted voices audible).
    pub fn set_solo_mask(&mut self, mask: u16) {
        self.solo_mask = mask & ((1u16 << VOICE_COUNT) - 1);
    }

    /// Sets a per-voice FX send (`bus`: `0` = Echo, `1` = Reverb, `2` = Filter).
    pub fn set_fx_send(&mut self, slot: usize, bus: usize, value: f32) {
        if slot < VOICE_COUNT && bus < 3 {
            self.fx_sends[slot][bus] = if value.is_finite() {
                value.clamp(0.0, 1.0)
            } else {
                0.0
            };
        }
    }

    /// Per-voice FX sends `[echo, reverb, filter]` for `slot`.
    #[must_use]
    pub fn fx_sends(&self, slot: usize) -> [f32; 3] {
        self.fx_sends.get(slot).copied().unwrap_or([0.0; 3])
    }

    /// Sets one control on one slot. Out-of-range slots are ignored.
    pub fn set_param(&mut self, slot: usize, param: Param, value: f32) {
        if slot >= VOICE_COUNT {
            return;
        }
        self.params[slot].set(param, value);
        let eff = effective_params(slot, self.params[slot], self.kit_model);
        self.voice_mut(slot).apply_params(&eff);
    }

    /// Starts a hit on a slot. A closed hat chokes the open hat (unless open hat is Ride).
    pub fn trigger(&mut self, slot: usize, velocity: f32) {
        if slot >= VOICE_COUNT {
            return;
        }
        // A silent (velocity 0) closed hat is ignored by the voice, so it
        // must not choke the open hat either.
        if slot == slot::CLOSED_HAT && velocity > 0.0 {
            self.open_hat.choke();
            if matches!(
                self.kit_model,
                KitModel::ClubPunch9O9 | KitModel::Studio7O7 | KitModel::WarehouseRaw
            ) && (self.cymbal_mode & 0x01) == 0
            {
                self.air_env[2] = 0.0;
            }
        }
        self.voice_mut(slot).trigger(velocity);
        if velocity > 0.0 && velocity.is_finite() && self.kit_model != KitModel::Classic {
            let v = velocity.min(1.0);
            if matches!(
                self.kit_model,
                KitModel::ClubPunch9O9 | KitModel::Studio7O7 | KitModel::WarehouseRaw
            ) {
                match slot {
                    slot::SNARE => self.air_env[0] = v * 0.16,
                    slot::CLOSED_HAT => self.air_env[1] = v * 0.11,
                    slot::OPEN_HAT => self.air_env[2] = v * 0.14,
                    _ => {}
                }
            } else if self.kit_model == KitModel::LatinPerc {
                match slot {
                    slot::LOW_TOM => {
                        let hz = 165.0 + 90.0 * self.params[slot].tune;
                        self.perc_osc[0].set_frequency(hz, self.sample_rate);
                        self.perc_osc[0].reset(0.0);
                        self.perc_env[0] = v * 0.24;
                    }
                    slot::MID_TOM => {
                        let hz = 245.0 + 125.0 * self.params[slot].tune;
                        self.perc_osc[1].set_frequency(hz, self.sample_rate);
                        self.perc_osc[1].reset(0.0);
                        self.perc_env[1] = v * 0.24;
                    }
                    slot::HIGH_TOM => {
                        let hz = 355.0 + 185.0 * self.params[slot].tune;
                        self.perc_osc[2].set_frequency(hz, self.sample_rate);
                        self.perc_osc[2].reset(0.0);
                        self.perc_env[2] = v * 0.24;
                    }
                    _ => {}
                }
            } else if self.kit_model == KitModel::VintageCompu && slot == slot::RIM {
                let hz = 680.0 + 360.0 * self.params[slot].tune;
                self.perc_osc[2].set_frequency(hz, self.sample_rate);
                self.perc_osc[2].reset(0.0);
                self.perc_env[2] = v * 0.18;
            }
        }
    }

    /// Whether any voice is sounding.
    #[must_use]
    pub fn is_active(&self) -> bool {
        self.kick.is_active()
            || self.snare.is_active()
            || self.low_tom.is_active()
            || self.mid_tom.is_active()
            || self.high_tom.is_active()
            || self.rim.is_active()
            || self.clap.is_active()
            || self.closed_hat.is_active()
            || self.open_hat.is_active()
            || self.cowbell.is_active()
    }

    /// Renders one mono sample: the sum of every voice in slot order, times
    /// [`KIT_HEADROOM`]. Bit-identical to the reference engine when `kit_model`
    /// is [`KitModel::Classic`], `cymbal_mode == 0` and `solo_mask == 0`.
    #[inline]
    pub fn process(&mut self) -> f32 {
        if self.kit_model == KitModel::Classic && self.solo_mask == 0 && self.cymbal_mode == 0 {
            let mut sum = 0.0f32;
            sum += self.kick.process();
            sum += self.snare.process();
            sum += self.low_tom.process();
            sum += self.mid_tom.process();
            sum += self.high_tom.process();
            sum += self.rim.process();
            sum += self.clap.process();
            sum += self.closed_hat.process();
            sum += self.open_hat.process();
            sum += self.cowbell.process();
            return sum * KIT_HEADROOM;
        }
        let (dry, _, _, filter) = self.process_buses();
        dry + filter
    }

    /// Renders one frame across four buses: `(dry, echo_send, reverb_send, filter_bus)`.
    ///
    /// * `echo_send` and `reverb_send` are parallel auxiliary sends (`0..=1`).
    /// * `filter_bus` crossfades the voice out of `dry` (`dry += v * (1 - f)`,
    ///   `filter += v * f`) so sweeping the master per-voice filter genuinely
    ///   filters the assigned voices rather than layering on top of dry.
    #[inline]
    pub fn process_buses(&mut self) -> (f32, f32, f32, f32) {
        let mut raw = [
            self.kick.process(),
            self.snare.process(),
            self.low_tom.process(),
            self.mid_tom.process(),
            self.high_tom.process(),
            self.rim.process(),
            self.clap.process(),
            self.closed_hat.process(),
            self.open_hat.process(),
            self.cowbell.process(),
        ];

        if self.kit_model != KitModel::Classic {
            self.shape_era_samples(&mut raw);
        }

        let mut dry = 0.0f32;
        let mut echo = 0.0f32;
        let mut reverb = 0.0f32;
        let mut filter = 0.0f32;
        let mask = self.solo_mask;

        for (i, &sample) in raw.iter().enumerate() {
            if mask != 0 && (mask & (1u16 << i)) == 0 {
                continue;
            }
            let sends = self.fx_sends[i];
            let f_amt = sends[2];
            dry += sample * (1.0 - f_amt);
            echo += sample * sends[0];
            reverb += sample * sends[1];
            filter += sample * f_amt;
        }

        (
            dry * KIT_HEADROOM,
            echo * KIT_HEADROOM,
            reverb * KIT_HEADROOM,
            filter * KIT_HEADROOM,
        )
    }

    #[inline]
    fn shape_era_samples(&mut self, raw: &mut [f32; VOICE_COUNT]) {
        match self.kit_model {
            KitModel::Classic => {}
            KitModel::SubBoom8O8 => {
                // Warm silky analog top roll-off on clap/snare, pure sub kick.
                raw[slot::CLAP] = math::soft_clip(raw[slot::CLAP] * 1.18) * 0.92;
            }
            KitModel::ClubPunch9O9 => {
                let air = self.tick_air_layer();
                raw[slot::SNARE] = math::soft_clip(raw[slot::SNARE] * 1.25) * 0.9 + air.0;
                raw[slot::CLOSED_HAT] += air.1;
                raw[slot::OPEN_HAT] += air.2;
            }
            KitModel::Studio7O7 => {
                let air = self.tick_air_layer();
                raw[slot::SNARE] += air.0 * 0.8;
                raw[slot::CLOSED_HAT] += air.1 * 1.2;
                raw[slot::OPEN_HAT] += air.2 * 1.2;
                // Authentic ~24 kHz 12-bit PCM stepped ZOH DAC character on perc/hats/snare.
                let update_dac = (self.dac_phase & 1) == 0;
                self.dac_phase = self.dac_phase.wrapping_add(1);
                for s in [
                    slot::SNARE,
                    slot::RIM,
                    slot::CLAP,
                    slot::CLOSED_HAT,
                    slot::OPEN_HAT,
                    slot::COWBELL,
                ] {
                    if update_dac {
                        let q = (raw[s] * 2_048.0).round() * (1.0 / 2_048.0);
                        self.dac_hold[s] = q;
                    }
                    raw[s] = self.dac_hold[s];
                }
            }
            KitModel::Silver6O6 => {
                // Crisp transistor bite on snare and hats.
                raw[slot::SNARE] = math::soft_clip(raw[slot::SNARE] * 1.32) * 0.86;
                raw[slot::CLOSED_HAT] *= 1.14;
                raw[slot::OPEN_HAT] *= 1.12;
            }
            KitModel::WarehouseRaw => {
                let air = self.tick_air_layer();
                raw[slot::SNARE] += air.0;
                raw[slot::CLOSED_HAT] += air.1;
                raw[slot::OPEN_HAT] += air.2;
                // Asymmetric console desk saturation across all active voices.
                for x in raw.iter_mut() {
                    if *x != 0.0 {
                        let biased = *x * 1.55 + 0.02 * (*x).abs();
                        *x = (math::soft_clip(biased) - 0.015 * (*x).abs()) * 0.82;
                    }
                }
            }
            KitModel::LatinPerc => {
                // Resonant conga / bongo harmonics on LT / MT / HT.
                for (k, s) in [slot::LOW_TOM, slot::MID_TOM, slot::HIGH_TOM]
                    .into_iter()
                    .enumerate()
                {
                    if self.perc_env[k] > 1e-5 {
                        let ring = self.perc_osc[k].tick() * self.perc_env[k];
                        self.perc_env[k] *= self.perc_coef[k];
                        raw[s] = raw[s] * 0.78 + ring;
                    } else {
                        self.perc_env[k] = 0.0;
                    }
                }
            }
            KitModel::VintageCompu => {
                if self.perc_env[2] > 1e-5 {
                    raw[slot::RIM] += self.perc_osc[2].tick() * self.perc_env[2];
                    self.perc_env[2] *= self.perc_coef[2];
                } else {
                    self.perc_env[2] = 0.0;
                }
                let hats = self
                    .compu_lp
                    .lowpass(raw[slot::CLOSED_HAT] + raw[slot::OPEN_HAT]);
                raw[slot::CLOSED_HAT] = hats * 0.55;
                raw[slot::OPEN_HAT] = hats * 0.45;
            }
        }
    }

    #[inline]
    fn tick_air_layer(&mut self) -> (f32, f32, f32) {
        if self.air_env[0] < 1e-5 && self.air_env[1] < 1e-5 && self.air_env[2] < 1e-5 {
            self.air_env = [0.0; 3];
            return (0.0, 0.0, 0.0);
        }
        let n = self.air_hp.process(self.air_noise.tick()).high;
        let mut out = [0.0f32; 3];
        for (i, slot) in out.iter_mut().enumerate() {
            if self.air_env[i] >= 1e-5 {
                *slot = n * self.air_env[i];
                self.air_env[i] *= self.air_coef[i];
            } else {
                self.air_env[i] = 0.0;
            }
        }
        (out[0], out[1], out[2])
    }
}

/// Maps user-facing normalised controls onto per-era voice parameter offsets.
/// Returns `p` untouched for [`KitModel::Classic`].
fn effective_params(slot: usize, p: VoiceParams, model: KitModel) -> VoiceParams {
    let shift = |v: f32, delta: f32, scale: f32| ((v - 0.5) * scale + 0.5 + delta).clamp(0.0, 1.0);
    match model {
        KitModel::Classic => p,
        KitModel::SubBoom8O8 => match slot {
            slot::KICK => VoiceParams {
                tune: shift(p.tune, -0.14, 0.85),
                decay: shift(p.decay, 0.22, 0.9),
                ..p
            },
            slot::SNARE => VoiceParams {
                tune: shift(p.tune, -0.06, 0.9),
                tone: shift(p.tone, -0.08, 0.9),
                snappy: shift(p.snappy, 0.14, 0.9),
                ..p
            },
            slot::LOW_TOM | slot::MID_TOM | slot::HIGH_TOM => VoiceParams {
                decay: shift(p.decay, 0.18, 0.9),
                ..p
            },
            slot::CLOSED_HAT | slot::OPEN_HAT => VoiceParams {
                tone: shift(p.tone, 0.12, 0.9),
                ..p
            },
            _ => p,
        },
        KitModel::ClubPunch9O9 => match slot {
            slot::SNARE => VoiceParams {
                tune: shift(p.tune, 0.10, 0.95),
                decay: shift(p.decay, 0.08, 0.95),
                tone: shift(p.tone, 0.16, 0.95),
                snappy: shift(p.snappy, 0.18, 0.9),
                ..p
            },
            slot::CLAP => VoiceParams {
                decay: shift(p.decay, 0.10, 0.95),
                tone: shift(p.tone, 0.14, 0.95),
                ..p
            },
            slot::CLOSED_HAT | slot::OPEN_HAT => VoiceParams {
                tune: shift(p.tune, 0.08, 0.95),
                tone: shift(p.tone, 0.18, 0.9),
                ..p
            },
            slot::LOW_TOM | slot::MID_TOM | slot::HIGH_TOM => VoiceParams {
                tune: shift(p.tune, 0.06, 0.95),
                decay: shift(p.decay, -0.08, 0.95),
                ..p
            },
            _ => p,
        },
        KitModel::Studio7O7 => match slot {
            slot::SNARE => VoiceParams {
                tune: shift(p.tune, 0.14, 0.9),
                decay: shift(p.decay, -0.14, 0.85),
                tone: shift(p.tone, 0.22, 0.9),
                snappy: shift(p.snappy, 0.12, 0.9),
                ..p
            },
            slot::CLOSED_HAT | slot::OPEN_HAT => VoiceParams {
                decay: shift(p.decay, -0.10, 0.85),
                tone: shift(p.tone, 0.20, 0.9),
                ..p
            },
            slot::COWBELL => VoiceParams {
                tune: shift(p.tune, 0.16, 0.9),
                decay: shift(p.decay, -0.12, 0.9),
                ..p
            },
            _ => p,
        },
        KitModel::Silver6O6 => match slot {
            slot::SNARE => VoiceParams {
                tune: shift(p.tune, 0.22, 0.85),
                decay: shift(p.decay, -0.18, 0.85),
                tone: shift(p.tone, 0.24, 0.85),
                snappy: shift(p.snappy, 0.24, 0.85),
                ..p
            },
            slot::LOW_TOM | slot::MID_TOM | slot::HIGH_TOM => VoiceParams {
                tune: shift(p.tune, 0.18, 0.9),
                decay: shift(p.decay, -0.15, 0.85),
                ..p
            },
            slot::CLOSED_HAT | slot::OPEN_HAT => VoiceParams {
                tune: shift(p.tune, -0.12, 0.9),
                tone: shift(p.tone, 0.14, 0.9),
                ..p
            },
            _ => p,
        },
        KitModel::WarehouseRaw => match slot {
            slot::SNARE => VoiceParams {
                tune: shift(p.tune, 0.06, 0.95),
                decay: shift(p.decay, 0.14, 0.95),
                snappy: shift(p.snappy, 0.22, 0.9),
                ..p
            },
            slot::CLAP => VoiceParams {
                decay: shift(p.decay, 0.20, 0.9),
                ..p
            },
            slot::CLOSED_HAT | slot::OPEN_HAT => VoiceParams {
                tone: shift(p.tone, 0.22, 0.9),
                ..p
            },
            _ => p,
        },
        KitModel::LatinPerc => match slot {
            slot::LOW_TOM | slot::MID_TOM | slot::HIGH_TOM => VoiceParams {
                tune: shift(p.tune, 0.28, 0.85),
                decay: shift(p.decay, -0.16, 0.85),
                ..p
            },
            slot::RIM => VoiceParams {
                tune: shift(p.tune, 0.32, 0.8),
                tone: shift(p.tone, 0.22, 0.85),
                ..p
            },
            slot::COWBELL => VoiceParams {
                tune: shift(p.tune, 0.28, 0.85),
                tone: shift(p.tone, 0.18, 0.9),
                ..p
            },
            slot::CLOSED_HAT | slot::OPEN_HAT => VoiceParams {
                decay: shift(p.decay, -0.22, 0.8),
                tone: shift(p.tone, -0.14, 0.85),
                ..p
            },
            _ => p,
        },
        KitModel::VintageCompu => match slot {
            slot::SNARE => VoiceParams {
                tune: shift(p.tune, -0.10, 0.85),
                decay: shift(p.decay, -0.12, 0.85),
                tone: shift(p.tone, -0.18, 0.85),
                snappy: shift(p.snappy, 0.20, 0.85),
                ..p
            },
            slot::CLOSED_HAT | slot::OPEN_HAT => VoiceParams {
                tone: shift(p.tone, -0.20, 0.85),
                decay: shift(p.decay, -0.15, 0.85),
                ..p
            },
            slot::COWBELL | slot::RIM => VoiceParams {
                tune: shift(p.tune, 0.18, 0.85),
                decay: shift(p.decay, -0.22, 0.8),
                ..p
            },
            _ => p,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn idle_kit_is_silent() {
        let mut kit = Kit::new(48_000.0);
        assert!(!kit.is_active());
        for _ in 0..1_000 {
            assert_eq!(kit.process(), 0.0);
        }
    }

    #[test]
    fn kick_slot_matches_bare_kick() {
        // The mixer only applies the fixed headroom trim to a lone voice.
        let mut kit = Kit::new(48_000.0);
        let mut kick = Kick::new(48_000.0);
        kit.trigger(slot::KICK, 1.0);
        kick.trigger(1.0);
        for _ in 0..24_000 {
            assert_eq!(
                kit.process().to_bits(),
                (kick.process() * KIT_HEADROOM).to_bits()
            );
        }
    }

    #[test]
    fn every_voice_is_bounded_and_goes_idle() {
        for slot in 0..VOICE_COUNT {
            let mut kit = Kit::new(48_000.0);
            for param in Param::ALL {
                kit.set_param(slot, param, 1.0);
            }
            kit.trigger(slot, 1.0);
            for _ in 0..(48_000 * 6) {
                let s = kit.process();
                assert!(s.is_finite() && s.abs() <= 1.0, "slot {slot}: {s}");
            }
            assert!(!kit.is_active(), "slot {slot} still active after 6 s");
        }
    }

    #[test]
    fn a_silent_closed_hat_does_not_choke_the_open_hat() {
        let mut kit = Kit::new(48_000.0);
        kit.trigger(slot::OPEN_HAT, 1.0);
        for _ in 0..4_800 {
            kit.process();
        }
        kit.trigger(slot::CLOSED_HAT, 0.0);
        for _ in 0..4_800 {
            kit.process();
        }
        assert!(kit.open_hat.is_active());
    }

    #[test]
    fn params_are_clamped_and_stored() {
        let mut kit = Kit::new(48_000.0);
        kit.set_param(slot::SNARE, Param::Snappy, 2.0);
        assert_eq!(kit.params(slot::SNARE).snappy, 1.0);
        kit.set_param(99, Param::Level, 0.0); // ignored
    }

    #[test]
    fn multi_era_models_sends_and_solo_are_bounded() {
        for code in 0..=7u8 {
            let mut kit = Kit::new(48_000.0);
            kit.set_kit_model(KitModel::from_code(code));
            kit.set_cymbal_mode(0x03);
            kit.set_fx_send(slot::SNARE, 0, 0.8);
            kit.set_fx_send(slot::CLOSED_HAT, 1, 0.6);
            kit.set_fx_send(slot::KICK, 2, 0.5);
            for s in 0..VOICE_COUNT {
                kit.trigger(s, 1.0);
            }
            let mut echo_energy = 0.0f32;
            let mut rev_energy = 0.0f32;
            let mut flt_energy = 0.0f32;
            for _ in 0..4_800 {
                let (dry, echo, rev, flt) = kit.process_buses();
                assert!(dry.is_finite() && echo.is_finite() && rev.is_finite() && flt.is_finite());
                echo_energy += echo.abs();
                rev_energy += rev.abs();
                flt_energy += flt.abs();
            }
            assert!(echo_energy > 0.0 && rev_energy > 0.0 && flt_energy > 0.0);
        }

        // Solo isolates only the soloed slot.
        let mut solo_kit = Kit::new(48_000.0);
        solo_kit.set_solo_mask(1u16 << slot::SNARE);
        solo_kit.trigger(slot::KICK, 1.0);
        for _ in 0..512 {
            assert_eq!(solo_kit.process_buses().0, 0.0);
        }
        solo_kit.trigger(slot::SNARE, 1.0);
        let mut snare_sum = 0.0f32;
        for _ in 0..512 {
            snare_sum += solo_kit.process_buses().0.abs();
        }
        assert!(snare_sum > 0.0);
    }
}
