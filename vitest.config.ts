import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setupTests.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      'whatwg-fetch': resolve(rootDir, 'src/test/polyfills/whatwg-fetch.ts'),
    },
  },
});
