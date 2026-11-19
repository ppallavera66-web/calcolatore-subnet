// @ts-check
/**
 * Corrispondenza tra viste e voci di cronologia (specifica tecnica, 6.2: si salvano solo gli input,
 * indirizzi come stringhe puntate, prefissi e conteggi come interi). Funzioni pure:
 * - `entryFor(view, params)`: voce per gli input correnti, `null` se gli input non sono validi;
 * - `routeForEntry(entry)`: vista e parametri per riaprire una voce.
 * Gli input passano sempre dal parsing del motore, come all'import (6.3, punto 8).
 */
import {
  parseAddressInput, parseAddressWithPrefix, parsePrefixOrMask, parseIPv4, parseCount, toDotted, maskOf, convertNumber, convertAddress, validateMask,
  prefixForHostsText, prefixForSubnetsText, prefixForBothText,
} from '../engine/index.js';
import { inverseCase } from './router.js';

/** Vista che riapre ciascuna funzione. */
export const VIEW_OF_FN = Object.freeze({
  F01: 'calcola/analisi',
  F02: 'calcola/conversioni',
  F03: 'calcola/mask',
  F04: 'calcola/analisi',
  F05: 'pianifica/inverso',
  F06: 'pianifica/suddivisione',
  F07: 'calcola/stessa',
  F10: 'calcola/analisi',
});

const s = (/** @type {unknown} */ v) => (v === undefined || v === null ? '' : String(v));

/** Conteggio già validato dal motore. */
const countOf = (/** @type {unknown} */ v) => {
  const r = parseCount(v, 'count');
  return r.ok ? r.value : 0;
};

/**
 * Voce di cronologia per gli input di una vista. Per Conversioni `part` indica il riquadro
 * (`number` o `address`).
 * @param {string} view
 * @param {Record<string, string>} p
 * @param {'number' | 'address'} [part]
 * @returns {{ fn: string, input: Record<string, any> } | null}
 */
export function entryFor(view, p, part) {
  switch (view) {
    case 'calcola/analisi': {
      if (s(p.p).trim() === '') {
        const r = parseAddressInput(p.ip);
        if (!r.ok) return null;
        return r.value.prefix === null
          ? { fn: 'F04', input: { ip: toDotted(r.value.ip) } }
          : { fn: 'F01', input: { ip: toDotted(r.value.ip), prefix: r.value.prefix } };
      }
      const r = parseAddressWithPrefix(p.ip, p.p);
      return r.ok ? { fn: 'F01', input: { ip: toDotted(r.value.ip), prefix: r.value.prefix } } : null;
    }
    case 'calcola/conversioni': {
      if (part === 'address') {
        const r = convertAddress(p.a);
        return r.ok ? { fn: 'F02', input: { kind: 'address', text: r.value.dotted } } : null;
      }
      const base = Number(p.b || 10);
      const r = convertNumber(p.n, base);
      return r.ok ? { fn: 'F02', input: { kind: 'number', text: s(p.n).trim(), base } } : null;
    }
    case 'calcola/mask': {
      const r = validateMask(p.m);
      return r.ok ? { fn: 'F03', input: { mask: toDotted(r.value.mask) } } : null;
    }
    case 'calcola/stessa': {
      const a = parseAddressWithPrefix(p.a, p.pa);
      if (!a.ok) return null;
      /** @type {Record<string, any>} */
      const input = { a: toDotted(a.value.ip), prefixA: a.value.prefix };
      const bHasPrefix = s(p.pb).trim() !== '' || /[/\s]/.test(s(p.b).trim());
      const b = bHasPrefix ? parseAddressWithPrefix(p.b, p.pb) : parseIPv4(p.b);
      if (!b.ok) return null;
      if (typeof b.value === 'number') input.b = toDotted(b.value);
      else {
        input.b = toDotted(b.value.ip);
        input.prefixB = b.value.prefix;
      }
      if (s(p.gw).trim() !== '') {
        const g = parseIPv4(p.gw);
        if (!g.ok) return null;
        input.gateway = toDotted(g.value);
      }
      return { fn: 'F07', input };
    }
    case 'pianifica/inverso': {
      // la validità (intervalli compresi) la decide F05; qui si ricavano solo i valori
      const mode = inverseCase(p);
      const r = mode === 'a' ? prefixForHostsText(p.h) : mode === 'b' ? prefixForSubnetsText(p.p, p.s) : prefixForBothText(p.p, p.h, p.s);
      if (!r.ok) return null;
      const H = mode === 'b' ? 0 : countOf(p.h);
      const S = mode === 'a' ? 0 : countOf(p.s);
      const prefix = parsePrefixOrMask(p.p);
      const P = prefix.ok ? prefix.value.prefix : 0;
      if (mode === 'a') return { fn: 'F05', input: { mode: 'hosts', hosts: H } };
      if (mode === 'b') return { fn: 'F05', input: { mode: 'subnets', prefix: P, subnets: S } };
      return { fn: 'F05', input: { mode: 'both', prefix: P, hosts: H, subnets: S } };
    }
    case 'pianifica/suddivisione': {
      const block = parseAddressWithPrefix(p.b, p.p);
      const np = parsePrefixOrMask(p.np, 'newPrefix');
      if (!block.ok || !np.ok || np.value.prefix < block.value.prefix) return null;
      const network = (block.value.ip & maskOf(block.value.prefix)) >>> 0;
      return { fn: 'F06', input: { block: toDotted(network), prefix: block.value.prefix, newPrefix: np.value.prefix } };
    }
    default:
      return null;
  }
}

/**
 * Vista e parametri per riaprire una voce di cronologia.
 * @param {{ fn: string, input: Record<string, any> }} entry
 * @returns {{ view: string, params: Record<string, string> }}
 */
export function routeForEntry(entry) {
  const i = entry.input;
  const view = /** @type {Record<string, string>} */ (VIEW_OF_FN)[entry.fn] ?? 'calcola/analisi';
  switch (entry.fn) {
    case 'F01':
      return { view, params: { ip: s(i.ip), p: s(i.prefix) } };
    case 'F04':
      return { view, params: { ip: s(i.ip) } };
    case 'F10':
      return { view, params: { ip: s(i.network), p: s(i.prefix) } };
    case 'F02':
      return i.kind === 'address' ? { view, params: { a: s(i.text) } } : { view, params: { n: s(i.text), b: s(i.base) } };
    case 'F03':
      return { view, params: { m: s(i.mask) } };
    case 'F05':
      if (i.mode === 'hosts') return { view, params: { h: s(i.hosts) } };
      if (i.mode === 'subnets') return { view, params: { p: s(i.prefix), s: s(i.subnets) } };
      return { view, params: { p: s(i.prefix), h: s(i.hosts), s: s(i.subnets) } };
    case 'F06':
      return { view, params: { b: s(i.block), p: s(i.prefix), np: s(i.newPrefix), pg: '0' } };
    case 'F07': {
      /** @type {Record<string, string>} */
      const params = { a: s(i.a), pa: s(i.prefixA), b: s(i.b) };
      if (i.prefixB !== undefined && i.prefixB !== null) params.pb = s(i.prefixB);
      if (i.gateway) params.gw = s(i.gateway);
      return { view, params };
    }
    default:
      return { view, params: {} };
  }
}
