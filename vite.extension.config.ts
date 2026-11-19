import { copyFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const root = import.meta.dirname;
const out = resolve(root, 'dist-extension');

/** Extension pages may not load code from a CDN, so the ONNX runtime ships inside the package. */
function bundleOnnxRuntime(): Plugin {
  return {
    name: 'bundle-onnx-runtime',
    closeBundle() {
      // The bundler also emits its own copies of the runtime (and the unused GPU build); drop them.
      for (const f of readdirSync(resolve(out, 'assets'))) if (f.endsWith('.wasm')) rmSync(resolve(out, 'assets', f));
      mkdirSync(resolve(out, 'ort'), { recursive: true });
      for (const f of ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']) {
        copyFileSync(resolve(root, 'node_modules/onnxruntime-web/dist', f), resolve(out, 'ort', f));
      }
    },
  };
}

// The Firefox extension: `npm run build:extension` writes dist-extension/.
export default defineConfig({
  root: resolve(root, 'extension'),
  base: '/',
  define: { __ORT_VERSION__: JSON.stringify(''), __ORT_LOCAL_PATH__: JSON.stringify('/ort/') },
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    outDir: out,
    emptyOutDir: true,
    rollupOptions: {
      input: { background: resolve(root, 'extension/background.html'), options: resolve(root, 'extension/options.html') },
    },
  },
  plugins: [bundleOnnxRuntime()],
});
