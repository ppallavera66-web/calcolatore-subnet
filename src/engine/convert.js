// @ts-check
/**
 * F02 · Conversioni decimale/binario/esadecimale e CIDR/mask (specifica tecnica, 3.6; cap. 3 e 6).
 */
import { ok, fail } from './result.js';
import { ERR } from './errors.js';
import { parseIPv4, toDotted, toBinaryDotted, toHexDotted, toHex32, MAX_UINT32 } from './ipv4.js';
import { maskOf, wildcardOf, assertPrefix } from './prefix.js';
import { validateMask } from './validate-mask.js';

const DIGITS = { 2: /^[01]+$/, 10: /^[0-9]+$/, 16: /^[0-9a-f]+$/i };

/**
 * @param {number} value
 * @returns {number[]} pesi dei bit a 1, dal più grande
 */
export function weightsOf(value) {
  const out = [];
  for (let b = 31; b >= 0; b--) {
    const w = 2 ** b;
    if (Math.floor(value / w) % 2 === 1) out.push(w);
  }
  return out;
}

/**
 * Numero di bit minimo (multiplo di 8, almeno 8) per rappresentare il valore.
 * @param {number} value
 */
export function autoWidth(value) {
  const bits = value === 0 ? 1 : Math.floor(Math.log2(value)) + 1;
  return Math.max(8, Math.ceil(bits / 8) * 8);
}

/**
 * @param {unknown} text
 * @param {unknown} base 2, 10 o 16
 * @param {{ width?: 8 | 32 | 'auto' }} [options]
 */
export function convertNumber(text, base, options = {}) {
  const b = Number(base);
  if (b !== 2 && b !== 10 && b !== 16) return fail(ERR.BASE_UNSUPPORTED, 'base', { base });
  const raw = text === null || text === undefined ? '' : String(text).trim();
  let digits = raw;
  if (b === 2) digits = digits.replace(/[\s.]/g, '').replace(/^0b/i, '');
  if (b === 16) digits = digits.replace(/^0x/i, '');
  if (!DIGITS[b].test(digits)) return fail(ERR.NUMBER_FORMAT, 'number', { text: raw, base: b });
  let value = 0;
  for (const ch of digits) {
    value = value * b + parseInt(ch, b);
    if (value > MAX_UINT32) return fail(ERR.NUMBER_RANGE, 'number', { value: raw });
  }
  const requested = options.width ?? 'auto';
  const width = Math.max(requested === 'auto' ? 8 : requested, autoWidth(value));
  return ok({
    value,
    base: b,
    width,
    dec: String(value),
    bin: value.toString(2).padStart(width, '0'),
    hex: value.toString(16).toUpperCase().padStart(width / 4, '0'),
    weights: weightsOf(value),
  });
}

/**
 * @param {unknown} text indirizzo in notazione puntata
 */
export function convertAddress(text) {
  const ip = parseIPv4(text);
  if (!ip.ok) return ip;
  const x = ip.value;
  return ok({
    uint32: x,
    dotted: toDotted(x),
    binaryDotted: toBinaryDotted(x),
    hexDotted: toHexDotted(x),
    hex32: toHex32(x),
  });
}

/**
 * @param {number} p prefisso 0–32
 */
export function prefixToMask(p) {
  assertPrefix(p);
  const mask = maskOf(p);
  return { prefix: p, mask, wildcard: wildcardOf(p), maskDotted: toDotted(mask), maskBinary: toBinaryDotted(mask) };
}

/**
 * Da mask a prefisso: usa la validazione di F03.
 * @param {unknown} text
 */
export function maskToPrefix(text) {
  return validateMask(text);
}
