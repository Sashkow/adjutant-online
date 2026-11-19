import { splitParagraphs } from '../tts/text';

/** Longest piece handed to the synthesiser at once: short enough to start speaking soon. */
export const CHUNK_CHARS = 320;

/**
 * Selected page text has line breaks where a reader would pause (headings,
 * list items) but often no full stop there. Give those lines one, and drop
 * the things that are noise when spoken.
 */
export function cleanSelection(raw: string): string {
  return raw
    .replace(/https?:\/\/\S+/g, ' link ')
    .replace(/\[\d+\]/g, '') // footnote markers
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => /[\p{L}\p{N}]/u.test(line))
    .map((line) => (/[.!?…:;,]["')\]]?$/.test(line) ? line : `${line}.`))
    .join('\n');
}

/** Break one over-long sentence at clause marks, or failing that at spaces. */
function splitLong(sentence: string, max: number): string[] {
  const out: string[] = [];
  let rest = sentence;
  while (rest.length > max) {
    const head = rest.slice(0, max);
    let cut = Math.max(head.lastIndexOf(', '), head.lastIndexOf('; '), head.lastIndexOf(': ')) + 1;
    if (cut < max / 3) cut = head.lastIndexOf(' ');
    if (cut < max / 3) cut = max;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

export interface Chunk {
  /** Sentences to synthesise together; a line break inside marks a paragraph break. */
  text: string;
  /** True when this piece opens a new paragraph, so the pause before it gets the blip. */
  startsParagraph: boolean;
}

/**
 * Text of any length as a list of pieces to synthesise one after another.
 * The first piece is a single sentence so speech starts quickly, the second
 * is kept short so it is ready before the first has finished playing, and
 * later pieces gather whole sentences up to `max` characters.
 */
export function chunkText(raw: string, max = CHUNK_CHARS): Chunk[] {
  const { sentences, startsParagraph } = splitParagraphs(cleanSelection(raw));
  const chunks: Chunk[] = [];
  let current: Chunk | null = null;
  sentences.forEach((sentence, n) => {
    splitLong(sentence, max).forEach((s, part) => {
      const para = part === 0 && startsParagraph[n];
      const limit = chunks.length === 1 ? max / 3 : max;
      if (current && (chunks.length === 0 || current.text.length + 1 + s.length > limit)) {
        chunks.push(current);
        current = null;
      }
      if (current) current.text += (para ? '\n' : ' ') + s;
      else current = { text: s, startsParagraph: para };
    });
  });
  if (current) chunks.push(current);
  return chunks;
}
