// @ts-check
/**
 * Export e import della sessione (specifica tecnica, 6.4, 7.4, 9.10): finestre di dialogo.
 *
 * Export: riepilogo, casella "Cifra il file" spenta a ogni apertura (mai ricordata), passphrase e
 * conferma con indicatore di robustezza e avviso, avanzamento durante la cifratura.
 * Import: scelta del file → (se cifrato) passphrase → anteprima → Sostituisci o Unisci, con la
 * casella "Applica anche le impostazioni del file" spenta → riepilogo.
 *
 * La passphrase resta solo nei campi e nelle variabili locali; i campi si svuotano a fine operazione.
 * I testi che vengono dal file si mostrano sempre come testo (textContent), mai come HTML.
 */
import { h, uniqueId } from '../dom.js';
import { openDialog } from './dialog.js';
import { textField } from './field.js';
import { notice } from './result-card.js';
import { dateTime } from '../format.js';
import { buildSession, readSessionText, applyImport, checkImportSize } from '../../session/session.js';
import { encryptSession, decryptEnvelope, checkEnvelope, cryptoAvailable, passphraseStrength, MIN_PASSPHRASE } from '../../session/envelope.js';
import { sessionFileName } from '../../export/filename.js';
import { downloadText, readFileText, MIME } from '../../export/download.js';
import { t } from '../../i18n/strings.it.js';

/**
 * Casella di spunta con etichetta e descrizione.
 * @param {{ label: string, description?: string, checked?: boolean, disabled?: boolean, onChange?: (v: boolean) => void }} o
 */
export function checkbox(o) {
  const id = uniqueId('cb');
  const input = h('input', { type: 'checkbox', id, checked: !!o.checked, disabled: o.disabled, onchange: () => o.onChange?.(input.checked) });
  if (o.description) input.setAttribute('aria-describedby', `${id}-desc`);
  const el = h('div', { class: `check${o.disabled ? ' is-disabled' : ''}` },
    input,
    h('div', { class: 'check-text' },
      h('label', { for: id, class: 'check-label' }, o.label),
      o.description ? h('p', { id: `${id}-desc`, class: 'setting-desc' }, o.description) : null));
  return { el, input };
}

/** Indicatore di avanzamento indeterminato con testo, annunciato. */
function progress(/** @type {string} */ text) {
  return h('p', { class: 'progress-line', role: 'status' }, h('progress', { 'aria-hidden': 'true' }), h('span', {}, text));
}

/** Riquadro d'errore annunciato. */
function errorBox() {
  return h('p', { class: 'form-error', role: 'alert' });
}

/**
 * Indicatore di robustezza a quattro livelli (7.4).
 */
function strengthMeter() {
  const bars = [0, 1, 2, 3].map(() => h('span', { class: 'meter-bar' }));
  const label = h('span', { class: 'meter-label', 'aria-live': 'polite' });
  const el = h('div', { class: 'meter', 'data-level': '-1' }, h('span', { class: 'meter-bars', 'aria-hidden': 'true' }, bars), label);
  return {
    el,
    /** @param {string} pass */
    update(pass) {
      if (!pass) {
        el.dataset.level = '-1';
        label.textContent = '';
        return;
      }
      const s = passphraseStrength(pass);
      el.dataset.level = String(s.level);
      label.textContent = t('ui.sx.strength', { level: t(`ui.sx.level.${s.level}`) });
    },
  };
}

/**
 * Finestra "Esporta la sessione".
 * @param {import('../types.js').Ctx} ctx
 */
export function openExportSession(ctx) {
  const st = ctx.store.get();
  const canEncrypt = cryptoAvailable();
  const pass = textField({ label: t('ui.sx.pass'), hint: t('ui.sx.pass.hint'), type: 'password', autocomplete: 'new-password', mono: false });
  const confirmF = textField({ label: t('ui.sx.confirm'), type: 'password', autocomplete: 'new-password', mono: false });
  const meter = strengthMeter();
  const err = errorBox();
  const busy = h('div');
  const fields = h('div', { class: 'pass-fields', hidden: true },
    pass.el, meter.el, confirmF.el,
    notice(t('ui.sx.warning'), 'warn'));
  const encrypt = checkbox({
    label: t('ui.sx.encrypt'),
    description: canEncrypt ? t('ui.sx.encrypt.desc') : t('IMPORT_CRYPTO_UNAVAILABLE'),
    checked: false,
    disabled: !canEncrypt,
    onChange: (v) => {
      fields.hidden = !v;
      err.textContent = '';
      if (v) pass.focus();
    },
  });
  pass.input.addEventListener('input', () => {
    meter.update(pass.value);
    pass.setError(null);
  });
  confirmF.input.addEventListener('input', () => confirmF.setError(null));

  let working = false;
  const wipe = () => {
    pass.setValue('');
    confirmF.setValue('');
  };

  async function run() {
    if (working) return false;
    err.textContent = '';
    const encrypted = encrypt.input.checked;
    const p = pass.value;
    if (encrypted) {
      const s = passphraseStrength(p);
      if (s.length < MIN_PASSPHRASE) {
        pass.setError(t('ui.sx.tooShort', { n: s.length }), { now: true });
        pass.focus();
        return false;
      }
      if (p !== confirmF.value) {
        confirmF.setError(t('ui.sx.mismatch'), { now: true });
        confirmF.focus();
        return false;
      }
    }
    working = true;
    const date = new Date();
    const session = buildSession(ctx.store.get(), { now: date.toISOString(), appName: t('ui.app.name'), appVersion: __APP_VERSION__ });
    try {
      let text;
      if (encrypted) {
        busy.replaceChildren(progress(t('ui.sx.working')));
        exportBtn.disabled = true;
        text = `${JSON.stringify(await encryptSession(session, p), null, 2)}\n`;
      } else text = `${JSON.stringify(session, null, 2)}\n`;
      downloadText(text, sessionFileName(date, encrypted), MIME.json);
      wipe();
      ctx.toast(t(encrypted ? 'ui.sx.doneEncrypted' : 'ui.sx.done'));
      dlg.close();
    } catch {
      err.textContent = t('ui.sx.failed');
    } finally {
      working = false;
      busy.replaceChildren();
      exportBtn.disabled = false;
    }
    return false;
  }

  const exportBtn = h('button', { type: 'submit', class: 'btn btn-primary' }, t('ui.sx.export'));
  const form = h('form', { class: 'dialog-form', novalidate: true, onsubmit: (/** @type {Event} */ e) => { e.preventDefault(); void run(); } },
    h('p', {}, t('ui.sx.content', { history: st.history.length, plans: st.plans.length })),
    encrypt.el, fields, err, busy,
    h('footer', { class: 'dialog-actions' },
      h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => dlg.close() }, t('ui.cancel')),
      exportBtn));
  const dlg = openDialog({ title: t('ui.sx.title'), body: [form], onClose: wipe });
  return dlg;
}

/**
 * Import di un file scelto dall'utente (6.4): lettura, eventuale decifratura, anteprima, scelta.
 * @param {import('../types.js').Ctx} ctx
 * @param {File} file
 */
export async function importSessionFile(ctx, file) {
  const tooLarge = checkImportSize(file.size);
  if (tooLarge) return showError(t(tooLarge.code, tooLarge.params));
  let text;
  try {
    text = await readFileText(file);
  } catch {
    return showError(t('IMPORT_NOT_JSON'));
  }
  const r = readSessionText(text);
  if (!r.ok) return showError(t(r.error.code, r.error.params));
  if (r.kind === 'encrypted') {
    if (!cryptoAvailable()) return showError(t('IMPORT_CRYPTO_UNAVAILABLE'));
    const checked = checkEnvelope(r.envelope);
    if (!checked.ok) return showError(t(checked.error.code, checked.error.params));
    return askPassphrase(ctx, r.envelope);
  }
  return preview(ctx, r);
}

/** @param {string} message */
function showError(message) {
  openDialog({ title: t('ui.si.failed'), body: [h('p', { role: 'alert' }, message)], actions: [{ label: t('ui.close'), kind: 'primary' }] });
}

/**
 * Passphrase per un file cifrato (7.3): la richiesta arriva solo dopo i controlli sull'intestazione.
 * Con passphrase errata si può riprovare.
 * @param {import('../types.js').Ctx} ctx
 * @param {Record<string, any>} envelope
 */
function askPassphrase(ctx, envelope) {
  const pass = textField({ label: t('ui.sx.pass'), type: 'password', autocomplete: 'current-password', mono: false });
  const err = errorBox();
  const busy = h('div');
  let working = false;
  const btn = h('button', { type: 'submit', class: 'btn btn-primary' }, t('ui.si.decrypt'));
  async function run() {
    if (working) return;
    working = true;
    btn.disabled = true;
    err.textContent = '';
    busy.replaceChildren(progress(t('ui.si.working')));
    const d = await decryptEnvelope(envelope, pass.value);
    working = false;
    btn.disabled = false;
    busy.replaceChildren();
    if (!d.ok) {
      err.textContent = t(d.error.code, d.error.params);
      pass.input.select();
      pass.focus();
      return;
    }
    pass.setValue('');
    const r = readSessionText(d.text, { allowEncrypted: false });
    dlg.close();
    if (!r.ok) showError(t(r.error.code, r.error.params));
    else if (r.kind === 'session') preview(ctx, r);
  }
  const form = h('form', { class: 'dialog-form', novalidate: true, onsubmit: (/** @type {Event} */ e) => { e.preventDefault(); void run(); } },
    h('p', {}, t('ui.si.pass.text')), pass.el, err, busy,
    h('footer', { class: 'dialog-actions' },
      h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => dlg.close() }, t('ui.cancel')),
      btn));
  const dlg = openDialog({ title: t('ui.si.title'), body: [form], onClose: () => pass.setValue('') });
  pass.focus();
}

/**
 * Anteprima e scelta Sostituisci / Unisci (6.4).
 * @param {import('../types.js').Ctx} ctx
 * @param {Extract<ReturnType<typeof readSessionText>, { kind: 'session' }>} r
 */
function preview(ctx, r) {
  const { data, meta, report } = r;
  const hasSettings = Object.keys(data.settings).length > 0;
  const apply = checkbox({ label: t('ui.si.applySettings'), description: t('ui.si.applySettings.desc'), checked: false, disabled: !hasSettings });
  const app = meta.app && (meta.app.name || meta.app.version) ? `${meta.app.name} ${meta.app.version}`.trim() : '';
  const lines = [
    t('ui.si.file', { date: dateTime(meta.exportedAt), app }),
    t('ui.si.counts', { history: report.historyImported, plans: report.plansImported }),
    report.historySkipped || report.plansSkipped ? t('ui.si.skipped', { history: report.historySkipped, plans: report.plansSkipped }) : null,
    report.settingsIgnored ? t('ui.si.settingsIgnored', { n: report.settingsIgnored }) : null,
    report.unknownKeys ? t('ui.si.unknown', { n: report.unknownKeys }) : null,
  ].filter(Boolean);
  const warnings = report.warnings.map((w) => t(w.code, w.params));

  /** @param {'replace' | 'merge'} mode */
  const choose = (mode) => {
    const cur = ctx.store.get();
    const res = applyImport(cur, data, { mode, applySettings: apply.input.checked });
    ctx.store.set((s) => ({ ...s, settings: /** @type {any} */ (res.settings), history: res.history, plans: res.plans }));
    ctx.toast(t('ui.si.done', { history: res.summary.history, plans: res.summary.plans, skipped: report.historySkipped + report.plansSkipped, settings: res.summary.settingsApplied }));
  };

  const body = [
    h('ul', { class: 'plain-list' }, lines.map((l) => h('li', {}, l))),
    warnings.length ? h('ul', { class: 'warnings-list' }, warnings.map((w) => h('li', {}, w))) : null,
    hasSettings ? apply.el : notice(t('ui.si.noSettings')),
    h('dl', { class: 'choice-list' },
      h('dt', {}, t('ui.si.replace')), h('dd', {}, t('ui.si.replace.desc')),
      h('dt', {}, t('ui.si.merge')), h('dd', {}, t('ui.si.merge.desc'))),
  ];
  openDialog({
    title: t('ui.si.preview'),
    body,
    wide: true,
    actions: [
      { label: t('ui.cancel') },
      { label: t('ui.si.replace'), kind: 'ghost', onClick: () => choose('replace') },
      { label: t('ui.si.merge'), kind: 'primary', onClick: () => choose('merge') },
    ],
  });
}
