import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const ortVersion: string = JSON.parse(
  readFileSync(new URL('./node_modules/onnxruntime-web/package.json', import.meta.url), 'utf8'),
).version;

// Only index.html is a build entry; spike.html is served by the dev server
// but never ends up in dist/.
export default defineConfig({
  base: './',
  define: { __ORT_VERSION__: JSON.stringify(ortVersion), __ORT_LOCAL_PATH__: JSON.stringify('') },
  worker: { format: 'es' },
  build: { target: 'es2022' },
  test: { environment: 'node', include: ['src/**/*.test.ts', 'vscode-extension/*.test.js'] },
});
