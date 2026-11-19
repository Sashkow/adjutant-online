import { describe, expect, it } from 'vitest';
import { INTRO_SECONDS, introTone, withIntro, withOutro, withStatic } from './intro';

const sr = 24000;
const speech = new Float32Array(sr).map((_, i) => 0.5 * Math.sin((2 * Math.PI * 200 * i) / sr));
const rms = (x: Float32Array) => Math.sqrt(x.reduce((e, v) => e + v * v, 0) / x.length);

describe('intro tone', () => {
  it('has the documented length and ends in silence', () => {
    const tone = introTone(sr);
    expect(tone.length).toBe(Math.round(INTRO_SECONDS * sr));
    expect(tone.subarray(tone.length - Math.round(0.08 * sr)).every((v) => v === 0)).toBe(true);
    expect(tone.every(Number.isFinite)).toBe(true);
  });

  it('is pulsed: there is silence between pulses', () => {
    const tone = introTone(sr);
    const at = (seconds: number) => tone.subarray(Math.round(seconds * sr), Math.round((seconds + 0.01) * sr));
    expect(rms(at(0.02))).toBeGreaterThan(0.3);
    expect(rms(at(0.065))).toBe(0);
  });
});

describe('withIntro', () => {
  it('returns the speech untouched at level 0', () => {
    expect(withIntro(speech, sr, 0)).toBe(speech);
  });

  it('prepends the tone and leaves the speech intact after it', () => {
    const out = withIntro(speech, sr, 0.25);
    const n = Math.round(INTRO_SECONDS * sr);
    expect(out.length).toBe(n + speech.length);
    expect(Array.from(out.subarray(n, n + 100))).toEqual(Array.from(speech.subarray(0, 100)));
  });

  it('scales the tone relative to the speech level', () => {
    const n = Math.round(INTRO_SECONDS * sr);
    const quiet = withIntro(speech, sr, 0.25).subarray(0, n);
    const loud = withIntro(speech, sr, 0.5).subarray(0, n);
    expect(rms(loud) / rms(quiet)).toBeCloseTo(2, 3);
    const sounding = quiet.filter((v) => Math.abs(v) > 1e-6);
    expect(rms(sounding) / rms(speech)).toBeCloseTo(0.25, 1);
  });
});

describe('withOutro', () => {
  it('returns the speech untouched at level 0', () => {
    expect(withOutro(speech, sr, 0)).toBe(speech);
  });

  it('appends a gap and then a beep, leaving the speech intact', () => {
    const out = withOutro(speech, sr, 0.2);
    expect(out.length).toBeGreaterThan(speech.length + 0.3 * sr);
    expect(Array.from(out.subarray(0, 100))).toEqual(Array.from(speech.subarray(0, 100)));
    expect(rms(out.subarray(speech.length, speech.length + Math.round(0.15 * sr)))).toBe(0);
    const beep = out.subarray(out.length - Math.round(0.2 * sr), out.length - Math.round(0.02 * sr));
    expect(rms(beep) / rms(speech)).toBeCloseTo(0.2, 1);
  });
});

describe('withStatic', () => {
  it('returns the clip untouched at level 0', () => {
    expect(withStatic(speech, sr, 0)).toBe(speech);
  });

  it('adds quiet, repeatable noise without changing the length', () => {
    const silentTail = new Float32Array(sr * 2);
    silentTail.set(speech.subarray(0, sr));
    const a = withStatic(silentTail, sr, 1);
    expect(a.length).toBe(silentTail.length);
    expect(Array.from(withStatic(silentTail, sr, 1).subarray(sr, sr + 500))).toEqual(Array.from(a.subarray(sr, sr + 500)));
    const hiss = rms(a.subarray(sr + 1000, 2 * sr - 1000));
    expect(hiss).toBeGreaterThan(0);
    expect(hiss).toBeLessThan(0.3 * rms(speech));
  });
});

describe('doubleBeep', () => {
  it('is two beeps with a short gap, then silence, each a high note followed by a lower one', async () => {
    const { doubleBeep } = await import('./intro');
    const sr = 22050;
    const tone = doubleBeep(sr);
    const at = (seconds: number) => Math.abs(tone[Math.round(seconds * sr)]) + Math.abs(tone[Math.round(seconds * sr) + 3]) + Math.abs(tone[Math.round(seconds * sr) + 7]);
    expect(at(0.09)).toBeGreaterThan(0.1); // first beep
    expect(at(0.19)).toBe(0); // gap
    expect(at(0.29)).toBeGreaterThan(0.1); // second beep
    expect(at(0.45)).toBe(0); // silence before the speech
    expect(tone.length).toBe(Math.round(0.523 * sr));
    // Count zero crossings: the opening 40 ms is pitched higher than the stretch after it.
    const crossings = (from: number, to: number) => {
      let n = 0;
      for (let i = Math.round(from * sr) + 1; i < Math.round(to * sr); i++) if (tone[i - 1] < 0 !== tone[i] < 0) n++;
      return n / (to - from);
    };
    expect(crossings(0.002, 0.04)).toBeGreaterThan(crossings(0.09, 0.128) * 1.2);
  });
});

