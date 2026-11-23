import { PARAM_SPECS, clampParam, diffSettings, type Settings } from './params';
import { MAX_CHARS } from '../tts/text';

/**
 * Page state lives in the URL fragment, which browsers never send to the host:
 *   #t=<text>&<param>=<value>...   (only parameters that differ from the default preset)
 */

export interface PageState {
  text: string;
  settings: Settings;
}

export function encodeState(state: PageState, base: Settings): string {
  const q = new URLSearchParams();
  if (state.text) q.set('t', state.text);
  const diff = diffSettings(state.settings, base);
  for (const s of PARAM_SPECS) {
    const v = diff[s.key];
    if (v !== undefined) q.set(s.key, String(Number(v.toFixed(4))));
  }
  const out = q.toString();
  return out ? `#${out}` : '';
}

/** Never throws: anything unreadable falls back to empty text and default values. */
export function decodeState(hash: string, base: Settings): PageState {
  const state: PageState = { text: '', settings: { ...base } };
  try {
    const q = new URLSearchParams(hash.replace(/^#/, ''));
    state.text = (q.get('t') ?? '').slice(0, MAX_CHARS);
    for (const s of PARAM_SPECS) {
      const raw = q.get(s.key);
      if (raw === null || raw.trim() === '') continue;
      const v = Number(raw);
      if (Number.isFinite(v)) state.settings[s.key] = clampParam(s.key, v);
    }
  } catch {
    return { text: '', settings: { ...base } };
  }
  return state;
}
