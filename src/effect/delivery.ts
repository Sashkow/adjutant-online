import type { Settings } from './params';
import { withIntro, withOutro, withStatic } from './intro';
import { pitchShift } from './psola';

const semitones = (st: number) => Math.pow(2, st / 12);

/**
 * Two independent controls:
 *
 * - `pitch` moves only the pitch (PSOLA), so the voice stays the same size.
 * - `formant` ("voice size") scales the whole voice like a tape-speed change,
 *   by declaring a different sample rate for the buffer so the browser
 *   resamples it. That alone would also move pitch and tempo, so the pitch
 *   shift subtracts it again and the synthesiser timing is compensated.
 */
export function sizeRatio(settings: Settings): number {
  return semitones(settings.formant);
}

/** What to ask the synthesiser for, so the voice-size change does not alter timing. */
export function synthOptions(settings: Settings): { rate: number; gapMs: number; flow: number; blipLevel: number } {
  const ratio = sizeRatio(settings);
  return { rate: settings.rate / ratio, gapMs: settings.gapMs * ratio, flow: settings.flow, blipLevel: settings.blipLevel };
}

/**
 * Pitch ratio at each sample: the overall shift, plus a lift at the start of
 * every sentence after the first that melts away over its opening words. The
 * reference opens each sentence high and steps down; this voice opens lower.
 */
function pitchCurve(settings: Settings, bounds: Array<[number, number]>, sampleRate: number): number | ((sample: number) => number) {
  const base = settings.pitch - settings.formant;
  const later = bounds.slice(1);
  if (settings.onsetLift <= 0 || later.length === 0) return semitones(base);
  return (sample) => {
    for (const [start, end] of later) {
      if (sample < start || sample >= end) continue;
      const span = Math.min(0.3 * (end - start), 0.9 * sampleRate);
      const lift = settings.onsetLift * Math.max(0, 1 - (sample - start) / span);
      return semitones(base + lift);
    }
    return semitones(base);
  };
}

/** Speech ready for the effect chain: pitch shaped, framed by intro tone and sign-off beep, static laid under it. */
export function prepare(
  speech: { samples: Float32Array; sampleRate: number; bounds?: Array<[number, number]> },
  settings: Settings,
): { samples: Float32Array; sampleRate: number } {
  const shifted = pitchShift(speech.samples, speech.sampleRate, pitchCurve(settings, speech.bounds ?? [], speech.sampleRate));
  const sampleRate = speech.sampleRate * sizeRatio(settings);
  const framed = withOutro(withIntro(shifted, sampleRate, settings.introLevel), sampleRate, settings.outroLevel);
  return { samples: withStatic(framed, sampleRate, settings.radioStatic), sampleRate };
}
