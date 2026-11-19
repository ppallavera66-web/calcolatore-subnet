// @ts-check
/**
 * Pannello dei passaggi (specifica tecnica, 4 e 9.4): selettore del metodo, passaggi numerati,
 * righe binarie con i colori di rete e host (più il testo per chi non distingue i colori o usa
 * un lettore di schermo), collegamento "Capitolo N" verso la guida al subnetting.
 */
import { h, uniqueId } from '../dom.js';
import { segmented } from './controls.js';
import { bitSegments, stepText } from '../format.js';
import { explain, methodsFor } from '../../engine/index.js';
import { t } from '../../i18n/strings.it.js';

/**
 * Riga binaria colorata.
 * @param {{ label: string, value: string, prefix: number }} row
 */
export function bitRow(row) {
  const segs = bitSegments(row.value, row.prefix);
  const net = segs.filter((s) => s.kind === 'net').map((s) => s.text).join('');
  const host = segs.filter((s) => s.kind === 'host').map((s) => s.text).join('');
  const label = t(`ui.bits.${row.label}`) === `ui.bits.${row.label}` ? row.label : t(`ui.bits.${row.label}`);
  const sr = [net ? `${t('ui.bits.net')} ${net}` : null, host ? `${t('ui.bits.host')} ${host}` : null].filter(Boolean).join(', ');
  return h(
    'div',
    { class: 'bitrow' },
    h('span', { class: 'bitrow-label' }, label),
    h('code', { class: 'bits', 'aria-hidden': 'true' }, segs.map((s) => h('span', { class: `b-${s.kind}` }, s.text))),
    h('span', { class: 'sr-only' }, sr),
  );
}

/**
 * Pannello persistente: il selettore del metodo resta lo stesso (il focus da tastiera non si perde),
 * `update` sostituisce solo i passaggi.
 * @param {import('../types.js').Ctx} ctx
 * @param {{ fn: string, method: string, onMethod: (m: string) => void, title?: string }} o
 */
export function createStepsPanel(ctx, o) {
  const methods = methodsFor(o.fn);
  const id = uniqueId('steps');
  const picker = methods.length > 1
    ? segmented({
        legend: t('ui.steps.method'),
        hideLegend: true,
        small: true,
        options: methods.map((m) => ({ value: m, label: t(`method.${m}`) })),
        value: o.method,
        onChange: o.onMethod,
      })
    : null;
  const single = picker ? null : h('span', { class: 'steps-method' }, t(`method.${methods[0]}`));
  const body = h('div', { class: 'steps-body' });
  const el = h(
    'section',
    { class: 'card steps-panel', 'aria-labelledby': id },
    h('header', { class: 'card-head' }, h('h2', { id, class: 'card-title' }, o.title ?? t('ui.steps.title')), picker?.el ?? single),
    body,
  );
  return {
    el,
    /**
     * @param {any} value il campo `value` di un esito positivo
     * @param {string} method
     * @param {any[]} [warnings]
     */
    update(value, method, warnings = []) {
      const ex = explain(o.fn, value, method, warnings);
      picker?.setValue(ex.method);
      const hasBits = ex.steps.some((s) => s.bits);
      const chapters = [...new Set([ex.chapter, ...ex.steps.map((s) => s.chapter)])];
      body.replaceChildren(
        ...[
          hasBits
            ? h('p', { class: 'steps-legend' },
                h('span', { class: 'swatch swatch-net', 'aria-hidden': 'true' }),
                h('span', { class: 'swatch swatch-host', 'aria-hidden': 'true' }),
                t('ui.steps.legend'))
            : null,
          h('ol', { class: 'steps' },
            ex.steps.map((s) => h('li', { class: 'step' }, h('p', {}, stepText(s)), s.bits ? h('div', { class: 'bitrows' }, s.bits.rows.map(bitRow)) : null))),
          h('p', { class: 'steps-chapters' },
            chapters.map((c) => h('a', { href: ctx.href('guide/subnetting', {}, c), class: 'chapter-link' }, t('ui.steps.chapter', { chapter: c, title: t(`ui.cap.${c}`) })))),
        ].filter((n) => n !== null),
      );
    },
  };
}
