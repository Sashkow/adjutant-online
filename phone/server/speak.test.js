import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, utimesSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkText, createSpeaker, MAX_CHARS, SpeakError } from './speak.js';

test('empty or symbol-only text is refused', () => {
  for (const t of ['', '   ', undefined, '*** ---']) assert.throws(() => checkText(t), SpeakError);
});
test('text over the limit is refused with its length', () => {
  assert.throws(() => checkText('a'.repeat(MAX_CHARS + 1)), /limit is 1800/);
  assert.equal(checkText('a'.repeat(MAX_CHARS)).length, MAX_CHARS);
});
test('text is trimmed and line endings made plain', () => {
  assert.equal(checkText('  One.\r\n\r\nTwo.  '), 'One.\n\nTwo.');
});
test('file() only finds 24-hex ids and never leaves the folder', () => {
  const dir = mkdtempSync(join(tmpdir(), 'adj-'));
  const sp = createSpeaker({ sayJs: 'x', dir });
  const id = 'a'.repeat(24);
  writeFileSync(join(dir, `${id}.mp3`), 'x');
  assert.ok(sp.file(id));
  for (const bad of ['../etc/passwd', `${id}/../${id}`, 'a'.repeat(23), `${id}.mp3`, '']) assert.equal(sp.file(bad), null);
});
test('sweep deletes files older than the keeping time only', () => {
  const dir = mkdtempSync(join(tmpdir(), 'adj-'));
  const sp = createSpeaker({ sayJs: 'x', dir, keepMs: 1000 });
  const old = join(dir, 'old.mp3'), fresh = join(dir, 'fresh.mp3');
  writeFileSync(old, 'x'); writeFileSync(fresh, 'x');
  const past = new Date(Date.now() - 60000); utimesSync(old, past, past);
  sp.sweep();
  assert.equal(existsSync(old), false);
  assert.equal(existsSync(fresh), true);
});
