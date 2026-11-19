// @ts-check
/**
 * Export v1 (specifica tecnica, 5): modello comune, CSV, JSON, Markdown, testo, passaggi,
 * nomi dei file, intervalli di F06; appunti e download con un DOM minimo simulato.
 */
import { describe, test, expect, vi, afterEach } from 'vitest';
import {
  analyzeText, convertNumber, convertAddress, prefixToMask, validateMask, classifyText, prefixForHostsText, prefixForSubnetsText,
  prefixForBothText, subdivideText, sameSubnetText, snippetsText,
} from '../../src/engine/index.js';
import { toRows, subdivideRange, subdivideColumns, rangeFor, EXPORT_MAX_ROWS } from '../../src/export/rows.js';
import { toCsv, csvField, BOM } from '../../src/export/csv.js';
import { toText, cellText, stepsText } from '../../src/export/text.js';
import { toMarkdown, mdEscape } from '../../src/export/markdown.js';
import { toResultJson, withDotted, subdivideOutput, RESULT_FORMAT } from '../../src/export/json.js';
import { stepsBlock, splitBits } from '../../src/export/steps.js';
import { resultFileName, sessionFileName, stamp, safePart } from '../../src/export/filename.js';
import { copyText } from '../../src/export/clipboard.js';
import { downloadText, readFileText, MIME } from '../../src/export/download.js';
import { printPage } from '../../src/export/print.js';
import { val } from '../helpers.js';

const clean = (/** @type {string} */ s) => !/undefined|NaN|\[object Object\]|\$\{/.test(s);

/** Un risultato per ogni forma di documento. */
const CASES = /** @type {[string, any, any?][]} */ ([
  ['F01', analyzeText('172.16.45.200/20')],
  ['F01', analyzeText('10.0.0.1/31')],
  ['F01', analyzeText('203.0.113.10/0')],
  ['F04', classifyText('127.0.0.1')],
  ['F04', classifyText('8.8.8.8')],
  ['F02', convertNumber('203', 10), { text: '203' }],
  ['F02', convertNumber('0', 2), {}],
  ['F02', convertAddress('192.168.10.75')],
  ['F02', { ok: true, value: prefixToMask(20), warnings: [] }],
  ['F03', validateMask('255.255.250.0')],
  ['F03', validateMask('255.255.255.192')],
  ['F05', prefixForHostsText('2')],
  ['F05', prefixForSubnetsText('16', '6')],
  ['F05', prefixForBothText('24', '20', '8')],
  ['F05', prefixForBothText('24', '20', '16')],
  ['F05', prefixForBothText('24', '20', '10')],
  ['F06', subdivideText('10.0.0.0/16', '', '19')],
  ['F07', sameSubnetText({ a: '192.168.1.10/24', b: '192.168.1.200/25', gateway: '192.168.1.1' })],
  ['F07', sameSubnetText({ a: '10.1.63.5', b: '10.1.64.5', prefixA: '19' })],
  ['F10', snippetsText('192.168.10.75/26')],
]);

describe('modello comune (5.1)', () => {
  test.each(CASES)('%s: documento completo, testi puliti, in tutti i formati', (fn, r, input) => {
    const v = val(r);
    const doc = toRows(fn, v, { warnings: r.warnings, input });
    expect(doc.title.length).toBeGreaterThan(5);
    expect(doc.pairs.length).toBeGreaterThan(1);
    for (const p of doc.pairs) {
      expect(clean(p.label), p.label).toBe(true);
      expect(p.value === null || ['string', 'number'].includes(typeof p.value)).toBe(true);
      if (typeof p.value === 'string') expect(clean(p.value), p.value).toBe(true);
    }
    for (const out of [toText(doc), toMarkdown(doc), toCsv(doc), JSON.stringify(doc)]) expect(clean(out)).toBe(true);
  });

  test('F01: valori grezzi (numeri senza separatori, indirizzi puntati)', () => {
    const doc = toRows('F01', val(analyzeText('172.16.45.200/20')));
    const get = (/** @type {string} */ l) => doc.pairs.find((p) => p.label === l)?.value;
    expect(get('Rete')).toBe('172.16.32.0');
    expect(get('Broadcast')).toBe('172.16.47.255');
    expect(get('Host utilizzabili')).toBe(4094);
    expect(get('Numero magico')).toBe('16 · 3°');
    expect(get('Tipo di indirizzo')).toBe('Privato · Privato (RFC 1918) (172.16.0.0/12, RFC 1918)');
  });

  test('F01 /31: broadcast "nessuno" e avviso', () => {
    const r = analyzeText('10.0.0.1/31');
    const doc = toRows('F01', val(r), { warnings: r.ok ? r.warnings : [] });
    expect(doc.pairs.find((p) => p.label === 'Broadcast')?.value).toBeNull();
    expect(doc.notes?.length).toBe(1);
    expect(toText(doc)).toMatch(/Broadcast\s+nessuno/);
  });

  test('funzione sconosciuta', () => {
    expect(() => toRows('F99', {})).toThrow(RangeError);
  });
});

describe('F06: tabella e intervalli (m9)', () => {
  const v = val(subdivideText('192.168.10.0/23', '', '26'));

  test('colonne della 5.2, numerazione da 1, riporto (cap. 13)', () => {
    const doc = toRows('F06', v);
    expect(doc.columns?.map((c) => c.label)).toEqual(['N.', 'Rete', 'Prefisso', 'Primo host', 'Ultimo host', 'Broadcast', 'Host']);
    expect(doc.rows).toHaveLength(8);
    expect(doc.rows?.[4]).toEqual({ n: 5, network: '192.168.11.0', prefix: 26, first: '192.168.11.1', last: '192.168.11.62', broadcast: '192.168.11.63', hosts: 62 });
  });

  test('etichette del piano e nome del piano', () => {
    const doc = toRows('F06', v, { input: { labels: { 0: 'VLAN 10', 4: '=SOMMA(A1)' }, plan: 'Sede' } });
    expect(doc.columns?.at(-1)).toMatchObject({ key: 'label', user: true });
    expect(doc.rows?.[0].label).toBe('VLAN 10');
    expect(doc.rows?.[1].label).toBe('');
    expect(doc.title).toContain('Sede');
    const csv = toCsv(doc);
    expect(csv).toContain(";'=SOMMA(A1)\r\n");
  });

  test('intervallo di indici su un /8 → /30 (4.194.304 subnet)', () => {
    const big = val(subdivideText('10.0.0.0/8', '', '30', { limit: 1 }));
    const r = rangeFor(big.count, 4194303, 4194304);
    expect(r).toEqual({ ok: true, range: [4194302, 4194304] });
    if (!r.ok) return;
    const doc = toRows('F06', big, { input: { range: r.range } });
    expect(doc.rows?.map((x) => x.network)).toEqual(['10.255.255.248', '10.255.255.252']);
    expect(doc.pairs.find((p) => p.label === 'Righe esportate')?.value).toBe('Subnet da 4.194.303 a 4.194.304 di 4.194.304');
  });

  test('rangeFor: limiti', () => {
    expect(rangeFor(100, 1, 100)).toEqual({ ok: true, range: [0, 100] });
    expect(rangeFor(100, 0, 5)).toMatchObject({ ok: false, code: 'RANGE_FORMAT' });
    expect(rangeFor(100, 1, 101)).toMatchObject({ ok: false, code: 'RANGE_FORMAT' });
    expect(rangeFor(100, 'a', 5)).toMatchObject({ ok: false, code: 'RANGE_FORMAT' });
    expect(rangeFor(100, 50, 10)).toMatchObject({ ok: false, code: 'RANGE_ORDER' });
    expect(rangeFor(1e6, 1, EXPORT_MAX_ROWS)).toMatchObject({ ok: true });
    expect(rangeFor(1e6, 1, EXPORT_MAX_ROWS + 1)).toEqual({ ok: false, code: 'RANGE_TOO_LARGE', max: 65536 });
  });

  test('65.536 righe si generano in tempi ragionevoli', () => {
    const big = val(subdivideText('10.0.0.0/8', '', '24', { limit: 1 }));
    const t0 = performance.now();
    const rows = subdivideRange(big.block, big.newPrefix, 0, EXPORT_MAX_ROWS);
    const csv = toCsv({ title: 'x', pairs: [], columns: subdivideColumns(false), rows });
    expect(rows).toHaveLength(65536);
    expect(csv.split('\r\n')).toHaveLength(65536 + 2);
    expect(performance.now() - t0).toBeLessThan(3000);
  });

  test('/32 in tabella: broadcast vuoto nel CSV', () => {
    const one = val(subdivideText('10.0.0.0/30', '', '32'));
    const csv = toCsv(toRows('F06', one));
    expect(csv.split('\r\n')[1]).toBe('1;10.0.0.0;32;10.0.0.0;10.0.0.0;;1');
  });
});

describe('CSV (5.2, m13)', () => {
  test('BOM, separatore ;, CRLF, virgolette, numeri senza separatori', () => {
    const csv = toCsv({ title: 't', pairs: [{ label: 'A;B', value: 'x"y' }, { label: 'N', value: 4294967294 }, { label: 'Nulla', value: null }] });
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual(['Voce;Valore', '"A;B";"x""y"', 'N;4294967294', 'Nulla;nessuno', '']);
    expect(csv).not.toMatch(/[^\r]\n/);
  });

  test('protezione dalle formule solo sui testi dell\'utente', () => {
    for (const s of ['=1+1', '+1', '-1', '@SUM(A1)', '\t=1', '\r=1']) expect(csvField(s, true).startsWith("'") || csvField(s, true).startsWith('"\'')).toBe(true);
    // anche dopo spazi iniziali e con i simboli a larghezza piena (revisione I2)
    for (const s of [' =1+1', '   +1', '\u3000=1', '\uFF1D1+1', ' \uFF20SUM(A1)']) expect(csvField(s, true).startsWith("'")).toBe(true);
    expect(csvField(' VLAN 10', true)).toBe(' VLAN 10');
    expect(csvField('-1')).toBe('-1');
    expect(csvField('VLAN 10', true)).toBe('VLAN 10');
    expect(csvField('a\nb', true)).toBe('"a\nb"');
    expect(csvField(null)).toBe('');
  });
});

describe('testo e Markdown', () => {
  const doc = toRows('F01', val(analyzeText('192.168.10.75/26')));

  test('testo: colonne allineate, numeri con il separatore delle migliaia', () => {
    const txt = toText(toRows('F01', val(analyzeText('172.16.45.200/20'))));
    const lines = txt.split('\n');
    expect(lines[0]).toBe('Analisi subnet · 172.16.45.200/20');
    const valueCols = lines.slice(3, 10).map((l) => l.search(/ {2}\S/) + 2);
    expect(new Set(valueCols).size).toBe(1);
    expect(txt).toContain('4.094');
    expect(cellText(null)).toBe('nessuno');
  });

  test('testo: tabella con numeri allineati a destra', () => {
    const txt = toText(toRows('F06', val(subdivideText('10.0.0.0/16', '', '19'))));
    expect(txt).toMatch(/\nN\. {2}Rete/);
    expect(txt).toMatch(/\n 8 {2}10\.0\.224\.0 {8}19/);
  });

  test('Markdown: tabella, valori tecnici tra apici inversi, testo dell\'utente protetto', () => {
    const md = toMarkdown(doc);
    expect(md.startsWith('# Analisi subnet · 192.168.10.75/26\n')).toBe(true);
    expect(md).toContain('| Rete | `192.168.10.64` |');
    expect(md).toContain('| Host utilizzabili | 62 |');
    expect(mdEscape('a|b *c* <script>\nx')).toBe('a\\|b \\*c\\* \\<script\\><br>x');
    const plan = toMarkdown(toRows('F06', val(subdivideText('10.0.0.0/24', '', '25')), { input: { labels: { 0: 'a|b' }, plan: '**x**' } }));
    expect(plan).toContain('a\\|b');
    expect(plan).toContain('\\*\\*x\\*\\*');
    expect(plan).toContain('| ---: |');
  });

  test('snippet F10 su più righe', () => {
    const d = toRows('F10', val(snippetsText('10.1.64.0/19')));
    expect(toText(d)).toContain(' network 10.1.64.0 0.0.31.255 area 0');
    expect(toMarkdown(d)).toContain('`ip access-list standard SUBNET`<br>` permit 10.1.64.0 0.0.31.255`');
  });
});

describe('passaggi ("Includi i passaggi")', () => {
  test('righe binarie divise in rete | host', () => {
    expect(splitBits('11111111.11111111.11110000.00000000', 20)).toEqual({ net: '11111111.11111111.1111', host: '0000.00000000' });
    expect(splitBits('11111111', 8)).toEqual({ net: '11111111', host: '' });
    expect(splitBits('00101101', 0)).toEqual({ net: '', host: '00101101' });
  });

  test('F01 con i tre metodi: testo e Markdown', () => {
    const v = val(analyzeText('172.16.45.200/20'));
    for (const method of ['binary', 'magic', 'multiples']) {
      const s = stepsBlock({ fn: 'F01', value: v, method });
      expect(s.items.length).toBeGreaterThan(3);
      const txt = toText(toRows('F01', v), { steps: [s] });
      const md = toMarkdown(toRows('F01', v), { steps: [s] });
      expect(clean(txt) && clean(md)).toBe(true);
      expect(txt).toContain('Nella guida: Capitolo');
    }
    const bin = stepsText(stepsBlock({ fn: 'F01', value: v, method: 'binary' })).join('\n');
    expect(bin).toContain('Passaggi · metodo binario');
    expect(bin).toMatch(/Mask +11111111\.11111111\.1111 \| 0000\.00000000/);
    expect(bin).toContain('a sinistra della barra i bit di rete');
  });

  test('passaggi senza righe binarie', () => {
    const s = stepsBlock({ fn: 'F05', value: val(prefixForHostsText('50')), method: 'rules', title: 'Passi' });
    expect(stepsText(s)[0]).toBe('Passi · metodo regole');
    expect(stepsText(s).join('\n')).not.toContain('barra');
  });
});

describe('JSON di un risultato (5.2)', () => {
  test('formato, indirizzi puntati, numeri semplici, passaggi strutturati', () => {
    const r = analyzeText('172.16.45.200/20');
    const v = val(r);
    const json = JSON.parse(toResultJson({ fn: 'F01', input: { ip: '172.16.45.200', prefix: 20 }, output: v, now: '2026-11-19T10:00:00.000Z',
      steps: [{ fn: 'F01', value: v, method: 'magic' }] }));
    expect(json).toMatchObject({ format: RESULT_FORMAT, version: 1, exportedAt: '2026-11-19T10:00:00.000Z', fn: 'F01', input: { ip: '172.16.45.200', prefix: 20 } });
    expect(json.output).toMatchObject({ ip: '172.16.45.200', network: '172.16.32.0', broadcast: '172.16.47.255', mask: '255.255.240.0', wildcard: '0.0.15.255', usableHosts: 4094, totalAddresses: 4096 });
    expect(json.output.classification.ip).toBe('172.16.45.200');
    expect(json.steps[0]).toMatchObject({ fn: 'F01', method: 'magic', chapter: 'cap-9' });
    expect(json.warnings).toBeUndefined();
  });

  test('F07 e F06: indirizzi annidati; il numero convertito di F02 resta numero', () => {
    expect(withDotted(val(sameSubnetText({ a: '10.1.63.5', b: '10.1.64.5', prefixA: '19' })))).toMatchObject({ a: '10.1.63.5', sideA: { network: '10.1.32.0', otherNetwork: '10.1.64.0' } });
    expect(withDotted(val(subdivideText('10.0.0.0/16', '', '19'))).page.items[1]).toMatchObject({ network: '10.0.32.0', broadcast: '10.0.63.255' });
    expect(withDotted(val(convertNumber('203', 10)))).toMatchObject({ value: 203 });
    expect(withDotted(val(convertAddress('10.0.0.1'))).uint32).toBe(167772161);
    const r = analyzeText('10.0.0.1/32');
    const json = JSON.parse(toResultJson({ fn: 'F01', input: {}, output: val(r), now: 'x', warnings: r.ok ? r.warnings : [] }));
    expect(json.output.broadcast).toBeNull();
    expect(json.warnings).toEqual([{ code: 'W_SINGLE', params: { prefix: 32 } }]);
  });
});

describe('JSON di F06 per un intervallo', () => {
  test('riepilogo senza la pagina, subnet dell\'intervallo, etichette del piano', () => {
    const v = val(subdivideText('10.0.0.0/16', '', '19', { limit: 1 }));
    const out = subdivideOutput(v, [6, 8], { 6: 'VLAN 70' });
    expect(out.page).toBeUndefined();
    expect(out.hasMore).toBeUndefined();
    expect(out.range).toEqual({ from: 7, to: 8 });
    expect(out.items.map((/** @type {any} */ x) => [x.index, x.label])).toEqual([[6, 'VLAN 70'], [7, undefined]]);
    const json = JSON.parse(toResultJson({ fn: 'F06', input: {}, output: out, now: 'x' }));
    expect(json.output.items[1].network).toBe('10.0.224.0');
    expect(subdivideOutput(v, [0, 1]).items[0].label).toBeUndefined();
  });
});

describe('nomi dei file (5.2, 7.2)', () => {
  const d = new Date(2026, 10, 18, 23, 33);
  test('esempio della specifica', () => {
    expect(stamp(d)).toBe('20261118-2333');
    expect(resultFileName('analisi', ['172.16.32.0', 20], 'csv', d)).toBe('subnet-analisi-172.16.32.0-20-20261118-2333.csv');
    expect(resultFileName('inverso', ['p24', 'h20', 's8'], 'md', d)).toBe('subnet-inverso-p24-h20-s8-20261118-2333.md');
    expect(sessionFileName(d, false)).toBe('subnetcalc-sessione-20261118-2333.json');
    expect(sessionFileName(d, true)).toBe('subnetcalc-sessione-20261118-2333-cifrato.json');
  });
  test('parti ripulite', () => {
    expect(safePart('Sede via Celoria / Lab è')).toBe('Sede_via_Celoria_Lab_e');
    expect(safePart('../../etc')).toBe('etc');
    expect(safePart('x'.repeat(60))).toHaveLength(40);
    expect(resultFileName('conversioni', ['', '..'], 'txt', d)).toBe('subnet-conversioni-20261118-2333.txt');
  });
});

describe('appunti, download, stampa (DOM simulato)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** DOM minimo: abbastanza per textarea, collegamenti e execCommand. */
  function fakeDom(/** @type {{ exec?: boolean | 'throw' }} */ o = {}) {
    const created = /** @type {any[]} */ ([]);
    const el = (/** @type {string} */ tag) => {
      const e = /** @type {any} */ ({ tag, style: {}, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, select() {}, click: vi.fn(), remove: vi.fn(), focus: vi.fn() });
      created.push(e);
      return e;
    };
    const document = {
      createElement: el,
      body: { appendChild: vi.fn() },
      activeElement: { focus: vi.fn() },
      execCommand: vi.fn(() => {
        if (o.exec === 'throw') throw new Error('no');
        return o.exec ?? true;
      }),
    };
    vi.stubGlobal('document', document);
    return { document, created };
  }

  test('appunti: API asincrona nei contesti sicuri', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    vi.stubGlobal('window', { isSecureContext: true });
    fakeDom();
    expect(await copyText('ciao')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('ciao');
  });

  test('appunti: ripiego su execCommand se l\'API manca o rifiuta', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: async () => { throw new Error('negato'); } } });
    vi.stubGlobal('window', { isSecureContext: true });
    const { document, created } = fakeDom();
    expect(await copyText('ciao')).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(created[0].value).toBe('ciao');
    expect(created[0].remove).toHaveBeenCalled();

    vi.stubGlobal('navigator', {});
    vi.stubGlobal('window', { isSecureContext: false });
    fakeDom({ exec: false });
    expect(await copyText('x')).toBe(false);
    fakeDom({ exec: 'throw' });
    expect(await copyText('x')).toBe(false);
  });

  test('download: Blob, collegamento con download, URL rilasciato', async () => {
    vi.useFakeTimers();
    const { created } = fakeDom();
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const create = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:x');
    downloadText('a;b\r\n', 'f.csv', MIME.csv);
    const a = created[0];
    expect(a.download).toBe('f.csv');
    expect(a.href).toBe('blob:x');
    expect(a.click).toHaveBeenCalled();
    const blob = /** @type {Blob} */ (create.mock.calls[0][0]);
    expect(blob.type).toBe('text/csv;charset=utf-8');
    expect(await blob.text()).toBe('a;b\r\n');
    vi.advanceTimersByTime(5000);
    expect(revoke).toHaveBeenCalledWith('blob:x');
    downloadText('x', 'f.txt');
    vi.useRealTimers();
    create.mockRestore();
    revoke.mockRestore();
  });

  test('lettura di un file e stampa', async () => {
    expect(await readFileText(new Blob(['{"a":1}']))).toBe('{"a":1}');
    const print = vi.fn();
    vi.stubGlobal('window', { print });
    printPage();
    expect(print).toHaveBeenCalled();
  });
});
