// @ts-check
import { describe, test, expect } from 'vitest';
import {
  num, ip, cidr, magic, rangeShort, range, bitSegments, addressType, message, stepText, chapterNumber, pageInfo, dateTime, historySummary,
} from '../../src/ui/format.js';
import { analyzeText, classifyText, parseIPv4 } from '../../src/engine/index.js';

const u = (/** @type {string} */ s) => {
  const r = parseIPv4(s);
  if (!r.ok) throw new Error(s);
  return r.value;
};

describe('format.js', () => {
  test('numeri con il separatore delle migliaia (m13)', () => {
    expect(num(0)).toBe('0');
    expect(num(999)).toBe('999');
    expect(num(4094)).toBe('4.094');
    expect(num(4294967296)).toBe('4.294.967.296');
  });

  test('indirizzi, broadcast assente, CIDR', () => {
    expect(ip(u('172.16.32.0'))).toBe('172.16.32.0');
    expect(ip(null)).toBe('nessuno');
    expect(cidr(u('172.16.32.0'), 20)).toBe('172.16.32.0/20');
  });

  test('numero magico con l\'ottetto, come la colonna M della cheat sheet', () => {
    const r = analyzeText('172.16.45.200/20');
    if (!r.ok) throw new Error();
    expect(magic(r.value.interesting)).toBe('16 · 3°');
    expect(magic({ magic: 256, index: 0 })).toBe('256 · 1°');
  });

  test('intervalli abbreviati come nello schizzo 9.10', () => {
    expect(rangeShort(u('172.16.32.1'), u('172.16.47.254'))).toBe('.32.1 – .47.254');
    expect(rangeShort(u('192.168.10.65'), u('192.168.10.126'))).toBe('.65 – .126');
    expect(rangeShort(u('10.128.0.1'), u('10.159.255.254'))).toBe('.128.0.1 – .159.255.254');
    expect(rangeShort(u('0.0.0.1'), u('255.255.255.254'))).toBe('0.0.0.1 – 255.255.255.254');
    expect(rangeShort(u('10.1.1.1'), u('10.1.1.1'))).toBe('10.1.1.1');
    expect(range(u('10.0.0.0'), u('10.0.0.1'))).toBe('10.0.0.0 – 10.0.0.1');
    expect(range(u('10.1.1.1'), u('10.1.1.1'))).toBe('10.1.1.1');
  });

  test('righe binarie divise in rete, host e separatori', () => {
    expect(bitSegments('11111111.11111111.11110000.00000000', 20)).toEqual([
      { text: '11111111', kind: 'net' }, { text: '.', kind: 'sep' }, { text: '11111111', kind: 'net' }, { text: '.', kind: 'sep' },
      { text: '1111', kind: 'net' }, { text: '0000', kind: 'host' }, { text: '.', kind: 'sep' }, { text: '00000000', kind: 'host' },
    ]);
    expect(bitSegments('00101101', 4)).toEqual([{ text: '0010', kind: 'net' }, { text: '1101', kind: 'host' }]);
    expect(bitSegments('00101101', 0)).toEqual([{ text: '00101101', kind: 'host' }]);
    expect(bitSegments('00101101', 8)).toEqual([{ text: '00101101', kind: 'net' }]);
    // il testo ricomposto è sempre uguale all'originale
    const v = '11000000.10101000.00001010.01001011';
    for (let p = 0; p <= 32; p++) {
      const seg = bitSegments(v, p);
      expect(seg.map((s) => s.text).join('')).toBe(v);
      expect(seg.filter((s) => s.kind === 'net').map((s) => s.text).join('').length).toBe(p);
    }
  });

  test('tipo di indirizzo per la scheda risultato (F04)', () => {
    const c = (/** @type {string} */ s) => {
      const r = classifyText(s);
      if (!r.ok) throw new Error(s);
      return addressType(r.value);
    };
    expect(c('172.16.45.200')).toMatchObject({ scope: 'Privato', badge: 'Privato', cls: 'Classe B', blockRef: '172.16.0.0/12 · RFC 1918' });
    expect(c('127.0.0.1')).toMatchObject({ scope: 'Speciale', badge: "Speciale · Loopback: l'host stesso", cls: 'Classe A (riservato)' });
    expect(c('8.8.8.8')).toMatchObject({ scope: 'Pubblico', badge: 'Pubblico', block: null, blockRef: null });
  });

  test('testi di errori, avvisi e passaggi', () => {
    expect(message({ code: 'PREFIX_RANGE', params: { value: 33 } })).toBe('Il prefisso /33 non esiste: va da /0 a /32.');
    expect(message({ code: 'W_P2P' })).toContain('/31');
    expect(stepText({ id: 'magic-number', values: { maskOctet: 240, magic: 16, exponent: 4 } })).toBe('M = 256 − 240 = 16 (oppure 2⁴ = 16).');
    expect(chapterNumber('cap-12')).toBe('12');
  });

  test('pagine di F06', () => {
    expect(pageInfo(0, 256, 8)).toEqual({ page: 0, pages: 1, from: 1, to: 8 });
    expect(pageInfo(256, 256, 600)).toEqual({ page: 1, pages: 3, from: 257, to: 512 });
    expect(pageInfo(512, 256, 600)).toEqual({ page: 2, pages: 3, from: 513, to: 600 });
    expect(pageInfo(0, 256, 4194304)).toEqual({ page: 0, pages: 16384, from: 1, to: 256 });
    expect(pageInfo(2 ** 32 - 256, 256, 2 ** 32)).toEqual({ page: 2 ** 24 - 1, pages: 2 ** 24, from: 2 ** 32 - 255, to: 2 ** 32 });
  });

  test('data e ora della cronologia', () => {
    const d = new Date(2026, 10, 19, 0, 48);
    expect(dateTime(d.toISOString())).toBe('19/11/2026 00:48');
    expect(dateTime('non è una data')).toBe('');
  });

  test('riepilogo delle voci di cronologia per ogni funzione (6.2)', () => {
    expect(historySummary({ fn: 'F01', input: { ip: '172.16.45.200', prefix: 20 } })).toBe('172.16.45.200/20');
    expect(historySummary({ fn: 'F02', input: { kind: 'number', text: '203', base: 10 } })).toBe('203 (base 10)');
    expect(historySummary({ fn: 'F02', input: { kind: 'address', text: '192.168.10.75' } })).toBe('192.168.10.75');
    expect(historySummary({ fn: 'F03', input: { mask: '255.255.250.0' } })).toBe('255.255.250.0');
    expect(historySummary({ fn: 'F04', input: { ip: '8.8.8.8' } })).toBe('8.8.8.8');
    expect(historySummary({ fn: 'F05', input: { mode: 'hosts', hosts: 1000 } })).toBe('1.000 host');
    expect(historySummary({ fn: 'F05', input: { mode: 'subnets', prefix: 16, subnets: 6 } })).toBe('/16 in 6 subnet');
    expect(historySummary({ fn: 'F05', input: { mode: 'both', prefix: 24, hosts: 20, subnets: 8 } })).toBe('/24, 20 host, 8 subnet');
    expect(historySummary({ fn: 'F06', input: { block: '10.0.0.0', prefix: 16, newPrefix: 19 } })).toBe('10.0.0.0/16 → /19');
    expect(historySummary({ fn: 'F07', input: { a: '10.1.63.5', prefixA: 19, b: '10.1.64.5' } })).toBe('10.1.63.5/19 · 10.1.64.5/19');
    expect(historySummary({ fn: 'F07', input: { a: '1.1.1.1', prefixA: 24, b: '1.1.1.2', prefixB: 25, gateway: '1.1.1.254' } })).toBe('1.1.1.1/24 · 1.1.1.2/25 · gw 1.1.1.254');
    expect(historySummary({ fn: 'F10', input: { network: '10.1.64.0', prefix: 19 } })).toBe('10.1.64.0/19');
  });
});
