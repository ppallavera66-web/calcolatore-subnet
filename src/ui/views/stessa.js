// @ts-check
/**
 * Calcola · Stessa subnet (F07, cap. 15): due host, anche con prefissi diversi, e gateway facoltativo.
 * Ogni host decide con la propria mask: il verdetto può essere asimmetrico.
 */
import { h, replace } from '../dom.js';
import { ipField } from '../components/field.js';
import { prefixField } from '../components/prefix-field.js';
import { resultCard, yesNo } from '../components/result-card.js';
import { icon } from '../icons.js';
import { examples } from '../components/controls.js';
import { exportBar } from '../components/export-bar.js';
import { createStepsPanel } from '../components/steps-panel.js';
import { liveView, routeError } from './view-kit.js';
import { entryFor } from '../history-map.js';
import { ip, cidr } from '../format.js';
import { sameSubnetText, toDotted } from '../../engine/index.js';
import { t } from '../../i18n/strings.it.js';

const VIEW = 'calcola/stessa';
/** @type {{ label: string, params: Record<string, string> }[]} */
const EXAMPLES = [
  { label: '10.1.63.5 · 10.1.64.5 /19', params: { a: '10.1.63.5', pa: '/19', b: '10.1.64.5' } },
  { label: '172.16.33.10 · 172.16.46.200 /20', params: { a: '172.16.33.10', pa: '/20', b: '172.16.46.200' } },
  { label: '.1.10/24 · .1.200/25 · gw .1.1', params: { a: '192.168.1.10', pa: '/24', b: '192.168.1.200', pb: '/25', gw: '192.168.1.1' } },
];

/**
 * @param {import('../types.js').Ctx} ctx
 * @param {import('../types.js').Route} route
 * @returns {import('../types.js').View}
 */
export function createStessa(ctx, route) {
  const live = liveView(ctx, VIEW, route, render);
  const p0 = live.params;
  const commit = () => live.commit();

  const pa = prefixField({ label: t('ui.same.pa'), value: p0.pa ?? '', onInput: (v) => live.change({ pa: v }), onEnter: commit });
  const pb = prefixField({ label: t('ui.same.pb'), value: p0.pb ?? '', hint: t('ui.same.pb.hint'), optional: true, onInput: (v) => live.change({ pb: v }), onEnter: commit });
  /**
   * @param {string} label @param {'a' | 'b'} key @param {ReturnType<typeof prefixField>} pf
   */
  const host = (label, key, pf) => ipField({
    label, value: p0[key] ?? '', placeholder: key === 'a' ? '10.1.63.5' : '10.1.64.5', width: '20ch',
    onInput: (v) => live.change({ [key]: v }), onEnter: commit,
    onSplit: (rest, typed) => {
      pf.setValue(rest);
      live.change({ [key === 'a' ? 'pa' : 'pb']: rest });
      if (typed) pf.focus();
    },
  });
  const a = host(t('ui.same.a'), 'a', pa);
  const b = host(t('ui.same.b'), 'b', pb);
  const gw = ipField({ label: t('ui.same.gw'), value: p0.gw ?? '', hint: t('ui.same.gw.hint'), optional: true, placeholder: '192.168.1.1', width: '20ch', onInput: (v) => live.change({ gw: v }), onEnter: commit });

  const out = h('div', { class: 'results' });
  const steps = createStepsPanel(ctx, { fn: 'F07', method: live.method('F07'), onMethod: (m) => live.setMethod('F07', m) });
  const fields = { a, prefixA: pa, b, prefixB: pb, gateway: gw };
  const barSlot = h('div');
  const el = h('div', { class: 'view view-stessa' },
    h('form', { class: 'form-grid', novalidate: true, onsubmit: (/** @type {Event} */ e) => { e.preventDefault(); commit(); } },
      h('div', { class: 'form-row' }, a.el, pa.el),
      h('div', { class: 'form-row' }, b.el, pb.el),
      h('div', { class: 'form-row' }, gw.el)),
    out, steps.el, barSlot);

  /** @param {{ initial: boolean, commit: boolean }} opts */
  function render(opts) {
    const p = live.params;
    steps.el.hidden = true;
    barSlot.replaceChildren();
    if (!['a', 'pa', 'b', 'pb', 'gw'].some((k) => (p[k] ?? '').trim() !== '')) {
      routeError(null, fields, 'a', false);
      replace(out, h('div', { class: 'empty' }, examples(EXAMPLES.map((ex) => ({ label: ex.label, onPick: () => pick(ex.params) })))));
      ctx.record(null);
      return;
    }
    const r = sameSubnetText({ a: p.a ?? '', prefixA: p.pa, b: p.b ?? '', prefixB: p.pb, gateway: p.gw });
    if (!r.ok) {
      routeError(r.error, fields, 'a', opts.initial || opts.commit);
      out.replaceChildren();
      ctx.record(null);
      return;
    }
    routeError(null, fields, 'a', false);
    const v = r.value;
    const kind = v.verdict === 'same' ? 'ok' : 'warn';
    const verdict = t(`verdict.${v.verdict}`);
    /**
     * @param {'a' | 'b'} side
     */
    const sideCard = (side) => {
      const s = side === 'a' ? v.sideA : v.sideB;
      const other = side === 'a' ? 'B' : 'A';
      const name = side === 'a' ? 'A' : 'B';
      return h('section', { class: 'side' },
        h('h3', { class: 'side-title' }, t('ui.same.side', { host: name, prefix: s.prefix })),
        h('dl', { class: 'kv kv-compact' },
          kv(t('ui.same.own'), cidr(s.network, s.prefix)),
          kv(t('ui.same.other', { other }), cidr(s.otherNetwork, s.prefix)),
          kv(t('ui.same.local', { other }), yesNo(s.otherIsLocal)),
          v.gateway !== null ? kv(t('ui.same.gwIn'), yesNo(Boolean(v.gatewayInSubnet?.[side]))) : null));
    };
    replace(out, resultCard(ctx, {
      lead: h('p', { class: `verdict verdict-${kind}` }, icon(v.verdict === 'same' ? 'check' : v.verdict === 'different' ? 'close' : 'warn', { size: 26 }), verdict),
      items: [
        { label: t('ui.same.a'), value: `${ip(v.a)}/${v.prefixA}` },
        { label: t('ui.same.b'), value: `${ip(v.b)}/${v.prefixB}` },
        ...(v.gateway !== null ? [{ label: t('ui.same.gw'), value: ip(v.gateway) }] : []),
      ],
      warnings: r.warnings,
      children: [h('div', { class: 'sides' }, sideCard('a'), sideCard('b'))],
    }));
    if (live.didactic()) {
      steps.update(v, live.method('F07'));
      steps.el.hidden = false;
    }
    if (ctx.store.get().settings.exportBar) {
      replace(barSlot, exportBar(ctx, () => ({
        fn: 'F07', value: v, warnings: r.warnings, input: entryFor(VIEW, live.params)?.input ?? {}, name: 'stessa', parts: [toDotted(v.a), toDotted(v.b)],
        steps: live.didactic() ? [{ fn: 'F07', value: v, method: live.method('F07'), warnings: r.warnings }] : [],
      })));
    }
    ctx.announce(t('ui.announce.same', { verdict }));
    ctx.record(entryFor(VIEW, p), opts.commit);
  }

  /** @param {Record<string, string>} params */
  function pick(params) {
    a.setValue(params.a ?? '');
    pa.setValue(params.pa ?? '');
    b.setValue(params.b ?? '');
    pb.setValue(params.pb ?? '');
    gw.setValue(params.gw ?? '');
    live.change({ a: params.a, pa: params.pa, b: params.b, pb: params.pb, gw: params.gw });
    live.commit();
  }

  render({ initial: true, commit: false });

  return {
    el,
    update(r) {
      live.reset(r);
      a.setValue(r.params.a ?? '');
      pa.setValue(r.params.pa ?? '');
      b.setValue(r.params.b ?? '');
      pb.setValue(r.params.pb ?? '');
      gw.setValue(r.params.gw ?? '');
      render({ initial: true, commit: false });
    },
    destroy: () => live.cancel(),
    printInputs: () => [
      `${t('ui.same.a')}: ${a.value}${pa.value ? ` ${pa.value}` : ''}`,
      `${t('ui.same.b')}: ${b.value}${pb.value ? ` ${pb.value}` : ''}`,
      gw.value && `${t('ui.same.gw')}: ${gw.value}`,
    ].filter(Boolean),
  };
}

/**
 * @param {string} label
 * @param {string | Node} value
 */
function kv(label, value) {
  return h('div', { class: 'kv-item' }, h('dt', {}, label), h('dd', {}, typeof value === 'string' ? h('span', { class: 'kv-value mono' }, value) : value));
}
