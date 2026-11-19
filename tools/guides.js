// @ts-check
/**
 * Guide integrate (fase 6): il contenuto sta in `src/guides/<nome>/*.html`, frammenti in ordine di nome.
 * A ogni build (e con `npm run dev`) un plugin di Vite li inserisce nella pagina come
 * `<template id="guide-<nome>" data-guide>…</template>`: la vista delle guide clona il template,
 * il contenuto non passa per il JavaScript e `tools/size-check.js` ne misura il peso (riga "Guide").
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const GUIDES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'guides');

/** Guide integrate, nell'ordine delle sottoschede (router.js, SECTIONS.guide). */
export const GUIDE_NAMES = Object.freeze(['uso', 'subnetting']);

/**
 * File HTML di una guida, in ordine di nome.
 * @param {string} name
 * @param {string} [dir]
 */
export function guideFiles(name, dir = GUIDES_DIR) {
  const d = join(dir, name);
  return readdirSync(d).filter((f) => f.endsWith('.html')).sort().map((f) => join(d, f));
}

/**
 * Contenuto completo di una guida.
 * @param {string} name
 * @param {string} [dir]
 */
export function readGuide(name, dir = GUIDES_DIR) {
  return guideFiles(name, dir).map((f) => readFileSync(f, 'utf8').trim()).join('\n');
}

/**
 * Inserisce i template delle guide prima di `</body>`.
 * @param {string} html
 * @param {Record<string, string>} guides nome → contenuto
 */
export function injectGuides(html, guides) {
  for (const [name, content] of Object.entries(guides)) {
    if (/<\/template>/i.test(content)) throw new Error(`La guida "${name}" non può contenere </template>.`);
  }
  const templates = Object.entries(guides)
    .map(([name, content]) => `<template id="guide-${name}" data-guide>\n${content}\n</template>`)
    .join('\n');
  if (!html.includes('</body>')) throw new Error('index.html senza </body>.');
  return html.replace('</body>', `${templates}\n</body>`);
}

/**
 * Plugin di Vite: template delle guide nella pagina, ricarica completa quando cambia una guida.
 * @returns {import('vite').Plugin}
 */
export function guidesPlugin() {
  return {
    name: 'calcolatore-subnet-guides',
    transformIndexHtml(html) {
      return injectGuides(html, Object.fromEntries(GUIDE_NAMES.map((n) => [n, readGuide(n)])));
    },
    configureServer(server) {
      server.watcher.add(GUIDES_DIR);
      server.watcher.on('change', (file) => {
        if (file.startsWith(GUIDES_DIR) && file.endsWith('.html')) server.ws.send({ type: 'full-reload' });
      });
    },
  };
}
