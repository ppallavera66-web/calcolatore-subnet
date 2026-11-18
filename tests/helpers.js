// @ts-check
import { parseIPv4, toDotted } from '../src/engine/index.js';

/**
 * Indirizzo puntato → uint32 (solo nei test, con input sicuramente validi).
 * @param {string} s
 */
export function ip(s) {
  const r = parseIPv4(s);
  if (!r.ok) throw new Error(`IP non valido nel test: ${s}`);
  return r.value;
}

/** @param {number | null} x */
export const d = (x) => (x === null ? null : toDotted(x));

/**
 * Valore di un esito positivo (fallisce il test se l'esito è negativo).
 * @template T
 * @param {import('../src/engine/result.js').Result<T>} r
 * @returns {T}
 */
export function val(r) {
  if (!r.ok) throw new Error(`Esito negativo inatteso: ${JSON.stringify(r.error)}`);
  return r.value;
}

/** Codice di errore di un esito negativo. */
export function errCode(/** @type {any} */ r) {
  return r.ok ? null : r.error.code;
}

/** Codici degli avvisi. */
export function warnCodes(/** @type {any} */ r) {
  return r.ok ? r.warnings.map((/** @type {any} */ w) => w.code) : [];
}
