// Renders text to an mp3 with the laptop's speaker (dist-cli/say.js) and keeps the files for a short time.
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, statSync, unlinkSync, readFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/** About two minutes of speech. */
export const MAX_CHARS = 1800;
export const KEEP_MS = 15 * 60 * 1000;
const ID = /^[0-9a-f]{24}$/;

export class SpeakError extends Error {}

/** Text that can be spoken, or a SpeakError that says why not. */
export function checkText(text) {
  const t = String(text ?? '').replace(/\r\n?/g, '\n').trim();
  if (!/[\p{L}\p{N}]/u.test(t)) throw new SpeakError('There is no text to speak.');
  if (t.length > MAX_CHARS) throw new SpeakError(`The text is ${t.length} characters; the limit is ${MAX_CHARS} (about two minutes). Shorten it and try again.`);
  return t;
}

function run(cmd, args, timeout) {
  return new Promise((ok, fail) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    const timer = setTimeout(() => { p.kill('SIGKILL'); fail(new SpeakError('The speaker took too long.')); }, timeout);
    p.on('error', (e) => { clearTimeout(timer); fail(new SpeakError(`Could not run ${cmd}: ${e.message}`)); });
    p.on('close', (code) => { clearTimeout(timer); code === 0 ? ok() : fail(new SpeakError(err.trim().split('\n').pop() || `${cmd} failed (${code})`)); });
  });
}

export function createSpeaker({ sayJs, dir = join(tmpdir(), 'adjutant-phone'), keepMs = KEEP_MS } = {}) {
  mkdirSync(dir, { recursive: true });

  const sweep = (now = Date.now()) => {
    for (const f of readdirSync(dir)) {
      try { if (now - statSync(join(dir, f)).mtimeMs > keepMs) unlinkSync(join(dir, f)); } catch {}
    }
  };

  return {
    sweep,
    /** Speak `text`; resolves to { id, bytes }. */
    async speak(text) {
      const t = checkText(text);
      sweep();
      const id = randomBytes(12).toString('hex');
      const wav = join(dir, `${id}.wav`), mp3 = join(dir, `${id}.mp3`);
      try {
        await run(process.execPath, [sayJs, '--no-play', '--out', wav, t], 180000);
        await run('ffmpeg', ['-loglevel', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-q:a', '6', mp3], 60000);
      } finally { try { unlinkSync(wav); } catch {} }
      return { id, bytes: readFileSync(mp3) };
    },
    /** The file for an id from an address, or null. Ids are checked so no path can escape the folder. */
    file(id) {
      if (!ID.test(id)) return null;
      const f = join(dir, `${id}.mp3`);
      return existsSync(f) ? f : null;
    },
  };
}
