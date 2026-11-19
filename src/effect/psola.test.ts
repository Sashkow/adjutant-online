import { describe, expect, it } from 'vitest';
import { pitchShift, trackPeriods } from './psola';

const sr = 24000;

/** A voice-like test tone: glottal pulses at `f0` ringing two fixed resonances ("formants"). */
function vowel(f0: number, seconds: number, formants = [700, 1200]): Float32Array {
  const n = Math.round(seconds * sr);
  const x = new Float32Array(n);
  const period = sr / f0;
  for (let k = 0; k * period < n; k++) {
    const start = Math.round(k * period);
    for (let i = 0; i < 400 && start + i < n; i++) {
      const t = i / sr;
      for (const f of formants) x[start + i] += Math.exp(-t * 900) * Math.sin(2 * Math.PI * f * t);
    }
  }
  let peak = 0;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  return x.map((v) => (v / peak) * 0.8);
}

function medianF0(x: Float32Array): number {
  const p = Array.from(trackPeriods(x, sr)).filter((v) => v > 0).sort((a, b) => a - b);
  return sr / p[p.length >> 1];
}

/** Energy near `hz`, by direct projection (no FFT needed for a couple of probes). */
function energyAt(x: Float32Array, hz: number, width = 120): number {
  let total = 0;
  for (let f = hz - width; f <= hz + width; f += 20) {
    let re = 0, im = 0;
    for (let i = 0; i < x.length; i += 2) {
      re += x[i] * Math.cos((2 * Math.PI * f * i) / sr);
      im += x[i] * Math.sin((2 * Math.PI * f * i) / sr);
    }
    total += re * re + im * im;
  }
  return total;
}

describe('trackPeriods', () => {
  it('finds the pitch of a steady voiced sound and reports silence as unvoiced', () => {
    expect(medianF0(vowel(200, 0.6))).toBeCloseTo(200, -1);
    expect(Array.from(trackPeriods(new Float32Array(sr / 2), sr)).every((v) => v === 0)).toBe(true);
  });
});

describe('pitchShift', () => {
  const src = vowel(200, 0.8);
  const ratio = Math.pow(2, 4 / 12); // up four semitones
  const out = pitchShift(src, sr, ratio);

  it('returns the input untouched at ratio 1', () => {
    expect(pitchShift(src, sr, 1)).toBe(src);
  });

  it('keeps the duration', () => {
    expect(out.length).toBe(src.length);
  });

  it('moves the pitch by the requested ratio', () => {
    const got = medianF0(out) / medianF0(src);
    expect(got).toBeGreaterThan(ratio * 0.97);
    expect(got).toBeLessThan(ratio * 1.03);
  });

  it('leaves the resonances where they were (resampling would move 2400 Hz to about 3000 Hz)', () => {
    // Wide bands, so each holds several harmonics whatever the pitch is.
    const voice = vowel(200, 0.8, [600, 2400]);
    const shifted = pitchShift(voice, sr, ratio);
    const mid = shifted.subarray(2400, shifted.length - 2400);
    expect(energyAt(mid, 2400, 300)).toBeGreaterThan(3 * energyAt(mid, 3020, 300));
    // Same balance as the original, within a factor of two.
    const before = energyAt(voice.subarray(2400, voice.length - 2400), 2400, 300) / energyAt(voice.subarray(2400, voice.length - 2400), 3020, 300);
    const after = energyAt(mid, 2400, 300) / energyAt(mid, 3020, 300);
    expect(after).toBeGreaterThan(before / 2);
  });

  it('can bend pitch over time: lifted at the start, untouched at the end', () => {
    const lift = Math.pow(2, 3 / 12);
    const bent = pitchShift(src, sr, (i) => (i < src.length / 2 ? lift : 1));
    expect(bent.length).toBe(src.length);
    const first = medianF0(bent.subarray(0, src.length / 2 - 1200));
    const second = medianF0(bent.subarray(src.length / 2 + 1200));
    expect(first / second).toBeGreaterThan(lift * 0.96);
    expect(first / second).toBeLessThan(lift * 1.04);
    expect(second).toBeCloseTo(200, -1);
  });

  it('can lower pitch too, and stays finite and in range', () => {
    const down = pitchShift(src, sr, 0.8);
    expect(medianF0(down) / medianF0(src)).toBeCloseTo(0.8, 1);
    let peak = 0;
    for (const v of down) { expect(Number.isFinite(v)).toBe(true); peak = Math.max(peak, Math.abs(v)); }
    expect(peak).toBeLessThan(2);
  });

  it('passes unvoiced sound through essentially unchanged', () => {
    let seed = 1;
    const noise = new Float32Array(4800).map(() => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 0.2);
    const res = pitchShift(noise, sr, ratio);
    let err = 0;
    for (let i = 400; i < noise.length - 400; i++) err = Math.max(err, Math.abs(res[i] - noise[i]));
    expect(err).toBeLessThan(1e-3);
  });
});
