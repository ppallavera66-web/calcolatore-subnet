// @ts-check
import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { sameSubnet, sameSubnetText } from '../../src/engine/index.js';
import { val, errCode, warnCodes } from '../helpers.js';

const S = (/** @type {any} */ input) => sameSubnetText(input);

describe('10.2 J · stessa subnet (F07)', () => {
  test.each([
    ['192.168.10.70', '192.168.10.130', '25', 'different'],
    ['192.168.10.70', '192.168.10.130', '24', 'same'],
    ['172.16.33.10', '172.16.46.200', '20', 'same'],
    ['10.1.63.5', '10.1.64.5', '19', 'different'],
  ])('tabella del cap. 15: %s e %s /%s → %s', (a, b, p, verdict) => {
    const r = val(S({ a, b, prefixA: p }));
    expect(r.verdict).toBe(verdict);
    expect(r.masksDiffer).toBe(false);
    expect(r.prefixB).toBe(Number(p));
  });

  test('dettaglio del numero magico: 10.1.63.5 e 10.1.64.5 /19', () => {
    const r = val(S({ a: '10.1.63.5', b: '10.1.64.5', prefixA: '19' }));
    expect(r.sideA.interesting).toMatchObject({
      index: 2, magic: 32, leftOctetsEqual: true, selfValue: 63, selfBlockStart: 32, selfBlockEnd: 63, otherValue: 64, otherBlockStart: 64, otherBlockEnd: 95,
    });
  });

  test('prefissi diversi: A 192.168.1.10/24, B 192.168.1.200/25, gateway .1 → asymmetric e W_GATEWAY_OUTSIDE per B', () => {
    const res = S({ a: '192.168.1.10/24', b: '192.168.1.200/25', gateway: '192.168.1.1' });
    const r = val(res);
    expect(r.verdict).toBe('asymmetric');
    expect(r.aSeesBLocal).toBe(true);
    expect(r.bSeesALocal).toBe(false);
    expect(r.gatewayInSubnet).toEqual({ a: true, b: false });
    expect(warnCodes(res)).toEqual(['W_MASKS_DIFFER', 'W_GATEWAY_OUTSIDE']);
    expect(res.ok && res.warnings[1].params).toEqual({ host: 'b', gateway: '192.168.1.1', network: '192.168.1.128', prefix: 25 });
  });

  test('A 192.168.1.10/24, B 192.168.1.20/25 → same con W_MASKS_DIFFER', () => {
    const res = S({ a: '192.168.1.10', prefixA: '24', b: '192.168.1.20', prefixB: '/25' });
    expect(val(res).verdict).toBe('same');
    expect(warnCodes(res)).toEqual(['W_MASKS_DIFFER']);
  });

  test('gateway uguale a rete, broadcast o host', () => {
    expect(warnCodes(S({ a: '10.0.0.10', b: '10.0.0.20', prefixA: '24', gateway: '10.0.0.0' }))).toEqual(['W_GATEWAY_IS_NETWORK', 'W_GATEWAY_IS_NETWORK']);
    expect(warnCodes(S({ a: '10.0.0.10', b: '10.0.0.20', prefixA: '24', gateway: '10.0.0.255' }))).toEqual(['W_GATEWAY_IS_BROADCAST', 'W_GATEWAY_IS_BROADCAST']);
    expect(warnCodes(S({ a: '10.0.0.10', b: '10.0.0.20', prefixA: '24', gateway: '10.0.0.10' }))).toEqual(['W_GATEWAY_IS_HOST']);
    expect(warnCodes(S({ a: '10.0.0.10', b: '10.0.0.20', prefixA: '24', gateway: '10.0.0.1' }))).toEqual([]);
    expect(warnCodes(S({ a: '10.0.0.10', b: '10.0.1.20', prefixA: '24', gateway: '10.0.0.1' }))).toEqual(['W_GATEWAY_OUTSIDE']);
  });

  test('A o B coincidono con rete o broadcast', () => {
    expect(warnCodes(S({ a: '10.0.0.0', b: '10.0.0.255', prefixA: '24' }))).toEqual(['W_IS_NETWORK', 'W_IS_BROADCAST']);
    expect(warnCodes(S({ a: '10.0.0.0', b: '10.0.0.1', prefixA: '31' }))).toEqual([]);
  });

  test('errori della versione su testo', () => {
    expect(S({ a: '10.0.0.1', b: '10.0.0.2' })).toEqual({ ok: false, error: { code: 'PREFIX_EMPTY', field: 'prefixA', params: {} } });
    expect(S({ a: '10.0.0', b: '10.0.0.2', prefixA: '24' })).toMatchObject({ error: { code: 'IP_FORMAT', field: 'a' } });
    expect(S({ a: '10.0.0.1', b: '10.0.0', prefixA: '24' })).toMatchObject({ error: { code: 'IP_FORMAT', field: 'b' } });
    expect(S({ a: '10.0.0.1', b: '10.0.0.2', prefixA: '40' })).toMatchObject({ error: { code: 'PREFIX_RANGE', field: 'prefixA' } });
    expect(S({ a: '10.0.0.1', b: '10.0.0.2', prefixA: '24', prefixB: 'x' })).toMatchObject({ error: { code: 'PREFIX_FORMAT', field: 'prefixB' } });
    expect(S({ a: '10.0.0.1', b: '10.0.0.2', prefixA: '24', gateway: '10.0.0' })).toMatchObject({ error: { code: 'IP_FORMAT', field: 'gateway' } });
    expect(errCode(S({ a: '10.0.0.1', b: '10.0.0.2/33', prefixA: '24' }))).toBe('PREFIX_RANGE');
  });
});

describe('P11 · con prefissi uguali F07 è simmetrico e il verdetto è same o different', () => {
  test('su coppie casuali', () => {
    const u32 = fc.integer({ min: 0, max: 0xffffffff });
    fc.assert(fc.property(u32, u32, fc.integer({ min: 0, max: 32 }), (a, b, p) => {
      const ab = val(sameSubnet({ a, prefixA: p, b }));
      const ba = val(sameSubnet({ a: b, prefixA: p, b: a }));
      return ab.verdict === ba.verdict && (ab.verdict === 'same' || ab.verdict === 'different');
    }));
  });
});
