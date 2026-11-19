// @ts-check
/**
 * Ancore delle guide (fase 6). Le rotte sono `#/guide/subnetting/<ancora>` e `#/guide/uso/<sezione>`.
 * Nella guida al subnetting l'ancora è l'id dell'elemento (`cap-9`, `app-a`, `gl-acl`); nella guida
 * all'uso l'id ha il prefisso `uso-` (`#/guide/uso/analisi` → `id="uso-analisi"`), così non si
 * confonde con gli id dell'interfaccia. Funzioni pure, provate in Node.
 */

/** Guida di una vista (`guide/uso` → `uso`). */
export const guideOf = (/** @type {string} */ view) => view.replace(/^guide\//, '');

/**
 * Id dell'elemento per un'ancora della rotta.
 * @param {string} guide `uso` o `subnetting`
 * @param {string} anchor
 */
export function anchorId(guide, anchor) {
  return guide === 'uso' ? `uso-${anchor}` : anchor;
}

/**
 * Ancora della rotta per l'id di un elemento; `null` se l'id non appartiene alla guida.
 * @param {string} guide
 * @param {string} id
 */
export function anchorOf(guide, id) {
  if (guide !== 'uso') return id;
  return id.startsWith('uso-') ? id.slice(4) : null;
}

/**
 * Sezioni della guida all'uso aperte dai pulsanti "?": una per ogni scheda di Calcola e Pianifica,
 * più Impostazioni (shell.js usa la scheda, o la sezione se non ha schede).
 * @param {Record<string, readonly string[]>} sections SECTIONS del router
 */
export function helpAnchors(sections) {
  return [...sections.calcola, ...sections.pianifica, 'impostazioni'];
}
