// @ts-check
/**
 * Segnaposto: Pianifica · Piani salvati (fase 5) e Guide (fase 6).
 * Le rotte esistono già, così i collegamenti "Capitolo N" e "?" funzionano e indicano dove porteranno.
 */
import { h } from '../dom.js';
import { notice } from '../components/result-card.js';
import { button } from '../components/controls.js';
import { t } from '../../i18n/strings.it.js';

/**
 * @param {import('../types.js').Ctx} ctx
 * @returns {import('../types.js').View}
 */
export function createPiani(ctx) {
  return {
    el: h('div', { class: 'view view-piani' },
      h('section', { class: 'card empty-card' },
        h('p', { class: 'empty-title' }, t('ui.plans.empty')),
        h('p', {}, t('ui.plans.pending')),
        h('p', {}, button(t('ui.plans.toSubdivide'), () => ctx.go('pianifica/suddivisione'), { icon: 'pianifica' })))),
  };
}

const CHAPTERS = Array.from({ length: 19 }, (_, i) => `cap-${i + 1}`);

/**
 * @param {import('../types.js').Ctx} ctx
 * @param {import('../types.js').Route} route
 * @returns {import('../types.js').View}
 */
export function createGuide(ctx, route) {
  const target = h('div');
  const list = h('ol', { class: 'chapter-list' }, CHAPTERS.map((c) => h('li', {}, h('a', { href: ctx.href('guide/subnetting', {}, c) }, t(`ui.cap.${c}`)))));
  const chapters = h('section', { class: 'card' }, h('h2', { class: 'card-title' }, t('ui.guide.chapters')), list);
  /** @param {import('../types.js').Route} r */
  function show(r) {
    target.replaceChildren();
    if (r.anchor) {
      const name = r.anchor.startsWith('cap-') ? `${t('chapter', { chapter: r.anchor })} · ${t(`ui.cap.${r.anchor}`)}` : `"${r.anchor}"`;
      target.append(notice(t('ui.guide.target', { target: name })));
    }
    chapters.hidden = r.view !== 'guide/subnetting';
    for (const a of list.querySelectorAll('a')) {
      if (a.getAttribute('href') === ctx.href('guide/subnetting', {}, r.anchor)) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  }
  show(route);
  return {
    el: h('div', { class: 'view view-guide' }, notice(t('ui.guide.pending')), target, chapters),
    update: show,
  };
}
