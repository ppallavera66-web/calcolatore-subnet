// @ts-check
/**
 * Pianifica · Calcolo inverso (F05, cap. 11): casi A (host → prefisso), B (subnet → prefisso)
 * e C (entrambi, con i prefissi possibili, il consigliato e l'alternativa).
 */
import { h, replace } from '../dom.js';
import { textField } from '../components/field.js';
import { prefixField } from '../components/prefix-field.js';
import { resultCard, notice } from '../components/result-card.js';
import { segmented, examples, button } from '../components/controls.js';
import { exportBar } from '../components/export-bar.js';
import { createStepsPanel } from '../components/steps-panel.js';
import { liveView, routeError } from './view-kit.js';
import { entryFor } from '../history-map.js';
import { inverseCase } from '../router.js';
import { num, ip, message } from '../format.js';
import { prefixForHostsText, prefixForSubnetsText, prefixForBothText, maskOf } from '../../engine/index.js';
import { icon } from '../icons.js';
import { t } from '../../i18n/strings.it.js';

const VIEW = 'pianifica/inverso';
const EXAMPLES = {
  a: [{ label: '43 host', params: { h: '43' } }, { label: '500 host', params: { h: '500' } }, { label: '63 host', params: { h: '63' } }],
  b: [{ label: '/16 · 6 subnet', params: { p: '/16', s: '6' } }, { label: '/24 · 4 subnet', params: { p: '/24', s: '4' } }],
  c: [{ label: '/24 · 20 host · 8 subnet', params: { p: '/24', h: '20', s: '8' } }, { label: '/24 · 20 host · 10 subnet', params: { p: '/24', h: '20', s: '10' } }],
};

/**
 * @param {import('../types.js').Ctx} ctx
 * @param {import('../types.js').Route} route
 * @returns {import('../types.js').View}
 */
export function createInverso(ctx, route) {
  const live = liveView(ctx, VIEW, route, render);
  let mode = inverseCase(live.params);
  const commit = () => live.commit();

  const picker = segmented({
    legend: t('ui.inv.case'), value: mode,
    options: ['a', 'b', 'c'].map((m) => ({ value: m, label: t(`ui.inv.${m}`) })),
    onChange: (v) => {
      mode = /** @type {'a' | 'b' | 'c'} */ (v);
      showFields();
      live.change({ caso: v });
    },
  });
  const pf = prefixField({ label: t('ui.inv.prefix'), value: live.params.p ?? '', hint: t('ui.inv.prefix.hint'), placeholder: '/16', onInput: (v) => live.change({ p: v }), onEnter: commit });
  const hf = textField({ label: t('ui.inv.hosts'), value: live.params.h ?? '', hint: t('ui.inv.hosts.hint'), placeholder: '50', inputmode: 'numeric', width: '16ch', onInput: (v) => live.change({ h: v }), onEnter: commit });
  const sf = textField({ label: t('ui.inv.subnets'), value: live.params.s ?? '', placeholder: '6', inputmode: 'numeric', width: '12ch', onInput: (v) => live.change({ s: v }), onEnter: commit });
  const out = h('div', { class: 'results' });
  const steps = createStepsPanel(ctx, { fn: 'F05', method: 'rules', onMethod: () => {} });
  const barSlot = h('div');
  const el = h('div', { class: 'view view-inverso' }, picker.el,
    h('form', { class: 'form-row', novalidate: true, onsubmit: (/** @type {Event} */ e) => { e.preventDefault(); commit(); } }, pf.el, hf.el, sf.el),
    out, steps.el, barSlot);

  function showFields() {
    pf.el.hidden = mode === 'a';
    hf.el.hidden = mode === 'b';
    sf.el.hidden = mode === 'a';
  }

  /** @param {{ initial: boolean, commit: boolean }} opts */
  function render(opts) {
    const p = live.params;
    showFields();
    steps.el.hidden = true;
    barSlot.replaceChildren();
    const used = mode === 'a' ? ['h'] : mode === 'b' ? ['p', 's'] : ['p', 'h', 's'];
    const fields = { hosts: hf, subnets: sf, prefix: pf, mask: pf };
    if (used.every((k) => (p[k] ?? '').trim() === '')) {
      routeError(null, fields, 'hosts', false);
      replace(out, h('div', { class: 'empty' }, examples(EXAMPLES[mode].map((ex) => ({ label: ex.label, onPick: () => pick(ex.params) })))));
      ctx.record(null);
      return;
    }
    const r = mode === 'a' ? prefixForHostsText(p.h ?? '') : mode === 'b' ? prefixForSubnetsText(p.p ?? '', p.s ?? '') : prefixForBothText(p.p ?? '', p.h ?? '', p.s ?? '');
    if (!r.ok) {
      routeError(r.error, fields, mode === 'b' ? 'subnets' : 'hosts', opts.initial || opts.commit);
      out.replaceChildren();
      ctx.record(null);
      return;
    }
    routeError(null, fields, 'hosts', false);
    const v = /** @type {any} */ (r.value);
    /** @type {HTMLElement} */
    let card;
    if (v.mode === 'hosts') {
      card = resultCard(ctx, {
        primary: [{ label: t('ui.inv.result.prefix'), value: `/${v.prefix}` }, { label: t('ui.inv.result.mask'), value: ip(v.mask) }],
        items: [
          { label: t('ui.inv.result.available'), value: num(v.usableHosts), copy: String(v.usableHosts) },
          { label: t('ui.inv.result.spare'), value: num(v.spare), copy: false },
          { label: t('ui.r.total'), value: num(v.power), copy: false },
        ],
        warnings: r.warnings,
        children: [
          ...v.alternatives.map((/** @type {any} */ a) => notice(t('step.hosts-alt', { altPrefix: typeof a === 'number' ? a : a.prefix }))),
          // l'IP già scritto in Analisi resta: cambia solo il prefisso (revisione C6)
          h('p', {}, button(t('ui.inv.openAnalysis'), () => {
            const { ip: prevIp } = ctx.store.get().inputs['calcola/analisi'] ?? {};
            ctx.go('calcola/analisi', prevIp ? { ip: prevIp, p: `/${v.prefix}` } : { p: `/${v.prefix}` });
          }, { icon: 'link' })),
        ],
      });
      ctx.announce(t('ui.announce.inverse', { prefix: v.prefix }));
    } else if (v.mode === 'subnets') {
      card = resultCard(ctx, {
        primary: [{ label: t('ui.inv.result.newPrefix'), value: `/${v.newPrefix}` }, { label: t('ui.inv.result.mask'), value: ip(maskOf(v.newPrefix)) }],
        items: [
          { label: t('ui.inv.result.count'), value: num(v.subnets), copy: false },
          { label: t('ui.inv.result.spareSubnets'), value: num(v.spare), copy: false },
          { label: t('ui.inv.result.borrowed'), value: String(v.borrowedBits), copy: false },
          { label: t('ui.inv.result.hostsPer'), value: num(v.usableHostsPerSubnet), copy: false },
        ],
        warnings: r.warnings,
      });
      ctx.announce(t('ui.announce.inverse', { prefix: v.newPrefix }));
    } else if (v.feasible) {
      card = resultCard(ctx, {
        lead: h('p', { class: 'verdict verdict-ok' }, icon('check', { size: 26 }), t('ui.inv.feasible')),
        primary: [
          { label: t('ui.inv.result.recommended'), value: `/${v.recommended}`, note: t('ui.inv.result.recommendedNote', { subnets: v.subnetsAtRecommended, hosts: v.usableHostsAtRecommended }) },
          { label: t('ui.inv.result.mask'), value: ip(maskOf(v.recommended)) },
        ],
        items: [
          { label: t('ui.inv.result.range'), value: v.range[0] === v.range[1] ? `/${v.range[0]}` : `/${v.range[0]} – /${v.range[1]}`, copy: false },
          ...(v.alternative !== v.recommended ? [{ label: t('ui.inv.result.alternative'), value: `/${v.alternative}`, copy: false }] : []),
        ],
        warnings: r.warnings,
      });
      ctx.announce(t('ui.announce.inverse', { prefix: v.recommended }));
    } else {
      card = resultCard(ctx, {
        lead: h('p', { class: 'verdict verdict-warn' }, icon('close', { size: 26 }), t('ui.inv.infeasible')),
        children: [notice(message(v.reason), 'error'), notice(t('ui.inv.vlsm'))],
        warnings: r.warnings,
      });
      ctx.announce(t('ui.inv.infeasible'));
    }
    replace(out, card);
    if (live.didactic()) {
      steps.update(v, 'rules');
      steps.el.hidden = false;
    }
    if (ctx.store.get().settings.exportBar) {
      const parts = v.mode === 'hosts' ? [`h${v.hosts}`] : v.mode === 'subnets' ? [`p${v.blockPrefix}`, `s${v.requested}`] : [`p${v.blockPrefix}`, `h${v.hosts}`, `s${v.subnets}`];
      replace(barSlot, exportBar(ctx, () => ({
        fn: 'F05', value: v, warnings: r.warnings, input: entryFor(VIEW, live.params)?.input ?? {}, name: 'inverso', parts,
        steps: live.didactic() ? [{ fn: 'F05', value: v, method: 'rules', warnings: r.warnings }] : [],
      })));
    }
    ctx.record(entryFor(VIEW, p), opts.commit);
  }

  /** @param {Record<string, string>} params */
  function pick(params) {
    pf.setValue(params.p ?? '');
    hf.setValue(params.h ?? '');
    sf.setValue(params.s ?? '');
    live.change({ caso: mode, p: params.p, h: params.h, s: params.s });
    live.commit();
  }

  render({ initial: true, commit: false });

  return {
    el,
    update(r) {
      live.reset(r);
      mode = inverseCase(r.params);
      picker.setValue(mode);
      pf.setValue(r.params.p ?? '');
      hf.setValue(r.params.h ?? '');
      sf.setValue(r.params.s ?? '');
      render({ initial: true, commit: false });
    },
    destroy: () => live.cancel(),
    printInputs: () => [
      t(`ui.inv.${mode}`),
      mode !== 'a' && pf.value && `${t('ui.inv.prefix')}: ${pf.value}`,
      mode !== 'b' && hf.value && `${t('ui.inv.hosts')}: ${hf.value}`,
      mode !== 'a' && sf.value && `${t('ui.inv.subnets')}: ${sf.value}`,
    ].filter(Boolean).map(String),
  };
}
