import type { Engine } from '../types';

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const DTYPE = 'q8';
/**
 * The naturally highest American voice of the 25 stock voices measured (median 211 Hz;
 * the reference is 216 Hz), used as-is with no pitch shifting. The tone defaults in
 * params.ts are fitted to this voice. Alternatives: `bf_alice` (216 Hz, British, livelier),
 * `af_bella` (192 Hz, flatter intonation).
 */
export const KOKORO_DEFAULT_VOICE = 'af_jessica';

export async function createKokoro(voice: string | null): Promise<Engine> {
  const { KokoroTTS } = await import('kokoro-js');
  let tts: InstanceType<typeof KokoroTTS> | null = null;

  return {
    supportsRate: true,
    async load(onProgress) {
      // The model arrives as several files; report their combined progress.
      const files = new Map<string, { loaded: number; total: number }>();
      tts = await KokoroTTS.from_pretrained(MODEL_ID, {
        dtype: DTYPE,
        device: 'wasm',
        progress_callback: (info) => {
          if (info.status !== 'progress') return;
          files.set(info.file, { loaded: info.loaded, total: info.total });
          let loaded = 0, total = 0;
          for (const f of files.values()) { loaded += f.loaded; total += f.total; }
          onProgress(loaded, total);
        },
      });
    },
    async synth(sentence, rate) {
      if (!tts) throw new Error('Kokoro model is not loaded');
      const audio = await tts.generate(sentence, {
        voice: (voice ?? KOKORO_DEFAULT_VOICE) as never,
        speed: rate,
      });
      return { samples: audio.audio as Float32Array, sampleRate: audio.sampling_rate };
    },
  };
}
