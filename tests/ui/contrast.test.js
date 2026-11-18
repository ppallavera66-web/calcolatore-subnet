// @ts-check
/**
 * Contrasto dei quattro temi (specifica tecnica, 9.6 e 9.7; WCAG 2.2 AA).
 * Legge src/styles/tokens.css e verifica:
 * - testo e colori semantici su tutti gli sfondi: almeno 4,5:1 (1.4.3);
 * - bordi dei controlli (--line-strong) su tutti gli sfondi: almeno 3:1 (1.4.11);
 * - testo sui pulsanti color accento (--on-net su --net): almeno 4,5:1;
 * - i blocchi del tema Automatico (prefers-color-scheme, prefers-contrast) coincidono con quelli espliciti.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../../src/styles/tokens.css', import.meta.url)), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Variabili dichiarate nel primo blocco che segue `selector` (ricerca testuale).
 * @param {string} selector
 * @param {number} [from]
 */
function varsOf(selector, from = 0) {
  const start = css.indexOf(selector, from);
  if (start < 0) throw new Error(`Selettore non trovato: ${selector}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  /** @type {Record<string, string>} */
  const vars = {};
  for (const m of css.slice(open + 1, close).matchAll(/--([\w-]+)\s*:\s*([^;]+);?/g)) vars[m[1]] = m[2].trim();
  return vars;
}

const THEMES = {
  dark: varsOf(':root{'),
  light: varsOf(':root[data-theme="light"]'),
  contrast: varsOf(':root[data-theme="contrast"]'),
};
const AUTO_LIGHT = varsOf(':root:not([data-theme])', css.indexOf('prefers-color-scheme:light'));
const AUTO_CONTRAST = varsOf(':root:not([data-theme])', css.indexOf('prefers-contrast:more'));

/** Luminanza relativa (WCAG) di un colore #rrggbb. */
function luminance(/** @type {string} */ hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Colore non esadecimale: ${hex}`);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapporto di contrasto WCAG. */
export function contrast(/** @type {string} */ a, /** @type {string} */ b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const BACKGROUNDS = ['bg', 'surface', 'surface-2'];
const TEXT = ['text', 'muted', 'strong', 'net', 'host', 'warn', 'ok'];

describe('contrasto dei temi', () => {
  test('la formula del contrasto dà i valori noti', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  for (const [name, v] of Object.entries(THEMES)) {
    test(`${name}: testo e colori semantici ≥ 4,5:1 su ogni sfondo`, () => {
      const low = [];
      for (const fg of TEXT) for (const bg of BACKGROUNDS) {
        const r = contrast(v[fg], v[bg]);
        if (r < 4.5) low.push(`${fg} su ${bg}: ${r.toFixed(2)}`);
      }
      expect(low).toEqual([]);
    });

    test(`${name}: bordi dei controlli ≥ 3:1 su ogni sfondo`, () => {
      for (const bg of BACKGROUNDS) expect(contrast(v['line-strong'], v[bg]), bg).toBeGreaterThanOrEqual(3);
    });

    test(`${name}: testo sui pulsanti color accento ≥ 4,5:1`, () => {
      expect(contrast(v['on-net'], v.net)).toBeGreaterThanOrEqual(4.5);
    });
  }

  test('ogni tema dichiara le stesse variabili', () => {
    const keys = Object.keys(THEMES.dark).sort();
    expect(Object.keys(THEMES.light).sort()).toEqual(keys);
    expect(Object.keys(THEMES.contrast).sort()).toEqual(keys);
  });

  test('il tema Automatico usa gli stessi valori dei temi espliciti', () => {
    expect(AUTO_LIGHT).toEqual(THEMES.light);
    expect(AUTO_CONTRAST).toEqual(THEMES.contrast);
  });
});
