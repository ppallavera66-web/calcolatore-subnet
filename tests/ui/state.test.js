// @ts-check
import { describe, test, expect, vi } from 'vitest';
import {
  initialState, setSetting, validSetting, chooseMethod, methodFor, didacticFor, setInputs, sameInput,
  addHistory, removeHistory, clearHistory, newId, createStore, HISTORY_MAX, SETTINGS_DEFAULTS,
} from '../../src/ui/state.js';

const meta = (/** @type {number} */ n) => ({ id: `id${n}`, now: `2026-11-19T00:${String(n % 60).padStart(2, '0')}:00.000Z` });

describe('state.js', () => {
  test('impostazioni predefinite (9.5): tutto spento, tema Automatico, metodo binario', () => {
    expect(initialState().settings).toEqual({ theme: 'auto', didactic: false, didacticMethod: 'binary', exportBar: false, persist: false });
    expect(Object.isFrozen(SETTINGS_DEFAULTS)).toBe(true);
  });

  test('impostazioni: valori ammessi cambiano lo stato, gli altri no', () => {
    const s0 = initialState();
    const s1 = setSetting(s0, 'theme', 'contrast');
    expect(s1.settings.theme).toBe('contrast');
    expect(s0.settings.theme).toBe('auto');
    expect(setSetting(s1, 'theme', 'viola')).toBe(s1);
    expect(setSetting(s1, 'didactic', 'sì')).toBe(s1);
    expect(setSetting(s1, 'sconosciuta', true)).toBe(s1);
    expect(setSetting(s1, 'theme', 'contrast')).toBe(s1);
    expect(setSetting(s1, 'didacticMethod', 'magic').settings.didacticMethod).toBe('magic');
    expect(validSetting('didacticMethod', 'weights')).toBeUndefined();
    for (const k of ['didactic', 'exportBar', 'persist']) expect(setSetting(s0, k, true).settings).toMatchObject({ [k]: true });
  });

  test('metodo: collegamento, poi scelta della visita, poi impostazione; adattato alla funzione (4.2)', () => {
    let s = initialState();
    expect(methodFor(s, 'F01')).toBe('binary');
    expect(methodFor(s, 'F06')).toBe('magic'); // F06 prevede solo il numero magico
    expect(methodFor(s, 'F02')).toBe('weights');
    s = setSetting(s, 'didacticMethod', 'multiples');
    expect(methodFor(s, 'F01')).toBe('multiples');
    expect(methodFor(s, 'F07')).toBe('magic'); // multipli non previsto in F07: primo della riga
    s = chooseMethod(s, 'F01', 'magic');
    expect(methodFor(s, 'F01')).toBe('magic');
    expect(methodFor(s, 'F01', 'binary')).toBe('binary');
    expect(methodFor(s, 'F01', 'inesistente')).toBe('binary');
    expect(chooseMethod(s, 'F01', 'magic')).toBe(s);
    expect(chooseMethod(s, 'F02', 'zzz').methods.F02).toBe('weights');
  });

  test('modalità didattica: did=1 la attiva solo per la vista', () => {
    const s = initialState();
    expect(didacticFor(s)).toBe(false);
    expect(didacticFor(s, { did: '1' })).toBe(true);
    expect(didacticFor(s, { did: '0' })).toBe(false);
    expect(didacticFor(setSetting(s, 'didactic', true), {})).toBe(true);
  });

  test('input delle viste', () => {
    const s0 = initialState();
    const s1 = setInputs(s0, 'calcola/analisi', { ip: '10.0.0.1', p: '24' });
    expect(s1.inputs['calcola/analisi']).toEqual({ ip: '10.0.0.1', p: '24' });
    expect(setInputs(s1, 'calcola/analisi', { p: '24', ip: '10.0.0.1' })).toBe(s1);
    expect(setInputs(s1, 'calcola/analisi', { ip: '10.0.0.1' }).inputs['calcola/analisi']).toEqual({ ip: '10.0.0.1' });
  });

  test('uguaglianza degli input', () => {
    expect(sameInput({ a: 1, b: { c: 'x' } }, { b: { c: 'x' }, a: 1 })).toBe(true);
    expect(sameInput({ a: 1 }, { a: 1, b: undefined })).toBe(true);
    expect(sameInput({ a: 1 }, { a: 2 })).toBe(false);
    expect(sameInput({ a: null }, { a: 0 })).toBe(false);
    expect(sameInput({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  test('cronologia: in cima la più recente, doppioni spostati in cima, massimo 200 voci (6.1)', () => {
    let s = initialState();
    s = addHistory(s, { fn: 'F01', input: { ip: '10.0.0.1', prefix: 24 } }, meta(1));
    s = addHistory(s, { fn: 'F03', input: { mask: '255.255.255.0' } }, meta(2));
    expect(s.history.map((h) => h.id)).toEqual(['id2', 'id1']);
    // lo stesso input in cima non cambia nulla
    expect(addHistory(s, { fn: 'F03', input: { mask: '255.255.255.0' } }, meta(3))).toBe(s);
    // lo stesso input più in basso torna in cima con la data nuova e lo stesso id
    s = addHistory(s, { fn: 'F01', input: { prefix: 24, ip: '10.0.0.1' } }, meta(4));
    expect(s.history.map((h) => h.id)).toEqual(['id1', 'id2']);
    expect(s.history[0].at).toBe(meta(4).now);
    // stesso input ma funzione diversa: voce distinta
    s = addHistory(s, { fn: 'F04', input: { ip: '10.0.0.1' } }, meta(5));
    expect(s.history).toHaveLength(3);
    for (let i = 0; i < 250; i++) s = addHistory(s, { fn: 'F05', input: { mode: 'hosts', hosts: i + 1 } }, meta(100 + i));
    expect(s.history).toHaveLength(HISTORY_MAX);
    expect(s.history[0].input).toEqual({ mode: 'hosts', hosts: 250 });
    expect(() => addHistory(s, { fn: 'F99', input: {} }, meta(1))).toThrow(RangeError);
    const removed = removeHistory(s, s.history[0].id);
    expect(removed.history).toHaveLength(HISTORY_MAX - 1);
    expect(clearHistory(removed).history).toEqual([]);
    const empty = initialState();
    expect(clearHistory(empty)).toBe(empty);
  });

  test('identificativi di 12 caratteri [A-Za-z0-9_-]', () => {
    const id = newId(new Uint8Array([0, 1, 25, 26, 51, 52, 61, 62, 63, 64, 255, 128]));
    expect(id).toBe('ABZaz09_-A-A');
    expect(id).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect(() => newId(new Uint8Array(4))).toThrow(RangeError);
  });

  test('archivio: set con valore o funzione, avvisi solo se lo stato cambia, disiscrizione', () => {
    const store = createStore({ n: 0 });
    const fn = vi.fn();
    const off = store.subscribe(fn);
    store.set({ n: 1 });
    store.set((s) => ({ n: s.n + 1 }));
    store.set((s) => s);
    expect(store.get()).toEqual({ n: 2 });
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith({ n: 2 }, { n: 1 });
    off();
    store.set({ n: 3 });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
