// @ts-check
import { describe, test, expect } from 'vitest';
import { createStorage, memoryBackend, isQuotaError, isAppKey, KEYS, PREFIX } from '../../src/storage/storage.js';

describe('adattatore di persistenza (8.1, 8.2)', () => {
  test('chiavi con il prefisso subnetcalc:v1:', () => {
    for (const k of Object.values(KEYS)) expect(k.startsWith(`${PREFIX}v1:`)).toBe(true);
    expect(isAppKey(KEYS.meta)).toBe(true);
    expect(isAppKey('altro:chiave')).toBe(false);
  });

  test('scrittura, lettura, rimozione', async () => {
    const b = memoryBackend();
    const s = createStorage(() => b);
    expect(await s.isAvailable()).toBe(true);
    expect(await s.get(KEYS.settings)).toEqual({ ok: true });
    expect(await s.set(KEYS.settings, { theme: 'dark' })).toEqual({ ok: true });
    expect(await s.get(KEYS.settings)).toEqual({ ok: true, value: { theme: 'dark' } });
    expect(await s.remove(KEYS.settings)).toEqual({ ok: true });
    expect(await s.get(KEYS.settings)).toEqual({ ok: true });
  });

  test('clearAll cancella solo le chiavi dell\'app; usage le conta', async () => {
    const b = memoryBackend();
    b.setItem('altra-pagina', 'x');
    const s = createStorage(() => b);
    await s.set(KEYS.meta, { schema: 1 });
    await s.set(KEYS.history, []);
    const u = await s.usage();
    expect(u.ok && u.keys).toBe(2);
    expect(u.ok && u.bytes).toBe((KEYS.meta.length + '{"schema":1}'.length + KEYS.history.length + 2) * 2);
    expect(await s.clearAll()).toEqual({ ok: true, removed: 2 });
    expect(b.getItem('altra-pagina')).toBe('x');
    expect(b.length).toBe(1);
  });

  test('dati illeggibili: corrupt', async () => {
    const b = memoryBackend();
    b.setItem(KEYS.plans, '{non json');
    const s = createStorage(() => b);
    expect(await s.get(KEYS.plans)).toEqual({ ok: false, reason: 'corrupt' });
  });

  test('spazio esaurito: quota', async () => {
    const s = createStorage(() => memoryBackend({ quota: 60 }));
    expect(await s.set(KEYS.meta, 'a')).toEqual({ ok: true });
    expect(await s.set(KEYS.history, 'x'.repeat(100))).toEqual({ ok: false, reason: 'quota' });
    expect(await s.isAvailable()).toBe(true);
  });

  test('storage rifiutato: tutto unavailable, nessuna eccezione', async () => {
    for (const getBackend of [() => memoryBackend({ fail: true }), () => null, () => { throw new Error('SecurityError'); }]) {
      const s = createStorage(/** @type {any} */ (getBackend));
      expect(await s.isAvailable()).toBe(false);
      expect(await s.get(KEYS.meta)).toEqual({ ok: false, reason: 'unavailable' });
      expect(await s.set(KEYS.meta, 1)).toEqual({ ok: false, reason: 'unavailable' });
      expect(await s.remove(KEYS.meta)).toEqual({ ok: false, reason: 'unavailable' });
      expect(await s.clearAll()).toEqual({ ok: false, reason: 'unavailable' });
      expect(await s.usage()).toEqual({ ok: false, reason: 'unavailable' });
    }
  });

  test('isQuotaError riconosce le varianti dei browser', () => {
    expect(isQuotaError({ name: 'QuotaExceededError' })).toBe(true);
    expect(isQuotaError({ name: 'NS_ERROR_DOM_QUOTA_REACHED' })).toBe(true);
    expect(isQuotaError({ code: 22 })).toBe(true);
    expect(isQuotaError({ code: 1014 })).toBe(true);
    expect(isQuotaError(new Error('x'))).toBe(false);
    expect(isQuotaError(null)).toBe(false);
    expect(isQuotaError('QuotaExceededError')).toBe(false);
  });

  test('il backend predefinito è globalThis.localStorage (assente in Node)', async () => {
    const s = createStorage();
    expect(typeof (await s.isAvailable())).toBe('boolean');
  });
});
