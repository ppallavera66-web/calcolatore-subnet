// @ts-check
/**
 * Busta cifrata (specifica tecnica, 7; test della 10.4): andata e ritorno; passphrase errata;
 * data, iv, salt, iterations alterati (devono fallire grazie all'AAD); iterazioni fuori intervallo;
 * lunghezze sbagliate; base64 non canonico; robustezza della passphrase.
 * Node ha `crypto.subtle`, quindi i test girano senza browser.
 */
import { describe, test, expect, beforeAll } from 'vitest';
import {
  encryptSession, decryptEnvelope, checkEnvelope, cryptoAvailable, passphraseStrength, aadOf, toBase64, fromBase64,
  DEFAULT_ITERATIONS, MIN_ITERATIONS, MAX_ITERATIONS, KDF_NAME, CIPHER_NAME,
} from '../../src/session/envelope.js';
import { buildSession, readSessionText } from '../../src/session/session.js';

const NOW = '2026-11-19T10:00:00.000Z';
const PASS = 'cavallo batteria graffetta 42';
const SESSION = buildSession(
  {
    settings: { theme: 'contrast', didactic: true, didacticMethod: 'multiples', exportBar: false },
    history: [{ id: 'h1', at: NOW, fn: 'F01', input: { ip: '172.16.45.200', prefix: 20 } }],
    plans: [{ id: 'p1', type: 'subdivision', name: 'Sede · è ü 😀', createdAt: NOW, updatedAt: NOW, notes: 'riga 1\nriga 2', input: { block: '10.40.0.0', prefix: 16, newPrefix: 24 }, labels: { 10: 'VLAN 10' } }],
  },
  { now: NOW, appName: 'Calcolatore Subnet', appVersion: '0.1.0' },
);

/** @type {Record<string, any>} */
let env;
beforeAll(async () => {
  env = await encryptSession(SESSION, PASS);
});

/** Copia profonda con una modifica. */
const tamper = (/** @type {(e: any) => void} */ fn) => {
  const e = structuredClone(env);
  fn(e);
  return e;
};

/** Cambia un carattere base64 mantenendo la forma canonica (cambia un byte, non il padding). */
const flip = (/** @type {string} */ b64) => {
  const bytes = /** @type {Uint8Array} */ (fromBase64(b64));
  bytes[0] ^= 1;
  return toBase64(bytes);
};

describe('busta cifrata: formato (7.1, 7.2)', () => {
  test('intestazione come nella 4.1 delle specifiche; sale 16 byte, IV 12 byte', () => {
    expect(Object.keys(env)).toEqual(['format', 'version', 'kdf', 'cipher', 'data']);
    expect(env).toMatchObject({ format: 'subnetcalc-encrypted', version: 1, kdf: { name: KDF_NAME, iterations: DEFAULT_ITERATIONS }, cipher: { name: CIPHER_NAME } });
    expect(fromBase64(env.kdf.salt)).toHaveLength(16);
    expect(fromBase64(env.cipher.iv)).toHaveLength(12);
    // testo cifrato + tag di 16 byte
    expect(fromBase64(env.data)?.length).toBe(new TextEncoder().encode(JSON.stringify(SESSION)).length + 16);
    expect(JSON.stringify(env)).not.toContain('Sede');
    expect(JSON.stringify(env)).not.toContain(PASS);
  });

  test('sale e IV nuovi a ogni export', async () => {
    const other = await encryptSession(SESSION, PASS);
    expect(other.kdf.salt).not.toBe(env.kdf.salt);
    expect(other.cipher.iv).not.toBe(env.cipher.iv);
    expect(other.data).not.toBe(env.data);
  });

  test('AAD: JSON di un array a ordine fisso', () => {
    const aad = new TextDecoder().decode(aadOf(/** @type {any} */ (env)));
    expect(JSON.parse(aad)).toEqual(['subnetcalc-encrypted', 1, KDF_NAME, DEFAULT_ITERATIONS, env.kdf.salt, CIPHER_NAME, env.cipher.iv]);
  });
});

describe('busta cifrata: AAD usata davvero in cifratura e decifratura (revisione I5)', () => {
  /** Chiave derivata in modo indipendente dal modulo. */
  const keyFor = async (/** @type {Record<string, any>} */ e, /** @type {KeyUsage} */ usage) => {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(PASS), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: /** @type {BufferSource} */ (fromBase64(e.kdf.salt)), iterations: e.kdf.iterations }, base, { name: 'AES-GCM', length: 256 }, false, [usage]);
  };

  test('il file si decifra con l\'AAD della 7.2 e non senza (la cifratura la usa)', async () => {
    const key = await keyFor(env, 'decrypt');
    const iv = /** @type {BufferSource} */ (fromBase64(env.cipher.iv));
    const data = /** @type {BufferSource} */ (fromBase64(env.data));
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: /** @type {BufferSource} */ (aadOf(/** @type {any} */ (env))), tagLength: 128 }, key, data);
    expect(new TextDecoder().decode(plain)).toBe(JSON.stringify(SESSION));
    await expect(crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, data)).rejects.toThrow();
  });

  test('un file cifrato senza AAD viene rifiutato (la decifratura la usa)', async () => {
    const key = await keyFor(env, 'encrypt');
    const iv = /** @type {BufferSource} */ (fromBase64(env.cipher.iv));
    const forged = { ...structuredClone(env), data: toBase64(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, new TextEncoder().encode(JSON.stringify(SESSION))))) };
    const r = await decryptEnvelope(forged, PASS);
    expect(r.ok).toBe(false);
  });
});

describe('busta cifrata: decifratura (7.3)', () => {
  test('andata e ritorno: la sessione torna identica e passa la 6.3', async () => {
    const r = await decryptEnvelope(env, PASS);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(JSON.parse(r.text)).toEqual(SESSION);
    const s = readSessionText(r.text, { allowEncrypted: false });
    expect(s.ok && s.kind === 'session' && s.data.plans[0].name).toBe('Sede · è ü 😀');
  });

  test('il file letto dal testo viene riconosciuto come busta', () => {
    const r = readSessionText(JSON.stringify(env));
    expect(r.ok && r.kind).toBe('encrypted');
  });

  test('passphrase errata → "Passphrase errata o file danneggiato"', async () => {
    expect(await decryptEnvelope(env, `${PASS}x`)).toEqual({ ok: false, error: { code: 'IMPORT_DECRYPT_FAILED', params: {} } });
    expect(await decryptEnvelope(env, '')).toMatchObject({ ok: false, error: { code: 'IMPORT_DECRYPT_FAILED' } });
  });

  test.each([
    ['data', (/** @type {any} */ e) => { e.data = flip(e.data); }],
    ['iv', (/** @type {any} */ e) => { e.cipher.iv = flip(e.cipher.iv); }],
    ['salt', (/** @type {any} */ e) => { e.kdf.salt = flip(e.kdf.salt); }],
    ['iterations (+1, ancora nell\'intervallo)', (/** @type {any} */ e) => { e.kdf.iterations += 1; }],
    ['tag (ultimo byte)', (/** @type {any} */ e) => {
      const b = /** @type {Uint8Array} */ (fromBase64(e.data));
      b[b.length - 1] ^= 0x80;
      e.data = toBase64(b);
    }],
  ])('%s alterato → la decifratura fallisce', async (_name, fn) => {
    const r = await decryptEnvelope(tamper(fn), PASS);
    expect(r).toEqual({ ok: false, error: { code: 'IMPORT_DECRYPT_FAILED', params: {} } });
  }, 20000);

  test.each([
    ['format', (/** @type {any} */ e) => { e.format = 'altro'; }],
    ['version', (/** @type {any} */ e) => { e.version = 2; }],
    ['kdf.name', (/** @type {any} */ e) => { e.kdf.name = 'PBKDF2-SHA-1'; }],
    ['kdf.name', (/** @type {any} */ e) => { e.kdf = 'x'; }],
    ['kdf.iterations', (/** @type {any} */ e) => { e.kdf.iterations = MIN_ITERATIONS - 1; }],
    ['kdf.iterations', (/** @type {any} */ e) => { e.kdf.iterations = MAX_ITERATIONS + 1; }],
    ['kdf.iterations', (/** @type {any} */ e) => { e.kdf.iterations = '600000'; }],
    ['kdf.iterations', (/** @type {any} */ e) => { e.kdf.iterations = 600000.5; }],
    ['kdf.salt', (/** @type {any} */ e) => { e.kdf.salt = toBase64(new Uint8Array(15)); }],
    ['kdf.salt', (/** @type {any} */ e) => { e.kdf.salt = 'non base64!'; }],
    ['cipher.name', (/** @type {any} */ e) => { e.cipher.name = 'AES-128-GCM'; }],
    ['cipher.iv', (/** @type {any} */ e) => { e.cipher.iv = toBase64(new Uint8Array(16)); }],
    ['cipher.iv', (/** @type {any} */ e) => { e.cipher.iv = e.cipher.iv.slice(0, -1); }],
    ['data', (/** @type {any} */ e) => { e.data = toBase64(new Uint8Array(15)); }],
    ['data', (/** @type {any} */ e) => { e.data = 5; }],
    ['data', (/** @type {any} */ e) => { delete e.data; }],
  ])('intestazione non valida (%s) → IMPORT_BAD_ENVELOPE senza chiedere la passphrase', async (field, fn) => {
    const bad = tamper(fn);
    expect(checkEnvelope(bad)).toEqual({ ok: false, error: { code: 'IMPORT_BAD_ENVELOPE', params: { field } } });
    expect(await decryptEnvelope(bad, PASS)).toEqual({ ok: false, error: { code: 'IMPORT_BAD_ENVELOPE', params: { field } } });
  });

  test.each([
    ['hint', (/** @type {any} */ e) => { e.hint = 'la passphrase è il nome del gatto'; }],
    ['kdf.memory', (/** @type {any} */ e) => { e.kdf.memory = 65536; }],
    ['cipher.tagLength', (/** @type {any} */ e) => { e.cipher.tagLength = 96; }],
    ['__proto__', (/** @type {any} */ e) => { Object.defineProperty(e, '__proto__', { value: 1, enumerable: true }); }],
  ])('revisione M4: campo in più non autenticato (%s) → IMPORT_BAD_ENVELOPE senza chiedere la passphrase', async (field, fn) => {
    const bad = tamper(fn);
    const expected = { ok: false, error: { code: 'IMPORT_BAD_ENVELOPE', params: { field, unexpected: true } } };
    expect(checkEnvelope(bad)).toEqual(expected);
    expect(await decryptEnvelope(bad, PASS)).toEqual(expected);
    // la stessa busta senza il campo in più si decifra
    expect((await decryptEnvelope(env, PASS)).ok).toBe(true);
  });

  test('revisione M4: anche dal testo del file (JSON.parse), con un campo in più alla radice', async () => {
    const text = JSON.stringify({ ...env, note: 'x' });
    expect(checkEnvelope(JSON.parse(text))).toMatchObject({ ok: false, error: { params: { field: 'note', unexpected: true } } });
  });

  test('busta non oggetto', () => {
    expect(checkEnvelope(null)).toMatchObject({ ok: false, error: { params: { field: 'format' } } });
    expect(checkEnvelope([env])).toMatchObject({ ok: false });
  });

  test('iterazioni ammesse da 600.000 a 10.000.000: un file con più iterazioni si decifra', async () => {
    const e = await encryptSession(SESSION, PASS, { iterations: 700000 });
    expect(e.kdf.iterations).toBe(700000);
    expect((await decryptEnvelope(e, PASS)).ok).toBe(true);
  }, 20000);

  test('un contenuto decifrato che è a sua volta una busta viene rifiutato', async () => {
    const nested = await encryptSession(env, PASS);
    const r = await decryptEnvelope(nested, PASS);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = readSessionText(r.text, { allowEncrypted: false });
    expect(!s.ok && s.error.code).toBe('IMPORT_NESTED_ENVELOPE');
  }, 20000);
});

describe('Web Crypto assente (contesto non sicuro)', () => {
  test('cryptoAvailable', () => {
    expect(cryptoAvailable()).toBe(true);
    expect(cryptoAvailable(undefined)).toBe(true); // valore predefinito: globalThis.crypto
    expect(cryptoAvailable(/** @type {any} */ ({}))).toBe(false);
    expect(cryptoAvailable(/** @type {any} */ ({ subtle: {} }))).toBe(false);
  });

  test('export e import si fermano con IMPORT_CRYPTO_UNAVAILABLE', async () => {
    const noSubtle = /** @type {any} */ ({ getRandomValues: (/** @type {Uint8Array} */ a) => a });
    await expect(encryptSession(SESSION, PASS, { crypto: noSubtle })).rejects.toThrow('IMPORT_CRYPTO_UNAVAILABLE');
    expect(await decryptEnvelope(env, PASS, { crypto: noSubtle })).toEqual({ ok: false, error: { code: 'IMPORT_CRYPTO_UNAVAILABLE', params: {} } });
  });
});

describe('base64', () => {
  test('andata e ritorno, anche oltre 32 KB', () => {
    const big = new Uint8Array(100000).map((_, i) => (i * 31) & 255);
    expect(fromBase64(toBase64(big))).toEqual(big);
    expect(toBase64(new Uint8Array([]))).toBe('');
  });

  test('forma non canonica o non valida → null', () => {
    expect(fromBase64('QQ==')).toEqual(new Uint8Array([65]));
    expect(fromBase64('QR==')).toBeNull(); // bit di riempimento non nulli
    expect(fromBase64('QQ')).toBeNull(); // senza padding
    expect(fromBase64('QQ=A')).toBeNull();
    expect(fromBase64('Q-_A')).toBeNull(); // base64url
    expect(fromBase64(42)).toBeNull();
  });
});

describe('robustezza della passphrase (7.4)', () => {
  test.each([
    ['', 0, false],
    ['corta', 0, false],
    ['Abc123!?xyz', 0, false], // 11 caratteri
    ['aaaaaaaaaaaaaaaaaaaa', 0, true], // lunga ma ripetitiva
    ['abcdefghijkl', 1, true],
    ['abcdefghijklmnop', 2, true],
    ['Abcdef12!?xyz', 2, true],
    ['cavallo batteria graffetta', 3, true],
    ['Tr0ub4dor&3-cavallo-batteria', 3, true],
  ])('"%s" → livello %i', (p, level, acceptable) => {
    const s = passphraseStrength(p);
    expect(s.level).toBe(level);
    expect(s.acceptable).toBe(acceptable);
  });

  test('la lunghezza conta i caratteri Unicode, non le unità UTF-16', () => {
    const s = passphraseStrength('😀😀😀😀😀😀😀😀😀😀😀😀');
    expect(s.length).toBe(12);
    expect(s.acceptable).toBe(true);
    expect(passphraseStrength('😀😀😀😀😀😀').acceptable).toBe(false);
    expect(passphraseStrength('çàèìòù€ßøåñü').level).toBeGreaterThan(0);
  });
});
