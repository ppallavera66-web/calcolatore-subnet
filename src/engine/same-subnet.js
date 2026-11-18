// @ts-check
/**
 * F07 · Stessa subnet (specifica tecnica, 3.6; cap. 15).
 * Ogni host decide con la propria mask: A vede B locale se le reti coincidono con la mask di A,
 * e viceversa. Il verdetto è `same`, `different` o `asymmetric`.
 */
import { ok, fail, warn } from './result.js';
import { ERR, WARN } from './errors.js';
import { parseAddressInput, parsePrefixOrMask, parseIPv4, toDotted } from './ipv4.js';
import { maskOf, blockInfo, interestingOctet, octetAt, assertPrefix, assertUint32 } from './prefix.js';

/**
 * Lato di un host: rete propria, rete dell'altro con la propria mask, dettaglio del numero magico.
 * @param {number} self
 * @param {number} other
 * @param {number} prefix
 */
function side(self, other, prefix) {
  const mask = maskOf(prefix);
  const network = (self & mask) >>> 0;
  const otherNetwork = (other & mask) >>> 0;
  const info = blockInfo(network, prefix);
  const io = interestingOctet(prefix);
  const selfValue = octetAt(self, io.index);
  const otherValue = octetAt(other, io.index);
  const selfBlock = Math.floor(selfValue / io.magic) * io.magic;
  const otherBlock = Math.floor(otherValue / io.magic) * io.magic;
  const leftEqual = io.index === 0 || (self >>> (32 - 8 * io.index)) === (other >>> (32 - 8 * io.index));
  return {
    prefix,
    mask,
    network,
    broadcast: info.broadcast,
    hostKind: info.hostKind,
    otherNetwork,
    otherIsLocal: network === otherNetwork,
    interesting: {
      index: io.index,
      magic: io.magic,
      boundary: io.boundary,
      leftOctetsEqual: leftEqual,
      selfValue,
      selfBlockStart: selfBlock,
      selfBlockEnd: selfBlock + io.magic - 1,
      otherValue,
      otherBlockStart: otherBlock,
      otherBlockEnd: otherBlock + io.magic - 1,
    },
  };
}

/**
 * @param {{ a: number, prefixA: number, b: number, prefixB?: number | null, gateway?: number | null }} input
 */
export function sameSubnet({ a, prefixA, b, prefixB = null, gateway = null }) {
  assertUint32(a, 'a');
  assertUint32(b, 'b');
  assertPrefix(prefixA, 'prefixA');
  const pB = prefixB ?? prefixA;
  assertPrefix(pB, 'prefixB');
  if (gateway !== null) assertUint32(gateway, 'gateway');

  const sideA = side(a, b, prefixA);
  const sideB = side(b, a, pB);
  const verdict =
    sideA.otherIsLocal && sideB.otherIsLocal ? 'same' : !sideA.otherIsLocal && !sideB.otherIsLocal ? 'different' : 'asymmetric';

  const warnings = [];
  if (prefixA !== pB) warnings.push(warn(WARN.W_MASKS_DIFFER, { prefixA, prefixB: pB }));
  for (const [host, ip, s] of /** @type {const} */ ([['a', a, sideA], ['b', b, sideB]])) {
    if (s.hostKind === 'standard' && ip === s.network) warnings.push(warn(WARN.W_IS_NETWORK, { host, ip: toDotted(ip), prefix: s.prefix }));
    if (s.hostKind === 'standard' && ip === s.broadcast) warnings.push(warn(WARN.W_IS_BROADCAST, { host, ip: toDotted(ip), prefix: s.prefix }));
  }

  /** @type {null | { a: { inSubnet: boolean }, b: { inSubnet: boolean } }} */
  let gatewayCheck = null;
  if (gateway !== null) {
    const check = (/** @type {'a' | 'b'} */ host, /** @type {number} */ ip, /** @type {ReturnType<typeof side>} */ s) => {
      const inSubnet = ((gateway & s.mask) >>> 0) === s.network;
      const g = toDotted(gateway);
      if (!inSubnet) warnings.push(warn(WARN.W_GATEWAY_OUTSIDE, { host, gateway: g, network: toDotted(s.network), prefix: s.prefix }));
      else if (gateway === ip) warnings.push(warn(WARN.W_GATEWAY_IS_HOST, { host, gateway: g }));
      else if (s.hostKind === 'standard' && gateway === s.network) warnings.push(warn(WARN.W_GATEWAY_IS_NETWORK, { host, gateway: g }));
      else if (s.hostKind === 'standard' && gateway === s.broadcast) warnings.push(warn(WARN.W_GATEWAY_IS_BROADCAST, { host, gateway: g }));
      return { inSubnet };
    };
    gatewayCheck = { a: check('a', a, sideA), b: check('b', b, sideB) };
  }

  return ok(
    {
      a,
      b,
      prefixA,
      prefixB: pB,
      gateway,
      masksDiffer: prefixA !== pB,
      verdict,
      aSeesBLocal: sideA.otherIsLocal,
      bSeesALocal: sideB.otherIsLocal,
      sideA,
      sideB,
      gatewayCheck,
    },
    warnings,
  );
}

/**
 * @param {{ a: unknown, prefixA?: unknown, b: unknown, prefixB?: unknown, gateway?: unknown }} input
 *   `a` e `b` possono contenere il prefisso (`10.1.63.5/19`); i campi prefisso, se presenti, prevalgono.
 */
export function sameSubnetText({ a, prefixA, b, prefixB, gateway }) {
  const filled = (/** @type {unknown} */ v) => v !== undefined && v !== null && String(v).trim() !== '';
  const pa = parseAddressInput(a, { ipField: 'a', prefixField: 'prefixA' });
  if (!pa.ok) return pa;
  let pA = pa.value.prefix;
  if (filled(prefixA)) {
    const p = parsePrefixOrMask(prefixA, 'prefixA');
    if (!p.ok) return p;
    pA = p.value.prefix;
  }
  if (pA === null) return fail(ERR.PREFIX_EMPTY, 'prefixA');
  const pb = parseAddressInput(b, { ipField: 'b', prefixField: 'prefixB' });
  if (!pb.ok) return pb;
  let pB = pb.value.prefix;
  if (filled(prefixB)) {
    const p = parsePrefixOrMask(prefixB, 'prefixB');
    if (!p.ok) return p;
    pB = p.value.prefix;
  }
  /** @type {number | null} */
  let gw = null;
  if (filled(gateway)) {
    const g = parseIPv4(gateway, 'gateway');
    if (!g.ok) return g;
    gw = g.value;
  }
  return sameSubnet({ a: pa.value.ip, prefixA: pA, b: pb.value.ip, prefixB: pB, gateway: gw });
}
