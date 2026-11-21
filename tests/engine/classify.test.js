// @ts-check
import { describe, test, expect } from 'vitest';
import { classify, classifyText, BLOCK_CODES, SPECIAL_BLOCKS } from '../../src/engine/index.js';
import { ip, val, errCode } from '../helpers.js';

describe('10.2 G · tipo di indirizzo (F04)', () => {
  test.each([
    ['10.1.2.3', 'A', false, 'private', 'PRIVATE'],
    ['172.31.255.255', 'B', false, 'private', 'PRIVATE'],
    ['172.32.0.1', 'B', false, 'public', null],
    ['192.168.0.1', 'C', false, 'private', 'PRIVATE'],
    ['100.64.0.1', 'A', false, 'special', 'CGNAT'],
    ['100.127.255.255', 'A', false, 'special', 'CGNAT'],
    ['100.128.0.1', 'A', false, 'public', null],
    ['127.0.0.1', 'A', true, 'special', 'LOOPBACK'],
    ['0.1.2.3', 'A', true, 'special', 'THIS_NETWORK'],
    ['169.254.10.10', 'B', false, 'special', 'LINK_LOCAL'],
    ['192.0.2.1', 'C', false, 'special', 'DOCUMENTATION'],
    ['192.0.0.0', 'C', false, 'special', 'IETF_PROTOCOL'],
    ['192.0.0.255', 'C', false, 'special', 'IETF_PROTOCOL'],
    ['192.0.1.0', 'C', false, 'public', null],
    ['198.18.0.1', 'C', false, 'special', 'BENCHMARKING'],
    ['198.19.255.255', 'C', false, 'special', 'BENCHMARKING'],
    ['198.17.255.255', 'C', false, 'public', null],
    ['198.20.0.0', 'C', false, 'public', null],
    ['198.51.100.7', 'C', false, 'special', 'DOCUMENTATION'],
    ['203.0.113.200', 'C', false, 'special', 'DOCUMENTATION'],
    ['224.0.0.5', 'D', false, 'special', 'MULTICAST'],
    ['239.255.255.255', 'D', false, 'special', 'MULTICAST'],
    ['240.0.0.1', 'E', false, 'special', 'RESERVED'],
    ['255.255.255.255', 'E', false, 'special', 'LIMITED_BROADCAST'],
    ['8.8.8.8', 'A', false, 'public', null],
    ['191.255.255.255', 'B', false, 'public', null],
    ['223.255.255.255', 'C', false, 'public', null],
  ])('%s → classe %s, %s', (addr, letter, reserved, scope, primary) => {
    const r = val(classify(ip(addr)));
    expect(r.historicalClass.letter).toBe(letter);
    expect(r.historicalClass.reserved).toBe(reserved);
    expect(r.scope).toBe(scope);
    expect(r.primary?.code ?? null).toBe(primary);
  });

  test('255.255.255.255: blocchi dal più specifico', () => {
    const r = val(classify(ip('255.255.255.255')));
    expect(r.blocks.map((b) => b.code)).toEqual(['LIMITED_BROADCAST', 'RESERVED']);
    expect(r.historicalClass).toMatchObject({ firstOctetRange: [240, 255], defaultPrefix: null });
  });

  test('prefisso di default per A, B, C', () => {
    expect(val(classify(ip('10.0.0.1'))).historicalClass.defaultPrefix).toBe(8);
    expect(val(classify(ip('150.0.0.1'))).historicalClass.defaultPrefix).toBe(16);
    expect(val(classify(ip('200.0.0.1'))).historicalClass.defaultPrefix).toBe(24);
  });

  test('versione su testo', () => {
    expect(val(classifyText('192.168.1.1')).scope).toBe('private');
    expect(errCode(classifyText('192.168.1'))).toBe('IP_FORMAT');
  });

  test('tabella dei blocchi: 15 righe, 11 codici (v1.1: IETF_PROTOCOL, BENCHMARKING)', () => {
    expect(SPECIAL_BLOCKS).toHaveLength(15);
    expect(BLOCK_CODES).toHaveLength(11);
  });
});
