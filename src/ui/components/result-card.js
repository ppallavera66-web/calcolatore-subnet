// @ts-check
/**
 * Scheda risultato (specifica tecnica, 9.4): valori principali in evidenza, ogni valore con il
 * pulsante "copia", etichetta del tipo e riquadro degli avvisi.
 */
import { h, uniqueId } from '../dom.js';
import { icon } from '../icons.js';
import { message } from '../format.js';
import { t } from '../../i18n/strings.it.js';

/**
 * @typedef {object} Item
 * @property {string} label
 * @property {string} value
 * @property {string | boolean} [copy] testo da copiare (predefinito o true: il valore); false = niente pulsante
 * @property {boolean} [mono] carattere a spaziatura fissa (predefinito: sì)
 * @property {string} [note] testo secondario sotto il valore
 * @property {boolean} [wide] occupa tutta la riga della griglia
 */

/**
 * Coppia etichetta/valore con pulsante di copia.
 * @param {import('../types.js').Ctx} ctx
 * @param {Item} item
 */
export function kvItem(ctx, item) {
  const copyText = item.copy === undefined || item.copy === true ? item.value : item.copy;
  return h(
    'div',
    { class: `kv-item${item.wide ? ' kv-wide' : ''}` },
    h('dt', {}, item.label),
    h(
      'dd',
      {},
      h('span', { class: `kv-value${item.mono === false ? '' : ' mono'}` }, item.value),
      copyText ? copyButton(ctx, copyText, item.label) : null,
      item.note ? h('span', { class: 'kv-note' }, item.note) : null,
    ),
  );
}

/**
 * Pulsante "copia" con etichetta accessibile ("Copia Rete").
 * @param {import('../types.js').Ctx} ctx
 * @param {string} text
 * @param {string} what
 */
export function copyButton(ctx, text, what) {
  const label = t('ui.copy', { what });
  const btn = h('button', { type: 'button', class: 'icon-btn copy-btn', 'aria-label': label, title: label }, icon('copy', { size: 18 }));
  btn.addEventListener('click', async () => {
    await ctx.copy(text, what);
    btn.classList.add('done');
    btn.replaceChildren(icon('check', { size: 18 }));
    setTimeout(() => {
      btn.classList.remove('done');
      btn.replaceChildren(icon('copy', { size: 18 }));
    }, 1200);
  });
  return btn;
}

/**
 * Sì o no con icona e testo (mai il solo colore).
 * @param {boolean} value
 */
export function yesNo(value) {
  return h('span', { class: `yesno ${value ? 'ok-c' : 'w-c'}` }, icon(value ? 'check' : 'close', { size: 16 }), t(value ? 'ui.yes' : 'ui.no'));
}

/**
 * @param {import('../types.js').Ctx} ctx
 * @param {{ title?: string, lead?: Node | null, badge?: { text: string, kind: string, title?: string } | null, primary?: Item[], items?: Item[],
 *   warnings?: { code: string, params: Record<string, any> }[], children?: (Node | null)[] }} o
 */
export function resultCard(ctx, o) {
  const id = uniqueId('res');
  return h(
    'section',
    { class: 'card result-card', 'aria-labelledby': id },
    h(
      'header',
      { class: 'card-head' },
      h('h2', { id, class: 'card-title' }, o.title ?? t('ui.result')),
      o.badge ? h('span', { class: `badge badge-${o.badge.kind}`, title: o.badge.title }, o.badge.text) : null,
    ),
    o.lead ?? null,
    o.primary?.length ? h('dl', { class: 'kv kv-primary' }, o.primary.map((i) => kvItem(ctx, i))) : null,
    o.items?.length ? h('dl', { class: 'kv' }, o.items.map((i) => kvItem(ctx, i))) : null,
    o.warnings?.length ? warningsBox(o.warnings) : null,
    o.children ?? [],
  );
}

/**
 * Riquadro degli avvisi (9.8).
 * @param {{ code: string, params?: Record<string, any> }[]} warnings
 */
export function warningsBox(warnings) {
  return h(
    'div',
    { class: 'notice notice-warn', role: 'note' },
    h('p', { class: 'notice-title' }, icon('warn', { size: 18 }), t('ui.warnings')),
    h('ul', {}, warnings.map((w) => h('li', {}, message(w)))),
  );
}

/**
 * Riquadro informativo semplice.
 * @param {string | Node} content
 * @param {'info' | 'ok' | 'warn' | 'error'} [kind]
 */
export function notice(content, kind = 'info') {
  return h('div', { class: `notice notice-${kind}`, role: 'note' }, typeof content === 'string' ? h('p', {}, content) : content);
}
