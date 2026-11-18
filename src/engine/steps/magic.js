// @ts-check
/**
 * Metodo del numero magico: F01 (cap. 9 e 13, le 5 domande), F06 (cap. 11 e 13), F07 (cap. 15).
 */
import { octetsOf, interestingOctet } from '../prefix.js';
import { toDotted } from '../ipv4.js';
import { step, compose, joinOctets, octetsToUint, rightOf } from './common.js';

/**
 * Passi 1 e 2: ottetto interessante (con le convenzioni) e numero magico.
 * @param {number} p
 * @returns {import('./common.js').Step[]}
 */
export function interestingAndMagic(p) {
  const io = interestingOctet(p);
  const steps = [step('interesting-octet', 'cap-6', { prefix: p, index: io.index, bits: io.bits })];
  if (p === 0) steps.push(step('zero-prefix', 'cap-6', { prefix: 0, magic: 256 }));
  else if (io.boundary) steps.push(step('boundary-convention', 'cap-6', { prefix: p, index: io.index, magic: 1 }));
  steps.push(
    step('magic-number', 'cap-9', {
      maskOctet: 256 - 2 ** (8 - io.bits),
      bits: io.bits,
      exponent: 8 - io.bits,
      magic: 2 ** (8 - io.bits),
    }),
  );
  return steps;
}

/**
 * Passi 4 e 5: broadcast e host a partire dall'inizio del blocco nell'ottetto interessante.
 * @param {number[]} ipO
 * @param {number} p
 * @param {number} blockStart
 */
export function broadcastAndHosts(ipO, p, blockStart) {
  const io = interestingOctet(p);
  const M = 2 ** (8 - io.bits);
  const k = rightOf(io.index);
  const netO = compose(ipO, io.index, blockStart, 0);
  const net = octetsToUint(netO);
  const steps = [];
  if (p <= 30) {
    const bcOctet = blockStart + M - 1;
    const bcO = compose(ipO, io.index, bcOctet, 255);
    const bc = octetsToUint(bcO);
    steps.push(
      step('broadcast-quick', 'cap-13', {
        index: io.index,
        blockStart,
        magic: M,
        broadcastOctet: bcOctet,
        rightOctets: k,
        nextNetworkOctet: blockStart + M,
        carry: io.index > 0 && blockStart + M === 256,
        broadcast: joinOctets(bcO),
      }),
    );
    const total = M * 256 ** k;
    steps.push(
      step('host-quick', 'cap-13', {
        magic: M,
        rightOctets: k,
        total,
        usableHosts: total - 2,
        firstHost: toDotted(net + 1),
        lastHost: toDotted(bc - 1),
      }),
    );
  } else {
    const kind = p === 31 ? 'p2p' : 'single';
    steps.push(step('no-broadcast', 'cap-13', { prefix: p, hostKind: kind }));
    steps.push(
      step('host-count-exception', 'cap-13', {
        prefix: p,
        hostKind: kind,
        usableHosts: p === 31 ? 2 : 1,
        firstHost: toDotted(net),
        lastHost: toDotted(p === 31 ? net + 1 : net),
      }),
    );
  }
  return steps;
}

/**
 * F01 · numero magico.
 * @param {{ ip: number, prefix: number }} r
 */
export function analyzeMagic(r) {
  const p = r.prefix;
  const io = interestingOctet(p);
  const ipO = octetsOf(r.ip);
  const M = 2 ** (8 - io.bits);
  const v = ipO[io.index];
  // Multiplo di M che non supera il valore, cercato scorrendo i multipli come nella guida.
  let blockStart = 0;
  while (blockStart + M <= v) blockStart += M;
  const steps = interestingAndMagic(p);
  steps.push(
    step('block-multiple', 'cap-9', {
      index: io.index,
      ipOctet: v,
      magic: M,
      blockStart,
      blockEnd: blockStart + M - 1,
      network: joinOctets(compose(ipO, io.index, blockStart, 0)),
    }),
  );
  return steps.concat(broadcastAndHosts(ipO, p, blockStart));
}

/**
 * F06 · suddivisione con il numero magico.
 * @param {{ block: { network: number, prefix: number }, newPrefix: number }} r risultato di subdivide()
 */
export function subdivideMagic(r) {
  const { network, prefix } = r.block;
  const np = r.newPrefix;
  const borrowed = np - prefix;
  const count = 2 ** borrowed;
  const io = interestingOctet(np);
  const M = 2 ** (8 - io.bits);
  const size = M * 256 ** rightOf(io.index);
  const steps = [step('subdivide-borrowed', 'cap-11', { blockPrefix: prefix, newPrefix: np, borrowedBits: borrowed, count })];
  steps.push(...interestingAndMagic(np));
  steps.push(
    step('subdivide-sequence', 'cap-11', {
      index: io.index,
      magic: M,
      first: toDotted(network),
      second: count > 1 ? toDotted(network + size) : null,
      last: toDotted(network + (count - 1) * size),
      count,
    }),
  );
  const perOctet = 256 / M;
  if (count > perOctet && io.index > 0) {
    steps.push(
      step('carry', 'cap-13', {
        index: io.index,
        before: toDotted(network + (perOctet - 1) * size),
        after: toDotted(network + perOctet * size),
        subnetIndex: perOctet,
      }),
    );
  }
  if (np <= 30) {
    const total = size;
    steps.push(step('host-quick', 'cap-13', { magic: M, rightOctets: rightOf(io.index), total, usableHosts: total - 2 }));
  } else {
    steps.push(step('host-count-exception', 'cap-13', { prefix: np, hostKind: np === 31 ? 'p2p' : 'single', usableHosts: np === 31 ? 2 : 1 }));
  }
  return steps;
}

/**
 * F07 · le tre regole del cap. 15, per ciascun host con la propria mask.
 * @param {{ a: number, b: number, prefixA: number, prefixB: number }} r
 */
export function sameSubnetMagic(r) {
  const steps = [step('same-rule', 'cap-15', { prefixA: r.prefixA, prefixB: r.prefixB, masksDiffer: r.prefixA !== r.prefixB })];
  /** @type {Record<string, boolean>} */
  const local = {};
  for (const [side, self, other, p] of /** @type {const} */ ([['a', r.a, r.b, r.prefixA], ['b', r.b, r.a, r.prefixB]])) {
    const io = interestingOctet(p);
    const M = 2 ** (8 - io.bits);
    const s = octetsOf(self);
    const o = octetsOf(other);
    const leftEqual = s.slice(0, io.index).join('.') === o.slice(0, io.index).join('.');
    const sb = Math.floor(s[io.index] / M) * M;
    const ob = Math.floor(o[io.index] / M) * M;
    local[side] = leftEqual && sb === ob;
    steps.push(
      step('same-side-magic', 'cap-15', {
        side,
        prefix: p,
        index: io.index,
        magic: M,
        boundary: io.boundary,
        leftOctetsEqual: leftEqual,
        selfValue: s[io.index],
        selfBlockStart: sb,
        selfBlockEnd: sb + M - 1,
        otherValue: o[io.index],
        otherBlockStart: ob,
        otherBlockEnd: ob + M - 1,
        local: local[side],
      }),
    );
  }
  steps.push(step('same-verdict', 'cap-15', { verdict: local.a && local.b ? 'same' : !local.a && !local.b ? 'different' : 'asymmetric' }));
  return steps;
}
