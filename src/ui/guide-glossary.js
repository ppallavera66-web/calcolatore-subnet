// @ts-check
/**
 * Glossario della guida al subnetting (fase 6, sezione 6 delle specifiche): i termini della tabella
 * del glossario (appendice B) vengono evidenziati nel testo, alla prima occorrenza in ogni capitolo,
 * e mostrano la definizione in un riquadro con mouse, tocco e tastiera.
 *
 * - `glossaryRows`, `buildMatcher`, `splitTerms`: funzioni pure, provate in Node;
 * - `annotateGlossary`: sostituisce nel DOM le occorrenze con `<span class="gl-term">`;
 * - `createGlossaryPopover`: il riquadro, inserito subito dopo il termine (così con Tab si raggiungono
 *   i suoi collegamenti), con Esc che lo chiude e riporta il focus sul termine.
 * Il termine è descritto (aria-describedby) dalla cella della definizione nella tabella del glossario,
 * quindi il lettore di schermo legge la definizione anche senza il riquadro.
 */
import { h } from './dom.js';
import { t } from '../i18n/strings.it.js';

/**
 * @typedef {{ id: string, terms: string[], cs: boolean, ref: string, title: string, def: string }} GlossaryRow
 * @typedef {{ re: RegExp, find: (match: string) => GlossaryRow | null }} Matcher
 * @typedef {string | { text: string, row: GlossaryRow }} Segment
 */

/**
 * Voci del glossario lette dalle righe della tabella (attributi data-terms, data-case, data-ref).
 * @param {Iterable<{ id: string, terms: string, cs: boolean, ref: string, title: string, def: string }>} raw
 * @returns {GlossaryRow[]}
 */
export function glossaryRows(raw) {
  return [...raw].map((r) => ({ ...r, terms: r.terms.split('|').map((x) => x.trim()).filter(Boolean) }));
}

const escapeRe = (/** @type {string} */ s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Espressione che trova tutti i termini, dal più lungo (così "subnet mask" vince su "subnet"),
 * solo come parole intere (niente lettere o cifre attaccate, anche accentate).
 * @param {GlossaryRow[]} rows
 * @returns {Matcher}
 */
export function buildMatcher(rows) {
  const entries = rows.flatMap((row) => row.terms.map((term) => ({ term, row })));
  entries.sort((a, b) => b.term.length - a.term.length);
  const re = new RegExp(`(?<![\\p{L}\\d])(${entries.map((e) => escapeRe(e.term)).join('|')})(?![\\p{L}\\d])`, 'giu');
  return {
    re,
    find(match) {
      const e = entries.find((x) => (x.row.cs ? x.term === match : x.term.toLowerCase() === match.toLowerCase()));
      return e ? e.row : null;
    },
  };
}

/**
 * Divide un testo in parti semplici e termini del glossario. Ogni voce si evidenzia una sola volta
 * per capitolo (`seen`), e non nel capitolo a cui rimanda (`sectionId`).
 * Restituisce `null` se il testo non contiene termini nuovi.
 * @param {string} text
 * @param {Matcher} matcher
 * @param {Set<string>} seen identificativi delle voci già evidenziate nel capitolo (viene aggiornato)
 * @param {string} sectionId
 * @returns {Segment[] | null}
 */
export function splitTerms(text, matcher, seen, sectionId) {
  /** @type {Segment[]} */
  const out = [];
  let last = 0;
  matcher.re.lastIndex = 0;
  for (const m of text.matchAll(matcher.re)) {
    const row = matcher.find(m[1]);
    if (!row || seen.has(row.id) || row.ref === sectionId) continue;
    seen.add(row.id);
    const at = /** @type {number} */ (m.index);
    if (at > last) out.push(text.slice(last, at));
    out.push({ text: m[1], row });
    last = at + m[1].length;
  }
  if (!out.length) return null;
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Dove non si evidenzia: codice, titoli, collegamenti, controlli, etichette dei riquadri, tabella a scaletta. */
const SKIP = 'pre,code,h1,h2,h3,h4,h5,h6,a,button,label,th,svg,select,summary,.lbl,.scale,.gl-term,.gl-pop,.ex .q,.open-calc,.legend,.eyebrow';

/**
 * Legge il glossario dalla tabella `table.gloss` e annota i capitoli.
 * @param {HTMLElement} root contenuto della guida
 * @returns {Map<string, GlossaryRow>} voci per identificativo
 */
export function annotateGlossary(root) {
  const trs = /** @type {HTMLTableRowElement[]} */ ([...root.querySelectorAll('table.gloss tr[data-terms]')]);
  const rows = glossaryRows(trs.map((tr) => ({
    id: tr.id,
    terms: tr.dataset.terms ?? '',
    cs: tr.dataset.case === '1',
    ref: tr.dataset.ref ?? '',
    title: (tr.cells[0]?.textContent ?? '').trim(),
    def: (tr.cells[1]?.textContent ?? '').trim(),
  })));
  const byId = new Map(rows.map((r) => [r.id, r]));
  if (!rows.length) return byId;
  const matcher = buildMatcher(rows);
  for (const sec of /** @type {HTMLElement[]} */ ([...root.querySelectorAll('section.chap')])) {
    if (sec.querySelector('table.gloss')) continue;
    const seen = new Set();
    const walker = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement?.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    /** @type {Text[]} */
    const nodes = [];
    while (walker.nextNode()) nodes.push(/** @type {Text} */ (walker.currentNode));
    for (const node of nodes) {
      const parts = splitTerms(node.nodeValue ?? '', matcher, seen, sec.id);
      if (!parts) continue;
      const frag = document.createDocumentFragment();
      for (const p of parts) {
        if (typeof p === 'string') frag.append(p);
        else {
          frag.append(h('span', {
            class: 'gl-term',
            role: 'button',
            tabindex: '0',
            'aria-expanded': 'false',
            dataset: { gl: p.row.id },
            'aria-describedby': `${p.row.id}-def`,
          }, p.text));
        }
      }
      node.replaceWith(frag);
    }
  }
  return byId;
}

/**
 * Riquadro della definizione.
 * @param {HTMLElement} root contenuto della guida (delegazione degli eventi)
 * @param {Map<string, GlossaryRow>} byId
 * @param {(anchor: string) => string} hrefOf frammento di un'ancora della guida
 */
export function createGlossaryPopover(root, byId, hrefOf) {
  const pop = h('span', { class: 'gl-pop', role: 'group', hidden: true });
  /** @type {HTMLElement | null} */
  let cur = null;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let hideTimer;

  function place() {
    if (!cur) return;
    const r = cur.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;
    const left = Math.max(10, Math.min(r.left, vw - pw - 10));
    let top = r.bottom + 8;
    if (top + ph + 10 > vh && r.top > ph + 18) top = r.top - ph - 8;
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }

  /** @param {HTMLElement} el */
  function show(el) {
    clearTimeout(hideTimer);
    const row = byId.get(el.dataset.gl ?? '');
    if (!row) return;
    if (cur && cur !== el) cur.classList.remove('open');
    cur = el;
    el.classList.add('open');
    el.setAttribute('aria-expanded', 'true');
    const links = [];
    if (row.ref) {
      const n = row.ref.replace(/^cap-/, '');
      links.push(h('a', { href: hrefOf(row.ref) }, t('ui.guide.gloss.chapter', { n, title: t(`ui.cap.${row.ref}`) })));
    }
    links.push(h('a', { href: hrefOf(row.id) }, t('ui.guide.gloss.entry')));
    pop.replaceChildren(
      h('span', { class: 'gl-pop-title' }, row.title),
      h('span', { class: 'gl-pop-def' }, row.def),
      h('span', { class: 'gl-pop-links' }, links),
    );
    pop.setAttribute('aria-label', t('ui.guide.gloss.label', { term: row.title }));
    if (pop.previousElementSibling !== el) el.after(pop);
    pop.hidden = false;
    place();
  }

  /** @param {boolean} [now] @param {boolean} [refocus] */
  function hide(now = false, refocus = false) {
    clearTimeout(hideTimer);
    const run = () => {
      pop.hidden = true;
      if (cur) {
        cur.classList.remove('open');
        cur.setAttribute('aria-expanded', 'false');
        if (refocus) cur.focus();
      }
      cur = null;
    };
    if (now) run();
    else hideTimer = setTimeout(run, 180);
  }

  const termOf = (/** @type {EventTarget | null} */ x) => (x instanceof Element ? /** @type {HTMLElement | null} */ (x.closest('.gl-term')) : null);
  const inPop = (/** @type {EventTarget | null} */ x) => x instanceof Node && pop.contains(x);

  /** @type {[string, (e: any) => void][]} */
  const handlers = [
    ['mouseover', (e) => {
      const term = termOf(e.target);
      if (term) show(term);
      else if (inPop(e.target)) clearTimeout(hideTimer);
    }],
    ['mouseout', (e) => {
      if (termOf(e.target) || inPop(e.target)) {
        if (!(termOf(e.relatedTarget) === cur || inPop(e.relatedTarget))) hide();
      }
    }],
    ['focusin', (e) => {
      const term = termOf(e.target);
      if (term) show(term);
      else if (inPop(e.target)) clearTimeout(hideTimer);
    }],
    ['focusout', (e) => {
      if (!cur) return;
      if (termOf(e.target) === cur || inPop(e.target)) {
        if (!(termOf(e.relatedTarget) === cur || inPop(e.relatedTarget))) hide(true);
      }
    }],
    ['click', (e) => {
      const term = termOf(e.target);
      if (term) {
        if (cur === term && !pop.hidden) hide(true);
        else show(term);
        return;
      }
      if (inPop(e.target) && e.target instanceof Element && e.target.closest('a')) hide(true);
      else if (!inPop(e.target) && cur) hide(true);
    }],
    ['keydown', (e) => {
      if (e.key === 'Escape' && cur && !pop.hidden) {
        e.preventDefault();
        hide(true, true);
      } else if ((e.key === 'Enter' || e.key === ' ') && termOf(e.target)) {
        e.preventDefault();
        const term = /** @type {HTMLElement} */ (termOf(e.target));
        if (cur === term && !pop.hidden) hide(true);
        else show(term);
      }
    }],
  ];
  for (const [type, fn] of handlers) root.addEventListener(type, fn);
  const onScroll = () => place();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  return {
    el: pop,
    hide: () => hide(true),
    destroy() {
      for (const [type, fn] of handlers) root.removeEventListener(type, fn);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      clearTimeout(hideTimer);
    },
  };
}
