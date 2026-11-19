// @ts-check
import { describe, test, expect } from 'vitest';
import { entryFor, routeForEntry, VIEW_OF_FN } from '../../src/ui/history-map.js';
import { HISTORY_FNS } from '../../src/ui/state.js';

describe('history-map.js (6.2)', () => {
  test.each([
    ['calcola/analisi', { ip: '172.16.45.200', p: '20' }, undefined, { fn: 'F01', input: { ip: '172.16.45.200', prefix: 20 } }],
    ['calcola/analisi', { ip: '172.16.45.200/20' }, undefined, { fn: 'F01', input: { ip: '172.16.45.200', prefix: 20 } }],
    ['calcola/analisi', { ip: '10.0.0.1', p: '255.255.255.0' }, undefined, { fn: 'F01', input: { ip: '10.0.0.1', prefix: 24 } }],
    ['calcola/analisi', { ip: '8,8,8,8' }, undefined, { fn: 'F04', input: { ip: '8.8.8.8' } }],
    ['calcola/conversioni', { n: ' 203 ', b: '10' }, 'number', { fn: 'F02', input: { kind: 'number', text: '203', base: 10 } }],
    ['calcola/conversioni', { n: 'cb', b: '16' }, 'number', { fn: 'F02', input: { kind: 'number', text: 'cb', base: 16 } }],
    ['calcola/conversioni', { a: '192.168.10.75' }, 'address', { fn: 'F02', input: { kind: 'address', text: '192.168.10.75' } }],
    ['calcola/mask', { m: '255.255.250.0' }, undefined, { fn: 'F03', input: { mask: '255.255.250.0' } }],
    ['calcola/stessa', { a: '10.1.63.5', pa: '19', b: '10.1.64.5' }, undefined, { fn: 'F07', input: { a: '10.1.63.5', prefixA: 19, b: '10.1.64.5' } }],
    ['calcola/stessa', { a: '192.168.1.10/24', b: '192.168.1.200/25', gw: '192.168.1.1' }, undefined,
      { fn: 'F07', input: { a: '192.168.1.10', prefixA: 24, b: '192.168.1.200', prefixB: 25, gateway: '192.168.1.1' } }],
    ['pianifica/inverso', { h: '50' }, undefined, { fn: 'F05', input: { mode: 'hosts', hosts: 50 } }],
    ['pianifica/inverso', { p: '16', s: '6' }, undefined, { fn: 'F05', input: { mode: 'subnets', prefix: 16, subnets: 6 } }],
    ['pianifica/inverso', { p: '/24', h: '20', s: '8' }, undefined, { fn: 'F05', input: { mode: 'both', prefix: 24, hosts: 20, subnets: 8 } }],
    ['pianifica/suddivisione', { b: '10.0.5.0', p: '16', np: '19', pg: '3' }, undefined, { fn: 'F06', input: { block: '10.0.0.0', prefix: 16, newPrefix: 19 } }],
    ['pianifica/suddivisione', { b: '10.0.0.0/8', np: '30' }, undefined, { fn: 'F06', input: { block: '10.0.0.0', prefix: 8, newPrefix: 30 } }],
  ])('%s %j', (view, params, part, expected) => {
    expect(entryFor(view, params, /** @type {any} */ (part))).toEqual(expected);
  });

  test.each([
    ['calcola/analisi', { ip: '10.0.0.256' }],
    ['calcola/analisi', { ip: '10.0.0.1', p: '33' }],
    ['calcola/conversioni', { n: '12', b: '2' }],
    ['calcola/mask', { m: '255.255' }],
    ['calcola/stessa', { a: '10.0.0.1', b: '10.0.0.2' }],
    ['calcola/stessa', { a: '10.0.0.1/24', b: '10.0.0.2', gw: 'x' }],
    ['pianifica/inverso', { h: '0' }],
    ['pianifica/inverso', { caso: 'b', p: '16' }],
    ['pianifica/suddivisione', { b: '10.0.0.0/24', np: '16' }],
    ['impostazioni', {}],
  ])('input non validi → nessuna voce: %s %j', (view, params) => {
    expect(entryFor(view, params)).toBeNull();
  });

  test('andata e ritorno: la voce riapre la vista con input equivalenti', () => {
    const cases = [
      { fn: 'F01', input: { ip: '172.16.45.200', prefix: 20 } },
      { fn: 'F04', input: { ip: '8.8.8.8' } },
      { fn: 'F02', input: { kind: 'number', text: '203', base: 10 } },
      { fn: 'F02', input: { kind: 'address', text: '192.168.10.75' } },
      { fn: 'F03', input: { mask: '255.255.250.0' } },
      { fn: 'F05', input: { mode: 'hosts', hosts: 50 } },
      { fn: 'F05', input: { mode: 'subnets', prefix: 16, subnets: 6 } },
      { fn: 'F05', input: { mode: 'both', prefix: 24, hosts: 20, subnets: 8 } },
      { fn: 'F06', input: { block: '10.0.0.0', prefix: 16, newPrefix: 19 } },
      { fn: 'F07', input: { a: '10.1.63.5', prefixA: 19, b: '10.1.64.5' } },
      { fn: 'F07', input: { a: '192.168.1.10', prefixA: 24, b: '192.168.1.200', prefixB: 25, gateway: '192.168.1.1' } },
    ];
    for (const entry of cases) {
      const { view, params } = routeForEntry(entry);
      const part = /** @type {any} */ (entry.fn === 'F02' ? entry.input.kind : undefined);
      expect(entryFor(view, params, part), entry.fn).toEqual(entry);
    }
    expect(routeForEntry({ fn: 'F10', input: { network: '10.1.64.0', prefix: 19 } })).toEqual({ view: 'calcola/analisi', params: { ip: '10.1.64.0', p: '19' } });
    expect(routeForEntry({ fn: 'F99', input: {} })).toEqual({ view: 'calcola/analisi', params: {} });
  });

  test('ogni funzione della cronologia ha una vista', () => {
    for (const fn of HISTORY_FNS) expect(/** @type {Record<string, string>} */ (VIEW_OF_FN)[fn], fn).toBeDefined();
  });
});
