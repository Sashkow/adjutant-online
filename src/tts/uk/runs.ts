/** Telling Ukrainian from English inside one text, and getting Ukrainian ready for its voice model. */

const CYRILLIC = /[Ѐ-ӿ]/;
const LATIN = /[A-Za-z]/;

/** A sentence goes to the Ukrainian voice if it has any Cyrillic letter; otherwise it is read as before. */
export function isUkrainian(sentence: string): boolean {
  return CYRILLIC.test(sentence);
}

export interface Run { lang: 'uk' | 'en'; text: string }

/**
 * A Ukrainian sentence cut into stretches for each voice: words in Latin
 * letters ("git", "say.js", "pull request") go to the English voice, the rest
 * to the Ukrainian one. Numbers and punctuation stay with the Ukrainian text,
 * except between two English words.
 */
export function languageRuns(sentence: string): Run[] {
  const runs: Run[] = [];
  let pendingNeutral = '';
  for (const token of sentence.split(/(\s+)/)) {
    if (!token) continue;
    const lang = CYRILLIC.test(token) ? 'uk' : LATIN.test(token) ? 'en' : null;
    const last = runs[runs.length - 1];
    if (lang === null) { pendingNeutral += token; continue; }
    if (last && last.lang === lang) {
      last.text += pendingNeutral + token;
    } else {
      // Spaces, numbers and punctuation between two voices belong to the Ukrainian side.
      if (lang === 'uk') runs.push({ lang, text: pendingNeutral + token });
      else {
        if (last) last.text += pendingNeutral; else if (pendingNeutral.trim()) runs.push({ lang: 'uk', text: pendingNeutral });
        runs.push({ lang, text: token });
      }
    }
    pendingNeutral = '';
  }
  const last = runs[runs.length - 1];
  if (pendingNeutral.trim()) {
    if (last?.lang === 'uk') last.text += pendingNeutral; else runs.push({ lang: 'uk', text: pendingNeutral });
  }
  // An English word keeps the comma or full stop that follows it out of its own text: the pause comes from the join.
  return runs
    .map((r) => ({ lang: r.lang, text: r.text.trim() }))
    .filter((r) => (r.lang === 'en' ? LATIN.test(r.text) : /[\p{L}\p{N}]/u.test(r.text)));
}

const SYMBOL_WORDS: Array<[RegExp, string]> = [
  [/%/g, ' відсотків '], [/\+/g, ' плюс '], [/=/g, ' дорівнює '], [/&/g, ' і '], [/№/g, ' номер '],
  [/[/\\_|*#~^<>()[\]{}"«»„“”]/g, ' '], [/…/g, '.'], [/–/g, '—'],
];
/** Letters of neighbouring alphabets, so a stray Russian word is still read and not skipped. */
const NEIGHBOURS: Record<string, string> = { ы: 'и', э: 'е', ё: 'йо', ъ: "'" };

/** Ukrainian text as the letters the model was trained on: lower case, no stray symbols. Numbers must be spelled out before this. */
export function modelLetters(text: string): string {
  let out = text.toLowerCase().replace(/[’ʼ`]/g, "'");
  for (const [pattern, word] of SYMBOL_WORDS) out = out.replace(pattern, word);
  out = out.replace(/[ыэёъ]/g, (c) => NEIGHBOURS[c]);
  return out.replace(/\s+/g, ' ').trim().normalize('NFD');
}
