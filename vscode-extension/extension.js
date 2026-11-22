'use strict';
const vscode = require('vscode');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { taskMessage, commandMessage, claudeMessage, program, failed, asksQuestion, sourceName, announce } = require('./messages');
const hook = require('./hook');
const { rephrase, WORK_DIR: REPHRASE_DIR } = require('./rephrase');

/** Events older than this are stale (VS Code was closed when they happened). */
const EVENT_MAX_AGE_MS = 60_000;
/** A window whose workspace does not contain the Claude session's folder waits this long, so the right window can speak first. */
const FOREIGN_WINDOW_DELAY_MS = 700;
const MAX_QUEUE = 3;

let log;
let queue = [];
let speaking = false;
let warned = false;

const config = () => vscode.workspace.getConfiguration('adjutantVoice');

function cliPath() {
  const set = config().get('cliPath');
  if (set) return set;
  try { return require('./default-cli.json').cli; } catch { return ''; }
}

/**
 * `asIs` skips the rewording step and the opening words (the voice test, which is about the sound).
 * `alert` marks a failure or a question: it opens with "Priority alert from <source>!"; anything
 * else opens with "Message from <source>.". `source` says which project or session it is about.
 */
function say(text, asIs = false, alert = false, source = '') {
  if (!config().get('enabled')) return;
  log.appendLine(`say: ${text}`);
  queue.push({ text, asIs, alert, source });
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE); // a burst: keep the latest
  void drain();
}

async function drain() {
  if (speaking) return;
  speaking = true;
  while (queue.length) {
    const item = queue.shift();
    const worded = await clearer(item);
    const error = await run(item.asIs ? worded : announce(worded, item));
    if (error) {
      log.appendLine(`error: ${error}`);
      if (!warned) {
        warned = true;
        void vscode.window.showWarningMessage(`Adjutant Voice could not speak: ${error}`, 'Show Log').then((pick) => pick && log.show());
      }
    }
  }
  speaking = false;
}

/** The wording to speak: reworded for the voice by a model call, or the original if that is off or fails. */
async function clearer({ text, asIs }) {
  if (asIs || !config().get('rephrase')) return text;
  const result = await rephrase(text, { claudePath: config().get('claudePath'), model: config().get('rephraseModel') });
  log.appendLine(result.note ? `not reworded (${result.note})` : `reworded: ${result.text}`);
  return result.text;
}

/**
 * Runs the speaker program; resolves to an error message, or '' on success. A notification has
 * priority over a reading in progress: the reading stops, and comes back when this has been said.
 */
function run(text) {
  return new Promise((resolve) => {
    const cli = cliPath();
    if (!cli || !fs.existsSync(cli)) return resolve(`speaker program not found at "${cli}". Run "npm run build:cli" in the Adjutant Online project or set adjutantVoice.cliPath.`);
    const link = config().get('voiceLink');
    const args = [cli, '--priority', ...(link ? ['--link', link] : []), text];
    const child = spawn(config().get('nodePath') || 'node', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (e) => resolve(e.message));
    child.on('exit', (code) => resolve(code === 0 ? '' : stderr.trim().split('\n').pop() || `exit code ${code}`));
  });
}

// ---- VS Code tasks -------------------------------------------------------

const taskStarts = new Map();
let runningTasks = 0;
let lastTaskEnd = 0;

function watchTasks(context) {
  context.subscriptions.push(
    vscode.tasks.onDidStartTaskProcess((e) => { taskStarts.set(e.execution, Date.now()); runningTasks++; }),
    vscode.tasks.onDidEndTaskProcess((e) => {
      const started = taskStarts.get(e.execution) ?? Date.now();
      taskStarts.delete(e.execution);
      runningTasks = Math.max(0, runningTasks - 1);
      lastTaskEnd = Date.now();
      const seconds = (Date.now() - started) / 1000;
      if (config().get('tasks') && seconds >= config().get('minimumSeconds')) say(taskMessage(e.execution.task.name, e.exitCode, seconds), false, failed(e.exitCode), sourceName({ project: windowProject() }));
    }),
  );
}

// ---- Terminal commands (shell integration) --------------------------------

const commandStarts = new WeakMap();

function watchTerminal(context) {
  if (!vscode.window.onDidEndTerminalShellExecution) return;
  context.subscriptions.push(
    vscode.window.onDidStartTerminalShellExecution((e) => commandStarts.set(e.execution, Date.now())),
    vscode.window.onDidEndTerminalShellExecution((e) => {
      const started = commandStarts.get(e.execution);
      if (started === undefined || !config().get('terminalCommands')) return;
      const seconds = (Date.now() - started) / 1000;
      // A task's own terminal reports its command too; the task announcement covers it.
      if (runningTasks > 0 || Date.now() - lastTaskEnd < 2000) return;
      if (seconds < config().get('minimumSeconds')) return;
      const line = e.execution.commandLine?.value ?? '';
      if (config().get('ignoreCommands').includes(program(line))) return;
      say(commandMessage(line, e.exitCode, seconds), false, failed(e.exitCode), sourceName({ project: windowProject(), terminal: e.terminal?.name }));
    }),
  );
}

// ---- Claude Code ----------------------------------------------------------

/** This window's project, as its title bar names it. */
function windowProject() {
  const name = (vscode.workspace.name || '').replace(/\s*\((Workspace|Робоча область)\)\s*$/i, '');
  return name || (vscode.workspace.workspaceFolders || [])[0]?.name || '';
}

/** The name of this window's project folder that contains `dir`, or '' if none does. */
function projectOf(dir) {
  const folder = !!dir && (vscode.workspace.workspaceFolders || []).find((f) => dir === f.uri.fsPath || dir.startsWith(f.uri.fsPath + path.sep));
  return folder ? folder.name : '';
}

function inWorkspace(dir) {
  return !!dir && (vscode.workspace.workspaceFolders || []).some((f) => dir === f.uri.fsPath || dir.startsWith(f.uri.fsPath + path.sep));
}

function handleEvent(file) {
  let event;
  try {
    if (Date.now() - fs.statSync(file).mtimeMs > EVENT_MAX_AGE_MS) { fs.unlinkSync(file); return; }
    event = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return; } // already taken by another window, or not complete yet
  const claim = () => {
    const mine = `${file}.claimed-${process.pid}`;
    try { fs.renameSync(file, mine); fs.unlinkSync(mine); } catch { return; } // another window spoke
    if (!config().get('claude') || event.hook_event_name !== 'Stop') return;
    if (event.cwd === REPHRASE_DIR) return; // the rewording call itself; announcing it would loop
    // The turn that started a reading aloud: announcing it would interrupt that reading.
    if (hook.takeQuiet(event.cwd)) { log.appendLine('quiet: this turn started a reading'); return; }
    // A turn whose length cannot be worked out is announced, so nothing long goes unreported.
    const seconds = hook.turnSeconds(event.transcript_path);
    if (seconds !== undefined && seconds < config().get('minimumSeconds')) {
      log.appendLine(`quiet: Claude turn took ${Math.round(seconds)} s`);
      return;
    }
    const message = event.last_assistant_message || hook.lastAssistantText(event.transcript_path);
    const source = sourceName({ project: projectOf(event.cwd), folder: event.cwd, topic: hook.sessionTopic(event.transcript_path) });
    say(claudeMessage(message), false, asksQuestion(message), source);
  };
  if (inWorkspace(event.cwd)) claim();
  else setTimeout(claim, FOREIGN_WINDOW_DELAY_MS);
}

function watchClaude(context) {
  fs.mkdirSync(hook.EVENTS_DIR, { recursive: true });
  const seen = new Set();
  const scan = () => {
    let names = [];
    try { names = fs.readdirSync(hook.EVENTS_DIR); } catch { return; }
    for (const name of names) {
      if (!name.endsWith('.json') || seen.has(name)) continue;
      seen.add(name);
      handleEvent(path.join(hook.EVENTS_DIR, name));
    }
    if (seen.size > 500) seen.clear();
  };
  scan();
  let watcher;
  try { watcher = fs.watch(hook.EVENTS_DIR, scan); } catch { /* fall back to the timer alone */ }
  const timer = setInterval(scan, 3000);
  context.subscriptions.push({ dispose() { watcher?.close(); clearInterval(timer); } });
}

async function offerHook(context) {
  if (!config().get('claude') || hook.installed() || context.globalState.get('hookOffered')) return;
  await context.globalState.update('hookOffered', true);
  const pick = await vscode.window.showInformationMessage(
    'Adjutant Voice can announce when Claude Code finishes a turn. This adds a Stop hook to your Claude Code settings.', 'Install Hook', 'Not Now');
  if (pick === 'Install Hook') await vscode.commands.executeCommand('adjutantVoice.installClaudeHook');
}

function activate(context) {
  log = vscode.window.createOutputChannel('Adjutant Voice');
  context.subscriptions.push(
    log,
    vscode.commands.registerCommand('adjutantVoice.test', () => { warned = false; say('Voice check. All systems are nominal.', true); }),
    vscode.commands.registerCommand('adjutantVoice.installClaudeHook', () => {
      try {
        const added = hook.install();
        void vscode.window.showInformationMessage(added ? `Hook added to ${hook.SETTINGS}. It applies to Claude Code sessions started from now on.` : 'The Claude Code hook is already installed.');
      } catch (e) { void vscode.window.showErrorMessage(`Could not edit ${hook.SETTINGS}: ${e.message}`); }
    }),
    vscode.commands.registerCommand('adjutantVoice.removeClaudeHook', () => {
      try {
        void vscode.window.showInformationMessage(hook.remove() ? `Hook removed from ${hook.SETTINGS}.` : 'The Claude Code hook was not installed.');
      } catch (e) { void vscode.window.showErrorMessage(`Could not edit ${hook.SETTINGS}: ${e.message}`); }
    }),
  );
  watchTasks(context);
  watchTerminal(context);
  watchClaude(context);
  void offerHook(context);
}

module.exports = { activate, deactivate() {} };
