// @ts-check
/**
 * Prefisso, mask, wildcard, ottetto interessante e numero magico
 * (specifica tecnica, 3.2 e 3.3). Funzioni su valori già validati.
 */

/** Valori ammessi per un ottetto di mask (cap. 6). */
export const MASK_OCTET_VALUES = Object.freeze([0, 128, 192, 224, 240, 248, 252, 254, 255]);

/**
 * @param {number} p prefisso 0–32
 * @returns {number} mask come uint32
 */
export function maskOf(p) {
  return p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0;
}

/**
 * @param {number} p prefisso 0–32
 * @returns {number} wildcard come uint32
 */
export function wildcardOf(p) {
  return ~maskOf(p) >>> 0;
}

/**
 * Numero di indirizzi di un blocco /p (2^(32−p), fino a 2^32 per /0).
 * @param {number} p
 */
export function blockSize(p) {
  return 2 ** (32 - p);
}

/**
 * @param {number} x uint32
 * @returns {number} numero di bit a 1
 */
export function popcount(x) {
  let v = x >>> 0;
  let n = 0;
  while (v) {
    n += v & 1;
    v >>>= 1;
  }
  return n;
}

/**
 * Numero di bit a 1 consecutivi da sinistra.
 * @param {number} m uint32
 */
export function leadingOnes(m) {
  return Math.clz32(~m >>> 0);
}

/**
 * Prefisso della mask se è contigua, altrimenti `null`.
 * @param {number} m uint32
 * @returns {number | null}
 */
export function maskToPrefixValue(m) {
  const q = leadingOnes(m);
  return maskOf(q) === m >>> 0 ? q : null;
}

/**
 * Verifica di una mask secondo l'ordine della scheda F03:
 * prima i 9 valori ammessi, poi la contiguità tra ottetti.
 * @param {number} m uint32
 * @returns {{ valid: boolean, prefix: number | null,
 *   reason: null | { code: string, params: Record<string, any> } }}
 */
export function checkMask(m) {
  const o = octetsOf(m);
  for (let i = 0; i < 4; i++) {
    if (!MASK_OCTET_VALUES.includes(o[i])) {
      return {
        valid: false,
        prefix: null,
        reason: {
          code: 'MASK_OCTET_VALUE',
          params: { index: i, value: o[i], binary: o[i].toString(2).padStart(8, '0') },
        },
      };
    }
  }
  let seenPartial = false;
  for (let i = 0; i < 4; i++) {
    if (seenPartial && o[i] !== 0) {
      return { valid: false, prefix: null, reason: { code: 'MASK_NONCONTIGUOUS', params: { index: i } } };
    }
    if (o[i] !== 255) seenPartial = true;
  }
  return { valid: true, prefix: leadingOnes(m), reason: null };
}

/**
 * @param {number} x uint32
 * @returns {[number, number, number, number]}
 */
export function octetsOf(x) {
  const v = x >>> 0;
  return [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
}

/**
 * @param {number} x uint32
 * @param {number} index 0–3
 */
export function octetAt(x, index) {
  return (x >>> (24 - 8 * index)) & 255;
}

/**
 * @typedef {{ index: number, magic: number, bits: number, maskOctet: number, boundary: boolean }} Interesting
 */

/**
 * Ottetto interessante e numero magico (tabella 3.2).
 * - /0: primo ottetto, M = 256, blocco unico (m3);
 * - prefissi multipli di 8: l'ultimo ottetto che vale 255, M = 1 (convenzione della guida);
 * - altri: l'ottetto in cui cade il confine, M = 2^(8−b).
 * @param {number} p
 * @returns {Interesting}
 */
export function interestingOctet(p) {
  if (p === 0) return { index: 0, magic: 256, bits: 0, maskOctet: 0, boundary: true };
  if (p % 8 === 0) return { index: p / 8 - 1, magic: 1, bits: 8, maskOctet: 255, boundary: true };
  const index = Math.floor(p / 8);
  const bits = p - 8 * index;
  const magic = 2 ** (8 - bits);
  return { index, magic, bits, maskOctet: 256 - magic, boundary: false };
}

/**
 * Regole sugli host (tabella 3.3).
 * @param {number} p
 * @returns {{ total: number, usable: number, kind: 'standard' | 'p2p' | 'single' }}
 */
export function hostRule(p) {
  const total = blockSize(p);
  if (p === 32) return { total, usable: 1, kind: 'single' };
  if (p === 31) return { total, usable: 2, kind: 'p2p' };
  return { total, usable: total - 2, kind: 'standard' };
}

/**
 * Rete, broadcast e range degli host di un blocco già allineato.
 * @param {number} network uint32 allineato a /p
 * @param {number} p
 */
export function blockInfo(network, p) {
  const rule = hostRule(p);
  const last = (network + rule.total - 1) >>> 0;
  if (rule.kind === 'single') {
    return { network, broadcast: null, firstHost: network, lastHost: network, usableHosts: 1, hostKind: rule.kind };
  }
  if (rule.kind === 'p2p') {
    return { network, broadcast: null, firstHost: network, lastHost: last, usableHosts: 2, hostKind: rule.kind };
  }
  return {
    network,
    broadcast: last,
    firstHost: network + 1,
    lastHost: last - 1,
    usableHosts: rule.usable,
    hostKind: rule.kind,
  };
}

/**
 * Verifica (errore di programmazione) che il prefisso sia un intero 0–32.
 * @param {unknown} p
 * @param {string} [name]
 */
export function assertPrefix(p, name = 'prefix') {
  if (!Number.isInteger(p) || /** @type {number} */ (p) < 0 || /** @type {number} */ (p) > 32) {
    throw new RangeError(`${name} deve essere un intero da 0 a 32`);
  }
}

/**
 * Verifica (errore di programmazione) che il valore sia un uint32.
 * @param {unknown} x
 * @param {string} [name]
 */
export function assertUint32(x, name = 'ip') {
  if (!Number.isInteger(x) || /** @type {number} */ (x) < 0 || /** @type {number} */ (x) > 0xffffffff) {
    throw new RangeError(`${name} deve essere un intero da 0 a 4294967295`);
  }
}
