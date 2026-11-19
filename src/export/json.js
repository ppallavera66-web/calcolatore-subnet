// @ts-check
/**
 * JSON di un risultato (5.2): `{ format: "subnetcalc-result", version: 1, exportedAt, fn, input, output }`,
 * numeri senza separatori e indirizzi in forma puntata. È un formato diverso dalla sessione (6).
 * Con "Includi i passaggi" aggiunge `steps`: i passaggi come dati strutturati (metodo, capitolo, valori).
 */
import { toDotted, explain, iterateSubnets } from '../engine/index.js';

export const RESULT_FORMAT = 'subnetcalc-result';
export const RESULT_VERSION = 1;

/** Campi che nel motore contengono sempre un indirizzo a 32 bit (uint32). */
const ADDRESS_KEYS = new Set(['ip', 'mask', 'wildcard', 'network', 'broadcast', 'firstHost', 'lastHost', 'previousNetwork', 'nextNetwork', 'a', 'b', 'gateway', 'otherNetwork']);

/**
 * Copia del valore con gli indirizzi in forma puntata.
 * @param {any} v
 * @param {string | null} [key]
 * @returns {any}
 */
export function withDotted(v, key = null) {
  if (typeof v === 'number' && key !== null && ADDRESS_KEYS.has(key) && Number.isInteger(v) && v >= 0 && v <= 0xffffffff) return toDotted(v);
  if (Array.isArray(v)) return v.map((x) => withDotted(x));
  if (v && typeof v === 'object') {
    /** @type {Record<string, any>} */
    const out = {};
    for (const [k, x] of Object.entries(v)) out[k] = withDotted(x, k);
    return out;
  }
  return v;
}

/**
 * @param {{ fn: string, input: Record<string, any>, output: any, now: string,
 *   steps?: { fn: string, value: any, method: string, warnings?: any[] }[], warnings?: any[] }} o
 */
export function toResultJson(o) {
  /** @type {Record<string, any>} */
  const doc = {
    format: RESULT_FORMAT,
    version: RESULT_VERSION,
    exportedAt: o.now,
    fn: o.fn,
    input: o.input,
    output: withDotted(o.output),
  };
  if (o.warnings?.length) doc.warnings = o.warnings;
  if (o.steps?.length) doc.steps = o.steps.map((s) => withDotted(explain(s.fn, s.value, s.method, s.warnings ?? [])));
  return `${JSON.stringify(doc, null, 2)}\n`;
}

/**
 * Uscita di F06 per un intervallo di subnet [start, end): il riepilogo del motore senza la pagina,
 * più le subnet dell'intervallo (con l'etichetta del piano, se c'è).
 * @param {any} v valore di `subdivide`
 * @param {[number, number]} range
 * @param {Record<string, string> | null} [labels]
 */
export function subdivideOutput(v, range, labels = null) {
  const { page: _page, hasMore: _more, ...summary } = v;
  const items = [];
  for (const s of iterateSubnets(v.block.network, v.block.prefix, v.newPrefix, range[0], range[1])) {
    items.push(labels && labels[String(s.index)] !== undefined ? { ...s, label: labels[String(s.index)] } : s);
  }
  return { ...summary, range: { from: range[0] + 1, to: range[1] }, items };
}
