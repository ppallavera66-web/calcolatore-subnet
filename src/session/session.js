// @ts-check
/**
 * Sessione JSON (specifica tecnica, 6): costruzione del file, lettura con le regole 1–4 della 6.3
 * (poi `validate.js` per le altre), Sostituisci e Unisci (6.4), riepilogo.
 * Funzioni pure: data e versione dell'app le passa chi chiama.
 */
import { SESSION_FORMAT, ENVELOPE_FORMAT, SESSION_VERSION, SESSION_SETTINGS, LIMITS, IMPORT_ERR, IMPORT_WARN, isPlainObject } from './schema.js';
import { migrate, MIGRATIONS } from './migrate.js';
import { validateSessionBody, emptyReport } from './validate.js';

/**
 * @typedef {import('./validate.js').SessionData} SessionData
 * @typedef {import('./validate.js').Report} Report
 * @typedef {import('./validate.js').Issue} Issue
 * @typedef {import('./validate.js').HistoryEntry} HistoryEntry
 * @typedef {import('./validate.js').Plan} Plan
 * @typedef {{ ok: true, kind: 'session', data: SessionData, meta: { exportedAt: string, version: number, app: { name: string, version: string } | null }, report: Report }
 *   | { ok: true, kind: 'encrypted', envelope: Record<string, any> }
 *   | { ok: false, error: Issue }} ReadResult
 */

/**
 * File di sessione v1 (6.1) dallo stato dell'app. Copia solo i campi previsti.
 * @param {{ settings: Record<string, any>, history: HistoryEntry[], plans: Plan[] }} state
 * @param {{ now: string, appName: string, appVersion: string }} meta
 */
export function buildSession(state, meta) {
  /** @type {Record<string, any>} */
  const settings = {};
  for (const k of SESSION_SETTINGS) if (state.settings[k] !== undefined) settings[k] = state.settings[k];
  return {
    format: SESSION_FORMAT,
    version: SESSION_VERSION,
    exportedAt: meta.now,
    app: { name: meta.appName, version: meta.appVersion },
    settings,
    history: state.history.slice(0, LIMITS.history).map((h) => ({ id: h.id, at: h.at, fn: h.fn, input: h.input })),
    plans: state.plans.slice(0, LIMITS.plans).map((p) => ({
      id: p.id, type: p.type, name: p.name, createdAt: p.createdAt, updatedAt: p.updatedAt, notes: p.notes, input: p.input, labels: p.labels,
    })),
  };
}

/** Byte UTF-8 di un testo. */
export const utf8Length = (/** @type {string} */ s) => new TextEncoder().encode(s).length;

/**
 * Regola 1: dimensione, controllata prima della lettura (con `File.size`).
 * @param {number} bytes
 * @returns {Issue | null}
 */
export function checkImportSize(bytes) {
  return bytes > LIMITS.importBytes ? { code: IMPORT_ERR.IMPORT_TOO_LARGE, params: { size: bytes, max: LIMITS.importBytes } } : null;
}

/**
 * Regole 1–10 su un testo: dimensione, JSON, formato, versione e migrazioni, poi `validate.js`.
 * Una busta cifrata viene riconosciuta e restituita così com'è (la decifra `envelope.js`).
 * @param {string} text
 * @param {{ allowEncrypted?: boolean, migrations?: typeof MIGRATIONS }} [o] `allowEncrypted: false` dopo la decifratura (nessuna busta annidata, 7.3)
 * @returns {ReadResult}
 */
export function readSessionText(text, o = {}) {
  const tooLarge = checkImportSize(utf8Length(text));
  if (tooLarge) return { ok: false, error: tooLarge };
  /** @type {unknown} */
  let obj;
  try {
    obj = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch {
    return { ok: false, error: { code: IMPORT_ERR.IMPORT_NOT_JSON, params: {} } };
  }
  return readSessionObject(obj, o);
}

/**
 * Regole 3–10 su un valore già letto da JSON.
 * @param {unknown} obj
 * @param {{ allowEncrypted?: boolean, migrations?: typeof MIGRATIONS }} [o]
 * @returns {ReadResult}
 */
export function readSessionObject(obj, o = {}) {
  if (!isPlainObject(obj)) return { ok: false, error: { code: IMPORT_ERR.IMPORT_UNKNOWN_FORMAT, params: { format: '' } } };
  const root = /** @type {Record<string, any>} */ (obj);
  if (root.format === ENVELOPE_FORMAT) {
    if (o.allowEncrypted === false) return { ok: false, error: { code: IMPORT_ERR.IMPORT_NESTED_ENVELOPE, params: {} } };
    return { ok: true, kind: 'encrypted', envelope: root };
  }
  if (root.format !== SESSION_FORMAT) {
    return { ok: false, error: { code: IMPORT_ERR.IMPORT_UNKNOWN_FORMAT, params: { format: typeof root.format === 'string' ? root.format.slice(0, 60) : '' } } };
  }
  if (!Number.isInteger(root.version) || root.version < 0) return { ok: false, error: { code: IMPORT_ERR.IMPORT_BAD_FIELD, params: { field: 'version' } } };
  if (root.version > SESSION_VERSION) {
    return { ok: false, error: { code: IMPORT_ERR.IMPORT_NEWER_VERSION, params: { version: root.version, supported: SESSION_VERSION } } };
  }
  const report = emptyReport();
  let body = root;
  if (root.version < SESSION_VERSION) {
    const m = migrate(root, root.version, SESSION_VERSION, o.migrations ?? MIGRATIONS);
    if (!m.ok) return m;
    body = m.value;
    report.warnings.push({ code: IMPORT_WARN.IMPORT_W_MIGRATED, params: { from: root.version, to: SESSION_VERSION } });
  }
  const v = validateSessionBody(body, report);
  if (!v.ok) return v;
  return { ok: true, kind: 'session', data: v.data, meta: { ...v.meta, version: root.version }, report: v.report };
}

/**
 * Chiave per riconoscere due voci di cronologia uguali (stessa funzione e stesso input canonico).
 * @param {HistoryEntry} h
 */
function sameKey(h) {
  return `${h.fn}|${stableJson(h.input)}`;
}

/** JSON con le chiavi ordinate, per confrontare input canonici. */
function stableJson(/** @type {any} */ v) {
  if (Array.isArray(v)) return `[${v.map(stableJson).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stableJson(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
}

/**
 * Applica una sessione importata allo stato (6.4).
 * - **Sostituisci**: cronologia e piani del file al posto di quelli attuali.
 * - **Unisci**: aggiunge; a parità di `id` tiene l'elemento già presente; toglie i doppioni con stessa
 *   funzione e stesso input tenendo la voce più recente; ordina per data e taglia a 200 voci e 100 piani.
 * - Impostazioni del file applicate solo se richiesto; "Memorizza i dati" non cambia mai (m7).
 * @param {{ settings: Record<string, any>, history: HistoryEntry[], plans: Plan[] }} current
 * @param {SessionData} incoming
 * @param {{ mode: 'replace' | 'merge', applySettings?: boolean }} o
 */
export function applyImport(current, incoming, o) {
  const settings = o.applySettings ? { ...current.settings, ...pickSettings(incoming.settings) } : current.settings;
  if (o.mode === 'replace') {
    return {
      settings,
      history: incoming.history.slice(0, LIMITS.history),
      plans: incoming.plans.slice(0, LIMITS.plans),
      summary: { history: incoming.history.length, plans: incoming.plans.length, duplicates: 0, dropped: 0, settingsApplied: !!o.applySettings },
    };
  }
  const ids = new Set(current.history.map((h) => h.id));
  const added = incoming.history.filter((h) => !ids.has(h.id));
  let duplicates = incoming.history.length - added.length;
  // unione, poi doppioni per contenuto: resta la voce più recente (a parità, quella già presente)
  const all = [...current.history.map((h, i) => ({ h, i, mine: true })), ...added.map((h, i) => ({ h, i: i + current.history.length, mine: false }))]
    .sort((x, y) => (x.h.at < y.h.at ? 1 : x.h.at > y.h.at ? -1 : x.i - y.i));
  const seen = new Set();
  /** @type {HistoryEntry[]} */
  const history = [];
  for (const { h, mine } of all) {
    const k = sameKey(h);
    if (seen.has(k)) {
      if (!mine) duplicates++;
      continue;
    }
    seen.add(k);
    history.push(h);
  }
  const kept = history.slice(0, LIMITS.history);
  const droppedHistory = history.length - kept.length;
  const newKept = kept.filter((h) => !ids.has(h.id)).length;

  const planIds = new Set(current.plans.map((p) => p.id));
  const newPlans = incoming.plans.filter((p) => !planIds.has(p.id));
  duplicates += incoming.plans.length - newPlans.length;
  const room = Math.max(0, LIMITS.plans - current.plans.length);
  const plans = [...current.plans, ...newPlans.slice(0, room)];
  const droppedPlans = newPlans.length - Math.min(room, newPlans.length);
  return {
    settings,
    history: kept,
    plans,
    summary: {
      history: newKept,
      plans: Math.min(room, newPlans.length),
      duplicates,
      dropped: droppedHistory + droppedPlans,
      settingsApplied: !!o.applySettings,
    },
  };
}

/** Solo le impostazioni della sessione (mai `persist`). */
function pickSettings(/** @type {Record<string, any>} */ s) {
  /** @type {Record<string, any>} */
  const out = {};
  for (const k of SESSION_SETTINGS) if (s[k] !== undefined) out[k] = s[k];
  return out;
}
