/**
 * A short synthesised "incoming transmission" tone placed before the speech:
 * a few pulses of a buzzy, inharmonic tone, then a brief silence. Generated
 * from scratch; no recorded audio is involved.
 */

/** Partials of the tone: [frequency in Hz, relative amplitude]. */
const PARTIALS: ReadonlyArray<readonly [number, number]> = [
  [910, 0.9], [2090, 0.8], [2920, 0.6], [3090, 1], [4090, 0.9], [4925, 0.7],
];
const BUZZ_HZ = 167; // amplitude modulation rate that gives the tone its rasp
const PULSES = 5;
const PULSE_ON = 0.062;
const PULSE_OFF = 0.016;
const GAP_AFTER = 0.09;

export const INTRO_SECONDS = PULSES * (PULSE_ON + PULSE_OFF) + GAP_AFTER;

const rms = (x: Float32Array, floor = 0) => {
  let e = 0, n = 0;
  for (const v of x) if (Math.abs(v) >= floor) { e += v * v; n++; }
  return n ? Math.sqrt(e / n) : 0;
};

/** The intro tone at unit RMS (measured over its sounding samples), followed by silence. */
export function introTone(sampleRate: number): Float32Array {
  const out = new Float32Array(Math.round(INTRO_SECONDS * sampleRate));
  const period = PULSE_ON + PULSE_OFF;
  const edge = 0.003;
  for (let i = 0; i < out.length; i++) {
    const t = i / sampleRate;
    const pulse = Math.floor(t / period);
    const inPulse = t - pulse * period;
    if (pulse >= PULSES || inPulse >= PULSE_ON) continue;
    // Short fades so pulses do not click.
    const fade = Math.min(1, inPulse / edge, (PULSE_ON - inPulse) / edge);
    // Raised-cosine buzz, so the modulation is rough without being a hard gate.
    const buzz = 0.5 - 0.5 * Math.cos(2 * Math.PI * BUZZ_HZ * t);
    let v = 0;
    for (const [hz, amp] of PARTIALS) if (hz < sampleRate / 2) v += amp * Math.sin(2 * Math.PI * hz * t);
    out[i] = v * buzz * buzz * fade;
  }
  const level = rms(out, 1e-6);
  if (level > 0) for (let i = 0; i < out.length; i++) out[i] /= level;
  return out;
}

/**
 * A "com-link" double beep, generated from sine partials. No recorded audio
 * is involved. The shape follows measurements of a reference: each beep lasts
 * 181.5 ms and is a quick two-note figure, a high pair of tones (2165 and
 * 3751 Hz) for the first 44 ms, then a lower pair (1390 and 2404 Hz) with two
 * brief dips; the second beep starts 20 ms after the first ends.
 *
 * Each partial has an amplitude curve: [time within the beep in seconds, amplitude].
 */
const BEEP_ON = 0.1815;
const BEEP_OFF = 0.02;
const BEEP_GAP_AFTER = 0.14;
const BEEP_CURVES: ReadonlyArray<readonly [number, ReadonlyArray<readonly [number, number]>]> = [
  [2165, [[0, 0], [0.001, 0.17], [0.03, 0.19], [0.033, 0.13], [0.037, 0.15], [0.041, 0.22], [0.046, 0.05], [0.075, 0.04], [0.085, 0.02], [0.1815, 0.01]]],
  [3751, [[0, 0], [0.001, 0.17], [0.03, 0.2], [0.033, 0.11], [0.037, 0.15], [0.041, 0.21], [0.046, 0.09], [0.075, 0.07], [0.09, 0.04], [0.11, 0.02], [0.1815, 0]]],
  [1390, [[0, 0], [0.042, 0], [0.047, 0.17], [0.077, 0.17], [0.081, 0.05], [0.085, 0.06], [0.088, 0.16], [0.11, 0.2], [0.132, 0.26], [0.136, 0.1], [0.14, 0.23], [0.15, 0.26], [0.17, 0.21], [0.1795, 0.19], [0.1815, 0]]],
  [2404, [[0, 0], [0.042, 0], [0.047, 0.17], [0.077, 0.19], [0.081, 0.09], [0.085, 0.03], [0.088, 0.19], [0.108, 0.28], [0.12, 0.19], [0.132, 0.1], [0.136, 0.09], [0.148, 0.16], [0.16, 0.09], [0.17, 0.18], [0.1795, 0.16], [0.1815, 0]]],
];
/**
 * Loudness of the double beep relative to the processed speech. The beep is
 * added after the effect chain, so it stays dry like the reference.
 */
export const DOUBLE_BEEP_LEVEL = 0.36;

/** Linear interpolation along an amplitude curve. */
function curveAt(curve: ReadonlyArray<readonly [number, number]>, t: number): number {
  for (let i = 1; i < curve.length; i++) {
    const [t1, a1] = curve[i];
    if (t <= t1) {
      const [t0, a0] = curve[i - 1];
      return a0 + ((a1 - a0) * (t - t0)) / (t1 - t0 || 1);
    }
  }
  return 0;
}

/** The double beep at unit RMS (measured over its sounding samples), followed by silence. */
export function doubleBeep(sampleRate: number): Float32Array {
  const out = new Float32Array(Math.round((2 * BEEP_ON + BEEP_OFF + BEEP_GAP_AFTER) * sampleRate));
  for (let i = 0; i < out.length; i++) {
    const t = i / sampleRate;
    const inBeep = t < BEEP_ON ? t : t - (BEEP_ON + BEEP_OFF);
    if (inBeep < 0 || inBeep >= BEEP_ON) continue;
    let v = 0;
    for (const [hz, curve] of BEEP_CURVES) if (hz < sampleRate / 2) v += curveAt(curve, inBeep) * Math.sin(2 * Math.PI * hz * inBeep);
    out[i] = v;
  }
  const level = rms(out, 1e-6);
  if (level > 0) for (let i = 0; i < out.length; i++) out[i] /= level;
  return out;
}

/**
 * Prepend an opening tone to speech: the intro tone, or another such as the
 * double beep. `level` is the tone's loudness relative to the speech (RMS over
 * sounding samples); 0 returns the speech unchanged.
 */
export function withIntro(speech: Float32Array, sampleRate: number, level: number, tone = introTone(sampleRate)): Float32Array {
  if (level <= 0 || speech.length === 0) return speech;
  const gain = level * rms(speech, 0.01);
  const out = new Float32Array(tone.length + speech.length);
  for (let i = 0; i < tone.length; i++) out[i] = tone[i] * gain;
  out.set(speech, tone.length);
  return out;
}

const OUTRO_HZ = 2475;
const OUTRO_ON = 0.22;
const OUTRO_GAP = 0.18;

/** Append a short pure-tone sign-off beep after the speech, in the manner of a radio end-of-transmission tone. */
export function withOutro(speech: Float32Array, sampleRate: number, level: number): Float32Array {
  if (level <= 0 || speech.length === 0) return speech;
  const gap = Math.round(OUTRO_GAP * sampleRate);
  const on = Math.round(OUTRO_ON * sampleRate);
  const gain = level * rms(speech, 0.01) * Math.SQRT2;
  const out = new Float32Array(speech.length + gap + on);
  out.set(speech);
  const edge = 0.004 * sampleRate;
  for (let i = 0; i < on; i++) {
    const fade = Math.min(1, i / edge, (on - i) / edge);
    out[speech.length + gap + i] = gain * fade * Math.sin((2 * Math.PI * OUTRO_HZ * i) / sampleRate);
  }
  return out;
}

/**
 * Lay radio static under the whole clip: steady hiss plus sparse crackle.
 * `level` 1 puts the hiss about 20 dB under the speech. Seeded, so playback and
 * download are identical.
 */
export function withStatic(clip: Float32Array, sampleRate: number, level: number): Float32Array {
  if (level <= 0 || clip.length === 0) return clip;
  const out = new Float32Array(clip);
  const hiss = level * 0.1 * rms(clip, 0.01);
  let seed = 7919;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const ramp = 0.02 * sampleRate;
  const crackleEvery = 0.35 * sampleRate; // average spacing
  let crackle = 0;
  for (let i = 0; i < out.length; i++) {
    const fade = Math.min(1, i / ramp, (out.length - i) / ramp);
    if (rand() < 1 / crackleEvery) crackle = (rand() - 0.5) * 12;
    out[i] += fade * hiss * ((rand() - 0.5) * 3.46 + crackle);
    crackle *= 0.6;
  }
  return out;
}
