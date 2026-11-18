// @ts-check
import { describe, test, expect, vi } from 'vitest';
import { parseHash, buildHash, routeTo, cleanParams, inverseCase, createRouter, SECTIONS, VIEW_PARAMS, MAX_PARAM_LENGTH } from '../../src/ui/router.js';

/** Finestra finta: frammento, cronologia, eventi hashchange. */
function fakeWindow(hash = '') {
  /** @type {(() => void)[]} */
  const listeners = [];
  let current = hash;
  const fire = () => listeners.slice().forEach((fn) => fn());
  /** Sostituisce la voce corrente senza crearne una nuova. */
  const swap = (/** @type {string} */ url) => {
    current = url;
    win.entries[win.entries.length - 1] = url;
    win.replaced.push(url);
  };
  const win = {
    entries: [hash],
    replaced: /** @type {string[]} */ ([]),
    location: {
      // l'assegnazione di location.hash crea una voce e scatena l'evento (in modo asincrono, come nel browser)
      get hash() {
        return current;
      },
      set hash(v) {
        if (v === current) return;
        current = v;
        win.entries.push(v);
        queueMicrotask(fire);
      },
      /** location.replace: sostituisce la voce e scatena l'evento */
      replace(/** @type {string} */ url) {
        swap(url);
        fire();
      },
    },
    history: {
      state: null,
      /** @type {(d: any, u: string, url: string) => void} */
      replaceState: (_d, _u, url) => swap(url),
    },
    addEventListener: (/** @type {string} */ _t, /** @type {() => void} */ fn) => listeners.push(fn),
    removeEventListener: (/** @type {string} */ _t, /** @type {() => void} */ fn) => listeners.splice(listeners.indexOf(fn), 1),
    /** Simula l'utente che cambia frammento (collegamento, tasto indietro): nuova voce ed evento. */
    go(/** @type {string} */ h) {
      current = h;
      win.entries.push(h);
      fire();
    },
    listenerCount: () => listeners.length,
  };
  return win;
}

describe('lettura e scrittura del frammento (9.3)', () => {
  test.each([
    ['#/calcola/analisi?ip=172.16.45.200&p=20', 'calcola/analisi', { ip: '172.16.45.200', p: '20' }],
    ['#/calcola/conversioni?n=203&b=10', 'calcola/conversioni', { n: '203', b: '10' }],
    ['#/calcola/mask?m=255.255.250.0', 'calcola/mask', { m: '255.255.250.0' }],
    ['#/calcola/stessa?a=10.1.63.5&pa=19&b=10.1.64.5&pb=19', 'calcola/stessa', { a: '10.1.63.5', pa: '19', b: '10.1.64.5', pb: '19' }],
    ['#/pianifica/inverso?h=50', 'pianifica/inverso', { h: '50' }],
    ['#/pianifica/inverso?p=16&s=6', 'pianifica/inverso', { p: '16', s: '6' }],
    ['#/pianifica/inverso?h=20&p=24&s=8', 'pianifica/inverso', { p: '24', h: '20', s: '8' }],
    ['#/pianifica/suddivisione?b=10.0.0.0&p=16&np=19&pg=0', 'pianifica/suddivisione', { b: '10.0.0.0', p: '16', np: '19', pg: '0' }],
    ['#/pianifica/piani', 'pianifica/piani', {}],
    ['#/impostazioni', 'impostazioni', {}],
  ])('%s', (hash, view, params) => {
    const { route, canonical } = parseHash(hash);
    expect(route.view).toBe(view);
    expect(route.params).toEqual(params);
    expect(canonical).toBe(true);
    expect(buildHash(route)).toBe(hash);
  });

  test('guide con l\'ancora del capitolo', () => {
    const { route, canonical } = parseHash('#/guide/subnetting/cap-9');
    expect(route).toMatchObject({ section: 'guide', tab: 'subnetting', anchor: 'cap-9', params: {} });
    expect(canonical).toBe(true);
    expect(parseHash('#/guide/uso/analisi').route.anchor).toBe('analisi');
  });

  test('indirizzo vuoto o sconosciuto → Analisi; sezione senza scheda → prima scheda', () => {
    for (const h of ['', '#', '#/', '#/sconosciuta', '#/calcola/inesistente', 'calcola/analisi', '#/impostazioni/x/y'.replace('impostazioni', 'zzz')]) {
      const r = parseHash(h);
      expect(r.route.view, h).toBe('calcola/analisi');
      expect(r.canonical, h).toBe(false);
    }
    expect(parseHash('#/pianifica').route.view).toBe('pianifica/inverso');
    expect(parseHash('#/pianifica').canonical).toBe(false);
    expect(parseHash('#/guide').route.view).toBe('guide/uso');
  });

  test('parametri: solo quelli della vista più did e metodo, ordine canonico', () => {
    const { route, canonical } = parseHash('#/calcola/analisi?p=20&x=1&metodo=magic&ip=1.2.3.4&did=1');
    expect(route.params).toEqual({ ip: '1.2.3.4', p: '20', did: '1', metodo: 'magic' });
    expect(canonical).toBe(false);
    expect(buildHash(route)).toBe('#/calcola/analisi?ip=1.2.3.4&p=20&did=1&metodo=magic');
    expect(cleanParams('impostazioni', { did: '1' })).toEqual({});
    expect(cleanParams('calcola/mask', { m: '' })).toEqual({});
  });

  test('valori codificati, barre leggibili, caratteri di controllo rimossi, lunghezza limitata', () => {
    const { route } = parseHash('#/calcola/analisi?ip=10.0.0.1%2F24&p=');
    expect(route.params).toEqual({ ip: '10.0.0.1/24' });
    expect(buildHash(route)).toBe('#/calcola/analisi?ip=10.0.0.1/24');
    expect(buildHash(routeTo('calcola/analisi', { ip: '10.0.0.1 255.255.255.0' }))).toBe('#/calcola/analisi?ip=10.0.0.1%20255.255.255.0');
    expect(parseHash('#/calcola/analisi?ip=10.0.0.1%20255.255.255.0').route.params.ip).toBe('10.0.0.1 255.255.255.0');
    expect(cleanParams('calcola/mask', { m: 'a\u0000b\nc' })).toEqual({ m: 'abc' });
    expect(cleanParams('calcola/mask', { m: 'x'.repeat(500) }).m).toHaveLength(MAX_PARAM_LENGTH);
    expect(parseHash('#/calcola/%E0%A4%A').route.view).toBe('calcola/analisi');
  });

  test('calcolo inverso: caso esplicito o dedotto (A, B, C)', () => {
    expect(inverseCase({ h: '50' })).toBe('a');
    expect(inverseCase({})).toBe('a');
    expect(inverseCase({ p: '16', s: '6' })).toBe('b');
    expect(inverseCase({ p: '24', h: '20', s: '8' })).toBe('c');
    expect(inverseCase({ caso: 'c' })).toBe('c');
    expect(inverseCase({ caso: 'x', s: '2' })).toBe('b');
    // caso scritto solo se non si deduce
    expect(buildHash(routeTo('pianifica/inverso', { caso: 'b', p: '16', s: '6' }))).toBe('#/pianifica/inverso?p=16&s=6');
    expect(buildHash(routeTo('pianifica/inverso', { caso: 'c' }))).toBe('#/pianifica/inverso?caso=c');
    expect(buildHash(routeTo('pianifica/inverso', { caso: 'b', p: '24' }))).toBe('#/pianifica/inverso?caso=b&p=24');
  });

  test('ogni vista dichiarata ha una sezione', () => {
    for (const view of Object.keys(VIEW_PARAMS)) {
      const [section, tab] = view.split('/');
      const tabs = /** @type {Record<string, readonly string[]>} */ (SECTIONS)[section];
      expect(tabs, view).toBeDefined();
      if (tab) expect(tabs).toContain(tab);
    }
  });
});

describe('createRouter', () => {
  test('all\'avvio normalizza il frammento sostituendolo e avvisa', () => {
    const win = fakeWindow('#/sconosciuta');
    const onChange = vi.fn();
    const router = createRouter(/** @type {any} */ (win), onChange);
    router.start();
    expect(win.location.hash).toBe('#/calcola/analisi');
    expect(win.replaced).toEqual(['#/calcola/analisi']);
    expect(win.entries).toHaveLength(1);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ view: 'calcola/analisi' }), { initial: true });
    expect(router.current().view).toBe('calcola/analisi');
  });

  test('frammento già canonico: nessuna sostituzione', () => {
    const win = fakeWindow('#/calcola/mask?m=255.255.255.0');
    const router = createRouter(/** @type {any} */ (win), () => {});
    router.start();
    expect(win.replaced).toEqual([]);
    expect(router.current().params).toEqual({ m: '255.255.255.0' });
  });

  test('mentre si scrive: sostituzione senza voci né richiamo; cambio di scheda: nuova voce e richiamo', async () => {
    const win = fakeWindow('#/calcola/analisi');
    const onChange = vi.fn();
    const router = createRouter(/** @type {any} */ (win), onChange);
    router.start();
    onChange.mockClear();
    router.navigate(routeTo('calcola/analisi', { ip: '10.0.0.1' }), { replace: true });
    router.navigate(routeTo('calcola/analisi', { ip: '10.0.0.1', p: '24' }), { replace: true });
    expect(win.entries).toEqual(['#/calcola/analisi?ip=10.0.0.1&p=24']);
    expect(onChange).not.toHaveBeenCalled();
    expect(router.current().params).toEqual({ ip: '10.0.0.1', p: '24' });

    router.navigate(routeTo('calcola/mask'));
    await Promise.resolve();
    expect(win.entries).toEqual(['#/calcola/analisi?ip=10.0.0.1&p=24', '#/calcola/mask']);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ view: 'calcola/mask' }), { initial: false });

    // navigare verso la rotta corrente non fa nulla
    router.navigate(routeTo('calcola/mask'));
    await Promise.resolve();
    expect(win.entries).toHaveLength(2);
  });

  test('tasto indietro o collegamento esterno: richiamo con la nuova rotta, normalizzata', () => {
    const win = fakeWindow('#/calcola/analisi');
    const onChange = vi.fn();
    const router = createRouter(/** @type {any} */ (win), onChange);
    router.start();
    win.go('#/pianifica/inverso?s=4&p=24&zz=1');
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ view: 'pianifica/inverso', params: { p: '24', s: '4' } }), { initial: false });
    expect(win.location.hash).toBe('#/pianifica/inverso?p=24&s=4');
    expect(router.href(routeTo('impostazioni'))).toBe('#/impostazioni');
  });

  test('se replaceState fallisce (pagina da disco) ripiega su location.replace', () => {
    const win = fakeWindow('#/calcola/analisi');
    win.history.replaceState = () => {
      throw new Error('SecurityError');
    };
    const router = createRouter(/** @type {any} */ (win), () => {});
    router.start();
    router.navigate(routeTo('calcola/analisi', { ip: '1.2.3.4' }), { replace: true });
    expect(win.replaced).toEqual(['#/calcola/analisi?ip=1.2.3.4']);
  });

  test('stop rimuove l\'ascolto degli eventi', () => {
    const win = fakeWindow('#/calcola/analisi');
    const router = createRouter(/** @type {any} */ (win), () => {});
    router.start();
    expect(win.listenerCount()).toBe(1);
    router.stop();
    expect(win.listenerCount()).toBe(0);
  });
});
