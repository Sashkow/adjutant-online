import { describe, expect, it } from 'vitest';
import { PARAM_SPECS, clampParam, clampSettings, diffSettings, maxSettings } from './params';
import { DEFAULT_PRESET } from './preset';
import { LIMIT_CEILING, SHAPER_HEADROOM, gritCurve, limit, limiterCurve, quantise, radioCurve, roomImpulse } from './curves';
import { tailSeconds } from './graph';

describe('parameter schema', () => {
  it('has a default inside the allowed range for every parameter', () => {
    for (const s of PARAM_SPECS) {
      expect(s.min).toBeLessThan(s.max);
      expect(s.default).toBeGreaterThanOrEqual(s.min);
      expect(s.default).toBeLessThanOrEqual(s.max);
    }
  });

  it('default preset is complete and in range', () => {
    for (const s of PARAM_SPECS) {
      const v = DEFAULT_PRESET[s.key];
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThanOrEqual(s.min);
      expect(v).toBeLessThanOrEqual(s.max);
    }
    expect(Object.keys(DEFAULT_PRESET).sort()).toEqual(PARAM_SPECS.map((s) => s.key).sort());
  });
});

describe('clamping', () => {
  it('clamps above max and below min', () => {
    expect(clampParam('combMix', 5)).toBe(1);
    expect(clampParam('combMix', -5)).toBe(0);
    expect(clampParam('lpHz', 1e9)).toBe(12000);
  });

  it('replaces non-finite values with the default', () => {
    expect(clampParam('gain', NaN)).toBe(0.8);
    expect(clampParam('gain', Infinity)).toBe(0.8);
  });

  it('ignores unknown keys and non-numbers', () => {
    const out = clampSettings({ combMix: 9, bogus: 3, hpHz: 'loud' }, DEFAULT_PRESET);
    expect(out.combMix).toBe(1);
    expect(out.hpHz).toBe(DEFAULT_PRESET.hpHz);
    expect('bogus' in out).toBe(false);
  });
});

describe('diffSettings', () => {
  it('is empty for the base and lists only changed keys', () => {
    expect(diffSettings(DEFAULT_PRESET, DEFAULT_PRESET)).toEqual({});
    expect(diffSettings({ ...DEFAULT_PRESET, ringDepth: 0.5 }, DEFAULT_PRESET)).toEqual({ ringDepth: 0.5 });
  });
});

describe('output limiter', () => {
  it('never exceeds the ceiling, however hot the input', () => {
    for (const x of [0, 0.5, 1, 2, 10, 1000, -1000]) expect(Math.abs(limit(x))).toBeLessThanOrEqual(LIMIT_CEILING);
    const curve = limiterCurve();
    let peak = 0;
    for (const v of curve) peak = Math.max(peak, Math.abs(v));
    expect(peak).toBeLessThanOrEqual(LIMIT_CEILING);
    expect(peak).toBeLessThan(1);
  });

  it('is transparent at normal levels and monotonic', () => {
    expect(limit(0.5)).toBe(0.5);
    expect(limit(-0.3)).toBe(-0.3);
    const curve = limiterCurve();
    for (let i = 1; i < curve.length; i++) expect(curve[i]).toBeGreaterThanOrEqual(curve[i - 1]);
  });
});

describe('grit', () => {
  it('quantises to the requested bit depth', () => {
    expect(quantise(0.3, 3)).toBe(0.25);
    expect(quantise(0.3, 16)).toBeCloseTo(0.3, 4);
  });

  it('curve has few distinct levels at low bit depth and stays in range', () => {
    const curve = gritCurve(3);
    const levels = new Set(Array.from(curve, (v) => v.toFixed(6)));
    expect(levels.size).toBeLessThanOrEqual(2 ** 3 * SHAPER_HEADROOM + 1);
    for (const v of curve) expect(Math.abs(v)).toBeLessThanOrEqual(1);
  });
});

describe('room impulse', () => {
  const rms = (x: Float32Array) => Math.sqrt(x.reduce((e, v) => e + v * v, 0) / x.length);

  it('is deterministic, the right length, and decays to near silence for stone and metal', () => {
    for (const metal of [0, 0.75, 1]) {
      const a = roomImpulse(48000, 1.5, metal);
      expect(a.length).toBe(72000);
      expect(Array.from(roomImpulse(48000, 1.5, metal).subarray(0, 2000))).toEqual(Array.from(a.subarray(0, 2000)));
      expect(rms(a.subarray(70000))).toBeLessThan(0.02 * rms(a.subarray(600, 3000)));
      expect(a.every(Number.isFinite)).toBe(true);
    }
  });

  it('metal is brighter than stone and carries flutter pulses', () => {
    const stone = roomImpulse(48000, 1, 0), metal = roomImpulse(48000, 1, 1);
    // Share of energy in sample-to-sample change: a simple measure of treble.
    const brightness = (x: Float32Array) => {
      let d = 0, e = 0;
      for (let i = 1; i < x.length; i++) { d += (x[i] - x[i - 1]) ** 2; e += x[i] ** 2; }
      return d / e;
    };
    expect(brightness(metal)).toBeGreaterThan(1.5 * brightness(stone));
    // A flutter reflection stands well clear of the wash around it.
    const at = Math.round(48000 * 0.008 + 3 * 0.0073 * 48000);
    const around = rms(metal.subarray(at - 120, at - 20));
    expect(Math.abs(metal[at])).toBeGreaterThan(2 * around);
  });
});

describe('radio overdrive', () => {
  it('passes quiet signals at unity gain and squashes loud ones', () => {
    const c = radioCurve();
    const at = (u: number) => c[Math.round(((u + 1) / 2) * (c.length - 1))];
    expect(at(0)).toBeCloseTo(0, 5);
    expect(at(0.02) / 0.02).toBeCloseTo(1, 1);
    expect(at(1)).toBeLessThan(0.34);
    expect(at(-1)).toBeCloseTo(-at(1), 5);
  });
});

describe('tailSeconds', () => {
  it('covers the delays and grows with resonance', () => {
    const dry = tailSeconds({ ...DEFAULT_PRESET, combFeedback: 0 });
    expect(dry).toBeGreaterThan((DEFAULT_PRESET.combMs + DEFAULT_PRESET.doubleMs) / 1000);
    expect(tailSeconds({ ...DEFAULT_PRESET, combFeedback: 0.9 })).toBeGreaterThan(dry);
    expect(tailSeconds(maxSettings())).toBeLessThan(11);
    expect(tailSeconds({ ...DEFAULT_PRESET, echoMix: 0 })).toBeLessThan(tailSeconds({ ...DEFAULT_PRESET, echoMix: 0.4, echoFeedback: 0.5 }));
  });
});
