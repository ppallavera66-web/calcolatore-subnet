// @ts-check
/**
 * Dimostrazione da riga di comando (specifica tecnica, 12: accettazione della fase 3):
 * i casi del cap. 15 (stessa subnet) e la tabella /0–/32, calcolati dal motore.
 * Uso: node tools/demo.js   (oppure npm run demo)
 */
import { sameSubnetText, maskOf, wildcardOf, interestingOctet, hostRule, toDotted, explain } from '../src/engine/index.js';
import { t, fmtNumber, magicLabel } from '../src/i18n/strings.it.js';

const CASES = [
  { a: '192.168.10.70', b: '192.168.10.130', prefixA: '25' },
  { a: '192.168.10.70', b: '192.168.10.130', prefixA: '24' },
  { a: '172.16.33.10', b: '172.16.46.200', prefixA: '20' },
  { a: '10.1.63.5', b: '10.1.64.5', prefixA: '19' },
  { a: '192.168.1.10', prefixA: '24', b: '192.168.1.200', prefixB: '25', gateway: '192.168.1.1' },
  { a: '192.168.1.10', prefixA: '24', b: '192.168.1.20', prefixB: '25' },
];

console.log('Cap. 15 · Stessa subnet o no?\n');
for (const c of CASES) {
  const r = sameSubnetText(c);
  const head = `A ${c.a}/${c.prefixA}  B ${c.b}/${c.prefixB ?? c.prefixA}${c.gateway ? `  gateway ${c.gateway}` : ''}`;
  if (!r.ok) {
    console.log(`${head}\n  errore: ${t(r.error.code, r.error.params)}\n`);
    continue;
  }
  console.log(`${head}\n  → ${t(`verdict.${r.value.verdict}`)}`);
  for (const s of explain('F07', r.value, 'magic').steps.filter((s) => s.id === 'same-side-magic')) {
    console.log(`    ${t(`step.${s.id}`, s.values)}`);
  }
  for (const w of r.warnings) console.log(`    ⚠ ${t(w.code, w.params)}`);
  console.log('');
}

console.log('Tabella di riferimento /0–/32\n');
const header = ['CIDR', 'Subnet mask', 'Wildcard', 'M · ottetto', 'Indirizzi', 'Host'];
const rows = [];
for (let p = 0; p <= 32; p++) {
  const io = interestingOctet(p);
  const rule = hostRule(p);
  rows.push([
    `/${p}`,
    toDotted(maskOf(p)),
    toDotted(wildcardOf(p)),
    magicLabel(io.magic, io.index),
    fmtNumber(rule.total),
    p === 31 ? `${rule.usable} (p2p)` : fmtNumber(rule.usable),
  ]);
}
const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
const line = (/** @type {string[]} */ cells) => cells.map((c, i) => (i >= 4 ? c.padStart(widths[i]) : c.padEnd(widths[i]))).join('  ');
console.log(line(header));
console.log(widths.map((w) => '─'.repeat(w)).join('  '));
for (const r of rows) console.log(line(r));
