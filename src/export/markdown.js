// @ts-check
/**
 * Markdown (5.2): tabella, valori tecnici tra apici inversi. I testi dell'utente vengono protetti
 * dai caratteri che cambierebbero la tabella o la formattazione.
 */
import { t } from '../i18n/strings.it.js';
import { cellText } from './text.js';

/**
 * @typedef {import('./rows.js').Doc} Doc
 * @typedef {import('./rows.js').Cell} Cell
 * @typedef {import('./steps.js').StepsBlock} StepsBlock
 */

/** Testo normale in una cella: barre verticali e caratteri di formattazione con la barra rovescia, a capo come <br>. */
export function mdEscape(/** @type {string} */ s) {
  return s.replace(/[\\`*_[\]<>|#~]/g, (c) => `\\${c}`).replace(/\r?\n/g, '<br>');
}

/** Valore tecnico tra apici inversi (che non possono comparire all'interno: i valori tecnici non ne hanno). */
const code = (/** @type {string} */ s) => s.split('\n').map((l) => `\`${l.replace(/`/g, "'").replace(/\|/g, '\\|')}\``).join('<br>');

/**
 * @param {Cell} v
 * @param {boolean | undefined} mono
 */
function cell(v, mono) {
  if (v === null || v === undefined) return mdEscape(t('none'));
  const s = cellText(v);
  return mono ? code(s) : mdEscape(s);
}

/**
 * @param {Doc} doc
 * @param {{ steps?: StepsBlock[] }} [o]
 */
export function toMarkdown(doc, o = {}) {
  /** @type {string[]} */
  const out = [`# ${mdEscape(doc.title)}`, ''];
  if (doc.pairs.length) {
    out.push(`| ${t('export.item')} | ${t('export.value')} |`, '| --- | --- |');
    for (const p of doc.pairs) out.push(`| ${mdEscape(p.label)} | ${cell(p.value, p.mono)} |`);
  }
  if (doc.columns && doc.rows) {
    const cols = doc.columns;
    out.push('', `| ${cols.map((c) => mdEscape(c.label)).join(' | ')} |`, `| ${cols.map((c) => (c.numeric ? '---:' : '---')).join(' | ')} |`);
    for (const r of doc.rows) out.push(`| ${cols.map((c) => cell(r[c.key] ?? null, c.mono && r[c.key] !== null)).join(' | ')} |`);
  }
  if (doc.notes?.length) {
    out.push('', `**${t('export.warnings')}**`, '');
    for (const n of doc.notes) out.push(`- ${mdEscape(n)}`);
  }
  for (const s of o.steps ?? []) {
    out.push('', `## ${mdEscape(s.title)} · ${t('export.method')} ${mdEscape(s.method.toLowerCase())}`, '');
    s.items.forEach((it, i) => {
      out.push(`${i + 1}. ${mdEscape(it.text)}`);
      if (it.bits.length) {
        const w = Math.max(...it.bits.map((b) => [...b.label].length));
        out.push('', '   ```text', ...it.bits.map((b) => `   ${b.label.padEnd(w)}  ${b.net}${b.host ? ` | ${b.host}` : ''}`), '   ```', '');
      }
    });
    out.push('', `${t('export.chapters')}: ${s.chapters.map(mdEscape).join('; ')}`);
  }
  return `${out.join('\n')}\n`;
}
