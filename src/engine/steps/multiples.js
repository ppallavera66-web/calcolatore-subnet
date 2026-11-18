// @ts-check
/**
 * Metodo dei multipli (cap. 12): come il numero magico, ma la rete si trova
 * con la divisione intera e il resto indica la distanza dalla rete.
 */
import { octetsOf, interestingOctet } from '../prefix.js';
import { step, compose, joinOctets, rightOf } from './common.js';
import { interestingAndMagic, broadcastAndHosts } from './magic.js';

/**
 * F01 · multipli.
 * @param {{ ip: number, prefix: number }} r
 */
export function analyzeMultiples(r) {
  const p = r.prefix;
  const io = interestingOctet(p);
  const ipO = octetsOf(r.ip);
  const M = 2 ** (8 - io.bits);
  const v = ipO[io.index];
  const quotient = Math.trunc(v / M);
  const blockStart = quotient * M;
  const remainder = v % M;
  // Distanza dalla rete nell'intero blocco: resto nell'ottetto interessante, più gli ottetti a destra.
  let offset = remainder;
  for (let k = io.index + 1; k < 4; k++) offset = offset * 256 + ipO[k];
  const steps = interestingAndMagic(p);
  steps.push(
    step('division', 'cap-12', {
      index: io.index,
      ipOctet: v,
      magic: M,
      quotient,
      blockStart,
      network: joinOctets(compose(ipO, io.index, blockStart, 0)),
    }),
  );
  steps.push(
    step('remainder', 'cap-12', {
      ipOctet: v,
      magic: M,
      remainder,
      blockStart: v - remainder,
      rightOctets: rightOf(io.index),
      offset,
      position: offset + 1,
      remainderIsLast: remainder === M - 1,
    }),
  );
  return steps.concat(broadcastAndHosts(ipO, p, blockStart));
}
