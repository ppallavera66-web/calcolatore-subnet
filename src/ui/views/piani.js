// @ts-check
/**
 * Pianifica · Piani salvati (specifica tecnica, 9.1): elenco dei piani di suddivisione creati con
 * "Salva come piano", con apertura in Suddivisione (etichette modificabili), nome e note, eliminazione.
 * Nomi, note ed etichette vengono dall'utente o da un file importato: si mostrano solo come testo.
 */
import { h, replace } from '../dom.js';
import { button } from '../components/controls.js';
import { confirmDialog } from '../components/dialog.js';
import { notice } from '../components/result-card.js';
import { openPlanDialog } from '../components/plan-dialog.js';
import { updatePlan, removePlan } from '../state.js';
import { dateTime } from '../format.js';
import { subdivide, parseIPv4 } from '../../engine/index.js';
import { t } from '../../i18n/strings.it.js';

/**
 * Numero di subnet di un piano.
 * @param {import('../state.js').Plan} p
 */
function countOf(p) {
  const ip = parseIPv4(p.input.block);
  if (!ip.ok) return 0;
  const r = subdivide(ip.value, p.input.prefix, p.input.newPrefix, { limit: 1 });
  return r.ok ? r.value.count : 0;
}

/**
 * Parametri di Suddivisione per aprire un piano.
 * @param {import('../state.js').Plan} p
 */
export const planParams = (p) => ({ b: p.input.block, p: String(p.input.prefix), np: String(p.input.newPrefix), piano: p.id });

/**
 * @param {import('../types.js').Ctx} ctx
 * @returns {import('../types.js').View}
 */
export function createPiani(ctx) {
  const list = h('div', { class: 'plans' });

  function render() {
    const { plans, settings } = ctx.store.get();
    if (!plans.length) {
      replace(list, h('section', { class: 'card empty-card' },
        h('p', { class: 'empty-title' }, t('ui.plans.empty')),
        h('p', {}, t('ui.plans.emptyHint')),
        h('p', {}, button(t('ui.plans.toSubdivide'), () => ctx.go('pianifica/suddivisione'), { icon: 'pianifica' }))));
      return;
    }
    replace(list,
      h('p', { class: 'list-caption' }, t('ui.plans.count', { n: plans.length })),
      settings.persist ? null : notice(t('ui.plans.notPersisted')),
      h('ul', { class: 'plan-list' }, plans.map((p) => h('li', { class: 'card plan-card', dataset: { id: p.id } },
        h('h2', { class: 'plan-name' }, h('a', { href: ctx.href('pianifica/suddivisione', planParams(p)) }, p.name)),
        h('p', { class: 'plan-meta mono' }, t('ui.plans.summary', { block: `${p.input.block}/${p.input.prefix}`, np: p.input.newPrefix, count: countOf(p), labels: Object.keys(p.labels).length })),
        p.notes ? h('p', { class: 'plan-notes' }, p.notes) : null,
        h('p', { class: 'plan-date' }, t('ui.plans.updatedAt', { date: dateTime(p.updatedAt) })),
        h('div', { class: 'button-row' },
          button(t('ui.plans.open'), () => ctx.go('pianifica/suddivisione', planParams(p)), { kind: 'primary', icon: 'pianifica' }),
          button(t('ui.plans.edit'), () => openPlanDialog({
            title: t('ui.plans.editTitle'), name: p.name, notes: p.notes, confirm: t('ui.plans.saveChanges'),
            onSave: (name, notes) => {
              ctx.store.set((s) => updatePlan(s, p.id, { name, notes }, ctx.now()));
              ctx.toast(t('ui.plans.updated'));
            },
          }), { icon: 'edit' }),
          button(t('ui.plans.delete'), async () => {
            const ok = await confirmDialog({ title: t('ui.plans.delete.title'), text: t('ui.plans.delete.body', { name: p.name }), confirm: t('ui.plans.delete'), danger: true });
            if (!ok) return;
            ctx.store.set((s) => removePlan(s, p.id));
            ctx.toast(t('ui.plans.deleted'));
          }, { kind: 'danger', icon: 'trash' }))))));
  }

  render();
  const unsubscribe = ctx.store.subscribe((s, prev) => {
    if (s.plans !== prev.plans || s.settings.persist !== prev.settings.persist) render();
  });

  return {
    el: h('div', { class: 'view view-piani' }, list),
    destroy: unsubscribe,
  };
}
