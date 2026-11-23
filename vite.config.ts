import { defineConfig } from 'vitest/config';

// The tests. The speaker itself is built with vite.cli.config.ts.
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts', 'vscode-extension/*.test.js'] },
});
