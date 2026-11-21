// @ts-check
import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { subdivide, subdivideText, subnetAt, indexOf, iterateSubnets, blockSize, maskOf } from '../../src/engine/index.js';
import { ip, d, val, errCode, warnCodes } from '../helpers.js';

describe('10.2 I · suddivisione (F06)', () => {
  test('10.0.0.0/16 → /19: 8 subnet da 10.0.0.0 a 10.0.224.0, passo 32', () => {
    const r = val(subdivideText('10.0.0.0/16', '', '19'));
    expect(r.count).toBe(8);
    expect(r.borrowedBits).toBe(3);
    expect(r.interesting.magic).toBe(32);
    expect(r.page.items.map((s) => d(s.network))).toEqual([
      '10.0.0.0', '10.0.32.0', '10.0.64.0', '10.0.96.0', '10.0.128.0', '10.0.160.0', '10.0.192.0', '10.0.224.0',
    ]);
    expect(r.hostsPerSubnet).toBe(8190);
    expect(r.hasMore).toBe(false);
  });
  test('192.168.10.0/23 → /26: la quinta è 192.168.11.0/26 (riporto)', () => {
    const r = val(subdivideText('192.168.10.0', '23', '/26'));
    expect(r.count).toBe(8);
    expect(d(r.page.items[4].network)).toBe('192.168.11.0');
    expect(d(r.page.items[3].broadcast)).toBe('192.168.10.255');
  });
  test('10.0.0.0/8 → /30: 4.194.304 subnet, l\'ultima è 10.255.255.252/30, W_LARGE_LIST', () => {
    const r = subdivideText('10.0.0.0/8', null, '30', { offset: 4194303, limit: 1 });
    expect(val(r).count).toBe(4194304);
    expect(d(val(r).page.items[0].network)).toBe('10.255.255.252');
    expect(val(r).page.items[0].index).toBe(4194303);
    expect(warnCodes(r)).toEqual(['W_LARGE_LIST']);
  });
  test('10.0.5.0/16 → normalizzato a 10.0.0.0/16 con W_HOST_BITS_SET', () => {
    const r = subdivideText('10.0.5.0/16', '', '17');
    expect(d(val(r).block.network)).toBe('10.0.0.0');
    expect(warnCodes(r)).toEqual(['W_HOST_BITS_SET']);
  });
  test('nuovo prefisso più corto → PREFIX_SHORTER; uguale → 1 subnet e W_SAME_PREFIX', () => {
    expect(subdivideText('10.0.0.0/24', '', '16')).toEqual({ ok: false, error: { code: 'PREFIX_SHORTER', field: 'newPrefix', params: { block: 24, requested: 16 } } });
    const same = subdivideText('10.0.0.0/24', '', '24');
    expect(val(same).count).toBe(1);
    expect(warnCodes(same)).toEqual(['W_SAME_PREFIX']);
  });
  test('/31 e /32 come nuovo prefisso → W_NO_USABLE_HOSTS', () => {
    expect(warnCodes(subdivideText('10.0.0.0/30', '', '31'))).toEqual(['W_NO_USABLE_HOSTS']);
    const r = val(subdivideText('10.0.0.0/30', '', '32'));
    expect(r.page.items.map((s) => [d(s.network), s.broadcast, s.usableHosts])).toEqual([
      ['10.0.0.0', null, 1], ['10.0.0.1', null, 1], ['10.0.0.2', null, 1], ['10.0.0.3', null, 1],
    ]);
  });
  test('paginazione: prima pagina, ultima parziale, offset oltre la fine', () => {
    const first = val(subdivide(ip('10.0.0.0'), 16, 26, { offset: 0, limit: 256 }));
    expect(first.count).toBe(1024);
    expect(first.page.items).toHaveLength(256);
    expect(first.hasMore).toBe(true);
    const last = val(subdivide(ip('10.0.0.0'), 16, 26, { offset: 1000, limit: 256 }));
    expect(last.page.items).toHaveLength(24);
    expect(last.hasMore).toBe(false);
    expect(d(last.page.items[23].network)).toBe('10.0.255.192');
    expect(errCode(subdivide(ip('10.0.0.0'), 16, 26, { offset: 1024 }))).toBe('PAGE_RANGE');
    expect(errCode(subdivide(ip('10.0.0.0'), 16, 26, { offset: -1 }))).toBe('PAGE_RANGE');
    expect(errCode(subdivide(ip('10.0.0.0'), 16, 26, { limit: 0 }))).toBe('PAGE_RANGE');
    expect(errCode(subdivide(ip('10.0.0.0'), 16, 26, { limit: 65537 }))).toBe('PAGE_RANGE');
    expect(errCode(subdivide(ip('10.0.0.0'), 16, 26, { offset: 1.5 }))).toBe('PAGE_RANGE');
  });
  test('/0 → /1: due metà dello spazio', () => {
    const r = val(subdivide(0, 0, 1));
    expect(r.page.items.map((s) => d(s.network))).toEqual(['0.0.0.0', '128.0.0.0']);
    expect(d(r.page.items[1].broadcast)).toBe('255.255.255.255');
  });
  test('subnetAt e indexOf reciproci; fuori intervallo → null', () => {
    const block = ip('192.168.10.0');
    expect(d(subnetAt(block, 23, 26, 4)?.network ?? null)).toBe('192.168.11.0');
    expect(indexOf(block, 23, 26, ip('192.168.11.77'))).toBe(5);
    expect(subnetAt(block, 23, 26, 8)).toBe(null);
    expect(subnetAt(block, 23, 26, -1)).toBe(null);
    expect(indexOf(block, 23, 26, ip('192.168.12.1'))).toBe(null);
    expect([...iterateSubnets(block, 23, 26, 6)].map((s) => s.index)).toEqual([6, 7]);
    expect([...iterateSubnets(block, 23, 26)]).toHaveLength(8);
  });
  test('errori di parsing della versione su testo', () => {
    expect(errCode(subdivideText('10.0.0.0', '', '24'))).toBe('PREFIX_EMPTY');
    expect(subdivideText('10.0.0', '16', '24')).toMatchObject({ error: { code: 'IP_FORMAT', field: 'block' } });
    expect(subdivideText('10.0.0.0/16', '', 'x')).toMatchObject({ error: { code: 'PREFIX_FORMAT', field: 'newPrefix' } });
  });
});

describe('P10 · subnet disgiunte, contigue, ordinate, che coprono il blocco; indexOf(subnetAt(i)) = i', () => {
  test('su blocchi e prefissi casuali (fino a 4.096 subnet)', () => {
    const arb = fc
      .tuple(fc.integer({ min: 0, max: 0xffffffff }), fc.integer({ min: 0, max: 32 }), fc.integer({ min: 0, max: 12 }))
      .filter(([, p, k]) => p + k <= 32);
    fc.assert(fc.property(arb, ([x, p, k]) => {
      const np = p + k;
      const block = (x & maskOf(p)) >>> 0;
      const r = val(subdivide(x, p, np, { limit: 4096 }));
      const items = r.page.items;
      const size = blockSize(np);
      if (items.length !== 2 ** k || items[0].network !== block) return false;
      for (let i = 0; i < items.length; i++) {
        if (items[i].index !== i) return false;
        if (i > 0 && items[i].network !== items[i - 1].network + size) return false;
        if (indexOf(block, p, np, items[i].network) !== i) return false;
        if (indexOf(block, p, np, items[i].network + size - 1) !== i) return false;
      }
      return items[items.length - 1].network + size === block + blockSize(p);
    }));
  });
  test('indexOf(subnetAt(i)) = i anche su suddivisioni enormi', () => {
    const arb = fc.tuple(fc.integer({ min: 0, max: 8 }), fc.integer({ min: 24, max: 32 }), fc.double({ min: 0, max: 1, noNaN: true }));
    fc.assert(fc.property(arb, ([p, np, f]) => {
      const count = 2 ** (np - p);
      const i = Math.min(count - 1, Math.floor(f * count));
      const s = subnetAt(0, p, np, i);
      return s !== null && indexOf(0, p, np, s.network) === i;
    }));
  });
});
