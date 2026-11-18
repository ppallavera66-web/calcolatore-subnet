// @ts-check
/**
 * Stato dell'app (specifica tecnica, 4.2, 6.1, 6.2, 9.1, 9.5).
 * Un piccolo archivio con sottoscrizioni e funzioni pure che trasformano lo stato.
 * In fase 4 tutto vive in memoria; la fase 5 aggiunge il salvataggio (storage) e la sessione JSON.
 */
import { resolveMethod, DEFAULT_METHOD } from '../engine/index.js';

export const THEMES = /** @type {const} */ (['auto', 'light', 'dark', 'contrast']);
export const DIDACTIC_METHODS = /** @type {const} */ (['binary', 'magic', 'multiples']);
export const HISTORY_MAX = 200;
export const HISTORY_FNS = /** @type {const} */ (['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F10']);

/**
 * @typedef {{ theme: typeof THEMES[number], didactic: boolean, didacticMethod: typeof DIDACTIC_METHODS[number], exportBar: boolean, persist: boolean }} Settings
 * @typedef {{ id: string, at: string, fn: string, input: Record<string, any> }} HistoryEntry
 * @typedef {{ settings: Settings, methods: Record<string, string>, history: HistoryEntry[], inputs: Record<string, Record<string, string>> }} AppState
 */

/** Valori predefiniti delle impostazioni (9.5). `persist` resta spento fino alla fase 5. */
export const SETTINGS_DEFAULTS = Object.freeze({
  theme: /** @type {Settings['theme']} */ ('auto'),
  didactic: false,
  didacticMethod: /** @type {Settings['didacticMethod']} */ (DEFAULT_METHOD),
  exportBar: false,
  persist: false,
});

/** @returns {AppState} */
export function initialState() {
  return { settings: { ...SETTINGS_DEFAULTS }, methods: {}, history: [], inputs: {} };
}

/**
 * Validazione di un'impostazione: restituisce il valore se ammesso, altrimenti `undefined`.
 * @param {string} key
 * @param {unknown} value
 */
export function validSetting(key, value) {
  switch (key) {
    case 'theme':
      return THEMES.includes(/** @type {any} */ (value)) ? value : undefined;
    case 'didacticMethod':
      return DIDACTIC_METHODS.includes(/** @type {any} */ (value)) ? value : undefined;
    case 'didactic':
    case 'exportBar':
    case 'persist':
      return typeof value === 'boolean' ? value : undefined;
    default:
      return undefined;
  }
}

/**
 * Nuovo stato con un'impostazione cambiata; un valore non ammesso lascia lo stato invariato.
 * @param {AppState} state
 * @param {string} key
 * @param {unknown} value
 * @returns {AppState}
 */
export function setSetting(state, key, value) {
  const v = validSetting(key, value);
  if (v === undefined || /** @type {any} */ (state.settings)[key] === v) return state;
  return { ...state, settings: { ...state.settings, [key]: v } };
}

/**
 * Metodo scelto per una funzione durante la visita (4.2: "si ricorda per funzione durante la sessione").
 * @param {AppState} state
 * @param {string} fn
 * @param {string} method
 * @returns {AppState}
 */
export function chooseMethod(state, fn, method) {
  const m = resolveMethod(fn, method);
  if (state.methods[fn] === m) return state;
  return { ...state, methods: { ...state.methods, [fn]: m } };
}

/**
 * Metodo da usare per una funzione: quello del collegamento (`metodo=`), poi quello scelto
 * nella visita, poi il predefinito delle impostazioni; se la funzione non lo prevede, il primo della riga.
 * @param {AppState} state
 * @param {string} fn
 * @param {string | null} [override]
 */
export function methodFor(state, fn, override) {
  return resolveMethod(fn, override || state.methods[fn] || state.settings.didacticMethod);
}

/**
 * Modalità didattica effettiva per una vista: `did=1` nel collegamento la attiva solo lì (9.3).
 * @param {AppState} state
 * @param {Record<string, string>} [params]
 */
export function didacticFor(state, params = {}) {
  return params.did === '1' || state.settings.didactic;
}

/**
 * Input di una vista, come parametri testuali (gli stessi nomi del frammento, 9.3).
 * @param {AppState} state
 * @param {string} view
 * @param {Record<string, string>} values
 * @returns {AppState}
 */
export function setInputs(state, view, values) {
  const prev = state.inputs[view] ?? {};
  const next = { ...values };
  const same = Object.keys(prev).length === Object.keys(next).length && Object.keys(next).every((k) => prev[k] === next[k]);
  if (same) return state;
  return { ...state, inputs: { ...state.inputs, [view]: next } };
}

/**
 * Uguaglianza strutturale di due input (oggetti semplici, numeri, stringhe, null).
 * @param {any} a
 * @param {any} b
 * @returns {boolean}
 */
export function sameInput(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const ka = Object.keys(a).filter((k) => a[k] !== undefined);
  const kb = Object.keys(b).filter((k) => b[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => sameInput(a[k], b[k]));
}

/**
 * Aggiunge una voce in cima alla cronologia (6.1: solo gli input, al massimo 200, dalla più recente).
 * Un input già presente per la stessa funzione viene spostato in cima con la data nuova.
 * @param {AppState} state
 * @param {{ fn: string, input: Record<string, any> }} entry
 * @param {{ id: string, now: string }} meta identificativo e data ISO, forniti da chi chiama
 * @returns {AppState}
 */
export function addHistory(state, entry, meta) {
  if (!HISTORY_FNS.includes(/** @type {any} */ (entry.fn))) throw new RangeError(`Funzione non prevista in cronologia: ${entry.fn}`);
  const top = state.history[0];
  if (top && top.fn === entry.fn && sameInput(top.input, entry.input)) return state;
  const existing = state.history.find((h) => h.fn === entry.fn && sameInput(h.input, entry.input));
  const rest = state.history.filter((h) => h !== existing);
  const item = { id: existing ? existing.id : meta.id, at: meta.now, fn: entry.fn, input: entry.input };
  return { ...state, history: [item, ...rest].slice(0, HISTORY_MAX) };
}

/**
 * @param {AppState} state
 * @param {string} id
 * @returns {AppState}
 */
export function removeHistory(state, id) {
  return { ...state, history: state.history.filter((h) => h.id !== id) };
}

/**
 * @param {AppState} state
 * @returns {AppState}
 */
export function clearHistory(state) {
  return state.history.length ? { ...state, history: [] } : state;
}

const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

/**
 * Identificativo di 12 caratteri `[A-Za-z0-9_-]` (6.1) da byte casuali.
 * Nel browser: `newId(crypto.getRandomValues(new Uint8Array(12)))`, disponibile anche da disco.
 * @param {Uint8Array} bytes
 */
export function newId(bytes) {
  if (bytes.length < 12) throw new RangeError('Servono almeno 12 byte');
  let s = '';
  for (let i = 0; i < 12; i++) s += ID_ALPHABET[bytes[i] & 63];
  return s;
}

/**
 * Archivio dello stato con sottoscrizioni. `set` accetta un nuovo stato o una funzione
 * che lo calcola dal precedente; se lo stato non cambia (stesso oggetto) non avvisa nessuno.
 * @template S
 * @param {S} initial
 */
export function createStore(initial) {
  let state = initial;
  /** @type {Set<(s: S, prev: S) => void>} */
  const listeners = new Set();
  return {
    get: () => state,
    /** @param {S | ((s: S) => S)} next */
    set(next) {
      const value = typeof next === 'function' ? /** @type {(s: S) => S} */ (next)(state) : next;
      if (value === state) return;
      const prev = state;
      state = value;
      for (const fn of [...listeners]) fn(state, prev);
    },
    /** @param {(s: S, prev: S) => void} fn */
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}
