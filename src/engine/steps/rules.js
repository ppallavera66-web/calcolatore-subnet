// @ts-check
/**
 * Metodi a regole: F04 (cap. 4), F05 (cap. 11, casi A, B, C), F10 (cap. 14).
 */
import { octetsOf, maskOf, interestingOctet } from '../prefix.js';
import { octetToBinary, toDotted } from '../ipv4.js';
import { step, joinOctets } from './common.js';

/**
 * F04 · classe storica e blocchi speciali.
 * @param {{ historicalClass: { letter: string, firstOctetRange: number[], defaultPrefix: number | null, leadingBits: string, reserved: boolean },
 *   scope: string, blocks: { code: string, cidr: string }[] }} r
 * @param {number} ip
 */
export function classifyRules(r, ip) {
  const first = octetsOf(ip)[0];
  const binary = octetToBinary(first);
  // Classe ricavata dai primi bit, indipendentemente dalle fasce decimali del risultato.
  const letter = binary.startsWith('0') ? 'A' : binary.startsWith('10') ? 'B' : binary.startsWith('110') ? 'C' : binary.startsWith('1110') ? 'D' : 'E';
  const hc = r.historicalClass;
  const steps = [
    step('class-first-bits', 'cap-4', { firstOctet: first, binary, leadingBits: hc.leadingBits, letter, range: hc.firstOctetRange }),
  ];
  if (first === 0 || first === 127) steps.push(step('class-reserved', 'cap-4', { firstOctet: first, kind: first === 0 ? 'THIS_NETWORK' : 'LOOPBACK' }));
  if (hc.defaultPrefix !== null) steps.push(step('class-default-prefix', 'cap-4', { letter, defaultPrefix: hc.defaultPrefix, mask: toDotted(maskOf(hc.defaultPrefix)) }));
  else steps.push(step('class-no-mask', 'cap-4', { letter }));
  if (r.blocks.length) steps.push(step('special-blocks', 'cap-4', { blocks: r.blocks.map((b) => ({ code: b.code, cidr: b.cidr })) }));
  else steps.push(step('public-address', 'cap-4', {}));
  steps.push(step('scope', 'cap-4', { scope: r.scope }));
  return steps;
}

/**
 * Numero minimo di bit h con 2^h ≥ x (calcolato con la lunghezza binaria di x − 1).
 * @param {number} x ≥ 1
 */
function bitsFor(x) {
  return x <= 1 ? 0 : (x - 1).toString(2).length;
}

/**
 * F05 · regole del cap. 11.
 * @param {Record<string, any>} r risultato di prefixForHosts/Subnets/Both
 */
export function inverseRules(r) {
  if (r.mode === 'hosts') {
    const needed = r.hosts + 2;
    const h = Math.max(2, bitsFor(needed));
    const prefix = 32 - h;
    const steps = [
      step('hosts-needed', 'cap-11', { hosts: r.hosts, needed }),
      step('hosts-power', 'cap-11', { needed, hostBits: h, power: 2 ** h }),
      step('hosts-prefix', 'cap-11', { hostBits: h, prefix, mask: toDotted(maskOf(prefix)) }),
      step('hosts-spare', 'cap-11', { usableHosts: 2 ** h - 2, hosts: r.hosts, spare: 2 ** h - 2 - r.hosts }),
    ];
    for (const alt of r.alternatives) steps.push(step('hosts-alt', 'cap-18', { altPrefix: alt.prefix, hostKind: alt.kind }));
    return steps;
  }
  if (r.mode === 'subnets') {
    const bits = bitsFor(r.requested);
    const newPrefix = r.blockPrefix + bits;
    const usable = newPrefix === 32 ? 1 : newPrefix === 31 ? 2 : 2 ** (32 - newPrefix) - 2;
    return [
      step('subnets-power', 'cap-11', { subnets: r.requested, borrowedBits: bits, power: 2 ** bits }),
      step('subnets-prefix', 'cap-11', { blockPrefix: r.blockPrefix, borrowedBits: bits, newPrefix }),
      step('subnets-spare', 'cap-11', { power: 2 ** bits, subnets: r.requested, spare: 2 ** bits - r.requested, usableHostsPerSubnet: usable }),
    ];
  }
  const pH = 32 - Math.max(2, bitsFor(r.hosts + 2));
  const bitsS = bitsFor(r.subnets);
  const pS = r.blockPrefix + bitsS <= 32 ? r.blockPrefix + bitsS : null;
  const feasible = pH >= r.blockPrefix && pS !== null && pS <= pH;
  const steps = [
    step('both-hosts', 'cap-11', { hosts: r.hosts, hostsPrefix: pH }),
    step('both-subnets', 'cap-11', { subnets: r.subnets, blockPrefix: r.blockPrefix, subnetsPrefix: pS }),
  ];
  if (feasible) {
    steps.push(
      step('both-feasible', 'cap-11', {
        range: [pS, pH],
        recommended: pH,
        alternative: pS,
        subnetsAtRecommended: 2 ** (pH - r.blockPrefix),
        feasible: true,
      }),
    );
  } else {
    steps.push(
      step('both-infeasible', 'cap-11', {
        reason: pH < r.blockPrefix ? 'BOTH_BLOCK_TOO_SMALL' : 'BOTH_CONFLICT',
        hostsPrefix: pH,
        subnetsPrefix: pS,
        blockPrefix: r.blockPrefix,
        feasible: false,
      }),
    );
  }
  return steps;
}

/**
 * F10 · wildcard con 255 − mask, oppure M − 1 nell'ottetto interessante.
 * @param {{ network: number, prefix: number }} r risultato di snippets()
 */
export function snippetRules(r) {
  const maskO = octetsOf(maskOf(r.prefix));
  const wildO = maskO.map((m) => 255 - m);
  const io = interestingOctet(r.prefix);
  const steps = [
    step('wildcard-rule', 'cap-14', {
      mask: joinOctets(maskO),
      octets: maskO.map((m, k) => ({ mask: m, wildcard: wildO[k] })),
      wildcard: joinOctets(wildO),
    }),
    step('wildcard-magic', 'cap-14', { index: io.index, magic: io.magic, wildcardOctet: io.magic - 1 }),
  ];
  if (r.prefix === 32) steps.push(step('snippet-host', 'cap-14', { network: toDotted(r.network) }));
  if (r.prefix === 0) steps.push(step('snippet-any', 'cap-14', {}));
  return steps;
}
