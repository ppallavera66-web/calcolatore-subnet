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

  test('riepilogo dell\'import: dice quanti elementi restano fuori per i limiti (revisione I1)', () => {
    const base = { history: 150, plans: 0, skipped: 0, settings: false };
    expect(t('ui.si.done', { ...base, dropped: 0 })).toBe('Importati 150 calcoli e 0 piani.');
    expect(t('ui.si.done', { ...base, dropped: 100 })).toBe('Importati 150 calcoli e 0 piani; 100 elementi esclusi per il limite di 200 calcoli e 100 piani.');
    expect(t('ui.si.merge.dropped', { n: 1 })).toBe('Con Unisci 1 elemento resterebbe fuori per questi limiti.');
  });

  test('fase 9 (I5): il riepilogo chiama la cronologia "calcoli" come l\'anteprima, e gli scarti sono elementi', () => {
    expect(t('ui.si.counts', { history: 1, plans: 1 })).toBe('Contiene 1 calcolo e 1 piano.');
    expect(t('ui.si.done', { history: 1, plans: 1, skipped: 1, dropped: 0, settings: false })).toBe('Importati 1 calcolo e 1 piano; 1 elemento scartato perché non valido.');
    expect(t('ui.si.done', { history: 3, plans: 0, skipped: 2, dropped: 0, settings: true })).toBe('Importati 3 calcoli e 0 piani; 2 elementi scartati perché non validi. Impostazioni applicate.');
  });

  test('fase 9 (I4): plurali negli avvisi dell\'import', () => {
    expect(t('IMPORT_W_LABELS_DROPPED', { plan: 'Sede', count: 1 })).toBe('Piano "Sede": 1 etichetta non valida esclusa.');
    expect(t('IMPORT_W_LABELS_DROPPED', { plan: 'Sede', count: 1200 })).toBe('Piano "Sede": 1.200 etichette non valide escluse.');
    expect(t('IMPORT_W_HISTORY_TRUNCATED', { max: 200, dropped: 1 })).toBe('Cronologia oltre i 200 calcoli: tenuti i più recenti, 1 escluso.');
    expect(t('IMPORT_W_HISTORY_TRUNCATED', { max: 200, dropped: 5 })).toBe('Cronologia oltre i 200 calcoli: tenuti i più recenti, 5 esclusi.');
    expect(t('IMPORT_W_PLANS_TRUNCATED', { max: 100, dropped: 1 })).toBe('Più di 100 piani: tenuti quelli modificati più di recente, 1 escluso.');
    expect(t('IMPORT_W_DUPLICATE_ID', { count: 1 })).toBe('1 elemento ha un identificativo già usato nel file: per ogni identificativo resta il primo.');
    expect(t('IMPORT_W_DUPLICATE_ID', { count: 3 })).toBe('3 elementi hanno un identificativo già usato nel file: per ogni identificativo resta il primo.');
  });

  test('fase 9 (I1, I3): "Host di scorta" nel calcolo inverso, migliaia nell\'etichetta della subnet', () => {
    expect(t('ui.inv.result.spare')).toBe('Host di scorta');
    expect(t('ui.plans.labelFor', { n: 65536 })).toBe('Etichetta della subnet n. 65.536');
  });

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
