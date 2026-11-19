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
import { IMPORT_ERR, IMPORT_WARN } from '../../src/session/schema.js';

const clean = (/** @type {string} */ s) => s.length > 0 && !/undefined|NaN|\[object Object\]|\$\{/.test(s);

/** Parametri plausibili per qualunque chiave: numeri piccoli, che vanno bene anche come indici e capitoli. */
const params = new Proxy({}, { get: (_, key) => (key === 'chapter' ? 'cap-9' : 2) });

const SRC = fileURLToPath(new URL('../../src/', import.meta.url));
/** Cartelle che usano i testi con chiavi letterali: interfaccia, export, sessione. */
const DIRS = ['ui', 'export', 'session'].map((d) => join(SRC, d));
/** @param {string} dir @returns {string[]} */
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : n.endsWith('.js') ? [join(dir, n)] : []));

describe('testi dell\'interfaccia', () => {
  const keys = Object.keys(STRINGS).filter((k) => k.startsWith('ui.') || k.startsWith('export.') || k.startsWith('IMPORT_'));

  test('ci sono testi dell\'interfaccia', () => {
    expect(keys.length).toBeGreaterThan(200);
  });

  test.each(keys)('%s', (key) => {
    const s = t(key, params);
    expect(clean(s), `${key}: ${s}`).toBe(true);
  });

  test('ogni chiave letterale usata nel codice di interfaccia, export e sessione ha un testo', () => {
    const missing = new Set();
    for (const file of DIRS.flatMap(walk)) {
      const code = readFileSync(file, 'utf8');
      for (const m of code.matchAll(/\bt\(\s*'((?:ui|field|method|scope|role|kind|verdict|block|export)\.[\w./-]+|none|chapter)'/g)) {
        if (!(m[1] in STRINGS)) missing.add(`${m[1]} (${file.slice(SRC.length)})`);
      }
    }
    expect([...missing]).toEqual([]);
  });

  test('ogni codice dell\'import (6.3, 7.3) ha un testo', () => {
    for (const code of [...Object.values(IMPORT_ERR), ...Object.values(IMPORT_WARN)]) expect(STRINGS[code], code).toBeDefined();
    expect(t('IMPORT_UNKNOWN_FORMAT', { format: '' })).toBe('Il file non è una sessione del Calcolatore Subnet.');
    expect(t('IMPORT_DECRYPT_FAILED')).toBe('Passphrase errata o file danneggiato.');
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
