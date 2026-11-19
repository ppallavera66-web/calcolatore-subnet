// @ts-check
/**
 * Segnaposto: Guide (fase 6).
 * Le rotte esistono già, così i collegamenti "Capitolo N" e "?" funzionano e indicano dove porteranno.
 */
import { h } from '../dom.js';
import { notice } from '../components/result-card.js';
import { t } from '../../i18n/strings.it.js';

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
