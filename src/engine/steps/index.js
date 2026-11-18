// @ts-check
/**
 * F12 · Passaggi didattici come dati strutturati (specifica tecnica, 4).
 * `explain(fn, value, method, warnings)` → `{ fn, method, chapter, steps }`.
 */
import { analyzeBinary, validateMaskBinary, sameSubnetBinary } from './binary.js';
import { analyzeMagic, subdivideMagic, sameSubnetMagic } from './magic.js';
import { analyzeMultiples } from './multiples.js';
import { classifyRules, inverseRules, snippetRules } from './rules.js';
import { convertSteps } from './convert.js';

/** Metodi disponibili per funzione, con il capitolo di riferimento (tabella 4.2). */
export const METHODS = Object.freeze({
  F01: Object.freeze({ binary: 'cap-7', magic: 'cap-9', multiples: 'cap-12' }),
  F02: Object.freeze({ weights: 'cap-3', divisions: 'cap-3' }),
  F03: Object.freeze({ binary: 'cap-6' }),
  F04: Object.freeze({ rules: 'cap-4' }),
  F05: Object.freeze({ rules: 'cap-11' }),
  F06: Object.freeze({ magic: 'cap-11' }),
  F07: Object.freeze({ magic: 'cap-15', binary: 'cap-7' }),
  F10: Object.freeze({ rules: 'cap-14' }),
});

/** Metodo predefinito dell'impostazione (sezione 4.2). */
export const DEFAULT_METHOD = 'binary';

/**
 * @param {string} fn
 * @returns {string[]}
 */
export function methodsFor(fn) {
  const m = /** @type {Record<string, Record<string, string>>} */ (METHODS)[fn];
  if (!m) throw new RangeError(`Funzione sconosciuta: ${fn}`);
  return Object.keys(m);
}

/**
 * Il metodo richiesto se la funzione lo prevede, altrimenti il primo della riga.
 * @param {string} fn
 * @param {string | null | undefined} method
 */
export function resolveMethod(fn, method) {
  const list = methodsFor(fn);
  return method && list.includes(method) ? method : list[0];
}

/**
 * @param {string} fn `F01`…`F07`, `F10`
 * @param {any} value il campo `value` di un esito positivo della funzione
 * @param {string | null} [method]
 * @param {import('../result.js').Warning[]} [warnings] avvisi dell'esito (servono a F03)
 */
export function explain(fn, value, method = DEFAULT_METHOD, warnings = []) {
  const m = resolveMethod(fn, method);
  /** @type {import('./common.js').Step[]} */
  let steps;
  switch (fn) {
    case 'F01':
      steps = m === 'binary' ? analyzeBinary(value) : m === 'magic' ? analyzeMagic(value) : analyzeMultiples(value);
      break;
    case 'F02':
      steps = convertSteps(value, /** @type {'weights' | 'divisions'} */ (m));
      break;
    case 'F03':
      steps = validateMaskBinary(value, warnings);
      break;
    case 'F04':
      steps = classifyRules(value, value.ip);
      break;
    case 'F05':
      steps = inverseRules(value);
      break;
    case 'F06':
      steps = subdivideMagic(value);
      break;
    case 'F07':
      steps = m === 'magic' ? sameSubnetMagic(value) : sameSubnetBinary(value);
      break;
    default:
      steps = snippetRules(value);
  }
  const chapter = /** @type {Record<string, Record<string, string>>} */ (METHODS)[fn][m];
  return { fn, method: m, chapter, steps };
}
