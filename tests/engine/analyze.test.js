// @ts-check
import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { analyze, analyzeText, maskOf, wildcardOf } from '../../src/engine/index.js';
import { ip, d, val, errCode, warnCodes } from '../helpers.js';

const A = (/** @type {string} */ text) => val(analyzeText(text));

describe('10.2 A · esempi ed esercizi della guida', () => {
  test.each([
    ['192.168.10.75/26', '192.168.10.64', '192.168.10.127', 62, 64, 3],
    ['172.16.45.200/20', '172.16.32.0', '172.16.47.255', 4094, 16, 2],
    ['10.150.33.7/11', '10.128.0.0', '10.159.255.255', 2097150, 32, 1],
    ['10.20.30.140/27', '10.20.30.128', '10.20.30.159', 30, 32, 3],
    ['192.168.1.200/28', '192.168.1.192', '192.168.1.207', 14, 16, 3],
    ['172.20.100.5/22', '172.20.100.0', '172.20.103.255', 1022, 4, 2],
    ['10.1.77.33/19', '10.1.64.0', '10.1.95.255', 8190, 32, 2],
    ['192.168.50.99/30', '192.168.50.96', '192.168.50.99', 2, 4, 3],
    ['10.0.0.255/23', '10.0.0.0', '10.0.1.255', 510, 2, 2],
    ['10.0.1.0/23', '10.0.0.0', '10.0.1.255', 510, 2, 2],
  ])('%s', (text, net, bc, hosts, magic, index) => {
    const r = A(text);
    expect(d(r.network)).toBe(net);
    expect(d(r.broadcast)).toBe(bc);
    expect(r.usableHosts).toBe(hosts);
    expect(r.interesting.magic).toBe(magic);
    expect(r.interesting.index).toBe(index);
  });

  test('scheda F01: 172.16.45.200/20 completo', () => {
    const r = A('172.16.45.200/20');
    expect(d(r.firstHost)).toBe('172.16.32.1');
    expect(d(r.lastHost)).toBe('172.16.47.254');
    expect(d(r.mask)).toBe('255.255.240.0');
    expect(d(r.wildcard)).toBe('0.0.15.255');
    expect(r.interesting).toMatchObject({ blockStart: 32, blockEnd: 47, ipOctet: 45 });
    expect(r.offset).toBe(3528);
    expect(r.role).toBe('host');
    expect(r.classification.scope).toBe('private');
    expect(d(r.previousNetwork)).toBe('172.16.16.0');
    expect(d(r.nextNetwork)).toBe('172.16.48.0');
  });

  test('192.168.50.99/30 è il broadcast (W_IS_BROADCAST)', () => {
    const r = analyzeText('192.168.50.99/30');
    expect(val(r).role).toBe('broadcast');
    expect(warnCodes(r)).toEqual(['W_IS_BROADCAST']);
  });

  test('10.0.0.255/23 e 10.0.1.0/23 sono host (cap. 18)', () => {
    expect(A('10.0.0.255/23').role).toBe('host');
    expect(A('10.0.1.0/23').role).toBe('host');
    expect(warnCodes(analyzeText('10.0.0.0/23'))).toEqual(['W_IS_NETWORK']);
  });

  test('offset: 192.168.1.200/28 = 8 (9° indirizzo), 192.168.10.75/26 = 11', () => {
    expect(A('192.168.1.200/28').offset).toBe(8);
    expect(A('192.168.10.75/26').offset).toBe(11);
  });
});

describe('10.2 C · convenzione dei multipli di 8 e /0', () => {
  test.each([
    ['10.1.2.3/8', 0, 1, 10, 10, '10.0.0.0', '10.255.255.255'],
    ['172.16.45.200/16', 1, 1, 16, 16, '172.16.0.0', '172.16.255.255'],
    ['10.1.2.3/24', 2, 1, 2, 2, '10.1.2.0', '10.1.2.255'],
    ['10.1.1.1/32', 3, 1, 1, 1, '10.1.1.1', null],
    ['203.0.113.10/0', 0, 256, 0, 255, '0.0.0.0', '255.255.255.255'],
  ])('%s', (text, index, magic, start, end, net, bc) => {
    const r = A(text);
    expect(r.interesting).toMatchObject({ index, magic, blockStart: start, blockEnd: end, boundary: true });
    expect(d(r.network)).toBe(net);
    expect(d(r.broadcast)).toBe(bc);
  });
});

describe('10.2 D · /0, /31, /32 e limiti dello spazio', () => {
  test('203.0.113.10/0', () => {
    const r = A('203.0.113.10/0');
    expect(d(r.mask)).toBe('0.0.0.0');
    expect(d(r.wildcard)).toBe('255.255.255.255');
    expect(d(r.firstHost)).toBe('0.0.0.1');
    expect(d(r.lastHost)).toBe('255.255.255.254');
    expect(r.totalAddresses).toBe(4294967296);
    expect(r.usableHosts).toBe(4294967294);
    expect(r.previousNetwork).toBe(null);
    expect(r.nextNetwork).toBe(null);
  });
  test('10.0.0.1/31', () => {
    const res = analyzeText('10.0.0.1/31');
    const r = val(res);
    expect(d(r.network)).toBe('10.0.0.0');
    expect(r.broadcast).toBe(null);
    expect(d(r.firstHost)).toBe('10.0.0.0');
    expect(d(r.lastHost)).toBe('10.0.0.1');
    expect(r.usableHosts).toBe(2);
    expect(r.role).toBe('p2p');
    expect(r.hostKind).toBe('p2p');
    expect(warnCodes(res)).toEqual(['W_P2P']);
  });
  test('192.168.1.255/31', () => {
    const r = A('192.168.1.255/31');
    expect(d(r.network)).toBe('192.168.1.254');
    expect(d(r.lastHost)).toBe('192.168.1.255');
  });
  test('10.1.1.1/32', () => {
    const res = analyzeText('10.1.1.1/32');
    const r = val(res);
    expect(r.network).toBe(r.firstHost);
    expect(r.firstHost).toBe(r.lastHost);
    expect(r.usableHosts).toBe(1);
    expect(d(r.wildcard)).toBe('0.0.0.0');
    expect(r.role).toBe('single');
    expect(warnCodes(res)).toEqual(['W_SINGLE']);
  });
  test('0.0.0.0/32 e 255.255.255.255/32', () => {
    expect(A('0.0.0.0/32').previousNetwork).toBe(null);
    expect(d(A('0.0.0.0/32').nextNetwork)).toBe('0.0.0.1');
    expect(A('255.255.255.255/32').nextNetwork).toBe(null);
    expect(d(A('255.255.255.255/32').previousNetwork)).toBe('255.255.255.254');
  });
  test('255.255.255.253/30', () => {
    const r = A('255.255.255.253/30');
    expect(d(r.network)).toBe('255.255.255.252');
    expect(d(r.broadcast)).toBe('255.255.255.255');
    expect(r.nextNetwork).toBe(null);
  });
});

describe('versione su testo', () => {
  test('prefisso nel secondo campo, anche come mask', () => {
    expect(d(val(analyzeText('172.16.45.200', '/20')).network)).toBe('172.16.32.0');
    expect(d(val(analyzeText('172.16.45.200', '255.255.240.0')).network)).toBe('172.16.32.0');
    expect(d(val(analyzeText('172.16.45.200 255.255.240.0')).network)).toBe('172.16.32.0');
  });
  test('errori', () => {
    expect(errCode(analyzeText('172.16.45.200'))).toBe('PREFIX_EMPTY');
    expect(errCode(analyzeText('172.16.45.300/20'))).toBe('IP_OCTET_RANGE');
    expect(errCode(analyzeText('172.16.45.200', '33'))).toBe('PREFIX_RANGE');
  });
});

const ipArb = fc.integer({ min: 0, max: 0xffffffff });
const pArb = fc.integer({ min: 0, max: 32 });

describe('proprietà di F01', () => {
  test('P1 · rete ≤ IP ≤ rete + indirizzi − 1', () => {
    fc.assert(fc.property(ipArb, pArb, (x, p) => {
      const r = val(analyze(x, p));
      return r.network <= x && x <= r.network + r.totalAddresses - 1;
    }));
  });
  test('P2 · rete allineata: rete mod indirizzi = 0', () => {
    fc.assert(fc.property(ipArb, pArb, (x, p) => val(analyze(x, p)).network % val(analyze(x, p)).totalAddresses === 0));
  });
  test('P5 · per p ≤ 30: broadcast = rete OR wildcard, primo = rete + 1, ultimo = broadcast − 1', () => {
    fc.assert(fc.property(ipArb, fc.integer({ min: 0, max: 30 }), (x, p) => {
      const r = val(analyze(x, p));
      return r.broadcast === ((r.network | wildcardOf(p)) >>> 0) && r.firstHost === r.network + 1 && r.lastHost === r.broadcast - 1;
    }));
  });
  test('mask e rete coerenti con AND', () => {
    fc.assert(fc.property(ipArb, pArb, (x, p) => val(analyze(x, p)).network === ((x & maskOf(p)) >>> 0)));
  });
});
