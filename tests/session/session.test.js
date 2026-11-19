// @ts-check
/**
 * Sessione JSON (specifica tecnica, 6; test della 10.4): corpus di file validi e non validi,
 * uno per regola della 6.3; andata e ritorno; Sostituisci e Unisci; impostazioni solo su scelta;
 * inquinamento del prototipo; migrazioni.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { readSessionText, readSessionObject, buildSession, applyImport, checkImportSize, utf8Length } from '../../src/session/session.js';
import { migrate, MIGRATIONS } from '../../src/session/migrate.js';
import { validateInput, INPUT_KEYS, subnetCount } from '../../src/session/inputs.js';
import { readPlan, readLabels } from '../../src/session/validate.js';
import { LIMITS, isIsoDate, isCleanText, charLength, HISTORY_FNS, THEMES, DIDACTIC_METHODS } from '../../src/session/schema.js';
import * as uiState from '../../src/ui/state.js';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'sessions');
/** @type {Record<string, any>} */
const INDEX = JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8'));
const read = (/** @type {string} */ f) => readFileSync(join(DIR, f), 'utf8');

const NOW = '2026-11-19T10:00:00.000Z';
const META = { now: NOW, appName: 'Calcolatore Subnet', appVersion: '0.1.0' };

/** @param {any} r */
function session(r) {
  if (!r.ok || r.kind !== 'session') throw new Error(`Esito inatteso: ${JSON.stringify(r)}`);
  return r;
}

describe('corpus di sessioni (tests/fixtures/sessions, una regola della 6.3 per file)', () => {
  test('ogni file del corpus ha un esito atteso e viceversa', () => {
    const files = readdirSync(DIR).filter((f) => f !== 'index.json');
    expect(files.sort()).toEqual(Object.keys(INDEX).sort());
  });

  test.each(Object.entries(INDEX))('%s', (file, exp) => {
    const r = readSessionText(read(file));
    if (!exp.ok) {
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.code).toBe(exp.code);
      if (exp.params) expect(r.error.params).toMatchObject(exp.params);
      return;
    }
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    if (exp.kind === 'encrypted') {
      expect(r.kind).toBe('encrypted');
      return;
    }
    const s = session(r);
    if (exp.report) expect(s.report).toMatchObject(exp.report);
    if (exp.settings) expect(s.data.settings).toEqual(exp.settings);
    if (exp.historyIds) expect(s.data.history.map((/** @type {any} */ h) => h.id)).toEqual(exp.historyIds);
    if (exp.firstHistoryId) expect(s.data.history[0].id).toBe(exp.firstHistoryId);
    if (exp.planIds) expect(s.data.plans.map((/** @type {any} */ p) => p.id)).toEqual(exp.planIds);
    if (exp.missingPlanIds) for (const id of exp.missingPlanIds) expect(s.data.plans.some((/** @type {any} */ p) => p.id === id)).toBe(false);
    if (exp.warnings) expect(s.report.warnings.map((/** @type {any} */ w) => w.code)).toEqual(expect.arrayContaining(exp.warnings));
    for (const [id, labels] of Object.entries(exp.labels ?? {})) expect(s.data.plans.find((/** @type {any} */ p) => p.id === id)?.labels).toEqual(labels);
    for (const [id, notes] of Object.entries(exp.notes ?? {})) expect(s.data.plans.find((/** @type {any} */ p) => p.id === id)?.notes).toBe(notes);
    for (const [id, block] of Object.entries(exp.block ?? {})) expect(s.data.plans.find((/** @type {any} */ p) => p.id === id)?.input.block).toBe(block);
  });

  test('regola 1: oltre 5 MB si rifiuta prima di leggere', () => {
    expect(checkImportSize(LIMITS.importBytes)).toBeNull();
    expect(checkImportSize(LIMITS.importBytes + 1)).toEqual({ code: 'IMPORT_TOO_LARGE', params: { size: 5242881, max: 5242880 } });
    const big = JSON.stringify({ format: 'subnetcalc-session', version: 1, exportedAt: NOW, pad: 'x'.repeat(LIMITS.importBytes) });
    const r = readSessionText(big);
    expect(!r.ok && r.error.code).toBe('IMPORT_TOO_LARGE');
    // il limite conta i byte UTF-8, non i caratteri
    expect(utf8Length('è')).toBe(2);
  });

  test('BOM UTF-8 iniziale accettato (file salvati da editor di Windows)', () => {
    const r = readSessionText(`\uFEFF${read('02-valido-minimo.json')}`);
    expect(r.ok).toBe(true);
  });

  test('tutte le funzioni della 6.2: input già canonici restano uguali', () => {
    const original = JSON.parse(read('03-valido-tutte-le-funzioni.json'));
    const s = session(readSessionText(read('03-valido-tutte-le-funzioni.json')));
    expect(s.data.history.map((/** @type {any} */ h) => h.input)).toEqual(original.history.map((/** @type {any} */ h) => h.input));
  });
});

describe('inquinamento del prototipo (10.4)', () => {
  test('un file con __proto__, constructor, prototype non modifica Object.prototype', () => {
    const r = session(readSessionText(read('50-regola6-chiavi-sconosciute.json')));
    expect(/** @type {any} */ ({}).polluted).toBeUndefined();
    expect(/** @type {any} */ (Object.prototype).polluted).toBeUndefined();
    // nessun oggetto del risultato ha un prototipo diverso da Object.prototype o chiavi pericolose
    const walk = (/** @type {any} */ v) => {
      if (!v || typeof v !== 'object') return;
      if (!Array.isArray(v)) expect(Object.getPrototypeOf(v)).toBe(Object.prototype);
      for (const k of Object.keys(v)) {
        expect(['__proto__', 'constructor', 'prototype']).not.toContain(k);
        walk(v[k]);
      }
    };
    walk(r.data);
    const applied = applyImport({ settings: {}, history: [], plans: [] }, r.data, { mode: 'merge', applySettings: true });
    walk(applied);
    expect(/** @type {any} */ ({}).polluted).toBeUndefined();
  });

  test('proprietà: oggetti arbitrari con chiavi pericolose non inquinano', () => {
    const key = fc.constantFrom('__proto__', 'constructor', 'prototype', 'theme', 'labels', 'input', '0');
    const json = fc.jsonValue();
    fc.assert(
      fc.property(fc.dictionary(key, json), fc.array(fc.dictionary(key, json), { maxLength: 5 }), (settings, items) => {
        const text = JSON.stringify({ format: 'subnetcalc-session', version: 1, exportedAt: NOW, settings, history: items, plans: items })
          .replaceAll('"constructor"', '"__proto__"');
        readSessionText(text);
        return /** @type {any} */ ({}).polluted === undefined && Object.keys(Object.prototype).length === 0;
      }),
      { numRuns: 300 },
    );
  });
});

describe('andata e ritorno (10.4)', () => {
  const state = {
    settings: { theme: 'dark', didactic: true, didacticMethod: 'magic', exportBar: true, persist: true },
    history: session(readSessionText(read('03-valido-tutte-le-funzioni.json'))).data.history,
    plans: session(readSessionText(read('01-valido-esempio-6.1.json'))).data.plans,
  };

  test('export → import identico; "Memorizza i dati" non viaggia nel file', () => {
    const file = buildSession(state, META);
    expect(file).toMatchObject({ format: 'subnetcalc-session', version: 1, exportedAt: NOW, app: { name: 'Calcolatore Subnet', version: '0.1.0' } });
    expect(file.settings).toEqual({ theme: 'dark', didactic: true, didacticMethod: 'magic', exportBar: true });
    const back = session(readSessionText(JSON.stringify(file)));
    expect(back.data).toEqual({ settings: file.settings, history: state.history, plans: state.plans });
    expect(back.report).toMatchObject({ historySkipped: 0, plansSkipped: 0, settingsIgnored: 0, unknownKeys: 0, warnings: [] });
    expect(back.meta).toEqual({ exportedAt: NOW, version: 1, app: { name: 'Calcolatore Subnet', version: '0.1.0' } });
  });

  test('proprietà: cronologie generate a caso tornano identiche', () => {
    const ip = fc.tuple(fc.nat(255), fc.nat(255), fc.nat(255), fc.nat(255)).map((o) => o.join('.'));
    const entry = fc.record({
      id: fc.stringMatching(/^[A-Za-z0-9_-]{12}$/),
      at: fc.integer({ min: Date.UTC(2020, 0, 1), max: Date.UTC(2030, 0, 1) }).map((ms) => new Date(ms).toISOString()),
      fn: fc.constant('F01'),
      input: fc.record({ ip, prefix: fc.integer({ min: 0, max: 32 }) }),
    });
    fc.assert(
      fc.property(fc.uniqueArray(entry, { selector: (e) => e.id, maxLength: 30 }), (history) => {
        const sorted = [...history].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
        const file = buildSession({ settings: {}, history: sorted, plans: [] }, META);
        const back = session(readSessionText(JSON.stringify(file)));
        expect(back.data.history).toEqual(sorted);
      }),
      { numRuns: 200 },
    );
  });
});

describe('Sostituisci e Unisci (6.4)', () => {
  const h = (/** @type {string} */ id, /** @type {string} */ at, /** @type {string} */ ip) => ({ id, at, fn: 'F04', input: { ip } });
  const plan = (/** @type {string} */ id, /** @type {string} */ name) => ({
    id, type: /** @type {const} */ ('subdivision'), name, createdAt: NOW, updatedAt: NOW, notes: '', input: { block: '10.0.0.0', prefix: 24, newPrefix: 26 }, labels: {},
  });
  const current = {
    settings: { theme: 'light', didactic: false, didacticMethod: 'binary', exportBar: false, persist: true },
    history: [h('a', '2026-11-18T10:00:00.000Z', '10.0.0.1'), h('b', '2026-11-18T09:00:00.000Z', '10.0.0.2')],
    plans: [plan('p1', 'Mio')],
  };
  const incoming = {
    settings: { theme: 'dark', didactic: true },
    history: [h('a', '2026-11-18T12:00:00.000Z', '10.9.9.9'), h('c', '2026-11-18T11:00:00.000Z', '10.0.0.3'), h('d', '2026-11-18T08:00:00.000Z', '10.0.0.2')],
    plans: [plan('p1', 'Suo'), plan('p2', 'Nuovo')],
  };

  test('Sostituisci: cronologia e piani del file; impostazioni invariate senza la casella', () => {
    const r = applyImport(current, incoming, { mode: 'replace' });
    expect(r.history).toEqual(incoming.history);
    expect(r.plans).toEqual(incoming.plans);
    expect(r.settings).toBe(current.settings);
    expect(r.summary).toEqual({ history: 3, plans: 2, duplicates: 0, dropped: 0, settingsApplied: false });
  });

  test('Unisci: a parità di id resta l\'elemento presente; doppioni per contenuto tolti; ordine per data', () => {
    const r = applyImport(current, incoming, { mode: 'merge' });
    expect(r.history.map((x) => x.id)).toEqual(['c', 'a', 'b']);
    expect(r.history.find((x) => x.id === 'a')?.input.ip).toBe('10.0.0.1');
    expect(r.plans.map((p) => p.name)).toEqual(['Mio', 'Nuovo']);
    // 'a' e 'p1' per id, 'd' per contenuto (stesso input di 'b', più vecchio)
    expect(r.summary).toEqual({ history: 1, plans: 1, duplicates: 3, dropped: 0, settingsApplied: false });
  });

  test('Unisci: un doppione per contenuto più recente prende il posto di quello presente', () => {
    const r = applyImport(current, { settings: {}, history: [h('e', '2026-11-18T23:00:00.000Z', '10.0.0.2')], plans: [] }, { mode: 'merge' });
    expect(r.history.map((x) => x.id)).toEqual(['e', 'a']);
  });

  test('impostazioni applicate solo su scelta, mai "Memorizza i dati"', () => {
    const r = applyImport(current, /** @type {any} */ ({ ...incoming, settings: { ...incoming.settings, persist: false } }), { mode: 'merge', applySettings: true });
    expect(r.settings).toEqual({ theme: 'dark', didactic: true, didacticMethod: 'binary', exportBar: false, persist: true });
    expect(r.summary.settingsApplied).toBe(true);
  });

  test('limiti: 200 voci e 100 piani dopo l\'unione', () => {
    const many = Array.from({ length: 150 }, (_, i) => h(`m${i}`, new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(), `10.1.${i >> 8}.${i & 255}`));
    const more = Array.from({ length: 150 }, (_, i) => h(`n${i}`, new Date(Date.UTC(2026, 1, 1, 0, i)).toISOString(), `10.2.${i >> 8}.${i & 255}`));
    const plansA = Array.from({ length: 98 }, (_, i) => plan(`a${i}`, `A${i}`));
    const plansB = Array.from({ length: 5 }, (_, i) => plan(`b${i}`, `B${i}`));
    const r = applyImport({ settings: {}, history: many, plans: plansA }, { settings: {}, history: more, plans: plansB }, { mode: 'merge' });
    expect(r.history).toHaveLength(200);
    expect(r.history[0].id).toBe('n149');
    expect(r.plans).toHaveLength(100);
    expect(r.summary).toMatchObject({ history: 150, plans: 2, dropped: 100 + 3 });
  });
});

describe('migrazioni (6.3 punto 4)', () => {
  test('la catena v1 è vuota: nessuna migrazione da applicare', () => {
    expect(Object.keys(MIGRATIONS)).toEqual([]);
    const r = migrate({ a: 1 }, 1, 1);
    expect(r).toEqual({ ok: true, value: { a: 1 }, steps: 0 });
  });

  test('il meccanismo applica i salti in ordine, senza modificare l\'originale', () => {
    const chain = {
      0: (/** @type {any} */ o) => ({ ...o, history: (o.calcoli ?? []).map((/** @type {any} */ c) => ({ ...c, fn: 'F04' })), calcoli: undefined }),
    };
    const v0 = { format: 'subnetcalc-session', version: 0, exportedAt: NOW, calcoli: [{ id: 'x1', at: NOW, input: { ip: '10.0.0.1' } }] };
    const copy = structuredClone(v0);
    const r = readSessionObject(v0, { migrations: chain });
    expect(session(r).data.history).toEqual([{ id: 'x1', at: NOW, fn: 'F04', input: { ip: '10.0.0.1' } }]);
    expect(session(r).report.warnings).toContainEqual({ code: 'IMPORT_W_MIGRATED', params: { from: 0, to: 1 } });
    expect(session(r).meta.version).toBe(0);
    expect(v0).toEqual(copy);
  });

  test('versione negativa', () => {
    const r = readSessionObject({ format: 'subnetcalc-session', version: -1, exportedAt: NOW });
    expect(!r.ok && r.error).toEqual({ code: 'IMPORT_BAD_FIELD', params: { field: 'version' } });
  });

  test('busta dentro la busta: rifiutata dopo la decifratura (7.3 punto 4)', () => {
    const r = readSessionText(read('23-regola3-busta-cifrata.json'), { allowEncrypted: false });
    expect(!r.ok && r.error.code).toBe('IMPORT_NESTED_ENVELOPE');
  });
});

describe('strumenti dello schema', () => {
  test('date ISO', () => {
    expect(isIsoDate('2026-11-18T22:33:00.000Z')).toBe(true);
    expect(isIsoDate('2026-11-18T22:33:00Z')).toBe(true);
    expect(isIsoDate('2024-02-29T00:00:00Z')).toBe(true);
    for (const bad of ['2026-02-29T00:00:00Z', '2026-13-01T00:00:00Z', '2026-11-18', '2026-11-18T25:00:00Z', 20261118, null]) expect(isIsoDate(bad)).toBe(false);
  });

  test('testo pulito e lunghezza in caratteri Unicode', () => {
    expect(isCleanText('VLAN 10 · Uffici')).toBe(true);
    expect(isCleanText('a\nb')).toBe(false);
    expect(isCleanText('a\nb', { multiline: true })).toBe(true);
    expect(isCleanText('a\u202Eb', { multiline: true })).toBe(false);
    expect(isCleanText(5)).toBe(false);
    expect(charLength('😀😀')).toBe(2);
  });

  test('input: ogni funzione ha la sua lista di campi; input non oggetto rifiutato', () => {
    expect(Object.keys(INPUT_KEYS).sort()).toEqual([...HISTORY_FNS].sort());
    expect(validateInput('F01', null).ok).toBe(false);
    expect(validateInput('F99', {}).ok).toBe(false);
    expect(validateInput('F02', { kind: 'number', text: '1'.repeat(201), base: 10 }).ok).toBe(false);
    expect(validateInput('F02', { kind: 'other', text: '1', base: 10 }).ok).toBe(false);
    expect(validateInput('F02', { kind: 'address', text: '10.0.0.256' }).ok).toBe(false);
    expect(validateInput('F03', { mask: 255 }).ok).toBe(false);
    expect(validateInput('F04', { ip: 167772161 }).ok).toBe(false);
    expect(validateInput('F05', { mode: 'hosts', hosts: 0 }).ok).toBe(false);
    expect(validateInput('F05', { mode: 'both', prefix: 24, hosts: 20, subnets: 10 }).ok).toBe(true); // non fattibile, ma è un risultato
    expect(validateInput('F05', { mode: 'both', prefix: 24, hosts: 0, subnets: 10 }).ok).toBe(false);
    expect(validateInput('F05', { mode: 'altro' }).ok).toBe(false);
    expect(validateInput('F07', { a: '10.0.0.1', prefixA: 24, b: '10.0.0.2', prefixB: 40 }).ok).toBe(false);
    expect(validateInput('F07', { a: '10.0.0.1', prefixA: 24, b: '10.0.0.2', gateway: 'x' }).ok).toBe(false);
    expect(validateInput('F07', { a: '10.0.0.1', prefixA: 24, b: '10.0.0.2', gateway: '' })).toEqual({ ok: true, input: { a: '10.0.0.1', prefixA: 24, b: '10.0.0.2' }, unknownKeys: 0 });
    expect(validateInput('F10', { network: '10.0.0.0', prefix: 8, acl: {}, ospf: { process: 1, area: true } }).ok).toBe(false);
    expect(validateInput('F10', { network: '10.0.0.0', prefix: 8, acl: null, ospf: {} }).ok).toBe(false);
    // F10: area OSPF come testo solo in forma pulita e breve, riportata in forma canonica (revisione I4)
    const f10i = (/** @type {any} */ area) => validateInput('F10', { network: '10.0.0.0', prefix: 8, acl: { number: 10, name: 'A', action: 'permit' }, ospf: { process: 1, area } });
    for (const bad of ['\t\u000b 0 \n', ' 0', ' '.repeat(4000) + '0', '0.0.0.0\u0000', '1'.repeat(16)]) expect(f10i(bad).ok).toBe(false);
    expect(f10i('0.0.0.1').ok && f10i('0.0.0.1').input.ospf.area).toBe('0.0.0.1');
    expect(f10i('7').ok && f10i('7').input.ospf.area).toBe('7');
    expect(f10i(7).ok && f10i(7).input.ospf.area).toBe(7);
    // F10: rete normalizzata
    const f10 = validateInput('F10', { network: '10.1.77.5', prefix: 19, acl: { number: 10, name: 'A', action: 'permit' }, ospf: { process: 1, area: 0 } });
    expect(f10.ok && f10.input.network).toBe('10.1.64.0');
    expect(subnetCount({ block: '10.0.0.0', prefix: 8, newPrefix: 30 })).toBe(4194304);
  });

  test('piani: readPlan e readLabels anche fuori dall\'import', () => {
    expect(readPlan(null)).toBeNull();
    expect(readPlan({ id: 'x', type: 'subdivision', name: 'N', createdAt: NOW, updatedAt: NOW, notes: 5, input: {} })).toBeNull();
    expect(readLabels(undefined, 4)).toEqual({ labels: {}, dropped: 0 });
    const many = Object.fromEntries(Array.from({ length: 4100 }, (_, i) => [String(i), 'x']));
    expect(readLabels(many, 5000)).toMatchObject({ dropped: 4 });
  });

  test('i valori ammessi coincidono con quelli dello stato dell\'interfaccia', () => {
    expect([...THEMES]).toEqual([...uiState.THEMES]);
    expect([...DIDACTIC_METHODS]).toEqual([...uiState.DIDACTIC_METHODS]);
    expect([...HISTORY_FNS]).toEqual([...uiState.HISTORY_FNS]);
    expect(LIMITS.history).toBe(uiState.HISTORY_MAX);
  });
});
