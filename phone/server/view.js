// The MCP App view: an audio player that takes its sound from the tool result.
export const VIEW_URI = 'ui://adjutant/player';
export const APP_CLIENT = 'https://unpkg.com/@modelcontextprotocol/ext-apps@1.7.5/dist/src/app-with-deps.js';

export const VIEW_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="color-scheme" content="light dark"><title>Adjutant voice</title>
<style>body{font:14px system-ui,sans-serif;margin:0;padding:12px}#note{margin:0 0 8px}audio{width:100%}</style></head>
<body><p id="note">Waiting for the voice…</p><audio id="a" controls preload="auto"></audio>
<script type="module">
  import { App } from "${APP_CLIENT}";
  const $ = (id) => document.getElementById(id);
  const app = new App({ name: "Adjutant voice", version: "1.0.0" });
  app.ontoolresult = ({ structuredContent: sc, content }) => {
    if (!sc) { $("note").textContent = content?.[0]?.text ?? "No sound."; return; }
    const a = $("a"), fallback = () => { a.onerror = null; a.src = "data:audio/mpeg;base64," + sc.data; };
    a.onerror = fallback;
    $("note").textContent = "Tap Play.";
    a.src = sc.url;
  };
  await app.connect();
</script></body></html>`;
