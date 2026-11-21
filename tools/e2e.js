// @ts-check
/**
 * Prova nel browser del file unico (fase 4): `npm run e2e` (fa prima la build).
 *
 * Apre dist/index.html da disco (file://) in Chrome con playwright-core e verifica:
 * - nessun errore JavaScript in tutte le prove;
 * - layout della 9.2 a 390, 800 e 1280 px; aree di tocco >= 44 px a 390 px (9.7);
 * - i quattro temi (variabili applicate) e Automatico con sistema chiaro, scuro, contrasto elevato;
 * - accessibilità con axe-core (WCAG 2.2 A e AA) nelle schermate principali, in tutti i temi;
 * - uso da tastiera: salta al contenuto, campi, Invio, focus visibile, controllo segmentato, dialog;
 * - navigazione con frammento, tasto indietro, collegamenti con errori, divisione di IP/n;
 * - cronologia, ricerca dell'IP in Suddivisione, stampa (intestazione, navigazione nascosta, PDF);
 * - fase 5: persistenza (interruttore, ritardo, ricaricamento, spegnimento con conferma, più schede,
 *   dati illeggibili, storage rifiutato), export in tutti i formati e intervalli di F06, sessione JSON
 *   (Sostituisci, Unisci, impostazioni su scelta, errori), busta cifrata (passphrase, robustezza,
 *   passphrase errata, manomissione, Web Crypto assente), piani con etichette, telefono a 390 px.
 * Schermate e PDF in e2e-report/ (ignorata da git).
 *
 * Il browser: variabile CHROME_PATH, altrimenti i percorsi usuali di Chrome/Chromium, altrimenti
 * il canale "chrome" di Playwright. Nessun browser viene scaricato.
 */
import { chromium } from 'playwright-core';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = resolve(ROOT, 'dist', 'index.html');
const OUT = resolve(ROOT, 'e2e-report');
const URL0 = pathToFileURL(FILE).href;
const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const CANDIDATES = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'];

/** @type {{ name: string, ok: boolean, detail?: string }[]} */
const results = [];
/** @type {string[]} */
const jsErrors = [];
/** Richieste verso la rete: il file unico non deve caricare nulla da fuori (funziona offline). @type {string[]} */
const netRequests = [];

/**
 * @param {string} name
 * @param {() => Promise<void>} fn
 */
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    results.push({ name, ok: false, detail });
    console.log(`  ✗ ${name}\n      ${detail.split('\n').join('\n      ')}`);
  }
}

/** @param {unknown} cond @param {string} msg */
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/**
 * Nuova pagina con raccolta degli errori JavaScript.
 * @param {import('playwright-core').Browser} browser
 * @param {import('playwright-core').BrowserContextOptions} [opts]
 */
async function open(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') jsErrors.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => jsErrors.push(`pageerror: ${e.message}`));
  page.on('request', (r) => {
    if (!/^(file|data|blob|about):/.test(r.url())) netRequests.push(r.url());
  });
  return { ctx, page };
}

/**
 * @param {import('playwright-core').Page} page
 * @param {string} hash
 */
async function go(page, hash) {
  await page.goto('about:blank');
  await page.goto(URL0 + hash);
  await page.waitForSelector('.view');
}

/**
 * Violazioni axe-core (WCAG 2.2 A e AA).
 * @param {import('playwright-core').Page} page
 */
async function axe(page) {
  await page.addScriptTag({ content: AXE });
  const res = await page.evaluate(async () => {
    // @ts-ignore axe è globale dopo l'iniezione
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    return r.violations.map((/** @type {any} */ v) => `${v.id} (${v.impact}): ${v.nodes.length} elementi · ${v.nodes.slice(0, 3).map((/** @type {any} */ n) => n.target.join(' ')).join(' | ')}`);
  });
  return res;
}

/** Colore esadecimale in forma lunga e minuscola (#000 → #000000): il CSS minificato usa la forma breve. */
const hex = (/** @type {string} */ c) => {
  const s = c.trim().toLowerCase();
  return /^#[0-9a-f]{3}$/.test(s) ? `#${[...s.slice(1)].map((x) => x + x).join('')}` : s;
};

const shot = (/** @type {import('playwright-core').Page} */ page, /** @type {string} */ name, full = true) =>
  page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage: full });

/**
 * Cambio di vista nello stesso documento (lo stato in memoria resta).
 * @param {import('playwright-core').Page} page
 * @param {string} hash
 */
async function hashTo(page, hash) {
  await page.evaluate((x) => { location.hash = x; }, hash);
  await page.waitForTimeout(250);
}

/** Chiavi dell'app nel localStorage. */
const appKeys = (/** @type {import('playwright-core').Page} */ page) => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('subnetcalc:')));

/**
 * Clic che produce un download: nome suggerito e testo del file.
 * @param {import('playwright-core').Page} page
 * @param {string} selector
 * @param {() => Promise<void>} [before]
 */
async function download(page, selector, before) {
  if (before) await before();
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.click(selector)]);
  const path = await dl.path();
  return { name: dl.suggestedFilename(), text: readFileSync(/** @type {string} */ (path), 'utf8') };
}

async function main() {
  if (!existsSync(FILE)) {
    console.error('dist/index.html non trovato: esegui prima npm run build');
    process.exit(2);
  }
  mkdirSync(OUT, { recursive: true });
  const exe = CANDIDATES.find((p) => p && existsSync(p));
  const browser = await chromium.launch(exe ? { executablePath: exe, args: ['--no-sandbox'] } : { channel: 'chrome' });
  console.log(`Prova nel browser: ${browser.version()} · ${URL0}`);

  // ------------------------------------------------------------ apertura da disco e layout
  console.log('\nLayout e apertura da disco');
  for (const [w, kind] of /** @type {[number, string][]} */ ([[390, 'telefono'], [800, 'tablet'], [1280, 'desktop']])) {
    await check(`layout ${w} px (${kind})`, async () => {
      const { ctx, page } = await open(browser, { viewport: { width: w, height: 860 }, hasTouch: w < 720, isMobile: w < 720 });
      await go(page, '#/calcola/analisi?ip=172.16.45.200&p=20&did=1');
      const vis = await page.evaluate(() => {
        const d = (/** @type {string} */ s) => { const e = document.querySelector(s); return e ? e.getClientRects().length > 0 : false; };
        return { sidebar: d('.sidebar'), topTabs: d('.top-tabs'), bottom: d('.bottom-bar'), subtabs: d('.subtabs-wrap'), overflow: document.documentElement.scrollWidth > window.innerWidth + 1 };
      });
      const expected = w < 720 ? { sidebar: false, topTabs: false, bottom: true, subtabs: true } : w < 980 ? { sidebar: false, topTabs: true, bottom: false, subtabs: true } : { sidebar: true, topTabs: false, bottom: false, subtabs: false };
      for (const [k, v] of Object.entries(expected)) assert(/** @type {any} */ (vis)[k] === v, `${k}: atteso ${v}, trovato ${/** @type {any} */ (vis)[k]}`);
      assert(!vis.overflow, 'la pagina scorre in orizzontale');
      assert((await page.textContent('.kv-primary'))?.includes('172.16.32.0/20'), 'risultato mancante');
      await shot(page, `layout-${w}`);
      if (w < 720) {
        const small = await page.evaluate(() => {
          const sel = 'button, input:not([type=range]):not([type=radio]), select, .segmented-option label, .subtab, .bottom-tab, summary, a.icon-btn';
          return [...document.querySelectorAll(sel)].filter((e) => {
            const r = e.getBoundingClientRect();
            const st = getComputedStyle(e);
            return r.width > 0 && st.visibility !== 'hidden' && !e.closest('[hidden]') && st.display !== 'none' && r.height < 44;
          }).map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join('.')} ${Math.round(e.getBoundingClientRect().height)}px`);
        });
        assert(small.length === 0, `aree di tocco sotto 44 px: ${small.join(', ')}`);
      }
      await ctx.close();
    });
  }

  // ------------------------------------------------------------ temi
  console.log('\nTemi e accessibilità (axe-core, WCAG 2.2 AA)');
  const BG = { light: '#f6f7f9', dark: '#0e141b', contrast: '#000000' };
  const SCREENS = {
    analisi: '#/calcola/analisi?ip=192.168.50.99&p=30&did=1',
    conversioni: '#/calcola/conversioni?n=203&a=192.168.10.75&pm=255.255.240.0&did=1',
    mask: '#/calcola/mask?m=255.255.250.0&did=1',
    stessa: '#/calcola/stessa?a=192.168.1.10&pa=24&b=192.168.1.200&pb=25&gw=192.168.1.1&did=1',
    inverso: '#/pianifica/inverso?p=24&h=20&s=10&did=1',
    suddivisione: '#/pianifica/suddivisione?b=10.0.0.0&p=16&np=19&did=1',
    impostazioni: '#/impostazioni',
    guide: '#/guide/subnetting/cap-9',
    uso: '#/guide/uso/export',
  };
  for (const theme of ['light', 'dark', 'contrast']) {
    await check(`tema ${theme}: variabili e axe su ${Object.keys(SCREENS).length} schermate`, async () => {
      const { ctx, page } = await open(browser);
      await go(page, '#/impostazioni');
      const labels = { light: 'Chiaro', dark: 'Scuro', contrast: 'Alto contrasto' };
      await page.getByRole('radio', { name: /** @type {any} */ (labels)[theme], exact: true }).check();
      const attr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      assert(attr === theme, `data-theme = ${attr}`);
      const problems = [];
      for (const [name, hash] of Object.entries(SCREENS)) {
        // il tema vive in memoria: si naviga senza ricaricare la pagina
        await page.evaluate((h) => { location.hash = h; }, hash);
        await page.waitForTimeout(250);
        const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
        assert(hex(bg) === /** @type {any} */ (BG)[theme], `${name}: --bg = ${bg}`);
        if (name === 'analisi') await page.click('.snip-summary');
        if (name === 'guide') await page.focus('#cap-9 .gl-term >> nth=0');
        const v = await axe(page);
        if (v.length) problems.push(`${name}: ${v.join('; ')}`);
        await shot(page, `tema-${theme}-${name}`);
      }
      assert(problems.length === 0, problems.join('\n'));
      await ctx.close();
    });
  }
  for (const [label, media, expected] of /** @type {[string, any, string][]} */ ([
    ['sistema chiaro', { colorScheme: 'light' }, BG.light],
    ['sistema scuro', { colorScheme: 'dark' }, BG.dark],
    ['contrasto elevato', { colorScheme: 'light', contrast: 'more' }, BG.contrast],
  ])) {
    await check(`tema Automatico con ${label}`, async () => {
      const { ctx, page } = await open(browser);
      await page.emulateMedia(media);
      await go(page, SCREENS.analisi);
      const st = await page.evaluate(() => ({ attr: document.documentElement.getAttribute('data-theme'), bg: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() }));
      assert(st.attr === null, `data-theme presente: ${st.attr}`);
      assert(hex(st.bg) === expected, `--bg = ${st.bg}, atteso ${expected}`);
      const v = await axe(page);
      assert(v.length === 0, v.join('\n'));
      await ctx.close();
    });
  }
  await check('axe a 390 px (telefono, tema scuro) su Analisi e Suddivisione', async () => {
    const { ctx, page } = await open(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: 'dark' });
    const problems = [];
    for (const hash of [SCREENS.analisi, SCREENS.suddivisione]) {
      await go(page, hash);
      const v = await axe(page);
      if (v.length) problems.push(`${hash}: ${v.join('; ')}`);
    }
    assert(problems.length === 0, problems.join('\n'));
    await ctx.close();
  });

  // ------------------------------------------------------------ tastiera
  console.log('\nTastiera');
  await check('salta al contenuto, campi, Invio, focus visibile, cronologia con Invio', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/calcola/analisi');
    await page.keyboard.press('Tab');
    assert(await page.evaluate(() => document.activeElement?.classList.contains('skip-link')), 'il primo Tab non porta a "Salta al contenuto"');
    const skipVisible = await page.evaluate(() => (document.activeElement?.getBoundingClientRect().top ?? -1) >= 0);
    assert(skipVisible, '"Salta al contenuto" non è visibile quando ha il focus');
    await page.keyboard.press('Enter');
    assert(await page.evaluate(() => document.activeElement?.tagName === 'H1'), 'Invio sul collegamento non porta al titolo');
    // fino al campo IP
    for (let i = 0; i < 6 && !(await page.evaluate(() => document.activeElement?.id && document.activeElement.closest('.view-analisi') && document.activeElement.tagName === 'INPUT')); i++) await page.keyboard.press('Tab');
    assert(await page.evaluate(() => document.activeElement?.tagName === 'INPUT'), 'il campo IP non si raggiunge con Tab');
    const outline = await page.evaluate(() => getComputedStyle(/** @type {Element} */ (document.activeElement)).outlineStyle);
    assert(outline !== 'none', 'focus non visibile sul campo');
    await page.keyboard.type('10.20.30.140');
    // la barra sposta nel campo del prefisso
    await page.keyboard.type('/');
    const inPrefix = await page.evaluate(() => /** @type {HTMLInputElement} */ (document.activeElement).closest('.field-prefix') !== null);
    assert(inPrefix, 'la barra non sposta il cursore nel campo del prefisso');
    await page.keyboard.type('27');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    const res = await page.textContent('.kv-primary');
    assert(res?.includes('10.20.30.128/27') && res.includes('10.20.30.159'), `risultato: ${res}`);
    const hash = await page.evaluate(() => location.hash);
    assert(hash === '#/calcola/analisi?ip=10.20.30.140&p=27', `frammento: ${hash}`);
    // la cronologia ha la voce (registrata subito con Invio)
    await page.click('.history-btn');
    const hist = await page.textContent('.history-list');
    assert(hist?.includes('10.20.30.140/27'), `cronologia: ${hist}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    assert(await page.evaluate(() => !document.querySelector('dialog')), 'Esc non chiude la cronologia');
    assert(await page.evaluate(() => document.activeElement?.classList.contains('history-btn')), 'il focus non torna al pulsante della cronologia');
    await ctx.close();
  });
  await check('controllo segmentato del metodo con le frecce, focus conservato', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/calcola/analisi?ip=172.16.45.200&p=20&did=1');
    await page.focus('.steps-panel input[type=radio]:checked');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);
    const st = await page.evaluate(() => ({
      method: /** @type {HTMLInputElement} */ (document.querySelector('.steps-panel input:checked')).value,
      focus: /** @type {HTMLInputElement} */ (document.activeElement).value,
      text: document.querySelector('.steps-panel input:checked')?.closest('.steps-panel')?.querySelector('.steps')?.textContent ?? '',
    }));
    assert(st.method === 'magic' && st.focus === 'magic', `metodo ${st.method}, focus ${st.focus}`);
    assert(st.text.includes('M = 256 − 240 = 16'), 'passaggi del numero magico assenti');
    await ctx.close();
  });
  await check('interruttori da tastiera (Impostazioni) e conferma di "Cancella tutti i dati"', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/impostazioni');
    const sw = page.getByRole('switch', { name: 'Modalità didattica' });
    await sw.focus();
    await page.keyboard.press('Space');
    assert((await sw.getAttribute('aria-checked')) === 'true', 'lo spazio non accende l\'interruttore');
    await page.getByRole('button', { name: 'Cancella tutti i dati' }).click();
    assert(await page.evaluate(() => !!document.querySelector('dialog[open]')), 'nessuna conferma');
    await page.getByRole('button', { name: 'Cancella tutto' }).click();
    await page.waitForTimeout(150);
    assert((await sw.getAttribute('aria-checked')) === 'false', 'le impostazioni non tornano ai valori predefiniti');
    await ctx.close();
  });

  // ------------------------------------------------------------ navigazione
  console.log('\nNavigazione con frammento');
  await check('schede, tasto indietro, input conservati, indirizzo sconosciuto', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/calcola/analisi?ip=10.1.2.3&p=24');
    await page.click('.side-tab[href^="#/calcola/mask"]');
    await page.waitForSelector('.view-mask');
    await page.goBack();
    await page.waitForSelector('.view-analisi');
    const ip = await page.inputValue('.view-analisi input');
    assert(ip === '10.1.2.3', `IP dopo "indietro": ${ip}`);
    await page.goto(`${URL0}#/sconosciuta/x`);
    await page.waitForSelector('.view-analisi');
    assert((await page.evaluate(() => location.hash)) === '#/calcola/analisi', 'non riporta ad Analisi');
    assert((await page.title()).startsWith('Analisi subnet'), `titolo: ${await page.title()}`);
    await ctx.close();
  });
  await check('collegamento con input non validi: errore visibile subito', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/calcola/analisi?ip=192.168.01.1&p=24');
    const err = await page.textContent('.field-error');
    assert(err?.includes('zero iniziale'), `errore: ${err}`);
    assert((await page.getAttribute('.view-analisi input', 'aria-invalid')) === 'true', 'aria-invalid mancante');
    await ctx.close();
  });
  await check('Suddivisione: "vai alla subnet che contiene l\'IP" apre la pagina e evidenzia la riga', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/pianifica/suddivisione?b=10.0.0.0&p=8&np=30&ip=10.200.3.7');
    const row = await page.evaluate(() => {
      const r = document.querySelector('tr[aria-current="true"]');
      return r ? r.textContent : null;
    });
    assert(row?.includes('10.200.3.4/30'), `riga evidenziata: ${row}`);
    assert((await page.evaluate(() => location.hash)).includes('pg=12800'), 'pagina non aggiornata');
    await page.getByRole('button', { name: 'Ultima pagina' }).click();
    const last = await page.textContent('tbody tr:last-child');
    assert(last?.includes('10.255.255.252/30'), `ultima riga: ${last}`);
    await ctx.close();
  });
  await check('copia di un valore: messaggio di conferma', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/calcola/analisi?ip=172.16.45.200&p=20');
    await page.click('.kv-primary .copy-btn');
    await page.waitForTimeout(150);
    const toast = await page.textContent('.toast');
    assert(toast?.startsWith('Copiato') || toast?.startsWith('Copia non riuscita'), `messaggio: ${toast}`);
    await ctx.close();
  });
  await check('telefono: cronologia come pannello dal basso, barra di export come pulsante "Esporta"', async () => {
    const { ctx, page } = await open(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await go(page, '#/impostazioni');
    await page.getByRole('switch', { name: 'Export' }).click();
    await page.click('.bottom-tab[href^="#/calcola"]');
    await page.waitForSelector('.view-analisi');
    await page.click('.chip >> nth=0');
    await page.waitForSelector('.export-sheet-btn');
    assert(await page.isVisible('.export-sheet-btn'), 'pulsante Esporta non visibile');
    assert(!(await page.isVisible('.export-toolbar')), 'barra completa visibile su telefono');
    await page.click('.export-sheet-btn');
    const box = await page.evaluate(() => document.querySelector('dialog[open]')?.getBoundingClientRect().bottom);
    assert(box !== undefined && Math.abs(box - 844) < 2, `pannello non ancorato in basso (${box})`);
    await shot(page, 'telefono-export', false);
    await ctx.close();
  });

  // ------------------------------------------------------------ calcolo dal vivo e interazioni
  console.log('\nCalcolo dal vivo e interazioni');
  await check('calcolo dal vivo senza Invio; errore solo dopo la pausa di 400 ms', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/calcola/analisi');
    const ip = page.locator('.view-analisi input').first();
    await ip.click();
    await page.keyboard.type('192.168.1.256', { delay: 20 });
    await page.waitForTimeout(150);
    assert(((await page.textContent('.field-error')) ?? '') === '', "l'errore compare mentre si scrive");
    await page.waitForTimeout(450);
    assert(((await page.textContent('.field-error')) ?? '').includes('256'), 'errore assente dopo la pausa');
    await ip.fill('');
    await page.keyboard.type('192.168.1.200', { delay: 10 });
    await page.locator('.field-prefix input[type=text]').fill('/28');
    await page.waitForTimeout(300);
    const res = await page.textContent('.kv-primary');
    assert(res?.includes('192.168.1.192/28') && res.includes('192.168.1.207'), `risultato: ${res}`);
    await ctx.close();
  });
  await check('incolla "IP mask" nel campo IP: i due valori si dividono', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/calcola/analisi');
    await page.evaluate(() => {
      const el = /** @type {HTMLInputElement} */ (document.querySelector('.view-analisi input'));
      const dt = new DataTransfer();
      dt.setData('text', '10.0.0.1 255.255.255.0');
      el.focus();
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(300);
    const ipv = await page.inputValue('.view-analisi input');
    const pv = await page.inputValue('.field-prefix input[type=text]');
    assert(ipv === '10.0.0.1' && pv === '255.255.255.0', `campi: "${ipv}" e "${pv}"`);
    assert((await page.textContent('.prefix-other')) === '= /24', 'altra forma del prefisso assente');
    assert((await page.textContent('.kv-primary'))?.includes('10.0.0.0/24'), 'risultato assente');
    await ctx.close();
  });
  await check('Calcolo inverso: cambio di caso (B) e frammento come nella 9.3', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/pianifica/inverso');
    await page.getByRole('radio', { name: 'Numero di subnet' }).check();
    await page.getByLabel('Prefisso del blocco').fill('16');
    await page.getByLabel('Subnet richieste').fill('6');
    await page.waitForTimeout(300);
    const res = await page.textContent('.kv-primary');
    assert(res?.includes('/19') && res.includes('255.255.224.0'), `risultato: ${res}`);
    const hash = await page.evaluate(() => location.hash);
    assert(hash === '#/pianifica/inverso?p=16&s=6', `frammento: ${hash}`);
    await ctx.close();
  });
  await check('Conversioni: binario → decimale ed esadecimale', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/calcola/conversioni');
    await page.getByRole('radio', { name: 'Binario', exact: true }).check();
    await page.getByLabel('Numero', { exact: true }).fill('1100 1011');
    await page.waitForTimeout(300);
    const res = await page.textContent('.tool .result-card');
    assert(res?.includes('203') && res.includes('0xCB'), `risultato: ${res}`);
    await ctx.close();
  });
  await check('cronologia: una voce riapre la sua vista con gli input', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/calcola/mask');
    await page.getByLabel('Subnet mask').fill('255.255.255.224');
    await page.keyboard.press('Enter');
    await page.click('.side-tab[href^="#/pianifica/suddivisione"]');
    await page.waitForSelector('.view-suddivisione');
    await page.click('.history-btn');
    await page.click('.history-open');
    await page.waitForSelector('.view-mask');
    assert((await page.inputValue('.view-mask input')) === '255.255.255.224', 'input non ripristinato');
    assert((await page.textContent('.result-card'))?.includes('/27'), 'risultato assente');
    await ctx.close();
  });
  await check('collegamento "Capitolo N" dei passaggi e pulsante "?": rotte delle guide', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/calcola/analisi?ip=10.1.77.33&p=19&did=1&metodo=multiples');
    await page.click('.results > .steps-panel:not([hidden]) .chapter-link >> nth=0');
    await page.waitForSelector('.view-guide');
    assert((await page.evaluate(() => location.hash)) === '#/guide/subnetting/cap-12', `frammento: ${await page.evaluate(() => location.hash)}`);
    assert((await page.textContent('.view-guide'))?.includes('Il metodo dei multipli'), 'titolo del capitolo assente');
    await page.goBack();
    await page.waitForSelector('.view-analisi');
    await page.click('.help-link');
    await page.waitForSelector('.view-guide');
    assert((await page.evaluate(() => location.hash)) === '#/guide/uso/analisi', 'pulsante "?" non porta alla guida all\'uso');
    await ctx.close();
  });


  // ------------------------------------------------------------ fase 6: guide integrate
  console.log('\nGuide (fase 6)');
  /** Testo e tag dell'elemento con il focus. */
  const focused = (/** @type {import('playwright-core').Page} */ page) => page.evaluate(() => ({
    tag: document.activeElement?.tagName.toLowerCase() ?? '',
    text: (document.activeElement?.textContent ?? '').replace(/\s+/g, ' ').trim(),
    top: Math.round(document.activeElement?.getBoundingClientRect().top ?? -1),
  }));

  await check('guida al subnetting: arrivo su cap-9 con il focus sul titolo, voce attiva dell\'indice, collegamenti interni', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/guide/subnetting/cap-9');
    await page.waitForTimeout(300);
    const f = await focused(page);
    assert(f.tag === 'h3' && f.text.includes('Il numero magico'), `focus: ${f.tag} ${f.text}`);
    assert(f.top >= 0 && f.top < 120, `titolo non in alto: ${f.top}px`);
    const active = await page.textContent('.guide-toc a[aria-current]');
    assert(active?.includes('Il numero magico'), `voce attiva: ${active}`);
    assert((await page.locator('.gl-term').count()) > 100, 'termini del glossario non evidenziati');
    // ogni collegamento interno delle guide arriva a un elemento esistente
    const missing = await page.evaluate(() => [...document.querySelectorAll('.guide-body a[href^="#/guide/subnetting/"]')]
      .map((a) => decodeURIComponent(/** @type {string} */ (a.getAttribute('href')).split('/').pop() ?? ''))
      .filter((id) => !document.getElementById(id)));
    assert(missing.length === 0, `ancore mancanti: ${missing.join(', ')}`);
    // dall'indice al cap. 15, poi indietro al cap. 9
    await page.click('.guide-toc a[data-id="cap-15"]');
    await page.waitForTimeout(250);
    assert((await focused(page)).text.includes('Stessa subnet o no?'), 'indice → cap. 15');
    await page.goBack();
    await page.waitForTimeout(250);
    assert((await focused(page)).text.includes('Il numero magico'), 'indietro → cap. 9');
    // stessa ancora già nel frammento: si torna comunque al paragrafo
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(200);
    await page.click('.guide-toc a[data-id="cap-9"]');
    await page.waitForTimeout(250);
    const again = await focused(page);
    assert(again.text.includes('Il numero magico') && again.top >= 0 && again.top < 120, `stessa ancora: ${again.top}px`);
    // cheat sheet e glossario dai collegamenti rapidi
    await page.click('.guide-toc .guide-quick a >> text=Glossario');
    await page.waitForTimeout(250);
    assert((await focused(page)).text.startsWith('B'), 'collegamento rapido al glossario');
    // ancora inesistente: avviso, nessun errore
    await hashTo(page, '#/guide/subnetting/cap-99');
    assert((await page.textContent('.guide-status'))?.includes('cap-99'), 'avviso per un\'ancora inesistente');
    await shot(page, 'guida-subnetting-1280', false);
    await ctx.close();
  });

  await check('guida a 390 px: indice in alto richiudibile, nessuno scorrimento orizzontale, aree di tocco', async () => {
    const { ctx, page } = await open(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    for (const hash of ['#/guide/subnetting', '#/guide/uso']) {
      await go(page, hash);
      const st = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        side: getComputedStyle(/** @type {Element} */ (document.querySelector('.guide-toc'))).display,
        top: getComputedStyle(/** @type {Element} */ (document.querySelector('.guide-toc-mobile'))).display,
      }));
      assert(!st.overflow, `${hash}: la pagina scorre in orizzontale`);
      assert(st.side === 'none' && st.top !== 'none', `${hash}: indice ${JSON.stringify(st)}`);
    }
    await go(page, '#/guide/subnetting');
    await page.click('.guide-toc-mobile > summary');
    await page.click('.guide-toc-mobile a[data-id="cap-13"]');
    await page.waitForTimeout(300);
    const f = await focused(page);
    assert(f.text.includes('Broadcast e host in un lampo') && f.top > 40 && f.top < 160, `focus dopo l'indice: ${f.text} ${f.top}px`);
    assert(!(await page.evaluate(() => /** @type {HTMLDetailsElement} */ (document.querySelector('.guide-toc-mobile')).open)), 'l\'indice resta aperto');
    const small = await page.evaluate(() => [...document.querySelectorAll('.guide-toc-mobile summary, .guide-body .open-calc a, .guide-body details.sol summary')]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 44; }).length);
    assert(small === 0, `${small} aree di tocco sotto 44 px`);
    await shot(page, 'guida-390', false);
    await ctx.close();
  });

  await check('"Capitolo N" dai passaggi e "?" (anche in Impostazioni): paragrafo giusto con il focus; indietro torna alla schermata', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/calcola/analisi?ip=172.16.45.200&p=20&did=1&metodo=magic');
    await page.click('.results > .steps-panel:not([hidden]) .chapter-link >> nth=0');
    await page.waitForSelector('.view-guide');
    await page.waitForTimeout(250);
    assert((await focused(page)).text.includes('Il numero magico'), 'Capitolo 9 dai passaggi');
    await page.goBack();
    await page.waitForSelector('.view-analisi');
    assert((await page.inputValue('.view-analisi input >> nth=0')) === '172.16.45.200', 'input perso tornando indietro');
    for (const [hash, title] of [
      ['#/calcola/conversioni', 'Conversioni'], ['#/calcola/mask', 'Validazione mask'], ['#/calcola/stessa', 'Stessa subnet?'],
      ['#/pianifica/inverso', 'Calcolo inverso'], ['#/pianifica/suddivisione', 'Suddivisione di un blocco'], ['#/pianifica/piani', 'Piani salvati'],
      ['#/impostazioni', 'Impostazioni'],
    ]) {
      await hashTo(page, hash);
      await page.click('.help-link');
      await page.waitForSelector('.view-guide');
      await page.waitForTimeout(200);
      const f = await focused(page);
      assert(f.tag === 'h3' && f.text === title, `"?" da ${hash}: ${f.tag} ${f.text}`);
    }
    await ctx.close();
  });

  await check('"Apri nel calcolatore": funzione precompilata con passaggi e metodo, impostazioni invariate', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/guide/subnetting/cap-7');
    await page.click('.guide-body a[href="#/calcola/analisi?ip=172.16.45.200&p=20&did=1&metodo=binary"]');
    await page.waitForSelector('.view-analisi');
    await page.waitForTimeout(300);
    assert((await page.textContent('.kv-primary'))?.includes('172.16.32.0/20'), 'risultato assente');
    assert(await page.isVisible('.results > .steps-panel:not([hidden])'), 'passaggi assenti');
    const method = await page.evaluate(() => /** @type {HTMLInputElement | null} */ (document.querySelector('.steps-panel input[type=radio]:checked'))?.value);
    assert(method === 'binary', `metodo: ${method}`);
    await page.goBack();
    await page.waitForSelector('.view-guide');
    await page.click('.guide-body a[href^="#/calcola/stessa?a=192.168.1.10&pa=24&b=192.168.1.200"]');
    await page.waitForSelector('.view-stessa');
    await page.waitForTimeout(300);
    assert((await page.textContent('.view-stessa'))?.includes('192.168.1.128'), 'Stessa subnet non calcolata');
    await hashTo(page, '#/impostazioni');
    const didactic = await page.getByRole('switch', { name: 'Modalità didattica' }).getAttribute('aria-checked');
    assert(didactic === 'false', 'il collegamento ha cambiato l\'impostazione della modalità didattica');
    await ctx.close();
  });

  await check('glossario da tastiera: Tab apre il riquadro, Tab nei suoi collegamenti, Esc chiude e torna al termine', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/guide/subnetting/cap-7');
    await page.waitForTimeout(200);
    // dal titolo del capitolo, Tab fino al primo termine
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      if (await page.evaluate(() => document.activeElement?.classList.contains('gl-term'))) break;
    }
    const term = await page.evaluate(() => ({ cls: document.activeElement?.className ?? '', text: document.activeElement?.textContent ?? '', desc: document.activeElement?.getAttribute('aria-describedby') ?? '' }));
    assert(term.cls.includes('gl-term'), `focus non su un termine: ${term.cls}`);
    assert(await page.isVisible('.gl-pop'), 'riquadro non aperto con il focus');
    assert(await page.evaluate((id) => !!document.getElementById(id), term.desc), 'aria-describedby senza definizione');
    await page.keyboard.press('Tab');
    assert(await page.evaluate(() => !!document.activeElement?.closest('.gl-pop')), 'Tab non entra nel riquadro');
    await page.keyboard.press('Escape');
    const back = await page.evaluate(() => ({ cls: document.activeElement?.className ?? '', text: document.activeElement?.textContent ?? '' }));
    assert(back.cls.includes('gl-term') && back.text === term.text, 'Esc non riporta al termine');
    assert(!(await page.isVisible('.gl-pop')), 'Esc non chiude il riquadro');
    // Invio riapre; il collegamento "Glossario" evidenzia la voce
    await page.keyboard.press('Enter');
    await page.click('.gl-pop a >> text=Glossario');
    await page.waitForTimeout(250);
    const row = await page.evaluate(() => ({ tag: document.activeElement?.tagName ?? '', target: document.activeElement?.classList.contains('is-target') }));
    assert(row.tag === 'TR' && row.target, `voce del glossario: ${JSON.stringify(row)}`);
    // mouse: il riquadro compare al passaggio
    await go(page, '#/guide/subnetting/cap-9');
    await page.hover('#cap-9 .gl-term >> nth=0');
    await page.waitForTimeout(100);
    assert(await page.isVisible('.gl-pop'), 'riquadro non aperto al passaggio del mouse');
    await ctx.close();
  });

  await check('tema dall\'indice della guida: vale per tutta l\'app e si salva con "Memorizza i dati"', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/impostazioni');
    await page.getByRole('switch', { name: 'Memorizza i dati' }).click();
    await hashTo(page, '#/guide/uso');
    await page.selectOption('.guide-toc select', 'contrast');
    assert((await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'contrast', 'tema non applicato');
    await page.waitForTimeout(450);
    await page.reload();
    await page.waitForSelector('.view-guide');
    const st = await page.evaluate(() => ({ attr: document.documentElement.getAttribute('data-theme'), sel: /** @type {HTMLSelectElement} */ (document.querySelector('.guide-toc select')).value }));
    assert(st.attr === 'contrast' && st.sel === 'contrast', `dopo il ricaricamento: ${JSON.stringify(st)}`);
    await hashTo(page, '#/impostazioni');
    assert(await page.getByRole('radio', { name: 'Alto contrasto', exact: true }).isChecked(), 'Impostazioni non allineate');
    await ctx.close();
  });

  await check('stampa della guida: fondo chiaro, indice e collegamenti all\'app nascosti, soluzioni aperte, PDF', async () => {
    const { ctx, page } = await open(browser, { colorScheme: 'dark' });
    await go(page, '#/guide/subnetting/cap-8');
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    await page.emulateMedia({ media: 'print' });
    const st = await page.evaluate(() => {
      const disp = (/** @type {string} */ s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).display : 'assente'; };
      return {
        bg: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
        toc: disp('.guide-toc'), tocTop: disp('.guide-toc-mobile'), calc: disp('.guide-body .open-calc'), head: disp('.print-head'), sidebar: disp('.sidebar'),
        closed: document.querySelectorAll('details.sol:not([open])').length,
        label: getComputedStyle(/** @type {Element} */ (document.querySelector('details.sol .body')), '::before').content,
      };
    });
    assert(hex(st.bg) === '#ffffff', `--bg in stampa: ${st.bg}`);
    for (const k of ['toc', 'tocTop', 'calc', 'head', 'sidebar']) assert(/** @type {any} */ (st)[k] === 'none', `${k} visibile in stampa`);
    assert(st.closed === 0, 'soluzioni chiuse in stampa');
    assert(st.label.includes('Soluzione'), `etichetta delle soluzioni: ${st.label}`);
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    writeFileSync(resolve(OUT, 'stampa-guida-subnetting.pdf'), pdf);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    assert((await page.evaluate(() => document.querySelectorAll('details.sol[open]').length)) === 0, 'soluzioni non richiuse dopo la stampa');
    await ctx.close();
  });

  await check('axe sulle guide: 390 px, tema scuro, riquadro del glossario aperto e indice in alto aperto', async () => {
    const { ctx, page } = await open(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: 'dark' });
    const problems = [];
    for (const hash of ['#/guide/subnetting/cap-11', '#/guide/uso/sessione']) {
      await go(page, hash);
      await page.click('.guide-toc-mobile > summary');
      if (hash.includes('subnetting')) await page.focus('#cap-11 .gl-term >> nth=0');
      const v = await axe(page);
      if (v.length) problems.push(`${hash}: ${v.join('; ')}`);
    }
    assert(problems.length === 0, problems.join('\n'));
    await ctx.close();
  });

  // ------------------------------------------------------------ fase 5: persistenza, export, sessione, cifratura, piani
  console.log('\nPersistenza (8.3)');
  await check('"Memorizza i dati": spento nessuna chiave; acceso salva subito; tema e cronologia dopo il ricaricamento', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/calcola/analisi?ip=10.20.30.140&p=27');
    await page.locator('.view-analisi input').first().press('Enter');
    await hashTo(page, '#/impostazioni');
    assert((await appKeys(page)).length === 0, 'chiavi salvate con l\'interruttore spento');
    await page.getByRole('radio', { name: 'Scuro', exact: true }).check();
    await page.getByRole('switch', { name: 'Memorizza i dati' }).click();
    await page.waitForTimeout(150);
    assert((await appKeys(page)).sort().join() === 'subnetcalc:v1:history,subnetcalc:v1:meta,subnetcalc:v1:plans,subnetcalc:v1:settings', `chiavi: ${await appKeys(page)}`);
    assert((await page.textContent('.persist-info'))?.includes('Ultimo salvataggio'), 'data dell\'ultimo salvataggio assente');
    // modifica ritardata di 300 ms
    await page.getByRole('switch', { name: 'Modalità didattica' }).click();
    await page.waitForTimeout(450);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('subnetcalc:v1:settings') ?? '{}'));
    assert(saved.didactic === true && saved.theme === 'dark' && saved.persist === true, `impostazioni salvate: ${JSON.stringify(saved)}`);
    // ricaricamento: il tema c'è già al primo disegno
    await page.reload();
    await page.waitForSelector('.view');
    assert((await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark', 'tema non ripristinato');
    assert((await page.getByRole('switch', { name: 'Memorizza i dati' }).getAttribute('aria-checked')) === 'true', 'interruttore spento dopo il ricaricamento');
    await hashTo(page, '#/calcola/analisi');
    await page.click('.history-btn');
    assert((await page.textContent('.history-list'))?.includes('10.20.30.140/27'), 'cronologia non ripristinata');
    await page.keyboard.press('Escape');
    await ctx.close();
  });
  await check('spegnimento con conferma: Annulla lascia tutto, Conferma cancella le chiavi e tiene i dati della visita', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/impostazioni');
    const sw = page.getByRole('switch', { name: 'Memorizza i dati' });
    await sw.click();
    await page.waitForTimeout(100);
    await sw.click();
    assert(await page.isVisible('dialog[open]'), 'nessuna conferma allo spegnimento');
    assert((await page.textContent('dialog[open]'))?.includes('Quelli della visita in corso restano'), 'testo della conferma');
    await page.getByRole('button', { name: 'Annulla', exact: true }).click();
    await page.waitForTimeout(150);
    assert((await sw.getAttribute('aria-checked')) === 'true', 'Annulla ha spento l\'interruttore');
    assert((await appKeys(page)).length === 4, `Annulla ha cancellato le chiavi: ${await appKeys(page)}`);
    await sw.click();
    await page.getByRole('button', { name: 'Smetti e cancella' }).click();
    await page.waitForTimeout(150);
    assert((await sw.getAttribute('aria-checked')) === 'false' && (await appKeys(page)).length === 0, 'chiavi non cancellate');
    await ctx.close();
  });
  await check('più schede: l\'evento storage aggiorna l\'altra scheda; spegnimento altrove', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/impostazioni');
    await page.getByRole('switch', { name: 'Memorizza i dati' }).click();
    const other = await ctx.newPage();
    other.on('pageerror', (e) => jsErrors.push(`pageerror: ${e.message}`));
    await other.goto(`${URL0}#/impostazioni`);
    await other.waitForSelector('.view');
    await page.getByRole('radio', { name: 'Alto contrasto', exact: true }).check();
    await other.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'contrast', null, { timeout: 3000 });
    await page.getByRole('switch', { name: 'Memorizza i dati' }).click();
    await page.getByRole('button', { name: 'Smetti e cancella' }).click();
    await other.waitForFunction(() => document.querySelector('[role=switch][aria-checked]:not([aria-checked="true"])') && [...document.querySelectorAll('[role=switch]')].some((s) => s.getAttribute('aria-labelledby') && document.getElementById(/** @type {string} */ (s.getAttribute('aria-labelledby')))?.textContent === 'Memorizza i dati' && s.getAttribute('aria-checked') === 'false'), null, { timeout: 3000 });
    assert((await other.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'contrast', 'la seconda scheda ha perso il tema in memoria');
    await ctx.close();
  });
  await check('avvio con dati illeggibili: avviso e "Cancella i dati salvati"', async () => {
    const { ctx, page } = await open(browser);
    await page.addInitScript(() => {
      if (location.protocol !== 'file:' || window.name === 'seeded') return;
      localStorage.setItem('subnetcalc:v1:meta', JSON.stringify({ schema: 1, savedAt: '2026-11-19T10:00:00.000Z' }));
      localStorage.setItem('subnetcalc:v1:history', '{non è json');
      window.name = 'seeded';
    });
    await go(page, '#/impostazioni');
    assert((await page.textContent('.persist-info'))?.includes('non erano leggibili'), 'avviso assente');
    await page.getByRole('button', { name: 'Cancella i dati salvati' }).click();
    await page.waitForTimeout(150);
    assert((await appKeys(page)).length === 0, 'dati illeggibili non cancellati');
    await ctx.close();
  });
  await check('localStorage rifiutato: interruttore disattivato con spiegazione, app funzionante', async () => {
    const { ctx, page } = await open(browser);
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('negato', 'SecurityError'); } });
    });
    await go(page, '#/impostazioni');
    assert(await page.getByRole('switch', { name: 'Memorizza i dati' }).isDisabled(), 'interruttore attivo');
    assert((await page.textContent('.view-impostazioni'))?.includes('Questo browser non permette di salvare'), 'spiegazione assente');
    await go(page, '#/calcola/analisi?ip=10.0.0.1&p=24');
    assert((await page.textContent('.kv-primary'))?.includes('10.0.0.0/24'), 'calcolo non riuscito');
    await ctx.close();
  });

  console.log('\nExport (5)');
  await check('barra di export: Copia, CSV, JSON, Markdown, Testo, Snippet, con "Includi i passaggi"', async () => {
    const { ctx, page } = await open(browser, { acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
    await go(page, '#/impostazioni');
    await page.getByRole('switch', { name: 'Export' }).click();
    await page.evaluate(() => { location.hash = '#/calcola/analisi?ip=172.16.45.200&p=20&did=1'; });
    await page.waitForSelector('.export-toolbar');
    await page.getByLabel('Includi i passaggi').check();
    await page.click('.export-toolbar [data-format=copy]');
    await page.waitForTimeout(200);
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    assert(clip.startsWith('Analisi subnet · 172.16.45.200/20') && clip.includes('Passaggi · metodo binario'), `appunti: ${clip.slice(0, 80)}`);
    const csv = await download(page, '.export-toolbar [data-format=csv]');
    assert(/^subnet-analisi-172\.16\.32\.0-20-\d{8}-\d{4}\.csv$/.test(csv.name), `nome: ${csv.name}`);
    assert(csv.text.startsWith('\uFEFFVoce;Valore\r\n') && csv.text.includes('Host utilizzabili;4094\r\n'), 'CSV');
    const json = JSON.parse((await download(page, '.export-toolbar [data-format=json]')).text);
    assert(json.format === 'subnetcalc-result' && json.output.network === '172.16.32.0' && json.steps?.[0]?.method === 'binary', 'JSON');
    const md = await download(page, '.export-toolbar [data-format=md]');
    assert(md.text.includes('| Rete | `172.16.32.0` |') && md.text.includes('## Passaggi'), 'Markdown');
    const txt = await download(page, '.export-toolbar [data-format=text]');
    assert(txt.name.endsWith('.txt') && /\nHost utilizzabili +4\.094\n/.test(txt.text), 'Testo');
    const snip = await download(page, '.export-toolbar [data-format=snippet]');
    assert(snip.name.startsWith('subnet-snippet-172.16.32.0-20-') && snip.text.includes('network 172.16.32.0 0.0.15.255 area 0'), 'Snippet');
    // le altre viste hanno la barra
    for (const hash of ['#/calcola/conversioni?n=203', '#/calcola/mask?m=255.255.250.0', '#/calcola/stessa?a=10.1.63.5&pa=19&b=10.1.64.5', '#/pianifica/inverso?h=50']) {
      await page.evaluate((x) => { location.hash = x; }, hash);
      await page.waitForTimeout(250);
      const f = await download(page, '.export-toolbar [data-format=csv]');
      assert(f.text.startsWith('\uFEFFVoce;Valore'), `${hash}: CSV`);
    }
    await ctx.close();
  });
  await check('Suddivisione: pagina corrente, tutte, intervallo obbligatorio oltre 65.536 righe', async () => {
    const { ctx, page } = await open(browser, { acceptDownloads: true });
    await go(page, '#/impostazioni');
    await page.getByRole('switch', { name: 'Export' }).click();
    await page.evaluate(() => { location.hash = '#/pianifica/suddivisione?b=10.0.0.0&p=16&np=24'; });
    await page.waitForSelector('.export-toolbar');
    await page.click('.export-toolbar [data-format=csv]');
    const all = await download(page, 'dialog[open] .btn-primary', async () => { await page.check('dialog[open] input[value=all]'); });
    assert(all.text.split('\r\n').length === 258, `righe di "tutte": ${all.text.split('\r\n').length}`);
    await page.evaluate(() => { location.hash = '#/pianifica/suddivisione?b=10.0.0.0&p=8&np=30'; });
    await page.waitForTimeout(300);
    await page.click('.export-toolbar [data-format=csv]');
    assert(await page.isDisabled('dialog[open] input[value=all]'), '"Tutte" attivo oltre 65.536 righe');
    await page.check('dialog[open] input[value=custom]');
    await page.fill('dialog[open] .range-fields input >> nth=0', '1');
    await page.fill('dialog[open] .range-fields input >> nth=1', '70000');
    await page.click('dialog[open] .btn-primary');
    assert((await page.textContent('dialog[open] .form-error'))?.includes('65.536'), 'limite non segnalato');
    const v = await axe(page);
    assert(v.length === 0, v.join('\n'));
    await page.fill('dialog[open] .range-fields input >> nth=0', '4194301');
    await page.fill('dialog[open] .range-fields input >> nth=1', '4194304');
    const r = await download(page, 'dialog[open] .btn-primary');
    const lines = r.text.trim().split('\r\n');
    assert(lines.length === 5 && lines[4].startsWith('4194304;10.255.255.252;30'), `intervallo: ${lines.slice(-1)}`);
    assert(r.name.includes('-n4194301-4194304-'), `nome: ${r.name}`);
    await ctx.close();
  });

  console.log('\nSessione JSON e busta cifrata (6, 7)');
  await check('esporta in chiaro → importa in un altro browser con Sostituisci; "Applica le impostazioni" solo su scelta', async () => {
    const a = await open(browser, { acceptDownloads: true });
    await go(a.page, '#/calcola/analisi?ip=192.168.10.75&p=26');
    await a.page.locator('.view-analisi input').first().press('Enter');
    await hashTo(a.page, '#/impostazioni');
    await a.page.getByRole('radio', { name: 'Scuro', exact: true }).check();
    await a.page.getByRole('button', { name: 'Esporta sessione' }).click();
    assert((await a.page.textContent('dialog[open]'))?.includes('1 calcolo, 0 piani'), 'riepilogo');
    assert(!(await a.page.getByLabel('Cifra il file').isChecked()), '"Cifra il file" acceso all\'apertura');
    const file = await download(a.page, 'dialog[open] button[type=submit]');
    assert(/^subnetcalc-sessione-\d{8}-\d{4}\.json$/.test(file.name), `nome: ${file.name}`);
    const s = JSON.parse(file.text);
    assert(s.format === 'subnetcalc-session' && s.history[0].input.ip === '192.168.10.75' && !('persist' in s.settings), 'contenuto');
    await a.ctx.close();
    const b = await open(browser);
    await go(b.page, '#/impostazioni');
    await b.page.setInputFiles('input[type=file]', { name: file.name, mimeType: 'application/json', buffer: Buffer.from(file.text) });
    await b.page.waitForSelector('dialog[open]');
    const prev = await b.page.textContent('dialog[open]');
    assert(prev?.includes('Contiene 1 calcolo e 0 piani'), `anteprima: ${prev}`);
    const v = await axe(b.page);
    assert(v.length === 0, v.join('\n'));
    await b.page.getByRole('button', { name: 'Sostituisci' }).click();
    await b.page.waitForTimeout(150);
    assert((await b.page.textContent('.toast'))?.startsWith('Importate 1 voce e 0 piani'), `riepilogo: ${await b.page.textContent('.toast')}`);
    assert((await b.page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === null, 'impostazioni applicate senza la casella');
    await b.page.setInputFiles('input[type=file]', { name: file.name, mimeType: 'application/json', buffer: Buffer.from(file.text) });
    await b.page.getByLabel('Applica anche le impostazioni del file').check();
    await b.page.getByRole('button', { name: 'Unisci' }).click();
    await b.page.waitForTimeout(150);
    assert((await b.page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark', 'impostazioni non applicate');
    assert((await b.page.getByRole('radio', { name: 'Scuro', exact: true }).isChecked()), 'Impostazioni non aggiornate');
    await hashTo(b.page, '#/calcola/analisi');
    await b.page.click('.history-btn');
    assert((await b.page.locator('.history-item').count()) === 1, 'Unisci ha duplicato la voce');
    await b.ctx.close();
  });
  await check('busta cifrata: passphrase con conferma e robustezza, passphrase errata, andata e ritorno', async () => {
    const a = await open(browser, { acceptDownloads: true });
    await go(a.page, '#/pianifica/suddivisione?b=10.40.0.0&p=16&np=24');
    await a.page.getByRole('button', { name: 'Salva come piano' }).click();
    await a.page.getByLabel('Nome', { exact: true }).fill('Sede · è ü');
    await a.page.click('dialog[open] .btn-primary');
    await a.page.waitForSelector('.plan-current');
    await hashTo(a.page, '#/impostazioni');
    await a.page.getByRole('button', { name: 'Esporta sessione' }).click();
    await a.page.getByLabel('Cifra il file').check();
    const v1 = await axe(a.page);
    assert(v1.length === 0, v1.join('\n'));
    await a.page.getByLabel('Passphrase', { exact: true }).fill('corta');
    assert((await a.page.textContent('.meter-label')) === 'Robustezza: debole', 'indicatore');
    await a.page.click('dialog[open] button[type=submit]');
    assert((await a.page.textContent('dialog[open] .field-error'))?.includes('almeno 12'), 'minimo di 12 caratteri non controllato');
    await a.page.getByLabel('Passphrase', { exact: true }).fill('cavallo batteria graffetta');
    await a.page.getByLabel('Conferma la passphrase').fill('cavallo batteria graffett');
    await a.page.click('dialog[open] button[type=submit]');
    assert((await a.page.textContent('dialog[open]'))?.includes('non coincidono'), 'conferma non controllata');
    await a.page.getByLabel('Conferma la passphrase').fill('cavallo batteria graffetta');
    assert((await a.page.textContent('.meter-label')) === 'Robustezza: ottima', 'indicatore ottima');
    const file = await download(a.page, 'dialog[open] button[type=submit]');
    assert(file.name.endsWith('-cifrato.json'), `nome: ${file.name}`);
    const env = JSON.parse(file.text);
    assert(env.format === 'subnetcalc-encrypted' && env.kdf.iterations === 600000 && !file.text.includes('Sede'), 'busta');
    // riapertura: la casella torna spenta e i campi vuoti
    await a.page.getByRole('button', { name: 'Esporta sessione' }).click();
    assert(!(await a.page.getByLabel('Cifra il file').isChecked()), 'casella ricordata');
    // Esc mentre si cifra: la finestra si chiude e il file non viene scaricato (revisione I6)
    await a.page.getByLabel('Cifra il file').check();
    await a.page.getByLabel('Passphrase', { exact: true }).fill('cavallo batteria graffetta');
    await a.page.getByLabel('Conferma la passphrase').fill('cavallo batteria graffetta');
    let late = false;
    a.page.on('download', () => { late = true; });
    await a.page.click('dialog[open] button[type=submit]');
    await a.page.keyboard.press('Escape');
    await a.page.waitForTimeout(2500);
    assert(!late && !(await a.page.$('dialog[open]')), 'export annullato ma file scaricato');
    await a.ctx.close();
    const b = await open(browser);
    await go(b.page, '#/impostazioni');
    await b.page.setInputFiles('input[type=file]', { name: file.name, mimeType: 'application/json', buffer: Buffer.from(file.text) });
    await b.page.getByLabel('Passphrase', { exact: true }).fill('passphrase sbagliata');
    await b.page.click('dialog[open] button[type=submit]');
    await b.page.waitForFunction(() => document.querySelector('dialog[open] .form-error')?.textContent);
    assert((await b.page.textContent('dialog[open] .form-error')) === 'Passphrase errata o file danneggiato.', 'errore');
    // Invio nel campo conferma la finestra (revisione M1, C7)
    await b.page.getByLabel('Passphrase', { exact: true }).fill('cavallo batteria graffetta');
    await b.page.getByLabel('Passphrase', { exact: true }).press('Enter');
    await b.page.waitForFunction(() => document.querySelector('dialog[open]')?.textContent?.includes('Contiene'));
    await b.page.getByRole('button', { name: 'Unisci' }).click();
    await hashTo(b.page, '#/pianifica/piani');
    assert((await b.page.textContent('.plan-list'))?.includes('Sede · è ü'), 'piano non importato');
    // file manomesso
    const bad = { ...env, kdf: { ...env.kdf, iterations: env.kdf.iterations + 1 } };
    await hashTo(b.page, '#/impostazioni');
    await b.page.setInputFiles('input[type=file]', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bad)) });
    await b.page.getByLabel('Passphrase', { exact: true }).fill('cavallo batteria graffetta');
    await b.page.click('dialog[open] button[type=submit]');
    await b.page.waitForFunction(() => document.querySelector('dialog[open] .form-error')?.textContent);
    assert((await b.page.textContent('dialog[open] .form-error')) === 'Passphrase errata o file danneggiato.', 'manomissione non rilevata');
    await b.ctx.close();
  });
  await check('import: file non JSON, formato sconosciuto, versione successiva, oltre 5 MB', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/impostazioni');
    const cases = [
      ['a.json', '{ rotto', 'non è in formato JSON'],
      ['b.json', '{"format":"altro"}', 'nel formato "altro"'],
      ['c.json', '{"format":"subnetcalc-session","version":7,"exportedAt":"2026-11-19T10:00:00.000Z"}', 'aggiorna l\'app'],
      ['d.json', `{"format":"subnetcalc-session","pad":"${'x'.repeat(5242880)}"}`, 'supera il limite di 5 MB'],
    ];
    for (const [name, text, expected] of cases) {
      await page.setInputFiles('input[type=file]', { name, mimeType: 'application/json', buffer: Buffer.from(text) });
      await page.waitForSelector('dialog[open]');
      const msg = await page.textContent('dialog[open]');
      assert(msg?.includes(expected), `${name}: ${msg}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
    }
    await ctx.close();
  });
  await check('Web Crypto assente: "Cifra il file" disattivata con spiegazione; file cifrato rifiutato', async () => {
    const { ctx, page } = await open(browser);
    await page.addInitScript(() => {
      Object.defineProperty(Crypto.prototype, 'subtle', { get: () => undefined });
    });
    await go(page, '#/impostazioni');
    await page.getByRole('button', { name: 'Esporta sessione' }).click();
    assert(await page.getByLabel('Cifra il file').isDisabled(), 'casella attiva');
    assert((await page.textContent('dialog[open]'))?.includes('HTTPS'), 'spiegazione assente');
    await page.keyboard.press('Escape');
    const env = { format: 'subnetcalc-encrypted', version: 1, kdf: { name: 'PBKDF2-SHA-256', iterations: 600000, salt: 'AAAAAAAAAAAAAAAAAAAAAA==' }, cipher: { name: 'AES-256-GCM', iv: 'AAAAAAAAAAAAAAAA' }, data: 'AAAAAAAAAAAAAAAAAAAAAA==' };
    await page.setInputFiles('input[type=file]', { name: 'c.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(env)) });
    await page.waitForSelector('dialog[open]');
    assert((await page.textContent('dialog[open]'))?.includes('Web Crypto'), 'messaggio assente');
    await ctx.close();
  });

  console.log('\nPiani salvati (9.1)');
  await check('Salva come piano, etichette nella colonna, export con etichette, ricaricamento, eliminazione', async () => {
    const { ctx, page } = await open(browser, { acceptDownloads: true });
    await go(page, '#/impostazioni');
    await page.getByRole('switch', { name: 'Memorizza i dati' }).click();
    await page.getByRole('switch', { name: 'Export' }).click();
    await page.evaluate(() => { location.hash = '#/pianifica/suddivisione?b=10.40.0.0&p=16&np=24'; });
    await page.getByRole('button', { name: 'Salva come piano' }).click();
    assert((await page.getByLabel('Nome', { exact: true }).inputValue()) === '10.40.0.0/16 → /24', 'nome proposto');
    await page.getByLabel('Nome', { exact: true }).fill('Sede via Celoria');
    await page.getByLabel('Note').fill('Primo piano\nseconda riga');
    await page.click('dialog[open] .btn-primary');
    await page.waitForSelector('.plan-current');
    assert((await page.evaluate(() => location.hash)).includes('&piano='), 'frammento senza piano');
    await page.getByLabel('Etichetta della subnet n. 11', { exact: true }).fill('VLAN 10 · Uffici');
    await page.getByLabel('Etichetta della subnet n. 21', { exact: true }).fill('=CMD()');
    const v = await axe(page);
    assert(v.length === 0, v.join('\n'));
    await page.click('.export-toolbar [data-format=csv]');
    const csv = await download(page, 'dialog[open] .btn-primary');
    assert(csv.text.includes(';VLAN 10 · Uffici\r\n') && csv.text.includes(";'=CMD()\r\n") && csv.text.split('\r\n')[0].endsWith(';Etichetta'), 'etichette nel CSV');
    await page.waitForTimeout(400);
    await page.reload();
    await page.waitForSelector('.plan-current');
    assert((await page.getByLabel('Etichetta della subnet n. 11', { exact: true }).inputValue()) === 'VLAN 10 · Uffici', 'etichetta persa al ricaricamento');
    // collegamento modificato a mano: stesso piano, altro blocco → il piano non si apre (revisione I3, C5)
    const planHash = await page.evaluate(() => location.hash);
    const pid = new URLSearchParams(planHash.split('?')[1]).get('piano');
    await hashTo(page, `#/pianifica/suddivisione?b=172.16.0.0&p=16&np=24&piano=${pid}`);
    assert(!(await page.isVisible('.plan-current')) && !(await page.$('.label-input')), 'piano aperto su un altro blocco');
    assert((await page.textContent('.view'))?.includes('non sono quelli del piano'), 'avviso assente');
    await hashTo(page, planHash);
    await page.waitForSelector('.plan-current');
    // cambiare i prefissi chiude il piano
    await page.getByLabel('Nuovo prefisso').fill('/25');
    await page.waitForTimeout(300);
    assert(!(await page.isVisible('.plan-current')), 'piano ancora aperto');
    await page.click('.side-tab[href^="#/pianifica/piani"]');
    await page.waitForSelector('.plan-card');
    const card = await page.textContent('.plan-card');
    assert(card?.includes('Sede via Celoria') && card.includes('10.40.0.0/16 → /24 · 256 subnet · 2 etichette') && card.includes('seconda riga'), `scheda: ${card}`);
    const v2 = await axe(page);
    assert(v2.length === 0, v2.join('\n'));
    await page.getByRole('button', { name: 'Elimina' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Elimina' }).click();
    await page.waitForSelector('.empty-card');
    await page.waitForTimeout(450);
    assert((await page.evaluate(() => JSON.parse(localStorage.getItem('subnetcalc:v1:plans') ?? '[1]').length)) === 0, 'piano ancora salvato');
    await ctx.close();
  });
  await check('telefono 390 px: Impostazioni, Piani e pannello Esporta con "Includi i passaggi"; aree di tocco', async () => {
    const { ctx, page } = await open(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await go(page, '#/impostazioni');
    await page.getByRole('switch', { name: 'Export' }).click();
    await page.getByRole('switch', { name: 'Modalità didattica' }).click();
    const small = async () => page.evaluate(() => {
      const sel = 'button, input:not([type=range]):not([type=radio]):not([type=checkbox]):not([type=file]), select, .segmented-option label, .check-label, summary, a.icon-btn';
      return [...document.querySelectorAll(sel)].filter((e) => {
        const r = e.getBoundingClientRect();
        const st = getComputedStyle(e);
        return r.width > 0 && st.visibility !== 'hidden' && !e.closest('[hidden]') && st.display !== 'none' && r.height < 44;
      }).map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join('.')} ${Math.round(e.getBoundingClientRect().height)}px`);
    });
    let s = await small();
    assert(s.length === 0, `Impostazioni: ${s.join(', ')}`);
    await page.evaluate(() => { location.hash = '#/pianifica/suddivisione?b=10.0.0.0&p=24&np=26'; });
    await page.getByRole('button', { name: 'Salva come piano' }).click();
    await page.click('dialog[open] .btn-primary');
    await page.waitForSelector('.plan-current');
    s = await small();
    assert(s.length === 0, `Suddivisione con piano: ${s.join(', ')}`);
    assert(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), 'scorrimento orizzontale');
    await page.click('.export-sheet-btn');
    assert(await page.isVisible('dialog[open] .export-steps'), '"Includi i passaggi" assente nel pannello');
    s = await small();
    assert(s.length === 0, `pannello Esporta: ${s.join(', ')}`);
    const v = await axe(page);
    assert(v.length === 0, v.join('\n'));
    await shot(page, 'telefono-export-piano', false);
    await ctx.close();
  });

  // ------------------------------------------------------------ stampa
  console.log('\nRevisione della fase 7');
  await check('telefono 390 px: con Tab il controllo con il focus non finisce sotto le barre (C1); "torna su" nascosto non si raggiunge (C2)', async () => {
    // movimento ridotto: lo scorrimento è immediato e la posizione si misura subito
    const { ctx, page } = await open(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    for (const hash of ['#/impostazioni', '#/calcola/analisi?ip=172.16.45.200&p=20&did=1']) {
      await go(page, hash);
      await page.waitForTimeout(300);
      const hidden = await page.evaluate(() => {
        const el = /** @type {HTMLElement} */ (document.querySelector('.to-top'));
        el.focus();
        return { vis: getComputedStyle(el).visibility, focused: document.activeElement === el, shown: el.classList.contains('show') };
      });
      assert(hidden.shown || (hidden.vis === 'hidden' && !hidden.focused), `torna su nascosto ma raggiungibile: ${JSON.stringify(hidden)}`);
      await page.evaluate(() => /** @type {HTMLElement} */ (document.querySelector('.view-title')).focus());
      /** @type {string[]} */
      const covered = [];
      for (let i = 0; i < 70; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(30);
        const c = await page.evaluate(() => {
          const a = document.activeElement;
          if (!a || a === document.body || a.closest('.bottom-bar, .topbar, .skip-link, dialog')) return null;
          const r = a.getBoundingClientRect();
          const bottom = document.querySelector('.bottom-bar')?.getBoundingClientRect().top ?? innerHeight;
          const top = document.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 0;
          return r.bottom > bottom + 1 || r.top < top - 1 ? `${a.tagName.toLowerCase()} "${(a.getAttribute('aria-label') ?? a.textContent ?? '').trim().slice(0, 30)}"` : null;
        });
        if (c) covered.push(c);
      }
      assert(covered.length === 0, `${hash}: coperti dalle barre: ${[...new Set(covered)].join(', ')}`);
    }
    await ctx.close();
  });

  await check('focus conservato: pagina successiva di Suddivisione, esempio dello stato vuoto, eliminazione di un piano (C3)', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/pianifica/suddivisione?b=10.0.0.0&p=16&np=30');
    await page.focus('[data-pager="next"]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    assert(await page.evaluate(() => document.activeElement?.getAttribute('data-pager') === 'next'), 'focus perso dopo "Pagina successiva"');
    assert((await page.inputValue('[data-pager="input"]')) === '2', 'pagina non cambiata');
    await page.focus('[data-pager="last"]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    assert(await page.evaluate(() => document.activeElement?.getAttribute('data-pager') === 'input'), 'focus perso dopo "Ultima pagina"');
    await page.waitForTimeout(900);
    assert((await page.textContent('[aria-live="polite"].sr-only'))?.includes('Subnet da'), 'pagina nuova non annunciata');
    for (const hash of ['#/calcola/analisi', '#/calcola/stessa', '#/pianifica/inverso', '#/pianifica/suddivisione']) {
      await go(page, hash);
      await page.focus('.examples .chip');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      const tag = await page.evaluate(() => (document.activeElement === document.body ? 'body' : document.activeElement?.tagName.toLowerCase()));
      assert(tag === 'input', `${hash}: dopo l'esempio il focus è su ${tag}`);
    }
    await page.getByRole('button', { name: 'Salva come piano' }).click();
    await page.getByLabel('Nome', { exact: true }).press('Enter');
    await page.waitForSelector('.plan-current');
    await page.waitForTimeout(200);
    assert(await page.evaluate(() => document.activeElement !== document.body), 'focus perso dopo "Salva come piano"');
    await hashTo(page, '#/pianifica/piani');
    await page.getByRole('button', { name: 'Elimina' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('dialog').getByRole('button', { name: 'Elimina' }).click();
    await page.waitForSelector('.empty-card');
    await page.waitForTimeout(200);
    assert(await page.evaluate(() => document.activeElement?.classList.contains('view-title')), 'focus perso dopo l\'eliminazione del piano');
    await ctx.close();
  });

  await check('Conversioni annuncia il risultato (C4); "Apri in Analisi" conserva l\'IP (C6)', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/calcola/conversioni');
    await page.getByLabel('Numero', { exact: true }).fill('203');
    await page.waitForTimeout(1200);
    assert((await page.textContent('[aria-live="polite"].sr-only'))?.includes('11001011'), `annuncio: ${await page.textContent('[aria-live="polite"].sr-only')}`);
    await go(page, '#/calcola/analisi?ip=192.168.5.77&p=24');
    await hashTo(page, '#/pianifica/inverso?h=50');
    await page.getByRole('button', { name: 'Apri in Analisi' }).click();
    // si aspetta la vista di Analisi: prima del cambio, .kv-primary è ancora quella del Calcolo inverso
    await page.waitForFunction(() => location.hash.startsWith('#/calcola/analisi') && document.querySelector('.view-analisi .kv-primary'), null, { timeout: 5000 }).catch(() => {});
    assert((await page.textContent('.kv-primary'))?.includes('192.168.5.64/26'), `analisi (${await page.evaluate(() => location.hash)}): ${await page.textContent('.kv-primary')}`);
    await ctx.close();
  });

  console.log('\nRevisione finale (v1.1)');
  await check('mask non valida nel campo B di Stessa subnet e nel Blocco di Suddivisione: errore sotto quel campo (A3)', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/calcola/stessa?a=10.0.0.1&pa=24&b=10.0.0.2%20255.255.0.255');
    await page.waitForTimeout(300);
    const inv = await page.evaluate(() => [...document.querySelectorAll('input[aria-invalid="true"]')].map((i) => document.querySelector(`label[for="${i.id}"]`)?.textContent?.trim()));
    assert(inv.length === 1 && inv[0]?.startsWith('Host B'), `campi con errore: ${JSON.stringify(inv)}`);
    await go(page, '#/pianifica/suddivisione?b=10.0.0.0%20255.255.0.255&np=24');
    await page.waitForTimeout(300);
    const inv2 = await page.evaluate(() => [...document.querySelectorAll('input[aria-invalid="true"]')].map((i) => document.querySelector(`label[for="${i.id}"]`)?.textContent?.trim()));
    assert(inv2.length === 1 && inv2[0]?.startsWith('Blocco'), `campi con errore: ${JSON.stringify(inv2)}`);
    await ctx.close();
  });

  await check('messaggi brevi solo dopo la chiusura della finestra: piano salvato, sessione esportata (C8)', async () => {
    const { ctx, page } = await open(browser, { acceptDownloads: true });
    await go(page, '#/pianifica/suddivisione?b=10.40.0.0&p=16&np=24');
    await page.evaluate(() => {
      // @ts-ignore registro di prova
      window.__toasts = [];
      const el = /** @type {Element} */ (document.querySelector('.toast'));
      new MutationObserver(() => {
        // @ts-ignore
        window.__toasts.push({ text: el.textContent, modal: !!document.querySelector('dialog[open]') });
      }).observe(el, { childList: true, characterData: true, subtree: true });
    });
    await page.getByRole('button', { name: 'Salva come piano' }).click();
    await page.click('dialog[open] .btn-primary');
    await page.waitForSelector('.plan-current');
    await hashTo(page, '#/impostazioni');
    await page.getByRole('button', { name: 'Esporta sessione' }).click();
    const file = await download(page, 'dialog[open] button[type=submit]');
    await page.waitForTimeout(300);
    await page.setInputFiles('input[type=file]', { name: file.name, mimeType: 'application/json', buffer: Buffer.from(file.text) });
    await page.waitForSelector('dialog[open]');
    await page.getByRole('button', { name: 'Unisci' }).click();
    await page.waitForTimeout(600);
    // @ts-ignore
    const log = /** @type {{ text: string, modal: boolean }[]} */ (await page.evaluate(() => window.__toasts));
    assert(log.some((x) => x.text === 'Piano salvato') && log.some((x) => x.text?.startsWith('Sessione esportata')) && log.some((x) => x.text?.startsWith('Importat')), `messaggi: ${JSON.stringify(log)}`);
    assert(log.every((x) => !x.modal), `messaggio con la finestra aperta: ${JSON.stringify(log)}`);
    await ctx.close();
  });

  await check('barra di export: un solo pulsante nell\'ordine di Tab, frecce, Inizio e Fine (C18)', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/impostazioni');
    await page.getByRole('switch', { name: 'Export' }).click();
    await hashTo(page, '#/calcola/analisi?ip=192.168.10.75&p=26');
    await page.waitForSelector('.export-toolbar button');
    const tabbable = await page.evaluate(() => [...document.querySelectorAll('.export-toolbar button')].filter((b) => /** @type {HTMLElement} */ (b).tabIndex === 0).length);
    assert(tabbable === 1, `${tabbable} pulsanti nell'ordine di Tab`);
    await page.focus('.export-toolbar button');
    const fmt = () => page.evaluate(() => /** @type {HTMLElement} */ (document.activeElement).dataset.format);
    await page.keyboard.press('ArrowRight');
    assert((await fmt()) === 'csv', `freccia destra: ${await fmt()}`);
    await page.keyboard.press('End');
    assert((await fmt()) === 'print', `Fine: ${await fmt()}`);
    await page.keyboard.press('ArrowRight');
    assert((await fmt()) === 'copy', `dopo l'ultimo si torna al primo: ${await fmt()}`);
    await page.keyboard.press('ArrowLeft');
    assert((await fmt()) === 'print', `freccia sinistra: ${await fmt()}`);
    await page.keyboard.press('Home');
    assert((await fmt()) === 'copy', `Inizio: ${await fmt()}`);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Tab');
    assert(!(await page.evaluate(() => !!document.activeElement?.closest('.export-toolbar'))), 'Tab resta nella barra');
    await page.keyboard.press('Shift+Tab');
    assert((await fmt()) === 'csv', `Maiusc+Tab torna sull'ultimo usato: ${await fmt()}`);
    await ctx.close();
  });

  await check('guide a 390 px: selettore del tema, collegamenti rapidi e riquadro del glossario da 44 px (C11)', async () => {
    const { ctx, page } = await open(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await go(page, '#/guide/subnetting/cap-7');
    await page.click('.guide-toc-mobile > summary');
    const sizes = await page.evaluate(() => [...document.querySelectorAll('.guide-toc-mobile .guide-theme, .guide-toc-mobile .guide-quick a')].map((e) => Math.round(e.getBoundingClientRect().height)));
    assert(sizes.length >= 3 && sizes.every((x) => x >= 44), `altezze: ${sizes}`);
    await page.click('.guide-toc-mobile > summary');
    await page.locator('#cap-7 .gl-term').first().focus();
    await page.waitForSelector('.gl-pop:not([hidden])');
    const pop = await page.evaluate(() => [...document.querySelectorAll('.gl-pop:not([hidden]) a')].map((e) => Math.round(e.getBoundingClientRect().height)));
    assert(pop.length >= 1 && pop.every((x) => x >= 44), `riquadro del glossario: ${pop}`);
    await ctx.close();
  });

  await check('frammento normalizzato: pagina fuori intervallo e caso sconosciuto (C12)', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/pianifica/suddivisione?b=10.0.0.0&p=16&np=24&pg=999');
    await page.waitForTimeout(500);
    assert((await page.evaluate(() => location.hash)) === '#/pianifica/suddivisione?b=10.0.0.0&p=16&np=24', `frammento: ${await page.evaluate(() => location.hash)}`);
    await go(page, '#/pianifica/suddivisione?b=10.0.0.0&p=16&np=30&pg=xyz');
    await page.waitForTimeout(500);
    assert(!(await page.evaluate(() => location.hash)).includes('pg='), `frammento: ${await page.evaluate(() => location.hash)}`);
    await go(page, '#/pianifica/inverso?caso=zz&h=50');
    await page.waitForTimeout(300);
    assert((await page.evaluate(() => location.hash)) === '#/pianifica/inverso?h=50', `frammento: ${await page.evaluate(() => location.hash)}`);
    await ctx.close();
  });

  await check('piano eliminato: il collegamento di Suddivisione nella barra non lo riapre (C13)', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/pianifica/suddivisione?b=10.40.0.0&p=16&np=24');
    await page.getByRole('button', { name: 'Salva come piano' }).click();
    await page.click('dialog[open] .btn-primary');
    await page.waitForSelector('.plan-current');
    await page.click('.side-tab[href^="#/pianifica/piani"]');
    await page.getByRole('button', { name: 'Elimina' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Elimina' }).click();
    await page.waitForSelector('.empty-card');
    await page.waitForTimeout(100);
    const href = await page.getAttribute('.side-tab[href^="#/pianifica/suddivisione"]', 'href');
    assert(href === '#/pianifica/suddivisione?b=10.40.0.0&p=16&np=24', `collegamento: ${href}`);
    await ctx.close();
  });

  await check('annunci senza ripetizioni: cambio di metodo e "Trova" (C14); "Trova" fuori dal blocco toglie l\'evidenziazione (C19)', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/calcola/analisi?ip=172.16.45.200&p=20&did=1');
    await page.waitForTimeout(1000);
    const liveText = () => page.evaluate(() => document.querySelector('[aria-live="polite"].sr-only')?.textContent ?? '');
    const before = await liveText();
    await page.evaluate(() => {
      // @ts-ignore
      window.__live = 0;
      new MutationObserver(() => {
        // @ts-ignore
        window.__live++;
      }).observe(/** @type {Element} */ (document.querySelector('[aria-live="polite"].sr-only')), { childList: true, characterData: true, subtree: true });
    });
    await page.getByRole('radio', { name: 'Numero magico' }).click();
    await page.waitForTimeout(1000);
    // @ts-ignore
    assert((await page.evaluate(() => window.__live)) === 0 && (await liveText()) === before, 'il cambio di metodo ripete il risultato');
    await go(page, '#/pianifica/suddivisione?b=10.0.0.0&p=16&np=24');
    await page.getByLabel("Vai alla subnet che contiene l'IP").fill('10.0.5.9');
    await page.getByRole('button', { name: 'Trova' }).click();
    await page.waitForSelector('tr.hl');
    await page.getByLabel("Vai alla subnet che contiene l'IP").fill('192.168.1.1');
    await page.getByRole('button', { name: 'Trova' }).click();
    await page.waitForTimeout(200);
    assert((await page.locator('tr.hl, tr[aria-current]').count()) === 0, 'riga ancora evidenziata');
    assert((await page.textContent('.find-msg'))?.includes('non appartiene al blocco'), 'messaggio assente');
    await ctx.close();
  });

  await check('cap. 14: "wildcard e ACL" apre Analisi con la sezione F10 aperta; f10 segue apertura e chiusura (C9)', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/guide/subnetting/cap-14');
    await page.click('a[href*="ip=192.168.10.64"][href*="f10=1"]');
    await page.waitForSelector('.view-analisi details.snip');
    await page.waitForTimeout(300);
    assert(await page.evaluate(() => /** @type {HTMLDetailsElement} */ (document.querySelector('details.snip')).open), 'sezione F10 chiusa');
    assert((await page.textContent('details.snip'))?.includes('access-list 10 permit 192.168.10.64 0.0.0.63'), 'ACL assente');
    await page.click('details.snip > summary');
    await page.waitForTimeout(300);
    assert(!(await page.evaluate(() => location.hash)).includes('f10='), 'f10 resta dopo la chiusura');
    await ctx.close();
  });

  await check('"Apri in Analisi" senza un IP: nessun errore finché non si preme Invio (C6)', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/pianifica/inverso?h=50');
    await page.getByRole('button', { name: 'Apri in Analisi' }).click();
    await page.waitForSelector('.view-analisi');
    await page.waitForTimeout(700);
    assert((await page.locator('.view-analisi input[aria-invalid="true"]').count()) === 0, 'errore mostrato subito');
    assert(await page.isVisible('.view-analisi .examples'), 'esempi assenti');
    await page.getByLabel('Indirizzo IP').press('Enter');
    await page.waitForTimeout(200);
    assert((await page.locator('.view-analisi input[aria-invalid="true"]').count()) === 1, 'Invio senza IP non mostra l\'errore');
    await ctx.close();
  });

  await check('stampa di Suddivisione: il prefisso del blocco con la barra (C17)', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/pianifica/suddivisione?b=192.168.0.0&p=24&np=26');
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    const head = await page.textContent('.print-head');
    assert(head?.includes('Blocco: 192.168.0.0/24') && head.includes('Nuovo prefisso: /26'), `intestazione: ${head}`);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await ctx.close();
  });

  await check('Mask: con una mask non valida la riga binaria dei passaggi è bit per bit (F03)', async () => {
    const { ctx, page } = await open(browser);
    await go(page, '#/calcola/mask?m=255.255.0.255&did=1');
    await page.waitForSelector('.steps-panel .bitrow');
    const kinds = await page.evaluate(() => [...document.querySelectorAll('.steps-panel .bitrow .bits span')].map((s) => `${s.className}:${s.textContent}`).join(' '));
    assert(kinds.endsWith('b-host:00000000 b-sep:. b-net:11111111'), `segmenti: ${kinds}`);
    assert((await page.textContent('.steps-panel .bitrow .sr-only'))?.includes('bit per bit'), 'testo per i lettori di schermo');
    await ctx.close();
  });

  console.log('\nStampa (9.9)');
  await check('stampa: fondo chiaro, navigazione nascosta, intestazione, F10 aperto, PDF', async () => {
    const { ctx, page } = await open(browser, { colorScheme: 'dark' });
    await go(page, '#/calcola/analisi?ip=172.16.45.200&p=20&did=1');
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    await page.emulateMedia({ media: 'print' });
    const st = await page.evaluate(() => ({
      bg: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
      sidebar: getComputedStyle(/** @type {Element} */ (document.querySelector('.sidebar'))).display,
      head: getComputedStyle(/** @type {Element} */ (document.querySelector('.print-head'))).display,
      headText: document.querySelector('.print-head')?.textContent ?? '',
      snipOpen: /** @type {HTMLDetailsElement} */ (document.querySelector('details.snip')).open,
      steps: !!document.querySelector('.steps-panel:not([hidden])'),
    }));
    assert(hex(st.bg) === '#ffffff', `--bg in stampa: ${st.bg}`);
    assert(st.sidebar === 'none', 'barra laterale visibile in stampa');
    assert(st.head === 'block' && st.headText.includes('172.16.45.200') && st.headText.includes('Stampato il'), `intestazione: ${st.headText}`);
    assert(st.snipOpen, 'sezione F10 chiusa in stampa');
    assert(st.steps, 'passaggi assenti in stampa');
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    writeFileSync(resolve(OUT, 'stampa-analisi.pdf'), pdf);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    assert(!(await page.evaluate(() => /** @type {HTMLDetailsElement} */ (document.querySelector('details.snip')).open)), 'la sezione F10 non si richiude dopo la stampa');
    await ctx.close();
  });

  await check('movimento ridotto: nessuna transizione', async () => {
    const { ctx, page } = await open(browser, { reducedMotion: 'reduce' });
    await go(page, '#/calcola/analisi');
    const d = await page.evaluate(() => getComputedStyle(/** @type {Element} */ (document.querySelector('.to-top'))).transitionDuration);
    assert(d.split(',').every((x) => parseFloat(x) < 0.02), `transizione: ${d}`);
    await ctx.close();
  });

  await check('nessun errore JavaScript in tutte le prove', async () => {
    assert(jsErrors.length === 0, jsErrors.join('\n'));
  });

  await check('nessuna richiesta di rete in tutte le prove (file unico, funziona offline)', async () => {
    assert(netRequests.length === 0, [...new Set(netRequests)].slice(0, 10).join('\n'));
    const { ctx, page } = await open(browser, { offline: true });
    await go(page, '#/guide/subnetting/cap-9');
    await go(page, '#/calcola/analisi?ip=172.16.45.200&p=20');
    assert((await page.textContent('.kv-primary'))?.includes('172.16.32.0/20'), 'senza rete il risultato non compare');
    await ctx.close();
  });

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} prove superate. Schermate e PDF in ${OUT}`);
  writeFileSync(resolve(OUT, 'risultati.json'), JSON.stringify({ browser: exe ?? 'chrome', results }, null, 2));
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
