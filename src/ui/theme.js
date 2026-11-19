// @ts-check
/**
 * Tema (specifica tecnica, 9.6): attributo `data-theme` su <html>.
 * Automatico = nessun attributo: le variabili seguono prefers-color-scheme e prefers-contrast (tokens.css).
 * In fase 4 il tema vive solo in memoria; con "Memorizza i dati" verrà salvato (fase 5).
 */
import { THEMES } from './state.js';

/**
 * Valore dell'attributo per un tema; `null` per Automatico o per un valore sconosciuto.
 * @param {string} theme
 * @returns {string | null}
 */
export function themeAttribute(theme) {
  return theme !== 'auto' && THEMES.includes(/** @type {any} */ (theme)) ? theme : null;
}

/**
 * Applica il tema al documento.
 * @param {HTMLElement} root di solito document.documentElement
 * @param {string} theme
 */
export function applyTheme(root, theme) {
  const attr = themeAttribute(theme);
  if (attr) root.setAttribute('data-theme', attr);
  else root.removeAttribute('data-theme');
}
