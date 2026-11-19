// @ts-check
/**
 * Barra di export (specifica tecnica, 5 e 9.4), visibile con l'interruttore Export.
 * Predisposta in fase 4: la stampa funziona, i formati (Copia, CSV, JSON, Markdown, Testo, Snippet)
 * vengono collegati in fase 5. Su telefono diventa un pulsante "Esporta" che apre un pannello dal basso.
 */
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { openDialog } from './dialog.js';
import { t } from '../../i18n/strings.it.js';

const FORMATS = ['copy', 'csv', 'json', 'md', 'text'];

/**
 * @param {import('../types.js').Ctx} ctx
 * @param {{ snippet?: boolean }} [o]
 */
export function exportBar(ctx, o = {}) {
  const formats = o.snippet ? [...FORMATS, 'snippet'] : FORMATS;
  const pendingNote = t('ui.export.pending');
  const buttons = () => [
    ...formats.map((f) =>
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm', 'aria-disabled': 'true', title: pendingNote, dataset: { format: f } }, t(`ui.export.${f}`)),
    ),
    h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => ctx.print() }, icon('print', { size: 16 }), h('span', {}, t('ui.export.print'))),
  ];
  const sheetButton = h('button', {
    type: 'button',
    class: 'btn btn-ghost export-sheet-btn',
    'aria-haspopup': 'dialog',
    onclick: () =>
      openDialog({
        title: t('ui.export.title'),
        sheet: true,
        body: [h('div', { class: 'export-grid' }, buttons()), h('p', { class: 'field-hint' }, pendingNote)],
      }),
  }, icon('export', { size: 18 }), h('span', {}, t('ui.export.title')));
  return h(
    'div',
    { class: 'export-bar' },
    h('div', { class: 'export-toolbar', role: 'toolbar', 'aria-label': t('ui.export.title') }, buttons()),
    sheetButton,
    h('p', { class: 'export-note' }, pendingNote),
  );
}
