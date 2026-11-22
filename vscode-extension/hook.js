'use strict';
/**
 * The Claude Code side: a Stop hook that drops each end-of-turn event as a
 * small file into a spool directory, which the extension watches. The hook
 * itself runs nothing but a few shell built-ins, so it costs Claude no time.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const MARKER = 'adjutant-voice/events';
const EVENTS_DIR = path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'adjutant-voice', 'events');
const SETTINGS = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'settings.json');
const COMMAND =
  'd="${XDG_CACHE_HOME:-$HOME/.cache}/' + MARKER + '"; mkdir -p "$d"; ' +
  'find "$d" -type f -mmin +5 -delete 2>/dev/null; ' +
  'f="$d/$(date +%s%N)-$$"; cat > "$f.tmp" && mv "$f.tmp" "$f.json"';

function read() {
  if (!fs.existsSync(SETTINGS)) return {};
  return JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
}

const ours = (group) => (group.hooks || []).some((h) => typeof h.command === 'string' && h.command.includes(MARKER));

function installed() {
  try { return ((read().hooks || {}).Stop || []).some(ours); } catch { return false; }
}

function write(settings) {
  fs.mkdirSync(path.dirname(SETTINGS), { recursive: true });
  if (fs.existsSync(SETTINGS)) fs.copyFileSync(SETTINGS, `${SETTINGS}.before-adjutant-voice`);
  fs.writeFileSync(SETTINGS, `${JSON.stringify(settings, null, 2)}\n`);
}

/** Returns false if it was already there. Throws if the settings file cannot be parsed, leaving it untouched. */
function install() {
  const settings = read();
  settings.hooks = settings.hooks || {};
  const stop = (settings.hooks.Stop = settings.hooks.Stop || []);
  if (stop.some(ours)) return false;
  stop.push({ hooks: [{ type: 'command', command: COMMAND }] });
  write(settings);
  return true;
}

function remove() {
  const settings = read();
  const stop = (settings.hooks || {}).Stop;
  if (!stop || !stop.some(ours)) return false;
  settings.hooks.Stop = stop.filter((g) => !ours(g));
  if (settings.hooks.Stop.length === 0) delete settings.hooks.Stop;
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  write(settings);
  return true;
}

/** The text of the last assistant message in a Claude Code transcript, for hook events that do not carry it. */
function lastAssistantText(transcriptPath) {
  try {
    const lines = fs.readFileSync(transcriptPath, 'utf8').trimEnd().split('\n');
    for (let i = lines.length - 1; i >= 0 && i > lines.length - 200; i--) {
      const entry = JSON.parse(lines[i]);
      if (entry.type !== 'assistant' || !entry.message) continue;
      const content = entry.message.content;
      const text = typeof content === 'string' ? content : (content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
      if (text.trim()) return text;
    }
  } catch { /* unreadable transcript: fall through */ }
  return '';
}

/**
 * How long the turn that just ended took, in seconds: the time since the
 * person's last prompt in the transcript. Undefined if that cannot be found.
 */
function turnSeconds(transcriptPath, now = Date.now()) {
  try {
    const lines = fs.readFileSync(transcriptPath, 'utf8').trimEnd().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      if (!lines[i].includes('"type":"user"')) continue;
      const entry = JSON.parse(lines[i]);
      if (entry.type !== 'user' || entry.isMeta || entry.isSidechain || !entry.message || !entry.timestamp) continue;
      const content = entry.message.content;
      // Tool results are stored as "user" entries too; a prompt has text.
      const prompt = typeof content === 'string' || (Array.isArray(content) && content.some((b) => b.type === 'text'));
      if (prompt) return Math.max(0, (now - Date.parse(entry.timestamp)) / 1000);
    }
  } catch { /* unreadable transcript */ }
  return undefined;
}

/**
 * What a Claude Code session is about, from its transcript: the title the person gave it, else the
 * one Claude Code made up. Only the end of the file is read, so this stays fast for a long session.
 */
function sessionTopic(transcriptPath, tailBytes = 2_000_000) {
  try {
    const size = fs.statSync(transcriptPath).size;
    const start = Math.max(0, size - tailBytes);
    const buffer = Buffer.alloc(size - start);
    const fd = fs.openSync(transcriptPath, 'r');
    try { fs.readSync(fd, buffer, 0, buffer.length, start); } finally { fs.closeSync(fd); }
    const lines = buffer.toString('utf8').split('\n');
    let made = '';
    for (let i = lines.length - 1; i >= 0; i--) {
      if (!lines[i].includes('-title"')) continue;
      let entry;
      try { entry = JSON.parse(lines[i]); } catch { continue; } // the cut-off first line
      if (entry.type === 'custom-title' && (entry.customTitle || entry.title)) return String(entry.customTitle || entry.title);
      if (entry.type === 'ai-title' && entry.aiTitle && !made) made = String(entry.aiTitle);
    }
    return made;
  } catch { return ''; }
}

/** A reading leaves a marker for its folder here, so the turn that started it is not announced over it. */
const QUIET_DIR = path.join(path.dirname(EVENTS_DIR), 'quiet');
const QUIET_MAX_AGE_MS = 30_000;

/**
 * True if a reading was started from `cwd` a moment ago, so this end-of-turn event should stay
 * silent. The marker is used up: it silences one event.
 */
function takeQuiet(cwd, now = Date.now(), dir = QUIET_DIR) {
  if (!cwd) return false;
  const marker = path.join(dir, require('node:crypto').createHash('sha1').update(cwd).digest('hex'));
  try {
    const fresh = now - fs.statSync(marker).mtimeMs <= QUIET_MAX_AGE_MS;
    fs.unlinkSync(marker);
    return fresh;
  } catch { return false; }
}

module.exports = { EVENTS_DIR, SETTINGS, QUIET_MAX_AGE_MS, installed, install, remove, lastAssistantText, turnSeconds, takeQuiet, sessionTopic };

if (require.main === module) {
  const action = process.argv[2];
  if (action === 'install') console.log(install() ? `Hook added to ${SETTINGS}` : 'Hook already present');
  else if (action === 'remove') console.log(remove() ? `Hook removed from ${SETTINGS}` : 'Hook was not present');
  else console.log(installed() ? 'installed' : 'not installed');
}
