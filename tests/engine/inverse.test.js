// @ts-check
import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import {
  prefixForHosts, prefixForSubnets, prefixForBoth, prefixForHostsText, prefixForSubnetsText, prefixForBothText, hostRule, toDotted,
} from '../../src/engine/index.js';
import { val, errCode, warnCodes } from '../helpers.js';

// Tabella host → prefisso del cap. 11: [min, max, prefisso]
const BANDS = [
  [1, 2, 30], [3, 6, 29], [7, 14, 28], [15, 30, 27], [31, 62, 26], [63, 126, 25], [127, 254, 24], [255, 510, 23],
  [511, 1022, 22], [1023, 2046, 21], [2047, 4094, 20], [4095, 8190, 19], [8191, 16382, 18], [16383, 32766, 17], [32767, 65534, 16],
];

describe('10.2 H · calcolo inverso (F05)', () => {
  test.each(BANDS)('fascia %i–%i → /%i (estremi)', (min, max, p) => {
    expect(val(prefixForHosts(min)).prefix).toBe(p);
    expect(val(prefixForHosts(max)).prefix).toBe(p);
  });
  test.each([[50, 26], [500, 23], [1000, 22], [62, 26], [63, 25], [4294967294, 0]])('%i host → /%i', (n, p) => {
    expect(val(prefixForHosts(n)).prefix).toBe(p);
  });
  test('43 host → /26, avanzano 19 (esempio completo del cap. 11)', () => {
    expect(val(prefixForHosts(43))).toMatchObject({ prefix: 26, hostBits: 6, needed: 45, power: 64, usableHosts: 62, spare: 19 });
    expect(toDotted(val(prefixForHosts(43)).mask)).toBe('255.255.255.192');
  });
  test('alternative /31 per 2 host e /32 per 1 host', () => {
    expect(val(prefixForHosts(2)).alternatives).toEqual([{ prefix: 31, kind: 'p2p', usableHosts: 2 }]);
    expect(val(prefixForHosts(1)).alternatives).toEqual([{ prefix: 32, kind: 'single', usableHosts: 1 }]);
    expect(val(prefixForHosts(3)).alternatives).toEqual([]);
  });
  test('0 e 4.294.967.295 → HOSTS_RANGE', () => {
    expect(errCode(prefixForHosts(0))).toBe('HOSTS_RANGE');
    expect(errCode(prefixForHosts(4294967295))).toBe('HOSTS_RANGE');
    expect(errCode(prefixForHosts(2.5))).toBe('HOSTS_RANGE');
  });

  test('subnet: /16 con 6 → /19 (8, avanzano 2); con 9 → /20 (16, avanzano 7)', () => {
    expect(val(prefixForSubnets(16, 6))).toMatchObject({ newPrefix: 19, subnets: 8, spare: 2, borrowedBits: 3, usableHostsPerSubnet: 8190 });
    expect(val(prefixForSubnets(16, 9))).toMatchObject({ newPrefix: 20, subnets: 16, spare: 7 });
    expect(val(prefixForSubnets(24, 1))).toMatchObject({ newPrefix: 24, subnets: 1, spare: 0, borrowedBits: 0 });
  });
  test('/30 con 2 → /31 e W_NO_USABLE_HOSTS; /32 con 2 → SUBNETS_TOO_MANY', () => {
    const r = prefixForSubnets(30, 2);
    expect(val(r).newPrefix).toBe(31);
    expect(warnCodes(r)).toEqual(['W_NO_USABLE_HOSTS']);
    expect(prefixForSubnets(32, 2)).toEqual({ ok: false, error: { code: 'SUBNETS_TOO_MANY', field: 'subnets', params: { requested: 2, max: 1 } } });
    expect(errCode(prefixForSubnets(24, 0))).toBe('SUBNETS_RANGE');
  });
  test('entrambi: /24, 20 host, 10 subnet → non fattibile; 8 subnet → /27', () => {
    const no = val(prefixForBoth(24, 20, 10));
    expect(no).toMatchObject({ feasible: false, hostsPrefix: 27, subnetsPrefix: 28, recommended: null, range: null });
    expect(no.reason?.code).toBe('BOTH_CONFLICT');
    const yes = val(prefixForBoth(24, 20, 8));
    expect(yes).toMatchObject({ feasible: true, range: [27, 27], recommended: 27, alternative: 27, subnetsAtRecommended: 8, usableHostsAtRecommended: 30 });
    expect(val(prefixForBoth(16, 50, 6))).toMatchObject({ feasible: true, range: [19, 26], recommended: 26, alternative: 19 });
  });
  test('entrambi: blocco troppo piccolo e subnet impossibili', () => {
    expect(val(prefixForBoth(26, 100, 1)).reason?.code).toBe('BOTH_BLOCK_TOO_SMALL');
    expect(val(prefixForBoth(30, 2, 8))).toMatchObject({ feasible: false, subnetsPrefix: null });
    expect(errCode(prefixForBoth(24, 0, 1))).toBe('HOSTS_RANGE');
    expect(errCode(prefixForBoth(24, 5, 0))).toBe('SUBNETS_RANGE');
  });
  test('versioni su testo', () => {
    expect(val(prefixForHostsText('1.000')).prefix).toBe(22);
    expect(errCode(prefixForHostsText('mille'))).toBe('NUMBER_FORMAT');
    expect(val(prefixForSubnetsText('/16', '6')).newPrefix).toBe(19);
    expect(errCode(prefixForSubnetsText('x', '6'))).toBe('PREFIX_FORMAT');
    expect(errCode(prefixForSubnetsText('16', 'sei'))).toBe('NUMBER_FORMAT');
    expect(val(prefixForBothText('24', '20', '8')).recommended).toBe(27);
    expect(errCode(prefixForBothText('99', '20', '8'))).toBe('PREFIX_RANGE');
    expect(errCode(prefixForBothText('24', 'x', '8'))).toBe('NUMBER_FORMAT');
    expect(errCode(prefixForBothText('24', '20', 'x'))).toBe('NUMBER_FORMAT');
  });
});

describe('P9 · prefixForHosts(host(p)) = p e prefixForHosts(host(p) + 1) = p − 1', () => {
  test('per p da 0 a 30', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 30 }), (p) => {
      const h = hostRule(p).usable;
      const exact = val(prefixForHosts(h)).prefix === p;
      const more = p === 0 || val(prefixForHosts(h + 1)).prefix === p - 1;
      return exact && more;
    }));
  });
});
