/// <reference lib="webworker" />
import type { Engine, EngineName, WorkerRequest, WorkerResponse } from './types';
import { tightenPauses, trimSilence } from './text';

const post = (msg: WorkerResponse, transfer: Transferable[] = []) =>
  (self as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

let loaded: { key: string; engine: Promise<Engine> } | null = null;
let activeId = -1;

async function createEngine(name: EngineName, voice: string | null): Promise<Engine> {
  if (name === 'kokoro') return (await import('./engines/kokoro')).createKokoro(voice);
  return (await import('./engines/libritts')).createLibritts(voice);
}

/** Load the engine once; a failed load is forgotten so the next request retries. */
function ensureEngine(id: number, name: EngineName, voice: string | null): Promise<Engine> {
  const key = `${name}:${voice ?? ''}`;
  if (loaded?.key === key) return loaded.engine;
  const engine = (async () => {
    const e = await createEngine(name, voice);
    await e.load((l, t) => post({ type: 'loading', id, loaded: l, total: t }));
    return e;
  })();
  const entry = { key, engine };
  loaded = entry;
  engine.catch(() => { if (loaded === entry) loaded = null; });
  return engine;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

// Requests are handled one at a time so a model is never loaded twice concurrently.
let queue: Promise<void> = Promise.resolve();

async function handle(req: Extract<WorkerRequest, { type: 'synth' }>): Promise<void> {
  const { id } = req;
  if (activeId !== id) return; // superseded while queued

  let engine: Engine;
  try {
    engine = await ensureEngine(id, req.engine, req.voice);
  } catch (e) {
    post({ type: 'error', id, stage: 'load', message: message(e) });
    return;
  }

  try {
    const chunks: Float32Array[] = [];
    let sampleRate = 0;
    for (let i = 0; i < req.sentences.length; i++) {
      if (activeId !== id) return;
      post({ type: 'sentence', id, done: i, total: req.sentences.length });
      const out = await engine.synth(req.sentences[i], req.rate);
      sampleRate = out.sampleRate;
      // Copy: the trimmed view must own its buffer to be transferable.
      chunks.push(tightenPauses(trimSilence(out.samples, out.sampleRate), out.sampleRate, req.flow).slice());
    }
    if (activeId !== id) return;
    post({ type: 'result', id, chunks, sampleRate }, chunks.map((c) => c.buffer));
  } catch (e) {
    post({ type: 'error', id, stage: 'synth', message: message(e) });
  }
}

self.onmessage = (ev: MessageEvent<WorkerRequest>) => {
  const req = ev.data;
  if (req.type === 'cancel') {
    if (activeId === req.id) activeId = -1;
    return;
  }
  activeId = req.id;
  queue = queue.then(() => handle(req));
};
