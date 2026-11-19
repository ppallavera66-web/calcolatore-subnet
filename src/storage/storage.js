// @ts-check
/**
 * Adattatore di persistenza (specifica tecnica, 8.1 e 8.2): localStorage dietro un'interfaccia
 * asincrona, così un domani si può passare a IndexedDB senza toccare il resto.
 *
 * Ogni chiamata è protetta da try/catch e restituisce un esito, mai un'eccezione: se il browser
 * rifiuta lo storage (modalità privata, cookie bloccati, pagina da disco in certi browser),
 * l'app continua senza salvare e lo dice nelle Impostazioni.
 *
 * Nessuna dipendenza da altri moduli dell'app (regola 2.3).
 */

/** Prefisso comune: evita collisioni con altre pagine aperte da disco, che in alcuni browser condividono lo spazio. */
export const PREFIX = 'subnetcalc:';

/** Chiavi della 8.2. */
export const KEYS = Object.freeze({
  meta: 'subnetcalc:v1:meta',
  settings: 'subnetcalc:v1:settings',
  history: 'subnetcalc:v1:history',
  plans: 'subnetcalc:v1:plans',
});

const PROBE = 'subnetcalc:probe';

/**
 * @typedef {'unavailable' | 'quota' | 'corrupt'} StorageProblem
 * @typedef {{ ok: true, value?: any } | { ok: false, reason: StorageProblem }} GetResult
 * @typedef {{ ok: true } | { ok: false, reason: StorageProblem }} SetResult
 *
 * @typedef {object} Storage
 * @property {() => Promise<boolean>} isAvailable
 * @property {(key: string) => Promise<GetResult>} get valore letto (JSON); `value` assente se la chiave non esiste
 * @property {(key: string, value: unknown) => Promise<SetResult>} set
 * @property {(key: string) => Promise<SetResult>} remove
 * @property {() => Promise<{ ok: true, removed: number } | { ok: false, reason: StorageProblem }>} clearAll cancella tutte le chiavi con il prefisso
 * @property {() => Promise<{ ok: true, bytes: number, keys: number } | { ok: false, reason: StorageProblem }>} usage spazio occupato dalle chiavi dell'app (UTF-16, 2 byte per unità)
 */

/**
 * Vero se l'errore indica spazio esaurito, nelle varianti dei diversi browser.
 * @param {unknown} e
 */
export function isQuotaError(e) {
  if (!e || typeof e !== 'object') return false;
  const err = /** @type {{ name?: string, code?: number }} */ (e);
  return err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014;
}

/** @param {string} key */
export function isAppKey(key) {
  return typeof key === 'string' && key.startsWith(PREFIX);
}

/**
 * Crea l'adattatore. `getBackend` restituisce l'oggetto Web Storage: è una funzione perché in alcuni
 * browser già la lettura di `window.localStorage` lancia un'eccezione.
 * @param {() => globalThis.Storage | null | undefined} [getBackend]
 * @returns {Storage}
 */
export function createStorage(getBackend = () => globalThis.localStorage) {
  /** @returns {globalThis.Storage | null} */
  function backend() {
    try {
      return getBackend() ?? null;
    } catch {
      return null;
    }
  }

  return {
    async isAvailable() {
      const b = backend();
      if (!b) return false;
      try {
        b.setItem(PROBE, '1');
        b.removeItem(PROBE);
        return true;
      } catch (e) {
        // spazio pieno: lo storage esiste, ma oggi non accetta scritture
        return isQuotaError(e);
      }
    },

    async get(key) {
      const b = backend();
      if (!b) return { ok: false, reason: 'unavailable' };
      /** @type {string | null} */
      let raw;
      try {
        raw = b.getItem(key);
      } catch {
        return { ok: false, reason: 'unavailable' };
      }
      if (raw === null) return { ok: true };
      try {
        return { ok: true, value: JSON.parse(raw) };
      } catch {
        return { ok: false, reason: 'corrupt' };
      }
    },

    async set(key, value) {
      const b = backend();
      if (!b) return { ok: false, reason: 'unavailable' };
      try {
        b.setItem(key, JSON.stringify(value));
        return { ok: true };
      } catch (e) {
        return { ok: false, reason: isQuotaError(e) ? 'quota' : 'unavailable' };
      }
    },

    async remove(key) {
      const b = backend();
      if (!b) return { ok: false, reason: 'unavailable' };
      try {
        b.removeItem(key);
        return { ok: true };
      } catch {
        return { ok: false, reason: 'unavailable' };
      }
    },

    async clearAll() {
      const b = backend();
      if (!b) return { ok: false, reason: 'unavailable' };
      try {
        const keys = [];
        for (let i = 0; i < b.length; i++) {
          const k = b.key(i);
          if (k !== null && isAppKey(k)) keys.push(k);
        }
        for (const k of keys) b.removeItem(k);
        return { ok: true, removed: keys.length };
      } catch {
        return { ok: false, reason: 'unavailable' };
      }
    },

    async usage() {
      const b = backend();
      if (!b) return { ok: false, reason: 'unavailable' };
      try {
        let bytes = 0;
        let keys = 0;
        for (let i = 0; i < b.length; i++) {
          const k = b.key(i);
          if (k === null || !isAppKey(k)) continue;
          keys++;
          bytes += (k.length + (b.getItem(k) ?? '').length) * 2;
        }
        return { ok: true, bytes, keys };
      } catch {
        return { ok: false, reason: 'unavailable' };
      }
    },
  };
}

/**
 * Web Storage in memoria, con limite di spazio facoltativo: serve ai test e come riserva.
 * Il limite conta le unità UTF-16 di chiavi e valori, come fanno i browser.
 * @param {{ quota?: number, fail?: boolean }} [o] `fail`: ogni accesso lancia (storage rifiutato)
 * @returns {globalThis.Storage}
 */
export function memoryBackend(o = {}) {
  /** @type {Map<string, string>} */
  const map = new Map();
  const quota = o.quota ?? Infinity;
  const guard = () => {
    if (o.fail) throw Object.assign(new Error('SecurityError'), { name: 'SecurityError' });
  };
  const used = () => [...map].reduce((a, [k, v]) => a + k.length + v.length, 0);
  const store = {
    get length() {
      guard();
      return map.size;
    },
    key(/** @type {number} */ i) {
      guard();
      return [...map.keys()][i] ?? null;
    },
    getItem(/** @type {string} */ k) {
      guard();
      return map.has(k) ? /** @type {string} */ (map.get(k)) : null;
    },
    setItem(/** @type {string} */ k, /** @type {string} */ v) {
      guard();
      const s = String(v);
      const next = used() - (map.has(k) ? k.length + /** @type {string} */ (map.get(k)).length : 0) + k.length + s.length;
      if (next > quota) throw Object.assign(new Error('QuotaExceededError'), { name: 'QuotaExceededError', code: 22 });
      map.set(k, s);
    },
    removeItem(/** @type {string} */ k) {
      guard();
      map.delete(k);
    },
    clear() {
      guard();
      map.clear();
    },
  };
  return /** @type {any} */ (store);
}
