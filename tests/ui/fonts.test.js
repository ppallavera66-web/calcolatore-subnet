// @ts-check
/**
 * Font incorporati (decisione D3): sei pesi, due sottoinsiemi ciascuno, licenza OFL presente.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const STYLES = fileURLToPath(new URL('../../src/styles/', import.meta.url));
const css = readFileSync(resolve(STYLES, 'fonts.css'), 'utf8');
const faces = [...css.matchAll(/@font-face\{([^}]*)\}/g)].map((m) => ({
  family: /font-family:"([^"]+)"/.exec(m[1])?.[1],
  weight: Number(/font-weight:(\d+)/.exec(m[1])?.[1]),
  url: /url\("([^"]+)"\)/.exec(m[1])?.[1] ?? '',
}));

describe('font IBM Plex (D3)', () => {
  test('sei pesi: Sans 400/600, Mono 400/600, Sans Condensed 600/700, ciascuno con Latin1 e Pi', () => {
    const weights = [...new Set(faces.map((f) => `${f.family} ${f.weight}`))].sort();
    expect(weights).toEqual([
      'IBM Plex Mono 400', 'IBM Plex Mono 600',
      'IBM Plex Sans 400', 'IBM Plex Sans 600',
      'IBM Plex Sans Condensed 600', 'IBM Plex Sans Condensed 700',
    ]);
    expect(faces).toHaveLength(12);
    expect(faces.filter((f) => f.url.endsWith('-latin1.woff2'))).toHaveLength(6);
    expect(faces.filter((f) => f.url.endsWith('-pi.woff2'))).toHaveLength(6);
  });

  test('ogni file esiste ed è un WOFF2', () => {
    for (const f of faces) {
      const path = resolve(STYLES, f.url);
      expect(existsSync(path), f.url).toBe(true);
      expect(readFileSync(path).subarray(0, 4).toString('latin1'), f.url).toBe('wOF2');
    }
  });

  test('la licenza OFL accompagna i font', () => {
    const ofl = readFileSync(resolve(dirname(resolve(STYLES, faces[0].url)), 'OFL.txt'), 'utf8');
    expect(ofl).toContain('SIL Open Font License');
    expect(ofl).toContain('IBM Corp');
  });

  test('le famiglie coincidono con quelle delle variabili dei temi', () => {
    const tokens = readFileSync(resolve(STYLES, 'tokens.css'), 'utf8');
    for (const fam of ['IBM Plex Sans Condensed', 'IBM Plex Sans', 'IBM Plex Mono']) expect(tokens).toContain(`"${fam}"`);
  });
});
