// @ts-check
/**
 * Guide integrate (fase 6, specifiche sezione 6): guida all'uso e guida al subnetting.
 * Il contenuto arriva da `<template id="guide-<nome>" data-guide>` (tools/guides.js) e viene clonato.
 * Elementi comuni: indice (laterale sugli schermi larghi, richiudibile in alto sugli altri) con il
 * selettore del tema, che cambia l'impostazione dell'app; arrivo su un'ancora con il focus sul titolo;
 * voce dell'indice evidenziata mentre si legge; glossario con riquadro (solo guida al subnetting).
 * Il pulsante "torna su" è quello dell'app (main.js).
 */
import { h, debounce } from '../dom.js';
import { notice } from '../components/result-card.js';
import { THEMES, setSetting } from '../state.js';
import { annotateGlossary, createGlossaryPopover } from '../guide-glossary.js';
import { anchorId, anchorOf, guideOf } from '../guide-anchors.js';
import { t } from '../../i18n/strings.it.js';

/** Collegamenti rapidi in cima all'indice. */
const QUICK = /** @type {Record<string, string[]>} */ ({ subnetting: ['app-a', 'app-b'], uso: [] });

/**
 * Gruppi dell'indice letti dal contenuto: un gruppo per ogni `.part`, con i suoi `section.chap`.
 * @param {HTMLElement} body
 */
function readToc(body) {
  /** @type {{ title: string, items: { id: string, num: string, title: string }[] }[]} */
  const groups = [];
  for (const el of body.children) {
    if (el.classList.contains('part')) {
      const eyebrow = el.querySelector('.eyebrow')?.textContent?.trim() ?? '';
      const title = el.querySelector('h2')?.textContent?.trim() ?? '';
      groups.push({ title: !eyebrow ? title : /^APPENDICI$/i.test(eyebrow) ? cap(eyebrow) : `${cap(eyebrow)} · ${title}`, items: [] });
    } else if (el.matches('section.chap') && el.id) {
      const h3 = el.querySelector('h3');
      const num = h3?.querySelector('.num')?.textContent?.trim() ?? '';
      const title = [...(h3?.childNodes ?? [])].filter((n) => !(n instanceof Element && n.classList.contains('num'))).map((n) => n.textContent).join('').trim();
      if (!groups.length) groups.push({ title: '', items: [] });
      groups[groups.length - 1].items.push({ id: el.id, num, title });
    }
  }
  return groups;
}

/** "PARTE I" → "Parte I" */
const cap = (/** @type {string} */ s) => s.charAt(0) + s.slice(1).toLowerCase().replace(/\bi{1,3}\b|\biv\b|\bv\b/g, (x) => x.toUpperCase());

/**
 * @param {import('../types.js').Ctx} ctx
 * @param {import('../types.js').Route} route
 * @returns {import('../types.js').View}
 */
export function createGuide(ctx, route) {
  const view = route.view;
  const guide = guideOf(view);
  const tpl = /** @type {HTMLTemplateElement | null} */ (document.getElementById(`guide-${guide}`));
  const body = h('article', { class: `guide-body guide-${guide}` });
  const status = h('div', { class: 'guide-status' });
  if (!tpl) {
    return { el: h('div', { class: 'view view-guide' }, notice(t('ui.guide.missing'), 'warn')) };
  }
  body.append(tpl.content.cloneNode(true));

  const hrefOf = (/** @type {string} */ id) => ctx.href(view, {}, anchorOf(guide, id));
  // collegamenti interni scritti come id (#cap-9) → rotte; quelli già scritti come rotte restano
  for (const a of body.querySelectorAll('a[href^="#"]:not([href^="#/"])')) a.setAttribute('href', hrefOf(/** @type {string} */ (a.getAttribute('href')).slice(1)));

  // ---------------------------------------------------------------- glossario
  const glossary = annotateGlossary(body);
  const popover = glossary.size ? createGlossaryPopover(body, glossary, hrefOf) : null;

  // ---------------------------------------------------------------- indice
  const groups = readToc(body);
  /** @type {HTMLAnchorElement[]} */
  const tocLinks = [];
  const title = t(`ui.title.${view}`);

  /**
   * @param {string} variant
   * @returns {(Node | null)[]}
   */
  function tocContent(variant) {
    const selectId = `guide-theme-${guide}-${variant}`;
    const select = h('select', { id: selectId, class: 'input guide-theme', onchange: (/** @type {Event} */ e) => {
      const v = /** @type {HTMLSelectElement} */ (e.target).value;
      ctx.store.set((s) => setSetting(s, 'theme', v));
    } }, THEMES.map((th) => h('option', { value: th }, t(`ui.theme.${th}`))));
    select.value = ctx.store.get().settings.theme;
    const quick = QUICK[guide].filter((id) => body.querySelector(`[id="${id}"]`));
    return [
      h('div', { class: 'guide-theme-row' }, h('label', { for: selectId }, t('ui.set.theme')), select),
      quick.length
        ? h('div', { class: 'guide-quick' }, quick.map((id) => {
            const a = h('a', { href: hrefOf(id) }, readTitle(id));
            return a;
          }))
        : null,
      ...groups.flatMap((g) => [
        g.title ? h('p', { class: 'guide-toc-group' }, g.title) : null,
        h('ol', { class: 'guide-toc-list' }, g.items.map((it) => {
          // nome accessibile = testo visibile ("09 Il numero magico"), come chiede WCAG 2.5.3
          const a = h('a', { href: hrefOf(it.id), dataset: { id: it.id } }, it.num ? [h('span', { class: 'n' }, it.num), ' '] : null, h('span', {}, it.title));
          tocLinks.push(a);
          return h('li', {}, a);
        })),
      ]),
    ];
  }
  /** Titolo breve di una sezione (per i collegamenti rapidi). */
  function readTitle(/** @type {string} */ id) {
    for (const g of groups) for (const it of g.items) if (it.id === id) return it.title;
    return id;
  }

  const tocSide = h('nav', { class: 'guide-toc', 'aria-label': t('ui.guide.toc', { guide: title }) }, tocContent('side'));
  const tocMobile = h('details', { class: 'guide-toc-mobile' },
    h('summary', {}, t('ui.guide.tocShort')),
    h('nav', { 'aria-label': t('ui.guide.toc', { guide: title }) }, tocContent('top')));
  const selects = /** @type {HTMLSelectElement[]} */ ([...tocSide.querySelectorAll('select'), ...tocMobile.querySelectorAll('select')]);
  const unsubscribe = ctx.store.subscribe((s, prev) => {
    if (s.settings.theme !== prev.settings.theme) for (const sel of selects) sel.value = s.settings.theme;
  });

  // ---------------------------------------------------------------- voce attiva dell'indice
  /** @param {string} id */
  function setActive(id) {
    for (const a of tocLinks) {
      if (a.dataset.id === id) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    }
  }
  /** @type {IntersectionObserver | null} */
  let io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(/** @type {HTMLElement} */ (e.target).id);
    }, { rootMargin: '-20% 0px -70% 0px' });
    for (const sec of body.querySelectorAll('section.chap[id]')) io.observe(sec);
  }

  // ---------------------------------------------------------------- aree che scorrono in orizzontale: raggiungibili da tastiera
  function markScrollables() {
    for (const el of /** @type {HTMLElement[]} */ ([...body.querySelectorAll('.tbl, pre.bin, .scale-wrap')])) {
      if (el.scrollWidth > el.clientWidth + 1) el.setAttribute('tabindex', '0');
      else el.removeAttribute('tabindex');
    }
  }
  const onResize = debounce(markScrollables, 200);
  window.addEventListener('resize', onResize);

  // ---------------------------------------------------------------- arrivo su un'ancora
  /** @type {HTMLElement | null} */
  let marked = null;
  /**
   * @param {string | null} anchor
   * @param {{ focus?: boolean }} [opts]
   * @returns {boolean} vero se l'ancora esiste
   */
  function reveal(anchor, opts = {}) {
    popover?.hide();
    status.replaceChildren();
    marked?.classList.remove('is-target');
    marked = null;
    if (!anchor) return false;
    const id = anchorId(guide, anchor);
    const el = /** @type {HTMLElement | null} */ (body.querySelector(`[id="${CSS.escape(id)}"]`));
    if (!el) {
      status.append(notice(t('ui.guide.notFound', { anchor }), 'warn'));
      return false;
    }
    const target = /** @type {HTMLElement} */ (el.matches('h2,h3,h4,h5,tr') ? el : el.querySelector('h2,h3,h4') ?? el);
    if (el.matches('tr')) {
      el.classList.add('is-target');
      marked = el;
    }
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    el.scrollIntoView({ block: 'start', behavior: 'instant' });
    if (opts.focus !== false) target.focus({ preventScroll: true });
    const sec = el.closest('section.chap');
    if (sec) setActive(sec.id);
    return true;
  }

  const onClick = (/** @type {MouseEvent} */ e) => {
    const a = e.target instanceof Element ? e.target.closest('a[href^="#/guide/"]') : null;
    if (!a) return;
    if (a.closest('.guide-toc-mobile')) tocMobile.open = false;
    // stessa ancora già nel frammento: niente hashchange, si torna comunque al paragrafo
    if (a.getAttribute('href') === window.location.hash) {
      e.preventDefault();
      reveal(ctx.route().anchor);
    }
  };

  const root = h('div', { class: 'view view-guide guide', dataset: { guide } },
    tocMobile,
    status,
    h('div', { class: 'guide-layout' }, tocSide, body));
  root.addEventListener('click', onClick);
  requestAnimationFrame(markScrollables);

  return {
    el: root,
    update(r) {
      if (r.anchor) reveal(r.anchor);
      else {
        reveal(null);
        window.scrollTo({ top: 0, behavior: 'instant' });
        /** @type {HTMLElement | null} */ (document.querySelector('.view-title'))?.focus({ preventScroll: true });
      }
    },
    reveal(r, info) {
      if (!r.anchor) return false;
      const ok = reveal(r.anchor);
      // al primo caricamento i caratteri possono spostare il testo: si riallinea quando sono pronti
      if (ok && info?.initial && document.fonts?.ready) {
        void document.fonts.ready.then(() => {
          if (ctx.route().anchor === r.anchor) reveal(r.anchor, { focus: false });
        });
      }
      return ok;
    },
    destroy() {
      unsubscribe();
      io?.disconnect();
      popover?.destroy();
      window.removeEventListener('resize', onResize);
    },
  };
}
