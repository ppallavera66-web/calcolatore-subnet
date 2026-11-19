// @ts-check
/**
 * Barra di export (specifica tecnica, 5 e 9.4), visibile con l'interruttore Export:
 * Copia · CSV · JSON · Markdown · Testo · Stampa, più Snippet dove previsto (F10).
 * Su telefono diventa un pulsante "Esporta" che apre un pannello dal basso con gli stessi comandi.
 * Con la modalità didattica attiva compare la casella "Includi i passaggi" (formati testuali e JSON).
 * Per la Suddivisione (F06) si sceglie prima quali subnet: pagina corrente, tutte (fino a 65.536)
 * oppure un intervallo di indici, obbligatorio oltre quel limite (m9).
 */
import { h, uniqueId } from '../dom.js';
import { icon } from '../icons.js';
import { openDialog } from './dialog.js';
import { textField } from './field.js';
import { toRows, rangeFor, EXPORT_MAX_ROWS } from '../../export/rows.js';
import { toCsv } from '../../export/csv.js';
import { toText } from '../../export/text.js';
import { toMarkdown } from '../../export/markdown.js';
import { toResultJson, subdivideOutput } from '../../export/json.js';
import { stepsBlock } from '../../export/steps.js';
import { resultFileName } from '../../export/filename.js';
import { downloadText, MIME } from '../../export/download.js';
import { t, fmtNumber } from '../../i18n/strings.it.js';

/**
 * @typedef {object} ExportSource
 * @property {string} fn funzione del motore (F01–F07, F10)
 * @property {any} value valore di un esito positivo
 * @property {any[]} [warnings]
 * @property {Record<string, any>} input input nella forma della 6.2, per il JSON
 * @property {Record<string, any>} [rowsInput] dati in più per `toRows` (testo di F02, etichette e nome del piano per F06)
 * @property {string} name nome della funzione nel file (analisi, tipo, conversioni, …)
 * @property {(string | number)[]} parts parti del nome del file
 * @property {import('../../export/steps.js').StepsSource[]} [steps] passaggi disponibili (modalità didattica)
 * @property {() => string | null} [snippet] testo dello snippet F10, se valido
 * @property {{ count: number, offset: number, size: number }} [table] F06: subnet in tutto e pagina mostrata
 */

const FORMATS = /** @type {const} */ (['copy', 'csv', 'json', 'md', 'text']);
const EXT = /** @type {const} */ ({ csv: 'csv', json: 'json', md: 'md', text: 'txt' });

/** "Includi i passaggi": scelta ricordata per la visita, non salvata. */
let includeSteps = false;

/**
 * Finestra per scegliere le subnet da esportare (F06).
 * @param {{ count: number, offset: number, size: number }} table
 * @returns {Promise<[number, number] | null>}
 */
export function chooseRange(table) {
  return new Promise((resolve) => {
    const name = uniqueId('range');
    const tooMany = table.count > EXPORT_MAX_ROWS;
    /** @type {[number, number] | null} */
    let result = null;
    const pageEnd = Math.min(table.count, table.offset + table.size);
    const radio = (/** @type {string} */ value, /** @type {string} */ label, /** @type {boolean} */ checked, /** @type {boolean} */ disabled = false) => {
      const id = uniqueId('opt');
      const input = h('input', { type: 'radio', name, id, value, checked, disabled, onchange: () => { custom.hidden = value !== 'custom'; } });
      return h('div', { class: `check${disabled ? ' is-disabled' : ''}` }, input, h('div', { class: 'check-text' }, h('label', { for: id, class: 'check-label' }, label)));
    };
    const from = textField({ label: t('ui.export.range.from'), value: String(table.offset + 1), inputmode: 'numeric', width: '14ch' });
    const to = textField({ label: t('ui.export.range.to'), value: String(Math.min(table.count, table.offset + EXPORT_MAX_ROWS)), inputmode: 'numeric', width: '14ch' });
    const custom = h('div', { class: 'form-row range-fields', hidden: true }, from.el, to.el);
    const err = h('p', { class: 'form-error', role: 'alert' });
    const form = h('form', { class: 'dialog-form', novalidate: true },
      tooMany ? h('p', {}, t('ui.export.range.tooMany', { count: fmtNumber(table.count) })) : null,
      h('fieldset', { class: 'plain-fieldset' },
        h('legend', { class: 'sr-only' }, t('ui.export.range.title')),
        radio('page', t('ui.export.range.page', { from: fmtNumber(table.offset + 1), to: fmtNumber(pageEnd) }), true),
        radio('all', t('ui.export.range.all', { count: fmtNumber(table.count) }), false, tooMany),
        radio('custom', t('ui.export.range.custom'), false)),
      custom, err);
    const pick = () => {
      const v = /** @type {HTMLInputElement | null} */ (form.querySelector(`input[name="${name}"]:checked`))?.value;
      if (v === 'page') result = [table.offset, pageEnd];
      else if (v === 'all') result = [0, table.count];
      else {
        const r = rangeFor(table.count, from.value.replace(/[.\s]/g, ''), to.value.replace(/[.\s]/g, ''));
        if (!r.ok) {
          err.textContent = t(`ui.export.range.${r.code}`, { max: fmtNumber(r.max) });
          return false;
        }
        result = r.range;
      }
      return true;
    };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (pick()) dlg.close();
    });
    const dlg = openDialog({
      title: t('ui.export.range.title'),
      body: [form],
      actions: [{ label: t('ui.cancel') }, { label: t('ui.export.range.go'), kind: 'primary', onClick: () => pick() }],
      onClose: () => resolve(result),
    });
  });
}

/**
 * Esegue un export.
 * @param {import('../types.js').Ctx} ctx
 * @param {ExportSource} src
 * @param {typeof FORMATS[number] | 'snippet'} format
 */
export async function runExport(ctx, src, format) {
  const date = new Date();
  if (format === 'snippet') {
    const text = src.snippet?.();
    if (!text) return;
    const file = resultFileName('snippet', src.parts, 'txt', date);
    downloadText(text, file, MIME.txt);
    ctx.toast(t('ui.export.downloaded', { name: file }));
    return;
  }
  /** @type {[number, number] | null} */
  let range = null;
  if (src.table) {
    range = await chooseRange(src.table);
    if (!range) return;
  }
  const steps = includeSteps ? src.steps ?? [] : [];
  const doc = toRows(src.fn, src.value, { warnings: src.warnings, input: { ...(src.rowsInput ?? {}), ...(range ? { range } : {}) } });
  const blocks = steps.map(stepsBlock);
  if (format === 'copy') {
    await ctx.copy(toText(doc, { steps: blocks }), t('ui.export.what'));
    return;
  }
  let text;
  if (format === 'csv') text = toCsv(doc);
  else if (format === 'md') text = toMarkdown(doc, { steps: blocks });
  else if (format === 'text') text = toText(doc, { steps: blocks });
  else {
    const output = src.fn === 'F06' && range ? subdivideOutput(src.value, range, src.rowsInput?.labels ?? null) : src.value;
    text = toResultJson({ fn: src.fn, input: src.input, output, now: date.toISOString(), steps, warnings: src.warnings });
  }
  const parts = range && src.table && (range[0] !== 0 || range[1] !== src.table.count) ? [...src.parts, `n${range[0] + 1}-${range[1]}`] : src.parts;
  const file = resultFileName(src.name, parts, EXT[format], date);
  downloadText(text, file, MIME[EXT[format]]);
  ctx.toast(t('ui.export.downloaded', { name: file }));
}

/**
 * @param {import('../types.js').Ctx} ctx
 * @param {() => ExportSource | null} getSource
 * @param {{ snippet?: boolean }} [o]
 */
export function exportBar(ctx, getSource, o = {}) {
  const src0 = getSource();
  const hasSteps = !!src0?.steps?.length;
  /** @type {HTMLInputElement[]} */
  const checks = [];
  const stepsCheck = () => {
    const id = uniqueId('cb');
    const input = h('input', { type: 'checkbox', id, checked: includeSteps, onchange: () => {
      includeSteps = input.checked;
      for (const c of checks) c.checked = includeSteps;
    } });
    checks.push(input);
    return h('div', { class: 'check export-steps' }, input, h('label', { for: id, class: 'check-label' }, t('ui.export.steps')));
  };
  const run = (/** @type {typeof FORMATS[number] | 'snippet'} */ f) => {
    const src = getSource();
    if (src) void runExport(ctx, src, f);
  };
  const buttons = (/** @type {() => void} */ before = () => {}) => [
    ...FORMATS.map((f) => h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { format: f }, onclick: () => { before(); run(f); } }, t(`ui.export.${f}`))),
    o.snippet ? h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { format: 'snippet' }, onclick: () => { before(); run('snippet'); } }, t('ui.export.snippet')) : null,
    h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { format: 'print' }, onclick: () => { before(); ctx.print(); } }, icon('print', { size: 16 }), h('span', {}, t('ui.export.print'))),
  ];
  const sheetButton = h('button', {
    type: 'button',
    class: 'btn btn-ghost export-sheet-btn',
    'aria-haspopup': 'dialog',
    onclick: () => {
      const dlg = openDialog({
        title: t('ui.export.title'),
        sheet: true,
        body: [h('div', { class: 'export-grid' }, buttons(() => dlg.close())), hasSteps ? stepsCheck() : null],
      });
    },
  }, icon('export', { size: 18 }), h('span', {}, t('ui.export.title')));
  return h(
    'div',
    { class: 'export-bar' },
    h('div', { class: 'export-toolbar', role: 'toolbar', 'aria-label': t('ui.export.title') }, buttons()),
    hasSteps ? h('div', { class: 'export-options' }, stepsCheck()) : null,
    sheetButton,
  );
}
