// @ts-check
/**
 * F04 · Tipo di indirizzo (specifica tecnica, 3.6; cap. 4).
 */
import { ok } from './result.js';
import { parseIPv4 } from './ipv4.js';
import { maskOf, assertUint32 } from './prefix.js';
import { SPECIAL_BLOCKS } from './special-blocks.js';

/** @type {ReadonlyArray<{ letter: string, min: number, max: number, defaultPrefix: number | null, leadingBits: string }>} */
const CLASSES = [
  { letter: 'A', min: 0, max: 127, defaultPrefix: 8, leadingBits: '0' },
  { letter: 'B', min: 128, max: 191, defaultPrefix: 16, leadingBits: '10' },
  { letter: 'C', min: 192, max: 223, defaultPrefix: 24, leadingBits: '110' },
  { letter: 'D', min: 224, max: 239, defaultPrefix: null, leadingBits: '1110' },
  { letter: 'E', min: 240, max: 255, defaultPrefix: null, leadingBits: '1111' },
];

/**
 * @param {number} ip uint32
 */
export function classify(ip) {
  assertUint32(ip);
  const first = ip >>> 24;
  const cls = /** @type {(typeof CLASSES)[number]} */ (CLASSES.find((c) => first >= c.min && first <= c.max));
  const blocks = SPECIAL_BLOCKS.filter((b) => ((ip & maskOf(b.prefix)) >>> 0) === b.network)
    .slice()
    .sort((a, b) => b.prefix - a.prefix)
    .map((b) => ({ code: b.code, cidr: b.cidr, network: b.network, prefix: b.prefix, scope: b.scope, ref: b.ref }));
  const scope = blocks.some((b) => b.scope === 'private') ? 'private' : blocks.length ? 'special' : 'public';
  return ok({
    ip,
    historicalClass: {
      letter: cls.letter,
      firstOctetRange: [cls.min, cls.max],
      defaultPrefix: cls.defaultPrefix,
      leadingBits: cls.leadingBits,
      reserved: first === 0 || first === 127,
    },
    scope,
    blocks,
    primary: blocks.length ? blocks[0] : null,
  });
}

/**
 * @param {unknown} text
 */
export function classifyText(text) {
  const ip = parseIPv4(text);
  return ip.ok ? classify(ip.value) : ip;
}
