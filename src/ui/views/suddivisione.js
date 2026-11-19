// @ts-check
/**
 * Pianifica · Suddivisione (F06, cap. 11 e 13): riepilogo, elenco a pagine da 256 righe
 * (prima, precedente, pagina n, successiva, ultima) e "Vai alla subnet che contiene l'IP".
 */
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { ipField, textField } from '../components/field.js';
import { prefixField } from '../components/prefix-field.js';
import { resultCard } from '../components/result-card.js';
import { examples } from '../components/controls.js';
import { createStepsPanel } from '../components/steps-panel.js';
import { liveView, routeError } from './view-kit.js';
import { entryFor } from '../history-map.js';
import { num, ip, cidr, magic, pageInfo, message } from '../format.js';
import { subdivideText, subdivide, indexOf, parseIPv4, toDotted, maskOf } from '../../engine/index.js';
import { t } from '../../i18n/strings.it.js';

const VIEW = 'pianifica/suddivisione';
export const PAGE_SIZE = 256;
const EXAMPLES = [
  { label: '10.0.0.0/16 → /19', params: { b: '10.0.0.0', p: '/16', np: '/19' } },
  { label: '192.168.10.0/23 → /26', params: { b: '192.168.10.0', p: '/23', np: '/26' } },
  { label: '10.0.0.0/8 → /30', params: { b: '10.0.0.0', p: '/8', np: '/30' } },
];

/**
 * Pagina richiesta nei limiti: da 0 all'ultima. Testo non valido → 0.
 * @param {string | undefined} pg
 * @param {number} count
 */
export function clampPage(pg, count) {
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const n = /^\d{1,9}$/.test(String(pg ?? '')) ? Number(pg) : 0;
  return Math.min(Math.max(0, n), pages - 1);
}

/**
 * @param {import('../types.js').Ctx} ctx
 * @param {import('../types.js').Route} route
 * @returns {import('../types.js').View}
 */
export function createSuddivisione(ctx, route) {
  const live = liveView(ctx, VIEW, route, render);
  const p0 = live.params;
  const commit = () => live.commit();
  /** Indice da evidenziare dopo la ricerca. */
  /** @type {number | null} */
  let highlight = null;

  const pf = prefixField({ label: t('ui.sub.prefix'), value: p0.p ?? '', placeholder: '/16', onInput: (v) => { highlight = null; live.change({ p: v, pg: undefined }); }, onEnter: commit });
  const npf = prefixField({ label: t('ui.sub.newPrefix'), value: p0.np ?? '', placeholder: '/19', onInput: (v) => { highlight = null; live.change({ np: v, pg: undefined }); }, onEnter: commit });
  const bf = ipField({
    label: t('ui.sub.block'), value: p0.b ?? '', hint: t('ui.sub.block.hint'), placeholder: '10.0.0.0', width: '20ch',
    onInput: (v) => { highlight = null; live.change({ b: v, pg: undefined }); }, onEnter: commit,
    onSplit: (rest, typed) => {
      pf.setValue(rest);
      live.change({ p: rest });
      if (typed) pf.focus();
    },
  });
  const find = textField({ label: t('ui.sub.find'), value: p0.ip ?? '', placeholder: '10.0.77.5', inputmode: 'decimal', width: '20ch', onInput: (v) => live.change({ ip: v }), onEnter: () => go() });
  const findBtn = h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => go() }, t('ui.sub.find.button'));
  const findMsg = h('p', { class: 'find-msg', 'aria-live': 'polite' });
  const findBox = h('div', { class: 'find' }, h('div', { class: 'form-row form-row-end' }, find.el, findBtn), findMsg);

  const summary = h('div');
  const tableHost = h('div');
  const steps = createStepsPanel(ctx, { fn: 'F06', method: 'magic', onMethod: () => {} });
  const listSection = h('section', { class: 'card list-card' }, findBox, tableHost);
  const el = h('div', { class: 'view view-suddivisione' },
    h('form', { class: 'form-row', novalidate: true, onsubmit: (/** @type {Event} */ e) => { e.preventDefault(); commit(); } }, bf.el, pf.el, npf.el),
    h('div', { class: 'results' }, summary, steps.el, listSection));

  /** Esito della prima chiamata (conteggio), usato per i limiti di pagina. */
  function base() {
    const p = live.params;
    return subdivideText(p.b ?? '', p.p ?? '', p.np ?? '', { offset: 0, limit: 1 });
  }

  /** @param {{ initial: boolean, commit: boolean }} opts */
  function render(opts) {
    const p = live.params;
    const fields = { block: bf, prefix: pf, mask: pf, newPrefix: npf };
    steps.el.hidden = true;
    if (['b', 'p', 'np'].every((k) => (p[k] ?? '').trim() === '')) {
      routeError(null, fields, 'block', false);
      replace(summary, h('div', { class: 'empty' }, examples(EXAMPLES.map((ex) => ({ label: ex.label, onPick: () => pick(ex.params) })))));
      listSection.hidden = true;
      ctx.record(null);
      return;
    }
    const first = base();
    if (!first.ok) {
      routeError(first.error, fields, 'block', opts.initial || opts.commit);
      summary.replaceChildren();
      listSection.hidden = true;
      ctx.record(null);
      return;
    }
    routeError(null, fields, 'block', false);
    const count = first.value.count;
    const page = clampPage(p.pg, count);
    const r = subdivide(first.value.block.network, first.value.block.prefix, first.value.newPrefix, { offset: page * PAGE_SIZE, limit: PAGE_SIZE });
    if (!r.ok) return; // non accade: pagina già nei limiti
    const v = r.value;
    replace(summary, resultCard(ctx, {
      title: t('ui.sub.summary'),
      primary: [
        { label: t('ui.sub.network'), value: cidr(v.block.network, v.block.prefix) },
        { label: t('ui.sub.count'), value: `${num(v.count)} × /${v.newPrefix}`, copy: false },
      ],
      items: [
        { label: t('ui.sub.borrowed'), value: String(v.borrowedBits), copy: false },
        { label: t('ui.sub.size'), value: num(v.subnetSize), copy: false },
        { label: t('ui.sub.hosts'), value: num(v.hostsPerSubnet), copy: false },
        { label: t('ui.r.mask'), value: ip(maskOf(v.newPrefix)) },
        { label: t('ui.sub.step'), value: magic(v.interesting), copy: false },
      ],
      warnings: [...first.warnings],
    }));
    renderTable(v, page);
    listSection.hidden = false;
    if (live.didactic()) {
      steps.update(v, 'magic');
      steps.el.hidden = false;
    }
    ctx.announce(t('ui.announce.subdivide', { count: v.count, prefix: v.newPrefix }));
    ctx.record(entryFor(VIEW, p), opts.commit);
  }

  /**
   * @param {any} v valore di subdivide
   * @param {number} page
   */
  function renderTable(v, page) {
    const info = pageInfo(page * PAGE_SIZE, PAGE_SIZE, v.count);
    const caption = t('ui.sub.caption', { from: info.from, to: info.to, count: v.count });
    const cols = ['n', 'network', 'first', 'last', 'broadcast', 'hosts'];
    const table = h('div', { class: 'tbl tbl-scroll', tabindex: '0', role: 'region', 'aria-label': caption },
      h('table', { class: 'subnets' },
        h('caption', { class: 'sr-only' }, caption),
        h('thead', {}, h('tr', {}, cols.map((c) => h('th', { scope: 'col', class: c === 'n' || c === 'hosts' ? 'num' : '' }, t(`ui.sub.col.${c}`))))),
        h('tbody', {}, v.page.items.map((/** @type {any} */ s) => h('tr', { class: s.index === highlight ? 'hl' : '', 'aria-current': s.index === highlight ? 'true' : null, dataset: { index: String(s.index) } },
          h('td', { class: 'num' }, num(s.index + 1)),
          h('th', { scope: 'row', class: 'mono' }, cidr(s.network, s.prefix)),
          h('td', { class: 'mono' }, ip(s.firstHost)),
          h('td', { class: 'mono' }, ip(s.lastHost)),
          h('td', { class: 'mono' }, ip(s.broadcast)),
          h('td', { class: 'num' }, num(s.usableHosts)))))));
    replace(tableHost, h('p', { class: 'list-caption' }, caption), table, info.pages > 1 ? pager(info.page, info.pages) : null);
  }

  /**
   * @param {number} page
   * @param {number} pages
   */
  function pager(page, pages) {
    const btn = (/** @type {'first' | 'prev' | 'next' | 'last'} */ k, /** @type {number} */ target, /** @type {boolean} */ disabled) =>
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': t(`ui.pager.${k}`), title: t(`ui.pager.${k}`), disabled, onclick: () => setPage(target) }, icon(k));
    const input = h('input', { type: 'text', inputmode: 'numeric', class: 'input mono pager-input', value: String(page + 1), 'aria-label': `${t('ui.pager.page')} (1–${pages})` });
    const goTo = () => {
      const n = Number(input.value);
      if (Number.isInteger(n) && n >= 1 && n <= pages) setPage(n - 1);
      else input.value = String(page + 1);
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        goTo();
      }
    });
    return h('nav', { class: 'pager', 'aria-label': t('ui.pager') },
      btn('first', 0, page === 0), btn('prev', page - 1, page === 0),
      h('span', { class: 'pager-pos' }, h('span', {}, t('ui.pager.page')), input, h('span', {}, t('ui.pager.of', { pages }))),
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: goTo }, t('ui.pager.go')),
      btn('next', page + 1, page >= pages - 1), btn('last', pages - 1, page >= pages - 1));
  }

  /** @param {number} page */
  function setPage(page) {
    live.change({ pg: page === 0 ? undefined : String(page) });
    live.commit();
    tableHost.querySelector('.list-caption')?.scrollIntoView({ block: 'start' });
  }

  /** "Vai alla subnet che contiene l'IP". */
  function go() {
    const first = base();
    const q = parseIPv4(find.value);
    if (!q.ok) {
      find.setError(message(q.error), { now: true });
      return;
    }
    find.setError(null);
    if (!first.ok) return;
    const { network, prefix } = first.value.block;
    const idx = indexOf(network, prefix, first.value.newPrefix, q.value);
    if (idx === null) {
      findMsg.textContent = t('ui.sub.find.outside', { ip: toDotted(q.value), block: cidr(network, prefix) });
      findMsg.className = 'find-msg w-c';
      return;
    }
    highlight = idx;
    const page = Math.floor(idx / PAGE_SIZE);
    live.change({ pg: page === 0 ? undefined : String(page) });
    live.commit();
    const s = subdivide(network, prefix, first.value.newPrefix, { offset: idx, limit: 1 });
    const item = s.ok ? s.value.page.items[0] : null;
    findMsg.textContent = item ? t('ui.sub.find.found', { ip: toDotted(q.value), n: idx + 1, cidr: cidr(item.network, item.prefix) }) : '';
    findMsg.className = 'find-msg ok-c';
    const row = tableHost.querySelector(`tr[data-index="${idx}"]`);
    row?.scrollIntoView({ block: 'center' });
  }

  /** @param {Record<string, string>} params */
  function pick(params) {
    bf.setValue(params.b);
    pf.setValue(params.p);
    npf.setValue(params.np);
    highlight = null;
    live.change({ b: params.b, p: params.p, np: params.np, pg: undefined });
    live.commit();
  }

  render({ initial: true, commit: false });
  // un collegamento con ip= apre direttamente la pagina della subnet che lo contiene
  if ((p0.ip ?? '').trim() !== '' && base().ok) go();

  return {
    el,
    update(r) {
      live.reset(r);
      bf.setValue(r.params.b ?? '');
      pf.setValue(r.params.p ?? '');
      npf.setValue(r.params.np ?? '');
      find.setValue(r.params.ip ?? '');
      render({ initial: true, commit: false });
    },
    destroy: () => live.cancel(),
    printInputs: () => [`${t('ui.sub.block')}: ${bf.value}${pf.value ? ` ${pf.value}` : ''}`, npf.value && `${t('ui.sub.newPrefix')}: ${npf.value}`].filter(Boolean),
  };
}

