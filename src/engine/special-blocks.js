// @ts-check
/**
 * Blocchi speciali del cap. 4 della guida, più le classi D ed E (m11).
 * Dalla v1.1: 192.0.0.0/24 (RFC 6890) e 198.18.0.0/15 (RFC 2544), decisi nella revisione finale.
 * Ordine indifferente: classify() ordina dal più specifico.
 */

/**
 * @typedef {{ cidr: string, network: number, prefix: number, code: string,
 *   scope: 'private' | 'special', ref: string }} SpecialBlock
 */

/** @type {ReadonlyArray<[string, string, 'private' | 'special', string]>} */
const TABLE = [
  ['0.0.0.0/8', 'THIS_NETWORK', 'special', 'RFC 1122'],
  ['10.0.0.0/8', 'PRIVATE', 'private', 'RFC 1918'],
  ['100.64.0.0/10', 'CGNAT', 'special', 'RFC 6598'],
  ['127.0.0.0/8', 'LOOPBACK', 'special', 'RFC 1122'],
  ['169.254.0.0/16', 'LINK_LOCAL', 'special', 'RFC 3927'],
  ['172.16.0.0/12', 'PRIVATE', 'private', 'RFC 1918'],
  ['192.0.0.0/24', 'IETF_PROTOCOL', 'special', 'RFC 6890'],
  ['192.0.2.0/24', 'DOCUMENTATION', 'special', 'RFC 5737'],
  ['192.168.0.0/16', 'PRIVATE', 'private', 'RFC 1918'],
  ['198.18.0.0/15', 'BENCHMARKING', 'special', 'RFC 2544'],
  ['198.51.100.0/24', 'DOCUMENTATION', 'special', 'RFC 5737'],
  ['203.0.113.0/24', 'DOCUMENTATION', 'special', 'RFC 5737'],
  ['224.0.0.0/4', 'MULTICAST', 'special', 'RFC 5771'],
  ['240.0.0.0/4', 'RESERVED', 'special', 'RFC 1112'],
  ['255.255.255.255/32', 'LIMITED_BROADCAST', 'special', 'RFC 919'],
];

/**
 * @param {string} cidr
 * @returns {{ network: number, prefix: number }}
 */
function parseCidr(cidr) {
  const [addr, len] = cidr.split('/');
  const network = addr.split('.').reduce((acc, o) => acc * 256 + Number(o), 0) >>> 0;
  return { network, prefix: Number(len) };
}

/** @type {ReadonlyArray<SpecialBlock>} */
export const SPECIAL_BLOCKS = Object.freeze(
  TABLE.map(([cidr, code, scope, ref]) => Object.freeze({ cidr, ...parseCidr(cidr), code, scope, ref })),
);

/** Codici distinti dei blocchi, per i testi. */
export const BLOCK_CODES = Object.freeze([...new Set(TABLE.map((r) => r[1]))]);
