// @ts-check
import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import {
  parseIPv4, parsePrefix, parseMask, parsePrefixOrMask, parseAddressInput, parseAddressWithPrefix, parseCount,
  toDotted, toBinaryDotted, octetToBinary, toHexDotted, toHex32,
} from '../../src/engine/index.js';
import { ip, errCode, val } from '../helpers.js';

describe('10.2 E · parsing degli indirizzi', () => {
  test.each([
    ['192.168.1.1', '192.168.1.1'],
    [' 10.0.0.1 ', '10.0.0.1'],
    ['192,168,1,1', '192.168.1.1'],
    ['0.0.0.0', '0.0.0.0'],
    ['255.255.255.255', '255.255.255.255'],
  ])('%j è valido', (text, dotted) => {
    expect(toDotted(val(parseIPv4(text)))).toBe(dotted);
  });

  test.each([
    ['10.0.0.1/24', 24, 'cidr'],
    ['10.0.0.1 / 24', 24, 'cidr'],
    ['10.0.0.1 255.255.255.0', 24, 'mask'],
    ['10.0.0.1/255.255.255.0', 24, 'mask'],
    ['10.0.0.1   255.255.240.0', 20, 'mask'],
    ['10,0,0,1/08', 8, 'cidr'],
  ])('%j è valido con prefisso %i', (text, prefix, source) => {
    const r = val(parseAddressInput(text));
    expect(r.ip).toBe(ip('10.0.0.1'));
    expect(r.prefix).toBe(prefix);
    expect(r.prefixSource).toBe(source);
  });

  test('solo IP: prefisso null', () => {
    expect(val(parseAddressInput('10.0.0.1'))).toEqual({ ip: ip('10.0.0.1'), prefix: null, prefixSource: null });
  });

  test.each([
    ['', 'IP_EMPTY'],
    ['   ', 'IP_EMPTY'],
    ['192.168.1', 'IP_FORMAT'],
    ['192.168.1.1.1', 'IP_FORMAT'],
    ['10..0.1', 'IP_FORMAT'],
    ['a.b.c.d', 'IP_FORMAT'],
    ['１０.0.0.1', 'IP_FORMAT'],
    ['10.0.0.1234', 'IP_FORMAT'],
    ['10.0 .0.1', 'IP_FORMAT'],
    ['192.168.1.256', 'IP_OCTET_RANGE'],
    ['192.168.01.1', 'IP_LEADING_ZERO'],
  ])('parseIPv4(%j) → %s', (text, code) => {
    expect(errCode(parseIPv4(text))).toBe(code);
  });

  test('parametri degli errori: indice da 0 e valore', () => {
    expect(parseIPv4('192.168.1.256')).toEqual({ ok: false, error: { code: 'IP_OCTET_RANGE', field: 'ip', params: { index: 3, value: 256 } } });
    expect(parseIPv4('192.168.01.1')).toEqual({ ok: false, error: { code: 'IP_LEADING_ZERO', field: 'ip', params: { index: 2, value: '01' } } });
    expect(parseIPv4(null)).toMatchObject({ ok: false, error: { code: 'IP_EMPTY' } });
    expect(parseIPv4('1.2.3', 'gateway')).toMatchObject({ error: { field: 'gateway' } });
  });

  test.each([
    ['', 'IP_EMPTY'],
    ['10.0.0.1/', 'PREFIX_EMPTY'],
    ['10.0.0.1/-1', 'PREFIX_FORMAT'],
    ['10.0.0.1/x', 'PREFIX_FORMAT'],
    ['10.0.0.1/33', 'PREFIX_RANGE'],
    ['10.0.0.1 255.255.0.255', 'MASK_NONCONTIGUOUS'],
    ['10.0.0.1 255.255.250.0', 'MASK_OCTET_VALUE'],
    ['10.0.0.1/255.255.0', 'MASK_FORMAT'],
    ['10.0.0.1/24/8', 'INPUT_FORMAT'],
    ['10.0.0.1/2 4', 'INPUT_FORMAT'],
    ['10.0.0.1 24', 'INPUT_FORMAT'],
    ['10.0.0.1 255.0.0.0 x', 'INPUT_FORMAT'],
    ['10.0.0/24', 'IP_FORMAT'],
  ])('parseAddressInput(%j) → %s', (text, code) => {
    expect(errCode(parseAddressInput(text))).toBe(code);
  });

  test('la mask non valida è segnalata sul campo mask', () => {
    expect(parseAddressInput('10.0.0.1 255.255.0.255')).toEqual({
      ok: false,
      error: { code: 'MASK_NONCONTIGUOUS', field: 'mask', params: { index: 3 } },
    });
  });
});

describe('parsePrefix, parseMask, parsePrefixOrMask', () => {
  test.each([['24', 24], ['/24', 24], ['/08', 8], [' 0 ', 0], ['32', 32], [20, 20]])('%j → %i', (text, p) => {
    expect(val(parsePrefix(text))).toBe(p);
  });
  test.each([['', 'PREFIX_EMPTY'], ['/', 'PREFIX_EMPTY'], ['x', 'PREFIX_FORMAT'], ['2.5', 'PREFIX_FORMAT'], ['33', 'PREFIX_RANGE'], [2.5, 'PREFIX_FORMAT'], [-1, 'PREFIX_RANGE'], [40, 'PREFIX_RANGE']])(
    '%j → %s',
    (text, code) => expect(errCode(parsePrefix(text))).toBe(code),
  );
  test('mask', () => {
    expect(val(parseMask('255.255.240.0'))).toBe(20);
    expect(errCode(parseMask('255.255.240'))).toBe('MASK_FORMAT');
    expect(errCode(parseMask(undefined))).toBe('MASK_FORMAT');
  });
  test('prefisso o mask', () => {
    expect(val(parsePrefixOrMask('/20'))).toEqual({ prefix: 20, source: 'cidr' });
    expect(val(parsePrefixOrMask('255,255,240,0'))).toEqual({ prefix: 20, source: 'mask' });
    expect(val(parsePrefixOrMask(12))).toEqual({ prefix: 12, source: 'cidr' });
    expect(errCode(parsePrefixOrMask('255.0.255.0'))).toBe('MASK_NONCONTIGUOUS');
    expect(errCode(parsePrefixOrMask('abc'))).toBe('PREFIX_FORMAT');
  });
  test('indirizzo con prefisso obbligatorio', () => {
    expect(val(parseAddressWithPrefix('10.0.0.1/8'))).toEqual({ ip: ip('10.0.0.1'), prefix: 8 });
    expect(val(parseAddressWithPrefix('10.0.0.1/8', '/16'))).toEqual({ ip: ip('10.0.0.1'), prefix: 16 });
    expect(val(parseAddressWithPrefix('10.0.0.1', '255.255.0.0'))).toEqual({ ip: ip('10.0.0.1'), prefix: 16 });
    expect(errCode(parseAddressWithPrefix('10.0.0.1'))).toBe('PREFIX_EMPTY');
    expect(errCode(parseAddressWithPrefix('10.0.0.1', '  '))).toBe('PREFIX_EMPTY');
    expect(errCode(parseAddressWithPrefix('10.0.0.1', 'x'))).toBe('PREFIX_FORMAT');
    expect(errCode(parseAddressWithPrefix('10.0.0', '8'))).toBe('IP_FORMAT');
  });
  test('conteggi', () => {
    expect(val(parseCount('1.000', 'hosts'))).toBe(1000);
    expect(val(parseCount(' 50 ', 'hosts'))).toBe(50);
    expect(val(parseCount(7, 'hosts'))).toBe(7);
    expect(errCode(parseCount('5a', 'hosts'))).toBe('NUMBER_FORMAT');
    // separatore delle migliaia solo a gruppi di tre cifre (revisione A2)
    expect(val(parseCount('1 000 000', 'hosts'))).toBe(1000000);
    expect(val(parseCount('65.534', 'hosts'))).toBe(65534);
    for (const bad of ['100.0', '2.5', '1.00', '1 0', '1.0000', '.500', '500.', '1..000', '12345678901234567']) expect(errCode(parseCount(bad, 'hosts'))).toBe('NUMBER_FORMAT');
    expect(errCode(parseCount(1.5, 'hosts'))).toBe('NUMBER_FORMAT');
    expect(errCode(parseCount('', 'hosts'))).toBe('NUMBER_FORMAT');
    expect(errCode(parseCount(null, 'hosts'))).toBe('NUMBER_FORMAT');
  });
});

describe('formattazione tecnica (F02, esempio della scheda)', () => {
  test('192.168.10.75', () => {
    const x = ip('192.168.10.75');
    expect(toBinaryDotted(x)).toBe('11000000.10101000.00001010.01001011');
    expect(toHexDotted(x)).toBe('C0.A8.0A.4B');
    expect(toHex32(x)).toBe('0xC0A80A4B');
    expect(x).toBe(3232238155);
    expect(octetToBinary(203)).toBe('11001011');
  });
});

describe('P8 · parseIPv4(toDotted(x)) = x', () => {
  test('per ogni intero a 32 bit', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 0xffffffff }), (x) => {
      const r = parseIPv4(toDotted(x));
      return r.ok && r.value === x;
    }));
  });
});
