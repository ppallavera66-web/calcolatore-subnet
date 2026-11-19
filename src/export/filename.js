// @ts-check
/**
 * Nomi dei file (5.2 e 7.2):
 * - risultati: `subnet-<funzione>-<parti>-<AAAAMMGG-hhmm>.<ext>`, per esempio
 *   `subnet-analisi-172.16.32.0-20-20261118-2333.csv`; per le funzioni senza una rete le parti
 *   sono l'input principale (`subnet-conversioni-203-…`, `subnet-inverso-h50-…`);
 * - sessione: `subnetcalc-sessione-AAAAMMGG-hhmm(-cifrato).json`.
 * Data e ora locali del browser, passate da chi chiama.
 */

/** Data e ora locali come AAAAMMGG-hhmm. */
export function stamp(/** @type {Date} */ d) {
  const p = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** Parte di nome sicura per tutti i sistemi: lettere, cifre, punto, trattino, trattino basso. */
export function safePart(/** @type {string | number} */ s) {
  return String(s)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^[._]+|[._]+$/g, '')
    .slice(0, 40);
}

/**
 * @param {string} fnName nome della funzione per il file (analisi, tipo, conversioni, mask, stessa, inverso, suddivisione, snippet)
 * @param {(string | number)[]} parts
 * @param {string} ext
 * @param {Date} date
 */
export function resultFileName(fnName, parts, ext, date) {
  const segs = ['subnet', safePart(fnName), ...parts.map(safePart).filter(Boolean), stamp(date)];
  return `${segs.join('-')}.${ext}`;
}

/**
 * @param {Date} date
 * @param {boolean} encrypted
 */
export function sessionFileName(date, encrypted) {
  return `subnetcalc-sessione-${stamp(date)}${encrypted ? '-cifrato' : ''}.json`;
}
