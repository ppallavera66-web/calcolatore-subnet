// @ts-check
/**
 * Guscio dell'app (specifica tecnica, 9.2): tre navigazioni, una per fascia di larghezza
 * (le altre sono nascoste via CSS, quindi fuori anche dall'albero di accessibilità):
 * - < 720 px: barra in basso con icona ed etichetta, sottoschede come controllo segmentato scorrevole;
 * - 720–979 px: sezioni come schede in alto, sottoschede sotto;
 * - ≥ 980 px: barra laterale di 240 px con sezioni e sottoschede.
 * Intestazione della vista: titolo, "?" verso la guida all'uso, cronologia, descrizione.
 */
import { h } from './dom.js';
import { icon } from './icons.js';
import { SECTIONS } from './router.js';
import { helpLink } from './components/controls.js';
import { t } from '../i18n/strings.it.js';

const SECTION_ORDER = /** @type {const} */ (['calcola', 'pianifica', 'guide', 'impostazioni']);

/**
 * @param {import('./types.js').Ctx} ctx
 * @param {{ version: string, focusMain: () => void }} o
 */
export function createShell(ctx, o) {
  /** Ultima scheda visitata per sezione: il collegamento della sezione la riapre. */
  /** @type {Record<string, string>} */
  const lastTab = { calcola: 'calcola/analisi', pianifica: 'pianifica/inverso', guide: 'guide/uso', impostazioni: 'impostazioni' };

  /** @type {{ el: HTMLAnchorElement, view: string, section: string, kind: 'section' | 'tab' }[]} */
  const links = [];

  /**
   * @param {string} view
   * @param {string} section
   * @param {'section' | 'tab'} kind
   * @param {(Node | string)[]} content
   * @param {string} [cls]
   */
  function link(view, section, kind, content, cls) {
    const el = h('a', { href: '#', class: cls }, content);
    links.push({ el, view, section, kind });
    return el;
  }

  const tabsOf = (/** @type {string} */ section) => /** @type {Record<string, readonly string[]>} */ (SECTIONS)[section];
  const viewOf = (/** @type {string} */ section, /** @type {string} */ tab) => `${section}/${tab}`;

  // barra laterale (≥ 980 px)
  const sidebar = h(
    'aside',
    { class: 'sidebar' },
    h('p', { class: 'brand' }, 'Calcolatore ', h('span', {}, 'Subnet')),
    h('p', { class: 'brand-sub' }, t('ui.app.tagline')),
    h(
      'nav',
      { class: 'side-nav', 'aria-label': t('ui.nav.main') },
      h('ul', { class: 'side-sections' },
        SECTION_ORDER.map((section) =>
          h('li', {},
            link(lastTab[section], section, 'section', [icon(/** @type {any} */ (section), { size: 18 }), h('span', {}, t(`ui.section.${section}`))], 'side-section'),
            tabsOf(section).length
              ? h('ul', { class: 'side-tabs' }, tabsOf(section).map((tab) => h('li', {}, link(viewOf(section, tab), section, 'tab', [t(`ui.tab.${tab}`)], 'side-tab'))))
              : null))),
    ),
    h('p', { class: 'side-foot' }, `v${o.version}`),
  );

  // schede delle sezioni in alto (720–979 px)
  const topTabs = h(
    'nav',
    { class: 'top-tabs', 'aria-label': t('ui.nav.main') },
    SECTION_ORDER.map((section) => link(lastTab[section], section, 'section', [icon(/** @type {any} */ (section), { size: 18 }), h('span', {}, t(`ui.section.${section}`))], 'top-tab')),
  );

  // barra in basso (< 720 px)
  const bottomBar = h(
    'nav',
    { class: 'bottom-bar', 'aria-label': t('ui.nav.main') },
    SECTION_ORDER.map((section) => link(lastTab[section], section, 'section', [icon(/** @type {any} */ (section), { size: 22 }), h('span', {}, t(`ui.section.${section}`))], 'bottom-tab')),
  );

  // sottoschede (< 980 px): una per sezione, visibile quella corrente
  const subtabs = h('div', { class: 'subtabs-wrap' });
  /** @type {Record<string, HTMLElement>} */
  const subtabNavs = {};
  for (const section of SECTION_ORDER) {
    if (!tabsOf(section).length) continue;
    subtabNavs[section] = h(
      'nav',
      { class: 'subtabs', 'aria-label': t('ui.nav.tabs', { section: t(`ui.section.${section}`) }), hidden: true },
      tabsOf(section).map((tab) => link(viewOf(section, tab), section, 'tab', [t(`ui.tab.${tab}`)], 'subtab')),
    );
    subtabs.append(subtabNavs[section]);
  }

  const title = h('h1', { class: 'view-title', tabindex: '-1' });
  const lead = h('p', { class: 'view-lead' });
  const tools = h('div', { class: 'view-tools' });
  const printHead = h('div', { class: 'print-head', 'aria-hidden': 'true' });
  const viewHost = h('div', { class: 'view-host' });
  const main = h('main', { id: 'main', class: 'main', tabindex: '-1' },
    subtabs,
    h('header', { class: 'view-head' }, h('div', { class: 'view-title-row' }, title, tools), lead),
    printHead,
    viewHost);

  const skip = h('a', { class: 'skip-link', href: '#', onclick: (/** @type {Event} */ e) => { e.preventDefault(); o.focusMain(); } }, t('ui.skip'));
  const topbar = h('header', { class: 'topbar' }, h('p', { class: 'brand brand-compact' }, 'Calcolatore ', h('span', {}, 'Subnet')), topTabs);
  const root = h('div', { class: 'app' }, sidebar, h('div', { class: 'app-main' }, topbar, main), bottomBar);

  /** Aggiorna collegamenti (con gli input salvati di ogni vista) e voci correnti. */
  function refreshLinks() {
    const route = ctx.route();
    const inputs = ctx.store.get().inputs;
    for (const l of links) {
      const view = l.kind === 'section' ? lastTab[l.section] : l.view;
      l.el.href = ctx.href(view, inputs[view] ?? {});
      const current = l.kind === 'section' ? route.section === l.section : route.view === l.view;
      if (current) l.el.setAttribute('aria-current', l.kind === 'tab' ? 'page' : 'true');
      else l.el.removeAttribute('aria-current');
    }
  }

  /**
   * @param {import('./types.js').Route} route
   */
  function setRoute(route) {
    lastTab[route.section] = route.view;
    root.dataset.section = route.section;
    for (const [section, nav] of Object.entries(subtabNavs)) nav.hidden = section !== route.section;
    subtabs.hidden = !subtabNavs[route.section];
    title.textContent = t(`ui.title.${route.view}`);
    lead.textContent = t(`ui.lead.${route.view}`);
    const withHistory = route.section === 'calcola' || route.section === 'pianifica';
    tools.replaceChildren(
      ...(route.section !== 'guide' ? [helpLink(ctx, t(`ui.title.${route.view}`), route.tab ?? route.section)] : []),
      ...(withHistory
        ? [h('button', { type: 'button', class: 'btn btn-ghost btn-sm history-btn', 'aria-haspopup': 'dialog', onclick: () => ctx.openHistory() },
            icon('history', { size: 18 }), h('span', {}, t('ui.history.open')))]
        : []),
    );
    document.title = `${t(`ui.title.${route.view}`)} · ${t('ui.titleSuffix')}`;
    refreshLinks();
  }

  return { root, skip, main, title, viewHost, printHead, setRoute, refreshLinks };
}
