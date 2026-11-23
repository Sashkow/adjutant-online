/** What a voice engine provides to the speaker. */
export interface Engine {
  /** Whether `rate` is honoured. */
  readonly supportsRate: boolean;
  /** Download (or load from cache) and initialise the model. */
  load(onProgress: (loaded: number, total: number) => void): Promise<void>;
  /** Synthesise one sentence to mono samples. */
  synth(sentence: string, rate: number): Promise<{ samples: Float32Array; sampleRate: number }>;
}
