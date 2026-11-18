// @ts-check
/**
 * F01 · Analisi subnet (specifica tecnica, 3.6; cap. 7, 9, 13).
 */
import { ok, warn } from './result.js';
import { WARN } from './errors.js';
import { parseAddressWithPrefix, toDotted } from './ipv4.js';
import {
  maskOf,
  wildcardOf,
  blockSize,
  blockInfo,
  interestingOctet,
  octetAt,
  assertPrefix,
  assertUint32,
} from './prefix.js';
import { classify } from './classify.js';

/**
 * @param {number} ip uint32
 * @param {number} prefix 0–32
 */
export function analyze(ip, prefix) {
  assertUint32(ip);
  assertPrefix(prefix);
  const mask = maskOf(prefix);
  const wildcard = wildcardOf(prefix);
  const network = (ip & mask) >>> 0;
  const size = blockSize(prefix);
  const info = blockInfo(network, prefix);
  const io = interestingOctet(prefix);
  const blockStart = octetAt(network, io.index);
  const fullBroadcast = (network | wildcard) >>> 0;

  /** @type {'network' | 'broadcast' | 'host' | 'p2p' | 'single'} */
  let role = 'host';
  if (info.hostKind === 'single') role = 'single';
  else if (info.hostKind === 'p2p') role = 'p2p';
  else if (ip === network) role = 'network';
  else if (ip === fullBroadcast) role = 'broadcast';

  const warnings = [];
  if (role === 'network') warnings.push(warn(WARN.W_IS_NETWORK, { ip: toDotted(ip), prefix }));
  if (role === 'broadcast') warnings.push(warn(WARN.W_IS_BROADCAST, { ip: toDotted(ip), prefix }));
  if (role === 'p2p') warnings.push(warn(WARN.W_P2P, { prefix }));
  if (role === 'single') warnings.push(warn(WARN.W_SINGLE, { prefix }));

  const previous = network - size;
  const next = network + size;

  return ok(
    {
      ip,
      prefix,
      mask,
      wildcard,
      network,
      broadcast: info.broadcast,
      firstHost: info.firstHost,
      lastHost: info.lastHost,
      totalAddresses: size,
      usableHosts: info.usableHosts,
      hostBits: 32 - prefix,
      hostKind: info.hostKind,
      interesting: {
        index: io.index,
        magic: io.magic,
        bits: io.bits,
        maskOctet: io.maskOctet,
        boundary: io.boundary,
        ipOctet: octetAt(ip, io.index),
        blockStart,
        blockEnd: blockStart + io.magic - 1,
      },
      offset: ip - network,
      role,
      previousNetwork: previous >= 0 ? previous : null,
      nextNetwork: next <= 0xffffffff ? next : null,
      classification: classify(ip).value,
    },
    warnings,
  );
}

/**
 * @param {unknown} ipText `IP`, `IP/n`, `IP mask`
 * @param {unknown} [prefixText] `n`, `/n` o mask; se presente prevale su quello nel primo campo
 */
export function analyzeText(ipText, prefixText) {
  const input = parseAddressWithPrefix(ipText, prefixText);
  return input.ok ? analyze(input.value.ip, input.value.prefix) : input;
}
