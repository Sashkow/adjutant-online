/**
 * Where the stress falls in Ukrainian words. The Ukrainian voice model reads
 * letters directly and guesses the stress unless it is marked with an acute
 * accent; its guesses are often wrong, and a wrong stress is very audible.
 *
 * The data file (uk-stress.bin.gz, built by scripts/build-uk-stress.py from the
 * MIT-licensed "ukrainian-word-stress" dictionary of the lang-uk community)
 * holds 2.8 million word forms in sorted blocks; a word is found by a binary
 * search over the blocks and a scan of one block. Words whose stress depends on
 * their meaning ("замок") get the first variant in the dictionary.
 */

const ALPHABET = "абвгґдеєжзиіїйклмнопрстуфхцчшщьюя'-";
const CODE = new Map([...ALPHABET].map((c, i) => [c, i + 1]));
const VOWELS = new Set('аеєиіїоуюя');
export const STRESS_MARK = '́';

export interface StressDictionary {
  /** Which vowel of the word is stressed (0 = the first), or -1 if the word is not known. */
  stressedVowel(word: string): number;
}

/** The bytes of uk-stress.bin.gz, unpacked if they are still compressed. */
export async function unpackStress(bytes: ArrayBuffer): Promise<ArrayBuffer> {
  const head = new Uint8Array(bytes, 0, 2);
  if (head[0] !== 0x1f || head[1] !== 0x8b) return bytes; // the server already unpacked it
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}

export function openStress(raw: ArrayBuffer): StressDictionary {
  const bytes = new Uint8Array(raw);
  const view = new DataView(raw);
  if (String.fromCharCode(...bytes.subarray(0, 4)) !== 'UKS1') throw new Error('The Ukrainian stress data is damaged');
  const blocks = view.getUint32(4, true);
  const data = 8 + blocks * 4;
  const blockStart = (i: number) => data + view.getUint32(8 + i * 4, true);
  const blockEnd = (i: number) => (i + 1 < blocks ? blockStart(i + 1) : bytes.length);

  /** Compare `key` with the first word of block `i` (stored whole). */
  function compareFirst(key: number[], i: number): number {
    let at = blockStart(i) + 1;
    for (let k = 0; ; k++, at++) {
      const b = bytes[at];
      if (b >= 0x80) return k < key.length ? 1 : 0;
      if (k >= key.length) return -1;
      if (key[k] !== b) return key[k] - b;
    }
  }

  return {
    stressedVowel(word) {
      const key: number[] = [];
      for (const ch of word) {
        const code = CODE.get(ch);
        if (!code) return -1;
        key.push(code);
      }
      let lo = 0;
      let hi = blocks - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (compareFirst(key, mid) >= 0) lo = mid; else hi = mid - 1;
      }
      const current: number[] = [];
      for (let at = blockStart(lo), end = blockEnd(lo); at < end; ) {
        current.length = bytes[at++];
        while (bytes[at] < 0x80) current.push(bytes[at++]);
        const stress = bytes[at++] - 0x80;
        if (current.length === key.length && current.every((b, k) => b === key[k])) return stress;
      }
      return -1;
    },
  };
}

/**
 * Words the dictionary gets wrong or does not have: mostly words with more than one possible
 * stress where its first variant is the rarer reading. The value is the stressed vowel (0 = the first). Add a word here when the listener
 * reports it: "зв'язок" was spoken as the plural of "зв'язка" where "connection" was meant.
 */
const PREFERRED: Record<string, number> = {
  // Her own name in Ukrainian ("AI-ка"), which no dictionary has.
  ейайка: 1, ейайки: 1, ейайці: 1, ейайку: 1, ейайкою: 1, ейайко: 1,
  // The pronoun "вони́", not "во́ни" (plural of "воня", smells), the dictionary's first reading.
  вони: 1,
  "зв'язок": 1, "зв'язку": 1, "зв'язки": 1, "зв'язком": 1, "зв'язків": 1, "зв'язкам": 1, "зв'язками": 1, "зв'язках": 1,
};

/**
 * Western (Galician) stress, which the listener speaks and the standard dictionary does not have:
 * "буде́ш" where the dictionary says "бу́деш". An entry is a stem and the endings it takes, each
 * with the stressed vowel of the whole word form (0 = the first). Only forms the listener has
 * confirmed are listed; the others ("бу́ду", "бу́де", "бу́дуть") keep the dictionary's stress.
 */
export const WESTERN_STRESS = true;
const WESTERN_ENTRIES: { stem: string; forms: Record<string, number> }[] = [
  // бути: буде́ш, буде́мо, буде́те
  { stem: 'буд', forms: { 'еш': 1, 'емо': 1, 'ете': 1 } },
];
const WESTERN: Record<string, number> = Object.fromEntries(
  WESTERN_ENTRIES.flatMap(({ stem, forms }) => Object.entries(forms).map(([ending, n]) => [stem + ending, n])),
);

/** One word with the stress mark after its stressed vowel; unchanged if unknown, already marked or of one vowel. */
function markWord(word: string, dict: StressDictionary): string {
  if (word.includes(STRESS_MARK)) return word;
  const lower = word.toLowerCase();
  const vowelAt: number[] = [];
  [...lower].forEach((c, i) => { if (VOWELS.has(c)) vowelAt.push(i); });
  if (vowelAt.length < 2) return word;
  const n = (WESTERN_STRESS ? WESTERN[lower] : undefined) ?? PREFERRED[lower] ?? dict.stressedVowel(lower);
  if (n < 0 && lower.includes('-')) return word.split('-').map((part) => markWord(part, dict)).join('-');
  if (n < 0 || n >= vowelAt.length) return word;
  const letters = [...word];
  letters.splice(vowelAt[n] + 1, 0, STRESS_MARK);
  return letters.join('');
}

/** Ukrainian text with a stress mark in every word the dictionary knows. */
export function markStress(text: string, dict: StressDictionary): string {
  return text
    .normalize('NFC')
    .replace(/[’ʼ`]/g, "'")
    .replace(/[а-яґєіїА-ЯҐЄІЇ́]+(?:['-][а-яґєіїА-ЯҐЄІЇ́]+)*/g, (word) => markWord(word, dict));
}
