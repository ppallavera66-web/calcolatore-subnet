// @ts-check
/**
 * Calcola · Mask (F03, cap. 6): validità con il motivo, gli ottetti in binario, le mask valide
 * più vicine (cliccabili) e l'avviso "sembra una wildcard".
 * Nel binario della mask gli 1 sono in ambra (rete) e gli 0 in verde acqua (host): un buco si vede subito.
 */
import { h, replace } from '../dom.js';
import { textField } from '../components/field.js';
import { resultCard, notice, warningsBox, yesNo } from '../components/result-card.js';
import { examples } from '../components/controls.js';
import { createStepsPanel } from '../components/steps-panel.js';
import { liveView } from './view-kit.js';
import { entryFor } from '../history-map.js';
import { message, ordShort } from '../format.js';
import { validateMask, toDotted } from '../../engine/index.js';
import { t } from '../../i18n/strings.it.js';

const VIEW = 'calcola/mask';
const EXAMPLES = ['255.255.255.192', '255.255.250.0', '255.255.0.255', '0.0.0.255'];

/**
 * Bit di una mask colorati uno per uno: 1 = rete, 0 = host.
 * @param {string} binary
 */
function maskBits(binary) {
  return h('code', { class: 'bits' }, [...binary].map((c) => h('span', { class: c === '1' ? 'b-net' : 'b-host' }, c)));
}

/**
 * @param {import('../types.js').Ctx} ctx
 * @param {import('../types.js').Route} route
 * @returns {import('../types.js').View}
 */
export function createMask(ctx, route) {
  const live = liveView(ctx, VIEW, route, render);
  const field = textField({
    label: t('ui.mask.field'), value: live.params.m ?? '', hint: t('ui.mask.field.hint'), placeholder: '255.255.255.192',
    inputmode: 'decimal', width: '20ch', onInput: (v) => live.change({ m: v }), onEnter: () => live.commit(),
  });
  const out = h('div', { class: 'results' });
  const steps = createStepsPanel(ctx, { fn: 'F03', method: 'binary', onMethod: () => {} });
  const el = h('div', { class: 'view view-mask' }, h('form', { class: 'form-row', novalidate: true, onsubmit: (/** @type {Event} */ e) => { e.preventDefault(); live.commit(); } }, field.el), out, steps.el);

  /** @param {string} m */
  function use(m) {
    field.setValue(m);
    live.change({ m });
    live.commit();
    field.focus();
  }

  /** @param {{ initial: boolean, commit: boolean }} opts */
  function render(opts) {
    const m = live.params.m ?? '';
    steps.el.hidden = true;
    if (m.trim() === '') {
      field.setError(null);
      replace(out, h('div', { class: 'empty' }, examples(EXAMPLES.map((ex) => ({ label: ex, onPick: () => use(ex) })))));
      ctx.record(null);
      return;
    }
    const r = validateMask(m);
    if (!r.ok) {
      field.setError(message(r.error), { now: opts.initial || opts.commit });
      out.replaceChildren();
      ctx.record(null);
      return;
    }
    field.setError(null);
    const v = r.value;
    const offending = v.reason ? v.reason.params.index : -1;
    const table = h('div', { class: 'tbl', tabindex: '0', role: 'region', 'aria-label': t('ui.mask.octets') }, h('table', {},
      h('caption', { class: 'sr-only' }, t('ui.mask.octets')),
      h('thead', {}, h('tr', {}, ['octet', 'value', 'binary', 'check'].map((c) => h('th', { scope: 'col' }, t(`ui.mask.col.${c}`))))),
      h('tbody', {}, v.octets.map((o, i) => h('tr', { class: i === offending ? 'row-bad' : '' },
        h('td', {}, ordShort(i)),
        h('td', { class: 'mono' }, String(o.value)),
        h('td', {}, maskBits(o.binary)),
        h('td', {}, yesNo(o.allowed)))))));
    const card = resultCard(ctx, {
      title: v.valid ? t('ui.mask.valid', { prefix: v.prefix }) : t('ui.mask.invalid'),
      badge: v.valid ? { text: t('ui.yes'), kind: 'ok' } : { text: t('ui.no'), kind: 'warn' },
      items: v.valid ? [{ label: t('ui.conv.prefix'), value: `/${v.prefix}` }, { label: t('ui.r.mask'), value: toDotted(v.mask) }] : [],
      children: [
        table,
        v.reason ? notice(message(v.reason), 'error') : null,
        v.suggestions.length
          ? h('div', { class: 'suggestions' }, h('p', { class: 'suggestions-title' }, t('ui.mask.suggestions')),
              v.suggestions.map((s) => h('button', { type: 'button', class: 'chip mono', onclick: () => use(toDotted(s.mask)) }, t('ui.mask.use', { mask: toDotted(s.mask), prefix: s.prefix }))))
          : null,
        r.warnings.length ? warningsBox(r.warnings) : null,
      ],
    });
    replace(out, card);
    if (live.didactic()) {
      steps.update(v, 'binary', r.warnings);
      steps.el.hidden = false;
    }
    ctx.announce(v.valid ? t('ui.mask.valid', { prefix: v.prefix }) : `${t('ui.mask.invalid')}. ${v.reason ? message(v.reason) : ''}`);
    ctx.record(entryFor(VIEW, live.params), opts.commit);
  }

  render({ initial: true, commit: false });

  return {
    el,
    update(r) {
      live.reset(r);
      field.setValue(r.params.m ?? '');
      render({ initial: true, commit: false });
    },
    destroy: () => live.cancel(),
    printInputs: () => (field.value ? [`${t('ui.mask.field')}: ${field.value}`] : []),
  };
}
