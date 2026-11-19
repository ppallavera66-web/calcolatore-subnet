// @ts-check
/**
 * Persistenza locale (specifica tecnica, 8.3): collega lo stato dell'app all'adattatore `storage`.
 *
 * - "Memorizza i dati" spento (default): nessuna chiave nel browser.
 * - Acceso: si salva subito lo stato attuale; poi ogni modifica, con un ritardo di 300 ms.
 *   Si scrivono solo le chiavi cambiate (confronto sul JSON), così il ricaricamento da un'altra
 *   scheda non provoca scritture a catena.
 * - Spegnimento: `clearAll()` (la conferma la chiede l'interfaccia).
 * - Avvio: se esiste `meta` si caricano le chiavi, validate come un import (6.3) con le stesse
 *   migrazioni; dati illeggibili → si ignorano e si segnala, così le Impostazioni offrono di cancellarli.
 * - Spazio esaurito: cronologia ridotta alle 100 voci più recenti e nuovo tentativo, poi avviso.
 * - Più schede: l'evento `storage` ricarica lo stato; vale l'ultima scrittura. Se un'altra scheda
 *   spegne il salvataggio, questa smette di salvare ma tiene i dati in memoria.
 */
import { KEYS, isAppKey } from '../storage/storage.js';
import { readSessionObject } from '../session/session.js';
import { SESSION_FORMAT, SESSION_VERSION, SESSION_SETTINGS, isIsoDate } from '../session/schema.js';

export const SAVE_DELAY = 300;
export const QUOTA_HISTORY = 100;

/**
 * @typedef {import('./state.js').AppState} AppState
 * @typedef {ReturnType<typeof import('./state.js').createStore<AppState>>} Store
 * @typedef {import('../storage/storage.js').Storage} Storage
 * @typedef {'idle' | 'loaded' | 'empty' | 'unavailable' | 'corrupt' | 'newer'} LoadStatus
 * @typedef {{ type: 'saved' } | { type: 'quota-trimmed', dropped: number } | { type: 'quota-failed' } | { type: 'write-failed' }
 *   | { type: 'external', persist: boolean } } PersistEvent
 * @typedef {{ available: boolean, load: LoadStatus, skipped: number, savedAt: string | null, problem: 'quota' | 'write' | null }} PersistStatus
 */

/**
 * Le quattro chiavi da scrivere per uno stato.
 * @param {AppState} s
 */
function snapshot(s) {
  /** @type {Record<string, any>} */
  const settings = {};
  for (const k of SESSION_SETTINGS) settings[k] = /** @type {any} */ (s.settings)[k];
  settings.persist = true;
  return {
    [KEYS.settings]: settings,
    [KEYS.history]: s.history,
    [KEYS.plans]: s.plans,
  };
}

/**
 * @param {{ store: Store, storage: Storage, now: () => string, win?: Pick<Window, 'addEventListener' | 'removeEventListener'> | null,
 *   onEvent?: (e: PersistEvent) => void, delay?: number, schedule?: (fn: () => void, ms: number) => unknown, cancel?: (h: any) => void }} o
 */
export function createPersistence(o) {
  const { store, storage } = o;
  const schedule = o.schedule ?? ((fn, ms) => setTimeout(fn, ms));
  const cancel = o.cancel ?? ((h) => clearTimeout(h));
  const delay = o.delay ?? SAVE_DELAY;
  /** JSON dell'ultimo valore scritto o letto, per chiave. */
  /** @type {Map<string, string>} */
  const last = new Map();
  /** @type {any} */
  let timer = null;
  /** @type {Promise<void>} */
  let writing = Promise.resolve();
  /** @type {PersistStatus} */
  const status = { available: false, load: 'idle', skipped: 0, savedAt: null, problem: null };
  const emit = (/** @type {PersistEvent} */ e) => o.onEvent?.(e);

  /**
   * Legge e valida i dati salvati.
   * @returns {Promise<{ status: LoadStatus, data?: { settings: Record<string, any>, history: any[], plans: any[] }, skipped?: number }>}
   */
  async function read() {
    const meta = await storage.get(KEYS.meta);
    if (!meta.ok) return { status: meta.reason === 'unavailable' ? 'unavailable' : 'corrupt' };
    if (meta.value === undefined) return { status: 'empty' };
    const [settings, history, plans] = await Promise.all([storage.get(KEYS.settings), storage.get(KEYS.history), storage.get(KEYS.plans)]);
    if (!settings.ok || !history.ok || !plans.ok) return { status: 'corrupt' };
    const m = meta.value;
    const version = m && typeof m === 'object' ? m.schema : undefined;
    const r = readSessionObject({
      format: SESSION_FORMAT,
      version,
      exportedAt: m && isIsoDate(m.savedAt) ? m.savedAt : o.now(),
      settings: settings.value && typeof settings.value === 'object' ? { ...settings.value, persist: undefined } : settings.value,
      history: history.value ?? [],
      plans: plans.value ?? [],
    }, { allowEncrypted: false });
    if (!r.ok || r.kind !== 'session') return { status: r.ok === false && r.error.code === 'IMPORT_NEWER_VERSION' ? 'newer' : 'corrupt' };
    const skipped = r.report.historySkipped + r.report.plansSkipped + r.report.settingsIgnored;
    return { status: 'loaded', data: r.data, skipped };
  }

  /**
   * Applica allo stato i dati letti (impostazioni salvate sopra i valori predefiniti attuali).
   * @param {{ settings: Record<string, any>, history: any[], plans: any[] }} data
   */
  function apply(data) {
    store.set((s) => ({ ...s, settings: { ...s.settings, ...data.settings, persist: true }, history: data.history, plans: data.plans }));
    // ciò che è appena stato letto non va riscritto
    for (const [k, v] of Object.entries(snapshot(store.get()))) last.set(k, JSON.stringify(v));
  }

  /**
   * Scrive le chiavi cambiate. Con spazio esaurito riduce la cronologia e riprova una volta.
   * @param {boolean} [force] scrive tutto (accensione)
   */
  async function flush(force = false) {
    const s = store.get();
    if (!s.settings.persist) return;
    const snap = snapshot(s);
    const changed = Object.entries(snap).filter(([k, v]) => force || last.get(k) !== JSON.stringify(v));
    if (!changed.length) return;
    const savedAt = o.now();
    for (const [k, v] of [...changed, [KEYS.meta, { schema: SESSION_VERSION, savedAt }]]) {
      const r = await storage.set(/** @type {string} */ (k), v);
      if (r.ok) {
        last.set(/** @type {string} */ (k), JSON.stringify(v));
        continue;
      }
      if (r.reason === 'quota' && s.history.length > QUOTA_HISTORY) {
        const dropped = s.history.length - QUOTA_HISTORY;
        store.set((st) => ({ ...st, history: st.history.slice(0, QUOTA_HISTORY) }));
        const retry = await storage.set(KEYS.history, store.get().history);
        if (retry.ok) {
          last.set(KEYS.history, JSON.stringify(store.get().history));
          emit({ type: 'quota-trimmed', dropped });
          return flush();
        }
      }
      status.problem = r.reason === 'quota' ? 'quota' : 'write';
      emit({ type: r.reason === 'quota' ? 'quota-failed' : 'write-failed' });
      return;
    }
    status.savedAt = savedAt;
    status.problem = null;
    emit({ type: 'saved' });
  }

  /** Accoda una scrittura (le scritture non si sovrappongono). */
  function queue(/** @type {boolean} */ force = false) {
    writing = writing.then(() => flush(force)).catch(() => {});
    return writing;
  }

  const unsubscribe = store.subscribe((s, prev) => {
    if (!s.settings.persist) return;
    if (s.settings === prev.settings && s.history === prev.history && s.plans === prev.plans) return;
    if (timer !== null) cancel(timer);
    timer = schedule(() => {
      timer = null;
      queue();
    }, delay);
  });

  /** Evento `storage` da un'altra scheda. */
  async function onStorage(/** @type {StorageEvent} */ e) {
    if (e.key !== null && !isAppKey(e.key)) return;
    const r = await read();
    if (r.status === 'loaded' && r.data) {
      apply(r.data);
      emit({ type: 'external', persist: true });
    } else if (r.status === 'empty' && store.get().settings.persist) {
      // salvataggio spento (o dati cancellati) in un'altra scheda: si smette di salvare, i dati restano in memoria
      last.clear();
      store.set((s) => ({ ...s, settings: { ...s.settings, persist: false } }));
      emit({ type: 'external', persist: false });
    }
  }
  const storageListener = (/** @type {Event} */ e) => { void onStorage(/** @type {StorageEvent} */ (e)); };

  return {
    status: () => ({ ...status }),

    /** Avvio: disponibilità, lettura e migrazioni. */
    async start() {
      status.available = await storage.isAvailable();
      if (!status.available) {
        status.load = 'unavailable';
        return status.load;
      }
      const r = await read();
      status.load = r.status;
      status.skipped = r.skipped ?? 0;
      if (r.status === 'loaded' && r.data) {
        apply(r.data);
        const meta = await storage.get(KEYS.meta);
        status.savedAt = meta.ok && meta.value && isIsoDate(meta.value.savedAt) ? meta.value.savedAt : null;
      }
      o.win?.addEventListener('storage', storageListener);
      return status.load;
    },

    /** Accensione: si salva subito lo stato attuale. */
    async enable() {
      if (!status.available) return false;
      store.set((s) => ({ ...s, settings: { ...s.settings, persist: true } }));
      if (timer !== null) cancel(timer);
      timer = null;
      await queue(true);
      return status.problem === null;
    },

    /** Spegnimento: cancella le chiavi; i dati della visita restano in memoria. */
    async disable() {
      if (timer !== null) cancel(timer);
      timer = null;
      store.set((s) => ({ ...s, settings: { ...s.settings, persist: false } }));
      await writing;
      last.clear();
      status.savedAt = null;
      status.problem = null;
      const r = await storage.clearAll();
      return r.ok;
    },

    /** "Cancella tutti i dati": chiavi del browser (lo stato in memoria lo azzera chi chiama). */
    async clearStored() {
      if (timer !== null) cancel(timer);
      timer = null;
      await writing;
      last.clear();
      status.savedAt = null;
      status.problem = null;
      if (status.load === 'corrupt' || status.load === 'newer') status.load = 'empty';
      const r = await storage.clearAll();
      return r.ok;
    },

    /** Scrive subito quello che è in attesa (per esempio prima di chiudere la pagina). */
    async flushNow() {
      if (timer !== null) {
        cancel(timer);
        timer = null;
        await queue();
      }
      await writing;
    },

    async usage() {
      return storage.usage();
    },

    destroy() {
      unsubscribe();
      if (timer !== null) cancel(timer);
      o.win?.removeEventListener('storage', storageListener);
    },
  };
}
