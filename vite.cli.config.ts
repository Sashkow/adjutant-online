import { defineConfig } from 'vite';

// The command-line speaker: `npm run build:cli` writes dist-cli/say.js.
// Packages stay external and are loaded from node_modules at run time.
export default defineConfig({
  build: { ssr: 'src/node/say.ts', outDir: 'dist-cli', target: 'node20', emptyOutDir: true },
});
