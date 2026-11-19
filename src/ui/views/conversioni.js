// @ts-check
/**
 * Calcola · Conversioni (F02, cap. 3 e 6): numero tra le basi 10, 2 e 16; indirizzo in binario ed
 * esadecimale; prefisso e mask. Tre riquadri indipendenti nella stessa vista, ognuno con i passaggi.
 */
import { h, replace } from '../dom.js';
import { textField } from '../components/field.js';
import { prefixField } from '../components/prefix-field.js';
import { resultCard } from '../components/result-card.js';
import { segmented, button } from '../components/controls.js';
import { exportBar } from '../components/export-bar.js';
import { createStepsPanel, bitRow } from '../components/steps-panel.js';
import { liveView, routeError } from './view-kit.js';
import { entryFor } from '../history-map.js';
import { num, message } from '../format.js';
import { convertNumber, convertAddress, parsePrefixOrMask, prefixToMask, toDotted } from '../../engine/index.js';
import { t } from '../../i18n/strings.it.js';

const VIEW = 'calcola/conversioni';
const BASES = ['10', '2', '16'];
const WIDTHS = ['auto', '8', '32'];

/** Binario a gruppi di 4 cifre, per leggerlo meglio. */
const nibbles = (/** @type {string} */ bin) => bin.replace(/(?=(?:[01]{4})+$)(?!^)/g, ' ');

/**
 * @param {import('../types.js').Ctx} ctx
 * @param {import('../types.js').Route} route
 * @returns {import('../types.js').View}
 */
export function createConversioni(ctx, route) {
  const live = liveView(ctx, VIEW, route, render);
  const p0 = live.params;
  /** Ultimo riquadro modificato: decide la voce di cronologia. */
  /** @type {'number' | 'address' | 'pm'} */
  let lastPart = p0.a && !p0.n ? 'address' : 'number';

  // ---- numero
  const nField = textField({
    label: t('ui.conv.number'), value: p0.n ?? '', hint: t('ui.conv.number.hint'), placeholder: '203', width: '24ch',
    onInput: (v) => { lastPart = 'number'; live.change({ n: v }); }, onEnter: () => live.commit(),
  });
  const base = segmented({
    legend: t('ui.conv.base'), value: BASES.includes(p0.b) ? p0.b : '10',
    options: BASES.map((b) => ({ value: b, label: t(`ui.conv.base.${b}`) })),
    onChange: (v) => { lastPart = 'number'; live.change({ b: v === '10' ? undefined : v }); },
  });
  const width = segmented({
    legend: t('ui.conv.width'), value: WIDTHS.includes(p0.w) ? p0.w : 'auto', small: true,
    options: WIDTHS.map((w) => ({ value: w, label: t(`ui.conv.width.${w}`) })),
    onChange: (v) => live.change({ w: v === 'auto' ? undefined : v }),
  });
  const nOut = h('div', { class: 'tool-out' });
  const nSteps = createStepsPanel(ctx, { fn: 'F02', method: live.method('F02'), onMethod: (m) => live.setMethod('F02', m) });

  // ---- indirizzo
  const aField = textField({
    label: t('ui.conv.address'), value: p0.a ?? '', placeholder: '192.168.10.75', inputmode: 'decimal', width: '20ch',
    onInput: (v) => { lastPart = 'address'; live.change({ a: v }); }, onEnter: () => live.commit(),
  });
  const aOut = h('div', { class: 'tool-out' });
  const aSteps = createStepsPanel(ctx, { fn: 'F02', method: live.method('F02'), onMethod: (m) => live.setMethod('F02', m) });

  // ---- prefisso e mask
  const pmField = prefixField({ label: t('ui.conv.pm'), value: p0.pm ?? '', onInput: (v) => { lastPart = 'pm'; live.change({ pm: v }); }, onEnter: () => live.commit() });
  const pmOut = h('div', { class: 'tool-out' });

  const tool = (/** @type {string} */ title, /** @type {Node[]} */ fields, /** @type {Node[]} */ outs) =>
    h('section', { class: 'tool' }, h('h2', { class: 'tool-title' }, title), h('div', { class: 'form-row' }, fields), outs);

  const el = h('div', { class: 'view view-conversioni' },
    tool(t('ui.conv.number'), [nField.el, base.el, width.el], [nOut, nSteps.el]),
    tool(t('ui.conv.address.title'), [aField.el], [aOut, aSteps.el]),
    tool(t('ui.conv.pm.title'), [pmField.el], [pmOut]));

  /** @param {{ initial: boolean, commit: boolean }} opts */
  function render(opts) {
    const p = live.params;
    const now = opts.initial || opts.commit;
    const didactic = live.didactic();
    const method = live.method('F02');
    const exportOn = ctx.store.get().settings.exportBar;

    // numero
    if ((p.n ?? '').trim() === '') {
      nField.setError(null);
      nOut.replaceChildren();
      nSteps.el.hidden = true;
    } else {
      const w = p.w === '8' ? 8 : p.w === '32' ? 32 : 'auto';
      const r = convertNumber(p.n, Number(p.b || 10), { width: w });
      if (!r.ok) {
        nField.setError(message(r.error), { now });
        nOut.replaceChildren();
        nSteps.el.hidden = true;
      } else {
        nField.setError(null);
        const v = r.value;
        replace(nOut, resultCard(ctx, {
          items: [
            { label: t('ui.conv.dec'), value: num(v.value), copy: v.dec },
            { label: t('ui.conv.bin'), value: nibbles(v.bin), copy: v.bin, note: `${v.width} bit` },
            { label: t('ui.conv.hex'), value: `0x${v.hex}`, copy: v.hex },
            { label: t('ui.conv.weights'), value: `${v.weights.length ? v.weights.map(num).join(' + ') : '0'} = ${num(v.value)}`, copy: false, wide: true },
          ],
        }));
        nSteps.el.hidden = !didactic;
        if (didactic) nSteps.update(v, method);
        if (exportOn) {
          const text = (p.n ?? '').trim();
          nOut.append(exportBar(ctx, () => ({
            fn: 'F02', value: v, input: { kind: 'number', text, base: v.base }, rowsInput: { text }, name: 'conversioni', parts: [text, `b${v.base}`],
            steps: live.didactic() ? [{ fn: 'F02', value: v, method: live.method('F02') }] : [],
          })));
        }
      }
    }

    // indirizzo
    if ((p.a ?? '').trim() === '') {
      aField.setError(null);
      aOut.replaceChildren();
      aSteps.el.hidden = true;
    } else {
      const r = convertAddress(p.a);
      if (!r.ok) {
        aField.setError(message(r.error), { now });
        aOut.replaceChildren();
        aSteps.el.hidden = true;
      } else {
        aField.setError(null);
        const v = r.value;
        replace(aOut, resultCard(ctx, {
          items: [
            { label: t('ui.conv.binaryDotted'), value: v.binaryDotted, wide: true },
            { label: t('ui.conv.hexDotted'), value: v.hexDotted },
            { label: t('ui.conv.hex32'), value: v.hex32 },
            { label: t('ui.conv.uint32'), value: num(v.uint32), copy: String(v.uint32) },
          ],
        }));
        aSteps.el.hidden = !didactic;
        if (didactic) aSteps.update(v, method);
        if (exportOn) {
          aOut.append(exportBar(ctx, () => ({
            fn: 'F02', value: v, input: { kind: 'address', text: v.dotted }, name: 'conversioni', parts: [v.dotted],
            steps: live.didactic() ? [{ fn: 'F02', value: v, method: live.method('F02') }] : [],
          })));
        }
      }
    }

    // prefisso e mask
    if ((p.pm ?? '').trim() === '') {
      pmField.setError(null);
      pmOut.replaceChildren();
    } else {
      const r = parsePrefixOrMask(p.pm, 'pm');
      if (!r.ok) {
        routeError(r.error, { pm: pmField }, 'pm', now);
        const isMask = r.error.code.startsWith('MASK_');
        replace(pmOut, isMask ? h('p', {}, button(t('ui.conv.toMask'), () => ctx.go('calcola/mask', { m: (p.pm ?? '').trim() }), { icon: 'link' })) : null);
      } else {
        pmField.setError(null);
        const v = prefixToMask(r.value.prefix);
        replace(pmOut, resultCard(ctx, {
          items: [
            { label: t('ui.conv.prefix'), value: `/${v.prefix}` },
            { label: t('ui.r.mask'), value: v.maskDotted },
            { label: t('ui.r.wildcard'), value: toDotted(v.wildcard) },
          ],
          children: [h('div', { class: 'bitrows bitrows-card' }, bitRow({ label: 'mask', value: v.maskBinary, prefix: v.prefix }))],
        }));
        if (exportOn) {
          pmOut.append(exportBar(ctx, () => ({ fn: 'F02', value: v, input: { kind: 'prefix', prefix: v.prefix }, name: 'conversioni', parts: [`p${v.prefix}`] })));
        }
      }
    }

    if (lastPart !== 'pm') ctx.record(entryFor(VIEW, p, lastPart), opts.commit);
    else ctx.record(null);
  }

  render({ initial: true, commit: false });

  return {
    el,
    update(r) {
      live.reset(r);
      nField.setValue(r.params.n ?? '');
      aField.setValue(r.params.a ?? '');
      pmField.setValue(r.params.pm ?? '');
      base.setValue(BASES.includes(r.params.b) ? r.params.b : '10');
      width.setValue(WIDTHS.includes(r.params.w) ? r.params.w : 'auto');
      lastPart = r.params.a && !r.params.n ? 'address' : 'number';
      render({ initial: true, commit: false });
    },
    destroy: () => live.cancel(),
    printInputs: () => [
      nField.value && `${t('ui.conv.number')}: ${nField.value} (${t('ui.base')} ${live.params.b || 10})`,
      aField.value && `${t('ui.conv.address.title')}: ${aField.value}`,
      pmField.value && `${t('ui.conv.pm')}: ${pmField.value}`,
    ].filter(Boolean),
  };
}

