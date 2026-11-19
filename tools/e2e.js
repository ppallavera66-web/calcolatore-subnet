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
 * - cronologia, ricerca dell'IP in Suddivisione, stampa (intestazione, navigazione nascosta, PDF).
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

  // ------------------------------------------------------------ stampa
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
