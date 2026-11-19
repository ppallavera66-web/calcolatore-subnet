// @ts-check
/**
 * Parsing e formattazione tecnica degli indirizzi IPv4 (specifica tecnica, 3.5).
 */
import { ok, fail } from './result.js';
import { ERR } from './errors.js';
import { checkMask, octetsOf } from './prefix.js';

export const MAX_UINT32 = 0xffffffff;

/**
 * @param {unknown} text
 * @returns {string}
 */
function asText(text) {
  if (text === null || text === undefined) return '';
  return String(text);
}

/**
 * Parsing di un indirizzo in notazione puntata.
 * 1. spazi esterni tolti, vuoto → IP_EMPTY;
 * 2. virgole lette come punti (tastiera numerica italiana);
 * 3. quattro parti di 1–3 cifre ASCII, altrimenti IP_FORMAT;
 * 4. zeri iniziali → IP_LEADING_ZERO (010 potrebbe essere letto in ottale);
 * 5. valori oltre 255 → IP_OCTET_RANGE.
 * @param {unknown} text
 * @param {string} [field]
 * @returns {import('./result.js').Result<number>}
 */
export function parseIPv4(text, field = 'ip') {
  const raw = asText(text).trim();
  if (raw === '') return fail(ERR.IP_EMPTY, field);
  const parts = raw.replace(/,/g, '.').split('.');
  if (parts.length !== 4 || !parts.every((p) => /^[0-9]{1,3}$/.test(p))) {
    return fail(ERR.IP_FORMAT, field, { text: raw });
  }
  for (let i = 0; i < 4; i++) {
    if (parts[i].length > 1 && parts[i][0] === '0') {
      return fail(ERR.IP_LEADING_ZERO, field, { index: i, value: parts[i] });
    }
  }
  let v = 0;
  for (let i = 0; i < 4; i++) {
    const n = Number(parts[i]);
    if (n > 255) return fail(ERR.IP_OCTET_RANGE, field, { index: i, value: n });
    v = v * 256 + n;
  }
  return ok(v >>> 0);
}

/**
 * @param {number} x uint32
 * @returns {string} notazione puntata
 */
export function toDotted(x) {
  return octetsOf(x).join('.');
}

/**
 * @param {number} n 0–255
 * @returns {string} 8 cifre binarie
 */
export function octetToBinary(n) {
  return (n & 255).toString(2).padStart(8, '0');
}

/**
 * @param {number} x uint32
 * @returns {string} quattro gruppi di 8 bit separati da punti
 */
export function toBinaryDotted(x) {
  return octetsOf(x).map(octetToBinary).join('.');
}

/**
 * @param {number} x uint32
 * @returns {string} per esempio `C0.A8.0A.4B`
 */
export function toHexDotted(x) {
  return octetsOf(x)
    .map((o) => o.toString(16).toUpperCase().padStart(2, '0'))
    .join('.');
}

/**
 * @param {number} x uint32
 * @returns {string} per esempio `0xC0A80A4B`
 */
export function toHex32(x) {
  return '0x' + (x >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

/**
 * Parsing di un prefisso: `n` oppure `/n`, da 0 a 32. Zeri iniziali ammessi (`/08`).
 * @param {unknown} text
 * @param {string} [field]
 * @returns {import('./result.js').Result<number>}
 */
export function parsePrefix(text, field = 'prefix') {
  if (typeof text === 'number') {
    if (!Number.isInteger(text)) return fail(ERR.PREFIX_FORMAT, field, { text: String(text) });
    if (text < 0 || text > 32) return fail(ERR.PREFIX_RANGE, field, { value: text });
    return ok(text);
  }
  const raw = asText(text).trim();
  if (raw === '' || raw === '/') return fail(ERR.PREFIX_EMPTY, field);
  const m = /^\/?\s*([0-9]+)$/.exec(raw);
  if (!m) return fail(ERR.PREFIX_FORMAT, field, { text: raw });
  const n = Number(m[1]);
  if (n > 32) return fail(ERR.PREFIX_RANGE, field, { value: n });
  return ok(n);
}

/**
 * Parsing di una mask in notazione puntata, valida e contigua.
 * Forma non riconosciuta → MASK_FORMAT; mask non valida → codice del motivo di F03.
 * @param {unknown} text
 * @param {string} [field]
 * @returns {import('./result.js').Result<number>} il prefisso equivalente
 */
export function parseMask(text, field = 'mask') {
  const raw = asText(text).trim();
  const parsed = parseIPv4(raw, field);
  if (!parsed.ok) return fail(ERR.MASK_FORMAT, field, { text: raw });
  const check = checkMask(parsed.value);
  if (!check.valid) {
    const reason = /** @type {{ code: string, params: Record<string, any> }} */ (check.reason);
    return fail(reason.code, field, reason.params);
  }
  return ok(/** @type {number} */ (check.prefix));
}

/**
 * Prefisso scritto come `20`, `/20` oppure come mask `255.255.240.0`.
 * @param {unknown} text
 * @param {string} [field]
 * @returns {import('./result.js').Result<{ prefix: number, source: 'cidr' | 'mask' }>}
 */
export function parsePrefixOrMask(text, field = 'prefix') {
  const raw = typeof text === 'number' ? text : asText(text).trim().replace(/,/g, '.');
  if (typeof raw === 'string' && raw.includes('.')) {
    const m = parseMask(raw, field);
    return m.ok ? ok({ prefix: m.value, source: 'mask' }) : m;
  }
  const p = parsePrefix(raw, field);
  return p.ok ? ok({ prefix: p.value, source: 'cidr' }) : p;
}

/**
 * Riconosce `a.b.c.d`, `a.b.c.d/n`, `a.b.c.d / n`, `a.b.c.d/m.m.m.m`, `a.b.c.d m.m.m.m`.
 * @param {unknown} text
 * @param {{ ipField?: string, prefixField?: string }} [fields]
 * @returns {import('./result.js').Result<{ ip: number, prefix: number | null,
 *   prefixSource: 'cidr' | 'mask' | null }>}
 */
export function parseAddressInput(text, fields = {}) {
  const ipField = fields.ipField ?? 'ip';
  const prefixField = fields.prefixField ?? 'prefix';
  const raw = asText(text).trim();
  if (raw === '') return fail(ERR.IP_EMPTY, ipField);

  let ipText;
  /** @type {string | null} */
  let rest = null;
  /** @type {'cidr' | 'mask' | null} */
  let kind = null;

  const slash = raw.indexOf('/');
  if (slash >= 0) {
    ipText = raw.slice(0, slash).trim();
    rest = raw.slice(slash + 1).trim();
    if (rest.includes('/') || /\s/.test(rest)) return fail(ERR.INPUT_FORMAT, ipField, { text: raw });
    kind = rest.replace(/,/g, '.').includes('.') ? 'mask' : 'cidr';
  } else {
    const tokens = raw.split(/\s+/);
    if (tokens.length > 2) return fail(ERR.INPUT_FORMAT, ipField, { text: raw });
    ipText = tokens[0];
    if (tokens.length === 2) {
      if (!tokens[1].replace(/,/g, '.').includes('.')) return fail(ERR.INPUT_FORMAT, ipField, { text: raw });
      rest = tokens[1];
      kind = 'mask';
    }
  }

  const ip = parseIPv4(ipText, ipField);
  if (!ip.ok) return ip;
  if (rest === null) return ok({ ip: ip.value, prefix: null, prefixSource: null });
  if (kind === 'mask') {
    const m = parseMask(rest.replace(/,/g, '.'), 'mask');
    if (!m.ok) return m;
    return ok({ ip: ip.value, prefix: m.value, prefixSource: 'mask' });
  }
  const p = parsePrefix(rest, prefixField);
  if (!p.ok) return p;
  return ok({ ip: ip.value, prefix: p.value, prefixSource: 'cidr' });
}

/**
 * Indirizzo con prefisso obbligatorio: da un solo testo (`10.0.0.0/16`) oppure
 * da due testi (indirizzo e prefisso o mask). Il secondo, se presente, prevale.
 * @param {unknown} addressText
 * @param {unknown} [prefixText]
 * @param {{ ipField?: string, prefixField?: string }} [fields]
 * @returns {import('./result.js').Result<{ ip: number, prefix: number }>}
 */
export function parseAddressWithPrefix(addressText, prefixText, fields = {}) {
  const ipField = fields.ipField ?? 'ip';
  const prefixField = fields.prefixField ?? 'prefix';
  const addr = parseAddressInput(addressText, { ipField, prefixField });
  if (!addr.ok) return addr;
  const hasSecond = prefixText !== undefined && prefixText !== null && asText(prefixText).trim() !== '';
  if (hasSecond) {
    const p = parsePrefixOrMask(prefixText, prefixField);
    if (!p.ok) return p;
    return ok({ ip: addr.value.ip, prefix: p.value.prefix });
  }
  if (addr.value.prefix === null) return fail(ERR.PREFIX_EMPTY, prefixField);
  return ok({ ip: addr.value.ip, prefix: addr.value.prefix });
}

/**
 * Intero decimale non negativo scritto dall'utente (conteggi di host e subnet).
 * @param {unknown} text
 * @param {string} field
 * @returns {import('./result.js').Result<number>}
 */
export function parseCount(text, field) {
  if (typeof text === 'number') {
    return Number.isSafeInteger(text) ? ok(text) : fail(ERR.NUMBER_FORMAT, field, { text: String(text), base: 10 });
  }
  // separatore delle migliaia (punto o spazio) ammesso solo a gruppi di tre cifre:
  // "1.000" e "1 000 000" sì, "100.0" o "2.5" no (sarebbero letti come 1000 e 25, revisione A2)
  const trimmed = asText(text).trim();
  if (!/^(?:[0-9]+|[0-9]{1,3}(?:[.\s][0-9]{3})+)$/.test(trimmed)) return fail(ERR.NUMBER_FORMAT, field, { text: trimmed, base: 10 });
  const raw = trimmed.replace(/[.\s]/g, '');
  if (raw.length > 16) return fail(ERR.NUMBER_FORMAT, field, { text: trimmed, base: 10 });
  return ok(Number(raw));
}
