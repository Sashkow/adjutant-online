/** Pure curve maths for the two waveshapers. No Web Audio types, so it is unit-testable in Node. */

/** Both shapers are fed at half level so that signals up to ±2 survive the shaper's ±1 input clamp. */
export const SHAPER_HEADROOM = 2;

const CURVE_POINTS = 65537;

/** Hard ceiling of the output limiter, just under full scale. */
export const LIMIT_CEILING = 0.98;
const LIMIT_KNEE = 0.7;

/** Soft limiter transfer function on true amplitude: linear below the knee, saturating to the ceiling. */
export function limit(x: number): number {
  const a = Math.abs(x);
  if (a <= LIMIT_KNEE) return x;
  const span = LIMIT_CEILING - LIMIT_KNEE;
  return Math.sign(x) * (LIMIT_KNEE + span * Math.tanh((a - LIMIT_KNEE) / span));
}

/** Curve for the limiter shaper. Input u in [-1,1] represents amplitude u*SHAPER_HEADROOM; output is final amplitude. */
export function limiterCurve(): Float32Array<ArrayBuffer> {
  const c = new Float32Array(CURVE_POINTS);
  for (let i = 0; i < CURVE_POINTS; i++) {
    const u = (i / (CURVE_POINTS - 1)) * 2 - 1;
    c[i] = limit(u * SHAPER_HEADROOM);
  }
  return c;
}

/**
 * Impulse response of a room, generated from a seed so that live playback and
 * offline rendering use the identical room and no audio file is shipped.
 *
 * `metal` blends two characters:
 *   0 = stone hall: a smooth, dark wash of diffuse reflections.
 *   1 = metal room: hard parallel walls. Reflections arrive as regular
 *       "flutter" pulses that ring at a pitch, panels add inharmonic ringing
 *       modes, and the wash stays bright because steel absorbs little treble.
 */
export function roomImpulse(sampleRate: number, seconds: number, metal: number): Float32Array<ArrayBuffer> {
  const n = Math.max(1, Math.round(sampleRate * seconds));
  const out = new Float32Array(n);
  let seed = 20261112;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const predelay = Math.round(sampleRate * 0.008);
  const m = Math.min(1, Math.max(0, metal));

  // Diffuse wash. Metal keeps its treble; stone loses it as the tail decays.
  let smooth = 0;
  for (let i = predelay; i < n; i++) {
    const t = (i - predelay) / n;
    const k = (0.5 + 0.4 * m) * Math.exp(-3 * (1 - 0.7 * m) * t) + 0.04 + 0.2 * m;
    smooth += k * (rand() - 0.5 - smooth);
    out[i] = smooth * (1 - 0.8 * m);
  }

  if (m > 0) {
    // Flutter echo between two pairs of parallel walls (about 2.5 m and 3.8 m apart).
    for (const [spacingMs, gain] of [[7.3, 1], [11.1, 0.8]] as const) {
      const step = (spacingMs / 1000) * sampleRate;
      let sign = 1;
      for (let pos = predelay + step; pos < n; pos += step) {
        const i = Math.round(pos);
        if (i + 1 < n) {
          out[i] += sign * gain * m * 0.5;
          out[i + 1] += sign * gain * m * 0.3;
        }
        sign = -sign * 0.97; // each bounce flips polarity and loses a little
      }
    }
    // Ringing panels: inharmonic modes, each dying at its own rate.
    for (let k = 0; k < 14; k++) {
      const hz = 320 * Math.pow(1.23, k) * (0.95 + 0.1 * rand());
      const phase = rand() * Math.PI * 2;
      const life = 0.25 + 0.5 * rand();
      const amp = (m * 0.02) / (1 + k * 0.15);
      for (let i = predelay; i < n; i++) {
        const t = (i - predelay) / sampleRate;
        out[i] += amp * Math.exp((-6.9 * t) / (life * seconds)) * Math.sin(2 * Math.PI * hz * t + phase);
      }
    }
  }

  // One overall decay to -60 dB at the end.
  for (let i = predelay; i < n; i++) out[i] *= Math.exp((-6.9 * (i - predelay)) / n);
  return out;
}

/** Gentle overdrive for the radio path: unity gain for quiet signals, peaks squashed towards a third of full scale. */
export function radioCurve(): Float32Array<ArrayBuffer> {
  const n = 4097;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(3 * u) / 3;
  }
  return c;
}

/** Quantise a true amplitude to `bits` of resolution over ±1. */
export function quantise(x: number, bits: number): number {
  const step = 2 / Math.pow(2, bits);
  return Math.round(x / step) * step;
}

/** Curve for the grit shaper. Input and output are both at 1/SHAPER_HEADROOM of true amplitude. */
export function gritCurve(bits: number): Float32Array<ArrayBuffer> {
  const c = new Float32Array(CURVE_POINTS);
  for (let i = 0; i < CURVE_POINTS; i++) {
    const u = (i / (CURVE_POINTS - 1)) * 2 - 1;
    c[i] = quantise(u * SHAPER_HEADROOM, bits) / SHAPER_HEADROOM;
  }
  return c;
}
