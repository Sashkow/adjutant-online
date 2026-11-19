import type { Engine } from '../types';
import { respell } from '../text';

/**
 * The Piper voice itself, independent of where it runs: the page and the
 * Firefox extension supply the browser ONNX runtime and the Cache API, the
 * command-line speaker supplies the native runtime and a cache on disk.
 */

/** Pinned repository revision, so the voice cannot change underneath us. */
export const REVISION = 'ae9d8352b73c1b1750748843e753a504b00e05b0';
/**
 * How much the model varies the length of each sound from one rendering to the next. At the model's
 * own value (0.333) the same word came out well on some renderings and stretched on others
 * ("transs-mission"); a small value keeps the timing close to the model's average.
 */
export const DURATION_NOISE = 0.1;

export const MODEL_URL = `https://huggingface.co/rhasspy/piper-voices/resolve/${REVISION}/en/en_US/libritts_r/medium/en_US-libritts_r-medium.onnx`;
export const MODEL_BYTES = 78_580_914;

/**
 * Speaker index 100 (LibriTTS reader 114): the listener's pick from a scan of
 * all 904 speakers. About 231 Hz median pitch with a 6-semitone range.
 */
export const LIBRITTS_DEFAULT_SPEAKER = 100;

/**
 * Length scale at speaking rate 1. The model's own pace (1.0) is far quicker
 * than the reference; measured on the same lines, about 1.65 matches it, which
 * is what the default rate of 0.92 gives.
 */
const LENGTH_SCALE_AT_RATE_1 = 1.52;

interface PiperConfig {
  audio: { sample_rate: number };
  espeak: { voice: string };
  inference: { noise_scale: number; length_scale: number; noise_w: number };
  num_speakers: number;
  phoneme_id_map: Record<string, number[]>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PiperDeps {
  /** onnxruntime-web or onnxruntime-node: only Tensor is used here. */
  ort: any;
  phonemize: (text: string, voice: string) => Promise<string[]>;
  /** Return the bytes at `url`, from a cache if possible. `expectedBytes` 0 means "small, no progress". */
  fetchBytes: (url: string, expectedBytes: number, onProgress: (loaded: number, total: number) => void) => Promise<ArrayBuffer>;
  createSession: (model: ArrayBuffer) => Promise<any>;
  /** The bytes of uk-stress.bin.gz (see tts/uk/stress.ts). Without it Ukrainian is spoken with the model's own guess at the stress. */
  stressData?: () => Promise<ArrayBuffer>;
}

export function speakerFromVoice(voice: string | null, speakers: number): number {
  const n = voice === null ? NaN : Number(voice);
  return Number.isInteger(n) && n >= 0 && n < speakers ? n : LIBRITTS_DEFAULT_SPEAKER;
}

export function createPiper(deps: PiperDeps, voice: string | null): Engine {
  const { ort, phonemize } = deps;

  let config: PiperConfig | null = null;
  let session: any = null;
  let speaker = LIBRITTS_DEFAULT_SPEAKER;

  /** Piper's input: ^ _ p1 _ p2 _ ... $ where _ is a pad between every phoneme. */
  async function phonemeIds(sentence: string): Promise<number[]> {
    const map = config!.phoneme_id_map;
    const pad = map['_'];
    const ids = [...map['^'], ...pad];
    const end = /[.!?]$/.test(sentence) ? sentence.slice(-1) : '.';
    const clauses = sentence.replace(/[.!?…]+$/, '').split(/[,;:]\s*/).filter((c) => c.trim());
    for (let i = 0; i < clauses.length; i++) {
      // A clause written as [[…]] is already phonemes (Piper's own convention): for a phrase whose
      // stress the dictionary gets wrong, such as "Where WAS I?".
      const given = /^\s*\[\[(.+)\]\]\s*$/.exec(clauses[i]);
      const ipa = given ? given[1] : (await phonemize(respell(clauses[i]), config!.espeak.voice)).join(' ');
      const tail = i < clauses.length - 1 ? ', ' : end;
      for (const ch of ipa + tail) {
        const id = map[ch];
        if (id) ids.push(...id, ...pad);
      }
    }
    ids.push(...map['$']);
    return ids;
  }

  return {
    supportsRate: true,
    async load(onProgress) {
      const configBytes = await deps.fetchBytes(`${MODEL_URL}.json`, 0, () => {});
      config = JSON.parse(new TextDecoder().decode(configBytes)) as PiperConfig;
      speaker = speakerFromVoice(voice, config.num_speakers);
      session = await deps.createSession(await deps.fetchBytes(MODEL_URL, MODEL_BYTES, onProgress));
    },
    async synth(sentence, rate) {
      if (!session || !config) throw new Error('The voice model is not loaded');
      const ids = await phonemeIds(sentence);
      const { noise_scale } = config.inference;
      const noise_w = Math.min(config.inference.noise_w, DURATION_NOISE);
      const out = await session.run({
        input: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
        input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
        scales: new ort.Tensor('float32', Float32Array.from([noise_scale, LENGTH_SCALE_AT_RATE_1 / rate, noise_w]), [3]),
        sid: new ort.Tensor('int64', BigInt64Array.from([BigInt(speaker)]), [1]),
      });
      return { samples: Float32Array.from(out.output.data as Float32Array), sampleRate: config.audio.sample_rate };
    },
  };
}
