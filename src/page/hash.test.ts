import { describe, expect, it } from 'vitest';
import { DEFAULT_PRESET } from '../effect/preset';
import { decodeState, encodeState } from './hash';

describe('URL state', () => {
  it('is empty for empty text and default settings', () => {
    expect(encodeState({ text: '', settings: DEFAULT_PRESET }, DEFAULT_PRESET)).toBe('');
  });

  it('round-trips text with punctuation and unicode', () => {
    const text = 'Hello, Commander! 50% & rising #1 = "ok"? Привіт\nline two';
    const hash = encodeState({ text, settings: DEFAULT_PRESET }, DEFAULT_PRESET);
    expect(decodeState(hash, DEFAULT_PRESET)).toEqual({ text, settings: DEFAULT_PRESET });
  });

  it('carries only settings that differ from the default', () => {
    const settings = { ...DEFAULT_PRESET, combMix: 0.9, ringDepth: 0.4 };
    const hash = encodeState({ text: 'x', settings }, DEFAULT_PRESET);
    expect(hash).toContain('combMix=0.9');
    expect(hash).toContain('ringDepth=0.4');
    expect(hash).not.toContain('lpHz');
    expect(decodeState(hash, DEFAULT_PRESET).settings).toEqual(settings);
  });

  it('clamps out-of-range values and ignores junk', () => {
    const s = decodeState('#t=hi&combMix=99&lpHz=abc&unknown=1&gain=', DEFAULT_PRESET);
    expect(s.text).toBe('hi');
    expect(s.settings.combMix).toBe(1);
    expect(s.settings.lpHz).toBe(DEFAULT_PRESET.lpHz);
    expect(s.settings.gain).toBe(DEFAULT_PRESET.gain);
  });

  it('survives malformed fragments', () => {
    for (const bad of ['#%E0%A4%A', '#&&&===', '#t', '', '#%']) {
      const s = decodeState(bad, DEFAULT_PRESET);
      expect(s.settings).toEqual(DEFAULT_PRESET);
      expect(typeof s.text).toBe('string');
    }
  });

  it('truncates over-long text from a link', () => {
    const hash = encodeState({ text: 'a'.repeat(1000), settings: DEFAULT_PRESET }, DEFAULT_PRESET) + 'aaaa';
    expect(decodeState(hash, DEFAULT_PRESET).text.length).toBe(1000);
  });
});
