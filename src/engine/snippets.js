// @ts-check
/**
 * F10 base · Wildcard e snippet di configurazione Cisco IOS (specifica tecnica, 3.6; cap. 14).
 */
import { ok, fail, warn } from './result.js';
import { ERR, WARN } from './errors.js';
import { parseAddressWithPrefix, parseIPv4, toDotted } from './ipv4.js';
import { maskOf, wildcardOf, assertPrefix, assertUint32 } from './prefix.js';

export const DEFAULT_OPTIONS = Object.freeze({
  acl: Object.freeze({ number: 10, name: 'SUBNET', action: 'permit' }),
  ospf: Object.freeze({ process: 1, area: 0 }),
});

/**
 * @param {unknown} n
 */
function validAclNumber(n) {
  return Number.isInteger(n) && ((/** @type {number} */ (n) >= 1 && /** @type {number} */ (n) <= 99) || (/** @type {number} */ (n) >= 1300 && /** @type {number} */ (n) <= 1999));
}

/**
 * Area OSPF: intero 0–4.294.967.295 oppure forma puntata.
 * @param {unknown} area
 * @returns {string | null}
 */
function normalizeArea(area) {
  if (typeof area === 'number') return Number.isInteger(area) && area >= 0 && area <= 0xffffffff ? String(area) : null;
  const raw = String(area ?? '').trim();
  if (/^[0-9]{1,10}$/.test(raw)) {
    const n = Number(raw);
    return n <= 0xffffffff && (raw === '0' || raw[0] !== '0') ? String(n) : null;
  }
  const ip = parseIPv4(raw);
  return ip.ok ? toDotted(ip.value) : null;
}

/**
 * @param {number} ip
 * @param {number} prefix
 * @param {{ acl?: Partial<{ number: number, name: string, action: string }>,
 *   ospf?: Partial<{ process: number, area: number | string }> }} [options]
 */
export function snippets(ip, prefix, options = {}) {
  assertUint32(ip);
  assertPrefix(prefix);
  const acl = { ...DEFAULT_OPTIONS.acl, ...(options.acl ?? {}) };
  const ospf = { ...DEFAULT_OPTIONS.ospf, ...(options.ospf ?? {}) };

  if (!validAclNumber(acl.number)) return fail(ERR.ACL_NUMBER_RANGE, 'aclNumber', { value: acl.number });
  if (typeof acl.name !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(acl.name)) {
    return fail(ERR.ACL_NAME_FORMAT, 'aclName', { text: String(acl.name) });
  }
  if (acl.action !== 'permit' && acl.action !== 'deny') return fail(ERR.ACL_ACTION_VALUE, 'aclAction', { value: String(acl.action) });
  if (!Number.isInteger(ospf.process) || ospf.process < 1 || ospf.process > 65535) {
    return fail(ERR.OSPF_PROCESS_RANGE, 'ospfProcess', { value: ospf.process });
  }
  const area = normalizeArea(ospf.area);
  if (area === null) return fail(ERR.OSPF_AREA_FORMAT, 'ospfArea', { text: String(ospf.area) });

  const network = (ip & maskOf(prefix)) >>> 0;
  const wildcard = wildcardOf(prefix);
  const warnings = network !== ip ? [warn(WARN.W_HOST_BITS_SET, { given: toDotted(ip), network: toDotted(network), prefix })] : [];

  const net = toDotted(network);
  const wild = toDotted(wildcard);
  let match = `${net} ${wild}`;
  if (prefix === 32) match = `host ${net}`;
  if (prefix === 0) match = 'any';

  return ok(
    {
      network,
      prefix,
      wildcard,
      options: { acl: { number: acl.number, name: acl.name, action: acl.action }, ospf: { process: ospf.process, area } },
      lines: {
        aclStandard: [`access-list ${acl.number} ${acl.action} ${match}`],
        aclNamed: [`ip access-list standard ${acl.name}`, ` ${acl.action} ${match}`],
        ospf: [`router ospf ${ospf.process}`, ` network ${net} ${wild} area ${area}`],
      },
    },
    warnings,
  );
}

/**
 * @param {unknown} networkText `IP/n`, oppure IP con prefisso nel secondo campo
 * @param {unknown} [prefixText]
 * @param {Parameters<typeof snippets>[2]} [options]
 */
export function snippetsText(networkText, prefixText, options) {
  const input = parseAddressWithPrefix(networkText, prefixText, { ipField: 'network', prefixField: 'prefix' });
  return input.ok ? snippets(input.value.ip, input.value.prefix, options) : input;
}
