import type { Engine } from '../types';
import { createPiper, type PiperDeps } from './piper';
import { createBilingual } from './ukrainian';
import stressUrl from '../uk/uk-stress.bin.gz?url';

/**
 * Piper's multi-speaker LibriTTS-R voice, driven directly: phonemise with
 * espeak-ng (the `phonemizer` package), map phonemes to ids, run the ONNX
 * model. Doing this ourselves, instead of through a wrapper package, is what
 * lets us choose one of the 904 speakers and control the pace.
 *
 * Model: rhasspy/piper-voices (MIT), trained on LibriTTS-R (CC BY 4.0).
 */

const CACHE_NAME = 'adjutant-voice-models-v1';
/** The web page takes the runtime from a CDN; the browser extension ships its own copy. */
const ONNX_WASM = __ORT_LOCAL_PATH__
  ? self.location.origin + __ORT_LOCAL_PATH__
  : `https://cdn.jsdelivr.net/npm/onnxruntime-web@${__ORT_VERSION__}/dist/`;

/** Fetch with progress, keeping the bytes in the Cache API so later visits skip the download. */
async function fetchCached(url: string, expectedBytes: number, onProgress: (loaded: number, total: number) => void): Promise<ArrayBuffer> {
  let cache: Cache | null = null;
  try {
    cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(url);
    if (hit) return await hit.arrayBuffer();
  } catch {
    cache = null; // storage unavailable (private window, blocked site data): just download
  }

  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}) for ${url.split('/').pop()}`);
  const total = Number(res.headers.get('content-length') ?? res.headers.get('x-linked-size')) || expectedBytes;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (expectedBytes > 0) onProgress(loaded, Math.max(total, loaded));
  }
  const bytes = new Uint8Array(loaded);
  let at = 0;
  for (const c of chunks) { bytes.set(c, at); at += c.length; }

  try {
    await cache?.put(url, new Response(bytes, { headers: { 'Content-Type': 'application/octet-stream' } }));
  } catch {
    // Out of quota: the voice still works, it just downloads again next time.
  }
  return bytes.buffer;
}

export async function createLibritts(voice: string | null): Promise<Engine> {
  const [ortModule, { phonemize }] = await Promise.all([import('onnxruntime-web/wasm'), import('phonemizer')]);
  const ort = ortModule.default ?? ortModule;
  const deps: PiperDeps = {
    ort,
    phonemize,
    fetchBytes: fetchCached,
    createSession: (model) => {
      ort.env.wasm.wasmPaths = ONNX_WASM;
      ort.env.wasm.numThreads = 1;
      return ort.InferenceSession.create(model, { executionProviders: ['wasm'] });
    },
    // Ships with the page and the extension, so it is not kept in the model cache.
    stressData: async () => (await fetch(stressUrl)).arrayBuffer(),
  };
  return createBilingual(deps, createPiper(deps, voice));
}
