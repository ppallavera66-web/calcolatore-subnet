// @ts-check
import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { explain, methodsFor, analyzeText } from '../../src/engine/index.js';
import { anyResult } from './generators.js';

/**
 * Vero se il valore contiene solo oggetti semplici, array, numeri finiti, stringhe, booleani e null.
 * @param {unknown} v
 * @returns {boolean}
 */
function plain(v) {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(plain);
  if (typeof v === 'object') return Object.getPrototypeOf(v) === Object.prototype && Object.values(/** @type {object} */ (v)).every(plain);
  return false;
}

describe('P13 · ogni risultato supera JSON.parse(JSON.stringify(x)) senza perdite', () => {
  test('risultati e passaggi di tutte le funzioni', () => {
    fc.assert(fc.property(anyResult, ({ fn, result }) => {
      const all = [result, ...methodsFor(fn).map((m) => explain(fn, result.value, m, result.warnings))];
      return all.every((x) => plain(x) && JSON.stringify(JSON.parse(JSON.stringify(x))) === JSON.stringify(x));
    }));
  });
  test('anche gli esiti negativi', () => {
    const r = analyzeText('10.0.0.300/8');
    expect(plain(r)).toBe(true);
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });
});
