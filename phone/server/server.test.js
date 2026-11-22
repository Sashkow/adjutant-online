// Starts the real server on a test port and speaks through the MCP client. Needs dist-cli/say.js, the cached voice models and ffmpeg.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const PORT = 8799, SECRET = 'testsecret0123456789abcd', BASE = `http://localhost:${PORT}`;
let proc, client;

before(async () => {
  proc = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(PORT), SECRET, PUBLIC_URL: BASE }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((ok) => proc.stdout.once('data', ok));
  client = new Client({ name: 'test', version: '1' });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${BASE}/${SECRET}/mcp`)));
});
after(async () => { await client?.close(); proc?.kill(); });

test('the tool is listed with its player view', async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name), ['speak']);
  assert.equal(tools[0]._meta.ui.resourceUri, 'ui://adjutant/player');
});

for (const [name, text] of [['English', 'Task complete.'], ['Ukrainian', 'Збірку завершено.']]) {
  test(`speaks ${name} and serves the mp3`, { timeout: 180000 }, async () => {
    const r = await client.callTool({ name: 'speak', arguments: { text } });
    assert.ok(!r.isError);
    const { url, data } = r.structuredContent;
    assert.match(url, new RegExp(`^${BASE}/${SECRET}/a/[0-9a-f]{24}\\.mp3$`));
    const got = await fetch(url);
    assert.equal(got.status, 200);
    assert.equal(got.headers.get('content-type'), 'audio/mpeg');
    const bytes = Buffer.from(await got.arrayBuffer());
    assert.ok(bytes.length > 5000);
    assert.equal(Buffer.from(data, 'base64').length, bytes.length);
    assert.ok(bytes.subarray(0, 3).toString() === 'ID3' || bytes[0] === 0xff);
  });
}

test('empty and over-long text give a plain error and no sound', async () => {
  for (const text of ['  ', 'a '.repeat(1000)]) {
    const r = await client.callTool({ name: 'speak', arguments: { text } });
    assert.equal(r.isError, true);
    assert.equal(r.structuredContent, undefined);
    assert.match(r.content[0].text, /no text|limit/);
  }
});

test('any other path answers 404', async () => {
  for (const p of ['/x/mcp', '/', `/${SECRET}/other`, `/${SECRET}/a/${'0'.repeat(24)}.mp3`, `/${SECRET}/a/..%2f..%2fmcp`, `/${SECRET}/a/%2e%2e/mcp.mp3`]) {
    assert.equal((await fetch(BASE + p)).status, 404, p);
  }
});
