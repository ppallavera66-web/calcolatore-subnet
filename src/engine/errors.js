// @ts-check
/**
 * Codici stabili di errore, avviso e motivo (specifica tecnica, 3.4).
 * I testi per l'utente stanno in src/i18n/strings.it.js.
 */

/** Errori: l'esito è `ok: false`. */
export const ERR = Object.freeze({
  IP_EMPTY: 'IP_EMPTY',
  IP_FORMAT: 'IP_FORMAT',
  IP_OCTET_RANGE: 'IP_OCTET_RANGE',
  IP_LEADING_ZERO: 'IP_LEADING_ZERO',
  INPUT_FORMAT: 'INPUT_FORMAT',
  PREFIX_EMPTY: 'PREFIX_EMPTY',
  PREFIX_FORMAT: 'PREFIX_FORMAT',
  PREFIX_RANGE: 'PREFIX_RANGE',
  MASK_FORMAT: 'MASK_FORMAT',
  // Mask non valida dentro un input "IP mask" o "IP/mask": stessi codici e
  // parametri del motivo di F03 (decisione della fase 3).
  MASK_OCTET_VALUE: 'MASK_OCTET_VALUE',
  MASK_NONCONTIGUOUS: 'MASK_NONCONTIGUOUS',
  NUMBER_FORMAT: 'NUMBER_FORMAT',
  NUMBER_RANGE: 'NUMBER_RANGE',
  BASE_UNSUPPORTED: 'BASE_UNSUPPORTED',
  HOSTS_RANGE: 'HOSTS_RANGE',
  SUBNETS_RANGE: 'SUBNETS_RANGE',
  SUBNETS_TOO_MANY: 'SUBNETS_TOO_MANY',
  PREFIX_SHORTER: 'PREFIX_SHORTER',
  PAGE_RANGE: 'PAGE_RANGE',
  ACL_NUMBER_RANGE: 'ACL_NUMBER_RANGE',
  // Aggiunti in fase 3: nome ACL e azione non previsti dalla tabella 3.4.
  ACL_NAME_FORMAT: 'ACL_NAME_FORMAT',
  ACL_ACTION_VALUE: 'ACL_ACTION_VALUE',
  OSPF_PROCESS_RANGE: 'OSPF_PROCESS_RANGE',
  OSPF_AREA_FORMAT: 'OSPF_AREA_FORMAT',
});

/** Avvisi: il risultato resta valido. */
export const WARN = Object.freeze({
  W_IS_NETWORK: 'W_IS_NETWORK',
  W_IS_BROADCAST: 'W_IS_BROADCAST',
  W_P2P: 'W_P2P',
  W_SINGLE: 'W_SINGLE',
  W_HOST_BITS_SET: 'W_HOST_BITS_SET',
  W_LOOKS_LIKE_WILDCARD: 'W_LOOKS_LIKE_WILDCARD',
  W_MASKS_DIFFER: 'W_MASKS_DIFFER',
  W_GATEWAY_OUTSIDE: 'W_GATEWAY_OUTSIDE',
  W_GATEWAY_IS_NETWORK: 'W_GATEWAY_IS_NETWORK',
  W_GATEWAY_IS_BROADCAST: 'W_GATEWAY_IS_BROADCAST',
  W_GATEWAY_IS_HOST: 'W_GATEWAY_IS_HOST',
  W_NO_USABLE_HOSTS: 'W_NO_USABLE_HOSTS',
  W_LARGE_LIST: 'W_LARGE_LIST',
  W_SAME_PREFIX: 'W_SAME_PREFIX',
});

/** Motivi: spiegano un esito negativo che non è un errore (F03, F05 caso C). */
export const REASON = Object.freeze({
  MASK_OCTET_VALUE: 'MASK_OCTET_VALUE',
  MASK_NONCONTIGUOUS: 'MASK_NONCONTIGUOUS',
  BOTH_BLOCK_TOO_SMALL: 'BOTH_BLOCK_TOO_SMALL',
  BOTH_CONFLICT: 'BOTH_CONFLICT',
});

/** Soglia oltre la quale F06 chiede un intervallo per l'export (m9). */
export const LARGE_LIST = 65536;
