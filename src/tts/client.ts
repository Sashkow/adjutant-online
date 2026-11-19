import type { EngineName, WorkerRequest, WorkerResponse } from './types';
import { MAX_CHARS, checkText, joinWithGaps, normalisePeak, sentenceBounds, splitParagraphs } from './text';

export type SynthStatus =
  | { phase: 'loading'; fraction: number | null }
  | { phase: 'synthesising'; done: number; total: number };

export type SynthErrorKind = 'empty' | 'too-long' | 'load' | 'synth' | 'cancelled';

export class SynthError extends Error {
  constructor(readonly kind: SynthErrorKind, message: string) {
    super(message);
  }
}

export interface Speech {
  samples: Float32Array;
  sampleRate: number;
  /** Where each sentence sits in `samples`: [start, end). */
  bounds: Array<[number, number]>;
}

interface Pending {
  id: number;
  key: string;
  onStatus: (s: SynthStatus) => void;
  resolve: (chunks: { chunks: Float32Array[]; sampleRate: number }) => void;
  reject: (e: SynthError) => void;
}

/** Main-thread handle on the TTS worker. Text never leaves the browser. */
export class Synthesizer {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending: Pending | null = null;
  /** Last synthesised sentences, so replays, slider tweaks and downloads do not re-run the model. */
  private cache: { key: string; chunks: Float32Array[]; sampleRate: number } | null = null;

  constructor(readonly engine: EngineName, readonly voice: string | null = null) {}

  private send(msg: WorkerRequest): void {
    if (!this.worker) {
      // Created on first use: nothing TTS-related is fetched at page load.
      this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (ev: MessageEvent<WorkerResponse>) => this.receive(ev.data);
      this.worker.onerror = (ev) => {
        this.pending?.reject(new SynthError('load', ev.message || 'The speech worker failed to start'));
        this.pending = null;
        this.worker?.terminate();
        this.worker = null;
      };
    }
    this.worker.postMessage(msg);
  }

  private receive(msg: WorkerResponse): void {
    const p = this.pending;
    if (!p || msg.id !== p.id) return;
    switch (msg.type) {
      case 'loading':
        p.onStatus({ phase: 'loading', fraction: msg.total > 0 ? msg.loaded / msg.total : null });
        break;
      case 'sentence':
        p.onStatus({ phase: 'synthesising', done: msg.done, total: msg.total });
        break;
      case 'result':
        this.pending = null;
        p.resolve({ chunks: msg.chunks, sampleRate: msg.sampleRate });
        break;
      case 'error':
        this.pending = null;
        p.reject(new SynthError(msg.stage, msg.message));
        break;
    }
  }

  /** Abandon the request in flight, if any. Its promise rejects with kind 'cancelled'. */
  cancel(): void {
    const p = this.pending;
    if (!p) return;
    this.pending = null;
    this.worker?.postMessage({ type: 'cancel', id: p.id } satisfies WorkerRequest);
    p.reject(new SynthError('cancelled', 'Cancelled'));
  }

  async synthesize(
    rawText: string,
    opts: { rate: number; gapMs: number; flow?: number; blipLevel?: number },
    onStatus: (s: SynthStatus) => void = () => {},
  ): Promise<Speech> {
    const check = checkText(rawText);
    if (!check.ok) {
      throw check.reason === 'empty'
        ? new SynthError('empty', 'There is no text to speak.')
        : new SynthError('too-long', `Text is limited to ${MAX_CHARS} characters.`);
    }
    const { sentences, startsParagraph } = splitParagraphs(check.text);
    if (sentences.length === 0) throw new SynthError('empty', 'There is no text to speak.');

    const flow = opts.flow ?? 0;
    const key = JSON.stringify([sentences, opts.rate, flow]);
    this.cancel();

    if (this.cache?.key !== key) {
      const id = this.nextId++;
      const result = await new Promise<{ chunks: Float32Array[]; sampleRate: number }>((resolve, reject) => {
        this.pending = { id, key, onStatus, resolve, reject };
        onStatus({ phase: 'synthesising', done: 0, total: sentences.length });
        this.send({ type: 'synth', id, engine: this.engine, voice: this.voice, sentences, rate: opts.rate, flow });
      });
      this.cache = { key, ...result };
    }
    const { chunks, sampleRate } = this.cache;
    return {
      samples: normalisePeak(joinWithGaps(chunks, sampleRate, opts.gapMs, opts.blipLevel ?? 0, startsParagraph)),
      sampleRate,
      bounds: sentenceBounds(chunks, sampleRate, opts.gapMs),
    };
  }
}
