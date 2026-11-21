// @ts-check
/**
 * Passaggi didattici per l'export (opzione "Includi i passaggi", 5.1): gli stessi dati di `explain`
 * resi come testo, con le righe binarie divise in bit di rete e di host (senza colori, con le etichette).
 */
import { explain } from '../engine/index.js';
import { t } from '../i18n/strings.it.js';

/**
 * @typedef {{ fn: string, value: any, method: string, warnings?: any[], title?: string }} StepsSource
 * @typedef {{ text: string, bits: { label: string, value: string, net: string, host: string }[] }} StepItem
 * @typedef {{ title: string, method: string, items: StepItem[], chapters: string[] }} StepsBlock
 */

/**
 * @param {string} label
 */
function bitLabel(label) {
  const key = `ui.bits.${label}`;
  const s = t(key);
  return s === key ? label : s;
}

/**
 * Divide una riga binaria in parte di rete e parte di host (i punti restano nella parte in cui cadono).
 * @param {string} value
 * @param {number} netBits
 */
export function splitBits(value, netBits) {
  let bit = 0;
  let cut = value.length;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '.' || value[i] === ' ') continue;
    if (bit === netBits) {
      cut = i;
      break;
    }
    bit++;
  }
  return { net: value.slice(0, cut), host: value.slice(cut) };
}

/**
 * @param {StepsSource} s
 * @returns {StepsBlock}
 */
export function stepsBlock(s) {
  const ex = explain(s.fn, s.value, s.method, s.warnings ?? []);
  return {
    title: s.title ?? t('ui.steps.title'),
    method: t(`method.${ex.method}`),
    items: ex.steps.map((st) => ({
      text: t(`step.${st.id}`, st.values),
      bits: (st.bits?.rows ?? []).map((/** @type {{ label: string, value: string, prefix: number | null, bitwise?: boolean }} */ r) => ({
        label: bitLabel(r.label),
        value: r.value,
        // riga bit per bit (mask non valida): nessuna divisione tra rete e host
        ...(r.bitwise ? { net: r.value, host: '' } : splitBits(r.value, r.prefix ?? 0)),
      })),
    })),
    chapters: [...new Set([ex.chapter, ...ex.steps.map((st) => st.chapter)])].map((c) => `${t('chapter', { chapter: c })} · ${t(`ui.cap.${c}`)}`),
  };
}
