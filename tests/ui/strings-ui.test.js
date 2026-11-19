// @ts-check
/**
 * Testi dell'interfaccia (chiavi `ui.*` di strings.it.js): ogni testo esiste, è pulito
 * (niente "undefined", "NaN", segnaposto rimasti) e quelli usati dal codice dell'interfaccia esistono.
 */
import { describe, test, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STRINGS, t } from '../../src/i18n/strings.it.js';

const clean = (/** @type {string} */ s) => s.length > 0 && !/undefined|NaN|\[object Object\]|\$\{/.test(s);

/** Parametri plausibili per qualunque chiave: numeri piccoli, che vanno bene anche come indici e capitoli. */
const params = new Proxy({}, { get: (_, key) => (key === 'chapter' ? 'cap-9' : 2) });

const UI_DIR = fileURLToPath(new URL('../../src/ui/', import.meta.url));
/** @param {string} dir @returns {string[]} */
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : n.endsWith('.js') ? [join(dir, n)] : []));

describe('testi dell\'interfaccia', () => {
  const keys = Object.keys(STRINGS).filter((k) => k.startsWith('ui.'));

  test('ci sono testi dell\'interfaccia', () => {
    expect(keys.length).toBeGreaterThan(200);
  });

  test.each(keys)('%s', (key) => {
    const s = t(key, params);
    expect(clean(s), `${key}: ${s}`).toBe(true);
  });

  test('ogni chiave letterale usata nel codice dell\'interfaccia ha un testo', () => {
    const missing = new Set();
    for (const file of walk(UI_DIR)) {
      const code = readFileSync(file, 'utf8');
      for (const m of code.matchAll(/\bt\(\s*'((?:ui|field|method|scope|role|kind|verdict|block)\.[\w./-]+|none|chapter)'/g)) {
        if (!(m[1] in STRINGS)) missing.add(`${m[1]} (${file.slice(UI_DIR.length)})`);
      }
    }
    expect([...missing]).toEqual([]);
  });

  test('titoli e descrizioni di tutte le viste, titoli dei 19 capitoli', () => {
    for (const v of ['calcola/analisi', 'calcola/conversioni', 'calcola/mask', 'calcola/stessa', 'pianifica/inverso', 'pianifica/suddivisione',
      'pianifica/piani', 'guide/uso', 'guide/subnetting', 'impostazioni']) {
      expect(STRINGS[`ui.title.${v}`], v).toBeDefined();
      expect(STRINGS[`ui.lead.${v}`], v).toBeDefined();
    }
    for (let i = 1; i <= 19; i++) expect(STRINGS[`ui.cap.cap-${i}`]).toBeDefined();
  });
});
