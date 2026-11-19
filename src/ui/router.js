// @ts-check
/**
 * Navigazione con frammento (specifica tecnica, 9.3; decisione m10).
 * `#/calcola/analisi?ip=172.16.45.200&p=20`: funziona da disco, abilita "Apri nel calcolatore"
 * e i preferiti. Le funzioni di lettura e scrittura del frammento sono pure; `createRouter`
 * riceve la finestra come parametro, così si prova in Node con un oggetto finto.
 *
 * Regole:
 * - indirizzo vuoto o sconosciuto → `#/calcola/analisi`;
 * - una sezione senza scheda apre la prima scheda;
 * - si tengono solo i parametri previsti per la vista, più `did` e `metodo` (collegamenti dalla guida);
 * - mentre si scrive il frammento si sostituisce (nessuna voce nella cronologia del browser);
 *   il cambio di scheda invece crea una voce, così il tasto "indietro" torna alla scheda precedente.
 */

/** Sezioni e sottoschede (9.1). La prima scheda è quella predefinita. */
export const SECTIONS = Object.freeze({
  calcola: Object.freeze(['analisi', 'conversioni', 'mask', 'stessa']),
  pianifica: Object.freeze(['inverso', 'suddivisione', 'piani']),
  guide: Object.freeze(['uso', 'subnetting']),
  impostazioni: Object.freeze([]),
});

/** Parametri di ogni vista, nell'ordine in cui compaiono nel frammento (9.3). */
export const VIEW_PARAMS = Object.freeze({
  'calcola/analisi': ['ip', 'p'],
  'calcola/conversioni': ['n', 'b', 'w', 'a', 'pm'],
  'calcola/mask': ['m'],
  'calcola/stessa': ['a', 'pa', 'b', 'pb', 'gw'],
  'pianifica/inverso': ['caso', 'p', 'h', 's'],
  'pianifica/suddivisione': ['b', 'p', 'np', 'pg', 'ip', 'piano'],
  'pianifica/piani': [],
  'guide/uso': [],
  'guide/subnetting': [],
  impostazioni: [],
});

/** Parametri ammessi in tutte le viste di calcolo (9.3). */
export const COMMON_PARAMS = Object.freeze(['did', 'metodo']);

/** Lunghezza massima di un valore nel frammento: oltre si tronca (nessun input utile è così lungo). */
export const MAX_PARAM_LENGTH = 200;

export const DEFAULT_VIEW = 'calcola/analisi';

/**
 * @typedef {{ section: string, tab: string | null, view: string, params: Record<string, string>, anchor: string | null }} Route
 */

/**
 * Rotta di una vista con i parametri dati.
 * @param {string} view `calcola/analisi`, `impostazioni`…
 * @param {Record<string, string>} [params]
 * @param {string | null} [anchor] solo per le guide (`cap-9`)
 * @returns {Route}
 */
export function routeTo(view, params = {}, anchor = null) {
  const [section, tab = null] = view.split('/');
  return { section, tab, view, params: cleanParams(view, params), anchor };
}

/**
 * Tiene solo i parametri ammessi per la vista, con valori testuali non vuoti e senza caratteri di controllo.
 * @param {string} view
 * @param {Record<string, unknown>} params
 */
export function cleanParams(view, params) {
  const allowed = [...(/** @type {Record<string, string[]>} */ (VIEW_PARAMS)[view] ?? []), ...(isCalcView(view) ? COMMON_PARAMS : [])];
  /** @type {Record<string, string>} */
  const out = {};
  for (const key of allowed) {
    const v = params[key];
    if (v === undefined || v === null) continue;
    // eslint-disable-next-line no-control-regex
    const s = String(v).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, MAX_PARAM_LENGTH);
    if (s !== '') out[key] = s;
  }
  return out;
}

/** Le viste di Calcola e Pianifica accettano `did` e `metodo`. */
const isCalcView = (/** @type {string} */ view) => view.startsWith('calcola/') || view.startsWith('pianifica/');

/**
 * Caso del calcolo inverso (11): esplicito con `caso`, altrimenti dedotto dai parametri presenti
 * (`h` → A, `p` e `s` → B, `p`, `h` e `s` → C).
 * @param {Record<string, string>} params
 * @returns {'a' | 'b' | 'c'}
 */
export function inverseCase(params) {
  if (params.caso === 'a' || params.caso === 'b' || params.caso === 'c') return params.caso;
  if (params.s !== undefined && params.h !== undefined) return 'c';
  if (params.s !== undefined) return 'b';
  return 'a';
}

/**
 * Legge un frammento. `canonical` è falso se il frammento va riscritto (normalizzato o sconosciuto).
 * @param {string} hash con o senza `#`
 * @returns {{ route: Route, canonical: boolean }}
 */
export function parseHash(hash) {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const q = raw.indexOf('?');
  const path = q < 0 ? raw : raw.slice(0, q);
  const query = q < 0 ? '' : raw.slice(q + 1);
  const segments = path.split('/').filter(Boolean).map(safeDecode);
  const [section, tab, ...rest] = segments;
  const tabs = /** @type {Record<string, readonly string[]>} */ (SECTIONS)[section ?? ''];
  if (!path.startsWith('/') || !tabs) return { route: routeTo(DEFAULT_VIEW), canonical: false };

  let view;
  if (tabs.length === 0) view = section;
  else if (tab && tabs.includes(tab)) view = `${section}/${tab}`;
  else if (tab === undefined) view = `${section}/${tabs[0]}`;
  else return { route: routeTo(DEFAULT_VIEW), canonical: false };

  /** @type {Record<string, string>} */
  const params = {};
  for (const [k, v] of new URLSearchParams(query)) if (!(k in params)) params[k] = v;
  const anchor = section === 'guide' && rest.length ? rest.join('/').slice(0, MAX_PARAM_LENGTH) : null;
  const route = routeTo(view, params, anchor);
  return { route, canonical: buildHash(route) === `#${raw}` };
}

/**
 * Decodifica un segmento; se non è valido lo lascia com'è.
 * @param {string} s
 */
function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Codifica un valore del frammento lasciando leggibili i caratteri degli indirizzi (`.`, `/`, `:`).
 * @param {string} s
 */
const encodeValue = (s) => encodeURIComponent(s).replace(/%2F/gi, '/').replace(/%3A/gi, ':');

/**
 * Scrive il frammento di una rotta, con i parametri nell'ordine della vista.
 * Nel calcolo inverso `caso` compare solo se non si deduce dagli altri parametri.
 * @param {Route} route
 */
export function buildHash(route) {
  const params = { ...route.params };
  if (route.view === 'pianifica/inverso' && params.caso !== undefined) {
    const { caso, ...others } = params;
    if (inverseCase(others) === caso) delete params.caso;
  }
  let path = `#/${route.view}`;
  if (route.anchor) path += `/${route.anchor.split('/').map(encodeURIComponent).join('/')}`;
  const order = [...(/** @type {Record<string, string[]>} */ (VIEW_PARAMS)[route.view] ?? []), ...COMMON_PARAMS];
  const query = order.filter((k) => params[k] !== undefined).map((k) => `${k}=${encodeValue(params[k])}`).join('&');
  return query ? `${path}?${query}` : path;
}

/**
 * @typedef {{
 *   location: { hash: string, replace(url: string): void },
 *   history: { state: any, replaceState(data: any, unused: string, url: string): void },
 *   addEventListener(type: 'hashchange', fn: () => void): void,
 *   removeEventListener(type: 'hashchange', fn: () => void): void,
 * }} WindowLike
 */

/**
 * Router sul frammento.
 * @param {WindowLike} win
 * @param {(route: Route, info: { initial: boolean }) => void} onChange chiamata all'avvio e a ogni cambio di vista o parametri
 */
export function createRouter(win, onChange) {
  /** @type {Route} */
  let current = routeTo(DEFAULT_VIEW);
  let lastHash = '';

  /** Sostituisce il frammento senza creare una voce nella cronologia e senza evento. */
  function replaceHash(/** @type {string} */ hash) {
    lastHash = hash;
    if (win.location.hash === hash) return;
    try {
      win.history.replaceState(win.history.state, '', hash);
    } catch {
      // alcuni browser rifiutano replaceState con la pagina aperta da disco: si ripiega su location.replace
      win.location.replace(hash);
    }
  }

  function handle(/** @type {boolean} */ initial) {
    const hash = win.location.hash;
    if (!initial && hash === lastHash) return;
    const { route, canonical } = parseHash(hash);
    if (!canonical) replaceHash(buildHash(route));
    else lastHash = hash;
    current = route;
    onChange(route, { initial });
  }

  const listener = () => handle(false);

  return {
    start() {
      win.addEventListener('hashchange', listener);
      handle(true);
    },
    stop() {
      win.removeEventListener('hashchange', listener);
    },
    current: () => current,
    /**
     * Va a una rotta. `replace: true` sostituisce il frammento (si sta scrivendo) e non richiama `onChange`;
     * altrimenti crea una voce nella cronologia del browser e la vista si aggiorna con l'evento hashchange.
     * @param {Route} route
     * @param {{ replace?: boolean }} [opts]
     */
    navigate(route, opts = {}) {
      const hash = buildHash(route);
      if (opts.replace) {
        current = route;
        replaceHash(hash);
      } else if (win.location.hash !== hash) {
        win.location.hash = hash;
      }
    },
    /** @param {Route} route */
    href: (route) => buildHash(route),
  };
}
