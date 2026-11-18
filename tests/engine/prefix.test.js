// @ts-check
import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import {
  maskOf, wildcardOf, interestingOctet, hostRule, popcount, prefixToMask, maskToPrefix, toDotted, analyze,
} from '../../src/engine/index.js';
import { checkMask, maskToPrefixValue, assertPrefix, assertUint32, blockInfo } from '../../src/engine/prefix.js';
import { magicLabel } from '../../src/i18n/strings.it.js';
import { val } from '../helpers.js';

// Tabella 3.7 della specifica tecnica: CIDR, mask, wildcard, M · ottetto, indirizzi, host.
/** @type {[number, string, string, string, number, number][]} */
const TABLE = [
  [0, '0.0.0.0', '255.255.255.255', '256 · 1°', 4294967296, 4294967294],
  [1, '128.0.0.0', '127.255.255.255', '128 · 1°', 2147483648, 2147483646],
  [2, '192.0.0.0', '63.255.255.255', '64 · 1°', 1073741824, 1073741822],
  [3, '224.0.0.0', '31.255.255.255', '32 · 1°', 536870912, 536870910],
  [4, '240.0.0.0', '15.255.255.255', '16 · 1°', 268435456, 268435454],
  [5, '248.0.0.0', '7.255.255.255', '8 · 1°', 134217728, 134217726],
  [6, '252.0.0.0', '3.255.255.255', '4 · 1°', 67108864, 67108862],
  [7, '254.0.0.0', '1.255.255.255', '2 · 1°', 33554432, 33554430],
  [8, '255.0.0.0', '0.255.255.255', '1 · 1°', 16777216, 16777214],
  [9, '255.128.0.0', '0.127.255.255', '128 · 2°', 8388608, 8388606],
  [10, '255.192.0.0', '0.63.255.255', '64 · 2°', 4194304, 4194302],
  [11, '255.224.0.0', '0.31.255.255', '32 · 2°', 2097152, 2097150],
  [12, '255.240.0.0', '0.15.255.255', '16 · 2°', 1048576, 1048574],
  [13, '255.248.0.0', '0.7.255.255', '8 · 2°', 524288, 524286],
  [14, '255.252.0.0', '0.3.255.255', '4 · 2°', 262144, 262142],
  [15, '255.254.0.0', '0.1.255.255', '2 · 2°', 131072, 131070],
  [16, '255.255.0.0', '0.0.255.255', '1 · 2°', 65536, 65534],
  [17, '255.255.128.0', '0.0.127.255', '128 · 3°', 32768, 32766],
  [18, '255.255.192.0', '0.0.63.255', '64 · 3°', 16384, 16382],
  [19, '255.255.224.0', '0.0.31.255', '32 · 3°', 8192, 8190],
  [20, '255.255.240.0', '0.0.15.255', '16 · 3°', 4096, 4094],
  [21, '255.255.248.0', '0.0.7.255', '8 · 3°', 2048, 2046],
  [22, '255.255.252.0', '0.0.3.255', '4 · 3°', 1024, 1022],
  [23, '255.255.254.0', '0.0.1.255', '2 · 3°', 512, 510],
  [24, '255.255.255.0', '0.0.0.255', '1 · 3°', 256, 254],
  [25, '255.255.255.128', '0.0.0.127', '128 · 4°', 128, 126],
  [26, '255.255.255.192', '0.0.0.63', '64 · 4°', 64, 62],
  [27, '255.255.255.224', '0.0.0.31', '32 · 4°', 32, 30],
  [28, '255.255.255.240', '0.0.0.15', '16 · 4°', 16, 14],
  [29, '255.255.255.248', '0.0.0.7', '8 · 4°', 8, 6],
  [30, '255.255.255.252', '0.0.0.3', '4 · 4°', 4, 2],
  [31, '255.255.255.254', '0.0.0.1', '2 · 4°', 2, 2],
  [32, '255.255.255.255', '0.0.0.0', '1 · 4°', 1, 1],
];

describe('10.2 B · tabella /0–/32', () => {
  test.each(TABLE)('/%i', (p, mask, wildcard, m, total, hosts) => {
    expect(toDotted(maskOf(p))).toBe(mask);
    expect(toDotted(wildcardOf(p))).toBe(wildcard);
    const io = interestingOctet(p);
    expect(magicLabel(io.magic, io.index)).toBe(m);
    expect(hostRule(p).total).toBe(total);
    expect(hostRule(p).usable).toBe(hosts);
    const a = val(analyze(0, p));
    expect(a.totalAddresses).toBe(total);
    expect(a.usableHosts).toBe(hosts);
    expect(magicLabel(a.interesting.magic, a.interesting.index)).toBe(m);
  });

  test('maskOctet = 256 − M; per /0 vale 0, per i multipli di 8 vale 255', () => {
    for (let p = 0; p <= 32; p++) {
      const io = interestingOctet(p);
      expect(io.maskOctet).toBe(256 - io.magic);
      expect(io.boundary).toBe(p % 8 === 0);
    }
    expect(interestingOctet(0).maskOctet).toBe(0);
    expect(interestingOctet(16).maskOctet).toBe(255);
  });
});

describe('controllo delle mask', () => {
  test('motivi nell\'ordine della scheda F03', () => {
    expect(checkMask(0xffff0aff >>> 0).reason?.code).toBe('MASK_OCTET_VALUE');
    expect(checkMask(0xff00ff00 >>> 0).reason?.code).toBe('MASK_NONCONTIGUOUS');
    expect(maskToPrefixValue(0xffffff00)).toBe(24);
    expect(maskToPrefixValue(0xff00ff00)).toBe(null);
  });
  test('blockInfo', () => {
    expect(blockInfo(0, 0)).toMatchObject({ broadcast: 0xffffffff, firstHost: 1, lastHost: 0xfffffffe });
  });
  test('asserzioni sugli argomenti (errori di programmazione)', () => {
    expect(() => assertPrefix(33)).toThrow(RangeError);
    expect(() => assertPrefix(1.5)).toThrow(RangeError);
    expect(() => assertUint32(-1)).toThrow(RangeError);
    expect(() => assertUint32(2 ** 32)).toThrow(RangeError);
    expect(() => analyze(0, 40)).toThrow(RangeError);
  });
});

const prefixArb = fc.integer({ min: 0, max: 32 });

describe('proprietà sulle mask', () => {
  test('P3 · mask con 1 contigui e popcount(mask) = prefisso', () => {
    fc.assert(fc.property(prefixArb, (p) => {
      const m = maskOf(p);
      const bits = m.toString(2).padStart(32, '0');
      return /^1*0*$/.test(bits) && popcount(m) === p;
    }));
  });
  test('P4 · wildcard = NOT mask', () => {
    fc.assert(fc.property(prefixArb, (p) => wildcardOf(p) === (~maskOf(p) >>> 0) && ((wildcardOf(p) + maskOf(p)) === 0xffffffff)));
  });
  test('P7 · maskToPrefix(prefixToMask(p)) = p', () => {
    fc.assert(fc.property(prefixArb, (p) => {
      const r = maskToPrefix(toDotted(prefixToMask(p).mask));
      return r.ok && r.value.valid && r.value.prefix === p;
    }));
  });
});
