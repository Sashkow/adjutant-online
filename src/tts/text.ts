/** Pure text and sample helpers for delivery shaping. Unit-tested in Node. */

export const MAX_CHARS = 1000;

export type TextCheck =
  | { ok: true; text: string }
  | { ok: false; reason: 'empty' | 'too-long' };

export function checkText(raw: string): TextCheck {
  const text = raw.trim();
  if (!text) return { ok: false, reason: 'empty' };
  if (raw.length > MAX_CHARS) return { ok: false, reason: 'too-long' };
  return { ok: true, text };
}

/** Split into sentences at . ! ? … followed by whitespace, and at line breaks. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…]["')\]]?)\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => /[\p{L}\p{N}]/u.test(s));
}

/**
 * Strip near-silence from both ends, leaving a short pad. Engines add their own
 * variable padding; removing it makes the configured sentence gap the real gap.
 */
/**
 * Sentences in speaking order, with a flag on each one that opens a new
 * paragraph (a line break in the text). The first sentence is never flagged.
 */
export function splitParagraphs(text: string): { sentences: string[]; startsParagraph: boolean[] } {
  const sentences: string[] = [];
  const startsParagraph: boolean[] = [];
  for (const paragraph of text.split(/\n+/)) {
    splitSentences(paragraph).forEach((s, i) => {
      startsParagraph.push(i === 0 && sentences.length > 0);
      sentences.push(s);
    });
  }
  return { sentences, startsParagraph };
}

/**
 * Spellings for the voice model only. The model leaves a long silence inside
 * some words; a spelling that sounds the same to a listener avoids it.
 * "upgrade": the p-g pair came out as "up", 185 ms of silence, "grade".
 */
const RESPELLINGS: Array<[RegExp, string]> = [[/\bupgrad/gi, 'ubgrad']];

/** The text as the voice model should be given it. Keeps a leading capital. */
export function respell(text: string): string {
  let out = text;
  for (const [pattern, spoken] of RESPELLINGS) {
    out = out.replace(pattern, (found) => (found[0] === found[0].toUpperCase() ? spoken[0].toUpperCase() + spoken.slice(1) : spoken));
  }
  return out;
}

export function trimSilence(samples: Float32Array, sampleRate: number, threshold = 0.004): Float32Array {
  let start = 0;
  let end = samples.length;
  while (start < end && Math.abs(samples[start]) < threshold) start++;
  while (end > start && Math.abs(samples[end - 1]) < threshold) end--;
  const pad = Math.round(sampleRate * 0.01);
  return samples.subarray(Math.max(0, start - pad), Math.min(samples.length, end + pad));
}

/**
 * Shorten the silences inside a sentence. Slowing this voice down stretches its
 * pauses along with its words, so a slow, deliberate pace arrives chopped into
 * fragments; the reference speaks slowly but in long unbroken phrases.
 *
 * `flow` 0 leaves the audio alone; 1 tightens the most. Word gaps shrink towards
 * a short breath and clause pauses are capped, with a small crossfade at each cut.
 */
export function tightenPauses(samples: Float32Array, sampleRate: number, flow: number): Float32Array {
  if (flow <= 0 || samples.length === 0) return samples;
  const f = Math.min(1, flow);
  const frame = Math.max(1, Math.round(sampleRate * 0.005));
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  if (peak === 0) return samples;
  // About 29 dB under the peak: catches the soft, breathy pause this voice leaves at a comma.
  const quietBelow = 0.035 * peak;
  const frames = Math.floor(samples.length / frame);
  const quiet = new Uint8Array(frames);
  for (let k = 0; k < frames; k++) {
    let m = 0;
    for (let i = k * frame; i < (k + 1) * frame; i++) m = Math.max(m, Math.abs(samples[i]));
    quiet[k] = m < quietBelow ? 1 : 0;
  }

  const keep = 0.045 * sampleRate; // every pause keeps at least this much
  const cap = (0.26 + 0.5 * (1 - f)) * sampleRate; // longest pause allowed
  const shrink = 1 - 0.7 * f; // how much of the rest survives
  const fade = Math.round(0.004 * sampleRate);

  const pieces: Float32Array[] = [];
  let from = 0;
  let k = 0;
  while (k < frames) {
    if (!quiet[k]) { k++; continue; }
    let end = k;
    while (end < frames && quiet[end]) end++;
    const start = k * frame;
    const length = (end - k) * frame;
    // Leave the edges of the sentence and very short gaps (stop consonants) alone.
    if (k > 0 && end < frames && length > 0.11 * sampleRate) {
      const target = Math.round(Math.min(cap, keep + (length - keep) * shrink));
      const cut = length - target;
      if (cut > 2 * fade) {
        const cutFrom = start + Math.round(target / 2);
        const head = samples.slice(from, cutFrom);
        for (let i = 0; i < fade && i < head.length; i++) head[head.length - 1 - i] *= i / fade;
        pieces.push(head);
        from = cutFrom + cut;
        // Fade the resumed audio in; it is near-silent here, so this only removes clicks.
        const resume = samples.slice(from, Math.min(samples.length, from + fade));
        for (let i = 0; i < resume.length; i++) resume[i] *= i / fade;
        pieces.push(resume);
        from += resume.length;
      }
    }
    k = end;
  }
  if (pieces.length === 0) return samples;
  pieces.push(samples.subarray(from));
  const out = new Float32Array(pieces.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of pieces) { out.set(p, at); at += p.length; }
  return out;
}

/** Where each sentence sits in the audio that joinWithGaps returns: [start, end) in samples. */
export function sentenceBounds(chunks: Float32Array[], sampleRate: number, gapMs: number): Array<[number, number]> {
  const gap = Math.max(0, Math.round((gapMs / 1000) * sampleRate));
  const out: Array<[number, number]> = [];
  let at = 0;
  for (const c of chunks) {
    out.push([at, at + c.length]);
    at += c.length + gap;
  }
  return out;
}

const BLIP_HZ = 3044;
const BLIP_SECONDS = 0.11;
/** Silence between the blip and the next words: the game's paragraph beeps leave 0.19-0.35 s, 0.28 s typically. Set
 *  above that because the effect's echo carries the blip on and words fade in: 0.36 s here measures 0.28 s after the
 *  effect, the same way the game was measured (2026-11-17). */
export const BLIP_AFTER_SECONDS = 0.36;

/**
 * Concatenate sentence audio with `gapMs` of silence between sentences.
 * `blipLevel` above 0 puts a short, quiet tone into a gap, ending BLIP_AFTER_SECONDS before the next words (in the
 * middle of a gap too short for that) (level
 * is relative to the loudness of the speech): in every gap, or, when
 * `blipBefore` is given, only in the gap before the chunks it flags, which is
 * how the page marks paragraph ends. The tone is generated, not recorded.
 */
export function joinWithGaps(chunks: Float32Array[], sampleRate: number, gapMs: number, blipLevel = 0, blipBefore?: boolean[]): Float32Array {
  const gap = Math.max(0, Math.round((gapMs / 1000) * sampleRate));
  const total = chunks.reduce((n, c) => n + c.length, 0) + gap * Math.max(0, chunks.length - 1);
  const out = new Float32Array(total);
  const blip = Math.round(BLIP_SECONDS * sampleRate);
  let level = 0;
  if (blipLevel > 0 && gap >= 2.5 * blip) {
    let e = 0, n = 0;
    for (const c of chunks) for (const v of c) if (Math.abs(v) > 0.01) { e += v * v; n++; }
    level = n ? blipLevel * Math.sqrt(e / n) * Math.SQRT2 : 0;
  }
  let at = 0;
  chunks.forEach((c, i) => {
    if (i > 0) {
      if (level > 0 && (blipBefore?.[i] ?? true)) {
        const after = Math.round(BLIP_AFTER_SECONDS * sampleRate);
        const start = at + (gap >= blip + after ? gap - blip - after : Math.round((gap - blip) / 2));
        const edge = 0.004 * sampleRate;
        for (let j = 0; j < blip; j++) {
          const fade = Math.min(1, j / edge, (blip - j) / edge);
          out[start + j] = level * fade * Math.sin((2 * Math.PI * BLIP_HZ * j) / sampleRate);
        }
      }
      at += gap;
    }
    out.set(c, at);
    at += c.length;
  });
  return out;
}

/** Scale so the loudest sample sits at `target`. Engines differ in level; the effect chain expects a consistent one. */
export function normalisePeak(samples: Float32Array, target = 0.9): Float32Array {
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  if (peak < 1e-4) return samples;
  const k = target / peak;
  return samples.map((v) => v * k);
}
