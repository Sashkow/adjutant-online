import { describe, expect, it } from 'vitest';
import messages from './messages.js';

const { duration, taskMessage, commandMessage, claudeMessage, program } = messages;

describe('notification wording', () => {
  it('words durations', () => {
    expect([duration(0.2), duration(42), duration(60), duration(150), duration(5400)]).toEqual(['1 second', '42 seconds', '1 minute', '3 minutes', '1.5 hours']);
  });
  it('describes tasks', () => {
    expect(taskMessage('npm: build', 0, 42)).toBe('Task npm build complete after 42 seconds.');
    expect(taskMessage('test', 2, 300)).toBe('Task test failed with exit code 2.');
    expect(taskMessage('lint', 0, 3)).toBe('Task lint complete.');
    expect(taskMessage('watch', undefined, 3)).toBe('Task watch finished.');
  });
  it('describes commands by program and plain arguments', () => {
    expect(commandMessage('CI=1 npm run build -- --mode=prod ./x', 0, 75)).toBe('Command npm run build complete after 1 minute.');
    expect(commandMessage('./node_modules/.bin/vitest run', 1, 20)).toBe('Command vitest run failed with exit code 1.');
    expect(program('FOO=1 /usr/bin/claude --resume')).toBe('claude');
  });
  it('takes the opening sentence of a Claude message', () => {
    expect(claudeMessage('**The blip now sounds only where a paragraph ends**, in `both`. Pauses are silent.\n\n- more')).toBe('The blip now sounds only where a paragraph ends, in both.');
    expect(claudeMessage('## Result\n\nBuilt version 2.5 of src/app.ts without errors. Next step.')).toBe('Built version 2.5 of src/app.ts without errors.');
    expect(claudeMessage('```js\ncode\n```')).toBe('Claude has finished.');
    expect(claudeMessage('Done')).toBe('Done.');
  });
  it('takes the opening sentence of a Ukrainian message', () => {
    expect(claudeMessage('**Готово.** Усі 42 тести пройдено. Далі буде.')).toBe('Готово.');
    expect(claudeMessage('Я оновив файл `say.js` і зібрав проєкт. Помилок немає.')).toBe('Я оновив файл say.js і зібрав проєкт.');
  });
  it('caps a long opening sentence', () => {
    const out = claudeMessage(`${'word '.repeat(80)}end.`);
    expect(out.length).toBeLessThanOrEqual(181);
    expect(out.endsWith('word.')).toBe(true);
  });
});

describe('accepting a reworded notification', async () => {
  const { accept } = (await import('./rephrase.js')).default;
  it('takes the first line and drops quotation marks', () => {
    expect(accept('The docs build broke.', '"The documentation build has failed."\n\nChanges: docs → documentation')).toBe('The documentation build has failed.');
  });
  it('rejects an empty reply or one far longer than a rewording', () => {
    expect(accept('Done.', '  \n')).toBe('');
    expect(accept('The deploy will finish in about five minutes.', 'Two Adjutant-style frame: "[Thing] until [event]." → "Five minutes until the deploy finishes.')).toBe('');
    expect(accept('Done.', 'word '.repeat(40))).toBe('');
    const original = 'I added a cache to the auth service and the p95 dropped by half.';
    expect(accept(original, 'I added a cache to the authentication service, and the p95 dropped by half. Wait, that changes the wording. Keep it to: I added a cache to the sign-in service and the p95 dropped by half.')).toBe('');
    expect(accept(original, 'I added a cache to the sign-in service and the 95th percentile dropped by half.')).not.toBe('');
  });
});

describe('rewording and Ukrainian', async () => {
  const { rephrase } = (await import('./rephrase.js')).default;
  it('leaves Ukrainian text as written, without a model call', async () => {
    const result = await rephrase('Усі тести пройдено.', { claudePath: '/nonexistent/claude' });
    expect(result.text).toBe('Усі тести пройдено.');
    expect(result.note).toMatch(/Ukrainian/);
  });
});

describe('the kind of a notification', () => {
  it('treats a non-zero exit code as a failure', () => {
    expect([messages.failed(1), messages.failed(0), messages.failed(undefined)]).toEqual([true, false, false]);
  });
  it('finds a question at the end of a message', () => {
    expect(messages.asksQuestion('I renamed the function.\n\nShould I fix the warnings too?')).toBe(true);
    expect(messages.asksQuestion('Which one?\n\n- **the first**\n- the second?')).toBe(true);
    expect(messages.asksQuestion('Why did it fail? The cache was stale.\n\nAll tests pass now.')).toBe(false);
    expect(messages.asksQuestion('Що далі?\n```\ncode\n```')).toBe(true);
    expect(messages.asksQuestion('')).toBe(false);
  });
});

describe('staying quiet for the turn that started a reading', async () => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const crypto = await import('node:crypto');
  const hook = (await import('./hook.js')).default;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quiet-'));
  const mark = (cwd) => fs.writeFileSync(path.join(dir, crypto.createHash('sha1').update(cwd).digest('hex')), '');

  it('silences one event from the folder of the reading', () => {
    mark('/work/project');
    expect(hook.takeQuiet('/work/project', Date.now(), dir)).toBe(true);
    expect(hook.takeQuiet('/work/project', Date.now(), dir)).toBe(false);
  });
  it('does not silence another folder', () => {
    mark('/work/project');
    expect(hook.takeQuiet('/work/other', Date.now(), dir)).toBe(false);
  });
  it('ignores a marker that is too old, and removes it', () => {
    mark('/work/old');
    expect(hook.takeQuiet('/work/old', Date.now() + hook.QUIET_MAX_AGE_MS + 1000, dir)).toBe(false);
    expect(hook.takeQuiet('/work/old', Date.now(), dir)).toBe(false);
  });
});

describe('who a notification is from', () => {
  const { sourceName, announce, meaningfulTerminal, projectFromFolder } = messages;
  it('names the project first', () => {
    expect(sourceName({ project: 'adjutant-online', folder: '/work/other', terminal: 'deploy', topic: 'Fix the build' })).toBe('adjutant online');
  });
  it('falls back to the folder, then a named terminal, then the topic', () => {
    expect(sourceName({ folder: '/work/shop-api' })).toBe('shop api');
    expect(sourceName({ folder: require('node:os').homedir(), terminal: 'deploy watch' })).toBe('deploy watch');
    expect(sourceName({ terminal: 'bash', topic: 'Fix the slow build' })).toBe('Fix the slow build');
    expect(sourceName({ terminal: 'zsh' })).toBe('');
    expect(sourceName()).toBe('');
  });
  it('knows which terminal names say nothing', () => {
    expect(['bash', 'zsh', 'Task - build', 'node', ''].map(meaningfulTerminal)).toEqual(['', '', '', '', '']);
    expect(meaningfulTerminal('database')).toBe('database');
  });
  it('does not take the home or root folder for a project', () => {
    expect(projectFromFolder('/home/me', '/home/me', '/tmp')).toBe('');
    expect(projectFromFolder('/', '/home/me', '/tmp')).toBe('');
    expect(projectFromFolder('/tmp', '/home/me', '/tmp')).toBe('');
    expect(projectFromFolder('/home/me/code/site', '/home/me', '/tmp')).toBe('site');
  });
  it('opens an alert and a plain message differently', () => {
    expect(announce('Task build failed with exit code 2.', { alert: true, source: 'shop api' })).toBe('Priority alert from shop api! Task build failed with exit code 2.');
    expect(announce('Task build complete.', { source: 'shop api' })).toBe('Message from shop api. Task build complete.');
  });
  it('says "another project" when the source is unknown', () => {
    expect(announce('Should I continue?', { alert: true })).toBe('Priority alert from another project! Should I continue?');
    expect(announce('Build complete.')).toBe('Message from another project. Build complete.');
  });
  it('does not say the alert words twice', () => {
    expect(announce('Priority alert! The build failed.', { alert: true, source: 'site' })).toBe('Priority alert from site! The build failed.');
    expect(announce('Увага, халепа: зібрати проєкт не вдалося.', { alert: true, source: 'site' })).toBe('Увага! Проєкт site. Халепа: зібрати проєкт не вдалося.');
  });
  it('opens a Ukrainian message in Ukrainian', () => {
    expect(announce('Усі тести пройдено.', { source: 'site' })).toBe('Повідомлення від проєкту site. Усі тести пройдено.');
    expect(announce('Що далі?', { alert: true })).toBe('Увага! Інший проєкт. Що далі?');
  });
});

describe('the topic of a Claude Code session', async () => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const hook = (await import('./hook.js')).default;
  const file = (lines) => { const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'topic-')), 't.jsonl'); fs.writeFileSync(f, lines.map((l) => JSON.stringify(l)).join('\n') + '\n'); return f; };
  it('takes the latest title Claude Code made up', () => {
    expect(hook.sessionTopic(file([{ type: 'ai-title', aiTitle: 'Old title' }, { type: 'user' }, { type: 'ai-title', aiTitle: 'Fix the slow build' }]))).toBe('Fix the slow build');
  });
  it('prefers the title the person gave', () => {
    expect(hook.sessionTopic(file([{ type: 'custom-title', customTitle: 'Release day' }, { type: 'ai-title', aiTitle: 'Something else' }]))).toBe('Release day');
  });
  it('gives nothing when there is no title or no file', () => {
    expect(hook.sessionTopic(file([{ type: 'user' }]))).toBe('');
    expect(hook.sessionTopic('/nonexistent/t.jsonl')).toBe('');
  });
});
