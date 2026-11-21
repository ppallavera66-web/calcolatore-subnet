// @ts-check
import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { explain, methodsFor, resolveMethod, METHODS, analyzeText, toDotted, validateMask } from '../../src/engine/index.js';
import { byFunction } from './generators.js';
import { val } from '../helpers.js';
import { t } from '../../src/i18n/strings.it.js';
import { analyze, snippets, subdivide } from '../../src/engine/index.js';

/**
 * Valori finali dei passaggi: unione dei `values` nell'ordine (vale l'ultimo).
 * @param {{ steps: { values: Record<string, any> }[] }} ex
 */
function finals(ex) {
  return Object.assign({}, ...ex.steps.map((s) => s.values));
}

/** @param {number | null} x */
const dd = (x) => (x === null ? null : toDotted(x));

/**
 * P12: confronto tra i valori finali dei passaggi e il risultato, per funzione.
 * @param {string} fn
 * @param {any} r valore del risultato
 * @param {Record<string, any>} f valori finali dei passaggi
 * @param {string} method
 */
function consistent(fn, r, f, method) {
  switch (fn) {
    case 'F01': {
      const base =
        f.network === dd(r.network) &&
        f.firstHost === dd(r.firstHost) &&
        f.lastHost === dd(r.lastHost) &&
        f.usableHosts === r.usableHosts &&
        (r.broadcast === null ? f.broadcast === undefined : f.broadcast === dd(r.broadcast));
      if (method === 'multiples') {
        // "è il broadcast" (detto solo quando l'ottetto interessante è l'ultimo) compare solo se l'IP
        // è il broadcast, e in quel caso compare sempre (revisione A1, A6)
        const saysBroadcast = !!f.remainderIsLast && f.rightOctets === 0;
        const isBroadcast = r.role === 'broadcast';
        return base && f.offset === r.offset && f.blockStart === r.interesting.blockStart &&
          (!saysBroadcast || isBroadcast) && (!(isBroadcast && f.rightOctets === 0) || saysBroadcast);
      }
      if (method === 'magic') return base && f.blockStart === r.interesting.blockStart && f.blockEnd === r.interesting.blockEnd;
      return base;
    }
    case 'F02':
      return typeof r.dotted === 'string' ? f.binaryDotted === r.binaryDotted && f.hexDotted === r.hexDotted : f.binary === r.bin && f.hex === r.hex;
    case 'F03':
      return f.valid === r.valid && (r.valid ? f.prefix === r.prefix : true);
    case 'F04':
      return f.letter === r.historicalClass.letter && f.scope === r.scope;
    case 'F05':
      if (r.mode === 'hosts') return f.prefix === r.prefix && f.usableHosts === r.usableHosts && f.spare === r.spare;
      if (r.mode === 'subnets') return f.newPrefix === r.newPrefix && f.spare === r.spare && f.usableHostsPerSubnet === r.usableHostsPerSubnet;
      return f.feasible === r.feasible && (r.feasible ? f.recommended === r.recommended && f.alternative === r.alternative : true);
    case 'F06': {
      const lastNet = r.block.network + (r.count - 1) * r.subnetSize;
      return f.count === r.count && f.first === dd(r.block.network) && f.last === dd(lastNet) && f.usableHosts === r.hostsPerSubnet;
    }
    case 'F07':
      return f.verdict === r.verdict;
    default:
      return f.wildcard === dd(r.wildcard);
  }
}

describe('P12 · i valori finali dei passaggi coincidono con il risultato', () => {
  for (const [fn, arb] of Object.entries(byFunction)) {
    for (const method of methodsFor(fn)) {
      test(`${fn} · ${method}`, () => {
        fc.assert(fc.property(arb.filter((x) => x.result.ok), ({ result }) => {
          const ex = explain(fn, result.value, method, result.warnings);
          return ex.method === method && consistent(fn, result.value, finals(ex), method);
        }));
      });
    }
  }

  test('F07: il verdetto locale di ciascun lato coincide con aSeesBLocal e bSeesALocal', () => {
    fc.assert(fc.property(byFunction.F07, ({ result }) => {
      for (const method of ['magic', 'binary']) {
        const sides = explain('F07', result.value, method).steps.filter((s) => s.values.side);
        const a = sides.find((s) => s.values.side === 'a')?.values.local;
        const b = sides.find((s) => s.values.side === 'b')?.values.local;
        if (a !== result.value.aSeesBLocal || b !== result.value.bSeesALocal) return false;
      }
      return true;
    }));
  });
});

describe('P6 · binario, numero magico e multipli danno la stessa rete e lo stesso broadcast', () => {
  test('su IP e prefissi casuali', () => {
    fc.assert(fc.property(byFunction.F01, ({ result }) => {
      const out = ['binary', 'magic', 'multiples'].map((m) => {
        const f = finals(explain('F01', result.value, m));
        return `${f.network}|${f.broadcast}`;
      });
      return out[0] === out[1] && out[1] === out[2];
    }));
  });
});

describe('convenzioni nei passaggi (10.2 C)', () => {
  test.each(['10.1.2.3/8', '172.16.45.200/16', '10.1.2.3/24', '10.1.1.1/32'])('%s: boundary-convention nel metodo magico e nei multipli', (text) => {
    const r = val(analyzeText(text));
    for (const m of ['magic', 'multiples']) {
      const ids = explain('F01', r, m).steps.map((s) => s.id);
      expect(ids).toContain('boundary-convention');
      expect(ids).not.toContain('zero-prefix');
    }
  });
  test('/0: zero-prefix', () => {
    const ids = explain('F01', val(analyzeText('203.0.113.10/0')), 'magic').steps.map((s) => s.id);
    expect(ids.slice(0, 3)).toEqual(['interesting-octet', 'zero-prefix', 'magic-number']);
  });
  test('/20: nessuna convenzione; i 5 passi del numero magico', () => {
    const ex = explain('F01', val(analyzeText('172.16.45.200/20')), 'magic');
    expect(ex.chapter).toBe('cap-9');
    expect(ex.steps.map((s) => s.id)).toEqual(['interesting-octet', 'magic-number', 'block-multiple', 'broadcast-quick', 'host-quick']);
    expect(ex.steps[1].values).toMatchObject({ maskOctet: 240, magic: 16, bits: 4 });
  });
  test('binario: i 6 passi del cap. 7 con le righe binarie', () => {
    const ex = explain('F01', val(analyzeText('192.168.10.75/26')), 'binary');
    expect(ex.steps.map((s) => s.id)).toEqual(['mask-binary', 'ip-binary', 'and-network', 'or-broadcast', 'host-range', 'host-count']);
    expect(ex.steps[2].bits?.rows).toEqual([
      { label: 'ip', value: '01001011', prefix: 2 },
      { label: 'mask', value: '11000000', prefix: 2 },
      { label: 'network', value: '01000000', prefix: 2 },
    ]);
  });
  test('multipli: 200 mod 16 = 8, il 9° indirizzo (cap. 12)', () => {
    const ex = explain('F01', val(analyzeText('192.168.1.200/28')), 'multiples');
    expect(ex.steps.find((s) => s.id === 'remainder')?.values).toMatchObject({ remainder: 8, position: 9, remainderIsLast: false });
    const bc = explain('F01', val(analyzeText('192.168.50.99/30')), 'multiples');
    expect(bc.steps.find((s) => s.id === 'remainder')?.values).toMatchObject({ remainder: 3, remainderIsLast: true });
  });
  test('broadcast con riporto: 192.168.10.200/26', () => {
    const ex = explain('F01', val(analyzeText('192.168.10.200/26')), 'magic');
    expect(ex.steps.find((s) => s.id === 'broadcast-quick')?.values).toMatchObject({ carry: true, broadcast: '192.168.10.255' });
  });
  test('F06: riporto nella sequenza (192.168.10.0/23 → /26)', () => {
    const steps = explain('F06', { block: { network: 3232238080, prefix: 23 }, newPrefix: 26 }).steps;
    expect(steps.find((s) => s.id === 'carry')?.values).toMatchObject({ before: '192.168.10.192', after: '192.168.11.0', subnetIndex: 4 });
  });
  test('F03: suggerimenti e indizio di wildcard', () => {
    const r = validateMask('0.0.0.255');
    const ids = explain('F03', val(r), 'binary', r.ok ? r.warnings : []).steps.map((s) => s.id);
    expect(ids).toEqual(['mask-octets', 'mask-noncontiguous', 'mask-suggestions', 'mask-wildcard-hint']);
  });
});

describe('scelta del metodo (4.2)', () => {
  test('metodo non previsto → primo della riga', () => {
    expect(resolveMethod('F06', 'binary')).toBe('magic');
    expect(resolveMethod('F01', null)).toBe('binary');
    expect(resolveMethod('F07', 'binary')).toBe('binary');
    expect(explain('F04', val(analyzeText('10.0.0.1/8')).classification).method).toBe('rules');
  });
  test('funzione sconosciuta → errore di programmazione', () => {
    expect(() => methodsFor('F99')).toThrow(RangeError);
  });
  test('ogni passaggio ha un capitolo della guida', () => {
    fc.assert(fc.property(fc.oneof(...Object.values(byFunction)).filter((x) => x.result.ok), ({ fn, result }) => {
      return methodsFor(fn).every((m) => {
        const ex = explain(fn, result.value, m, result.warnings);
        return /^cap-\d+$/.test(ex.chapter) && ex.chapter === /** @type {any} */ (METHODS)[fn][m] && ex.steps.every((s) => /^cap-\d+$/.test(s.chapter));
      });
    }), { numRuns: 300 });
  });
});

describe('revisione A7 · frasi dei passaggi vere anche ai bordi', () => {
  /** @param {{ steps: { id: string, values: any }[] }} ex */
  const text = (ex) => ex.steps.map((st) => t(`step.${st.id}`, st.values)).join(' ');
  const arb = fc.tuple(fc.integer({ min: 0, max: 0xffffffff }), fc.integer({ min: 0, max: 32 }));

  test('F01: niente "a destra" con l\'ottetto interessante al 4° posto; niente "scavalca" senza una rete successiva', () => {
    fc.assert(fc.property(arb, ([x, p]) => {
      const r = val(analyze(x, p));
      for (const m of ['binary', 'magic', 'multiples']) {
        const s = text(explain('F01', r, m));
        if (r.interesting.index === 3 && /a destra/.test(s)) return false;
        if (r.nextNetwork === null && /scavalca/.test(s)) return false;
        if (r.nextNetwork === null && p <= 30 && m !== 'binary' && !/ultimo blocco dello spazio IPv4/.test(s)) return false;
      }
      return true;
    }));
  });

  test('esempi: 255.255.255.252/30, 192.168.1.1/32, 10.1.1.1/30 nel binario', () => {
    expect(text(explain('F01', val(analyzeText('255.255.255.253/30')), 'magic'))).not.toMatch(/scavalca/);
    expect(text(explain('F01', val(analyzeText('255.255.255.253/30')), 'magic'))).toMatch(/ultimo blocco dello spazio IPv4/);
    expect(text(explain('F01', val(analyzeText('192.168.10.200/26')), 'magic'))).toMatch(/scavalca/);
    const single = text(explain('F01', val(analyzeText('192.168.1.1/32')), 'magic'));
    expect(single).toMatch(/multiplo di 8/);
    expect(single).not.toMatch(/a destra/);
    expect(text(explain('F01', val(analyzeText('10.1.1.1/30')), 'binary'))).not.toMatch(/a destra/);
    expect(text(explain('F01', val(analyzeText('10.1.1.1/20')), 'binary'))).toMatch(/255 negli ottetti a destra/);
  });

  test('F10: "a sinistra" solo se ci sono ottetti a sinistra, "a destra" solo se ci sono a destra', () => {
    fc.assert(fc.property(arb, ([x, p]) => {
      const r = val(snippets(x, p));
      const s = text(explain('F10', r));
      const index = p === 0 ? 0 : p % 8 === 0 ? p / 8 - 1 : Math.floor(p / 8);
      return (index > 0) === /a sinistra/.test(s) && (index < 3) === /a destra/.test(s);
    }));
  });

  test('F06: con 2 subnet la sequenza le nomina entrambe, senza "…"', () => {
    const s = text(explain('F06', val(subdivide(0x0a000000, 24, 25))));
    expect(s).toMatch(/sono due, 10\.0\.0\.0 e 10\.0\.0\.128/);
    expect(s).not.toMatch(/…/);
    expect(text(explain('F06', val(subdivide(0x0a000000, 24, 26))))).toMatch(/10\.0\.0\.64, … fino a 10\.0\.0\.192/);
  });
});
