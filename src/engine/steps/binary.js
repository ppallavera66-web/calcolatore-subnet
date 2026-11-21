// @ts-check
/**
 * Metodo binario: F01 (cap. 7, i 6 passi), F03 (cap. 6), F07 (AND con la propria mask, cap. 2 e 7).
 */
import { octetsOf, maskOf, interestingOctet } from '../prefix.js';
import { toDotted, toBinaryDotted, octetToBinary } from '../ipv4.js';
import { step, compose, joinOctets, octetsToUint, binaryDotted } from './common.js';

/**
 * F01 · i 6 passi del cap. 7.
 * @param {{ ip: number, prefix: number }} r risultato di analyze()
 */
export function analyzeBinary(r) {
  const p = r.prefix;
  const io = interestingOctet(p);
  const i = io.index;
  const ipO = octetsOf(r.ip);
  const maskO = octetsOf(maskOf(p));
  const steps = [];

  steps.push(
    step('mask-binary', 'cap-6', { prefix: p, mask: joinOctets(maskO), maskBinary: binaryDotted(maskO), index: i, maskOctet: maskO[i] }, [
      { label: 'mask', value: binaryDotted(maskO), prefix: p },
    ]),
  );

  const copied = [];
  const zeroed = [];
  for (let k = 0; k < 4; k++) {
    if (k === i) continue;
    if (maskO[k] === 255) copied.push(k);
    else zeroed.push(k);
  }
  steps.push(
    step('ip-binary', 'cap-7', { index: i, ipOctet: ipO[i], ipOctetBinary: octetToBinary(ipO[i]), copied, zeroed }, [
      { label: 'ip', value: octetToBinary(ipO[i]), prefix: io.bits },
    ]),
  );

  const netOctet = ipO[i] & maskO[i];
  const netO = compose(ipO, i, netOctet, 0);
  steps.push(
    step(
      'and-network',
      'cap-7',
      { index: i, ipOctet: ipO[i], maskOctet: maskO[i], networkOctet: netOctet, network: joinOctets(netO) },
      [
        { label: 'ip', value: octetToBinary(ipO[i]), prefix: io.bits },
        { label: 'mask', value: octetToBinary(maskO[i]), prefix: io.bits },
        { label: 'network', value: octetToBinary(netOctet), prefix: io.bits },
      ],
    ),
  );

  const net = octetsToUint(netO);
  if (p <= 30) {
    const bcOctet = netOctet | (255 - maskO[i]);
    const bcO = compose(ipO, i, bcOctet, 255);
    steps.push(
      step('or-broadcast', 'cap-7', { index: i, networkOctet: netOctet, broadcastOctet: bcOctet, rightOctets: 3 - i, broadcast: joinOctets(bcO) }, [
        { label: 'network', value: octetToBinary(netOctet), prefix: io.bits },
        { label: 'broadcast', value: octetToBinary(bcOctet), prefix: io.bits },
      ]),
    );
    const bc = octetsToUint(bcO);
    steps.push(step('host-range', 'cap-7', { firstHost: toDotted(net + 1), lastHost: toDotted(bc - 1), hostKind: 'standard' }));
    const h = 32 - p;
    steps.push(step('host-count', 'cap-7', { hostBits: h, power: 2 ** h, usableHosts: 2 ** h - 2 }));
  } else {
    const kind = p === 31 ? 'p2p' : 'single';
    steps.push(step('no-broadcast', 'cap-13', { prefix: p, hostKind: kind }));
    steps.push(step('host-range', 'cap-18', { firstHost: toDotted(net), lastHost: toDotted(p === 31 ? net + 1 : net), hostKind: kind }));
    steps.push(step('host-count-exception', 'cap-18', { prefix: p, hostKind: kind, usableHosts: p === 31 ? 2 : 1 }));
  }
  return steps;
}

/**
 * F03 · controllo della mask in binario (cap. 6).
 * @param {{ mask: number, valid: boolean, suggestions: { prefix: number, mask: number }[] }} r risultato di validateMask()
 * @param {import('../result.js').Warning[]} [warnings]
 */
export function validateMaskBinary(r, warnings = []) {
  const o = octetsOf(r.mask);
  const allowed = [0, 128, 192, 224, 240, 248, 252, 254, 255];
  const steps = [
    step('mask-octets', 'cap-6', {
      octets: o.map((value) => ({ value, binary: octetToBinary(value), allowed: allowed.includes(value) })),
    }, [{ label: 'mask', value: binaryDotted(o), prefix: Math.clz32(~r.mask >>> 0) }]),
  ];
  const bad = o.findIndex((v) => !allowed.includes(v));
  const bits = toBinaryDotted(r.mask).replace(/\./g, '');
  const contiguous = /^1*0*$/.test(bits);
  if (bad >= 0) {
    steps.push(step('mask-octet-invalid', 'cap-6', { index: bad, value: o[bad], binary: octetToBinary(o[bad]), valid: false }));
  } else if (!contiguous) {
    const firstPartial = o.findIndex((v) => v !== 255);
    const index = o.findIndex((v, k) => k > firstPartial && v !== 0);
    steps.push(step('mask-noncontiguous', 'cap-6', { index, valid: false }));
  } else {
    steps.push(step('mask-valid', 'cap-6', { prefix: bits.indexOf('0') === -1 ? 32 : bits.indexOf('0'), mask: joinOctets(o), valid: true }));
  }
  if (r.suggestions.length) {
    steps.push(
      step('mask-suggestions', 'cap-6', {
        suggestions: r.suggestions.map((s) => ({ prefix: s.prefix, mask: toDotted(s.mask) })),
      }),
    );
  }
  const hint = warnings.find((w) => w.code === 'W_LOOKS_LIKE_WILDCARD');
  if (hint) steps.push(step('mask-wildcard-hint', 'cap-14', { prefix: hint.params.prefix }));
  return steps;
}

/**
 * F07 · ogni host fa AND con la propria mask (cap. 2 e 7).
 * @param {{ a: number, b: number, prefixA: number, prefixB: number, gateway: number | null }} r risultato di sameSubnet()
 */
export function sameSubnetBinary(r) {
  const steps = [step('same-rule-binary', 'cap-2', { prefixA: r.prefixA, prefixB: r.prefixB, masksDiffer: r.prefixA !== r.prefixB })];
  /** @type {Record<string, boolean>} */
  const local = {};
  for (const [side, self, other, p] of /** @type {const} */ ([['a', r.a, r.b, r.prefixA], ['b', r.b, r.a, r.prefixB]])) {
    const maskO = octetsOf(maskOf(p));
    const selfO = octetsOf(self);
    const otherO = octetsOf(other);
    const selfNet = selfO.map((v, k) => v & maskO[k]);
    const otherNet = otherO.map((v, k) => v & maskO[k]);
    local[side] = joinOctets(selfNet) === joinOctets(otherNet);
    steps.push(
      step(
        'same-side-and',
        'cap-7',
        { side, prefix: p, self: joinOctets(selfO), other: joinOctets(otherO), selfNetwork: joinOctets(selfNet), otherNetwork: joinOctets(otherNet), local: local[side] },
        [
          { label: 'self', value: binaryDotted(selfO), prefix: p },
          { label: 'mask', value: binaryDotted(maskO), prefix: p },
          { label: 'selfNetwork', value: binaryDotted(selfNet), prefix: p },
          { label: 'other', value: binaryDotted(otherO), prefix: p },
          { label: 'otherNetwork', value: binaryDotted(otherNet), prefix: p },
        ],
      ),
    );
  }
  steps.push(step('same-verdict', 'cap-15', { verdict: local.a && local.b ? 'same' : !local.a && !local.b ? 'different' : 'asymmetric' }));
  return steps;
}
