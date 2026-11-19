import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { splitSentences } from '../tts/text';
import { isUkrainian } from '../tts/uk/runs';
import { resumePlan, returnPhrase, withAlert } from './interrupt';
import { CACHE_DIR, marksOf, playFile, readingInProgress, renderToFile, settingsFromLink, type Return } from './speak';

/**
 * Speak text in the voice from the command line:
 *   node dist-cli/say.js [--link <page address with settings>] [--out file.wav] [--no-play] [--blip | --double-beep]
 *                        [--priority] [--alert] [--topic <subject>] <text...>
 * --blip opens with the short between-paragraphs blip in place of the intro tone, for a piece that
 * continues an earlier one. --double-beep opens with a two-tone "com-link" beep, for the start of a reading.
 * --priority (a notification) takes the speaker from a reading in progress; the reading comes back afterwards.
 * --alert, with --priority, opens with "Priority alert!" ("Увага!" for Ukrainian) if a reading was interrupted.
 * --topic names what the text is about, for the words that lead back into it after an interruption.
 */
const args = process.argv.slice(2);
const take = (flag: string): string | undefined => {
  const i = args.indexOf(flag);
  return i < 0 ? undefined : args.splice(i, 2)[1];
};
const link = take('--link');
const out = take('--out');
const topic = take('--topic');
const FLAGS = ['--no-play', '--blip', '--double-beep', '--priority', '--alert'];
const noPlay = args.includes('--no-play');
const priority = args.includes('--priority');
const lead = args.includes('--blip') ? 'blip' : args.includes('--double-beep') ? 'double-beep' : 'intro';
let text = args.filter((a) => !FLAGS.includes(a)).join(' ');
if (priority && args.includes('--alert') && readingInProgress()) text = withAlert(text, isUkrainian(text));

/** Counts interruptions across readings, so the return phrases take turns. */
function nextTurn(): number {
  const file = join(CACHE_DIR, 'return-turn');
  let n = 0;
  try { n = Number(readFileSync(file, 'utf8')) || 0; } catch { /* first time */ }
  try { writeFileSync(file, String(n + 1)); } catch { /* the count is only for variety */ }
  return n;
}

try {
  let shown = -1;
  const settings = settingsFromLink(link);
  const file = await renderToFile(text, settings, (loaded, total) => {
    const pct = Math.floor((100 * loaded) / total / 10) * 10;
    if (pct !== shown) process.stderr.write(`Downloading the voice model… ${shown = pct}%\n`);
  }, lead);
  if (out) copyFileSync(file, out);
  if (!noPlay) {
    // Prepared while the notification speaks, so the reading can come back as soon as it ends.
    const onInterrupt = async (cut: number): Promise<Return> => {
      const marks = marksOf(file);
      const plan = marks ? resumePlan(marks.starts, marks.seconds, cut) : { kind: 'restart' as const };
      const note = (what: string) => process.stderr.write(`interrupted ${cut.toFixed(1)} s in: ${what}\n`);
      if (plan.kind === 'done') { note('nearly over, nothing repeated'); return null; }
      if (plan.kind === 'restart') { note('starting the paragraph again'); return { from: 0 }; }
      const words = returnPhrase(plan.kind, topic, isUkrainian(splitSentences(text)[0] ?? text), nextTurn());
      note(`"${words}" then from ${plan.from.toFixed(1)} s`);
      return { from: plan.from, phrase: await renderToFile(words, settings, () => {}, 'blip') };
    };
    await playFile(file, { priority, onInterrupt });
  }
  process.exit(0);
} catch (e) {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
}
