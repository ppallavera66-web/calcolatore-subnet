// @ts-check
/**
 * F06 · Suddivisione di un blocco (specifica tecnica, 3.6; cap. 11, 13).
 */
import { ok, fail, warn } from './result.js';
import { ERR, WARN, LARGE_LIST } from './errors.js';
import { parseAddressWithPrefix, parsePrefixOrMask, toDotted } from './ipv4.js';
import { maskOf, blockSize, blockInfo, interestingOctet, hostRule, assertPrefix, assertUint32 } from './prefix.js';

export const MAX_PAGE = 65536;

/**
 * Subnet di indice `index` (da 0) di un blocco già allineato. `null` fuori intervallo.
 * @param {number} blockNetwork
 * @param {number} blockPrefix
 * @param {number} newPrefix
 * @param {number} index
 */
export function subnetAt(blockNetwork, blockPrefix, newPrefix, index) {
  const count = 2 ** (newPrefix - blockPrefix);
  if (!Number.isInteger(index) || index < 0 || index >= count) return null;
  const network = blockNetwork + index * blockSize(newPrefix);
  const info = blockInfo(network, newPrefix);
  return {
    index,
    network,
    prefix: newPrefix,
    broadcast: info.broadcast,
    firstHost: info.firstHost,
    lastHost: info.lastHost,
    usableHosts: info.usableHosts,
  };
}

/**
 * Indice della subnet che contiene `ip`, `null` se l'IP è fuori dal blocco.
 * @param {number} blockNetwork
 * @param {number} blockPrefix
 * @param {number} newPrefix
 * @param {number} ip
 */
export function indexOf(blockNetwork, blockPrefix, newPrefix, ip) {
  if (((ip & maskOf(blockPrefix)) >>> 0) !== blockNetwork) return null;
  return Math.floor((ip - blockNetwork) / blockSize(newPrefix));
}

/**
 * Generatore delle subnet da `start` (incluso) a `end` (escluso), per l'export.
 * @param {number} blockNetwork
 * @param {number} blockPrefix
 * @param {number} newPrefix
 * @param {number} [start]
 * @param {number} [end]
 */
export function* iterateSubnets(blockNetwork, blockPrefix, newPrefix, start = 0, end = 2 ** (newPrefix - blockPrefix)) {
  const last = Math.min(end, 2 ** (newPrefix - blockPrefix));
  for (let i = Math.max(0, start); i < last; i++) {
    yield /** @type {NonNullable<ReturnType<typeof subnetAt>>} */ (subnetAt(blockNetwork, blockPrefix, newPrefix, i));
  }
}

/**
 * @param {number} ip qualunque indirizzo del blocco (viene normalizzato alla rete)
 * @param {number} blockPrefix
 * @param {number} newPrefix
 * @param {{ offset?: number, limit?: number }} [page]
 */
export function subdivide(ip, blockPrefix, newPrefix, page = {}) {
  assertUint32(ip);
  assertPrefix(blockPrefix, 'blockPrefix');
  assertPrefix(newPrefix, 'newPrefix');
  if (newPrefix < blockPrefix) {
    return fail(ERR.PREFIX_SHORTER, 'newPrefix', { block: blockPrefix, requested: newPrefix });
  }
  const offset = page.offset ?? 0;
  const limit = page.limit ?? 256;
  const network = (ip & maskOf(blockPrefix)) >>> 0;
  const borrowedBits = newPrefix - blockPrefix;
  const count = 2 ** borrowedBits;
  if (!Number.isInteger(offset) || !Number.isInteger(limit) || offset < 0 || offset >= count || limit < 1 || limit > MAX_PAGE) {
    return fail(ERR.PAGE_RANGE, 'page', { offset, limit });
  }

  const warnings = [];
  if (network !== ip) warnings.push(warn(WARN.W_HOST_BITS_SET, { given: toDotted(ip), network: toDotted(network), prefix: blockPrefix }));
  if (borrowedBits === 0) warnings.push(warn(WARN.W_SAME_PREFIX, { prefix: blockPrefix }));
  if (newPrefix >= 31) warnings.push(warn(WARN.W_NO_USABLE_HOSTS, { prefix: newPrefix }));
  if (count > LARGE_LIST) warnings.push(warn(WARN.W_LARGE_LIST, { count, max: LARGE_LIST }));

  const items = [...iterateSubnets(network, blockPrefix, newPrefix, offset, offset + limit)];
  const io = interestingOctet(newPrefix);
  return ok(
    {
      block: { network, prefix: blockPrefix },
      newPrefix,
      count,
      borrowedBits,
      interesting: { index: io.index, magic: io.magic, bits: io.bits, maskOctet: io.maskOctet, boundary: io.boundary },
      subnetSize: blockSize(newPrefix),
      hostsPerSubnet: hostRule(newPrefix).usable,
      page: { offset, limit, items },
      hasMore: offset + limit < count,
    },
    warnings,
  );
}

/**
 * @param {unknown} blockText `10.0.0.0/16` oppure `10.0.0.0` con il prefisso nel secondo campo
 * @param {unknown} blockPrefixText può essere vuoto se il prefisso è nel primo campo
 * @param {unknown} newPrefixText
 * @param {{ offset?: number, limit?: number }} [page]
 */
export function subdivideText(blockText, blockPrefixText, newPrefixText, page) {
  const block = parseAddressWithPrefix(blockText, blockPrefixText, { ipField: 'block', prefixField: 'prefix' });
  if (!block.ok) return block;
  const np = parsePrefixOrMask(newPrefixText, 'newPrefix');
  if (!np.ok) return np;
  return subdivide(block.value.ip, block.value.prefix, np.value.prefix, page);
}
