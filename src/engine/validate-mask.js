// @ts-check
/**
 * F03 · Validazione della mask (specifica tecnica, 3.6; cap. 6).
 * Una mask non valida è un risultato (`valid: false`), non un errore.
 */
import { ok, fail, warn } from './result.js';
import { ERR, WARN } from './errors.js';
import { parseIPv4, octetToBinary } from './ipv4.js';
import { MASK_OCTET_VALUES, checkMask, leadingOnes, maskOf, octetsOf } from './prefix.js';

/**
 * @param {number} m uint32
 */
export function validateMaskValue(m) {
  const check = checkMask(m);
  const octets = octetsOf(m).map((value) => ({
    value,
    binary: octetToBinary(value),
    allowed: MASK_OCTET_VALUES.includes(value),
  }));
  /** @type {{ prefix: number, mask: number }[]} */
  const suggestions = [];
  /** @type {import('./result.js').Warning[]} */
  const warnings = [];
  if (!check.valid) {
    const q = leadingOnes(m);
    for (const p of [q, q + 1]) if (p <= 32) suggestions.push({ prefix: p, mask: maskOf(p) });
    const inverse = checkMask(~m >>> 0);
    if (inverse.valid) warnings.push(warn(WARN.W_LOOKS_LIKE_WILDCARD, { prefix: inverse.prefix }));
  }
  return ok(
    { mask: m >>> 0, valid: check.valid, prefix: check.prefix, octets, reason: check.reason, suggestions },
    warnings,
  );
}

/**
 * @param {unknown} text
 */
export function validateMask(text) {
  const raw = text === null || text === undefined ? '' : String(text).trim();
  const parsed = parseIPv4(raw, 'mask');
  if (!parsed.ok) return fail(ERR.MASK_FORMAT, 'mask', { text: raw });
  return validateMaskValue(parsed.value);
}
