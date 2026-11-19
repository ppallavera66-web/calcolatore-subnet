// @ts-check
/**
 * Finestra con nome e note di un piano (6.1: nome 1–80 caratteri, note fino a 2.000 con a capo).
 * Usata da "Salva come piano" (Suddivisione) e da "Nome e note" (Piani salvati).
 */
import { h, uniqueId } from '../dom.js';
import { openDialog } from './dialog.js';
import { textField } from './field.js';
import { cleanPlanText, PLAN_NOTES_MAX } from '../state.js';
import { t } from '../../i18n/strings.it.js';

/**
 * @param {{ title: string, name: string, notes: string, confirm: string, onSave: (name: string, notes: string) => void }} o
 */
export function openPlanDialog(o) {
  const name = textField({ label: t('ui.plans.name'), value: o.name, hint: t('ui.plans.name.hint'), mono: false, width: 'min(40ch, 100%)' });
  name.input.maxLength = 160;
  const notesId = uniqueId('notes');
  const notes = h('textarea', { id: notesId, class: 'input textarea', rows: '5', 'aria-describedby': `${notesId}-hint` });
  notes.value = o.notes;
  const err = h('p', { class: 'form-error', role: 'alert' });
  const save = () => {
    const c = cleanPlanText(name.value, notes.value);
    if (!c) {
      err.textContent = t('ui.plans.invalid');
      name.focus();
      return false;
    }
    o.onSave(c.name, c.notes);
    return true;
  };
  const form = h('form', { class: 'dialog-form', novalidate: true, onsubmit: (/** @type {Event} */ e) => { e.preventDefault(); if (save()) dlg.close(); } },
    name.el,
    h('div', { class: 'field' },
      h('label', { for: notesId, class: 'field-label' }, t('ui.plans.notes')),
      notes,
      h('p', { id: `${notesId}-hint`, class: 'field-hint' }, t('ui.plans.notes.hint'))),
    err);
  notes.maxLength = PLAN_NOTES_MAX * 2;
  const dlg = openDialog({
    title: o.title,
    body: [form],
    actions: [{ label: t('ui.cancel') }, { label: o.confirm, kind: 'primary', onClick: save }],
  });
  name.input.select();
  name.focus();
  return dlg;
}
