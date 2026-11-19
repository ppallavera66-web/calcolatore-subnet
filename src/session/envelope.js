// @ts-check
/**
 * Busta cifrata (specifica tecnica, 7; specifiche di progetto, 4.1): Web Crypto API, nessuna libreria.
 * AES-256-GCM con tag di 128 bit, chiave da PBKDF2-SHA-256 (sale 16 byte, 600.000 iterazioni),
 * IV di 12 byte nuovo a ogni export, intestazione legata al contenuto come dato autenticato (AAD).
 *
 * La passphrase non viene mai salvata né restituita: resta nei parametri delle funzioni.
 */
import { ENVELOPE_FORMAT, IMPORT_ERR, isPlainObject } from './schema.js';

export const ENVELOPE_VERSION = 1;
export const KDF_NAME = 'PBKDF2-SHA-256';
export const CIPHER_NAME = 'AES-256-GCM';
export const DEFAULT_ITERATIONS = 600000;
export const MIN_ITERATIONS = 600000;
export const MAX_ITERATIONS = 10000000;
export const MIN_PASSPHRASE = 12;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * Web Crypto disponibile? Manca nei contesti non sicuri (alcuni browser con la pagina da disco o da HTTP).
 * @param {{ subtle?: unknown } | undefined} [c]
 */
export function cryptoAvailable(c = globalThis.crypto) {
  return !!(c && c.subtle && typeof (/** @type {any} */ (c.subtle).deriveKey) === 'function');
}

// ---------------------------------------------------------------- base64 standard, con padding

/** @param {Uint8Array} bytes */
export function toBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/**
 * Base64 standard con padding obbligatorio; null se il testo non è base64 valido.
 * @param {unknown} s
 * @returns {Uint8Array | null}
 */
export function fromBase64(s) {
  if (typeof s !== 'string' || s.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(s)) return null;
  try {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    // forma canonica: rifiuta i bit di riempimento non nulli (testo diverso, stessi byte)
    return toBase64(out) === s ? out : null;
  } catch {
    /* c8 ignore next */
    return null;
  }
}

// ---------------------------------------------------------------- AAD (7.2 punto 4)

/**
 * Dato autenticato aggiuntivo: UTF-8 di JSON.stringify di un array a ordine fisso.
 * @param {{ format: string, version: number, kdf: { name: string, iterations: number, salt: string }, cipher: { name: string, iv: string } }} env
 */
export function aadOf(env) {
  return new TextEncoder().encode(JSON.stringify([env.format, env.version, env.kdf.name, env.kdf.iterations, env.kdf.salt, env.cipher.name, env.cipher.iv]));
}

/**
 * @param {Crypto} c
 * @param {string} passphrase
 * @param {Uint8Array} salt
 * @param {number} iterations
 * @param {KeyUsage} usage
 */
async function deriveKey(c, passphrase, salt, iterations, usage) {
  const base = await c.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return c.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: /** @type {BufferSource} */ (salt), iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage],
  );
}

/**
 * Cifra il JSON di una sessione (7.2).
 * @param {Record<string, any>} session oggetto `subnetcalc-session`
 * @param {string} passphrase
 * @param {{ iterations?: number, crypto?: Crypto }} [o]
 */
export async function encryptSession(session, passphrase, o = {}) {
  const c = o.crypto ?? globalThis.crypto;
  if (!cryptoAvailable(c)) throw new Error(IMPORT_ERR.IMPORT_CRYPTO_UNAVAILABLE);
  const iterations = o.iterations ?? DEFAULT_ITERATIONS;
  const salt = c.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = c.getRandomValues(new Uint8Array(IV_BYTES));
  const header = {
    format: ENVELOPE_FORMAT,
    version: ENVELOPE_VERSION,
    kdf: { name: KDF_NAME, iterations, salt: toBase64(salt) },
    cipher: { name: CIPHER_NAME, iv: toBase64(iv) },
  };
  const key = await deriveKey(c, passphrase, salt, iterations, 'encrypt');
  const plain = new TextEncoder().encode(JSON.stringify(session));
  const data = new Uint8Array(
    await c.subtle.encrypt({ name: 'AES-GCM', iv: /** @type {BufferSource} */ (iv), additionalData: /** @type {BufferSource} */ (aadOf(header)), tagLength: 128 }, key, plain),
  );
  return { ...header, data: toBase64(data) };
}

/**
 * Controlli sull'intestazione (7.3 punto 1), prima di chiedere la passphrase.
 * @param {unknown} env
 * @returns {{ ok: true, value: { header: Parameters<typeof aadOf>[0], salt: Uint8Array, iv: Uint8Array, data: Uint8Array } } | { ok: false, error: { code: string, params: Record<string, unknown> } }}
 */
export function checkEnvelope(env) {
  const bad = (/** @type {string} */ field) => ({ ok: /** @type {const} */ (false), error: { code: IMPORT_ERR.IMPORT_BAD_ENVELOPE, params: { field } } });
  if (!isPlainObject(env)) return bad('format');
  const e = /** @type {Record<string, any>} */ (env);
  if (e.format !== ENVELOPE_FORMAT) return bad('format');
  if (e.version !== ENVELOPE_VERSION) return bad('version');
  if (!isPlainObject(e.kdf) || e.kdf.name !== KDF_NAME) return bad('kdf.name');
  const it = e.kdf.iterations;
  if (!Number.isInteger(it) || it < MIN_ITERATIONS || it > MAX_ITERATIONS) return bad('kdf.iterations');
  const salt = fromBase64(e.kdf.salt);
  if (!salt || salt.length !== SALT_BYTES) return bad('kdf.salt');
  if (!isPlainObject(e.cipher) || e.cipher.name !== CIPHER_NAME) return bad('cipher.name');
  const iv = fromBase64(e.cipher.iv);
  if (!iv || iv.length !== IV_BYTES) return bad('cipher.iv');
  const data = fromBase64(e.data);
  if (!data || data.length < TAG_BYTES) return bad('data');
  const header = { format: e.format, version: e.version, kdf: { name: e.kdf.name, iterations: it, salt: e.kdf.salt }, cipher: { name: e.cipher.name, iv: e.cipher.iv } };
  return { ok: true, value: { header, salt, iv, data } };
}

/**
 * Decifra una busta (7.3). Passphrase errata e file manomesso danno lo stesso errore: GCM non
 * permette di distinguerli, ed è giusto così. Il testo restituito va poi validato con la 6.3.
 * @param {unknown} env
 * @param {string} passphrase
 * @param {{ crypto?: Crypto }} [o]
 * @returns {Promise<{ ok: true, text: string } | { ok: false, error: { code: string, params: Record<string, unknown> } }>}
 */
export async function decryptEnvelope(env, passphrase, o = {}) {
  const c = o.crypto ?? globalThis.crypto;
  if (!cryptoAvailable(c)) return { ok: false, error: { code: IMPORT_ERR.IMPORT_CRYPTO_UNAVAILABLE, params: {} } };
  const checked = checkEnvelope(env);
  if (!checked.ok) return checked;
  const { header, salt, iv, data } = checked.value;
  try {
    const key = await deriveKey(c, passphrase, salt, header.kdf.iterations, 'decrypt');
    const plain = await c.subtle.decrypt(
      { name: 'AES-GCM', iv: /** @type {BufferSource} */ (iv), additionalData: /** @type {BufferSource} */ (aadOf(header)), tagLength: 128 },
      key,
      /** @type {BufferSource} */ (data),
    );
    return { ok: true, text: new TextDecoder('utf-8', { fatal: true }).decode(plain) };
  } catch {
    return { ok: false, error: { code: IMPORT_ERR.IMPORT_DECRYPT_FAILED, params: {} } };
  }
}

// ---------------------------------------------------------------- robustezza della passphrase (7.4)

/**
 * Indicatore a quattro livelli (0 debole, 1 media, 2 buona, 3 ottima), calcolato da lunghezza e varietà
 * senza dizionari esterni: stima dei bit = lunghezza × log2(ampiezza dell'alfabeto usato), con
 * penalità per pochi caratteri distinti. Sotto i 12 caratteri Unicode è sempre "debole" e non ammessa.
 * @param {string} p
 * @returns {{ length: number, level: 0 | 1 | 2 | 3, bits: number, acceptable: boolean }}
 */
export function passphraseStrength(p) {
  const chars = [...p];
  const length = chars.length;
  let pool = 0;
  if (/[a-z]/.test(p)) pool += 26;
  if (/[A-Z]/.test(p)) pool += 26;
  if (/[0-9]/.test(p)) pool += 10;
  if (/[ -/:-@[-`{-~]/.test(p)) pool += 33;
  if (/[^\x20-\x7e]/.test(p)) pool += 100;
  const distinct = new Set(chars).size;
  const effective = Math.min(length, distinct * 3);
  const bits = pool > 0 ? Math.round(effective * Math.log2(pool)) : 0;
  const acceptable = length >= MIN_PASSPHRASE;
  /** @type {0 | 1 | 2 | 3} */
  let level = 0;
  if (acceptable && distinct >= 5) level = bits >= 90 ? 3 : bits >= 70 ? 2 : bits >= 50 ? 1 : 0;
  return { length, level, bits, acceptable };
}
