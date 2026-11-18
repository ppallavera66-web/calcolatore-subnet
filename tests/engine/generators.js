// @ts-check
/**
 * Generatori fast-check condivisi: per ogni funzione del motore produce coppie
 * { fn, result } con risultati validi, usate dalle proprietà P12 e P13.
 */
import fc from 'fast-check';
import {
  analyze, convertNumber, convertAddress, validateMaskValue, classify, prefixForHosts, prefixForSubnets, prefixForBoth,
  subdivide, sameSubnet, snippets, toDotted,
} from '../../src/engine/index.js';

const u32 = fc.integer({ min: 0, max: 0xffffffff });
const pfx = fc.integer({ min: 0, max: 32 });

/** @type {Record<string, fc.Arbitrary<{ fn: string, result: any }>>} */
export const byFunction = {
  F01: fc.tuple(u32, pfx).map(([x, p]) => ({ fn: 'F01', result: analyze(x, p) })),
  F02: fc.oneof(
    fc.tuple(u32, fc.constantFrom(2, 10, 16)).map(([x, b]) => ({ fn: 'F02', result: convertNumber(x.toString(b), b) })),
    u32.map((x) => ({ fn: 'F02', result: convertAddress(toDotted(x)) })),
  ),
  F03: fc.oneof(u32, pfx.map((p) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0))).map((m) => ({ fn: 'F03', result: validateMaskValue(m) })),
  F04: u32.map((x) => ({ fn: 'F04', result: classify(x) })),
  F05: fc.oneof(
    fc.integer({ min: 1, max: 4294967294 }).map((n) => ({ fn: 'F05', result: prefixForHosts(n) })),
    fc.tuple(pfx, fc.integer({ min: 1, max: 2 ** 20 })).map(([p, s]) => ({ fn: 'F05', result: prefixForSubnets(p, s) })),
    fc.tuple(pfx, fc.integer({ min: 1, max: 70000 }), fc.integer({ min: 1, max: 5000 })).map(([p, h, s]) => ({ fn: 'F05', result: prefixForBoth(p, h, s) })),
  ),
  F06: fc
    .tuple(u32, pfx, fc.integer({ min: 0, max: 32 }))
    .filter(([, p, k]) => p + k <= 32)
    .map(([x, p, k]) => ({ fn: 'F06', result: subdivide(x, p, p + k, { limit: 4 }) })),
  F07: fc
    .tuple(u32, pfx, u32, fc.option(pfx, { nil: null }), fc.option(u32, { nil: null }))
    .map(([a, pa, b, pb, g]) => ({ fn: 'F07', result: sameSubnet({ a, prefixA: pa, b, prefixB: pb, gateway: g }) })),
  F10: fc.tuple(u32, pfx).map(([x, p]) => ({ fn: 'F10', result: snippets(x, p) })),
};

/** Tutte le funzioni insieme, filtrando gli esiti negativi (es. SUBNETS_TOO_MANY). */
export const anyResult = fc.oneof(...Object.values(byFunction)).filter((r) => r.result.ok);
