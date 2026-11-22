// @ts-check
/**
 * Guide integrate (fase 6): contenuto, collegamenti nei due sensi, tabelle confrontate con il motore.
 * - ogni ancora usata dall'app (capitoli dei passaggi e dei testi, pulsanti "?") esiste nelle guide;
 * - ogni collegamento delle guide porta a una vista esistente: le ancore delle guide esistono,
 *   i collegamenti "Apri nel calcolatore" hanno input validi per il motore e un metodo previsto;
 * - titoli dei capitoli dell'app (`ui.cap.*`) uguali ai titoli della guida;
 * - cheat sheet e tabelle host → prefisso uguali ai risultati del motore.
 * Il contenuto si legge come testo (Node, senza DOM), con espressioni regolari sul markup noto.
 */
import { describe, test, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readGuide, injectGuides, GUIDE_NAMES } from '../../tools/guides.js';
import { measure, LIMIT } from '../../tools/size-check.js';
import { parseHash, SECTIONS, VIEW_PARAMS, COMMON_PARAMS } from '../../src/ui/router.js';
import { entryFor } from '../../src/ui/history-map.js';
import { anchorId, anchorOf, guideOf, helpAnchors } from '../../src/ui/guide-anchors.js';
import { STRINGS, t } from '../../src/i18n/strings.it.js';
import {
  methodsFor, convertNumber, convertAddress, parsePrefixOrMask, maskOf, wildcardOf, toDotted, interestingOctet, analyze, prefixForHosts,
} from '../../src/engine/index.js';

const SRC = fileURLToPath(new URL('../../src/', import.meta.url));
const GUIDES = Object.fromEntries(GUIDE_NAMES.map((n) => [n, readGuide(n)]));

const decode = (/** @type {string} */ s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const ids = (/** @type {string} */ html) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const hrefs = (/** @type {string} */ html) => [...html.matchAll(/\shref="([^"]*)"/g)].map((m) => decode(m[1]));
const text = (/** @type {string} */ html) => decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

/** @param {string} dir @returns {string[]} */
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : /\.js$/.test(n) ? [join(dir, n)] : []));

/** Ancore `cap-N` citate nel codice di motore, testi e interfaccia (passaggi, avvisi, collegamenti). */
function chaptersUsedByApp() {
  const out = new Set();
  for (const dir of ['engine', 'i18n', 'ui', 'export']) {
    for (const f of walk(join(SRC, dir))) for (const m of readFileSync(f, 'utf8').matchAll(/\bcap-(\d+)\b/g)) out.add(`cap-${m[1]}`);
  }
  return [...out];
}

/** Funzione del motore per un collegamento verso una vista di calcolo, se gli input sono validi. */
function validInputs(/** @type {string} */ view, /** @type {Record<string, string>} */ p) {
  const inputs = (/** @type {Record<string, string[]>} */ (VIEW_PARAMS)[view] ?? []).filter((k) => p[k] !== undefined && k !== 'pg');
  if (!inputs.length) return { ok: true, fn: null };
  if (view === 'calcola/conversioni') {
    if (p.n !== undefined && !convertNumber(p.n, Number(p.b ?? 10)).ok) return { ok: false, fn: 'F02' };
    if (p.a !== undefined && !convertAddress(p.a).ok) return { ok: false, fn: 'F02' };
    if (p.pm !== undefined && !parsePrefixOrMask(p.pm).ok) return { ok: false, fn: 'F02' };
    return { ok: true, fn: 'F02' };
  }
  const e = entryFor(view, p);
  return { ok: e !== null, fn: e?.fn ?? null };
}

/** Funzione predefinita di una vista (per controllare `metodo` quando mancano gli input). */
const FN_OF_VIEW = /** @type {Record<string, string>} */ ({
  'calcola/analisi': 'F01', 'calcola/conversioni': 'F02', 'calcola/mask': 'F03', 'calcola/stessa': 'F07',
  'pianifica/inverso': 'F05', 'pianifica/suddivisione': 'F06',
});

describe('template delle guide nella pagina', () => {
  test('i template si inseriscono prima di </body>, uno per guida, con data-guide', () => {
    const out = injectGuides('<html><body><p>x</p></body></html>', { uso: '<p>a</p>', subnetting: '<p>b</p>' });
    expect(out).toMatch(/<p>x<\/p><template id="guide-uso" data-guide>\n<p>a<\/p>\n<\/template>\n<template id="guide-subnetting" data-guide>/);
    expect(out.endsWith('</template>\n</body></html>')).toBe(true);
  });
  test('una guida con </template> o una pagina senza </body> vengono rifiutate', () => {
    expect(() => injectGuides('<body></body>', { uso: '</template>' })).toThrow();
    expect(() => injectGuides('<p></p>', { uso: '' })).toThrow();
  });
  test('npm run size conta il contenuto dei template nella riga "Guide", entro il limite', () => {
    const page = injectGuides('<html><body><script>x</script></body></html>', GUIDES);
    const m = measure(page);
    const content = Object.values(GUIDES).reduce((a, g) => a + Buffer.byteLength(`\n${g}\n`, 'utf8'), 0);
    expect(m.guides).toBe(content);
    expect(m.guides).toBeLessThan(LIMIT / 4);
  });
  test('le guide sono quelle delle sottoschede di Guide', () => {
    expect([...GUIDE_NAMES]).toEqual([...SECTIONS.guide]);
  });
});

describe('contenuto delle guide', () => {
  test.each(GUIDE_NAMES)('%s: niente script, risorse esterne, stili incorporati o widget della v0.3', (name) => {
    const html = GUIDES[name];
    expect(html).not.toMatch(/<script|<link|<iframe|<img|\ssrc=|<style|class="widget"|<input|<button/i);
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toMatch(/\son[a-z]+=/i);
  });
  test('gli id sono unici in tutta la pagina (le due guide stanno nello stesso documento)', () => {
    const all = [...ids(GUIDES.uso), ...ids(GUIDES.subnetting)];
    const dup = all.filter((x, i) => all.indexOf(x) !== i);
    expect(dup).toEqual([]);
    expect(ids(GUIDES.uso).every((x) => x.startsWith('uso-'))).toBe(true);
  });
  test('i titoli usano h2, h3 e h4, senza salti (h1 è il titolo della schermata)', () => {
    for (const html of Object.values(GUIDES)) {
      expect(html).not.toMatch(/<h1|<h5|<h6/);
    }
  });
  test('la guida al subnetting è la v0.5 e non ha più i widget interni (difetto n. 6)', () => {
    expect(GUIDES.subnetting).toMatch(/v0\.5/);
    expect(GUIDES.subnetting).not.toMatch(/v0\.4/);
    expect(GUIDES.subnetting).not.toMatch(/w-bits|w-sub|w-train|w-inv|w-same|function analyze/);
    expect(GUIDES.subnetting).not.toMatch(/saranno sostituiti/);
  });

  test('guida all\'uso: ogni nome di pulsante, campo o scheda citato esiste tale e quale nell\'interfaccia', () => {
    // eccezioni: il pulsante "?" è un'icona, "Indietro" è il tasto del browser, "Capitolo N" è un modello
    const allowed = new Set(['?', 'Indietro', 'Capitolo N']);
    const texts = new Set(Object.values(STRINGS).filter((v) => typeof v === 'string'));
    const names = [...GUIDES.uso.matchAll(/<span class="ui">([\s\S]*?)<\/span>/g)].map((m) => text(m[1]));
    expect(names.length).toBeGreaterThan(30);
    const missing = [...new Set(names)].filter((n) => !allowed.has(n) && !n.split(' · ').every((part) => texts.has(part)));
    expect(missing).toEqual([]);
  });

  test('revisione C16: la guida al subnetting è una "versione di studio", senza "da revisionare"', () => {
    expect(GUIDES.subnetting).not.toMatch(/revisionare/i);
    expect(GUIDES.subnetting).toMatch(/v0\.5 · VERSIONE DI STUDIO/);
    expect(GUIDES.subnetting).toMatch(/v0\.5, versione di studio/);
  });
});

describe('fase 9: guida al subnetting v0.5', () => {
  const sub = text(GUIDES.subnetting);
  const appC = GUIDES.subnetting.slice(GUIDES.subnetting.indexOf('id="app-c"'), GUIDES.subnetting.indexOf('<footer'));

  test('G1: l\'apertura non promette come già presenti VLSM e summarization', () => {
    expect(sub).not.toMatch(/Ogni metodo descritto qui è una funzione del calcolatore/);
    expect(sub).toMatch(/Il pianificatore VLSM e la summarization arriveranno con la versione 2/);
  });

  test('I2/G2: gateway fuori dalla subnet descritto allo stesso modo nell\'avviso dell\'app e nei cap. 15 e 18', () => {
    const core = 'rifiutata oppure accettata con risultati imprevedibili';
    expect(t('W_GATEWAY_OUTSIDE', { gateway: '192.168.1.1', host: 'b', network: '192.168.1.128', prefix: 25 })).toContain(core);
    const chap = (/** @type {string} */ id) => text(GUIDES.subnetting.split(/<section class="chap/).find((c) => c.includes(`id="${id}"`)) ?? '');
    expect(chap('cap-15')).toContain(core);
    expect(chap('cap-18')).toContain(core);
    expect(sub).not.toMatch(/spesso la configurazione viene accettata/);
  });

  test('G6: appendice C "Il calcolatore e la guida", con le schede dell\'app e senza identificativi interni né decisioni di progetto', () => {
    expect(appC).toMatch(/<h3><span class="num">C<\/span>Il calcolatore e la guida<\/h3>/);
    expect(appC).not.toMatch(/\bF\d\d\b|Decisioni prese|specifiche di progetto|calcolatori esistenti/);
    const links = hrefs(appC);
    for (const view of ['#/calcola/analisi', '#/calcola/conversioni', '#/calcola/mask', '#/calcola/stessa', '#/pianifica/inverso', '#/pianifica/suddivisione', '#/guide/uso']) {
      expect(links).toContain(view);
    }
    expect(text(appC)).toMatch(/versione 2.*versione 3/);
  });
});

describe('fase 9: guida all\'uso', () => {
  test('U1: "Browser e apertura da disco" dice solo quello che è stato provato (Chrome sul computer)', () => {
    const sec = text(GUIDES.uso.slice(GUIDES.uso.indexOf('id="uso-browser"')));
    expect(sec).toMatch(/finora è stato provato in Chrome sul computer/);
    expect(sec).not.toMatch(/funziona nelle ultime versioni|prove da disco in corso|tutte le funzioni sono disponibili/);
    expect(sec).toMatch(/Edge, Firefox, Safari\s*non ancora provati/);
  });
  test('U2: nel calcolo inverso la scorta è di host, come nell\'app', () => {
    expect(text(GUIDES.uso)).not.toMatch(/indirizzi di scorta/);
    expect(text(GUIDES.uso)).toMatch(/host di scorta/);
  });
});

describe('collegamenti dall\'app verso le guide', () => {
  const subIds = new Set(ids(GUIDES.subnetting));
  const usoIds = new Set(ids(GUIDES.uso));

  test('ogni capitolo citato da passaggi, testi e interfaccia esiste nella guida al subnetting', () => {
    const used = chaptersUsedByApp();
    expect(used.length).toBeGreaterThanOrEqual(19);
    expect(used.filter((c) => !subIds.has(c))).toEqual([]);
  });

  test('ogni metodo dei passaggi rimanda a un capitolo esistente', async () => {
    const { METHODS } = await import('../../src/engine/index.js');
    for (const methods of Object.values(METHODS)) for (const ch of Object.values(methods)) expect(subIds.has(ch)).toBe(true);
  });

  test('ogni pulsante "?" ha la sua sezione nella guida all\'uso', () => {
    const anchors = helpAnchors(SECTIONS);
    expect(anchors).toEqual(['analisi', 'conversioni', 'mask', 'stessa', 'inverso', 'suddivisione', 'piani', 'impostazioni']);
    expect(anchors.filter((a) => !usoIds.has(anchorId('uso', a)))).toEqual([]);
  });

  test('i titoli dei capitoli dell\'app coincidono con quelli della guida, e viceversa', () => {
    const sections = [...GUIDES.subnetting.matchAll(/<section class="chap[^"]*" id="(cap-\d+)">\s*<h3><span class="num">\d+<\/span>([^<]+)<\/h3>/g)];
    expect(sections.length).toBe(19);
    for (const [, id, title] of sections) expect(t(`ui.cap.${id}`)).toBe(decode(title).trim());
    const appKeys = Object.keys(STRINGS).filter((k) => k.startsWith('ui.cap.'));
    expect(appKeys.sort()).toEqual(sections.map((s) => `ui.cap.${s[1]}`).sort());
  });
});

describe('collegamenti dalle guide', () => {
  const all = GUIDE_NAMES.flatMap((name) => hrefs(GUIDES[name]).map((href) => ({ name, href })));
  const idsOf = /** @type {Record<string, Set<string>>} */ (Object.fromEntries(GUIDE_NAMES.map((n) => [n, new Set(ids(GUIDES[n]))])));

  test('tutti i collegamenti sono rotte dell\'app, scritte in forma canonica', () => {
    expect(all.length).toBeGreaterThan(100);
    for (const { href } of all) {
      expect(href.startsWith('#/'), href).toBe(true);
      expect(parseHash(href).canonical, href).toBe(true);
    }
  });

  test('i collegamenti verso le guide arrivano a un\'ancora esistente', () => {
    const bad = [];
    for (const { href } of all) {
      const { route } = parseHash(href);
      if (route.section !== 'guide' || !route.anchor) continue;
      const guide = guideOf(route.view);
      if (!idsOf[guide].has(anchorId(guide, route.anchor))) bad.push(href);
    }
    expect(bad).toEqual([]);
  });

  test('ogni sezione della guida all\'uso è raggiungibile con una rotta (anchorOf inverso di anchorId)', () => {
    for (const id of ids(GUIDES.uso)) {
      const a = anchorOf('uso', id);
      expect(a).not.toBeNull();
      expect(anchorId('uso', /** @type {string} */ (a))).toBe(id);
    }
    expect(anchorOf('uso', 'cap-1')).toBeNull();
    expect(anchorOf('subnetting', 'cap-1')).toBe('cap-1');
  });

  test('"Apri nel calcolatore": input validi per il motore, did=1 e metodo previsto per la funzione', () => {
    const calc = all.filter(({ href }) => /^#\/(calcola|pianifica)\//.test(href));
    expect(calc.length).toBeGreaterThanOrEqual(40);
    const bad = [];
    for (const { href } of calc) {
      const { route } = parseHash(href);
      const { ok, fn } = validInputs(route.view, route.params);
      if (!ok) bad.push(`${href}: input non validi`);
      if (route.params.did !== undefined && route.params.did !== '1') bad.push(`${href}: did`);
      if (route.params.metodo !== undefined) {
        const f = fn ?? FN_OF_VIEW[route.view];
        if (!methodsFor(f).includes(route.params.metodo)) bad.push(`${href}: metodo ${route.params.metodo} non previsto per ${f}`);
      }
      for (const k of Object.keys(route.params)) {
        if (![...(/** @type {Record<string, string[]>} */ (VIEW_PARAMS)[route.view]), ...COMMON_PARAMS].includes(k)) bad.push(`${href}: parametro ${k}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('ogni capitolo da 2 a 18 con esempi di calcolo ha almeno un collegamento "Apri nel calcolatore"', () => {
    const chapters = GUIDES.subnetting.split(/<section class="chap/).slice(1);
    const withLinks = chapters.filter((c) => /href="#\/(calcola|pianifica)\//.test(c)).map((c) => (c.match(/id="([^"]+)"/) ?? [])[1]);
    for (const ch of ['cap-2', 'cap-3', 'cap-4', 'cap-6', 'cap-7', 'cap-8', 'cap-9', 'cap-11', 'cap-12', 'cap-13', 'cap-14', 'cap-15', 'cap-16', 'cap-17', 'cap-18']) {
      expect(withLinks).toContain(ch);
    }
  });
});

describe('glossario', () => {
  const rows = [...GUIDES.subnetting.matchAll(/<tr id="(gl-[a-z]+)" data-terms="([^"]+)"(?: data-case="1")? data-ref="([^"]*)"><td><strong>[^<]+<\/strong><\/td><td id="([^"]+)">/g)];
  const subIds = new Set(ids(GUIDES.subnetting));

  test('32 voci, ognuna con la cella della definizione (descrive il termine nel testo)', () => {
    expect(rows.length).toBe(32);
    for (const [, id, , , defId] of rows) expect(defId).toBe(`${id}-def`);
  });
  test('il capitolo di rimando esiste', () => {
    for (const [, , , ref] of rows) if (ref) expect(subIds.has(ref)).toBe(true);
  });
});

describe('tabelle della guida uguali ai risultati del motore', () => {
  const fmt = (/** @type {number} */ n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const an = (/** @type {number} */ p) => /** @type {any} */ (analyze(0, p)).value;
  const ord = ['1°', '2°', '3°', '4°'];
  /** Righe (celle in testo) della tabella con data-check="…". */
  const tableRows = (/** @type {string} */ key) => [...GUIDES.subnetting.matchAll(new RegExp(`<table data-check="${key}">([\\s\\S]*?)</table>`, 'g'))]
    .flatMap((m) => [...m[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((r) => [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => text(c[1]))))
    .filter((r) => r.length);

  test('cheat sheet: mask, wildcard, M · ottetto, indirizzi e host da /0 a /32', () => {
    const rows = tableRows('cheat-sheet');
    // dalla v1.1 anche /0–/7, con la convenzione di /0 (M = 256 nel 1° ottetto)
    expect(rows.map((r) => r[0])).toEqual(Array.from({ length: 33 }, (_, p) => `/${p}`));
    for (const [cidr, mask, wild, m, addrs, hosts] of rows) {
      const p = Number(cidr.slice(1));
      const a = an(p);
      const io = interestingOctet(p);
      expect(mask, cidr).toBe(toDotted(maskOf(p)));
      expect(wild, cidr).toBe(toDotted(wildcardOf(p)));
      expect(m, cidr).toBe(`${io.magic} · ${ord[io.index]}`);
      expect(addrs, cidr).toBe(fmt(a.totalAddresses));
      expect(hosts.replace(' (p2p)', ''), cidr).toBe(fmt(a.usableHosts));
    }
  });

  test.each(['hosts-prefix-mask', 'hosts-prefix-mask-available'])('host richiesti → prefisso (%s): ogni fascia coincide con il calcolo inverso', (key) => {
    const rows = tableRows(key);
    expect(rows.length).toBe(15);
    for (const [range, cidr, mask, available] of rows) {
      const [lo, hi] = range.split('–').map((x) => Number(x.trim().replace(/\./g, '')));
      const p = Number(cidr.slice(1));
      const at = (/** @type {number} */ n) => /** @type {any} */ (prefixForHosts(n)).value.prefix;
      expect(at(lo), range).toBe(p);
      expect(at(hi), range).toBe(p);
      if (p > 0) expect(at(hi + 1), range).toBe(p - 1);
      expect(mask, range).toBe(toDotted(maskOf(p)));
      if (available !== undefined) expect(available, range).toBe(fmt(an(p).usableHosts));
    }
  });
});
