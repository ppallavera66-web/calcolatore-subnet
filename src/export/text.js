// @ts-check
/**
 * Testo semplice (5.2): colonne allineate per carattere monospazio. Serve anche per la copia
 * negli appunti. Numeri con il separatore delle migliaia, come nell'interfaccia (m13).
 */
import { fmtNumber, t } from '../i18n/strings.it.js';

/**
 * @typedef {import('./rows.js').Doc} Doc
 * @typedef {import('./rows.js').Cell} Cell
 * @typedef {import('./steps.js').StepsBlock} StepsBlock
 */

/** Valore di una cella per le persone. */
export function cellText(/** @type {Cell} */ v) {
  if (v === null || v === undefined) return t('none');
  return typeof v === 'number' ? fmtNumber(v) : v;
}

/** Larghezza a video: conta i caratteri Unicode (le lettere accentate valgono uno). */
const width = (/** @type {string} */ s) => [...s].length;
const pad = (/** @type {string} */ s, /** @type {number} */ n) => s + ' '.repeat(Math.max(0, n - width(s)));
const padLeft = (/** @type {string} */ s, /** @type {number} */ n) => ' '.repeat(Math.max(0, n - width(s))) + s;

/**
 * @param {Doc} doc
 * @param {{ steps?: StepsBlock[] }} [o]
 */
export function toText(doc, o = {}) {
  /** @type {string[]} */
  const out = [doc.title, '='.repeat(Math.min(72, width(doc.title))), ''];
  if (doc.pairs.length) {
    const w = Math.max(...doc.pairs.map((p) => width(p.label)));
    for (const p of doc.pairs) {
      const lines = cellText(p.value).split('\n');
      out.push(`${pad(p.label, w)}  ${lines[0]}`);
      for (const l of lines.slice(1)) out.push(`${' '.repeat(w)}  ${l}`);
    }
  }
  if (doc.columns && doc.rows) {
    const cols = doc.columns;
    const cells = doc.rows.map((r) => cols.map((c) => cellText(r[c.key] ?? null)));
    const widths = cols.map((c, i) => Math.max(width(c.label), ...cells.map((row) => width(row[i]))));
    const line = (/** @type {string[]} */ vals) => vals.map((v, i) => (cols[i].numeric ? padLeft(v, widths[i]) : pad(v, widths[i]))).join('  ').trimEnd();
    out.push('', line(cols.map((c) => c.label)), widths.map((w) => '-'.repeat(w)).join('  '));
    for (const row of cells) out.push(line(row));
  }
  if (doc.notes?.length) {
    out.push('', `${t('export.warnings')}:`);
    for (const n of doc.notes) out.push(`- ${n}`);
  }
  for (const s of o.steps ?? []) out.push('', ...stepsText(s));
  return `${out.join('\n')}\n`;
}

/**
 * Passaggi numerati, con le righe binarie divise in rete | host.
 * @param {StepsBlock} s
 */
export function stepsText(s) {
  const out = [`${s.title} · ${t('export.method')} ${s.method.toLowerCase()}`];
  s.items.forEach((it, i) => {
    out.push(`${i + 1}. ${it.text}`);
    if (it.bits.length) {
      const w = Math.max(...it.bits.map((b) => width(b.label)));
      for (const b of it.bits) out.push(`   ${pad(b.label, w)}  ${b.net}${b.host ? ` | ${b.host}` : ''}`);
    }
  });
  if (s.items.some((it) => it.bits.length)) out.push(`   (${t('export.bitsLegend')})`);
  out.push(`${t('export.chapters')}: ${s.chapters.join('; ')}`);
  return out;
}
