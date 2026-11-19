'use strict';
/** Wording of the spoken notifications. No VS Code dependency, so it can be unit-tested. */

function duration(seconds) {
  const plural = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  if (seconds < 60) return plural(Math.max(1, Math.round(seconds)), 'second');
  if (seconds < 3600) return plural(Math.round(seconds / 60), 'minute');
  return plural(Math.round(seconds / 360) / 10, 'hour');
}

/** Names as a voice should say them: no punctuation soup. */
function speakable(name, maxWords = 4) {
  return name.replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').slice(0, maxWords).join(' ');
}

function outcome(exitCode, seconds, minSecondsToMention = 10) {
  if (exitCode !== undefined && exitCode !== 0) return `failed with exit code ${exitCode}`;
  const took = seconds >= minSecondsToMention ? ` after ${duration(seconds)}` : '';
  return `${exitCode === 0 ? 'complete' : 'finished'}${took}`;
}

function taskMessage(name, exitCode, seconds) {
  return `Task ${speakable(name) || 'unnamed'} ${outcome(exitCode, seconds)}.`;
}

/** First word of a command line, without its directory: "./node_modules/.bin/vite build" -> "vite". */
function program(commandLine) {
  const words = commandLine.trim().split(/\s+/).filter((w) => !/^\w+=/.test(w)); // skip VAR=value prefixes
  return (words[0] || '').split('/').pop() || '';
}

function commandMessage(commandLine, exitCode, seconds) {
  const words = commandLine.trim().split(/\s+/).filter((w) => !/^\w+=/.test(w));
  // Say the program and up to two plain arguments: "npm run build", not its flags and paths.
  const said = [program(commandLine), ...words.slice(1).filter((w) => /^[\p{L}][\p{L}\p{N}:_-]*$/u.test(w)).slice(0, 2)];
  return `Command ${speakable(said.join(' ')) || 'unnamed'} ${outcome(exitCode, seconds)}.`;
}

const MAX_SUMMARY = 180;

/** One sentence from the end-of-turn message: its opening sentence, with the markup removed. */
function claudeMessage(text) {
  const plain = String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^\s*#+\s.*$/gm, '') // headings are labels, not results
    .replace(/^\s*([-*>]|\d+\.)\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~|]/g, '')
    .split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).find((p) => /\p{L}/u.test(p)) || '';
  if (!plain) return 'Claude has finished.';
  // A sentence ends at . ! ? followed by a space and a capital, or at a colon that ends the paragraph.
  let sentence = (plain.match(/^.*?[.!?](?=\s+[\p{Lu}"'(]|$)/u) || [plain])[0].replace(/:$/, '.');
  if (sentence.length > MAX_SUMMARY) sentence = `${sentence.slice(0, MAX_SUMMARY).replace(/\s+\S*$/, '').replace(/[,;:]$/, '')}.`;
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

/** True if a task or command ended badly: the notification is an alert. */
function failed(exitCode) {
  return exitCode !== undefined && exitCode !== 0;
}

/** True if the end-of-turn message leaves a question for the person: its last line of text ends with a question mark. */
function asksQuestion(text) {
  const lines = String(text || '').replace(/```[\s\S]*?```/g, ' ').split('\n').map((l) => l.replace(/[*_`~|]/g, '').trim()).filter((l) => /\p{L}/u.test(l));
  return /\?["'»”)]*$/.test(lines[lines.length - 1] || '');
}

module.exports = { duration, taskMessage, commandMessage, claudeMessage, program, failed, asksQuestion };
