import type { EngineName } from '../tts/types';

/**
 * Engine and voice can be overridden for A/B listening:
 *   ?voice=731               another LibriTTS speaker, by index 0-903
 *   ?engine=kokoro&voice=af_bella
 */
export function engineFromQuery(search: string): { engine: EngineName; voice: string | null } {
  const q = new URLSearchParams(search);
  const engine: EngineName = q.get('engine') === 'kokoro' ? 'kokoro' : 'libritts';
  const voice = q.get('voice');
  return { engine, voice: voice && /^[\w-]{1,64}$/.test(voice) ? voice : null };
}
