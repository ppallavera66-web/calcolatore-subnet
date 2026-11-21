// @ts-check
import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { STRINGS, t, fmtNumber, ord, ordShort, sup, magicLabel } from '../../src/i18n/strings.it.js';
import {
  ERR, WARN, REASON, BLOCK_CODES, METHODS, explain, methodsFor,
  analyzeText, convertNumber, validateMask, prefixForHosts, prefixForSubnets, prefixForBoth, prefixForHostsText,
  subdivide, subdivideText, sameSubnetText, snippets, snippetsText, parseAddressInput, convertAddress, classifyText,
} from '../../src/engine/index.js';
import { anyResult } from './generators.js';

/** Testo valido: non vuoto e senza segnaposto rimasti. */
const clean = (/** @type {string} */ s) => s.length > 0 && !/undefined|NaN|\[object Object\]|\$\{/.test(s);

// Input che producono ogni codice di errore.
const ERROR_CASES = [
  parseAddressInput(''), parseAddressInput('1.2.3'), parseAddressInput('1.2.3.256'), parseAddressInput('1.2.03.4'),
  parseAddressInput('1.2.3.4/5/6'), parseAddressInput('1.2.3.4/'), parseAddressInput('1.2.3.4/x'), parseAddressInput('1.2.3.4/40'),
  parseAddressInput('1.2.3.4/255.0'), parseAddressInput('1.2.3.4 255.250.0.0'), parseAddressInput('1.2.3.4 255.0.255.0'), parseAddressInput('1.2.3.4 255.255.255.000'),
  convertNumber('12', 2), convertNumber('fg', 16), convertNumber('1a', 10), convertNumber('99999999999', 10), convertNumber('1', 7),
  prefixForHosts(0), prefixForSubnets(24, 0), prefixForSubnets(32, 4), subdivide(0, 24, 16), subdivide(0, 24, 26, { offset: 9 }),
  snippets(0, 8, { acl: { number: 100 } }), snippets(0, 8, { acl: { name: '?' } }), snippets(0, 8, { acl: { action: 'x' } }),
  snippets(0, 8, { ospf: { process: 0 } }), snippets(0, 8, { ospf: { area: 'x' } }),
];

// Input che producono ogni avviso e ogni passaggio meno frequente.
const RESULT_CASES = [
  ['F01', analyzeText('192.168.50.99/30')], ['F01', analyzeText('10.0.0.0/23')], ['F01', analyzeText('10.0.0.1/31')],
  ['F01', analyzeText('10.1.1.1/32')], ['F01', analyzeText('203.0.113.10/0')], ['F01', analyzeText('10.1.2.3/24')],
  ['F01', analyzeText('192.168.10.200/26')], ['F01', analyzeText('192.168.1.200/28')],
  ['F02', convertNumber('203', 10)], ['F02', convertAddress('192.168.10.75')],
  ['F03', validateMask('255.255.250.0')], ['F03', validateMask('255.255.0.255')], ['F03', validateMask('0.0.0.255')], ['F03', validateMask('255.255.255.0')],
  ['F04', classifyText('127.0.0.1')], ['F04', classifyText('0.1.2.3')], ['F04', classifyText('8.8.8.8')], ['F04', classifyText('224.0.0.5')],
  ['F05', prefixForHostsText('2')], ['F05', prefixForHosts(1)], ['F05', prefixForSubnets(30, 2)], ['F05', prefixForSubnets(31, 2)],
  ['F05', prefixForBoth(24, 20, 10)], ['F05', prefixForBoth(24, 20, 8)], ['F05', prefixForBoth(26, 100, 1)], ['F05', prefixForBoth(30, 2, 8)],
  ['F06', subdivideText('10.0.5.0/16', '', '16')], ['F06', subdivideText('10.0.0.0/8', '', '30')], ['F06', subdivideText('192.168.10.0/23', '', '26')],
  ['F06', subdivideText('10.0.0.0/30', '', '31')], ['F06', subdivideText('10.0.0.0/30', '', '32')],
  ['F07', sameSubnetText({ a: '192.168.1.10/24', b: '192.168.1.200/25', gateway: '192.168.1.1' })],
  ['F07', sameSubnetText({ a: '10.0.0.0', b: '10.0.0.255', prefixA: '24', gateway: '10.0.0.0' })],
  ['F07', sameSubnetText({ a: '10.0.0.10', b: '10.0.0.20', prefixA: '24', gateway: '10.0.0.255' })],
  ['F07', sameSubnetText({ a: '10.0.0.10', b: '10.0.0.20', prefixA: '24', gateway: '10.0.0.10' })],
  ['F07', sameSubnetText({ a: '10.1.63.5', b: '10.1.64.5', prefixA: '19' })],
  ['F10', snippetsText('192.168.10.75/26')], ['F10', snippetsText('10.1.1.1/32')], ['F10', snippetsText('0.0.0.0/0')],
];

/**
 * Codici e passaggi prodotti da un risultato, con il testo controllato.
 * @param {string} fn
 * @param {any} result
 * @param {Set<string>} seen
 */
function collect(fn, result, seen) {
  for (const w of result.warnings) {
    seen.add(w.code);
    expect(clean(t(w.code, w.params)), `${w.code}: ${t(w.code, w.params)}`).toBe(true);
  }
  for (const m of methodsFor(fn)) {
    for (const s of explain(fn, result.value, m, result.warnings).steps) {
      const key = `step.${s.id}`;
      seen.add(key);
      expect(STRINGS[key], key).toBeDefined();
      expect(clean(t(key, s.values)), `${key}: ${t(key, s.values)}`).toBe(true);
    }
  }
  if (result.value.reason) {
    seen.add(result.value.reason.code);
    expect(clean(t(result.value.reason.code, result.value.reason.params))).toBe(true);
  }
}

describe('testi italiani (strings.it.js)', () => {
  test('ogni codice di errore, avviso e motivo ha un testo', () => {
    for (const code of [...Object.values(ERR), ...Object.values(WARN), ...Object.values(REASON)]) {
      expect(STRINGS[code], code).toBeDefined();
    }
  });

  test('ogni errore prodotto dal motore ha un testo pulito; tutti i codici sono raggiunti', () => {
    const seen = new Set();
    for (const r of ERROR_CASES) {
      expect(r.ok).toBe(false);
      if (r.ok) continue;
      seen.add(r.error.code);
      expect(clean(t(r.error.code, r.error.params)), r.error.code).toBe(true);
    }
    expect([...seen].sort()).toEqual([...Object.values(ERR)].sort());
  });

  test('avvisi, motivi e passaggi: testi presenti, puliti, nessun testo orfano', () => {
    /** @type {Set<string>} */
    const seen = new Set();
    for (const [fn, r] of /** @type {[string, any][]} */ (RESULT_CASES)) {
      expect(r.ok, fn).toBe(true);
      collect(fn, r, seen);
    }
    fc.assert(fc.property(anyResult, ({ fn, result }) => { collect(fn, result, seen); }), { numRuns: 400 });

    expect([...Object.values(WARN)].filter((c) => !seen.has(c))).toEqual([]);
    expect([...Object.values(REASON)].filter((c) => !seen.has(c) && !c.startsWith('MASK_'))).toEqual([]);
    const stepKeys = Object.keys(STRINGS).filter((k) => k.startsWith('step.'));
    expect(stepKeys.filter((k) => !seen.has(k)), 'testi di passaggi mai prodotti').toEqual([]);
  });

  test('etichette: blocchi, metodi, ruoli, tipi, ambiti, verdetti', () => {
    for (const c of BLOCK_CODES) expect(STRINGS[`block.${c}`], c).toBeDefined();
    for (const fn of Object.keys(METHODS)) for (const m of methodsFor(fn)) expect(STRINGS[`method.${m}`], m).toBeDefined();
    for (const k of ['role.network', 'role.broadcast', 'role.host', 'role.p2p', 'role.single', 'kind.standard', 'kind.p2p', 'kind.single',
      'scope.private', 'scope.special', 'scope.public', 'verdict.same', 'verdict.different', 'verdict.asymmetric', 'none']) {
      expect(typeof t(k)).toBe('string');
      expect(t(k)).not.toBe(k);
    }
    expect(t('chapter', { chapter: 'cap-9' })).toBe('Capitolo 9');
    expect(t('field.gateway')).toBe('Gateway');
  });

  test('esempio della specifica (9.8): IP_LEADING_ZERO', () => {
    expect(t('IP_LEADING_ZERO', { index: 2, value: '01' })).toBe(
      'Il terzo ottetto ha uno zero iniziale (01): scrivi 1. Alcuni programmi leggono 010 come numero ottale, cioè 8.',
    );
  });

  test('codice sconosciuto → il codice stesso', () => {
    expect(t('NON_ESISTE')).toBe('NON_ESISTE');
  });

  test('formattazione', () => {
    expect(fmtNumber(4294967294)).toBe('4.294.967.294');
    expect(fmtNumber(254)).toBe('254');
    expect(fmtNumber(-1022)).toBe('−1.022');
    expect(ord(0)).toBe('primo');
    expect(ord(7)).toBe('8');
    expect(ordShort(2)).toBe('3°');
    expect(sup(16)).toBe('¹⁶');
    expect(magicLabel(256, 0)).toBe('256 · 1°');
  });

  test('qualche testo di passaggio per intero', () => {
    const r = analyzeText('172.16.45.200/20');
    const steps = r.ok ? explain('F01', r.value, 'magic').steps : [];
    expect(steps.map((s) => t(`step.${s.id}`, s.values))).toEqual([
      'Ottetto interessante del /20: il terzo, con 4 bit di rete.',
      'M = 256 − 240 = 16 (oppure 2⁴ = 16).',
      'Il multiplo di 16 che non supera 45 è 32: 45 sta tra 32 e 47. Rete 172.16.32.0.',
      'Broadcast = 32 + 16 − 1 = 47, e 255 a destra: 172.16.47.255.',
      'Host = 16 × 256 − 2 = 4.094.',
    ]);
  });
});

describe('revisione A8 · accordi, maiuscole e formulazioni', () => {
  test('plurali di bit e avanzi', () => {
    expect(t('step.subdivide-borrowed', { blockPrefix: 24, newPrefix: 25, borrowedBits: 1, count: 2 })).toMatch(/1 bit preso in prestito/);
    expect(t('step.subdivide-borrowed', { blockPrefix: 24, newPrefix: 24, borrowedBits: 0, count: 1 })).toMatch(/nessun bit preso in prestito/);
    expect(t('step.subdivide-borrowed', { blockPrefix: 16, newPrefix: 19, borrowedBits: 3, count: 8 })).toMatch(/3 bit presi in prestito/);
    expect(t('step.hosts-spare', { usableHosts: 62, spare: 1 })).toBe('Host disponibili 62: ne avanza 1.');
    expect(t('step.hosts-spare', { usableHosts: 2, spare: 0 })).toBe('Host disponibili 2: non ne avanza nessuno.');
    expect(t('step.subnets-spare', { power: 8, spare: 2, usableHostsPerSubnet: 8190 })).toBe('8 subnet, ne avanzano 2; ognuna con 8.190 host.');
    expect(t('step.subnets-prefix', { borrowedBits: 1, blockPrefix: 24, newPrefix: 25 })).toMatch(/^Si prende in prestito 1 bit/);
    expect(t('step.subnets-prefix', { borrowedBits: 0, blockPrefix: 24, newPrefix: 24 })).toMatch(/^Non serve prendere bit in prestito/);
  });
  test('iniziali maiuscole e ottetto indicato', () => {
    expect(t('step.octet-weights', { index: 2, value: 10, rows: [{ fits: true, weight: 8 }, { fits: true, weight: 2 }], binary: '00001010' })).toMatch(/^Terzo ottetto, 10/);
    expect(t('step.octet-divisions', { index: 0, value: 1, binary: '00000001' })).toMatch(/^Primo ottetto/);
    expect(t('step.mask-octet-invalid', { index: 2, value: 250, binary: '11111010' })).toMatch(/^Terzo ottetto: 250 \(11111010\)/);
  });
  test('messaggi di errore', () => {
    expect(t('SUBNETS_TOO_MANY', { requested: 3, max: 2 })).toBe('Il blocco contiene al massimo 2 subnet, ma ne servono 3.');
    expect(t('SUBNETS_TOO_MANY', { requested: 2, max: 1 })).not.toMatch(/bastano/);
    expect(t('HOSTS_RANGE', { value: 4294967295 })).toMatch(/hai scritto 4\.294\.967\.295/);
    expect(t('step.both-hosts', { hosts: 20, hostsPrefix: 27 })).not.toMatch(/al massimo/);
    expect(t('step.both-subnets', { subnets: 10, blockPrefix: 24, subnetsPrefix: 28 })).toMatch(/\/28 o uno più lungo/);
    expect(t('step.both-infeasible', { reason: 'BOTH_CONFLICT', hostsPrefix: 27, subnetsPrefix: 28 })).not.toMatch(/al massimo|almeno/);
  });
});
