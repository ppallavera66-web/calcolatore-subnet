// @ts-check
/**
 * Controlli comuni: controllo segmentato (gruppo di radio), interruttore (role="switch"),
 * pulsante "?" verso la guida all'uso, esempi cliccabili dello stato vuoto (9.4).
 */
import { h, uniqueId } from '../dom.js';
import { icon } from '../icons.js';
import { t } from '../../i18n/strings.it.js';

/**
 * Controllo segmentato: radio nativi (frecce da tastiera) dentro un fieldset con legenda.
 * @param {{ legend: string, hideLegend?: boolean, options: { value: string, label: string }[], value: string,
 *   onChange: (value: string) => void, small?: boolean }} o
 */
export function segmented(o) {
  const name = uniqueId('seg');
  /** @type {HTMLInputElement[]} */
  const inputs = [];
  const el = h(
    'fieldset',
    { class: `segmented${o.small ? ' segmented-sm' : ''}` },
    h('legend', { class: o.hideLegend ? 'sr-only' : 'segmented-legend' }, o.legend),
    h(
      'div',
      { class: 'segmented-options' },
      o.options.map((opt) => {
        const id = uniqueId('opt');
        const input = h('input', { type: 'radio', id, name, value: opt.value, checked: opt.value === o.value, onchange: () => o.onChange(opt.value) });
        inputs.push(input);
        return h('span', { class: 'segmented-option' }, input, h('label', { for: id }, opt.label));
      }),
    ),
  );
  return {
    el,
    /** @param {string} v */
    setValue(v) {
      for (const i of inputs) i.checked = i.value === v;
    },
  };
}

/**
 * Interruttore (9.4): `role="switch"` con `aria-checked`, etichetta e descrizione dell'effetto.
 * @param {{ label: string, description?: string, checked: boolean, disabled?: boolean, note?: string, onChange?: (v: boolean) => void }} o
 */
export function toggle(o) {
  const id = uniqueId('sw');
  const descId = `${id}-desc`;
  const noteId = `${id}-note`;
  const btn = h(
    'button',
    {
      type: 'button',
      id,
      role: 'switch',
      class: 'switch',
      'aria-checked': String(o.checked),
      'aria-labelledby': `${id}-label`,
      'aria-describedby': [o.description ? descId : null, o.note ? noteId : null].filter(Boolean).join(' ') || null,
      disabled: o.disabled,
    },
    h('span', { class: 'switch-track', 'aria-hidden': 'true' }, h('span', { class: 'switch-thumb' })),
  );
  btn.addEventListener('click', () => {
    const next = btn.getAttribute('aria-checked') !== 'true';
    btn.setAttribute('aria-checked', String(next));
    o.onChange?.(next);
  });
  const el = h(
    'div',
    { class: `setting${o.disabled ? ' is-disabled' : ''}` },
    h('div', { class: 'setting-text' },
      h('label', { id: `${id}-label`, for: id, class: 'setting-label' }, o.label),
      o.description ? h('p', { id: descId, class: 'setting-desc' }, o.description) : null,
      o.note ? h('p', { id: noteId, class: 'setting-note' }, o.note) : null),
    btn,
  );
  return {
    el,
    /** @param {boolean} v */
    setChecked(v) {
      btn.setAttribute('aria-checked', String(v));
    },
  };
}

/**
 * Pulsante "?" accanto al titolo di una funzione: apre il paragrafo della guida all'uso (fase 6).
 * @param {import('../types.js').Ctx} ctx
 * @param {string} topic nome della funzione, per l'etichetta
 * @param {string} anchor sezione della guida all'uso
 */
export function helpLink(ctx, topic, anchor) {
  const label = t('ui.help', { topic });
  return h('a', { class: 'icon-btn help-link', href: ctx.href('guide/uso', {}, anchor), 'aria-label': label, title: label }, icon('help'));
}

/**
 * Esempi cliccabili dello stato iniziale vuoto (9.4).
 * @param {{ label: string, onPick: () => void }[]} items
 */
export function examples(items) {
  return h(
    'div',
    { class: 'examples' },
    h('span', { class: 'examples-label' }, t('ui.empty.try')),
    items.map((it) => h('button', { type: 'button', class: 'chip mono', onclick: it.onPick }, it.label)),
  );
}

/**
 * Pulsante.
 * @param {string} label
 * @param {() => void} onClick
 * @param {{ kind?: 'primary' | 'ghost' | 'danger', icon?: import('../icons.js').IconName, disabled?: boolean, title?: string }} [o]
 */
export function button(label, onClick, o = {}) {
  return h(
    'button',
    { type: 'button', class: `btn btn-${o.kind ?? 'ghost'}`, onclick: onClick, disabled: o.disabled, title: o.title },
    o.icon ? icon(o.icon, { size: 18 }) : null,
    h('span', {}, label),
  );
}
