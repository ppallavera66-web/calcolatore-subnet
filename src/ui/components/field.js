// @ts-check
/**
 * Campo di testo con etichetta, suggerimento ed errore (specifica tecnica, 9.4 e 9.7).
 * L'errore compare dopo 400 ms di pausa, all'uscita dal campo o con Invio; è collegato al campo
 * con `aria-describedby` e il campo riceve `aria-invalid`.
 */
import { h, uniqueId } from '../dom.js';
import { t } from '../../i18n/strings.it.js';

export const ERROR_DELAY = 400;

/**
 * @typedef {object} FieldOptions
 * @property {string} label
 * @property {string} [value]
 * @property {string} [hint]
 * @property {string} [placeholder]
 * @property {'text' | 'decimal' | 'numeric'} [inputmode]
 * @property {boolean} [mono] carattere a spaziatura fissa (indirizzi, numeri)
 * @property {string} [width] larghezza CSS del campo (es. `16ch`)
 * @property {boolean} [optional]
 * @property {'text' | 'password'} [type] `password` per la passphrase (7.4)
 * @property {string} [autocomplete] per default `off`; `new-password` per la passphrase di export
 * @property {(value: string) => void} [onInput]
 * @property {() => void} [onEnter]
 * @property {(e: InputEvent, input: HTMLInputElement) => boolean | void} [beforeInput] restituisce true se ha gestito l'input
 */

/**
 * @param {FieldOptions} o
 */
export function textField(o) {
  const id = uniqueId('f');
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const input = h('input', {
    id,
    type: o.type ?? 'text',
    class: `input${o.mono === false ? '' : ' mono'}`,
    value: o.value ?? '',
    placeholder: o.placeholder,
    inputmode: o.inputmode ?? 'text',
    autocomplete: o.autocomplete ?? 'off',
    autocapitalize: 'off',
    autocorrect: 'off',
    spellcheck: 'false',
    enterkeyhint: 'done',
    'aria-describedby': [o.hint ? hintId : null, errId].filter(Boolean).join(' '),
  });
  if (o.width) input.style.width = o.width;
  const error = h('p', { id: errId, class: 'field-error', 'aria-live': 'polite' });
  const el = h(
    'div',
    { class: 'field' },
    h('label', { for: id, class: 'field-label' }, o.label, o.optional ? h('span', { class: 'field-optional' }, ` (${t('ui.optional')})`) : null),
    input,
    o.hint ? h('p', { id: hintId, class: 'field-hint' }, o.hint) : null,
    error,
  );

  /** @type {string | null} */
  let pending = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;

  function show() {
    if (timer) clearTimeout(timer);
    timer = null;
    error.textContent = pending ?? '';
    if (pending) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  input.addEventListener('input', () => o.onInput?.(input.value));
  input.addEventListener('blur', () => {
    if (pending !== null) show();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      show();
      o.onEnter?.();
    }
  });
  if (o.beforeInput) {
    const fn = o.beforeInput;
    input.addEventListener('beforeinput', (e) => {
      if (fn(/** @type {InputEvent} */ (e), input)) e.preventDefault();
    });
  }

  return {
    el,
    input,
    get value() {
      return input.value;
    },
    /** @param {string} v */
    setValue(v) {
      if (input.value !== v) input.value = v;
    },
    /**
     * Errore da mostrare (dopo la pausa) oppure `null` per toglierlo subito.
     * @param {string | null} msg
     * @param {{ now?: boolean }} [opts]
     */
    setError(msg, opts = {}) {
      pending = msg;
      if (msg === null || opts.now) {
        show();
        return;
      }
      if (error.textContent === msg) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(show, ERROR_DELAY);
    },
    focus: () => input.focus(),
  };
}

/** @typedef {ReturnType<typeof textField>} TextField */

/**
 * Campo IP (9.4): tastiera numerica, virgola accettata (la converte il motore).
 * Se si incolla o si scrive `IP/n` o `IP mask`, la seconda parte passa al campo del prefisso
 * con `onSplit(resto)`: con la barra scritta a mano il cursore si sposta nel campo del prefisso.
 * @param {Omit<FieldOptions, 'beforeInput' | 'inputmode'> & { onSplit?: (rest: string, typed: boolean) => void }} o
 */
export function ipField(o) {
  const field = textField({
    ...o,
    inputmode: 'decimal',
    beforeInput(e, input) {
      // scrivendo, si divide solo alla barra: "IP mask" scritto a mano resta nel campo finché non si incolla
      if (!o.onSplit || !e.data || !e.data.includes('/')) return false;
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      const parts = splitAddress(input.value.slice(0, start) + e.data + input.value.slice(end));
      if (!parts) return false;
      input.value = parts.ip;
      o.onInput?.(parts.ip);
      o.onSplit(parts.rest, true);
      return true;
    },
  });
  // l'incolla nei browser che non danno i dati in beforeinput
  field.input.addEventListener('paste', (e) => {
    if (!o.onSplit) return;
    const text = e.clipboardData?.getData('text') ?? '';
    const parts = splitAddress(text);
    if (!parts) return;
    e.preventDefault();
    field.input.value = parts.ip;
    o.onInput?.(parts.ip);
    o.onSplit(parts.rest, false);
  });
  return field;
}

/**
 * Divide `IP/n`, `IP / n`, `IP/mask` e `IP mask` nelle due parti; `null` se non c'è una seconda parte.
 * Con la sola barra finale (`10.0.0.1/`) la seconda parte è vuota.
 * @param {string} text
 * @returns {{ ip: string, rest: string } | null}
 */
export function splitAddress(text) {
  const t = text.trim();
  const slash = /^([0-9.,]+)\s*\/\s*(.*)$/.exec(t);
  if (slash) return { ip: slash[1], rest: slash[2] };
  const space = /^([0-9.,]+)\s+([0-9.,]+\.[0-9.,]+)$/.exec(t);
  if (space) return { ip: space[1], rest: space[2] };
  return null;
}
