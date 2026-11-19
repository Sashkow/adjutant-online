import { defineConfig } from 'vite';

// The live effect: `npm run build:live` writes dist-cli/live.js beside say.js (scripts/claude-voice-fx.sh runs it).
export default defineConfig({
  build: { ssr: 'src/node/live.ts', outDir: 'dist-cli', target: 'node20', emptyOutDir: false },
});
