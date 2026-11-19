/**
 * Single source of truth for every tunable number: effect-chain parameters and
 * delivery parameters. The advanced drawer, the spike page, clamping and the
 * URL encoding are all generated from this schema.
 *
 * Defaults were fitted to measurements of reference lines (see design.md,
 * "Reference measurements"): a 12 ms doubling (the metallic colour), a single
 * 65 ms echo, wide bandwidth with a presence lift, and no short comb.
 *
 * The doubling, echo and resonance amounts are deliberately set ABOVE the
 * measured values: at the measured strength the effect was barely audible to
 * a listener. Measured values: doubleMix 0.5, echoMix 0.1, combFeedback 0. They have not yet been checked by ear.
 *
 * Clarity pass (design.md, section 22): the mid scoop sits at 1 kHz, below the
 * 2 to 4 kHz range that carries consonants, the air shelf starts at 3.5 kHz so
 * it lifts that range, and the echo, resonance and room are slightly lower.
 */

export type ParamGroup = 'delivery' | 'band' | 'tone' | 'double' | 'echo' | 'space' | 'radio' | 'comb' | 'ring' | 'grit' | 'output';

export interface ParamSpec {
  key: string;
  label: string;
  group: ParamGroup;
  min: number;
  max: number;
  step: number;
  default: number;
  unit: string;
}

export const GROUP_LABELS: Record<ParamGroup, string> = {
  delivery: 'Delivery',
  band: 'Band limit',
  tone: 'Tone',
  comb: 'Metallic resonance',
  double: 'Metallic doubling',
  echo: 'Echo',
  space: 'Space (room)',
  radio: 'Radio link (extra)',
  ring: 'Ring modulation (extra)',
  grit: 'Grit',
  output: 'Output',
};

const spec = <K extends string>(
  key: K, label: string, group: ParamGroup,
  min: number, max: number, step: number, def: number, unit: string,
) => ({ key, label, group, min, max, step, default: def, unit });

export const PARAM_SPECS = [
  spec('rate', 'Speaking rate', 'delivery', 0.6, 1.3, 0.01, 0.88, '×'),
  spec('pitch', 'Pitch (voice character kept)', 'delivery', -6, 6, 0.1, 0.7, 'st'),
  spec('formant', 'Voice size', 'delivery', -3, 3, 0.1, 0.4, 'st'),
  spec('onsetLift', 'Sentence opening lift', 'delivery', 0, 5, 0.1, 2.5, 'st'),
  spec('flow', 'Flow (shorter pauses inside sentences)', 'delivery', 0, 1, 0.01, 0.9, ''),
  spec('gapMs', 'Pause between sentences', 'delivery', 0, 1500, 10, 450, 'ms'),
  spec('blipLevel', 'Blip between paragraphs', 'delivery', 0, 1, 0.01, 0.28, ''),
  spec('introLevel', 'Intro tone level', 'delivery', 0, 2, 0.01, 0.17, ''),

  spec('hpHz', 'Low cut', 'band', 60, 1000, 5, 150, 'Hz'),
  spec('lpHz', 'High cut', 'band', 2000, 12000, 50, 9000, 'Hz'),

  spec('bodyDb', 'Body (500 Hz)', 'tone', -12, 12, 0.5, 3.5, 'dB'),
  spec('midHz', 'Mid scoop at', 'tone', 500, 3000, 50, 1000, 'Hz'),
  spec('midDb', 'Mid scoop', 'tone', -18, 12, 0.5, -8, 'dB'),
  spec('shelfHz', 'Air from', 'tone', 500, 8000, 50, 3500, 'Hz'),
  spec('shelfDb', 'Air', 'tone', -18, 12, 0.5, 8, 'dB'),

  spec('doubleMs', 'Delay', 'double', 5, 40, 0.1, 12, 'ms'),
  spec('doubleMix', 'Amount', 'double', 0, 1, 0.01, 1, ''),
  spec('doubleLfoHz', 'Drift rate', 'double', 0.05, 5, 0.05, 0.6, 'Hz'),
  spec('doubleLfoMs', 'Drift depth', 'double', 0, 2, 0.01, 0.1, 'ms'),

  spec('echoMs', 'Delay', 'echo', 20, 250, 1, 70, 'ms'),
  spec('echoMix', 'Amount', 'echo', 0, 1, 0.01, 0.4, ''),
  spec('echoFeedback', 'Repeats', 'echo', 0, 0.8, 0.01, 0.1, ''),

  spec('reverbMix', 'Amount', 'space', 0, 1, 0.01, 0.25, ''),
  spec('reverbSec', 'Size', 'space', 0.3, 4, 0.1, 0.7, 's'),
  spec('reverbMetal', 'Stone to metal', 'space', 0, 1, 0.01, 1, ''),

  spec('radioMix', 'Amount', 'radio', 0, 1, 0.01, 0, ''),
  spec('radioStatic', 'Static', 'radio', 0, 1, 0.01, 0, ''),
  spec('outroLevel', 'Sign-off beep', 'radio', 0, 2, 0.01, 0, ''),

  spec('combMs', 'Delay', 'comb', 0.2, 15, 0.05, 12, 'ms'),
  spec('combMix', 'Amount', 'comb', 0, 1, 0.01, 0, ''),
  spec('combFeedback', 'Resonance', 'comb', 0, 0.9, 0.01, 0.62, ''),

  spec('ringHz', 'Frequency', 'ring', 20, 400, 1, 60, 'Hz'),
  spec('ringDepth', 'Amount', 'ring', 0, 1, 0.01, 0, ''),

  spec('gritBits', 'Bit depth', 'grit', 3, 16, 1, 8, 'bit'),
  spec('gritMix', 'Amount', 'grit', 0, 1, 0.01, 0.1, ''),

  spec('compress', 'Compression', 'output', 0, 1, 0.01, 0, ''),
  spec('gain', 'Level', 'output', 0, 2, 0.01, 0.8, '×'),
] as const satisfies readonly ParamSpec[];

export type ParamKey = (typeof PARAM_SPECS)[number]['key'];
export type Settings = Record<ParamKey, number>;

export const SPEC_BY_KEY = Object.fromEntries(
  PARAM_SPECS.map((s) => [s.key, s]),
) as Record<ParamKey, ParamSpec>;

export function isParamKey(key: string): key is ParamKey {
  return Object.prototype.hasOwnProperty.call(SPEC_BY_KEY, key);
}

export function clampParam(key: ParamKey, value: number): number {
  const s = SPEC_BY_KEY[key];
  if (!Number.isFinite(value)) return s.default;
  return Math.min(s.max, Math.max(s.min, value));
}

/** Returns a complete, in-range Settings object from any partial/untrusted input. */
export function clampSettings(input: Partial<Record<string, unknown>>, base: Settings): Settings {
  const out = { ...base };
  for (const s of PARAM_SPECS) {
    const v = input[s.key];
    if (typeof v === 'number') out[s.key] = clampParam(s.key, v);
  }
  return out;
}

/** Settings that differ from `base`, for compact URLs. */
export function diffSettings(settings: Settings, base: Settings): Partial<Settings> {
  const out: Partial<Settings> = {};
  for (const s of PARAM_SPECS) {
    if (Math.abs(settings[s.key] - base[s.key]) > s.step / 1000) out[s.key] = settings[s.key];
  }
  return out;
}

export function maxSettings(): Settings {
  return Object.fromEntries(PARAM_SPECS.map((s) => [s.key, s.max])) as Settings;
}
