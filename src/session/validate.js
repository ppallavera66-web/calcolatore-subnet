// @ts-check
/**
 * Validazione della sessione all'import (specifica tecnica, 6.3), dalla regola 5 in poi:
 * le regole 1–4 (dimensione, JSON, formato, versione) stanno in `session.js`, che poi chiama
 * `validateSessionBody` su un oggetto già portato alla versione corrente.
 *
 * Copia per lista ammessa: il risultato è fatto solo di oggetti nuovi con i campi previsti;
 * chiavi sconosciute ignorate e contate; `__proto__`, `constructor`, `prototype` mai copiate
 * (non sono mai nella lista ammessa, e le chiavi delle etichette devono essere cifre).
 */
import {
  LIMITS, THEMES, DIDACTIC_METHODS, HISTORY_FNS, PLAN_TYPES, SESSION_SETTINGS, ALLOWED_KEYS,
  IMPORT_ERR, IMPORT_WARN, isIsoDate, isCleanText, charLength, isPlainObject, unknownKeysOf,
} from './schema.js';
import { validateInput, subnetCount } from './inputs.js';

/**
 * Confronto di due date ISO per ordinare dalla più recente. Si confrontano gli istanti (Date.parse):
 * con i millisecondi facoltativi il confronto tra stringhe sbaglia, per esempio
 * "2026-11-18T10:00:00Z" > "2026-11-18T10:00:00.500Z" (revisione M2).
 * @param {string} a
 * @param {string} b
 * @returns {number} negativo se a è più recente di b, 0 se coincidono
 */
export function newerFirst(a, b) {
  return Date.parse(b) - Date.parse(a);
}

/**
 * @typedef {{ theme?: string, didactic?: boolean, didacticMethod?: string, exportBar?: boolean }} SessionSettings
 * @typedef {{ id: string, at: string, fn: string, input: Record<string, any> }} HistoryEntry
 * @typedef {{ id: string, type: 'subdivision', name: string, createdAt: string, updatedAt: string, notes: string,
 *   input: { block: string, prefix: number, newPrefix: number }, labels: Record<string, string> }} Plan
 * @typedef {{ code: string, params: Record<string, unknown> }} Issue
 * @typedef {{ historyImported: number, historySkipped: number, plansImported: number, plansSkipped: number,
 *   settingsIgnored: number, unknownKeys: number, warnings: Issue[] }} Report
 * @typedef {{ settings: SessionSettings, history: HistoryEntry[], plans: Plan[] }} SessionData
 */

/**
 * Valida un'impostazione della sessione: restituisce il valore se ammesso, altrimenti `undefined`.
 * @param {string} key
 * @param {unknown} v
 */
export function validSessionSetting(key, v) {
  switch (key) {
    case 'theme':
      return THEMES.includes(/** @type {any} */ (v)) ? v : undefined;
    case 'didacticMethod':
      return DIDACTIC_METHODS.includes(/** @type {any} */ (v)) ? v : undefined;
    case 'didactic':
    case 'exportBar':
      return typeof v === 'boolean' ? v : undefined;
    /* c8 ignore next 2 */
    default:
      return undefined;
  }
}

/**
 * Regola 7: impostazioni. Ogni campo non valido viene ignorato e contato.
 * @param {unknown} raw
 * @param {Report} report
 * @returns {SessionSettings}
 */
function readSettings(raw, report) {
  /** @type {Record<string, any>} */
  const out = {};
  if (raw === undefined) return out;
  if (!isPlainObject(raw)) {
    report.settingsIgnored++;
    return out;
  }
  const s = /** @type {Record<string, unknown>} */ (raw);
  report.unknownKeys += unknownKeysOf(s, SESSION_SETTINGS);
  for (const key of SESSION_SETTINGS) {
    if (!Object.prototype.hasOwnProperty.call(s, key)) continue;
    const v = validSessionSetting(key, s[key]);
    if (v === undefined) report.settingsIgnored++;
    else out[key] = v;
  }
  return out;
}

/**
 * Regola 8: cronologia. Si tengono le 200 voci più recenti; ogni voce non valida è scartata e contata.
 * @param {unknown} raw
 * @param {Report} report
 * @returns {HistoryEntry[]}
 */
function readHistory(raw, report) {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    report.warnings.push({ code: IMPORT_ERR.IMPORT_BAD_FIELD, params: { field: 'history' } });
    return [];
  }
  /** @type {HistoryEntry[]} */
  const valid = [];
  const ids = new Set();
  let duplicates = 0;
  for (const item of raw) {
    if (!isPlainObject(item)) {
      report.historySkipped++;
      continue;
    }
    const e = /** @type {Record<string, any>} */ (item);
    if (typeof e.id !== 'string' || !LIMITS.idPattern.test(e.id) || !isIsoDate(e.at) || !HISTORY_FNS.includes(e.fn)) {
      report.historySkipped++;
      continue;
    }
    const input = validateInput(e.fn, e.input);
    if (!input.ok) {
      report.historySkipped++;
      continue;
    }
    if (ids.has(e.id)) {
      duplicates++;
      report.historySkipped++;
      continue;
    }
    ids.add(e.id);
    report.unknownKeys += unknownKeysOf(e, ALLOWED_KEYS.historyEntry) + input.unknownKeys;
    valid.push({ id: e.id, at: e.at, fn: e.fn, input: input.input });
  }
  if (duplicates) report.warnings.push({ code: IMPORT_WARN.IMPORT_W_DUPLICATE_ID, params: { count: duplicates } });
  // dalla più recente; a parità di data resta l'ordine del file
  const sorted = valid.map((e, i) => ({ e, i })).sort((x, y) => newerFirst(x.e.at, y.e.at) || x.i - y.i).map((x) => x.e);
  if (sorted.length > LIMITS.history) {
    const dropped = sorted.length - LIMITS.history;
    report.historySkipped += dropped;
    report.warnings.push({ code: IMPORT_WARN.IMPORT_W_HISTORY_TRUNCATED, params: { dropped, max: LIMITS.history } });
  }
  return sorted.slice(0, LIMITS.history);
}

/**
 * Etichette di un piano: chiave = indice della subnet (cifre decimali, entro il numero di subnet),
 * valore 1–80 caratteri senza caratteri di controllo. Le voci non valide si scartano e si contano.
 * @param {unknown} raw
 * @param {number} count numero di subnet del piano
 * @returns {{ labels: Record<string, string>, dropped: number } | null} null se `labels` non è un oggetto
 */
export function readLabels(raw, count) {
  if (raw === undefined) return { labels: {}, dropped: 0 };
  if (!isPlainObject(raw)) return null;
  /** @type {Record<string, string>} */
  const labels = {};
  let dropped = 0;
  let kept = 0;
  for (const [k, v] of Object.entries(/** @type {Record<string, unknown>} */ (raw))) {
    const okKey = /^(0|[1-9][0-9]{0,9})$/.test(k) && Number(k) < count;
    const okVal = typeof v === 'string' && v.trim() !== '' && charLength(v) <= LIMITS.labelLength && isCleanText(v);
    if (okKey && okVal && kept < LIMITS.labels) {
      labels[k] = /** @type {string} */ (v);
      kept++;
    } else dropped++;
  }
  return { labels, dropped };
}

/**
 * Regola 9: piani. Un piano con un campo non valido è scartato e contato; le etichette non valide
 * si scartano singolarmente (avviso). Oltre 100 piani si tengono i 100 aggiornati più di recente.
 * @param {unknown} raw
 * @param {Report} report
 * @returns {Plan[]}
 */
function readPlans(raw, report) {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    report.warnings.push({ code: IMPORT_ERR.IMPORT_BAD_FIELD, params: { field: 'plans' } });
    return [];
  }
  /** @type {Plan[]} */
  const valid = [];
  const ids = new Set();
  let duplicates = 0;
  for (const item of raw) {
    const plan = readPlan(item, report);
    if (!plan) {
      report.plansSkipped++;
      continue;
    }
    if (ids.has(plan.id)) {
      duplicates++;
      report.plansSkipped++;
      continue;
    }
    ids.add(plan.id);
    valid.push(plan);
  }
  if (duplicates) report.warnings.push({ code: IMPORT_WARN.IMPORT_W_DUPLICATE_ID, params: { count: duplicates } });
  if (valid.length > LIMITS.plans) {
    const dropped = valid.length - LIMITS.plans;
    const keep = new Set(
      valid.map((p, i) => ({ p, i })).sort((x, y) => newerFirst(x.p.updatedAt, y.p.updatedAt) || x.i - y.i).slice(0, LIMITS.plans).map((x) => x.p),
    );
    report.plansSkipped += dropped;
    report.warnings.push({ code: IMPORT_WARN.IMPORT_W_PLANS_TRUNCATED, params: { dropped, max: LIMITS.plans } });
    return valid.filter((p) => keep.has(p));
  }
  return valid;
}

/**
 * Un piano valido in forma canonica, oppure null.
 * @param {unknown} item
 * @param {Report} [report] se presente, raccoglie chiavi sconosciute e avvisi sulle etichette
 * @returns {Plan | null}
 */
export function readPlan(item, report) {
  if (!isPlainObject(item)) return null;
  const p = /** @type {Record<string, any>} */ (item);
  if (typeof p.id !== 'string' || !LIMITS.idPattern.test(p.id)) return null;
  if (!PLAN_TYPES.includes(p.type)) return null;
  if (typeof p.name !== 'string' || p.name.trim() === '' || charLength(p.name) > LIMITS.nameLength || !isCleanText(p.name)) return null;
  if (!isIsoDate(p.createdAt) || !isIsoDate(p.updatedAt)) return null;
  const notesRaw = p.notes === undefined ? '' : p.notes;
  if (typeof notesRaw !== 'string') return null;
  const notes = notesRaw.replace(/\r\n?/g, '\n');
  if (charLength(notes) > LIMITS.notesLength || !isCleanText(notes, { multiline: true })) return null;
  const input = validateInput('F06', p.input);
  if (!input.ok) return null;
  const canon = /** @type {Plan['input']} */ (input.input);
  const labels = readLabels(p.labels, subnetCount(canon));
  if (!labels) return null;
  if (report) {
    report.unknownKeys += unknownKeysOf(p, ALLOWED_KEYS.plan) + input.unknownKeys;
    if (labels.dropped) report.warnings.push({ code: IMPORT_WARN.IMPORT_W_LABELS_DROPPED, params: { plan: p.name, count: labels.dropped } });
  }
  return { id: p.id, type: 'subdivision', name: p.name, createdAt: p.createdAt, updatedAt: p.updatedAt, notes, input: canon, labels: labels.labels };
}

/** @returns {Report} */
export function emptyReport() {
  return { historyImported: 0, historySkipped: 0, plansImported: 0, plansSkipped: 0, settingsIgnored: 0, unknownKeys: 0, warnings: [] };
}

/**
 * Regole 5–10 su un oggetto `subnetcalc-session` già alla versione corrente.
 * @param {Record<string, any>} obj
 * @param {Report} [report]
 * @returns {{ ok: true, data: SessionData, meta: { exportedAt: string, app: { name: string, version: string } | null }, report: Report }
 *   | { ok: false, error: Issue }}
 */
export function validateSessionBody(obj, report = emptyReport()) {
  if (!isIsoDate(obj.exportedAt)) return { ok: false, error: { code: IMPORT_ERR.IMPORT_BAD_FIELD, params: { field: 'exportedAt' } } };
  report.unknownKeys += unknownKeysOf(obj, ALLOWED_KEYS.root);
  /** @type {{ name: string, version: string } | null} */
  let app = null;
  if (isPlainObject(obj.app)) {
    const a = obj.app;
    report.unknownKeys += unknownKeysOf(a, ALLOWED_KEYS.app);
    const clip = (/** @type {unknown} */ v) => (typeof v === 'string' && isCleanText(v) ? [...v].slice(0, 80).join('') : '');
    app = { name: clip(a.name), version: clip(a.version) };
  }
  const settings = readSettings(obj.settings, report);
  const history = readHistory(obj.history, report);
  const plans = readPlans(obj.plans, report);
  report.historyImported = history.length;
  report.plansImported = plans.length;
  return { ok: true, data: { settings, history, plans }, meta: { exportedAt: obj.exportedAt, app }, report };
}
