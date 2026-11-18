// @ts-check
import { describe, test, expect } from 'vitest';
import { snippets, snippetsText, wildcardOf, toDotted } from '../../src/engine/index.js';
import { ip, d, val, errCode, warnCodes } from '../helpers.js';

describe('10.2 K · wildcard e snippet (F10 base)', () => {
  test.each([[26, '0.0.0.63'], [20, '0.0.15.255'], [11, '0.31.255.255'], [30, '0.0.0.3']])('/%i → %s (cap. 14)', (p, w) => {
    expect(toDotted(wildcardOf(p))).toBe(w);
    expect(d(val(snippets(0, p)).wildcard)).toBe(w);
  });
  test('192.168.10.64/26', () => {
    expect(val(snippetsText('192.168.10.64/26')).lines).toEqual({
      aclStandard: ['access-list 10 permit 192.168.10.64 0.0.0.63'],
      aclNamed: ['ip access-list standard SUBNET', ' permit 192.168.10.64 0.0.0.63'],
      ospf: ['router ospf 1', ' network 192.168.10.64 0.0.0.63 area 0'],
    });
  });
  test('10.1.64.0/19 → network 10.1.64.0 0.0.31.255 area 0', () => {
    expect(val(snippetsText('10.1.64.0', '19')).lines.ospf[1]).toBe(' network 10.1.64.0 0.0.31.255 area 0');
  });
  test('/32 → host; /0 → any', () => {
    const h = val(snippetsText('10.1.1.1/32')).lines;
    expect(h.aclStandard[0]).toBe('access-list 10 permit host 10.1.1.1');
    expect(h.aclNamed[1]).toBe(' permit host 10.1.1.1');
    expect(h.ospf[1]).toBe(' network 10.1.1.1 0.0.0.0 area 0');
    const a = val(snippetsText('0.0.0.0/0')).lines;
    expect(a.aclStandard[0]).toBe('access-list 10 permit any');
    expect(a.ospf[1]).toBe(' network 0.0.0.0 255.255.255.255 area 0');
  });
  test('normalizzazione con W_HOST_BITS_SET', () => {
    const r = snippetsText('192.168.10.75/26');
    expect(d(val(r).network)).toBe('192.168.10.64');
    expect(warnCodes(r)).toEqual(['W_HOST_BITS_SET']);
  });
  test('opzioni: numero ACL, nome, azione, processo e area OSPF', () => {
    const x = ip('10.0.0.0');
    expect(val(snippets(x, 8, { acl: { number: 99 } })).lines.aclStandard[0]).toBe('access-list 99 permit 10.0.0.0 0.255.255.255');
    expect(errCode(snippets(x, 8, { acl: { number: 100 } }))).toBe('ACL_NUMBER_RANGE');
    expect(val(snippets(x, 8, { acl: { number: 1300 } })).options.acl.number).toBe(1300);
    expect(val(snippets(x, 8, { acl: { number: 1999 } })).options.acl.number).toBe(1999);
    expect(errCode(snippets(x, 8, { acl: { number: 0 } }))).toBe('ACL_NUMBER_RANGE');
    expect(errCode(snippets(x, 8, { acl: { number: 2000 } }))).toBe('ACL_NUMBER_RANGE');
    expect(val(snippets(x, 8, { acl: { name: 'VLAN_10-uffici', action: 'deny' } })).lines.aclNamed).toEqual([
      'ip access-list standard VLAN_10-uffici', ' deny 10.0.0.0 0.255.255.255',
    ]);
    expect(errCode(snippets(x, 8, { acl: { name: 'con spazio' } }))).toBe('ACL_NAME_FORMAT');
    expect(errCode(snippets(x, 8, { acl: { name: 'x'.repeat(65) } }))).toBe('ACL_NAME_FORMAT');
    expect(errCode(snippets(x, 8, { acl: { action: 'allow' } }))).toBe('ACL_ACTION_VALUE');
    expect(errCode(snippets(x, 8, { ospf: { process: 0 } }))).toBe('OSPF_PROCESS_RANGE');
    expect(errCode(snippets(x, 8, { ospf: { process: 65536 } }))).toBe('OSPF_PROCESS_RANGE');
    expect(val(snippets(x, 8, { ospf: { process: 65535 } })).lines.ospf[0]).toBe('router ospf 65535');
    expect(val(snippets(x, 8, { ospf: { area: '0.0.0.1' } })).lines.ospf[1]).toBe(' network 10.0.0.0 0.255.255.255 area 0.0.0.1');
    expect(val(snippets(x, 8, { ospf: { area: '51' } })).options.ospf.area).toBe('51');
    expect(val(snippets(x, 8, { ospf: { area: 4294967295 } })).options.ospf.area).toBe('4294967295');
    expect(errCode(snippets(x, 8, { ospf: { area: 4294967296 } }))).toBe('OSPF_AREA_FORMAT');
    expect(errCode(snippets(x, 8, { ospf: { area: '4294967296' } }))).toBe('OSPF_AREA_FORMAT');
    expect(errCode(snippets(x, 8, { ospf: { area: '007' } }))).toBe('OSPF_AREA_FORMAT');
    expect(errCode(snippets(x, 8, { ospf: { area: 'dorsale' } }))).toBe('OSPF_AREA_FORMAT');
    expect(errCode(snippets(x, 8, { ospf: { area: 1.5 } }))).toBe('OSPF_AREA_FORMAT');
  });
  test('errori di parsing', () => {
    expect(snippetsText('10.0.0.0')).toMatchObject({ error: { code: 'PREFIX_EMPTY', field: 'prefix' } });
    expect(snippetsText('10.0.0/8')).toMatchObject({ error: { code: 'IP_FORMAT', field: 'network' } });
  });
});
