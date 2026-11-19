// @ts-check
/**
 * Impostazioni (specifica tecnica, 9.5): interruttori, metodo predefinito, tema, dati, informazioni.
 * Dati: "Memorizza i dati" (8.3, spegnimento con conferma), esporta e importa la sessione (6, 7),
 * "Cancella tutti i dati", sempre visibili. Informazioni: versione, licenze, repository e la
 * compatibilità di questo browser (contesto sicuro, Web Crypto, localStorage, appunti).
 * La vista segue lo stato: un import o un'altra scheda aggiornano subito gli interruttori.
 */
import { h, replace } from '../dom.js';
import { toggle, segmented, button } from '../components/controls.js';
import { confirmDialog } from '../components/dialog.js';
import { notice } from '../components/result-card.js';
import { openExportSession, importSessionFile } from '../components/session-dialogs.js';
import { setSetting, initialState, THEMES, DIDACTIC_METHODS } from '../state.js';
import { dateTime } from '../format.js';
import { cryptoAvailable } from '../../session/envelope.js';
import { t, fmtNumber } from '../../i18n/strings.it.js';
import ofl from '../../assets/fonts/OFL.txt?raw';

/** Indirizzo del repository pubblico: da completare con il nome utente GitHub (vedi STATO_PROGETTO.md). */
export const REPO_URL = '';

/**
 * Compatibilità del browser per la pagina aperta così (verifiche della fase 5, sezione 11).
 * @param {boolean} storageOk
 */
export function environment(storageOk) {
  const proto = location.protocol.replace(':', '');
  return {
    protocol: ['file', 'https', 'http'].includes(proto) ? proto : 'other',
    secure: !!window.isSecureContext,
    crypto: cryptoAvailable(),
    storage: storageOk,
    clipboard: !!(navigator.clipboard && typeof navigator.clipboard.writeText === 'function' && window.isSecureContext),
  };
}

/**
 * @param {import('../types.js').Ctx} ctx
 * @returns {import('../types.js').View}
 */
export function createImpostazioni(ctx) {
  const s0 = ctx.store.get().settings;
  const set = (/** @type {string} */ key, /** @type {unknown} */ value) => ctx.store.set((s) => setSetting(s, key, value));
  const persistence = ctx.persistence;

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

  // ---------------------------------------------------------------- Memorizza i dati (8.3)
  const available = persistence.status().available;
  const persist = toggle({
    label: t('ui.set.persist'),
    description: t('ui.set.persist.desc'),
    checked: s0.persist,
    disabled: !available,
    note: available ? undefined : t('ui.set.persist.unavailable'),
    onChange: (v) => void onPersist(v),
  });
  const persistInfo = h('div', { class: 'persist-info', 'aria-live': 'polite' });

  /** @param {boolean} on */
  async function onPersist(on) {
    if (on) {
      const stored = await persistence.needsOverwrite();
      if (stored) {
        const newer = stored === 'newer';
        const sure = await confirmDialog({
          title: t('ui.set.persist.overwrite.title'),
          text: t(newer ? 'ui.set.persist.overwrite.newer' : 'ui.set.persist.overwrite.corrupt'),
          confirm: t('ui.set.persist.overwrite.ok'),
          danger: true,
        });
        if (!sure) {
          persist.setChecked(false);
          return;
        }
      }
      const ok = await persistence.enable();
      ctx.toast(ok ? t('ui.set.persist.on') : t('ui.set.persist.quota'));
    } else {
      const sure = await confirmDialog({ title: t('ui.set.persist.off.title'), text: t('ui.set.persist.off.body'), confirm: t('ui.set.persist.off.ok'), danger: true });
      if (!sure) {
        persist.setChecked(true);
        return;
      }
      await persistence.disable();
      ctx.toast(t('ui.set.persist.offDone'));
    }
    void refreshInfo();
  }

  async function refreshInfo() {
    const st = persistence.status();
    /** @type {(Node | null)[]} */
    const parts = [];
    if (st.load === 'corrupt' || st.load === 'newer') {
      parts.push(h('div', { class: 'notice notice-warn', role: 'note' },
        h('p', {}, t(st.load === 'corrupt' ? 'ui.set.persist.corrupt' : 'ui.set.persist.newer')),
        button(t('ui.set.persist.clearStored'), async () => {
          await persistence.clearStored();
          void refreshInfo();
        }, { kind: 'danger', icon: 'trash' })));
    }
    if (st.skipped && ctx.store.get().settings.persist) parts.push(h('p', { class: 'setting-note' }, t('ui.set.persist.skipped', { n: st.skipped })));
    if (st.problem) parts.push(notice(t(st.problem === 'quota' ? 'ui.set.persist.quota' : 'ui.set.persist.writeFailed'), 'warn'));
    if (ctx.store.get().settings.persist && st.savedAt) {
      const u = await persistence.usage();
      const kb = u.ok ? fmtNumber(Math.max(1, Math.round(u.bytes / 1024))) : '0';
      parts.push(h('p', { class: 'setting-note' }, t('ui.set.persist.saved', { date: dateTime(st.savedAt), kb })));
    }
    replace(persistInfo, ...parts);
  }

  // ---------------------------------------------------------------- sessione (6, 7)
  const fileInput = h('input', { type: 'file', accept: '.json,application/json', class: 'sr-only', tabindex: '-1', 'aria-hidden': 'true' });
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    fileInput.value = '';
    if (f) void importSessionFile(ctx, f);
  });

  async function clearAll() {
    const ok = await confirmDialog({ title: t('ui.set.clear.title'), text: t('ui.set.clear.body'), confirm: t('ui.set.clear.ok'), danger: true });
    if (!ok) return;
    await persistence.clearStored();
    const fresh = initialState().settings;
    ctx.store.set((s) => ({ ...s, settings: fresh, methods: {}, history: [], plans: [] }));
    ctx.toast(t('ui.set.cleared'));
    void refreshInfo();
  }

  const section = (/** @type {string} */ title, /** @type {(Node | null)[]} */ children) =>
    h('section', { class: 'card settings-card' }, h('h2', { class: 'card-title' }, title), children);

  const row = (/** @type {string} */ k, /** @type {Node | string} */ v) => h('div', { class: 'kv-item' }, h('dt', {}, k), h('dd', {}, v));
  const yn = (/** @type {boolean} */ b) => t(b ? 'ui.env.yes' : 'ui.env.no');
  const env = environment(available);

  const el = h('div', { class: 'view view-impostazioni' },
    section(t('ui.set.modes'), [didactic.el, methodBox, exportT.el]),
    section(t('ui.set.theme'), [theme.el, h('p', { class: 'setting-desc' }, t('ui.theme.auto.desc'))]),
    section(t('ui.set.data'), [
      persist.el,
      persistInfo,
      notice(t('ui.set.persist.note')),
      h('div', { class: 'setting setting-session' },
        h('div', { class: 'setting-text' }, h('p', { class: 'setting-label' }, t('ui.set.session')), h('p', { class: 'setting-desc' }, t('ui.set.session.desc'))),
        h('div', { class: 'button-row' },
          button(t('ui.set.exportSession'), () => openExportSession(ctx), { icon: 'export' }),
          button(t('ui.set.importSession'), () => fileInput.click(), { icon: 'import' }),
          fileInput)),
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
      h('h3', { class: 'subhead' }, t('ui.about.env')),
      h('dl', { class: 'kv kv-compact env-list', 'data-env': JSON.stringify(env) },
        row(t('ui.env.protocol'), t(`ui.env.protocol.${env.protocol}`)),
        row(t('ui.env.secure'), yn(env.secure)),
        row(t('ui.env.crypto'), yn(env.crypto)),
        row(t('ui.env.storage'), yn(env.storage)),
        row(t('ui.env.clipboard'), env.clipboard ? t('ui.env.yes') : t('ui.env.clipboard.fallback'))),
      h('details', { class: 'license' }, h('summary', {}, t('ui.about.ofl')), h('pre', { class: 'license-text' }, ofl)),
    ]),
  );

  // lo stato può cambiare da fuori (import, altra scheda, "Cancella tutti i dati"): gli interruttori lo seguono
  const unsubscribe = ctx.store.subscribe((s, prev) => {
    if (s.settings === prev.settings) return;
    didactic.setChecked(s.settings.didactic);
    exportT.setChecked(s.settings.exportBar);
    method.setValue(s.settings.didacticMethod);
    theme.setValue(s.settings.theme);
    persist.setChecked(s.settings.persist);
    setMethodEnabled(s.settings.didactic);
    if (s.settings.persist !== prev.settings.persist) void refreshInfo();
  });
  const offEvents = ctx.onPersistEvent(() => void refreshInfo());
  void refreshInfo();

  return {
    el,
    destroy() {
      unsubscribe();
      offEvents();
    },
  };
}
