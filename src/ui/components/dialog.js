// @ts-check
/**
 * Finestre di dialogo con l'elemento <dialog> (specifica tecnica, 9.4): conferme, cronologia,
 * pannello di export su telefono. `showModal` gestisce focus, Esc e inerzia del resto della pagina;
 * alla chiusura il focus torna al controllo che l'ha aperta.
 */
import { h, uniqueId } from '../dom.js';
import { icon } from '../icons.js';
import { t } from '../../i18n/strings.it.js';

/**
 * @param {{ title: string, body: (Node | string | null)[], actions?: { label: string, kind?: 'primary' | 'ghost' | 'danger', onClick?: () => void | boolean }[],
 *   sheet?: boolean, wide?: boolean, onClose?: () => void }} o
 */
export function openDialog(o) {
  const id = uniqueId('dlg');
  const opener = /** @type {HTMLElement | null} */ (document.activeElement);
  const close = () => dialog.close();
  const dialog = h(
    'dialog',
    { class: `dialog${o.sheet ? ' dialog-sheet' : ''}${o.wide ? ' dialog-wide' : ''}`, 'aria-labelledby': id },
    h(
      'div',
      { class: 'dialog-inner' },
      h('header', { class: 'dialog-head' },
        h('h2', { id, class: 'dialog-title' }, o.title),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('ui.close'), title: t('ui.close'), onclick: close }, icon('close'))),
      h('div', { class: 'dialog-body' }, o.body),
      o.actions?.length
        ? h('footer', { class: 'dialog-actions' }, o.actions.map((a) =>
            h('button', { type: 'button', class: `btn btn-${a.kind ?? 'ghost'}`, onclick: () => { if (a.onClick?.() !== false) close(); } }, a.label)))
        : null,
    ),
  );
  // un clic sullo sfondo chiude
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
  dialog.addEventListener('close', () => {
    dialog.remove();
    o.onClose?.();
    opener?.focus?.({ preventScroll: true });
  });
  document.body.appendChild(dialog);
  dialog.showModal();
  return { dialog, close };
}

/**
 * Conferma esplicita (es. "Cancella tutti i dati").
 * @param {{ title: string, text: string, confirm: string, danger?: boolean }} o
 * @returns {Promise<boolean>}
 */
export function confirmDialog(o) {
  return new Promise((resolve) => {
    let ok = false;
    openDialog({
      title: o.title,
      body: [h('p', {}, o.text)],
      actions: [
        { label: t('ui.cancel') },
        { label: o.confirm, kind: o.danger ? 'danger' : 'primary', onClick: () => { ok = true; } },
      ],
      onClose: () => resolve(ok),
    });
  });
}
