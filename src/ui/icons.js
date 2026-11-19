// @ts-check
/**
 * Icone SVG in linea (tratto 1,75 px, colore del testo). Sempre decorative (`aria-hidden`):
 * ogni pulsante ha anche un'etichetta testuale o `aria-label`.
 * Disegni originali, a griglia 24×24.
 */
const PATHS = {
  calcola: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 6h8v3H8zM8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01',
  pianifica: 'M3 4h18v4H3zM3 10h8v4H3zM13 10h8v4h-8zM3 16h5v4H3zM10 16h4v4h-4zM16 16h5v4h-5z',
  guide: 'M4 4.5A1.5 1.5 0 0 1 5.5 3H11v17H5.5A1.5 1.5 0 0 1 4 18.5zM20 4.5A1.5 1.5 0 0 0 18.5 3H13v17h5.5a1.5 1.5 0 0 0 1.5-1.5z',
  impostazioni: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
  copy: 'M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  check: 'M4 12.5l5 5L20 6.5',
  history: 'M3.5 12a8.5 8.5 0 1 0 2.5-6M3.5 3.5V8H8M12 7.5V12l3 2',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.2a2.6 2.6 0 0 1 5 .8c0 1.8-2.5 2.2-2.5 3.8M12 17h.01',
  up: 'M12 19V5M6 11l6-6 6 6',
  chevron: 'M9 6l6 6-6 6',
  close: 'M6 6l12 12M18 6L6 18',
  export: 'M12 3v12M7 8l5-5 5 5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5',
  import: 'M12 15V3M7 10l5 5 5-5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5',
  save: 'M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 3v5h7V3M8 21v-7h8v7',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  print: 'M7 9V3h10v6M7 17H5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2M7 14h10v7H7z',
  minus: 'M6 12h12',
  plus: 'M12 6v12M6 12h12',
  first: 'M17 6l-6 6 6 6M7 6v12',
  prev: 'M15 6l-6 6 6 6',
  next: 'M9 6l6 6-6 6',
  last: 'M7 6l6 6-6 6M17 6v12',
  warn: 'M12 3.5l9.5 16.5h-19zM12 10v4.5M12 17.5h.01',
  link: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
};

/** @typedef {keyof typeof PATHS} IconName */

const NS = 'http://www.w3.org/2000/svg';

/**
 * @param {IconName} name
 * @param {{ size?: number, class?: string }} [opts]
 * @returns {SVGSVGElement}
 */
export function icon(name, opts = {}) {
  const size = opts.size ?? 20;
  const svg = /** @type {SVGSVGElement} */ (document.createElementNS(NS, 'svg'));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', `icon${opts.class ? ` ${opts.class}` : ''}`);
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', PATHS[name]);
  svg.appendChild(path);
  return svg;
}
