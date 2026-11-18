// @ts-check
/**
 * F02 · conversioni (cap. 3): sottrazione dei pesi e divisioni successive.
 */
import { step } from './common.js';

/**
 * @param {number} value
 * @param {number} width bit da rappresentare
 */
export function weightsRows(value, width) {
  const rows = [];
  let rest = value;
  for (let b = width - 1; b >= 0; b--) {
    const weight = 2 ** b;
    const fits = weight <= rest;
    if (fits) rest -= weight;
    rows.push({ weight, fits, bit: fits ? 1 : 0, remainder: rest });
  }
  return { rows, binary: rows.map((r) => r.bit).join('') };
}

/**
 * @param {number} value
 * @param {number} width
 */
export function divisionRows(value, width) {
  const rows = [];
  let n = value;
  do {
    const quotient = Math.floor(n / 2);
    rows.push({ dividend: n, quotient, remainder: n - 2 * quotient });
    n = quotient;
  } while (n > 0);
  const binary = rows
    .map((r) => r.remainder)
    .reverse()
    .join('')
    .padStart(width, '0');
  return { rows, binary };
}

/**
 * @param {string} binary
 */
function nibbles(binary) {
  const out = [];
  for (let i = 0; i < binary.length; i += 4) {
    const bits = binary.slice(i, i + 4);
    out.push({ bits, hex: parseInt(bits, 2).toString(16).toUpperCase() });
  }
  return out;
}

/**
 * @param {Record<string, any>} r risultato di convertNumber() o convertAddress()
 * @param {'weights' | 'divisions'} method
 */
export function convertSteps(r, method) {
  const make = method === 'weights' ? weightsRows : divisionRows;
  const id = method === 'weights' ? 'weights' : 'divisions';
  if (typeof r.dotted === 'string') {
    const octets = r.dotted.split('.').map(Number);
    const steps = octets.map((value, index) => {
      const res = make(value, 8);
      return step(`octet-${id}`, 'cap-3', { index, value, rows: res.rows, binary: res.binary });
    });
    const binaryDotted = steps.map((s) => s.values.binary).join('.');
    const hexDotted = steps.map((s) => nibbles(s.values.binary).map((n) => n.hex).join('')).join('.');
    steps.push(step('address-result', 'cap-3', { binaryDotted, hexDotted }));
    return steps;
  }
  const res = make(r.value, r.width);
  const nb = nibbles(res.binary);
  return [
    step(`number-${id}`, 'cap-3', { value: r.value, rows: res.rows, binary: res.binary }),
    step('number-hex', 'cap-3', { binary: res.binary, nibbles: nb, hex: nb.map((n) => n.hex).join('') }),
  ];
}
