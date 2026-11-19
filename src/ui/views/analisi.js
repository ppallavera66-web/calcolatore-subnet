// @ts-check
/**
 * Calcola · Analisi (specifica tecnica, 9.1): F01 con il tipo di indirizzo (F04) nella scheda
 * risultato e la sezione richiudibile "Wildcard e configurazione" (F10 base).
 * Con un IP senza prefisso mostra solo la classificazione e invita ad aggiungere il prefisso.
 */
import { h, replace } from '../dom.js';
import { ipField, textField } from '../components/field.js';
import { prefixField } from '../components/prefix-field.js';
import { resultCard, warningsBox, notice, copyButton } from '../components/result-card.js';
import { createStepsPanel } from '../components/steps-panel.js';
import { examples } from '../components/controls.js';
import { exportBar } from '../components/export-bar.js';
import { liveView, routeError, numberOrText } from './view-kit.js';
import { entryFor } from '../history-map.js';
import { num, ip, cidr, magic, addressType } from '../format.js';
import { analyze, analyzeText, parseAddressInput, classify, snippets, SNIPPET_DEFAULTS, toDotted } from '../../engine/index.js';
import { t } from '../../i18n/strings.it.js';

const VIEW = 'calcola/analisi';

const EXAMPLES = ['192.168.10.75/26', '172.16.45.200/20', '10.150.33.7/11', '192.168.50.99/30', '10.0.0.1/31'];

/**
 * Esito dell'analisi a partire dai due campi.
 * @param {string} ipText
 * @param {string} pText
 */
export function compute(ipText, pText) {
  if (pText.trim() === '') {
    const r = parseAddressInput(ipText);
    if (!r.ok) return { kind: /** @type {const} */ ('error'), error: { ...r.error, field: 'ip' } };
    if (r.value.prefix === null) return { kind: /** @type {const} */ ('classify'), value: classify(r.value.ip).value, ip: r.value.ip };
    const a = analyze(r.value.ip, r.value.prefix);
    return { kind: /** @type {const} */ ('analysis'), result: a };
  }
  const a = analyzeText(ipText, pText);
  if (!a.ok) return { kind: /** @type {const} */ ('error'), error: a.error };
  return { kind: /** @type {const} */ ('analysis'), result: a };
}

/**
 * @param {import('../types.js').Ctx} ctx
 * @param {import('../types.js').Route} route
 * @returns {import('../types.js').View}
 */
export function createAnalisi(ctx, route) {
  const live = liveView(ctx, VIEW, route, render);
  const p0 = live.params;

  const prefix = prefixField({
    label: t('ui.field.prefix'),
    value: p0.p ?? '',
    hint: t('ui.field.prefix.hint'),
    onInput: (v) => live.change({ p: v }),
    onEnter: () => live.commit(),
  });
  const ipf = ipField({
    label: t('ui.field.ip'),
    value: p0.ip ?? '',
    hint: t('ui.field.ip.hint'),
    placeholder: '192.168.10.75',
    width: '20ch',
    onInput: (v) => live.change({ ip: v }),
    onEnter: () => live.commit(),
    onSplit: (rest, typed) => {
      prefix.setValue(rest);
      live.change({ p: rest });
      if (typed) {
        prefix.focus();
        prefix.input.setSelectionRange(rest.length, rest.length);
      }
    },
  });

  const form = h('form', { class: 'form-row', novalidate: true, onsubmit: (/** @type {Event} */ e) => { e.preventDefault(); live.commit(); } }, ipf.el, prefix.el);
  // posizioni fisse: i pannelli persistenti non vengono mai tolti dal DOM (il focus non si perde)
  const emptySlot = h('div');
  const cardSlot = h('div');
  const steps = createStepsPanel(ctx, { fn: 'F01', method: live.method('F01'), onMethod: (m) => live.setMethod('F01', m) });
  const classSteps = createStepsPanel(ctx, { fn: 'F04', method: 'rules', onMethod: () => {} });
  const snip = snippetSection(ctx, () => live.didactic());
  const barSlot = h('div');
  const results = h('div', { class: 'results' }, emptySlot, cardSlot, snip.el, classSteps.el, steps.el, barSlot);
  const el = h('div', { class: 'view view-analisi' }, form, results);

  /**
   * Mostra le posizioni indicate e nasconde le altre.
   * @param {{ empty?: Node, card?: Node, snip?: boolean, classSteps?: boolean, steps?: boolean, bar?: Node | null }} show
   */
  function layout(show) {
    replace(emptySlot, show.empty ?? null);
    replace(cardSlot, show.card ?? null);
    replace(barSlot, show.bar ?? null);
    emptySlot.hidden = !show.empty;
    cardSlot.hidden = !show.card;
    barSlot.hidden = !show.bar;
    snip.el.hidden = !show.snip;
    classSteps.el.hidden = !show.classSteps;
    steps.el.hidden = !show.steps;
  }

  /** @param {{ initial: boolean, commit: boolean }} opts */
  function render(opts) {
    const p = live.params;
    const ipText = p.ip ?? '';
    const pText = p.p ?? '';
    if (ipText.trim() === '' && pText.trim() === '') {
      routeError(null, { ip: ipf, prefix, mask: prefix }, 'ip', false);
      layout({ empty: h('div', { class: 'empty' }, examples(EXAMPLES.map((ex) => ({ label: ex, onPick: () => pick(ex) })))) });
      ctx.record(null);
      return;
    }
    const out = compute(ipText, pText);
    const now = opts.initial || opts.commit;
    if (out.kind === 'error') {
      routeError(out.error, { ip: ipf, prefix, mask: prefix }, 'ip', now);
      layout({});
      ctx.record(null);
      return;
    }
    routeError(null, { ip: ipf, prefix, mask: prefix }, 'ip', false);
    const didactic = live.didactic();
    const bar = ctx.store.get().settings.exportBar ? exportBar(ctx, { snippet: out.kind === 'analysis' }) : null;

    if (out.kind === 'classify') {
      const c = out.value;
      const type = addressType(c);
      const card = resultCard(ctx, {
        title: t('ui.r.type'),
        badge: { text: type.scope, kind: c.scope },
        items: [
          { label: t('ui.r.type'), value: type.badge, mono: false, copy: false, note: type.blockRef ?? undefined, wide: true },
          { label: t('ui.r.class'), value: type.cls, mono: false, copy: false,
            note: c.historicalClass.defaultPrefix === null ? t('ui.r.noDefault') : t('ui.r.defaultPrefix', { prefix: c.historicalClass.defaultPrefix }) },
          ...(c.blocks.length > 1 ? [{ label: t('ui.r.blocks'), value: c.blocks.map((b) => b.cidr).join(', '), copy: false }] : []),
        ],
        children: [notice(t('ui.r.noPrefix'))],
      });
      if (didactic) classSteps.update(c, 'rules');
      layout({ card, classSteps: didactic, bar });
      ctx.announce(t('ui.announce.classify', { scope: type.scope.toLowerCase(), cls: c.historicalClass.letter }));
    } else {
      const r = /** @type {Extract<ReturnType<typeof analyzeText>, { ok: true }>} */ (out.result);
      const v = r.value;
      const type = addressType(v.classification);
      const card = resultCard(ctx, {
        badge: { text: type.badge, kind: v.classification.scope, title: type.blockRef ?? undefined },
        primary: [
          { label: t('ui.r.network'), value: cidr(v.network, v.prefix) },
          { label: t('ui.r.broadcast'), value: ip(v.broadcast), copy: v.broadcast === null ? false : undefined,
            note: v.broadcast === null ? t(v.prefix === 31 ? 'W_P2P' : 'W_SINGLE') : undefined },
        ],
        items: [
          { label: t('ui.r.firstHost'), value: ip(v.firstHost) },
          { label: t('ui.r.lastHost'), value: ip(v.lastHost) },
          { label: t('ui.r.usable'), value: num(v.usableHosts), copy: String(v.usableHosts), note: v.hostKind === 'standard' ? undefined : t(`kind.${v.hostKind}`) },
          { label: t('ui.r.total'), value: num(v.totalAddresses), copy: String(v.totalAddresses) },
          { label: t('ui.r.mask'), value: ip(v.mask) },
          { label: t('ui.r.wildcard'), value: ip(v.wildcard) },
          { label: t('ui.r.magic'), value: magic(v.interesting), copy: false },
          { label: t('ui.r.block'), value: t('ui.r.blockRange', { start: v.interesting.blockStart, end: v.interesting.blockEnd, index: v.interesting.index }), copy: false, mono: false },
          { label: t('ui.r.position'), value: t('ui.r.positionValue', { n: v.offset + 1, role: t(`role.${v.role}`) }), copy: false, mono: false },
          { label: t('ui.r.previous'), value: v.previousNetwork === null ? t('ui.r.outside') : cidr(v.previousNetwork, v.prefix), copy: v.previousNetwork === null ? false : undefined, mono: v.previousNetwork !== null },
          { label: t('ui.r.next'), value: v.nextNetwork === null ? t('ui.r.outside') : cidr(v.nextNetwork, v.prefix), copy: v.nextNetwork === null ? false : undefined, mono: v.nextNetwork !== null },
          { label: t('ui.r.class'), value: type.cls, mono: false, copy: false },
        ],
        warnings: r.warnings,
      });
      snip.update(v.network, v.prefix);
      if (didactic) steps.update(v, live.method('F01'));
      layout({ card, snip: true, steps: didactic, bar });
      ctx.announce(t('ui.announce.analisi', { network: cidr(v.network, v.prefix), broadcast: ip(v.broadcast), hosts: num(v.usableHosts) }));
    }
    ctx.record(entryFor(VIEW, live.params), opts.commit);
  }

  /** @param {string} example */
  function pick(example) {
    const [a, b] = example.split('/');
    ipf.setValue(a);
    prefix.setValue(`/${b}`);
    live.change({ ip: a, p: `/${b}` });
    live.commit();
  }

  render({ initial: true, commit: false });

  return {
    el,
    update(r) {
      live.reset(r);
      ipf.setValue(r.params.ip ?? '');
      prefix.setValue(r.params.p ?? '');
      render({ initial: true, commit: false });
    },
    destroy: () => live.cancel(),
    printInputs: () => [ipf.value && `${t('ui.field.ip')}: ${ipf.value}`, prefix.value && `${t('ui.field.prefix')}: ${prefix.value}`].filter(Boolean),
  };
}

/**
 * Sezione richiudibile "Wildcard e configurazione (ACL, OSPF)" (F10 base, cap. 14).
 * Le opzioni restano tra un calcolo e l'altro (non fanno parte del frammento).
 * @param {import('../types.js').Ctx} ctx
 * @param {() => boolean} didactic
 */
function snippetSection(ctx, didactic) {
  /** @type {{ network: number, prefix: number } | null} */
  let target = null;
  /** @type {Record<'aclNumber' | 'aclName' | 'aclAction' | 'ospfProcess' | 'ospfArea', string>} */
  const opts = {
    aclNumber: String(SNIPPET_DEFAULTS.acl.number),
    aclName: SNIPPET_DEFAULTS.acl.name,
    aclAction: SNIPPET_DEFAULTS.acl.action,
    ospfProcess: String(SNIPPET_DEFAULTS.ospf.process),
    ospfArea: String(SNIPPET_DEFAULTS.ospf.area),
  };
  const set = (/** @type {keyof typeof opts} */ k) => (/** @type {string} */ v) => {
    opts[k] = v;
    refresh(false);
  };
  const fNumber = textField({ label: t('field.aclNumber'), value: opts.aclNumber, inputmode: 'numeric', width: '8ch', onInput: set('aclNumber') });
  const fName = textField({ label: t('field.aclName'), value: opts.aclName, width: '16ch', onInput: set('aclName') });
  const action = h('select', { class: 'input mono', id: `${fName.input.id}-action`, onchange: (/** @type {Event} */ e) => set('aclAction')(/** @type {HTMLSelectElement} */ (e.target).value) },
    h('option', { value: 'permit', selected: true }, 'permit'), h('option', { value: 'deny' }, 'deny'));
  const fAction = h('div', { class: 'field' }, h('label', { class: 'field-label', for: action.id }, t('field.aclAction')), action);
  const fProcess = textField({ label: t('field.ospfProcess'), value: opts.ospfProcess, inputmode: 'numeric', width: '8ch', onInput: set('ospfProcess') });
  const fArea = textField({ label: t('field.ospfArea'), value: opts.ospfArea, inputmode: 'decimal', width: '14ch', onInput: set('ospfArea') });
  const blocks = h('div', { class: 'snip-blocks' });
  const stepsHost = h('div');
  const rulesPanel = createStepsPanel(ctx, { fn: 'F10', method: 'rules', onMethod: () => {}, title: `${t('ui.steps.title')} · ${t('ui.r.wildcard')}` });
  const el = h(
    'details',
    { class: 'card snip' },
    h('summary', { class: 'snip-summary' }, h('span', {}, t('ui.snip.title'))),
    h('div', { class: 'snip-body' },
      h('fieldset', { class: 'snip-options' }, h('legend', {}, t('ui.snip.options')), fNumber.el, fName.el, fAction, fProcess.el, fArea.el),
      blocks,
      stepsHost),
  );

  /** @param {boolean} now */
  function refresh(now) {
    if (!target) return;
    const r = snippets(target.network, target.prefix, {
      acl: { number: /** @type {number} */ (numberOrText(opts.aclNumber)), name: opts.aclName.trim(), action: opts.aclAction },
      ospf: { process: /** @type {number} */ (numberOrText(opts.ospfProcess)), area: opts.ospfArea },
    });
    const fields = { aclNumber: fNumber, aclName: fName, ospfProcess: fProcess, ospfArea: fArea };
    routeError(r.ok ? null : r.error, fields, 'aclNumber', now);
    if (!r.ok) {
      blocks.replaceChildren();
      stepsHost.replaceChildren();
      return;
    }
    const v = r.value;
    const code = (/** @type {'aclStandard' | 'aclNamed' | 'ospf'} */ key) => {
      const text = v.lines[key].join('\n');
      return h('figure', { class: 'snip-block' },
        h('figcaption', {}, h('span', {}, t(`ui.snip.${key}`)), copyButton(ctx, text, t('ui.snip.lines', { what: t(`ui.snip.${key}`) }))),
        h('pre', { class: 'code mono' }, text));
    };
    replace(
      blocks,
      h('p', { class: 'snip-wildcard' }, `${t('ui.r.wildcard')} `, h('span', { class: 'mono' }, toDotted(v.wildcard)), ' · ', h('span', { class: 'mono' }, `${toDotted(v.network)}/${v.prefix}`)),
      r.warnings.length ? warningsBox(r.warnings) : null,
      code('aclStandard'), code('aclNamed'), code('ospf'),
    );
    if (didactic()) {
      rulesPanel.update(v, 'rules', r.warnings);
      stepsHost.replaceChildren(rulesPanel.el);
    } else stepsHost.replaceChildren();
  }

  return {
    el,
    /** @param {number} network @param {number} prefix */
    update(network, prefix) {
      target = { network, prefix };
      refresh(false);
    },
  };
}
