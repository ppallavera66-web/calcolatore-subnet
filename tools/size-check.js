// @ts-check
/**
 * Limite di peso del file unico (specifica tecnica, 2.4): dist/index.html al massimo 1 MB,
 * guide comprese. Stampa il peso per categoria: JS, CSS, font, guide, HTML.
 * Uso: node tools/size-check.js [percorso]   (oppure npm run size, dopo npm run build)
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const LIMIT = 1048576;

/**
 * Pesi in byte per categoria.
 * - font: dati base64 dei WOFF2 incorporati nel CSS (url(data:font/...));
 * - guide: contenuto degli elementi con l'attributo data-guide (fase 6);
 * - js e css: contenuto dei tag script e style, al netto dei font;
 * - html: tutto il resto.
 * @param {string} html
 */
export function measure(html) {
  const bytes = (/** @type {string} */ s) => Buffer.byteLength(s, 'utf8');
  const total = bytes(html);
  let js = 0;
  let css = 0;
  let font = 0;
  let guides = 0;
  for (const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) js += bytes(m[1]);
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    const fonts = [...m[1].matchAll(/url\(\s*["']?data:font\/[^)]*\)/gi)].reduce((a, f) => a + bytes(f[0]), 0);
    font += fonts;
    css += bytes(m[1]) - fonts;
  }
  for (const m of html.matchAll(/<(\w+)\b[^>]*\bdata-guide\b[^>]*>([\s\S]*?)<\/\1>/gi)) guides += bytes(m[2]);
  return { total, js, css, font, guides, html: total - js - css - font - guides };
}

const kb = (/** @type {number} */ n) => `${(n / 1024).toFixed(1).padStart(8)} KB`;

function main() {
  const file = resolve(process.argv[2] ?? 'dist/index.html');
  if (!existsSync(file)) {
    console.error(`File non trovato: ${file}. Esegui prima npm run build.`);
    process.exit(2);
  }
  const m = measure(readFileSync(file, 'utf8'));
  const pct = ((m.total / LIMIT) * 100).toFixed(1);
  console.log(`Peso di ${file}`);
  for (const [k, label] of [['js', 'JavaScript'], ['css', 'CSS'], ['font', 'Font'], ['guides', 'Guide'], ['html', 'HTML']]) {
    console.log(`  ${label.padEnd(11)}${kb(/** @type {any} */ (m)[k])}`);
  }
  console.log(`  ${'Totale'.padEnd(11)}${kb(m.total)}  (${m.total.toLocaleString('it-IT')} byte, ${pct}% del limite di 1 MB)`);
  if (m.total > LIMIT) {
    console.error(`Limite superato di ${(m.total - LIMIT).toLocaleString('it-IT')} byte.`);
    process.exit(1);
  }
  console.log('Entro il limite.');
}

if (import.meta.url === new URL(`file://${resolve(process.argv[1] ?? '')}`).href) main();
