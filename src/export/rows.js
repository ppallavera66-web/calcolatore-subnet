// @ts-check
/**
 * Modello comune dell'export (specifica tecnica, 5.1): `toRows(fn, valore)` trasforma il risultato
 * del motore in un documento con una di due forme, da cui partono tutti i formati.
 * - chiave/valore: `{ title, pairs: [{ label, value }] }` per F01–F05, F07, F10;
 * - tabella: `{ title, columns, rows }` per F06 (con il riepilogo in `pairs`).
 *
 * I valori restano grezzi: numeri come numeri (i formati per le persone aggiungono il separatore
 * delle migliaia, CSV e JSON no, m13), indirizzi come stringhe puntate, `null` = "nessuno".
 * `mono` indica i valori tecnici (tra apici inversi in Markdown); `user` i testi scritti dall'utente
 * (protetti dalle formule nel CSV).
 */
import { toDotted, iterateSubnets } from '../engine/index.js';
import { t, fmtNumber, magicLabel } from '../i18n/strings.it.js';

const magicLabelOf = (/** @type {{ magic: number, index: number }} */ i) => magicLabel(i.magic, i.index);

/**
 * @typedef {string | number | null} Cell
 * @typedef {{ label: string, value: Cell, mono?: boolean, user?: boolean, group?: string }} Pair
 * @typedef {{ key: string, label: string, mono?: boolean, user?: boolean, numeric?: boolean }} Column
 * @typedef {{ title: string, pairs: Pair[], columns?: Column[], rows?: Record<string, Cell>[], notes?: string[] }} Doc
 * @typedef {{ code: string, params?: Record<string, any> }} Warning
 */

/** Righe massime di un export di F06 (m9): oltre si sceglie un intervallo di indici. */
export const EXPORT_MAX_ROWS = 65536;

/**
 * Intervallo di righe chiesto dall'utente (numerazione da 1, estremi compresi) → `[start, end)` da 0,
 * oppure il motivo per cui non va bene.
 * @param {number} count subnet in tutto
 * @param {unknown} from
 * @param {unknown} to
 * @returns {{ ok: true, range: [number, number] } | { ok: false, code: 'RANGE_FORMAT' | 'RANGE_ORDER' | 'RANGE_TOO_LARGE', max: number }}
 */
export function rangeFor(count, from, to) {
  const a = Number(from);
  const b = Number(to);
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < 1 || a > count || b > count) return { ok: false, code: 'RANGE_FORMAT', max: count };
  if (b < a) return { ok: false, code: 'RANGE_ORDER', max: count };
  if (b - a + 1 > EXPORT_MAX_ROWS) return { ok: false, code: 'RANGE_TOO_LARGE', max: EXPORT_MAX_ROWS };
  return { ok: true, range: [a - 1, b] };
}

const dotted = (/** @type {number | null} */ u) => (u === null ? null : toDotted(u));
const cidr = (/** @type {number} */ network, /** @type {number} */ prefix) => `${toDotted(network)}/${prefix}`;
const yesNo = (/** @type {boolean} */ b) => t(b ? 'export.yes' : 'export.no');
const notesOf = (/** @type {Warning[] | undefined} */ w) => (w ?? []).map((x) => t(x.code, x.params ?? {}));

/**
 * Tipo di indirizzo (F04) in testo: ambito e blocco principale.
 * @param {any} c risultato di classify
 */
function typeText(c) {
  const scope = t(`scope.${c.scope}`);
  return c.primary ? `${scope} · ${t(`block.${c.primary.code}`)} (${c.primary.cidr}, ${c.primary.ref})` : scope;
}

/** @param {any} c */
const classText = (c) => `${t('ui.class')} ${c.historicalClass.letter}${c.historicalClass.reserved ? ` (${t('ui.reserved')})` : ''}`;

/**
 * Documento di export di un risultato.
 * @param {string} fn F01–F07, F10
 * @param {any} v il campo `value` di un esito positivo del motore
 * @param {{ warnings?: Warning[], input?: Record<string, any> }} [o]
 * @returns {Doc}
 */
export function toRows(fn, v, o = {}) {
  const notes = notesOf(o.warnings);
  switch (fn) {
    case 'F01':
      return {
        title: `${t('ui.title.calcola/analisi')} · ${toDotted(v.ip)}/${v.prefix}`,
        pairs: [
          { label: t('ui.field.ip'), value: toDotted(v.ip), mono: true },
          { label: t('export.prefix'), value: `/${v.prefix}`, mono: true },
          { label: t('ui.r.network'), value: toDotted(v.network), mono: true },
          { label: t('ui.r.broadcast'), value: dotted(v.broadcast), mono: true },
          { label: t('ui.r.firstHost'), value: toDotted(v.firstHost), mono: true },
          { label: t('ui.r.lastHost'), value: toDotted(v.lastHost), mono: true },
          { label: t('ui.r.usable'), value: v.usableHosts },
          { label: t('ui.r.total'), value: v.totalAddresses },
          { label: t('ui.r.mask'), value: toDotted(v.mask), mono: true },
          { label: t('ui.r.wildcard'), value: toDotted(v.wildcard), mono: true },
          { label: t('ui.r.magic'), value: magicLabelOf(v.interesting) },
          { label: t('ui.r.block'), value: t('ui.r.blockRange', { start: v.interesting.blockStart, end: v.interesting.blockEnd, index: v.interesting.index }) },
          { label: t('ui.r.position'), value: t('ui.r.positionValue', { n: v.offset + 1, role: t(`role.${v.role}`) }) },
          { label: t('ui.r.previous'), value: v.previousNetwork === null ? t('ui.r.outside') : cidr(v.previousNetwork, v.prefix), mono: v.previousNetwork !== null },
          { label: t('ui.r.next'), value: v.nextNetwork === null ? t('ui.r.outside') : cidr(v.nextNetwork, v.prefix), mono: v.nextNetwork !== null },
          { label: t('ui.r.type'), value: typeText(v.classification) },
          { label: t('ui.r.class'), value: classText(v.classification) },
        ],
        notes,
      };
    case 'F04':
      return {
        title: `${t('ui.r.type')} · ${toDotted(v.ip)}`,
        pairs: [
          { label: t('ui.field.ip'), value: toDotted(v.ip), mono: true },
          { label: t('ui.r.type'), value: typeText(v) },
          { label: t('ui.r.class'), value: classText(v) },
          { label: t('export.defaultMask'), value: v.historicalClass.defaultPrefix === null ? null : `/${v.historicalClass.defaultPrefix}`, mono: true },
          { label: t('ui.r.blocks'), value: v.blocks.length ? v.blocks.map((/** @type {any} */ b) => b.cidr).join(', ') : null, mono: true },
        ],
        notes,
      };
    case 'F02':
      return convertRows(v, o.input ?? {}, notes);
    case 'F03':
      return {
        title: `${t('ui.title.calcola/mask')} · ${toDotted(v.mask)}`,
        pairs: [
          { label: t('ui.mask.field'), value: toDotted(v.mask), mono: true },
          { label: t('export.result'), value: v.valid ? t('ui.mask.valid', { prefix: v.prefix }) : t('ui.mask.invalid') },
          { label: t('ui.conv.binaryDotted'), value: v.octets.map((/** @type {any} */ x) => x.binary).join('.'), mono: true },
          ...(v.reason ? [{ label: t('export.reason'), value: t(v.reason.code, v.reason.params) }] : []),
          ...(v.suggestions.length
            ? [{ label: t('ui.mask.suggestions'), value: v.suggestions.map((/** @type {any} */ s) => `${toDotted(s.mask)} (/${s.prefix})`).join(', '), mono: true }]
            : []),
        ],
        notes,
      };
    case 'F05':
      return inverseRows(v, notes);
    case 'F06':
      return subdivideRows(v, o.input ?? {}, notes);
    case 'F07':
      return sameRows(v, notes);
    case 'F10':
      return {
        title: `${t('ui.snip.title')} · ${cidr(v.network, v.prefix)}`,
        pairs: [
          { label: t('ui.r.network'), value: cidr(v.network, v.prefix), mono: true },
          { label: t('ui.r.wildcard'), value: toDotted(v.wildcard), mono: true },
          { label: t('ui.snip.aclStandard'), value: v.lines.aclStandard.join('\n'), mono: true },
          { label: t('ui.snip.aclNamed'), value: v.lines.aclNamed.join('\n'), mono: true },
          { label: t('ui.snip.ospf'), value: v.lines.ospf.join('\n'), mono: true },
        ],
        notes,
      };
    default:
      throw new RangeError(`Funzione senza export: ${fn}`);
  }
}

/**
 * F02: il risultato può essere un numero, un indirizzo o un prefisso/mask (si riconosce dalla forma).
 * @param {any} v
 * @param {Record<string, any>} input
 * @param {string[]} notes
 * @returns {Doc}
 */
function convertRows(v, input, notes) {
  if ('dec' in v) {
    return {
      title: `${t('ui.title.calcola/conversioni')} · ${input.text ?? v.dec} (${t('ui.base')} ${v.base})`,
      pairs: [
        { label: t('ui.conv.number'), value: input.text ?? v.dec, mono: true, user: true },
        { label: t('ui.conv.base'), value: t(`ui.conv.base.${v.base}`) },
        { label: t('ui.conv.dec'), value: v.dec, mono: true },
        { label: t('ui.conv.bin'), value: v.bin, mono: true },
        { label: t('ui.conv.hex'), value: v.hex, mono: true },
        { label: t('ui.conv.weights'), value: v.weights.length ? v.weights.join(' + ') : '0', mono: true },
      ],
      notes,
    };
  }
  if ('binaryDotted' in v) {
    return {
      title: `${t('ui.title.calcola/conversioni')} · ${v.dotted}`,
      pairs: [
        { label: t('ui.conv.address.title'), value: v.dotted, mono: true },
        { label: t('ui.conv.binaryDotted'), value: v.binaryDotted, mono: true },
        { label: t('ui.conv.hexDotted'), value: v.hexDotted, mono: true },
        { label: t('ui.conv.hex32'), value: v.hex32, mono: true },
        { label: t('ui.conv.uint32'), value: v.uint32 },
      ],
      notes,
    };
  }
  return {
    title: `${t('ui.title.calcola/conversioni')} · /${v.prefix}`,
    pairs: [
      { label: t('ui.conv.prefix'), value: `/${v.prefix}`, mono: true },
      { label: t('ui.r.mask'), value: v.maskDotted, mono: true },
      { label: t('ui.r.wildcard'), value: toDotted(v.wildcard), mono: true },
      { label: t('ui.conv.maskBinary'), value: v.maskBinary, mono: true },
    ],
    notes,
  };
}

/**
 * @param {any} v
 * @param {string[]} notes
 * @returns {Doc}
 */
function inverseRows(v, notes) {
  const title = t('ui.title.pianifica/inverso');
  if (v.mode === 'hosts') {
    return {
      title: `${title} · ${t('ui.inv.hosts')} ${fmtNumber(v.hosts)}`,
      pairs: [
        { label: t('ui.inv.hosts'), value: v.hosts },
        { label: t('ui.inv.result.prefix'), value: `/${v.prefix}`, mono: true },
        { label: t('ui.inv.result.mask'), value: toDotted(v.mask), mono: true },
        { label: t('ui.inv.result.available'), value: v.usableHosts },
        { label: t('ui.inv.result.spare'), value: v.spare },
        ...v.alternatives.map((/** @type {any} */ a) => ({ label: t('export.alternative'), value: `/${a.prefix} · ${t(`kind.${a.kind}`)}`, mono: false })),
      ],
      notes,
    };
  }
  if (v.mode === 'subnets') {
    return {
      title: `${title} · /${v.blockPrefix} → ${fmtNumber(v.requested)} subnet`,
      pairs: [
        { label: t('ui.inv.prefix'), value: `/${v.blockPrefix}`, mono: true },
        { label: t('ui.inv.subnets'), value: v.requested },
        { label: t('ui.inv.result.newPrefix'), value: `/${v.newPrefix}`, mono: true },
        { label: t('ui.inv.result.borrowed'), value: v.borrowedBits },
        { label: t('ui.inv.result.count'), value: v.subnets },
        { label: t('ui.inv.result.spareSubnets'), value: v.spare },
        { label: t('ui.inv.result.hostsPer'), value: v.usableHostsPerSubnet },
      ],
      notes,
    };
  }
  return {
    title: `${title} · /${v.blockPrefix}, ${fmtNumber(v.hosts)} host, ${fmtNumber(v.subnets)} subnet`,
    pairs: [
      { label: t('ui.inv.prefix'), value: `/${v.blockPrefix}`, mono: true },
      { label: t('ui.inv.hosts'), value: v.hosts },
      { label: t('ui.inv.subnets'), value: v.subnets },
      { label: t('export.result'), value: v.feasible ? t('ui.inv.feasible') : t('ui.inv.infeasible') },
      ...(v.feasible
        ? [
            { label: t('ui.inv.result.range'), value: v.range[0] === v.range[1] ? `/${v.range[0]}` : `/${v.range[0]} – /${v.range[1]}`, mono: true },
            { label: t('ui.inv.result.recommended'), value: `/${v.recommended} · ${t('ui.inv.result.recommendedNote', { subnets: v.subnetsAtRecommended, hosts: v.usableHostsAtRecommended })}` },
            ...(v.alternative !== v.recommended ? [{ label: t('ui.inv.result.alternative'), value: `/${v.alternative}`, mono: true }] : []),
          ]
        : [{ label: t('export.reason'), value: t(v.reason.code, v.reason.params) }]),
    ],
    notes,
  };
}

/**
 * @param {any} v
 * @param {string[]} notes
 * @returns {Doc}
 */
function sameRows(v, notes) {
  const pb = v.prefixB ?? v.prefixA;
  /** @type {Pair[]} */
  const pairs = [
    { label: t('ui.same.a'), value: `${toDotted(v.a)}/${v.prefixA}`, mono: true },
    { label: t('ui.same.b'), value: `${toDotted(v.b)}/${pb}`, mono: true },
    { label: t('export.result'), value: t(`verdict.${v.verdict}`) },
    { label: t('export.same.aSeesB'), value: yesNo(v.aSeesBLocal) },
    { label: t('export.same.bSeesA'), value: yesNo(v.bSeesALocal) },
    { label: t('export.same.netA'), value: cidr(v.sideA.network, v.sideA.prefix), mono: true },
    { label: t('export.same.bWithA'), value: cidr(v.sideA.otherNetwork, v.sideA.prefix), mono: true },
    { label: t('export.same.netB'), value: cidr(v.sideB.network, v.sideB.prefix), mono: true },
    { label: t('export.same.aWithB'), value: cidr(v.sideB.otherNetwork, v.sideB.prefix), mono: true },
  ];
  if (v.gateway !== null) {
    pairs.push(
      { label: t('ui.same.gw'), value: toDotted(v.gateway), mono: true },
      { label: t('export.same.gwA'), value: yesNo(v.gatewayInSubnet.a) },
      { label: t('export.same.gwB'), value: yesNo(v.gatewayInSubnet.b) },
    );
  }
  return { title: `${t('ui.title.calcola/stessa')} · ${toDotted(v.a)} · ${toDotted(v.b)}`, pairs, notes };
}

/**
 * Colonne di F06 (5.2): N., Rete, Prefisso, Primo host, Ultimo host, Broadcast, Host; più Etichetta per un piano.
 * @param {boolean} withLabels
 * @returns {Column[]}
 */
export function subdivideColumns(withLabels) {
  /** @type {Column[]} */
  const cols = [
    { key: 'n', label: t('ui.sub.col.n'), numeric: true },
    { key: 'network', label: t('ui.sub.col.network'), mono: true },
    { key: 'prefix', label: t('export.prefix'), numeric: true },
    { key: 'first', label: t('ui.sub.col.first'), mono: true },
    { key: 'last', label: t('ui.sub.col.last'), mono: true },
    { key: 'broadcast', label: t('ui.sub.col.broadcast'), mono: true },
    { key: 'hosts', label: t('ui.sub.col.hosts'), numeric: true },
  ];
  if (withLabels) cols.push({ key: 'label', label: t('export.label'), user: true });
  return cols;
}

/**
 * Righe di F06 per un intervallo di indici [start, end), con le etichette del piano se presenti.
 * @param {{ network: number, prefix: number }} block
 * @param {number} newPrefix
 * @param {number} start
 * @param {number} end
 * @param {Record<string, string> | null} [labels]
 * @returns {Record<string, Cell>[]}
 */
export function subdivideRange(block, newPrefix, start, end, labels = null) {
  /** @type {Record<string, Cell>[]} */
  const rows = [];
  for (const s of iterateSubnets(block.network, block.prefix, newPrefix, start, end)) {
    /** @type {Record<string, Cell>} */
    const row = {
      n: s.index + 1,
      network: toDotted(s.network),
      prefix: s.prefix,
      first: toDotted(s.firstHost),
      last: toDotted(s.lastHost),
      broadcast: dotted(s.broadcast),
      hosts: s.usableHosts,
    };
    if (labels) row.label = labels[String(s.index)] ?? '';
    rows.push(row);
  }
  return rows;
}

/**
 * F06: riepilogo in `pairs`, subnet in tabella. Per default le righe della pagina calcolata;
 * con `input.range = [start, end)` quelle dell'intervallo (massimo 65.536, lo controlla chi chiama).
 * @param {any} v
 * @param {Record<string, any>} input `{ range?: [number, number], labels?: Record<string, string> | null, plan?: string }`
 * @param {string[]} notes
 * @returns {Doc}
 */
function subdivideRows(v, input, notes) {
  const labels = input.labels ?? null;
  const [start, end] = input.range ?? [v.page.offset, v.page.offset + v.page.items.length];
  const block = `${toDotted(v.block.network)}/${v.block.prefix}`;
  return {
    title: `${t('ui.title.pianifica/suddivisione')} · ${block} → /${v.newPrefix}${input.plan ? ` · ${input.plan}` : ''}`,
    pairs: [
      ...(input.plan ? [{ label: t('export.plan'), value: input.plan, user: true }] : []),
      { label: t('ui.sub.network'), value: block, mono: true },
      { label: t('ui.sub.newPrefix'), value: `/${v.newPrefix}`, mono: true },
      { label: t('ui.sub.count'), value: v.count },
      { label: t('ui.sub.borrowed'), value: v.borrowedBits },
      { label: t('ui.sub.size'), value: v.subnetSize },
      { label: t('ui.sub.hosts'), value: v.hostsPerSubnet },
      { label: t('ui.sub.step'), value: magicLabelOf(v.interesting) },
      { label: t('export.rows'), value: t('ui.sub.caption', { from: start + 1, to: end, count: v.count }) },
    ],
    columns: subdivideColumns(!!labels),
    rows: subdivideRange(v.block, v.newPrefix, start, end, labels),
    notes,
  };
}

