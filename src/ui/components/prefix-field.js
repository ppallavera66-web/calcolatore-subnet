// @ts-check
/**
 * Campo "prefisso o mask" (specifica tecnica, 9.4): accetta `/20`, `20` o `255.255.240.0`,
 * con cursore 0–32 e pulsanti − e +; accanto mostra l'altra forma (`/20 = 255.255.240.0`).
 * Cursore e pulsanti scrivono nella forma già in uso: `/n`, oppure la mask se l'utente ha scritto una mask.
 */
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { textField } from './field.js';
import { parsePrefixOrMask, maskOf, toDotted } from '../../engine/index.js';
import { t } from '../../i18n/strings.it.js';

/**
 * @param {{ label: string, value?: string, hint?: string, optional?: boolean, placeholder?: string, slider?: boolean,
 *   onInput?: (value: string) => void, onEnter?: () => void }} o
 */
export function prefixField(o) {
  /** @type {'cidr' | 'mask'} */
  let form = 'cidr';
  const field = textField({
    label: o.label,
    value: o.value,
    hint: o.hint ?? t('ui.field.prefix.hint'),
    placeholder: o.placeholder ?? '/24',
    inputmode: 'decimal',
    width: '17ch',
    optional: o.optional,
    onInput: (v) => {
      sync(v);
      o.onInput?.(v);
    },
    onEnter: o.onEnter,
  });
  const other = h('output', { class: 'prefix-other mono', for: field.input.id });
  const slider = h('input', {
    type: 'range',
    min: '0',
    max: '32',
    step: '1',
    value: '24',
    class: 'prefix-slider',
    'aria-label': t('ui.prefix.slider'),
    oninput: () => setFromNumber(Number(slider.value)),
  });
  const dec = h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('ui.prefix.dec'), title: t('ui.prefix.dec'), onclick: () => step(-1) }, icon('minus'));
  const inc = h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('ui.prefix.inc'), title: t('ui.prefix.inc'), onclick: () => step(+1) }, icon('plus'));
  const controls = o.slider === false ? null : h('div', { class: 'prefix-controls' }, dec, slider, inc);
  field.el.classList.add('field-prefix');
  const ref = field.input.nextSibling; // suggerimento o errore: riga e controlli vanno prima
  field.el.insertBefore(h('div', { class: 'prefix-row' }, field.input, other), ref);
  if (controls) field.el.insertBefore(controls, ref);

  /** Prefisso corrente se il testo è valido, altrimenti null. */
  function current() {
    const r = parsePrefixOrMask(field.input.value);
    return r.ok ? r.value : null;
  }

  /** @param {string} v */
  function sync(v) {
    const r = parsePrefixOrMask(v);
    if (r.ok) {
      form = r.value.source === 'mask' ? 'mask' : 'cidr';
      const p = r.value.prefix;
      slider.value = String(p);
      slider.setAttribute('aria-valuetext', t('ui.prefix.valuetext', { prefix: p, mask: toDotted(maskOf(p)) }));
      other.textContent = form === 'mask' ? `= /${p}` : `= ${toDotted(maskOf(p))}`;
    } else {
      other.textContent = '';
      slider.removeAttribute('aria-valuetext');
    }
    dec.disabled = r.ok && r.value.prefix === 0;
    inc.disabled = r.ok && r.value.prefix === 32;
  }

  /** @param {number} p */
  function setFromNumber(p) {
    const text = form === 'mask' ? toDotted(maskOf(p)) : `/${p}`;
    field.input.value = text;
    sync(text);
    o.onInput?.(text);
  }

  /** @param {number} delta */
  function step(delta) {
    const c = current();
    const base = c ? c.prefix : Number(slider.value);
    setFromNumber(Math.max(0, Math.min(32, base + delta)));
  }

  sync(field.input.value);

  return {
    ...field,
    el: field.el,
    input: field.input,
    get value() {
      return field.input.value;
    },
    /** @param {string} v */
    setValue(v) {
      field.setValue(v);
      sync(v);
    },
  };
}
