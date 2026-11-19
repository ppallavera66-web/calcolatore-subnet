// @ts-check
import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';
import { guidesPlugin } from './tools/guides.js';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  base: './',
  plugins: [guidesPlugin(), viteSingleFile()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    // SOURCE_DATE_EPOCH (secondi) rende la build riproducibile; altrimenti la data di oggi
    __BUILD_DATE__: JSON.stringify(
      new Date(process.env.SOURCE_DATE_EPOCH ? Number(process.env.SOURCE_DATE_EPOCH) * 1000 : Date.now()).toISOString().slice(0, 10),
    ),
  },
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
      include: ['src/engine/**/*.js', 'src/i18n/**/*.js', 'src/storage/**/*.js', 'src/session/**/*.js', 'src/export/**/*.js'],
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
