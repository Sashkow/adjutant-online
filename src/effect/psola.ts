/**
 * Formant-preserving pitch shift (TD-PSOLA).
 *
 * Resampling raises pitch and vocal-tract resonances together, which makes a
 * voice sound smaller or younger. Here the speech is cut into grains two pitch
 * periods long, and the grains are laid back down closer together (higher
 * pitch) or further apart (lower). Each grain keeps its own spectral envelope,
 * so the voice keeps its size while the pitch moves. Duration is unchanged.
 */

const FRAME_HOP = 0.005;
const FRAME_WIN = 0.04;
const F0_MIN = 80;
const F0_MAX = 420;
const UNVOICED_PERIOD = 0.005;

/** Pitch period in samples for each 5 ms frame; 0 where the frame is unvoiced. */
export function trackPeriods(x: Float32Array, sampleRate: number): Float32Array {
  // Work on a decimated copy: pitch lives below 1 kHz and this is several times faster.
  const d = Math.max(1, Math.floor(sampleRate / 12000));
  const y = new Float32Array(Math.floor(x.length / d));
  for (let i = 0; i < y.length; i++) {
    let s = 0;
    for (let k = 0; k < d; k++) s += x[i * d + k];
    y[i] = s / d;
  }
  const sr = sampleRate / d;
  let peak = 0;
  for (const v of y) peak = Math.max(peak, Math.abs(v));

  const hop = FRAME_HOP * sr;
  const win = Math.round(FRAME_WIN * sr);
  const lagMin = Math.floor(sr / F0_MAX);
  const lagMax = Math.ceil(sr / F0_MIN);
  const frames = Math.ceil(y.length / hop);
  const raw = new Float32Array(frames);
  const corr = new Float32Array(lagMax + 2);

  for (let f = 0; f < frames; f++) {
    const start = Math.round(f * hop - win / 2);
    if (start < 0 || start + win + lagMax >= y.length) continue;
    let e0 = 0;
    for (let i = 0; i < win; i++) e0 += y[start + i] * y[start + i];
    if (Math.sqrt(e0 / win) < 0.02 * peak) continue;

    let best = 0;
    for (let lag = lagMin; lag <= lagMax; lag++) {
      let c = 0, e1 = 0;
      for (let i = 0; i < win; i++) {
        const b = y[start + i + lag];
        c += y[start + i] * b;
        e1 += b * b;
      }
      corr[lag] = c / Math.sqrt(e0 * e1 + 1e-12);
      if (corr[lag] > best) best = corr[lag];
    }
    if (best < 0.5) continue;
    // Take the shortest lag that is nearly as good as the best, to avoid octave-down errors.
    let lag = lagMin;
    while (lag < lagMax && !(corr[lag] > 0.9 * best && corr[lag] >= corr[lag - 1] && corr[lag] >= corr[lag + 1])) lag++;
    // Parabolic refinement between lags.
    const a = corr[lag - 1], b = corr[lag], c = corr[lag + 1];
    const shift = lag > lagMin && lag < lagMax && a - 2 * b + c !== 0 ? (0.5 * (a - c)) / (a - 2 * b + c) : 0;
    raw[f] = (lag + shift) * d;
  }

  // Median of five removes isolated octave jumps and one-frame dropouts.
  const out = new Float32Array(frames);
  const window: number[] = [];
  for (let f = 0; f < frames; f++) {
    window.length = 0;
    for (let k = -2; k <= 2; k++) {
      const v = raw[f + k];
      if (v > 0) window.push(v);
    }
    if (window.length >= 3) {
      window.sort((p, q) => p - q);
      out[f] = window[window.length >> 1];
    }
  }
  return out;
}

interface Mark {
  /** Centre of the grain, in samples. */
  at: number;
  /** Local pitch period, in samples. */
  period: number;
  voiced: boolean;
}

function analysisMarks(x: Float32Array, sampleRate: number, periods: Float32Array): Mark[] {
  const hop = FRAME_HOP * sampleRate;
  const fallback = Math.round(UNVOICED_PERIOD * sampleRate);
  const periodAt = (t: number) => periods[Math.min(periods.length - 1, Math.max(0, Math.round(t / hop)))];
  const peakIn = (from: number, to: number) => {
    let best = Math.max(0, Math.round(from));
    const end = Math.min(x.length - 1, Math.round(to));
    for (let i = best; i <= end; i++) if (x[i] > x[best]) best = i;
    return best;
  };

  const marks: Mark[] = [];
  let t = 0;
  let wasVoiced = false;
  while (t < x.length) {
    const p = periodAt(t);
    if (p > 0) {
      // Keep marks on the same point of each cycle (its largest peak) so grains line up.
      t = wasVoiced ? peakIn(t + 0.75 * p, t + 1.25 * p) : peakIn(t, t + p);
      marks.push({ at: t, period: p, voiced: true });
      wasVoiced = true;
    } else {
      marks.push({ at: t, period: fallback, voiced: false });
      t += fallback;
      wasVoiced = false;
    }
  }
  return marks;
}

/**
 * Shift pitch by `ratio` (2 = up an octave) without changing duration or vocal-tract character.
 * `ratio` may be a function of the sample position, to bend the pitch over time.
 * `size` above 1 also makes the voice smaller (its resonances move up by that ratio, like a faster tape) without
 * changing pitch or timing: each grain is read `size` times faster as it is laid down. Used by the live effect, where
 * speeding up the whole stream is not possible.
 */
export function pitchShift(x: Float32Array, sampleRate: number, ratio: number | ((sample: number) => number), size = 1): Float32Array {
  if (x.length === 0) return x;
  if (typeof ratio === 'number' && Math.abs(ratio - 1) < 1e-3 && Math.abs(size - 1) < 1e-3) return x;
  const ratioAt = typeof ratio === 'number' ? () => ratio : ratio;
  const marks = analysisMarks(x, sampleRate, trackPeriods(x, sampleRate));
  if (marks.length === 0) return x;

  const out = new Float32Array(x.length);
  const weight = new Float32Array(x.length);
  let ts = 0;
  let ai = 0;
  while (ts < x.length) {
    while (ai + 1 < marks.length && Math.abs(marks[ai + 1].at - ts) <= Math.abs(marks[ai].at - ts)) ai++;
    const m = marks[ai];
    const half = Math.max(2, Math.round(m.period));
    const centre = Math.round(ts);
    if (size !== 1) {                // a resampled grain: shorter by `size`, reading the same stretch of input
      const h = Math.max(2, Math.round(half / size));
      for (let j = -h; j < h; j++) {
        const pos = m.at + j * size, dst = centre + j;
        const i0 = Math.floor(pos);
        if (i0 < 0 || i0 + 1 >= x.length || dst < 0 || dst >= x.length) continue;
        const v = x[i0] + (x[i0 + 1] - x[i0]) * (pos - i0);
        const w = 0.5 + 0.5 * Math.cos((Math.PI * j) / h);
        out[dst] += v * w;
        weight[dst] += w;
      }
      ts += m.voiced ? m.period / Math.max(0.25, ratioAt(ts)) : m.period;
      continue;
    }
    for (let j = -half; j < half; j++) {
      const src = m.at + j;
      const dst = centre + j;
      if (src < 0 || src >= x.length || dst < 0 || dst >= x.length) continue;
      const w = 0.5 + 0.5 * Math.cos((Math.PI * j) / half);
      out[dst] += x[src] * w;
      weight[dst] += w;
    }
    // Unvoiced sound has no pitch to move: lay its grains back exactly where they were.
    ts += m.voiced ? m.period / Math.max(0.25, ratioAt(ts)) : m.period;
  }
  for (let i = 0; i < out.length; i++) out[i] /= Math.max(weight[i], 0.25);
  return out;
}
