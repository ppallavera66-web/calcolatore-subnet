// @ts-check
/**
 * Formattazione per l'utente (specifica tecnica, 3.1 e m13): numeri con il separatore delle
 * migliaia, indirizzi, intervalli abbreviati, righe binarie divise in rete e host, testi degli esiti.
 * Funzioni pure, senza DOM: si provano in Node (tests/ui/format.test.js).
 */
import { toDotted } from '../engine/index.js';
import { t, fmtNumber, ord, ordShort, magicLabel } from '../i18n/strings.it.js';

export { ord, ordShort };

/**
 * Intero con separatore delle migliaia "." (m13).
 * @param {number} n
 */
export const num = (n) => fmtNumber(n);

/**
 * Indirizzo puntato da un uint32; `null` diventa "nessuno" (broadcast di /31 e /32).
 * @param {number | null} u
 */
export const ip = (u) => (u === null ? t('none') : toDotted(u));

/**
 * Rete in notazione CIDR.
 * @param {number} network
 * @param {number} prefix
 */
export const cidr = (network, prefix) => `${toDotted(network)}/${prefix}`;

/**
 * Numero magico con l'ottetto ("16 · 3°").
 * @param {{ magic: number, index: number }} interesting
 */
export const magic = (interesting) => magicLabel(interesting.magic, interesting.index);

/**
 * Intervallo di indirizzi abbreviato come nello schizzo 9.10: gli ottetti iniziali uguali
 * si omettono e l'intervallo inizia con un punto (".32.1 – .47.254").
 * Con un solo indirizzo restituisce l'indirizzo; se differisce già il primo ottetto, la forma completa.
 * @param {number} first
 * @param {number} last
 */
export function rangeShort(first, last) {
  if (first === last) return toDotted(first);
  const a = toDotted(first).split('.');
  const b = toDotted(last).split('.');
  let same = 0;
  while (same < 3 && a[same] === b[same]) same++;
  if (same === 0) return `${a.join('.')} – ${b.join('.')}`;
  return `.${a.slice(same).join('.')} – .${b.slice(same).join('.')}`;
}

/**
 * Intervallo completo ("172.16.32.1 – 172.16.47.254").
 * @param {number} first
 * @param {number} last
 */
export const range = (first, last) => (first === last ? toDotted(first) : `${toDotted(first)} – ${toDotted(last)}`);

/**
 * @typedef {{ text: string, kind: 'net' | 'host' | 'sep' }} BitSegment
 */

/**
 * Divide una stringa binaria (con o senza punti) in segmenti di rete, di host e separatori,
 * per colorare le righe dei passaggi (4.1: ambra = rete, verde acqua = host).
 * `netBits` è il numero di bit di rete contati da sinistra, punti esclusi.
 * @param {string} value
 * @param {number} netBits
 * @param {boolean} [bitwise] ogni 1 come rete e ogni 0 come host, senza confine (mask non valida)
 * @returns {BitSegment[]}
 */
export function bitSegments(value, netBits, bitwise = false) {
  /** @type {BitSegment[]} */
  const out = [];
  let bit = 0;
  for (const ch of value) {
    /** @type {BitSegment['kind']} */
    const kind = ch === '.' || ch === ' ' ? 'sep' : bitwise ? (ch === '1' ? 'net' : 'host') : bit++ < netBits ? 'net' : 'host';
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += ch;
    else out.push({ text: ch, kind });
  }
  return out;
}

/**
 * Etichetta del tipo di indirizzo per la scheda risultato (F04): ambito e blocco principale.
 * @param {{ scope: string, primary: { code: string, cidr: string, ref: string } | null, historicalClass: { letter: string, reserved: boolean } }} c
 */
export function addressType(c) {
  const scope = t(`scope.${c.scope}`);
  const block = c.primary ? t(`block.${c.primary.code}`) : null;
  const cls = `${t('ui.class')} ${c.historicalClass.letter}${c.historicalClass.reserved ? ` (${t('ui.reserved')})` : ''}`;
  return {
    scope,
    /** Testo breve per l'etichetta: "Privato", "Speciale · Loopback…", "Pubblico". */
    badge: c.scope === 'special' && block ? `${scope} · ${block}` : scope,
    block,
    blockRef: c.primary ? `${c.primary.cidr} · ${c.primary.ref}` : null,
    cls,
  };
}

/**
 * Testo di un errore o di un avviso del motore.
 * @param {{ code: string, params?: Record<string, any> }} e
 */
export const message = (e) => t(e.code, e.params ?? {});

/**
 * Testo di un passaggio didattico.
 * @param {{ id: string, values: Record<string, any> }} s
 */
export const stepText = (s) => t(`step.${s.id}`, s.values);

/**
 * Numero del capitolo da un'ancora della guida ("cap-9" → "9").
 * @param {string} anchor
 */
export const chapterNumber = (anchor) => anchor.replace(/^cap-/, '');

/**
 * Pagina di un elenco a pagine (F06): pagina corrente da 0, numero di pagine, righe mostrate (da 1).
 * @param {number} offset
 * @param {number} limit
 * @param {number} count
 */
export function pageInfo(offset, limit, count) {
  const pages = Math.max(1, Math.ceil(count / limit));
  const page = Math.min(pages - 1, Math.floor(offset / limit));
  const from = page * limit + 1;
  const to = Math.min(count, (page + 1) * limit);
  return { page, pages, from, to };
}

/**
 * Data e ora brevi per la cronologia ("19/11/2026 00:48"), nel fuso del browser.
 * @param {string} iso
 */
export function dateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Riepilogo di una voce di cronologia (sezione 6.2): funzione e input in una riga.
 * @param {{ fn: string, input: Record<string, any> }} entry
 */
export function historySummary(entry) {
  const i = entry.input;
  switch (entry.fn) {
    case 'F01':
      return i.prefix === null || i.prefix === undefined ? i.ip : `${i.ip}/${i.prefix}`;
    case 'F02':
      return i.kind === 'number' ? `${i.text} (${t('ui.base')} ${i.base})` : i.text;
    case 'F03':
      return i.mask;
    case 'F04':
      return i.ip;
    case 'F05':
      if (i.mode === 'hosts') return t('ui.history.hosts', { hosts: fmtNumber(i.hosts) });
      if (i.mode === 'subnets') return t('ui.history.subnets', { prefix: i.prefix, subnets: fmtNumber(i.subnets) });
      return t('ui.history.both', { prefix: i.prefix, hosts: fmtNumber(i.hosts), subnets: fmtNumber(i.subnets) });
    case 'F06':
      return `${i.block}/${i.prefix} → /${i.newPrefix}`;
    case 'F07':
      return `${i.a}/${i.prefixA} · ${i.b}/${i.prefixB ?? i.prefixA}${i.gateway ? ` · gw ${i.gateway}` : ''}`;
    default:
      return `${i.network}/${i.prefix}`;
  }
}
