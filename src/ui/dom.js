// @ts-check
/**
 * Piccoli strumenti per costruire il DOM senza framework.
 * I testi entrano sempre come nodi di testo (mai come HTML): vale anche per i dati dell'utente (6.3, punto 10).
 */

/** @typedef {Node | string | number | null | undefined | false} Child */

/**
 * Crea un elemento. Proprietà:
 * - `class`: classi (stringa);
 * - `text`: testo dell'elemento;
 * - `on…` con una funzione: ascoltatore dell'evento (`onclick`, `oninput`…);
 * - `value`, `checked`, `disabled`, `hidden`, `open`, `selected`, `indeterminate`: proprietà DOM;
 * - `dataset`: oggetto con gli attributi data-;
 * - tutto il resto: attributo (`true` → presente e vuoto, `false`/`null`/`undefined` → assente).
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {Record<string, any>} [props]
 * @param {...(Child | Child[])} children
 * @returns {HTMLElementTagNameMap[K]}
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) {
      if (PROPS.has(key)) /** @type {any} */ (el)[key] = false;
      continue;
    }
    if (key === 'class') el.className = String(value);
    else if (key === 'text') el.textContent = String(value);
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (PROPS.has(key)) /** @type {any} */ (el)[key] = value;
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  append(el, children);
  return el;
}

const PROPS = new Set(['value', 'checked', 'disabled', 'hidden', 'open', 'selected', 'indeterminate']);

/**
 * Aggiunge figli (anche annidati in array) ignorando i valori vuoti.
 * @param {Node} parent
 * @param {(Child | Child[])[]} children
 */
export function append(parent, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    parent.appendChild(typeof c === 'object' ? /** @type {Node} */ (c) : document.createTextNode(String(c)));
  }
  return parent;
}

/**
 * Sostituisce il contenuto di un elemento.
 * @param {Element} el
 * @param {...(Child | Child[])} children
 */
export function replace(el, ...children) {
  el.replaceChildren();
  return append(el, children);
}

/**
 * Funzione ritardata: ogni chiamata annulla la precedente. `flush` esegue subito quella in attesa.
 * @template {any[]} A
 * @param {(...args: A) => void} fn
 * @param {number} ms
 */
export function debounce(fn, ms) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;
  /** @type {A | null} */
  let pending = null;
  const run = () => {
    timer = null;
    const args = pending;
    pending = null;
    if (args) fn(...args);
  };
  const d = /** @type {((...args: A) => void) & { cancel(): void, flush(): void }} */ (
    (/** @type {A} */ ...args) => {
      pending = args;
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, ms);
    }
  );
  d.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    pending = null;
  };
  d.flush = () => {
    if (timer) clearTimeout(timer);
    run();
  };
  return d;
}

let uid = 0;
/**
 * Identificativo univoco per collegare etichette, descrizioni ed errori.
 * @param {string} prefix
 */
export const uniqueId = (prefix) => `${prefix}-${++uid}`;

/** L'utente ha chiesto movimenti ridotti. */
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
