// @ts-check
/**
 * CSV (5.2, m13): separatore `;`, fine riga CRLF, BOM UTF-8; campi con `;`, `"` o a capo tra virgolette;
 * numeri senza separatori. I campi di testo dell'utente che iniziano con `=`, `+`, `-`, `@`
 * (o con tabulazione e ritorno a capo, che alcuni fogli di calcolo ignorano) vengono preceduti
 * da un apostrofo: protezione dall'esecuzione di formule all'apertura.
 */
import { t } from '../i18n/strings.it.js';

/**
 * @typedef {import('./rows.js').Doc} Doc
 * @typedef {import('./rows.js').Cell} Cell
 */

export const BOM = '\uFEFF';
const EOL = '\r\n';

/**
 * @param {Cell} v
 * @param {boolean} [user] testo scritto dall'utente
 */
export function csvField(v, user = false) {
  let s = v === null || v === undefined ? '' : String(v);
  if (user && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * CSV del documento: la tabella se c'è (F06), altrimenti le coppie voce;valore.
 * @param {Doc} doc
 */
export function toCsv(doc) {
  /** @type {string[]} */
  const lines = [];
  if (doc.columns && doc.rows) {
    const cols = doc.columns;
    lines.push(cols.map((c) => csvField(c.label)).join(';'));
    for (const r of doc.rows) lines.push(cols.map((c) => csvField(r[c.key] ?? null, c.user)).join(';'));
  } else {
    lines.push([t('export.item'), t('export.value')].map((s) => csvField(s)).join(';'));
    for (const p of doc.pairs) lines.push(`${csvField(p.label)};${csvField(p.value === null ? t('none') : p.value, p.user)}`);
  }
  return BOM + lines.join(EOL) + EOL;
}
