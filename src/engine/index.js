// @ts-check
/**
 * API pubblica del motore: unico punto di import per gli altri moduli (specifica tecnica, 2.3).
 * Due livelli: funzioni su valori già validati e funzioni su testo (suffisso `Text`).
 */
export { ok, fail, warn } from './result.js';
export { ERR, WARN, REASON, LARGE_LIST } from './errors.js';
export {
  MAX_UINT32,
  parseIPv4,
  parsePrefix,
  parseMask,
  parsePrefixOrMask,
  parseAddressInput,
  parseAddressWithPrefix,
  parseCount,
  toDotted,
  toBinaryDotted,
  octetToBinary,
  toHexDotted,
  toHex32,
} from './ipv4.js';
export {
  MASK_OCTET_VALUES,
  maskOf,
  wildcardOf,
  blockSize,
  interestingOctet,
  hostRule,
  octetsOf,
  octetAt,
  popcount,
} from './prefix.js';
export { SPECIAL_BLOCKS, BLOCK_CODES } from './special-blocks.js';
export { analyze, analyzeText } from './analyze.js';
export { convertNumber, convertAddress, prefixToMask, maskToPrefix, weightsOf } from './convert.js';
export { validateMask, validateMaskValue } from './validate-mask.js';
export { classify, classifyText } from './classify.js';
export {
  MAX_HOSTS,
  prefixForHosts,
  prefixForSubnets,
  prefixForBoth,
  prefixForHostsText,
  prefixForSubnetsText,
  prefixForBothText,
} from './inverse.js';
export { MAX_PAGE, subdivide, subdivideText, subnetAt, indexOf, iterateSubnets } from './subdivide.js';
export { sameSubnet, sameSubnetText } from './same-subnet.js';
export { DEFAULT_OPTIONS as SNIPPET_DEFAULTS, snippets, snippetsText } from './snippets.js';
export { METHODS, DEFAULT_METHOD, methodsFor, resolveMethod, explain } from './steps/index.js';
