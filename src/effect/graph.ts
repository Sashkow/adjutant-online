import type { Settings } from './params';
import { SHAPER_HEADROOM, gritCurve, limiterCurve, radioCurve, roomImpulse } from './curves';

/**
 * Builds the voice effect chain on any BaseAudioContext, so live playback
 * (AudioContext) and WAV export (OfflineAudioContext) share one implementation.
 *
 *   input -> high-pass -> body peak -> mid scoop -> air shelf
 *         -> comb (feedforward delay + separate feedback resonator)
 *         -> doubling (a 12 ms copy, slowly drifting: the metallic colour)
 *         -> echo (a longer, audible copy; optional repeats)
 *         -> space (a generated room, from stone hall to metal room, beside the direct sound)
 *         -> ring mod
 *         -> compressor
 *         -> grit (bit-depth staircase)
 *         -> low-pass (the band limit of the final medium, so it also tames grit)
 *         -> radio link (a narrow, slightly overdriven band, blended with the full signal)
 *         -> level -> soft limiter -> output
 *
 * The feedback resonator is a separate delay because a DelayNode inside a
 * cycle cannot be shorter than one render quantum (128 frames); keeping the
 * feedforward delay out of the loop lets it go as short as the tuning needs.
 */

/** Both contexts run at this rate so the 128-frame feedback floor is identical live and offline. */
export const RENDER_SAMPLE_RATE = 48000;

const SMOOTH = 0.02;

export interface EffectChain {
  input: AudioNode;
  output: AudioNode;
  /** Apply new settings. Smoothed by default so live slider moves do not click. */
  update(settings: Settings, immediate?: boolean): void;
  dispose(): void;
}

/**
 * Browsers add one 128-frame block to a delay that sits inside a feedback
 * loop, so the resonance rings at the set time plus that block. A Web Audio
 * implementation that does not do this (the one used from Node) sets
 * `seconds` to the missing block so both produce the same ring.
 */
export const loopCompensation = { seconds: 0 };

export function buildChain(ctx: BaseAudioContext, settings: Settings): EffectChain {
  const input = ctx.createGain();

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.Q.value = 0.707;
  // Two cascaded low-passes: the reference falls away steeply above its band limit.
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 0.707;
  const lp2 = ctx.createBiquadFilter();
  lp2.type = 'lowpass';
  lp2.Q.value = 0.707;

  const body = ctx.createBiquadFilter();
  body.type = 'peaking';
  body.frequency.value = 500;
  body.Q.value = 1;
  // The reference is hollow between about 600 Hz and 2.5 kHz, with an airy top.
  // The default scoop covers only the lower part of that, to leave the consonants alone.
  const mid = ctx.createBiquadFilter();
  mid.type = 'peaking';
  mid.Q.value = 0.7;
  const shelf = ctx.createBiquadFilter();
  shelf.type = 'highshelf';

  // Comb: dry + delayed copy, then a feedback resonator at the same delay.
  const combSum = ctx.createGain();
  const ffDelay = ctx.createDelay(0.05);
  const ffGain = ctx.createGain();
  const resSum = ctx.createGain();
  const fbDelay = ctx.createDelay(0.05);
  const fbGain = ctx.createGain();
  const combNorm = ctx.createGain();

  // Doubling: a second, longer delay whose time drifts slowly (a slight detune).
  const dblSum = ctx.createGain();
  const dblDelay = ctx.createDelay(0.1);
  const dblGain = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoDepth = ctx.createGain();
  const dblNorm = ctx.createGain();

  // Echo: one audible copy; feedback adds repeats.
  const echoSum = ctx.createGain();
  const echoDelay = ctx.createDelay(0.5);
  const echoGain = ctx.createGain();
  const echoFb = ctx.createGain();
  const echoNorm = ctx.createGain();

  // Space: convolution with a generated room, in parallel with the direct sound.
  const spaceSum = ctx.createGain();
  const hall = ctx.createConvolver();
  const hallGain = ctx.createGain();
  let hallKey = '';

  // Ring mod: amplitude = (1 - depth) + depth * sin.
  const ring = ctx.createGain();
  const ringOsc = ctx.createOscillator();
  const ringDepth = ctx.createGain();

  // Compressor: evens out the level, as the reference is denser than raw synthetic speech.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -26;
  comp.knee.value = 12;
  comp.attack.value = 0.004;
  comp.release.value = 0.12;

  // Grit: parallel dry / bit-crushed paths.
  const gritDry = ctx.createGain();
  const gritPre = ctx.createGain();
  const gritShaper = ctx.createWaveShaper();
  const gritWet = ctx.createGain();
  const gritSum = ctx.createGain();
  gritPre.gain.value = 1 / SHAPER_HEADROOM;

  // Radio link: voice-band filter and mild overdrive, in parallel with the full-range signal.
  const radioDry = ctx.createGain();
  const radioHp = ctx.createBiquadFilter();
  radioHp.type = 'highpass';
  radioHp.frequency.value = 380;
  radioHp.Q.value = 1.2;
  const radioLp = ctx.createBiquadFilter();
  radioLp.type = 'lowpass';
  radioLp.frequency.value = 3000;
  radioLp.Q.value = 1.5;
  const radioDrive = ctx.createWaveShaper();
  radioDrive.curve = radioCurve();
  const radioWet = ctx.createGain();
  const radioSum = ctx.createGain();

  // Output level and limiter. The limiter guarantees |out| <= LIMIT_CEILING.
  const level = ctx.createGain();
  const limiter = ctx.createWaveShaper();
  limiter.curve = limiterCurve();
  const output = ctx.createGain();

  input.connect(hp).connect(body).connect(mid).connect(shelf);

  shelf.connect(combSum);
  shelf.connect(ffDelay).connect(ffGain).connect(combSum);
  combSum.connect(resSum);
  resSum.connect(fbDelay).connect(fbGain).connect(resSum);
  resSum.connect(combNorm);

  combNorm.connect(dblSum);
  combNorm.connect(dblDelay).connect(dblGain).connect(dblSum);
  lfo.connect(lfoDepth).connect(dblDelay.delayTime);
  dblSum.connect(dblNorm);

  dblNorm.connect(echoSum);
  dblNorm.connect(echoDelay).connect(echoGain).connect(echoSum);
  echoDelay.connect(echoFb).connect(echoDelay);
  echoSum.connect(echoNorm);

  echoNorm.connect(spaceSum);
  echoNorm.connect(hall).connect(hallGain).connect(spaceSum);

  spaceSum.connect(ring);
  ringOsc.connect(ringDepth).connect(ring.gain);

  ring.connect(comp);
  comp.connect(gritDry).connect(gritSum);
  comp.connect(gritPre).connect(gritShaper).connect(gritWet).connect(gritSum);

  gritSum.connect(lp).connect(lp2);
  lp2.connect(radioDry).connect(radioSum);
  lp2.connect(radioHp).connect(radioLp).connect(radioDrive).connect(radioWet).connect(radioSum);
  radioSum.connect(level).connect(limiter).connect(output);

  lfo.start();
  ringOsc.start();

  let currentBits = -1;

  const update = (s: Settings, immediate = false) => {
    const set = (p: AudioParam, v: number) => {
      if (immediate) p.value = v;
      else p.setTargetAtTime(v, ctx.currentTime, SMOOTH);
    };
    set(hp.frequency, s.hpHz);
    set(lp.frequency, s.lpHz);
    set(lp2.frequency, s.lpHz);
    set(body.gain, s.bodyDb);
    set(mid.frequency, s.midHz);
    set(mid.gain, s.midDb);
    set(shelf.frequency, s.shelfHz);
    set(shelf.gain, s.shelfDb);

    set(ffDelay.delayTime, s.combMs / 1000);
    set(ffGain.gain, s.combMix);
    set(fbDelay.delayTime, s.combMs / 1000 + loopCompensation.seconds);
    set(fbGain.gain, s.combFeedback);
    // Keep loudness roughly constant as the comb and resonance are turned up.
    // Delayed copies of speech add in power, not amplitude; the limiter catches the rare peak.
    set(combNorm.gain, Math.sqrt((1 - s.combFeedback ** 2) / (1 + s.combMix ** 2)));

    set(dblDelay.delayTime, s.doubleMs / 1000);
    set(dblGain.gain, s.doubleMix);
    set(lfo.frequency, s.doubleLfoHz);
    set(lfoDepth.gain, s.doubleLfoMs / 1000);
    set(dblNorm.gain, 1 / Math.sqrt(1 + s.doubleMix ** 2));

    set(echoDelay.delayTime, s.echoMs / 1000);
    set(echoGain.gain, s.echoMix);
    set(echoFb.gain, s.echoFeedback);
    set(echoNorm.gain, Math.sqrt((1 - s.echoFeedback ** 2) / (1 + s.echoMix ** 2)));

    const key = `${s.reverbSec}|${s.reverbMetal}`;
    if (key !== hallKey) {
      const impulse = roomImpulse(ctx.sampleRate, s.reverbSec, s.reverbMetal);
      const buffer = ctx.createBuffer(1, impulse.length, ctx.sampleRate);
      buffer.copyToChannel(impulse, 0);
      hall.buffer = buffer;
      hallKey = key;
    }
    // The convolver normalises its impulse to a quiet level; lift it so Amount 1 is clearly wet.
    set(hallGain.gain, s.reverbMix * 4);

    set(ring.gain, 1 - s.ringDepth);
    set(ringDepth.gain, s.ringDepth);
    set(ringOsc.frequency, s.ringHz);

    // Amount 0 is ratio 1 (no compression); amount 1 is ratio 8.
    set(comp.ratio, 1 + 7 * s.compress);

    const bits = Math.round(s.gritBits);
    if (bits !== currentBits) {
      gritShaper.curve = gritCurve(bits);
      currentBits = bits;
    }
    set(gritDry.gain, 1 - s.gritMix);
    set(gritWet.gain, s.gritMix * SHAPER_HEADROOM);

    set(radioDry.gain, 1 - s.radioMix);
    // The narrow band carries less energy; lift it so the blend keeps its loudness.
    set(radioWet.gain, s.radioMix * 1.6);

    set(level.gain, s.gain / SHAPER_HEADROOM);
  };

  update(settings, true);

  const nodes: AudioNode[] = [
    input, hp, lp, lp2, body, mid, shelf, comp, combSum, ffDelay, ffGain, resSum, fbDelay, fbGain, combNorm,
    dblSum, dblDelay, dblGain, lfo, lfoDepth, dblNorm, echoSum, echoDelay, echoGain, echoFb, echoNorm, spaceSum, hall, hallGain, ring, ringOsc, ringDepth,
    gritDry, gritPre, gritShaper, gritWet, gritSum,
    radioDry, radioHp, radioLp, radioDrive, radioWet, radioSum, level, limiter, output,
  ];

  return {
    input,
    output,
    update,
    dispose() {
      try { lfo.stop(); ringOsc.stop(); } catch { /* already stopped */ }
      for (const n of nodes) n.disconnect();
    },
  };
}

/** How long the chain keeps sounding after its input stops, in seconds. */
export function tailSeconds(s: Settings, sampleRate = RENDER_SAMPLE_RATE): number {
  const direct = (s.combMs + s.doubleMs + s.doubleLfoMs) / 1000;
  let echo = 0;
  if (s.echoMix > 0) {
    const repeats = s.echoFeedback > 0 ? Math.log(0.001) / Math.log(s.echoFeedback) : 0;
    echo = Math.min(4, (s.echoMs / 1000) * (1 + repeats));
  }
  let ring = 0;
  if (s.combFeedback > 0) {
    const loop = Math.max(s.combMs / 1000, 128 / sampleRate);
    const repeatsTo60dB = Math.log(0.001) / Math.log(s.combFeedback);
    ring = Math.min(2, loop * repeatsTo60dB);
  }
  const space = s.reverbMix > 0 ? s.reverbSec : 0;
  return direct + echo + space + ring + 0.05;
}
