import { describe, expect, it } from 'vitest';
import { BLIP_AFTER_SECONDS, MAX_CHARS, checkText, joinWithGaps, normalisePeak, splitParagraphs, splitSentences, tightenPauses, trimSilence } from './text';

describe('checkText', () => {
  it('rejects empty and whitespace-only text', () => {
    expect(checkText('')).toEqual({ ok: false, reason: 'empty' });
    expect(checkText('  \n\t ')).toEqual({ ok: false, reason: 'empty' });
  });

  it('accepts text at the limit and rejects text over it', () => {
    expect(checkText('a'.repeat(MAX_CHARS)).ok).toBe(true);
    expect(checkText('a'.repeat(MAX_CHARS + 1))).toEqual({ ok: false, reason: 'too-long' });
  });

  it('trims accepted text', () => {
    expect(checkText('  hello  ')).toEqual({ ok: true, text: 'hello' });
  });
});

describe('splitSentences', () => {
  it('splits on sentence punctuation and line breaks', () => {
    expect(splitSentences('One. Two! Three? Four')).toEqual(['One.', 'Two!', 'Three?', 'Four']);
    expect(splitSentences('Line one\nLine two')).toEqual(['Line one', 'Line two']);
  });

  it('keeps closing quotes with their sentence', () => {
    expect(splitSentences('She said "go." Then left.')).toEqual(['She said "go."', 'Then left.']);
  });

  it('does not split decimals and drops fragments with nothing to say', () => {
    expect(splitSentences('Version 2.5 is ready.')).toEqual(['Version 2.5 is ready.']);
    expect(splitSentences('Hello. ... !')).toEqual(['Hello.']);
  });
});

describe('joinWithGaps', () => {
  const a = new Float32Array(100).fill(0.5);
  const b = new Float32Array(50).fill(-0.5);

  it('puts exactly the configured silence between sentences', () => {
    const out = joinWithGaps([a, b], 1000, 400);
    expect(out.length).toBe(100 + 400 + 50);
    expect(out[99]).toBe(0.5);
    expect(Array.from(out.subarray(100, 500)).every((v) => v === 0)).toBe(true);
    expect(out[500]).toBe(-0.5);
  });

  it('adds no gap for a single sentence or a zero gap', () => {
    expect(joinWithGaps([a], 1000, 400).length).toBe(100);
    expect(joinWithGaps([a, b], 1000, 0).length).toBe(150);
  });
});

describe('trimSilence', () => {
  it('removes leading and trailing silence but keeps a short pad', () => {
    const s = new Float32Array(3000);
    s.fill(0.3, 1000, 2000);
    const out = trimSilence(s, 1000); // pad = 10 samples
    expect(out.length).toBe(1020);
    expect(out[10]).toBeCloseTo(0.3);
  });

  it('returns an empty result for pure silence', () => {
    expect(trimSilence(new Float32Array(500), 1000).length).toBeLessThanOrEqual(20);
  });
});

describe('normalisePeak', () => {
  it('scales the loudest sample to the target', () => {
    const out = normalisePeak(new Float32Array([0.1, -0.3, 0.2]), 0.9);
    expect(out[1]).toBeCloseTo(-0.9);
    expect(out[0]).toBeCloseTo(0.3);
  });

  it('leaves silence untouched', () => {
    const silent = new Float32Array(10);
    expect(normalisePeak(silent)).toBe(silent);
  });
});

describe('tightenPauses', () => {
  const sr = 1000;
  const tone = (n: number) => new Float32Array(n).map((_, i) => 0.5 * Math.sin(i * 0.9));
  // speech, a 400 ms pause, speech, a 40 ms gap (like a stop consonant), speech
  const build = () => {
    const x = new Float32Array(300 + 400 + 300 + 40 + 300);
    x.set(tone(300), 0); x.set(tone(300), 700); x.set(tone(300), 1040);
    return x;
  };

  it('does nothing at flow 0', () => {
    const x = build();
    expect(tightenPauses(x, sr, 0)).toBe(x);
  });

  it('shortens a long internal pause but keeps some of it', () => {
    const out = tightenPauses(build(), sr, 1);
    const removed = build().length - out.length;
    expect(removed).toBeGreaterThan(180);
    expect(removed).toBeLessThan(360);
  });

  it('removes more at higher flow', () => {
    expect(tightenPauses(build(), sr, 1).length).toBeLessThan(tightenPauses(build(), sr, 0.4).length);
  });

  it('leaves very short gaps and the speech itself untouched', () => {
    const x = build();
    const out = tightenPauses(x, sr, 1);
    // The tail (40 ms gap + last burst) is unchanged, just earlier.
    const tail = 340;
    expect(Array.from(out.subarray(out.length - tail))).toEqual(Array.from(x.subarray(x.length - tail)));
    expect(Array.from(out.subarray(0, 290))).toEqual(Array.from(x.subarray(0, 290)));
  });

  it('does not touch silence at the very start or end', () => {
    const x = new Float32Array(1000);
    x.set(tone(300), 350);
    expect(tightenPauses(x, sr, 1).length).toBe(1000);
  });
});

describe('sentence blip', () => {
  const a = new Float32Array(1000).fill(0.5), b = new Float32Array(1000).fill(-0.5);
  it('puts a quiet tone into the gap, BLIP_AFTER_SECONDS before the next words, and nowhere else', () => {
    const out = joinWithGaps([a, b], 10000, 600, 0.3);
    const gap = out.subarray(1000, 7000);
    const end = 6000 - Math.round(BLIP_AFTER_SECONDS * 10000);
    const mid = gap.subarray(end - 1000, end), edge = gap.subarray(0, end - 1200);
    expect(Math.max(...Array.from(gap.subarray(end), Math.abs))).toBe(0);
    const rms = (x: Float32Array) => Math.sqrt(x.reduce((e, v) => e + v * v, 0) / x.length);
    expect(rms(edge)).toBe(0);
    expect(rms(mid) / 0.5).toBeGreaterThan(0.2);
    expect(rms(mid) / 0.5).toBeLessThan(0.4);
    expect(out.length).toBe(joinWithGaps([a, b], 10000, 600).length);
  });

  it('is skipped when the gap is too short to hold it', () => {
    expect(Array.from(joinWithGaps([a, b], 10000, 100, 0.3))).toEqual(Array.from(joinWithGaps([a, b], 10000, 100)));
  });
});

describe('paragraph blip', () => {
  it('flags the first sentence of each later paragraph', () => {
    expect(splitParagraphs('One. Two.\n\nThree. Four.\nFive.')).toEqual({
      sentences: ['One.', 'Two.', 'Three.', 'Four.', 'Five.'],
      startsParagraph: [false, false, true, false, true],
    });
    expect(splitParagraphs('...\nOne.').startsParagraph).toEqual([false]);
  });
  it('puts the tone only in the flagged gaps', () => {
    const s = new Float32Array(1000).fill(0.5);
    const out = joinWithGaps([s, s, s], 10000, 600, 0.3, [false, false, true]);
    const peak = (from: number, to: number) => Math.max(...Array.from(out.subarray(from, to), Math.abs));
    expect(peak(1000, 7000)).toBe(0); // sentence gap: silent
    expect(peak(8000, 14000)).toBeGreaterThan(0.05); // paragraph gap: blip
  });
});

describe('respell', () => {
  it('gives the voice model a spelling of "upgrade" that it says as one word', async () => {
    const { respell } = await import('./text');
    expect(respell('Upgrade complete. The upgrades are ready.')).toBe('Ubgrade complete. The ubgrades are ready.');
    expect(respell('Update complete.')).toBe('Update complete.');
  });
});
