// @ts-check
/**
 * Glossario della guida: ricerca dei termini (parti pure di src/ui/guide-glossary.js).
 */
import { describe, test, expect } from 'vitest';
import { glossaryRows, buildMatcher, splitTerms } from '../../src/ui/guide-glossary.js';

const rows = glossaryRows([
  { id: 'gl-mask', terms: 'subnet mask|mask', cs: false, ref: 'cap-6', title: 'Subnet mask', def: 'd' },
  { id: 'gl-sub', terms: 'sottorete|sottoreti|subnet', cs: false, ref: 'cap-5', title: 'Subnet', def: 'd' },
  { id: 'gl-mac', terms: 'indirizzo MAC|MAC', cs: true, ref: 'cap-1', title: 'MAC', def: 'd' },
  { id: 'gl-oi', terms: 'ottetto interessante', cs: false, ref: 'cap-6', title: 'Ottetto interessante', def: 'd' },
  { id: 'gl-ott', terms: 'ottetto|ottetti', cs: false, ref: 'cap-2', title: 'Ottetto', def: 'd' },
]);
const matcher = buildMatcher(rows);

/** Testi evidenziati, con la voce. */
const terms = (/** @type {ReturnType<typeof splitTerms>} */ parts) => (parts ?? []).filter((p) => typeof p !== 'string').map((p) => `${/** @type {any} */ (p).text}=${/** @type {any} */ (p).row.id}`);

describe('glossario: ricerca dei termini', () => {
  test('i termini più lunghi vincono ("subnet mask" prima di "subnet")', () => {
    expect(terms(splitTerms('La subnet mask decide', matcher, new Set(), 'cap-9'))).toEqual(['subnet mask=gl-mask']);
  });

  test('una voce si evidenzia una sola volta per capitolo', () => {
    const seen = new Set();
    expect(terms(splitTerms('una subnet e un\'altra subnet', matcher, seen, 'cap-9'))).toEqual(['subnet=gl-sub']);
    expect(splitTerms('ancora una subnet', matcher, seen, 'cap-9')).toBeNull();
  });

  test('non nel capitolo a cui la voce rimanda', () => {
    expect(splitTerms('ogni subnet', matcher, new Set(), 'cap-5')).toBeNull();
  });

  test('solo parole intere, anche con lettere accentate', () => {
    expect(splitTerms('subnetting e masking', matcher, new Set(), 'cap-9')).toBeNull();
    expect(splitTerms('maskè', matcher, new Set(), 'cap-9')).toBeNull();
    expect(terms(splitTerms('(mask)', matcher, new Set(), 'cap-9'))).toEqual(['mask=gl-mask']);
  });

  test('le voci con le maiuscole obbligatorie non riconoscono le minuscole', () => {
    expect(splitTerms('la mac del vicino', matcher, new Set(), 'cap-9')).toBeNull();
    expect(terms(splitTerms('il MAC e l\'indirizzo MAC', matcher, new Set(), 'cap-9'))).toEqual(['MAC=gl-mac']);
  });

  test('le altre voci ignorano maiuscole e minuscole e conservano il testo originale', () => {
    expect(terms(splitTerms('Ottetto Interessante', matcher, new Set(), 'cap-9'))).toEqual(['Ottetto Interessante=gl-oi']);
  });

  test('le parti ricompongono il testo originale', () => {
    const s = 'Nel quarto ottetto la subnet mask vale 192, nel terzo ottetto 255.';
    const parts = splitTerms(s, matcher, new Set(), 'cap-9') ?? [];
    expect(parts.map((p) => (typeof p === 'string' ? p : p.text)).join('')).toBe(s);
    expect(terms(parts)).toEqual(['ottetto=gl-ott', 'subnet mask=gl-mask']);
  });

  test('glossaryRows divide i sinonimi e toglie gli spazi', () => {
    expect(glossaryRows([{ id: 'x', terms: ' a | b ||', cs: false, ref: '', title: '', def: '' }])[0].terms).toEqual(['a', 'b']);
  });
});
