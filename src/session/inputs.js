// @ts-check
/**
 * Validazione degli input salvati in cronologia e nei piani (specifica tecnica, 6.2 e 6.3 punto 8):
 * ogni input passa per le funzioni di parsing del motore e torna in forma canonica
 * (indirizzi come stringhe puntate, prefissi e conteggi come interi). Copia per lista ammessa:
 * si costruisce un oggetto nuovo con i soli campi previsti.
 */
import {
  parseIPv4, toDotted, maskOf, convertNumber, convertAddress, validateMask,
  prefixForHosts, prefixForSubnets, prefixForBoth, sameSubnet, snippets, subdivide,
} from '../engine/index.js';
import { LIMITS, isPlainObject, isCleanText } from './schema.js';

/** Campi ammessi negli input di ciascuna funzione. */
export const INPUT_KEYS = Object.freeze({
  F01: ['ip', 'prefix'],
  F02: ['kind', 'text', 'base'],
  F03: ['mask'],
  F04: ['ip'],
  F05: ['mode', 'prefix', 'hosts', 'subnets'],
  F06: ['block', 'prefix', 'newPrefix'],
  F07: ['a', 'prefixA', 'b', 'prefixB', 'gateway'],
  F10: ['network', 'prefix', 'acl', 'ospf'],
});

const isPrefix = (/** @type {unknown} */ p) => Number.isInteger(p) && /** @type {number} */ (p) >= 0 && /** @type {number} */ (p) <= 32;
const isCount = (/** @type {unknown} */ n) => Number.isSafeInteger(n) && /** @type {number} */ (n) >= 0;
const absent = (/** @type {unknown} */ v) => v === undefined || v === null;

/**
 * Indirizzo puntato valido → uint32, altrimenti null.
 * @param {unknown} v
 */
function addr(v) {
  if (typeof v !== 'string') return null;
  const r = parseIPv4(v);
  return r.ok ? r.value : null;
}

/**
 * @typedef {{ ok: true, input: Record<string, any>, unknownKeys: number } | { ok: false }} InputResult
 */

/**
 * Valida l'input di una funzione e lo restituisce in forma canonica.
 * @param {string} fn
 * @param {unknown} raw
 * @returns {InputResult}
 */
export function validateInput(fn, raw) {
  const keys = /** @type {Record<string, readonly string[]>} */ (INPUT_KEYS)[fn];
  if (!keys || !isPlainObject(raw)) return { ok: false };
  const i = /** @type {Record<string, any>} */ (raw);
  const unknownKeys = Object.keys(i).filter((k) => !keys.includes(k)).length;
  const input = canonical(fn, i);
  return input ? { ok: true, input, unknownKeys } : { ok: false };
}

/**
 * @param {string} fn
 * @param {Record<string, any>} i
 * @returns {Record<string, any> | null}
 */
function canonical(fn, i) {
  switch (fn) {
    case 'F01': {
      const ip = addr(i.ip);
      return ip !== null && isPrefix(i.prefix) ? { ip: toDotted(ip), prefix: i.prefix } : null;
    }
    case 'F04': {
      const ip = addr(i.ip);
      return ip !== null ? { ip: toDotted(ip) } : null;
    }
    case 'F02': {
      if (typeof i.text !== 'string' || i.text.length > LIMITS.inputText || !isCleanText(i.text)) return null;
      if (i.kind === 'address') {
        const r = convertAddress(i.text);
        return r.ok ? { kind: 'address', text: r.value.dotted } : null;
      }
      if (i.kind === 'number' && (i.base === 2 || i.base === 10 || i.base === 16)) {
        const r = convertNumber(i.text, i.base);
        return r.ok ? { kind: 'number', text: i.text.trim(), base: i.base } : null;
      }
      return null;
    }
    case 'F03': {
      if (typeof i.mask !== 'string') return null;
      const r = validateMask(i.mask);
      return r.ok ? { mask: toDotted(r.value.mask) } : null;
    }
    case 'F05': {
      if (i.mode === 'hosts') {
        return isCount(i.hosts) && prefixForHosts(i.hosts).ok ? { mode: 'hosts', hosts: i.hosts } : null;
      }
      if (i.mode === 'subnets') {
        return isPrefix(i.prefix) && isCount(i.subnets) && prefixForSubnets(i.prefix, i.subnets).ok
          ? { mode: 'subnets', prefix: i.prefix, subnets: i.subnets }
          : null;
      }
      if (i.mode === 'both') {
        return isPrefix(i.prefix) && isCount(i.hosts) && isCount(i.subnets) && prefixForBoth(i.prefix, i.hosts, i.subnets).ok
          ? { mode: 'both', prefix: i.prefix, hosts: i.hosts, subnets: i.subnets }
          : null;
      }
      return null;
    }
    case 'F06': {
      const block = addr(i.block);
      if (block === null || !isPrefix(i.prefix) || !isPrefix(i.newPrefix) || i.newPrefix < i.prefix) return null;
      return { block: toDotted((block & maskOf(i.prefix)) >>> 0), prefix: i.prefix, newPrefix: i.newPrefix };
    }
    case 'F07': {
      const a = addr(i.a);
      const b = addr(i.b);
      if (a === null || b === null || !isPrefix(i.prefixA)) return null;
      if (!absent(i.prefixB) && !isPrefix(i.prefixB)) return null;
      const gw = absent(i.gateway) || i.gateway === '' ? null : addr(i.gateway);
      if (gw === null && !(absent(i.gateway) || i.gateway === '')) return null;
      if (!sameSubnet({ a, prefixA: i.prefixA, b, prefixB: absent(i.prefixB) ? null : i.prefixB, gateway: gw }).ok) return null;
      /** @type {Record<string, any>} */
      const out = { a: toDotted(a), prefixA: i.prefixA, b: toDotted(b) };
      if (!absent(i.prefixB)) out.prefixB = i.prefixB;
      if (gw !== null) out.gateway = toDotted(gw);
      return out;
    }
    case 'F10': {
      const net = addr(i.network);
      if (net === null || !isPrefix(i.prefix) || !isPlainObject(i.acl) || !isPlainObject(i.ospf)) return null;
      const acl = { number: i.acl.number, name: i.acl.name, action: i.acl.action };
      const ospf = { process: i.ospf.process, area: i.ospf.area };
      if (typeof ospf.area !== 'number' && typeof ospf.area !== 'string') return null;
      const r = snippets(net, i.prefix, { acl, ospf });
      if (!r.ok) return null;
      return { network: toDotted(r.value.network), prefix: i.prefix, acl, ospf };
    }
    /* c8 ignore next 2 */
    default:
      return null;
  }
}

/**
 * Numero di subnet di un piano di suddivisione (per controllare gli indici delle etichette).
 * @param {{ block: string, prefix: number, newPrefix: number }} input già canonico
 */
export function subnetCount(input) {
  const r = subdivide(/** @type {number} */ (addr(input.block)), input.prefix, input.newPrefix, { limit: 1 });
  /* c8 ignore next */
  return r.ok ? r.value.count : 0;
}
