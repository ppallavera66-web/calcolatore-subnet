// @ts-check
/**
 * F05 · Calcolo inverso (specifica tecnica, 3.6; cap. 11).
 */
import { ok, fail, warn } from './result.js';
import { ERR, WARN, REASON } from './errors.js';
import { parseCount, parsePrefixOrMask } from './ipv4.js';
import { maskOf, hostRule, assertPrefix } from './prefix.js';

export const MAX_HOSTS = 4294967294;

/**
 * Caso A: prefisso per N host. h minimo con 2^h ≥ N + 2 e h ≥ 2.
 * @param {number} n
 */
export function prefixForHosts(n) {
  if (!Number.isInteger(n) || n < 1 || n > MAX_HOSTS) return fail(ERR.HOSTS_RANGE, 'hosts', { value: n });
  let h = 2;
  while (2 ** h < n + 2) h++;
  const prefix = 32 - h;
  const power = 2 ** h;
  /** @type {{ prefix: number, kind: 'p2p' | 'single', usableHosts: number }[]} */
  const alternatives = [];
  if (n === 2) alternatives.push({ prefix: 31, kind: 'p2p', usableHosts: 2 });
  if (n === 1) alternatives.push({ prefix: 32, kind: 'single', usableHosts: 1 });
  return ok({
    mode: 'hosts',
    hosts: n,
    prefix,
    mask: maskOf(prefix),
    hostBits: h,
    needed: n + 2,
    power,
    usableHosts: power - 2,
    spare: power - 2 - n,
    alternatives,
  });
}

/**
 * Caso B: prefisso per S subnet ricavate da un blocco /p.
 * @param {number} blockPrefix
 * @param {number} s
 */
export function prefixForSubnets(blockPrefix, s) {
  assertPrefix(blockPrefix, 'blockPrefix');
  if (!Number.isSafeInteger(s) || s < 1) return fail(ERR.SUBNETS_RANGE, 'subnets', { value: s });
  let bits = 0;
  while (2 ** bits < s) bits++;
  const newPrefix = blockPrefix + bits;
  if (newPrefix > 32) {
    return fail(ERR.SUBNETS_TOO_MANY, 'subnets', { requested: s, max: 2 ** (32 - blockPrefix) });
  }
  const warnings = newPrefix >= 31 ? [warn(WARN.W_NO_USABLE_HOSTS, { prefix: newPrefix })] : [];
  return ok(
    {
      mode: 'subnets',
      blockPrefix,
      requested: s,
      newPrefix,
      borrowedBits: bits,
      subnets: 2 ** bits,
      spare: 2 ** bits - s,
      usableHostsPerSubnet: hostRule(newPrefix).usable,
    },
    warnings,
  );
}

/**
 * Caso C: entrambi i vincoli. Fattibile se pS ≤ pH e pH ≥ prefisso del blocco.
 * `recommended` = pH (più subnet della dimensione minima sufficiente),
 * `alternative` = pS (subnet più grandi).
 * @param {number} blockPrefix
 * @param {number} hosts
 * @param {number} subnets
 */
export function prefixForBoth(blockPrefix, hosts, subnets) {
  assertPrefix(blockPrefix, 'blockPrefix');
  const h = prefixForHosts(hosts);
  if (!h.ok) return h;
  if (!Number.isSafeInteger(subnets) || subnets < 1) return fail(ERR.SUBNETS_RANGE, 'subnets', { value: subnets });
  const pH = h.value.prefix;
  const s = prefixForSubnets(blockPrefix, subnets);
  const pS = s.ok ? s.value.newPrefix : null;

  /** @type {null | { code: string, params: Record<string, any> }} */
  let reason = null;
  if (pH < blockPrefix) {
    reason = { code: REASON.BOTH_BLOCK_TOO_SMALL, params: { blockPrefix, hostsPrefix: pH, hosts } };
  } else if (pS === null || pS > pH) {
    reason = {
      code: REASON.BOTH_CONFLICT,
      params: { blockPrefix, hostsPrefix: pH, subnetsPrefix: pS, hosts, subnets, maxSubnets: 2 ** (pH - blockPrefix) },
    };
  }
  const feasible = reason === null;
  const recommended = feasible ? pH : null;
  return ok({
    mode: 'both',
    blockPrefix,
    hosts,
    subnets,
    hostsPrefix: pH,
    subnetsPrefix: pS,
    feasible,
    range: feasible ? [pS, pH] : null,
    recommended,
    alternative: feasible ? pS : null,
    subnetsAtRecommended: feasible ? 2 ** (pH - blockPrefix) : null,
    usableHostsAtRecommended: feasible ? hostRule(pH).usable : null,
    reason,
  });
}

/**
 * @param {unknown} hostsText
 */
export function prefixForHostsText(hostsText) {
  const n = parseCount(hostsText, 'hosts');
  return n.ok ? prefixForHosts(n.value) : n;
}

/**
 * @param {unknown} blockPrefixText
 * @param {unknown} subnetsText
 */
export function prefixForSubnetsText(blockPrefixText, subnetsText) {
  const p = parsePrefixOrMask(blockPrefixText, 'prefix');
  if (!p.ok) return p;
  const s = parseCount(subnetsText, 'subnets');
  return s.ok ? prefixForSubnets(p.value.prefix, s.value) : s;
}

/**
 * @param {unknown} blockPrefixText
 * @param {unknown} hostsText
 * @param {unknown} subnetsText
 */
export function prefixForBothText(blockPrefixText, hostsText, subnetsText) {
  const p = parsePrefixOrMask(blockPrefixText, 'prefix');
  if (!p.ok) return p;
  const h = parseCount(hostsText, 'hosts');
  if (!h.ok) return h;
  const s = parseCount(subnetsText, 'subnets');
  return s.ok ? prefixForBoth(p.value.prefix, h.value, s.value) : s;
}
