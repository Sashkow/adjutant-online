import type { Engine } from '../types';
import { trimSilence } from '../text';
import { spellNumbers } from '../uk/numbers';
import { isUkrainian, languageRuns, modelLetters } from '../uk/runs';
import { markStress, openStress, unpackStress, type StressDictionary } from '../uk/stress';
import { UK_SIZE_RATIO, activeRms, matchToEnglish } from '../uk/match';
import { DURATION_NOISE, REVISION, type PiperDeps } from './piper';

/**
 * The Adjutant in Ukrainian. A sentence with Cyrillic letters is spoken by
 * Piper's Ukrainian voice (speaker "tetiana", the listener's pick), shaped
 * towards the English speaker; words in Latin letters inside it are spoken by
 * the English voice. A sentence with no Cyrillic letters goes to the English
 * voice untouched.
 *
 * Model: rhasspy/piper-voices (MIT), dataset "ukrainian_tts". Unlike the
 * English model it takes letters, not phonemes: lower case, decomposed, with an
 * acute accent after a stressed vowel.
 */

export const UK_MODEL_URL = `https://huggingface.co/rhasspy/piper-voices/resolve/${REVISION}/uk/uk_UA/ukrainian_tts/medium/uk_UA-ukrainian_tts-medium.onnx`;
export const UK_MODEL_BYTES = 76_735_663;
const UK_SPEAKER = 'tetiana';
/** The model's own pace suits the Adjutant's default rate; the English model needs 1.52 here. */
const UK_LENGTH_SCALE_AT_RATE_1 = 1;
/** Loudness of the English model's speech, which the Ukrainian model's output is brought to. */
const ENGLISH_ACTIVE_RMS = 0.13;
/** Silence where one voice hands over to the other inside a sentence. */
const HANDOVER_MS = 70;

interface UkConfig {
  audio: { sample_rate: number };
  inference: { noise_scale: number; noise_w: number };
  speaker_id_map: Record<string, number>;
  phoneme_id_map: Record<string, number[]>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function createBilingual(deps: PiperDeps, english: Engine): Engine {
  const { ort } = deps;
  let progress: (loaded: number, total: number) => void = () => {};
  let ukrainian: Promise<{ config: UkConfig; session: any; stress: StressDictionary | null }> | null = null;

  /** The Ukrainian model is fetched the first time Ukrainian text turns up, so English-only use never pays for it. */
  function loadUkrainian() {
    ukrainian ??= (async () => {
      const config = JSON.parse(new TextDecoder().decode(await deps.fetchBytes(`${UK_MODEL_URL}.json`, 0, () => {}))) as UkConfig;
      const session = await deps.createSession(await deps.fetchBytes(UK_MODEL_URL, UK_MODEL_BYTES, progress));
      let stress: StressDictionary | null = null;
      try {
        if (deps.stressData) stress = openStress(await unpackStress(await deps.stressData()));
      } catch { /* no stress data: the model guesses, which is still intelligible */ }
      return { config, session, stress };
    })();
    ukrainian.catch(() => { ukrainian = null; });
    return ukrainian;
  }

  /** `closing` is the punctuation the stretch ends on: the sentence's own, or a comma before an English word. */
  async function speakUkrainian(text: string, closing: string, rate: number): Promise<Float32Array> {
    const { config, session, stress } = await loadUkrainian();
    const spelled = spellNumbers(text);
    const letters = modelLetters(stress ? markStress(spelled, stress) : spelled).replace(/[\s,;:.!?—-]+$/, '') + closing;
    const map = config.phoneme_id_map;
    const pad = map['_'];
    const ids = [...map['^'], ...pad];
    for (const ch of letters) {
      const id = map[ch];
      if (id) ids.push(...id, ...pad);
    }
    ids.push(...map['$']);
    const out = await session.run({
      input: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
      input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
      scales: new ort.Tensor('float32', Float32Array.from([
        config.inference.noise_scale, (UK_LENGTH_SCALE_AT_RATE_1 * UK_SIZE_RATIO) / rate, Math.min(config.inference.noise_w, DURATION_NOISE),
      ]), [3]),
      sid: new ort.Tensor('int64', BigInt64Array.from([BigInt(config.speaker_id_map[UK_SPEAKER] ?? 0)]), [1]),
    });
    const sampleRate = config.audio.sample_rate;
    const shaped = matchToEnglish(trimSilence(Float32Array.from(out.output.data as Float32Array), sampleRate), sampleRate);
    const level = activeRms(shaped);
    return level > 0 ? shaped.map((v) => (v * ENGLISH_ACTIVE_RMS) / level) : shaped;
  }

  return {
    supportsRate: true,
    async load(onProgress) {
      progress = onProgress;
      await english.load(onProgress);
    },
    async synth(sentence, rate) {
      if (!isUkrainian(sentence)) return english.synth(sentence, rate);
      const runs = languageRuns(sentence);
      const end = /[.!?]["')\]»]?$/.test(sentence.trim()) ? sentence.trim().replace(/["')\]»]$/, '').slice(-1) : '.';
      const pieces: Float32Array[] = [];
      let sampleRate = 22050;
      for (let i = 0; i < runs.length; i++) {
        const last = i === runs.length - 1;
        if (runs[i].lang === 'uk') {
          pieces.push(await speakUkrainian(runs[i].text, last ? end : ',', rate));
        } else {
          // A bare English word or two: spoken as a short statement of its own.
          const out = await english.synth(runs[i].text.replace(/[\s,;:.!?]+$/, '') + (last ? end : ','), rate);
          sampleRate = out.sampleRate;
          pieces.push(trimSilence(out.samples, out.sampleRate));
        }
      }
      const gap = Math.round((HANDOVER_MS / 1000) * sampleRate);
      const total = pieces.reduce((n, p) => n + p.length, 0) + gap * Math.max(0, pieces.length - 1);
      const samples = new Float32Array(total);
      let at = 0;
      for (const p of pieces) { samples.set(p, at); at += p.length + gap; }
      return { samples, sampleRate };
    },
  };
}
