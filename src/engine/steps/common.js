// @ts-check
/**
 * Strumenti comuni dei passaggi didattici (specifica tecnica, 4.1).
 * I passaggi ricalcolano i valori con l'aritmetica del proprio metodo, sugli ottetti:
 * un test verifica che i valori finali coincidano con il risultato del motore.
 */
import { octetToBinary } from '../ipv4.js';

/**
 * Riga binaria: i primi `prefix` bit sono di rete, gli altri di host. Con `bitwise` (mask non valida, F03)
 * non c'è un confine: ogni 1 e ogni 0 si mostra per quello che è e `prefix` vale null.
 * @typedef {{ label: string, value: string, prefix: number | null, bitwise?: boolean }} BitRow
 * @typedef {{ id: string, chapter: string, values: Record<string, any>, bits?: { rows: BitRow[] } }} Step
 */

/**
 * @param {string} id
 * @param {string} chapter
 * @param {Record<string, any>} values
 * @param {BitRow[]} [rows]
 * @returns {Step}
 */
export function step(id, chapter, values, rows) {
  return rows ? { id, chapter, values, bits: { rows } } : { id, chapter, values };
}

/**
 * @param {number[]} octets
 * @returns {string}
 */
export function joinOctets(octets) {
  return octets.join('.');
}

/**
 * @param {number[]} octets
 * @returns {number} uint32
 */
export function octetsToUint(octets) {
  return octets.reduce((acc, o) => acc * 256 + o, 0);
}

/**
 * Ottetti con: a sinistra di `index` quelli di `source`, in `index` il valore dato, a destra `fill`.
 * @param {number[]} source
 * @param {number} index
 * @param {number} value
 * @param {number} fill
 */
export function compose(source, index, value, fill) {
  return source.map((o, i) => (i < index ? o : i === index ? value : fill));
}

/**
 * @param {number[]} octets
 */
export function binaryDotted(octets) {
  return octets.map(octetToBinary).join('.');
}

/** Ottetti a destra dell'ottetto interessante. */
export const rightOf = (/** @type {number} */ index) => 3 - index;
