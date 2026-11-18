// @ts-check
/**
 * Guscio minimo della fase 3: collauda build e motore nel browser.
 * Sarà sostituito dall'interfaccia della fase 4. Testi sempre con textContent.
 */
import { analyzeText, explain, methodsFor, maskOf, wildcardOf, interestingOctet, hostRule, toDotted } from '../engine/index.js';
import { t, fmtNumber, magicLabel } from '../i18n/strings.it.js';

const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));

/**
 * @param {string} tag
 * @param {string} text
 */
function el(tag, text) {
  const e = document.createElement(tag);
  e.textContent = text;
  return e;
}

const ipInput = /** @type {HTMLInputElement} */ ($('ip'));
const methodSelect = /** @type {HTMLSelectElement} */ ($('method'));
for (const m of methodsFor('F01')) {
  const o = el('option', t(`method.${m}`));
  /** @type {HTMLOptionElement} */ (o).value = m;
  methodSelect.append(o);
}

function render() {
  const r = analyzeText(ipInput.value);
  const result = $('result');
  const warnings = $('warnings');
  const steps = $('steps');
  result.replaceChildren();
  warnings.replaceChildren();
  steps.replaceChildren();
  if (!r.ok) {
    $('ip-err').textContent = t(r.error.code, r.error.params);
    ipInput.setAttribute('aria-invalid', 'true');
    return;
  }
  $('ip-err').textContent = '';
  ipInput.removeAttribute('aria-invalid');
  const v = r.value;
  const none = t('none');
  const rows = [
    ['Rete', `${toDotted(v.network)}/${v.prefix}`],
    ['Broadcast', v.broadcast === null ? none : toDotted(v.broadcast)],
    ['Primo host', toDotted(v.firstHost)],
    ['Ultimo host', toDotted(v.lastHost)],
    ['Host utilizzabili', `${fmtNumber(v.usableHosts)} (${t(`kind.${v.hostKind}`)})`],
    ['Subnet mask', toDotted(v.mask)],
    ['Wildcard', toDotted(v.wildcard)],
    ['Numero magico', magicLabel(v.interesting.magic, v.interesting.index)],
    ['Ruolo dell\'indirizzo', t(`role.${v.role}`)],
    ['Tipo', `${t(`scope.${v.classification.scope}`)}${v.classification.primary ? ` · ${t(`block.${v.classification.primary.code}`)}` : ''} · classe ${v.classification.historicalClass.letter}`],
  ];
  for (const [k, val] of rows) result.append(el('dt', k), el('dd', val));
  for (const w of r.warnings) {
    const p = el('p', t(w.code, w.params));
    p.classList.add('warn');
    warnings.append(p);
  }
  const ex = explain('F01', v, methodSelect.value);
  $('steps-title').textContent = `Passaggi · ${t(`method.${ex.method}`)} · ${t('chapter', { chapter: ex.chapter })}`;
  for (const s of ex.steps) steps.append(el('li', t(`step.${s.id}`, s.values)));
}

function renderTable() {
  const body = $('ref');
  for (let p = 0; p <= 32; p++) {
    const io = interestingOctet(p);
    const rule = hostRule(p);
    const tr = document.createElement('tr');
    const host = p === 31 ? `${rule.usable} (p2p)` : fmtNumber(rule.usable);
    for (const c of [`/${p}`, toDotted(maskOf(p)), toDotted(wildcardOf(p)), magicLabel(io.magic, io.index), fmtNumber(rule.total), host]) {
      tr.append(el('td', c));
    }
    body.append(tr);
  }
}

function setupToTop() {
  const b = $('to-top');
  const update = () => b.classList.toggle('show', window.scrollY > 400);
  window.addEventListener('scroll', update, { passive: true });
  update();
  b.addEventListener('click', () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    ipInput.focus({ preventScroll: true });
  });
}

ipInput.addEventListener('input', render);
methodSelect.addEventListener('change', render);
$('f01').addEventListener('submit', (e) => {
  e.preventDefault();
  render();
});
$('about').textContent = `Calcolatore Subnet ${__APP_VERSION__} · codice con licenza MIT · motore verificato con un oracolo Python indipendente.`;
renderTable();
setupToTop();
render();
