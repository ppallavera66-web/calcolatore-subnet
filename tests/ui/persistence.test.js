// @ts-check
/**
 * Persistenza locale (specifica tecnica, 8.3) con un localStorage in memoria:
 * salvataggio immediato e ritardato, solo con l'interruttore acceso, spegnimento, avvio con
 * validazione, dati illeggibili, spazio esaurito, più schede.
 */
import { describe, test, expect } from 'vitest';
import { createPersistence, SAVE_DELAY } from '../../src/ui/persistence.js';
import { createStorage, memoryBackend, KEYS } from '../../src/storage/storage.js';
import { createStore, initialState, setSetting, addHistory, addPlan, setPlanLabel, updatePlan, removePlan, cleanPlanText } from '../../src/ui/state.js';

const NOW = '2026-11-19T10:00:00.000Z';

/** Programmatore manuale dei timer: `run()` esegue quelli in attesa. */
function fakeTimers() {
  /** @type {Map<number, { fn: () => void, ms: number }>} */
  const pending = new Map();
  let id = 0;
  return {
    schedule: (/** @type {() => void} */ fn, /** @type {number} */ ms) => {
      pending.set(++id, { fn, ms });
      return id;
    },
    cancel: (/** @type {number} */ h) => { pending.delete(h); },
    pending,
    async run() {
      const items = [...pending.values()];
      pending.clear();
      for (const it of items) it.fn();
      await new Promise((r) => setTimeout(r, 0));
    },
  };
}

/** Finestra minima con l'evento storage. */
function fakeWin() {
  /** @type {Set<(e: any) => void>} */
  const ls = new Set();
  return {
    addEventListener: (/** @type {string} */ _t, /** @type {any} */ fn) => ls.add(fn),
    removeEventListener: (/** @type {string} */ _t, /** @type {any} */ fn) => ls.delete(fn),
    fire: async (/** @type {string | null} */ key) => {
      for (const fn of ls) fn({ key });
      await new Promise((r) => setTimeout(r, 0));
    },
    size: () => ls.size,
  };
}

function setup(/** @type {{ backend?: Storage, quota?: number }} */ o = {}) {
  const backend = o.backend ?? memoryBackend({ quota: o.quota });
  const storage = createStorage(() => backend);
  const store = createStore(initialState());
  const timers = fakeTimers();
  const win = fakeWin();
  /** @type {any[]} */
  const events = [];
  const p = createPersistence({ store, storage, now: () => NOW, win, onEvent: (e) => events.push(e), schedule: timers.schedule, cancel: timers.cancel });
  return { backend, storage, store, timers, win, events, p };
}

const entry = (/** @type {number} */ i) => ({ fn: 'F04', input: { ip: `10.0.${i >> 8}.${i & 255}` } });
const hmeta = (/** @type {number} */ i) => ({ id: `id${String(i).padStart(10, '0')}`, now: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString() });
const plan = (/** @type {string} */ id) => ({ id, type: /** @type {const} */ ('subdivision'), name: `Piano ${id}`, createdAt: NOW, updatedAt: NOW, notes: '', input: { block: '10.0.0.0', prefix: 24, newPrefix: 26 }, labels: {} });

describe('persistenza (8.3)', () => {
  test('spento (default): nessuna chiave nel browser, anche dopo modifiche', async () => {
    const { backend, store, timers, p } = setup();
    expect(await p.start()).toBe('empty');
    store.set((s) => addHistory(s, entry(1), hmeta(1)));
    store.set((s) => setSetting(s, 'theme', 'dark'));
    await timers.run();
    expect(backend.length).toBe(0);
    expect(timers.pending.size).toBe(0);
  });

  test('acceso: salvataggio immediato, poi ritardato di 300 ms e solo delle chiavi cambiate', async () => {
    const { backend, store, timers, p } = setup();
    await p.start();
    store.set((s) => addHistory(s, entry(1), hmeta(1)));
    expect(await p.enable()).toBe(true);
    expect(JSON.parse(/** @type {string} */ (backend.getItem(KEYS.settings)))).toMatchObject({ theme: 'auto', persist: true });
    expect(JSON.parse(/** @type {string} */ (backend.getItem(KEYS.history)))).toHaveLength(1);
    expect(JSON.parse(/** @type {string} */ (backend.getItem(KEYS.meta)))).toEqual({ schema: 1, savedAt: NOW });
    expect(p.status().savedAt).toBe(NOW);

    const before = /** @type {string} */ (backend.getItem(KEYS.settings));
    store.set((s) => addHistory(s, entry(2), hmeta(2)));
    store.set((s) => addHistory(s, entry(3), hmeta(3)));
    expect([...timers.pending.values()].map((x) => x.ms)).toEqual([SAVE_DELAY]);
    expect(JSON.parse(/** @type {string} */ (backend.getItem(KEYS.history)))).toHaveLength(1);
    await timers.run();
    expect(JSON.parse(/** @type {string} */ (backend.getItem(KEYS.history)))).toHaveLength(3);
    expect(backend.getItem(KEYS.settings)).toBe(before);
    // il metodo per funzione e gli input delle viste non si salvano
    expect(backend.getItem(KEYS.settings)).not.toContain('methods');
  });

  test('spegnimento: chiavi cancellate, dati della visita in memoria, nessun salvataggio successivo', async () => {
    const { backend, store, timers, p } = setup();
    await p.start();
    await p.enable();
    store.set((s) => addHistory(s, entry(1), hmeta(1)));
    expect(await p.disable()).toBe(true);
    expect(backend.length).toBe(0);
    expect(store.get().history).toHaveLength(1);
    expect(store.get().settings.persist).toBe(false);
    await timers.run();
    expect(backend.length).toBe(0);
  });

  test('avvio: caricamento validato (impostazioni, cronologia, piani) e tema subito disponibile', async () => {
    const a = setup();
    await a.p.start();
    a.store.set((s) => setSetting(setSetting(s, 'theme', 'contrast'), 'didactic', true));
    a.store.set((s) => addPlan(addHistory(s, entry(7), hmeta(7)), plan('p1')));
    await a.p.enable();

    const b = setup({ backend: a.backend });
    expect(await b.p.start()).toBe('loaded');
    expect(b.store.get().settings).toMatchObject({ theme: 'contrast', didactic: true, persist: true });
    expect(b.store.get().history.map((h) => h.input)).toEqual([{ ip: '10.0.0.7' }]);
    expect(b.store.get().plans.map((x) => x.id)).toEqual(['p1']);
    expect(b.p.status()).toMatchObject({ load: 'loaded', savedAt: NOW, skipped: 0 });
    // il caricamento non provoca scritture
    const writes = a.backend.getItem(KEYS.meta);
    await b.timers.run();
    expect(a.backend.getItem(KEYS.meta)).toBe(writes);
  });

  test('avvio: voci non valide scartate e contate', async () => {
    const backend = memoryBackend();
    backend.setItem(KEYS.meta, JSON.stringify({ schema: 1, savedAt: NOW }));
    backend.setItem(KEYS.settings, JSON.stringify({ theme: 'rosa', persist: true }));
    backend.setItem(KEYS.history, JSON.stringify([{ id: 'a', at: NOW, fn: 'F04', input: { ip: '10.0.0.1' } }, { id: 'b', at: NOW, fn: 'F04', input: { ip: 'x' } }]));
    const { p, store } = setup({ backend });
    expect(await p.start()).toBe('loaded');
    expect(p.status().skipped).toBe(2);
    expect(store.get().settings.theme).toBe('auto');
    expect(store.get().history).toHaveLength(1);
  });

  test.each([
    ['JSON rotto', (/** @type {Storage} */ b) => b.setItem(KEYS.history, '{rotto')],
    ['meta rotto', (/** @type {Storage} */ b) => b.setItem(KEYS.meta, '{rotto')],
    ['schema non valido', (/** @type {Storage} */ b) => b.setItem(KEYS.meta, JSON.stringify({ schema: 'uno' }))],
    ['meta non oggetto', (/** @type {Storage} */ b) => b.setItem(KEYS.meta, '5')],
  ])('avvio con dati illeggibili (%s): si ignorano e si segnala', async (_n, spoil) => {
    const backend = memoryBackend();
    backend.setItem(KEYS.meta, JSON.stringify({ schema: 1, savedAt: NOW }));
    spoil(backend);
    const { p, store } = setup({ backend });
    expect(await p.start()).toBe('corrupt');
    expect(store.get().settings.persist).toBe(false);
    expect(await p.clearStored()).toBe(true);
    expect(backend.length).toBe(0);
    expect(p.status().load).toBe('empty');
  });

  test('avvio con dati di una versione successiva', async () => {
    const backend = memoryBackend();
    backend.setItem(KEYS.meta, JSON.stringify({ schema: 9, savedAt: NOW }));
    const { p } = setup({ backend });
    expect(await p.start()).toBe('newer');
  });

  test('storage rifiutato: l\'app continua senza salvare', async () => {
    const { p, store } = setup({ backend: memoryBackend({ fail: true }) });
    expect(await p.start()).toBe('unavailable');
    expect(p.status().available).toBe(false);
    expect(await p.enable()).toBe(false);
    expect(store.get().settings.persist).toBe(false);
  });

  test('spazio esaurito: cronologia ridotta a 100 voci e nuovo tentativo, poi avviso', async () => {
    // spazio per circa 150 voci: 200 non entrano, 100 sì
    const { p, store, events, backend } = setup({ quota: 15000 });
    await p.start();
    for (let i = 0; i < 200; i++) store.set((s) => addHistory(s, entry(i), hmeta(i)));
    expect(await p.enable()).toBe(true);
    expect(events).toContainEqual({ type: 'quota-trimmed', dropped: 100 });
    expect(store.get().history).toHaveLength(100);
    expect(JSON.parse(/** @type {string} */ (backend.getItem(KEYS.history)))).toHaveLength(100);

    const tiny = setup({ quota: 300 });
    await tiny.p.start();
    for (let i = 0; i < 120; i++) tiny.store.set((s) => addHistory(s, entry(i), hmeta(i)));
    expect(await tiny.p.enable()).toBe(false);
    expect(tiny.events).toContainEqual({ type: 'quota-failed' });
    expect(tiny.p.status().problem).toBe('quota');
  });

  test('più schede: l\'evento storage ricarica; spegnimento altrove → si smette di salvare', async () => {
    const a = setup();
    await a.p.start();
    await a.p.enable();
    const b = setup({ backend: a.backend });
    await b.p.start();
    expect(b.win.size()).toBe(1);

    a.store.set((s) => addHistory(s, entry(5), hmeta(5)));
    await a.timers.run();
    await b.win.fire(KEYS.history);
    expect(b.store.get().history.map((h) => h.input.ip)).toEqual(['10.0.0.5']);
    expect(b.events).toContainEqual({ type: 'external', persist: true });
    // la scheda B non riscrive ciò che ha appena letto
    await b.timers.run();
    expect(b.timers.pending.size).toBe(0);

    await b.win.fire('altra-pagina:chiave');
    await a.p.disable();
    await b.win.fire(null);
    expect(b.store.get().settings.persist).toBe(false);
    expect(b.store.get().history).toHaveLength(1);
    expect(b.events).toContainEqual({ type: 'external', persist: false });
    b.p.destroy();
    expect(b.win.size()).toBe(0);
  });

  test('più schede: con il salvataggio spento i dati della visita restano; accendendo si uniscono a quelli salvati (revisione B1)', async () => {
    const a = setup();
    await a.p.start();
    const b = setup({ backend: a.backend });
    await b.p.start();
    for (let i = 1; i <= 3; i++) b.store.set((s) => addHistory(s, entry(i), hmeta(i)));
    b.store.set((s) => addPlan(s, plan('importante')));

    a.store.set((s) => addHistory(s, entry(9), hmeta(9)));
    await a.p.enable();
    await b.win.fire(KEYS.history);
    expect(b.store.get().settings.persist).toBe(false);
    expect(b.store.get().history).toHaveLength(3);
    expect(b.store.get().plans.map((x) => x.id)).toEqual(['importante']);
    expect(b.events).toEqual([]);

    expect(await b.p.enable()).toBe(true);
    const ips = b.store.get().history.map((h) => h.input.ip);
    expect(ips).toEqual(['10.0.0.9', '10.0.0.3', '10.0.0.2', '10.0.0.1']);
    expect(JSON.parse(/** @type {string} */ (a.backend.getItem(KEYS.history)))).toHaveLength(4);
    expect(JSON.parse(/** @type {string} */ (a.backend.getItem(KEYS.plans))).map((/** @type {any} */ x) => x.id)).toEqual(['importante']);
  });

  test('dati salvati di una versione successiva o illeggibili: needsOverwrite li segnala prima di accendere (revisione B2)', async () => {
    const backend = memoryBackend();
    backend.setItem(KEYS.meta, JSON.stringify({ schema: 9, savedAt: NOW }));
    backend.setItem(KEYS.plans, JSON.stringify([{ id: 'v9' }]));
    const { p } = setup({ backend });
    await p.start();
    expect(await p.needsOverwrite()).toBe('newer');
    expect(backend.getItem(KEYS.plans)).toContain('v9');
    expect(await p.enable()).toBe(true);
    expect(p.status().load).toBe('loaded');
    expect(await p.needsOverwrite()).toBe(null);

    const bad = memoryBackend();
    bad.setItem(KEYS.meta, '{rotto');
    const c = setup({ backend: bad });
    await c.p.start();
    expect(await c.p.needsOverwrite()).toBe('corrupt');
    const empty = setup();
    await empty.p.start();
    expect(await empty.p.needsOverwrite()).toBe(null);
  });

  test('flushNow scrive subito ciò che è in attesa; usage', async () => {
    const { p, store, backend } = setup();
    await p.start();
    await p.enable();
    store.set((s) => addPlan(s, plan('x')));
    await p.flushNow();
    expect(JSON.parse(/** @type {string} */ (backend.getItem(KEYS.plans)))).toHaveLength(1);
    await p.flushNow();
    const u = await p.usage();
    expect(u.ok && u.keys).toBe(4);
  });
});

describe('piani nello stato', () => {
  test('aggiunta, modifica, etichette, rimozione', () => {
    let s = addPlan(initialState(), plan('a'));
    s = addPlan(s, plan('b'));
    expect(s.plans.map((x) => x.id)).toEqual(['b', 'a']);
    const later = '2026-11-20T00:00:00.000Z';
    s = updatePlan(s, 'a', { name: 'Nuovo' }, later);
    expect(s.plans[1]).toMatchObject({ name: 'Nuovo', updatedAt: later });
    expect(updatePlan(s, 'a', { name: 'Nuovo' }, later)).toBe(s);
    expect(updatePlan(s, 'zzz', { name: 'x' }, later)).toBe(s);
    s = setPlanLabel(s, 'a', 3, ' VLAN 40 ', later);
    expect(s.plans[1].labels).toEqual({ 3: ' VLAN 40 ' });
    expect(setPlanLabel(s, 'a', 3, ' VLAN 40 ', later)).toBe(s);
    expect(setPlanLabel(s, 'zzz', 3, 'x', later)).toBe(s);
    s = setPlanLabel(s, 'a', 2, `x\u0007${'y'.repeat(100)}`, later);
    expect(s.plans[1].labels[2]).toHaveLength(80);
    expect(s.plans[1].labels[2].startsWith('x y')).toBe(true);
    s = setPlanLabel(s, 'a', 3, '   ', later);
    expect(Object.keys(s.plans[1].labels)).toEqual(['2']);
    s = removePlan(s, 'b');
    expect(s.plans.map((x) => x.id)).toEqual(['a']);
    expect(removePlan(s, 'b')).toBe(s);
  });

  test('al massimo 100 piani e 4.096 etichette', () => {
    let s = initialState();
    for (let i = 0; i < 100; i++) s = addPlan(s, plan(`p${i}`));
    expect(() => addPlan(s, plan('extra'))).toThrow(RangeError);
    const labels = Object.fromEntries(Array.from({ length: 4096 }, (_, i) => [String(i), 'x']));
    let t = addPlan(initialState(), { ...plan('big'), labels });
    expect(setPlanLabel(t, 'big', 5000, 'y', NOW)).toBe(t);
    t = setPlanLabel(t, 'big', 1, 'z', NOW);
    expect(t.plans[0].labels[1]).toBe('z');
  });

  test('nome e note: pulizia e limiti', () => {
    expect(cleanPlanText('  Sede\tvia Celoria ', 'riga 1\r\nriga 2')).toEqual({ name: 'Sede via Celoria', notes: 'riga 1\nriga 2' });
    expect(cleanPlanText('   ', '')).toBeNull();
    expect(cleanPlanText('x'.repeat(81), '')).toBeNull();
    expect(cleanPlanText('x', 'n'.repeat(2001))).toBeNull();
    expect(cleanPlanText('😀'.repeat(80), '')).not.toBeNull();
  });
});
