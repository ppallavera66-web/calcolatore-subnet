// @ts-check
/**
 * Pannello della cronologia (specifica tecnica, 9.1): gli ultimi calcoli della visita, un tocco li riapre.
 * Esiste sempre durante la visita; il salvataggio con "Memorizza i dati" arriva in fase 5.
 */
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { openDialog } from './dialog.js';
import { historySummary, dateTime } from '../format.js';
import { routeForEntry } from '../history-map.js';
import { clearHistory, removeHistory } from '../state.js';
import { t } from '../../i18n/strings.it.js';

/**
 * @param {import('../types.js').Ctx} ctx
 */
export function openHistoryPanel(ctx) {
  const list = h('ul', { class: 'history-list' });
  const count = h('p', { class: 'history-count', 'aria-live': 'polite' });
  const clearBtn = h('button', { type: 'button', class: 'btn btn-ghost btn-sm' }, icon('trash', { size: 16 }), h('span', {}, t('ui.history.clear')));

  function render() {
    const items = ctx.store.get().history;
    count.textContent = t('ui.history.count', { n: items.length });
    clearBtn.disabled = items.length === 0;
    list.replaceChildren(
      ...(items.length === 0
        ? [h('li', { class: 'history-empty' }, t('ui.history.empty'))]
        : items.map((entry) => {
            const summary = historySummary(entry);
            return h(
              'li',
              { class: 'history-item' },
              h(
                'button',
                {
                  type: 'button',
                  class: 'history-open',
                  onclick: () => {
                    const { view, params } = routeForEntry(entry);
                    close();
                    ctx.go(view, params);
                  },
                },
                h('span', { class: 'history-fn' }, t(`ui.fn.${entry.fn}`)),
                h('span', { class: 'history-summary mono' }, summary),
                h('span', { class: 'history-time' }, dateTime(entry.at)),
              ),
              h('button', {
                type: 'button',
                class: 'icon-btn',
                'aria-label': t('ui.history.remove', { summary }),
                title: t('ui.history.remove', { summary }),
                onclick: () => ctx.store.set((s) => removeHistory(s, entry.id)),
              }, icon('close', { size: 18 })),
            );
          })),
    );
  }

  clearBtn.addEventListener('click', () => {
    ctx.store.set(clearHistory);
    ctx.announce(t('ui.history.cleared'));
  });
  const off = ctx.store.subscribe((s, prev) => {
    if (s.history !== prev.history) render();
  });
  render();
  const { close } = openDialog({
    title: t('ui.history.title'),
    sheet: true,
    body: [count, list, h('div', { class: 'history-foot' }, clearBtn, h('p', { class: 'field-hint' }, t('ui.history.note')))],
    onClose: off,
  });
}
