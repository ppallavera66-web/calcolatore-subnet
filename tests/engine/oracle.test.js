// @ts-check
/**
 * Confronto con l'oracolo indipendente (tools/oracle.py, modulo ipaddress di Python).
 * Criterio di uscita della fase 3: zero differenze.
 */
import { describe, test, expect, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  analyze, maskOf, wildcardOf, toDotted, convertAddress, validateMaskValue, prefixForHosts, prefixForSubnets,
  subdivide, subnetAt, indexOf, sameSubnet, classify, snippets,
} from '../../src/engine/index.js';

const load = (/** @type {string} */ name) => JSON.parse(readFileSync(fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url)), 'utf8'));
const F01 = load('oracle-f01.json');
const MISC = load('oracle-misc.json');

/** Riepilogo stampato a fine esecuzione: casi confrontati e differenze per gruppo. */
/** @type {Record<string, { cases: number, diffs: number }>} */
const summary = {};

/**
 * @param {string} group
 * @param {Iterable<any>} cases
 * @param {(c: any) => string | null} check restituisce la descrizione della differenza, o null
 */
function compare(group, cases, check) {
  const diffs = [];
  let n = 0;
  for (const c of cases) {
    n++;
    const d = check(c);
    if (d !== null) diffs.push(d);
  }
  summary[group] = { cases: n, diffs: diffs.length };
  expect(diffs.slice(0, 10), `${diffs.length} differenze su ${n} casi`).toEqual([]);
  expect(n).toBeGreaterThan(0);
}

afterAll(() => {
  const total = Object.values(summary).reduce((a, s) => ({ cases: a.cases + s.cases, diffs: a.diffs + s.diffs }), { cases: 0, diffs: 0 });
  const lines = Object.entries(summary).map(([g, s]) => `  ${g.padEnd(28)} ${String(s.cases).padStart(7)} casi  ${s.diffs} differenze`);
  console.log(`\nOracolo Python (ipaddress)\n${lines.join('\n')}\n  ${'TOTALE'.padEnd(28)} ${String(total.cases).padStart(7)} casi  ${total.diffs} differenze\n`);
});

describe('oracolo · F01 su tutti i prefissi 0–32', () => {
  test('tabella dei prefissi: mask, wildcard, indirizzi, host', () => {
    compare('F01 tabella /0–/32', F01.prefixes, ([p, mask, wildcard, total, usable]) => {
      const r = analyze(0, p);
      const got = [toDotted(maskOf(p)), toDotted(wildcardOf(p)), r.ok && r.value.totalAddresses, r.ok && r.value.usableHosts];
      return JSON.stringify(got) === JSON.stringify([mask, wildcard, total, usable]) ? null : `/${p}: ${JSON.stringify(got)}`;
    });
  });

  test('rete, broadcast, primo e ultimo host', () => {
    /** @type {any[]} */
    const cases = [];
    for (const row of F01.rows) for (let p = 0; p <= 32; p++) cases.push([row[0], p, row.slice(1 + 4 * p, 5 + 4 * p)]);
    compare('F01 IP × prefisso', cases, ([ip, p, exp]) => {
      const r = analyze(ip, p);
      if (!r.ok) return `${toDotted(ip)}/${p}: errore`;
      const v = r.value;
      const got = [v.network, v.broadcast, v.firstHost, v.lastHost];
      return JSON.stringify(got) === JSON.stringify(exp) ? null : `${toDotted(ip)}/${p}: ${JSON.stringify(got)} ≠ ${JSON.stringify(exp)}`;
    });
  });
});

describe('oracolo · altre funzioni', () => {
  test('F02 · rappresentazioni dell\'indirizzo', () => {
    compare('F02 indirizzi', MISC.addresses, ([ip, dotted, bin, hex, hex32]) => {
      const r = convertAddress(dotted);
      if (!r.ok) return `${dotted}: errore`;
      const v = r.value;
      return v.uint32 === ip && v.binaryDotted === bin && v.hexDotted === hex && v.hex32 === hex32 ? null : `${dotted}: ${JSON.stringify(v)}`;
    });
  });

  test('F03 · validità e prefisso delle mask', () => {
    compare('F03 mask', MISC.masks, ([m, prefix]) => {
      const v = validateMaskValue(m).value;
      return v.valid === (prefix !== null) && v.prefix === prefix ? null : `${toDotted(m)}: ${v.valid}/${v.prefix} ≠ ${prefix}`;
    });
  });

  test('F03 · motivo, suggerimenti e avviso di wildcard (revisione A11)', () => {
    compare('F03 motivo e suggerimenti', MISC.masks, ([m, , reason, suggested, wildcardPrefix]) => {
      const r = validateMaskValue(m);
      const v = r.value;
      const gotReason = v.reason ? [v.reason.code, v.reason.params.index] : null;
      const gotSuggested = v.suggestions.map((s) => s.prefix);
      const w = r.warnings.find((x) => x.code === 'W_LOOKS_LIKE_WILDCARD');
      const gotWildcard = w ? w.params.prefix : null;
      const got = [gotReason, gotSuggested, gotWildcard];
      const exp = [reason, suggested, wildcardPrefix];
      return JSON.stringify(got) === JSON.stringify(exp) ? null : `${toDotted(m)}: ${JSON.stringify(got)} ≠ ${JSON.stringify(exp)}`;
    });
  });

  test('F01 · offset, ruolo e reti adiacenti (revisione A11)', () => {
    compare('F01 offset, ruolo, adiacenti', MISC.f01extra, ([ipv, p, offset, role, prev, next]) => {
      const r = analyze(ipv, p);
      if (!r.ok) return `${toDotted(ipv)}/${p}: errore`;
      const v = r.value;
      const got = [v.offset, v.role, v.previousNetwork, v.nextNetwork];
      const exp = [offset, role, prev, next];
      return JSON.stringify(got) === JSON.stringify(exp) ? null : `${toDotted(ipv)}/${p}: ${JSON.stringify(got)} ≠ ${JSON.stringify(exp)}`;
    });
  });

  test('F05 · host richiesti → prefisso', () => {
    compare('F05 host → prefisso', MISC.hosts, ([n, p]) => {
      const r = prefixForHosts(n);
      return r.ok && r.value.prefix === p ? null : `${n} host: ${r.ok ? r.value.prefix : 'errore'} ≠ ${p}`;
    });
  });

  test('F05 · subnet richieste → prefisso', () => {
    compare('F05 subnet → prefisso', MISC.subnets, ([block, s, p]) => {
      const r = prefixForSubnets(block, s);
      const got = r.ok ? r.value.newPrefix : r.error.code === 'SUBNETS_TOO_MANY' ? null : 'errore';
      return got === p ? null : `/${block} con ${s}: ${got} ≠ ${p}`;
    });
  });

  test('F06 · suddivisione, subnetAt e indexOf', () => {
    compare('F06 suddivisioni', MISC.subdivisions, (c) => {
      const r = subdivide(c.ip, c.block, c.newPrefix, { limit: 3 });
      if (!r.ok) return `${c.ip}/${c.block}→${c.newPrefix}: errore`;
      const v = r.value;
      const first = v.page.items.map((s) => s.network);
      const last = subnetAt(c.network, c.block, c.newPrefix, c.count - 1)?.network;
      const at = subnetAt(c.network, c.block, c.newPrefix, c.index)?.network;
      const idx = indexOf(c.network, c.block, c.newPrefix, c.inside);
      const ok =
        v.block.network === c.network && v.count === c.count && JSON.stringify(first) === JSON.stringify(c.first) &&
        last === c.last && at === c.atIndex && idx === c.indexOfInside;
      return ok ? null : `${toDotted(c.ip)}/${c.block}→/${c.newPrefix}`;
    });
  });

  test('F07 · verdetto, anche con prefissi diversi', () => {
    compare('F07 stessa subnet', MISC.same, ([a, pa, b, pb, verdict]) => {
      const r = sameSubnet({ a, prefixA: pa, b, prefixB: pb });
      return r.ok && r.value.verdict === verdict ? null : `${toDotted(a)}/${pa} ${toDotted(b)}/${pb}: ${r.ok && r.value.verdict} ≠ ${verdict}`;
    });
  });

  test('F04 · appartenenza ai blocchi speciali', () => {
    compare('F04 blocchi speciali', MISC.classify, ([ip, flags]) => {
      const codes = new Set(classify(ip).value.blocks.map((b) => b.code));
      const bad = Object.entries(flags).filter(([code, expected]) => codes.has(code) !== expected);
      return bad.length ? `${toDotted(ip)}: ${bad.map(([c]) => c).join(', ')}` : null;
    });
  });

  test('F04 · ambito e blocco principale (revisione A11)', () => {
    compare('F04 ambito e principale', MISC.classify, ([ip, , scope, primary]) => {
      const v = classify(ip).value;
      const got = [v.scope, v.primary ? v.primary.code : null];
      return JSON.stringify(got) === JSON.stringify([scope, primary]) ? null : `${toDotted(ip)}: ${JSON.stringify(got)} ≠ ${scope}/${primary}`;
    });
  });

  test('F10 · wildcard (hostmask di ipaddress)', () => {
    compare('F10 wildcard', F01.prefixes, ([p, , wildcard]) => {
      const r = snippets(0, p);
      return r.ok && toDotted(r.value.wildcard) === wildcard ? null : `/${p}`;
    });
  });
});
