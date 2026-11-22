// The phone voice: an MCP App server. One tool, speak(text), returns an audio player view.
// Reached through a Tailscale Funnel; listens on 127.0.0.1 only; answers only on its secret path.
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { createSpeaker, SpeakError, MAX_CHARS } from './speak.js';
import { VIEW_URI, VIEW_HTML } from './view.js';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const PUBLIC = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const SAY_JS = process.env.SAY_JS || join(here, '..', '..', 'dist-cli', 'say.js');

/** The secret path part: from the environment, else a file outside the repository (made on first run). */
function secret() {
  if (process.env.SECRET) return process.env.SECRET;
  const file = join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'adjutant-phone', 'secret');
  if (!existsSync(file)) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, randomBytes(12).toString('hex'), { mode: 0o600 }); }
  return readFileSync(file, 'utf8').trim();
}
const SECRET = secret();
if (!existsSync(SAY_JS)) { console.error(`${SAY_JS} is missing: run npm run build:cli`); process.exit(1); }
const speaker = createSpeaker({ sayJs: SAY_JS });
setInterval(() => speaker.sweep(), 5 * 60 * 1000).unref();

function build() {
  const s = new McpServer({ name: 'adjutant-voice', version: '1.0.0' });
  registerAppResource(s, 'Adjutant player', VIEW_URI, { description: 'Audio player for the Adjutant voice' }, async () => ({
    contents: [{ uri: VIEW_URI, mimeType: RESOURCE_MIME_TYPE, text: VIEW_HTML,
      _meta: { ui: { csp: { resourceDomains: ['https://unpkg.com', PUBLIC] } } } }] }));
  registerAppTool(s, 'speak', {
    title: 'Speak in the Adjutant voice',
    description: `Speaks the given text in the Adjutant voice and shows an audio player. Pass the exact text to be spoken (up to ${MAX_CHARS} characters). English or Ukrainian; Ukrainian is spoken in Ukrainian.`,
    inputSchema: { text: z.string().describe('The text to speak, already made speakable') },
    _meta: { ui: { resourceUri: VIEW_URI } },
  }, async ({ text }) => {
    try {
      const { id, bytes } = await speaker.speak(text);
      return { content: [{ type: 'text', text: 'The sound is ready; tap Play on the player.' }],
        structuredContent: { url: `${PUBLIC}/${SECRET}/a/${id}.mp3`, data: bytes.toString('base64') } };
    } catch (e) {
      const why = e instanceof SpeakError ? e.message : 'The speaker failed.';
      if (!(e instanceof SpeakError)) console.error(e);
      return { isError: true, content: [{ type: 'text', text: why }] };
    }
  });
  return s;
}

const prefix = `/${SECRET}/`;
createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://x').pathname;
    if (!path.startsWith(prefix)) { res.writeHead(404); return res.end(); }
    const rest = path.slice(prefix.length);
    const m = /^a\/([0-9a-f]{24})\.mp3$/.exec(rest);
    if (m && req.method === 'GET') {
      const f = speaker.file(m[1]);
      if (!f) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': 'audio/mpeg', 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
      return createReadStream(f).pipe(res);
    }
    if (rest !== 'mcp') { res.writeHead(404); return res.end(); }
    const body = await new Promise((ok, fail) => { const c = []; let n = 0;
      req.on('data', (d) => { n += d.length; if (n > 1e6) { fail(new Error('too big')); req.destroy(); } else c.push(d); });
      req.on('end', () => { try { ok(c.length ? JSON.parse(Buffer.concat(c)) : undefined); } catch (e) { fail(e); } }); });
    const server = build(), t = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { t.close(); server.close(); });
    await server.connect(t);
    await t.handleRequest(req, res, body);
  } catch { if (!res.headersSent) res.writeHead(400); res.end(); }
}).listen(PORT, '127.0.0.1', () => console.log(`Connector URL: ${PUBLIC}/${SECRET}/mcp`));
