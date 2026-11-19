// @ts-check
/**
 * Avvio dell'interfaccia (fase 4): stili, stato, router, tema, guscio, viste, cronologia,
 * annunci per i lettori di schermo, stampa. Sostituisce il guscio di collaudo della fase 3.
 */
import '../styles/fonts.css';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/print.css';

import { h, replace, debounce, reducedMotion } from './dom.js';
import { icon } from './icons.js';
import { createStore, initialState, setInputs, addHistory, newId } from './state.js';
import { createRouter, routeTo, buildHash } from './router.js';
import { applyTheme } from './theme.js';
import { copyText } from './clipboard.js';
import { createShell } from './shell.js';
import { openHistoryPanel } from './components/history-panel.js';
import { dateTime } from './format.js';
import { VIEWS } from './views/index.js';
import { t } from '../i18n/strings.it.js';

const store = createStore(initialState());

// ---------------------------------------------------------------- annunci e messaggi brevi (9.4, 9.7)
const live = h('div', { class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });
const toastEl = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
/** L'ultimo annuncio vince: mentre si scrive non si legge ogni risultato intermedio. */
const announce = debounce((/** @type {string} */ text) => {
  live.textContent = '';
  setTimeout(() => {
    live.textContent = text;
  }, 40);
}, 700);
/** @type {ReturnType<typeof setTimeout> | undefined} */
let toastTimer;
function toast(/** @type {string} */ text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
}

// ---------------------------------------------------------------- cronologia: si registra dopo 2 s di calma, o subito con Invio
/** @param {{ fn: string, input: Record<string, any> }} entry */
function commitHistory(entry) {
  store.set((s) => addHistory(s, entry, { id: newId(crypto.getRandomValues(new Uint8Array(12))), now: new Date().toISOString() }));
}
const recordLater = debounce(commitHistory, 2000);

/** @type {import('./types.js').View | null} */
let view = null;
let viewName = '';

/** @type {import('./types.js').Ctx} */
const ctx = {
  store,
  route: () => router.current(),
  setParams(name, params) {
    store.set((s) => setInputs(s, name, params));
    router.navigate(routeTo(name, params), { replace: true });
  },
  go(name, params, anchor = null) {
    router.navigate(routeTo(name, params ?? store.get().inputs[name] ?? {}, anchor));
  },
  href: (name, params = {}, anchor = null) => buildHash(routeTo(name, params, anchor)),
  announce,
  toast(text) {
    toast(text);
  },
  async copy(text, what) {
    const ok = await copyText(text);
    toast(ok ? t('ui.copied', { text: text.length > 60 ? `${what}` : text }) : t('ui.copyFailed'));
  },
  record(entry, now = false) {
    if (!entry) return recordLater.cancel();
    if (now) {
      recordLater.cancel();
      commitHistory(entry);
    } else recordLater(entry);
  },
  openHistory: () => openHistoryPanel(ctx),
  print() {
    window.print();
  },
};

// ---------------------------------------------------------------- guscio
const shell = createShell(ctx, {
  version: __APP_VERSION__,
  focusMain: () => shell.title.focus(),
});

const toTop = h('button', { type: 'button', class: 'to-top', 'aria-label': t('ui.toTop'), title: t('ui.toTop') }, icon('up'));
toTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
  shell.title.focus({ preventScroll: true });
});
const updateToTop = () => toTop.classList.toggle('show', window.scrollY > 400);
window.addEventListener('scroll', updateToTop, { passive: true });

document.body.replaceChildren(shell.skip, shell.root, live, toastEl, toTop);

// ---------------------------------------------------------------- tema
applyTheme(document.documentElement, store.get().settings.theme);
store.subscribe((s, prev) => {
  if (s.settings.theme !== prev.settings.theme) applyTheme(document.documentElement, s.settings.theme);
  if (s.inputs !== prev.inputs) shell.refreshLinks();
});

// ---------------------------------------------------------------- stampa (9.9): intestazione con vista, input e data
function fillPrintHead() {
  const route = router.current();
  const lines = view?.printInputs?.() ?? [];
  replace(
    shell.printHead,
    h('p', { class: 'print-app' }, `${t('ui.app.name')} · ${t(`ui.title.${route.view}`)}`),
    lines.length ? h('p', { class: 'print-inputs mono' }, lines.join(' · ')) : null,
    h('p', { class: 'print-date' }, t('ui.print.date', { date: dateTime(new Date().toISOString()) })),
  );
}
window.addEventListener('beforeprint', () => {
  fillPrintHead();
  // i riquadri richiudibili si aprono in stampa e si richiudono dopo (come nella guida)
  document.querySelectorAll('details:not([open])').forEach((d) => {
    /** @type {HTMLDetailsElement} */ (d).dataset.printOpen = '1';
    /** @type {HTMLDetailsElement} */ (d).open = true;
  });
});
window.addEventListener('afterprint', () => {
  document.querySelectorAll('details[data-print-open]').forEach((d) => {
    /** @type {HTMLDetailsElement} */ (d).open = false;
    delete (/** @type {HTMLDetailsElement} */ (d).dataset.printOpen);
  });
});

// ---------------------------------------------------------------- navigazione
/**
 * @param {import('./types.js').Route} route
 * @param {{ initial: boolean }} info
 */
function onRoute(route, info) {
  store.set((s) => setInputs(s, route.view, route.params));
  shell.setRoute(route);
  if (route.view !== viewName) {
    recordLater.flush();
    view?.destroy?.();
    const next = VIEWS[route.view](ctx, route);
    view = next;
    viewName = route.view;
    shell.viewHost.replaceChildren(next.el);
    if (!info.initial) {
      window.scrollTo({ top: 0 });
      shell.title.focus({ preventScroll: true });
    }
  } else {
    view?.update?.(route);
  }
  updateToTop();
}

const router = createRouter(window, onRoute);
router.start();
