// @ts-check
import { describe, test, expect } from 'vitest';
import { validateMask, maskOf, toDotted, MASK_OCTET_VALUES } from '../../src/engine/index.js';
import { val, errCode, warnCodes } from '../helpers.js';

describe('10.2 F · validazione della mask (F03)', () => {
  test('255.255.255.192 valida /26', () => {
    expect(val(validateMask('255.255.255.192'))).toMatchObject({ valid: true, prefix: 26, reason: null, suggestions: [] });
  });
  test('255.255.250.0 non valida, ottetto 3 = 11111010, suggerite /21 e /22', () => {
    const r = val(validateMask('255.255.250.0'));
    expect(r.valid).toBe(false);
    expect(r.prefix).toBe(null);
    expect(r.reason).toEqual({ code: 'MASK_OCTET_VALUE', params: { index: 2, value: 250, binary: '11111010' } });
    expect(r.octets[2]).toEqual({ value: 250, binary: '11111010', allowed: false });
    expect(r.suggestions.map((s) => [toDotted(s.mask), s.prefix])).toEqual([['255.255.248.0', 21], ['255.255.252.0', 22]]);
  });
  test('255.255.0.255 non contigua dall\'ottetto 4', () => {
    expect(val(validateMask('255.255.0.255')).reason).toEqual({ code: 'MASK_NONCONTIGUOUS', params: { index: 3 } });
  });
  test('0.0.0.255 non contigua con W_LOOKS_LIKE_WILDCARD (/24)', () => {
    const r = validateMask('0.0.0.255');
    expect(val(r).reason?.code).toBe('MASK_NONCONTIGUOUS');
    expect(r.ok && r.warnings).toEqual([{ code: 'W_LOOKS_LIKE_WILDCARD', params: { prefix: 24 } }]);
  });
  test('0.0.0.0 valida /0; 255.255.255.254 valida /31; 255.255.255.255 valida /32 senza suggerimenti', () => {
    expect(val(validateMask('0.0.0.0'))).toMatchObject({ valid: true, prefix: 0 });
    expect(val(validateMask('255.255.255.254'))).toMatchObject({ valid: true, prefix: 31 });
    expect(val(validateMask('255.255.255.255'))).toMatchObject({ valid: true, prefix: 32, suggestions: [] });
  });
  test('testo senza forma di indirizzo → MASK_FORMAT', () => {
    expect(validateMask('255.255.0')).toEqual({ ok: false, error: { code: 'MASK_FORMAT', field: 'mask', params: { text: '255.255.0' } } });
    expect(errCode(validateMask(undefined))).toBe('MASK_FORMAT');
    expect(errCode(validateMask('255.255.255.000'))).toBe('MASK_LEADING_ZERO'); // revisione A9
  });
  test('le 33 mask valide restituiscono il prefisso giusto', () => {
    for (let p = 0; p <= 32; p++) {
      const r = val(validateMask(toDotted(maskOf(p))));
      expect(r.valid).toBe(true);
      expect(r.prefix).toBe(p);
    }
  });
  test('256 valori di un ottetto: solo i 9 ammessi sono validi (quarto ottetto dopo 255.255.255)', () => {
    const valid = [];
    for (let v = 0; v <= 255; v++) if (val(validateMask(`255.255.255.${v}`)).valid) valid.push(v);
    expect(valid).toEqual([...MASK_OCTET_VALUES]);
  });
  test('256 valori nel primo ottetto (resto a 0)', () => {
    const valid = [];
    for (let v = 0; v <= 255; v++) if (val(validateMask(`${v}.0.0.0`)).valid) valid.push(v);
    expect(valid).toEqual([...MASK_OCTET_VALUES]);
  });
  test('nessun avviso per mask valide o non riconducibili', () => {
    expect(warnCodes(validateMask('255.255.255.0'))).toEqual([]);
    expect(warnCodes(validateMask('255.255.250.0'))).toEqual([]);
  });
});
