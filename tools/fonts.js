// @ts-check
/**
 * Copia dei font IBM Plex incorporati nell'app (specifica tecnica, decisione D3).
 *
 * Sei pesi: Sans 400/600, Mono 400/600, Sans Condensed 600/700 (corsivo simulato dal browser).
 * Per ogni peso due sottoinsiemi distribuiti da IBM così come sono, senza modifiche:
 * - Latin1: latino di base e Latin-1 (accentate italiane), − × ÷ … – ·;
 * - Pi: frecce, apici (2⁶), ≤ ≥, ✓.
 * Usare i file di IBM senza modificarli evita il problema del nome riservato "Plex"
 * della SIL Open Font License 1.1 (un sottoinsieme creato da noi sarebbe una versione modificata).
 *
 * Sorgente: i pacchetti npm ufficiali di IBM.
 *
 *   mkdir /tmp/plex && cd /tmp/plex
 *   npm pack @ibm/plex-sans @ibm/plex-mono @ibm/plex-sans-condensed
 *   for f in *.tgz; do mkdir "${f%.tgz}" && tar -xzf "$f" -C "${f%.tgz}"; done
 *   cd -  &&  node tools/fonts.js /tmp/plex
 *
 * I file copiati si salvano nel repository: lo script serve solo per rigenerarli
 * (per esempio con una nuova versione di Plex). Gli intervalli unicode-range in
 * src/styles/fonts.css sono quelli dei CSS di IBM per Latin1 e Pi.
 */
import { copyFileSync, mkdirSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src', 'assets', 'fonts');

/** [pacchetto, prefisso del file IBM, nome di uscita] */
const FONTS = [
  ['plex-sans', 'IBMPlexSans-Regular', 'ibm-plex-sans-400'],
  ['plex-sans', 'IBMPlexSans-SemiBold', 'ibm-plex-sans-600'],
  ['plex-mono', 'IBMPlexMono-Regular', 'ibm-plex-mono-400'],
  ['plex-mono', 'IBMPlexMono-SemiBold', 'ibm-plex-mono-600'],
  ['plex-sans-condensed', 'IBMPlexSansCondensed-SemiBold', 'ibm-plex-sans-condensed-600'],
  ['plex-sans-condensed', 'IBMPlexSansCondensed-Bold', 'ibm-plex-sans-condensed-700'],
];
const SUBSETS = [
  ['Latin1', 'latin1'],
  ['Pi', 'pi'],
];

/**
 * Cartella `fonts/split/woff2` del pacchetto estratto (qualunque versione).
 * @param {string} base
 * @param {string} pkg
 */
function splitDir(base, pkg) {
  // ibm-plex-sans-2.0.0, ma non ibm-plex-sans-condensed-3.0.0 quando si cerca plex-sans
  const re = new RegExp(`^ibm-${pkg}-\\d`);
  const dir = readdirSync(base).filter((d) => re.test(d) && statSync(join(base, d)).isDirectory()).sort().pop();
  if (!dir) throw new Error(`Pacchetto @ibm/${pkg} non trovato in ${base}`);
  return join(base, dir, 'package', 'fonts', 'split', 'woff2');
}

function main() {
  const base = process.argv[2];
  if (!base || !existsSync(base)) {
    console.error('Uso: node tools/fonts.js <cartella con i pacchetti @ibm/plex-* estratti>');
    process.exit(2);
  }
  mkdirSync(OUT, { recursive: true });
  let total = 0;
  for (const [pkg, ibm, out] of FONTS) {
    const dir = splitDir(base, pkg);
    for (const [subset, suffix] of SUBSETS) {
      const src = join(dir, `${ibm}-${subset}.woff2`);
      const dest = join(OUT, `${out}-${suffix}.woff2`);
      copyFileSync(src, dest);
      const size = statSync(dest).size;
      total += size;
      console.log(`${`${out}-${suffix}.woff2`.padEnd(40)}${size.toLocaleString('it-IT').padStart(8)} byte`);
    }
  }
  console.log(`${'Totale'.padEnd(40)}${total.toLocaleString('it-IT').padStart(8)} byte`);
  console.log('Ricorda di copiare anche la licenza: package/LICENSE.txt → src/assets/fonts/OFL.txt');
}

main();
