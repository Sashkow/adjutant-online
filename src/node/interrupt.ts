/**
 * What a reading does after a notification has cut into it. No model is present at that moment,
 * so the choice is a fixed rule over where the cut fell, and the words come from short lists.
 */

/** Where to pick the paragraph up again; `from` is in seconds from the start of its audio. */
export type Plan =
  | { kind: 'restart' }                  // play the paragraph again from its start, with no remark
  | { kind: 'repeat'; from: number }     // a return phrase, then the cut sentence again
  | { kind: 'continue'; from: number }   // a continuing phrase, then the next sentence
  | { kind: 'done' };                    // so near the end that nothing is repeated

/** A cut this close to the end of a sentence (or of the paragraph) counts as after it. */
export const NEARLY_OVER_SECONDS = 1;
/** A cut this early in the paragraph starts it again. */
export const JUST_BEGUN_SECONDS = 1.5;

/**
 * `starts` are the moments each sentence begins, `total` the length of the audio, `cut` the moment
 * the player was stopped; all in seconds.
 */
export function resumePlan(starts: number[], total: number, cut: number): Plan {
  if (total - cut <= NEARLY_OVER_SECONDS) return { kind: 'done' };
  let i = 0;
  while (i + 1 < starts.length && starts[i + 1] <= cut) i++;
  if (i === 0 || cut < JUST_BEGUN_SECONDS) return { kind: 'restart' };
  const end = i + 1 < starts.length ? starts[i + 1] : total;
  if (end - cut > NEARLY_OVER_SECONDS) return { kind: 'repeat', from: starts[i] };
  return i + 1 < starts.length ? { kind: 'continue', from: starts[i + 1] } : { kind: 'done' };
}

/** "Where WAS I?" as phonemes; see the note in PHRASES. The speaker also shapes its loudness (speak.ts). */
export const WHERE_WAS_I = '[[wˌɛɹ wˈʌːz aɪ]]?';

const PHRASES = {
  // "Where WAS I?", written as phonemes ([[…]]), because the model's dictionary says "was" in passing and
  // stresses "I". Matched to the owner's own recording of the phrase (2026-11-19): "was" stressed, long
  // and highest in pitch; "I" unstressed and falling.
  en: {
    repeat: { topic: [`${WHERE_WAS_I} Oh yes: %.`, 'As I was saying about %.', 'Back to %.'], plain: [WHERE_WAS_I, 'As I was saying.'] },
    continue: { topic: ['Continuing with %.', 'To continue with %.'], plain: ['To continue.', 'Continuing.'] },
  },
  // The topic follows a colon, so it can stay in the form it was written in.
  uk: {
    repeat: { topic: ['На чому я зупинилась? А, так: %.', 'Повертаюсь до теми: %.'], plain: ['На чому я зупинилась?', 'Повертаюсь.'] },
    continue: { topic: ['Продовжую: %.', 'Далі на тему: %.'], plain: ['Продовжую.', 'Далі.'] },
  },
};

/** The words that lead back into the reading. `turn` counts interruptions, so the wording varies. */
export function returnPhrase(kind: 'repeat' | 'continue', topic: string | undefined, ukrainian: boolean, turn: number): string {
  const subject = (topic ?? '').trim().replace(/[.!?:;,]+$/, '');
  const list = PHRASES[ukrainian ? 'uk' : 'en'][kind][subject ? 'topic' : 'plain'];
  return list[((turn % list.length) + list.length) % list.length].replace('%', subject);
}

/** The words put before a notification that interrupts a reading with a failure or a question. */
export function withAlert(text: string, ukrainian: boolean): string {
  if (/^\s*(priority alert|увага)/i.test(text)) return text;   // already opens with the words
  // Stress marks on the first and the last syllable: the word is called out, "У-ва-ГА!", not said in passing.
  return `${ukrainian ? 'У\u0301вага\u0301!' : 'Priority alert!'} ${text}`;
}
