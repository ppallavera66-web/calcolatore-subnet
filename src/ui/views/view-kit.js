// @ts-check
/**
 * Strumenti comuni alle viste di calcolo: parametri del frammento, calcolo dal vivo (150 ms,
 * Invio forza), errori sul campo giusto, modalità didattica e metodo.
 */
import { debounce } from '../dom.js';
import { didacticFor, methodFor, chooseMethod } from '../state.js';
import { message } from '../format.js';

export const LIVE_DELAY = 150;

/**
 * Stato condiviso di una vista di calcolo.
 * @param {import('../types.js').Ctx} ctx
 * @param {string} view
 * @param {import('../types.js').Route} route
 * @param {(opts: { initial: boolean, commit: boolean }) => void} render
 */
export function liveView(ctx, view, route, render) {
  let params = { ...route.params };
  const schedule = debounce(() => render({ initial: false, commit: false }), LIVE_DELAY);
  return {
    get params() {
      return params;
    },
    /**
     * Un campo è cambiato: aggiorna input e frammento, ricalcola dopo la pausa.
     * @param {Record<string, string | undefined>} patch
     */
    change(patch) {
      const next = { ...params };
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === '') delete next[k];
        else next[k] = v;
      }
      params = next;
      ctx.setParams(view, params);
      schedule();
    },
    /** Invio: calcolo immediato e voce di cronologia subito. */
    commit() {
      schedule.cancel();
      render({ initial: false, commit: true });
    },
    /** Rotta cambiata dall'esterno (tasto indietro, collegamento). */
    /** @param {import('../types.js').Route} r */
    reset(r) {
      params = { ...r.params };
      schedule.cancel();
    },
    didactic: () => didacticFor(ctx.store.get(), params),
    /** @param {string} fn */
    method: (fn) => methodFor(ctx.store.get(), fn, params.metodo),
    /**
     * Il metodo scelto nel pannello vale per la visita; un `metodo=` del collegamento viene tolto.
     * @param {string} fn
     * @param {string} m
     */
    setMethod(fn, m) {
      ctx.store.set((s) => chooseMethod(s, fn, m));
      if (params.metodo) {
        const { metodo, ...rest } = params;
        params = rest;
        ctx.setParams(view, params);
      }
      render({ initial: false, commit: false });
    },
    cancel: () => schedule.cancel(),
  };
}

/**
 * Smista l'errore del motore sul campo giusto e toglie gli errori dagli altri.
 * @param {{ code: string, field: string | null, params: Record<string, any> } | null} error
 * @param {Record<string, { setError: (msg: string | null, opts?: { now?: boolean }) => void }>} fields campo per nome del motore
 * @param {string} fallback campo da usare se quello dell'errore non è tra quelli dati
 * @param {boolean} now mostrare subito (apertura da collegamento, Invio)
 */
export function routeError(error, fields, fallback, now) {
  const target = error ? (error.field && fields[error.field] ? error.field : fallback) : null;
  const done = new Set();
  for (const [name, f] of Object.entries(fields)) {
    if (done.has(f)) continue;
    if (name === target) {
      f.setError(message(/** @type {any} */ (error)), { now });
      done.add(f);
    }
  }
  for (const f of new Set(Object.values(fields))) if (!done.has(f)) f.setError(null);
}

/**
 * Testo per l'input di un'opzione numerica: cifre → numero, altrimenti il testo (l'errore del motore lo mostra).
 * @param {string} s
 */
export const numberOrText = (s) => (/^\d{1,10}$/.test(s.trim()) ? Number(s.trim()) : s);
