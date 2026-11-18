// @ts-check
import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'es2022',
    minify: true,
    sourcemap: false,
    // I font WOFF2 (fase 4) vengono incorporati in base64 nel CSS.
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**/*.js', 'src/i18n/**/*.js'],
      reporter: ['text', 'json-summary', 'html'],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
});
