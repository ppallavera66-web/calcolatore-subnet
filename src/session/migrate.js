// @ts-check
/**
 * Migrazioni dello schema di sessione (specifica tecnica, 6.3 punto 4; 8.3 per i dati salvati).
 * Una funzione pura per ogni salto di versione: `MIGRATIONS[n]` porta un oggetto dalla versione n
 * alla n + 1. Oggi esiste solo la v1, quindi la catena è vuota; il meccanismo è già provato dai test.
 */
import { SESSION_VERSION, IMPORT_ERR } from './schema.js';

/** @type {Readonly<Record<number, (obj: Record<string, any>) => Record<string, any>>>} */
export const MIGRATIONS = Object.freeze({});

/**
 * Porta `obj` dalla versione `from` a `to` applicando la catena.
 * Non modifica l'oggetto ricevuto (le migrazioni restituiscono oggetti nuovi).
 * @param {Record<string, any>} obj
 * @param {number} from
 * @param {number} [to]
 * @param {Readonly<Record<number, (obj: Record<string, any>) => Record<string, any>>>} [migrations]
 * @returns {{ ok: true, value: Record<string, any>, steps: number } | { ok: false, error: { code: string, params: Record<string, unknown> } }}
 */
export function migrate(obj, from, to = SESSION_VERSION, migrations = MIGRATIONS) {
  let current = obj;
  let steps = 0;
  for (let v = from; v < to; v++) {
    const step = migrations[v];
    if (typeof step !== 'function') return { ok: false, error: { code: IMPORT_ERR.IMPORT_BAD_FIELD, params: { field: 'version' } } };
    current = { ...step(current), version: v + 1 };
    steps++;
  }
  return { ok: true, value: current, steps };
}
