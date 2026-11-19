// @ts-check
/**
 * Schema della sessione JSON v1 (specifica tecnica, 6.1 e 6.2): costanti, limiti, codici.
 * Il modulo `session` può importare solo dal motore (regola 2.3): i testi per l'utente
 * stanno in `strings.it.js`, indicizzati con i codici qui sotto.
 */

export const SESSION_FORMAT = 'subnetcalc-session';
export const ENVELOPE_FORMAT = 'subnetcalc-encrypted';
export const RESULT_FORMAT = 'subnetcalc-result';
/** Versione dello schema scritta da questa app. */
export const SESSION_VERSION = 1;

export const LIMITS = Object.freeze({
  importBytes: 5242880,
  history: 200,
  plans: 100,
  nameLength: 80,
  notesLength: 2000,
  labels: 4096,
  labelLength: 80,
  idPattern: /^[A-Za-z0-9_-]{1,64}$/,
  /** Testo libero dentro gli input (F02): limite prudente, la parte valida è comunque breve. */
  inputText: 200,
});

export const THEMES = Object.freeze(['auto', 'light', 'dark', 'contrast']);
export const DIDACTIC_METHODS = Object.freeze(['binary', 'magic', 'multiples']);
export const HISTORY_FNS = Object.freeze(['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F10']);
export const PLAN_TYPES = Object.freeze(['subdivision']);
/** Impostazioni che viaggiano nel file; "Memorizza i dati" no (m7). */
export const SESSION_SETTINGS = Object.freeze(['theme', 'didactic', 'didacticMethod', 'exportBar']);

/** Campi ammessi a ciascun livello (copia per lista ammessa, 6.3 punto 6). */
export const ALLOWED_KEYS = Object.freeze({
  root: ['format', 'version', 'exportedAt', 'app', 'settings', 'history', 'plans'],
  app: ['name', 'version'],
  historyEntry: ['id', 'at', 'fn', 'input'],
  plan: ['id', 'type', 'name', 'createdAt', 'updatedAt', 'notes', 'input', 'labels'],
});

/** Codici di errore bloccanti e di avviso dell'import (testi in strings.it.js). */
export const IMPORT_ERR = Object.freeze({
  IMPORT_TOO_LARGE: 'IMPORT_TOO_LARGE',
  IMPORT_NOT_JSON: 'IMPORT_NOT_JSON',
  IMPORT_UNKNOWN_FORMAT: 'IMPORT_UNKNOWN_FORMAT',
  IMPORT_NEWER_VERSION: 'IMPORT_NEWER_VERSION',
  IMPORT_BAD_FIELD: 'IMPORT_BAD_FIELD',
  IMPORT_BAD_ENVELOPE: 'IMPORT_BAD_ENVELOPE',
  IMPORT_DECRYPT_FAILED: 'IMPORT_DECRYPT_FAILED',
  IMPORT_NESTED_ENVELOPE: 'IMPORT_NESTED_ENVELOPE',
  IMPORT_CRYPTO_UNAVAILABLE: 'IMPORT_CRYPTO_UNAVAILABLE',
});

export const IMPORT_WARN = Object.freeze({
  IMPORT_W_MIGRATED: 'IMPORT_W_MIGRATED',
  IMPORT_W_HISTORY_TRUNCATED: 'IMPORT_W_HISTORY_TRUNCATED',
  IMPORT_W_PLANS_TRUNCATED: 'IMPORT_W_PLANS_TRUNCATED',
  IMPORT_W_LABELS_DROPPED: 'IMPORT_W_LABELS_DROPPED',
  IMPORT_W_DUPLICATE_ID: 'IMPORT_W_DUPLICATE_ID',
});

/**
 * Data e ora ISO 8601 in UTC (`2026-11-18T22:33:00.000Z`, millisecondi facoltativi), valida nel calendario.
 * @param {unknown} s
 */
export function isIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(s)) return false;
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) return false;
  // 2026-02-30 viene "accettata" da alcuni motori spostandola a marzo: si confronta il ritorno
  return new Date(ms).toISOString().slice(0, 19) === s.slice(0, 19);
}

const BIDI_AND_SEPARATORS = '\\u2028\\u2029\\u202A-\\u202E\\u2066-\\u2069';
const CONTROL = new RegExp(`[\\u0000-\\u001F\\u007F-\\u009F${BIDI_AND_SEPARATORS}]`);
const CONTROL_MULTILINE = new RegExp(`[\\u0000-\\u0009\\u000B-\\u001F\\u007F-\\u009F${BIDI_AND_SEPARATORS}]`);

/**
 * Testo senza caratteri di controllo; con `multiline` sono ammessi gli a capo (note dei piani).
 * Sono esclusi anche i separatori di riga Unicode e i caratteri bidirezionali di override.
 * @param {unknown} s
 * @param {{ multiline?: boolean }} [o]
 */
export function isCleanText(s, o = {}) {
  if (typeof s !== 'string') return false;
  const re = o.multiline ? CONTROL_MULTILINE : CONTROL;
  return !re.test(s);
}

/** Lunghezza in caratteri Unicode (punti di codice), non in unità UTF-16. */
export const charLength = (/** @type {string} */ s) => [...s].length;

/** Oggetto semplice (non array, non null). */
export const isPlainObject = (/** @type {unknown} */ v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Chiavi proprie che non fanno parte della lista ammessa. */
export function unknownKeysOf(/** @type {Record<string, unknown>} */ obj, /** @type {readonly string[]} */ allowed) {
  return Object.keys(obj).filter((k) => !allowed.includes(k)).length;
}
