// @ts-check
import { describe, test, expect } from 'vitest';
import { convertNumber, convertAddress, prefixToMask, maskToPrefix, weightsOf } from '../../src/engine/index.js';
import { val, errCode } from '../helpers.js';

describe('F02 · conversioni', () => {
  test('203 decimale (cap. 3)', () => {
    expect(val(convertNumber('203', 10))).toEqual({
      value: 203, base: 10, width: 8, dec: '203', bin: '11001011', hex: 'CB', weights: [128, 64, 8, 2, 1],
    });
  });
  test('binario con spazi, punti e 0b; esadecimale con 0x', () => {
    expect(val(convertNumber('1100 1011', 2)).value).toBe(203);
    expect(val(convertNumber('0b1011.0110', 2)).value).toBe(182);
    expect(val(convertNumber('0xCB', 16)).value).toBe(203);
    expect(val(convertNumber('cb', '16')).dec).toBe('203');
  });
  test('larghezza: 8, 32, auto', () => {
    expect(val(convertNumber('1', 10, { width: 32 })).bin).toBe('0'.repeat(31) + '1');
    expect(val(convertNumber('256', 10)).width).toBe(16);
    expect(val(convertNumber('256', 10, { width: 8 })).width).toBe(16);
    expect(val(convertNumber('0', 10)).bin).toBe('00000000');
    expect(val(convertNumber('4294967295', 10)).hex).toBe('FFFFFFFF');
  });
  test('errori', () => {
    expect(errCode(convertNumber('12', 8))).toBe('BASE_UNSUPPORTED');
    expect(errCode(convertNumber('102', 2))).toBe('NUMBER_FORMAT');
    expect(errCode(convertNumber('xyz', 16))).toBe('NUMBER_FORMAT');
    expect(errCode(convertNumber('', 10))).toBe('NUMBER_FORMAT');
    expect(errCode(convertNumber(null, 10))).toBe('NUMBER_FORMAT');
    expect(errCode(convertNumber('1.024', 10))).toBe('NUMBER_FORMAT');
    expect(errCode(convertNumber('4294967296', 10))).toBe('NUMBER_RANGE');
    expect(errCode(convertNumber('1'.repeat(33), 2))).toBe('NUMBER_RANGE');
  });
  test('indirizzo 192.168.10.75', () => {
    expect(val(convertAddress('192.168.10.75'))).toEqual({
      uint32: 3232238155,
      dotted: '192.168.10.75',
      binaryDotted: '11000000.10101000.00001010.01001011',
      hexDotted: 'C0.A8.0A.4B',
      hex32: '0xC0A80A4B',
    });
    expect(errCode(convertAddress('1.2.3'))).toBe('IP_FORMAT');
  });
  test('prefisso ↔ mask', () => {
    expect(prefixToMask(20)).toMatchObject({ maskDotted: '255.255.240.0', maskBinary: '11111111.11111111.11110000.00000000' });
    expect(val(maskToPrefix('255.255.254.0')).prefix).toBe(23);
    expect(weightsOf(0)).toEqual([]);
    expect(weightsOf(2 ** 31)).toEqual([2 ** 31]);
  });
});
