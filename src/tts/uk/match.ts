import { pitchShift } from '../../effect/psola';

/**
 * Brings the Ukrainian speaker towards the English one, so that the Adjutant
 * sounds like one person in two languages. The values are the listener's
 * choice between the Ukrainian voice as it is and a full match measured against
 * the English voice (which needed +2.8 semitones of pitch, a smaller voice and
 * a brighter tone): half of the way.
 */
export const UK_MATCH = {
  /** Pitch, in semitones, on top of what the voice size change brings. */
  pitch: 0.6,
  /** Voice size ("formant"), in semitones: above 0 is a smaller voice. */
  size: 0.8,
  /** Less body around 500 Hz, in dB. */
  bodyDb: -1.5,
  /** More air above 3.5 kHz, in dB. */
  airDb: 1,
};

const semitones = (st: number) => Math.pow(2, st / 12);

/** The model must speak this much slower, because the voice size change below shortens the audio again. */
export const UK_SIZE_RATIO = semitones(UK_MATCH.size);

type Biquad = [b0: number, b1: number, b2: number, a1: number, a2: number];

function peaking(sampleRate: number, hz: number, q: number, db: number): Biquad {
  const a = Math.pow(10, db / 40);
  const w = (2 * Math.PI * hz) / sampleRate;
  const alpha = Math.sin(w) / (2 * q);
  const a0 = 1 + alpha / a;
  return [(1 + alpha * a) / a0, (-2 * Math.cos(w)) / a0, (1 - alpha * a) / a0, (-2 * Math.cos(w)) / a0, (1 - alpha / a) / a0];
}

function highShelf(sampleRate: number, hz: number, db: number): Biquad {
  const a = Math.pow(10, db / 40);
  const w = (2 * Math.PI * hz) / sampleRate;
  const cos = Math.cos(w);
  const beta = Math.sin(w) * Math.SQRT2 * Math.sqrt(a); // shelf slope 1
  const a0 = a + 1 - (a - 1) * cos + beta;
  return [
    (a * (a + 1 + (a - 1) * cos + beta)) / a0, (-2 * a * (a - 1 + (a + 1) * cos)) / a0, (a * (a + 1 + (a - 1) * cos - beta)) / a0,
    (2 * (a - 1 - (a + 1) * cos)) / a0, (a + 1 - (a - 1) * cos - beta) / a0,
  ];
}

function filter(x: Float32Array, [b0, b1, b2, a1, a2]: Biquad): Float32Array {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

/** Play `x` faster by `ratio` at the same sample rate: pitch and voice size rise together, as on a tape. */
function resample(x: Float32Array, ratio: number): Float32Array {
  const out = new Float32Array(Math.floor(x.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const at = i * ratio;
    const k = Math.floor(at);
    const next = Math.min(x.length - 1, k + 1);
    out[i] = x[k] + (x[next] - x[k]) * (at - k);
  }
  return out;
}

/** Ukrainian speech from the model, shaped towards the English voice. Its sample rate is unchanged. */
export function matchToEnglish(samples: Float32Array, sampleRate: number): Float32Array {
  const pitched = pitchShift(samples, sampleRate, semitones(UK_MATCH.pitch));
  const sized = resample(pitched, UK_SIZE_RATIO);
  return filter(filter(sized, peaking(sampleRate, 500, 1, UK_MATCH.bodyDb)), highShelf(sampleRate, 3500, UK_MATCH.airDb));
}

/** Loudness of the spoken parts only, so that pauses do not count. */
export function activeRms(samples: Float32Array): number {
  let e = 0, n = 0;
  for (const v of samples) if (Math.abs(v) > 0.01) { e += v * v; n++; }
  return n ? Math.sqrt(e / n) : 0;
}
