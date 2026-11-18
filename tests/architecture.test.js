// @ts-check
/**
 * Regola delle dipendenze (specifica tecnica, 2.3).
 * Legge le istruzioni import/export…from di ogni file in src/ e verifica:
 * - la tabella dei moduli ammessi;
 * - che fuori dal motore si importi solo da src/engine/index.js;
 * - che in src/ non ci siano dipendenze npm (nulla deve finire nel file distribuito);
 * - che nel motore non compaiano document, window, localStorage, fetch, Date, Math.random.
 */
import { describe, test, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/** Moduli che ciascun modulo può importare (tabella 2.3). */
const ALLOWED = {
  engine: ['engine'],
  i18n: [],
  storage: [],
  session: ['engine'],
  export: ['engine', 'i18n'],
  ui: ['engine', 'i18n', 'storage', 'session', 'export', 'styles', 'assets', 'guides'],
};

const FORBIDDEN_IN_ENGINE = ['document', 'window', 'localStorage', 'fetch', 'Date', 'Math.random'];

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.(js|mjs)$/.test(name) ? [p] : [];
  });
}

/** Toglie commenti e stringhe, per cercare identificatori solo nel codice. */
export function stripCommentsAndStrings(/** @type {string} */ code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1')
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '``')
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""');
}

/** Specificatori importati da un file (statici, dinamici, export…from). */
export function importsOf(/** @type {string} */ code) {
  const clean = code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
  const specs = [];
  const patterns = [
    /\bimport\s+(?:[\w*{}\s,]+?\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bexport\s+(?:\*|\{[^}]*\})\s*(?:as\s+\w+\s+)?from\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) for (const m of clean.matchAll(re)) specs.push(m[1]);
  return specs;
}

/** Primo livello sotto src/ (engine, i18n, ui…), o null se fuori da src. */
function moduleOf(/** @type {string} */ file) {
  const rel = relative(SRC, file);
  return rel.startsWith('..') ? null : rel.split(sep)[0];
}

const files = walk(SRC);

describe('architettura (2.3)', () => {
  test('ci sono file da controllare, a cominciare dal motore', () => {
    expect(files.some((f) => moduleOf(f) === 'engine')).toBe(true);
  });

  test('ogni import rispetta la tabella delle dipendenze', () => {
    const violations = [];
    for (const file of files) {
      const from = /** @type {string} */ (moduleOf(file));
      const allowed = /** @type {Record<string, string[]>} */ (ALLOWED)[from];
      for (const spec of importsOf(readFileSync(file, 'utf8'))) {
        const rel = relative(ROOT, file);
        if (!spec.startsWith('.') && !spec.startsWith('/')) {
          violations.push(`${rel}: dipendenza esterna "${spec}"`);
          continue;
        }
        const target = resolve(dirname(file), spec);
        const to = moduleOf(target);
        if (to === null) {
          violations.push(`${rel}: import fuori da src/ (${spec})`);
          continue;
        }
        if (to === from) continue;
        if (!allowed || !allowed.includes(to)) violations.push(`${rel}: ${from} non può importare da ${to}`);
        else if (to === 'engine' && target !== join(SRC, 'engine', 'index.js')) {
          violations.push(`${rel}: il motore si importa solo da engine/index.js (${spec})`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  test('nel motore nessun accesso a DOM, storage, rete, orologio o numeri casuali', () => {
    const found = [];
    for (const file of files.filter((f) => moduleOf(f) === 'engine')) {
      const code = stripCommentsAndStrings(readFileSync(file, 'utf8'));
      for (const name of FORBIDDEN_IN_ENGINE) {
        const re = new RegExp(`(?<![\\w$.])${name.replace('.', '\\s*\\.\\s*')}(?![\\w$])`);
        if (re.test(code)) found.push(`${relative(ROOT, file)}: ${name}`);
      }
    }
    expect(found).toEqual([]);
  });
});

describe('il controllo stesso funziona', () => {
  test('riconosce le forme di import', () => {
    const code = `import a from './a.js';\nimport { b, c } from "../b.js";\nimport './side.js';\nexport { d } from './d.js';\nexport * from './e.js';\nconst f = await import('./f.js');\n// import x from './commento.js'`;
    expect(importsOf(code)).toEqual(['./a.js', '../b.js', './side.js', './d.js', './e.js', './f.js']);
  });
  test('trova gli identificatori vietati nel codice ma non nei commenti o nelle stringhe', () => {
    const code = stripCommentsAndStrings(`// window\nconst s = 'document';\nconst t = Math.random();\n/* Date */`);
    expect(/(?<![\w$.])Math\s*\.\s*random(?![\w$])/.test(code)).toBe(true);
    expect(/(?<![\w$.])window(?![\w$])/.test(code)).toBe(false);
    expect(/(?<![\w$.])document(?![\w$])/.test(code)).toBe(false);
    expect(/(?<![\w$.])Date(?![\w$])/.test(code)).toBe(false);
  });
});
