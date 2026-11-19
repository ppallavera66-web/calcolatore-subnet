// @ts-check
/**
 * Copia negli appunti (specifica tecnica, 5.2): `navigator.clipboard.writeText`, con ripiego su
 * un'area di testo nascosta ed `execCommand("copy")` (utile con la pagina aperta da disco in alcuni browser).
 * Verifica nei vari browser da file://: docs/verifiche-browser-fase5.md.
 */

/**
 * @param {string} text
 * @returns {Promise<boolean>} vero se la copia è riuscita
 */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // si prova il ripiego
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '-1000px';
  area.style.opacity = '0';
  const active = /** @type {HTMLElement | null} */ (document.activeElement);
  document.body.appendChild(area);
  area.select();
  let done = false;
  try {
    done = document.execCommand('copy');
  } catch {
    done = false;
  }
  area.remove();
  active?.focus({ preventScroll: true });
  return done;
}
