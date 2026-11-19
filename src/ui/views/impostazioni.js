// @ts-check
/**
 * Impostazioni (specifica tecnica, 9.5): interruttori, metodo predefinito, tema, dati, informazioni.
 * In fase 4 tutto resta in memoria: "Memorizza i dati", export e import della sessione arrivano in fase 5.
 * "Cancella tutti i dati" funziona già sullo stato in memoria (cronologia e impostazioni), con conferma.
 */
import { h } from '../dom.js';
import { toggle, segmented, button } from '../components/controls.js';
import { confirmDialog } from '../components/dialog.js';
import { notice } from '../components/result-card.js';
import { setSetting, initialState, THEMES, DIDACTIC_METHODS } from '../state.js';
import { t } from '../../i18n/strings.it.js';
import ofl from '../../assets/fonts/OFL.txt?raw';

/** Indirizzo del repository pubblico: da completare con il nome utente GitHub (vedi STATO_PROGETTO.md). */
export const REPO_URL = '';

/**
 * @param {import('../types.js').Ctx} ctx
 * @returns {import('../types.js').View}
 */
export function createImpostazioni(ctx) {
  const s0 = ctx.store.get().settings;
  const set = (/** @type {string} */ key, /** @type {unknown} */ value) => ctx.store.set((s) => setSetting(s, key, value));

  const method = segmented({
    legend: t('ui.set.method'),
    options: DIDACTIC_METHODS.map((m) => ({ value: m, label: t(`method.${m}`) })),
    value: s0.didacticMethod,
    onChange: (v) => set('didacticMethod', v),
  });
  const methodDesc = h('p', { class: 'setting-desc' }, t('ui.set.method.desc'));
  const methodBox = h('div', { class: 'setting-block' }, method.el, methodDesc);
  const setMethodEnabled = (/** @type {boolean} */ on) => {
    for (const i of method.el.querySelectorAll('input')) /** @type {HTMLInputElement} */ (i).disabled = !on;
    methodBox.classList.toggle('is-disabled', !on);
  };

  const didactic = toggle({ label: t('ui.set.didactic'), description: t('ui.set.didactic.desc'), checked: s0.didactic, onChange: (v) => { set('didactic', v); setMethodEnabled(v); } });
  const exportT = toggle({ label: t('ui.set.export'), description: t('ui.set.export.desc'), checked: s0.exportBar, onChange: (v) => set('exportBar', v) });
  setMethodEnabled(s0.didactic);

  const theme = segmented({
    legend: t('ui.set.theme'),
    hideLegend: true,
    options: THEMES.map((th) => ({ value: th, label: t(`ui.theme.${th}`) })),
    value: s0.theme,
    onChange: (v) => set('theme', v),
  });

  const persist = toggle({ label: t('ui.set.persist'), description: t('ui.set.persist.desc'), checked: false, disabled: true, note: t('ui.set.persist.pending') });

  async function clearAll() {
    const ok = await confirmDialog({ title: t('ui.set.clear.title'), text: t('ui.set.clear.body'), confirm: t('ui.set.clear.ok'), danger: true });
    if (!ok) return;
    const fresh = initialState().settings;
    ctx.store.set((s) => ({ ...s, settings: fresh, methods: {}, history: [] }));
    didactic.setChecked(fresh.didactic);
    exportT.setChecked(fresh.exportBar);
    method.setValue(fresh.didacticMethod);
    theme.setValue(fresh.theme);
    setMethodEnabled(fresh.didactic);
    ctx.toast(t('ui.set.cleared'));
  }

  const section = (/** @type {string} */ title, /** @type {(Node | null)[]} */ children) =>
    h('section', { class: 'card settings-card' }, h('h2', { class: 'card-title' }, title), children);

  const row = (/** @type {string} */ k, /** @type {Node | string} */ v) => h('div', { class: 'kv-item' }, h('dt', {}, k), h('dd', {}, v));

  const el = h('div', { class: 'view view-impostazioni' },
    section(t('ui.set.modes'), [didactic.el, methodBox, exportT.el]),
    section(t('ui.set.theme'), [theme.el, h('p', { class: 'setting-desc' }, t('ui.theme.auto.desc'))]),
    section(t('ui.set.data'), [
      persist.el,
      notice(t('ui.set.persist.note')),
      h('div', { class: 'button-row' },
        button(t('ui.set.exportSession'), () => {}, { disabled: true, icon: 'export' }),
        button(t('ui.set.importSession'), () => {}, { disabled: true })),
      h('p', { class: 'setting-note' }, t('ui.set.session.pending')),
      h('div', { class: 'setting setting-danger' },
        h('div', { class: 'setting-text' }, h('p', { class: 'setting-label' }, t('ui.set.clear')), h('p', { class: 'setting-desc' }, t('ui.set.clear.desc'))),
        button(t('ui.set.clear'), clearAll, { kind: 'danger', icon: 'trash' })),
    ]),
    section(t('ui.set.about'), [
      h('dl', { class: 'kv kv-compact' },
        row(t('ui.about.version'), h('span', { class: 'mono' }, __APP_VERSION__)),
        row(t('ui.about.build'), h('span', { class: 'mono' }, __BUILD_DATE__)),
        row(t('ui.about.code'), t('ui.about.codeLicense')),
        row(t('ui.about.fonts'), t('ui.about.fontsLicense')),
        row(t('ui.about.engine'), t('ui.about.engineText')),
        row(t('ui.about.repo'), REPO_URL ? h('a', { href: REPO_URL, rel: 'noopener' }, t('ui.about.repoText')) : t('ui.about.repoText'))),
      h('details', { class: 'license' }, h('summary', {}, t('ui.about.ofl')), h('pre', { class: 'license-text' }, ofl)),
    ]),
  );

  return { el };
}
