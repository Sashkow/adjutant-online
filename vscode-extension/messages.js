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

// ---- Who a notification is from -------------------------------------------

const os = require('node:os');
const path = require('node:path');

/** Terminal names that say nothing about what runs there. */
const GENERIC_TERMINAL = /^(bash|zsh|sh|fish|dash|ksh|tcsh|pwsh|powershell|cmd|node|python\d*|terminal|javascript debug terminal|claude|claude code)$/i;

/** A terminal's name if the person (or a tool) gave it one worth saying; '' for "bash" and the like. */
function meaningfulTerminal(name) {
  const n = String(name || '').trim();
  return n && !GENERIC_TERMINAL.test(n) && !/^task - /i.test(n) ? n : '';
}

/** The folder's own name if it identifies a project; '' for the home folder, the root and temporary folders. */
function projectFromFolder(dir, home = os.homedir(), tmp = os.tmpdir()) {
  if (!dir) return '';
  const d = path.resolve(dir);
  if (d === path.parse(d).root || d === home || d === tmp || d === path.dirname(home)) return '';
  return path.basename(d);
}

/**
 * The quickest name that tells sessions apart, as the voice should say it: the VS Code project,
 * else the folder the session runs in, else the terminal's name if it has a real one, else the
 * session's topic. '' if none of these is known: the notification then says "another project".
 */
function sourceName({ project, folder, terminal, topic } = {}) {
  return speakable(project || '') || speakable(projectFromFolder(folder)) || speakable(meaningfulTerminal(terminal)) || speakable(topic || '', 5);
}

/**
 * The notification with its opening words: "Priority alert from <source>!" for a failure or a
 * question, "Message from <source>." for the rest. Ukrainian text gets Ukrainian opening words.
 * Alert words the message already opens with are not said twice.
 */
function announce(text, { alert = false, source = '' } = {}) {
  let body = String(text || '').trim();
  const ukrainian = /[\u0400-\u04FF]/.test(body);
  if (alert) {
    const rest = body.replace(/^(priority alert|увага)\s*[!.,:]?\s*/i, '');
    if (rest && rest !== body) body = rest[0].toUpperCase() + rest.slice(1);
  }
  if (ukrainian) {
    if (alert) return `Увага! ${source ? `Проєкт ${source}` : 'Інший проєкт'}. ${body}`;
    return `${source ? `Повідомлення від проєкту ${source}` : 'Повідомлення з іншого проєкту'}. ${body}`;
  }
  const from = source || 'another project';
  return alert ? `Priority alert from ${from}! ${body}` : `Message from ${from}. ${body}`;
}

module.exports = { duration, taskMessage, commandMessage, claudeMessage, program, failed, asksQuestion, meaningfulTerminal, projectFromFolder, sourceName, announce };
