// @ts-check
/**
 * Stato dell'app (specifica tecnica, 4.2, 6.1, 6.2, 9.1, 9.5).
 * Un piccolo archivio con sottoscrizioni e funzioni pure che trasformano lo stato.
 * Lo stato vive in memoria; con "Memorizza i dati" acceso `persistence.js` ne salva una parte nel
 * browser (impostazioni, cronologia, piani: sezione 8.3). Il metodo scelto per funzione e gli input
 * delle viste valgono solo per la visita in corso.
 */
import { resolveMethod, DEFAULT_METHOD } from '../engine/index.js';

export const THEMES = /** @type {const} */ (['auto', 'light', 'dark', 'contrast']);
export const DIDACTIC_METHODS = /** @type {const} */ (['binary', 'magic', 'multiples']);
export const HISTORY_MAX = 200;
export const HISTORY_FNS = /** @type {const} */ (['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F10']);
export const PLANS_MAX = 100;
export const PLAN_NAME_MAX = 80;
export const PLAN_NOTES_MAX = 2000;
export const LABEL_MAX = 80;
export const LABELS_MAX = 4096;

/**
 * @typedef {{ theme: typeof THEMES[number], didactic: boolean, didacticMethod: typeof DIDACTIC_METHODS[number], exportBar: boolean, persist: boolean }} Settings
 * @typedef {{ id: string, at: string, fn: string, input: Record<string, any> }} HistoryEntry
 * @typedef {{ id: string, type: 'subdivision', name: string, createdAt: string, updatedAt: string, notes: string,
 *   input: { block: string, prefix: number, newPrefix: number }, labels: Record<string, string> }} Plan
 * @typedef {{ settings: Settings, methods: Record<string, string>, history: HistoryEntry[], plans: Plan[], inputs: Record<string, Record<string, string>> }} AppState
 */

/** Valori predefiniti delle impostazioni (9.5). */
export const SETTINGS_DEFAULTS = Object.freeze({
  theme: /** @type {Settings['theme']} */ ('auto'),
  didactic: false,
  didacticMethod: /** @type {Settings['didacticMethod']} */ (DEFAULT_METHOD),
  exportBar: false,
  persist: false,
});

/** @returns {AppState} */
export function initialState() {
  return { settings: { ...SETTINGS_DEFAULTS }, methods: {}, history: [], plans: [], inputs: {} };
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

// ---------------------------------------------------------------- piani salvati (6.1, 9.1)

/**
 * Lunghezza in caratteri Unicode.
 * @param {string} s
 */
const chars = (s) => [...s].length;

/**
 * Nome e note ripuliti e controllati (6.1: nome 1–80 caratteri, note fino a 2.000 con a capo).
 * Restituisce null se non vanno bene.
 * @param {string} name
 * @param {string} notes
 */
export function cleanPlanText(name, notes) {
  const n = name.replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029\u202A-\u202E\u2066-\u2069]/g, ' ').trim();
  const o = notes.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u2028\u2029\u202A-\u202E\u2066-\u2069]/g, ' ');
  if (n === '' || chars(n) > PLAN_NAME_MAX || chars(o) > PLAN_NOTES_MAX) return null;
  return { name: n, notes: o };
}

/**
 * Aggiunge un piano in cima all'elenco (al massimo 100).
 * @param {AppState} state
 * @param {Plan} plan
 * @returns {AppState}
 */
export function addPlan(state, plan) {
  if (state.plans.length >= PLANS_MAX) throw new RangeError('Troppi piani');
  return { ...state, plans: [plan, ...state.plans.filter((p) => p.id !== plan.id)] };
}

/**
 * Modifica un piano (nome, note, etichette) e ne aggiorna la data.
 * @param {AppState} state
 * @param {string} id
 * @param {Partial<Pick<Plan, 'name' | 'notes' | 'labels'>>} changes
 * @param {string} now data ISO
 * @returns {AppState}
 */
export function updatePlan(state, id, changes, now) {
  let changed = false;
  const plans = state.plans.map((p) => {
    if (p.id !== id) return p;
    const next = { ...p, ...changes };
    if (next.name === p.name && next.notes === p.notes && next.labels === p.labels) return p;
    changed = true;
    return { ...next, updatedAt: now };
  });
  return changed ? { ...state, plans } : state;
}

/**
 * Etichetta di una subnet di un piano: testo vuoto la toglie. Ripulita dai caratteri di controllo
 * e tagliata a 80 caratteri; al massimo 4.096 etichette per piano.
 * @param {AppState} state
 * @param {string} id
 * @param {number} index
 * @param {string} text
 * @param {string} now
 * @returns {AppState}
 */
export function setPlanLabel(state, id, index, text, now) {
  const plan = state.plans.find((p) => p.id === id);
  if (!plan) return state;
  // solo le subnet del piano (revisione C5)
  if (!Number.isInteger(index) || index < 0 || index >= 2 ** (plan.input.newPrefix - plan.input.prefix)) return state;
  const key = String(index);
  const clean = [...text.replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029\u202A-\u202E\u2066-\u2069]/g, ' ')].slice(0, LABEL_MAX).join('');
  const labels = { ...plan.labels };
  if (clean.trim() === '') delete labels[key];
  else {
    if (!(key in labels) && Object.keys(labels).length >= LABELS_MAX) return state;
    labels[key] = clean;
  }
  if ((plan.labels[key] ?? '') === (labels[key] ?? '')) return state;
  return updatePlan(state, id, { labels }, now);
}

/**
 * @param {AppState} state
 * @param {string} id
 * @returns {AppState}
 */
export function removePlan(state, id) {
  return state.plans.some((p) => p.id === id) ? { ...state, plans: state.plans.filter((p) => p.id !== id) } : state;
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
