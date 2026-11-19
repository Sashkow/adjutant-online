/** `libritts` is the default; `kokoro` is kept as an alternative for comparison. */
export type EngineName = 'libritts' | 'kokoro';

/** What every in-browser TTS engine adapter provides to the worker. */
export interface Engine {
  /** Whether `rate` is honoured. */
  readonly supportsRate: boolean;
  /** Download (or load from cache) and initialise the model. */
  load(onProgress: (loaded: number, total: number) => void): Promise<void>;
  /** Synthesise one sentence to mono samples. */
  synth(sentence: string, rate: number): Promise<{ samples: Float32Array; sampleRate: number }>;
}

export type WorkerRequest =
  | { type: 'synth'; id: number; engine: EngineName; voice: string | null; sentences: string[]; rate: number; flow: number }
  | { type: 'cancel'; id: number };

export type WorkerResponse =
  | { type: 'loading'; id: number; loaded: number; total: number }
  | { type: 'sentence'; id: number; done: number; total: number }
  | { type: 'result'; id: number; chunks: Float32Array[]; sampleRate: number }
  | { type: 'error'; id: number; stage: 'load' | 'synth'; message: string };
