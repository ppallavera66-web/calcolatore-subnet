# Calcolatore Subnet

Calcolatore di subnet IPv4 in un **unico file HTML** autosufficiente, che funziona offline e si apre da disco o da qualunque web server. Serve per il calcolo rapido, la didattica (passaggi con il metodo binario, del numero magico o dei multipli) e il lavoro professionale.

**Versione 1.1.0.**
- **Scarica** il file unico dalla pagina [Releases](https://github.com/ppallavera66-web/calcolatore-subnet/releases) e aprilo con un doppio clic;
- **oppure usalo online**: <https://ppallavera66-web.github.io/calcolatore-subnet/>.

Novità e verifiche sono in [`CHANGELOG.md`](CHANGELOG.md). Specifiche, stato del progetto, tabella dei requisiti e revisione indipendente sono in [`docs/`](docs/).

## Requisiti

- Node.js LTS (22 o successivo)
- Python 3 (solo per rigenerare i fixture dell'oracolo)

## Comandi

| Comando | Effetto |
|---|---|
| `npm install` | installa le dipendenze di sviluppo |
| `npm run dev` | server di sviluppo |
| `npm test` | test (Vitest); `npm test -- --watch` in modalità continua |
| `npm run coverage` | test con copertura (soglia 95% su motore e testi) |
| `npm run check` | controllo dei tipi JSDoc (`tsc`, nessuna compilazione) |
| `npm run build` | `dist/index.html`, file unico |
| `npm run size` | verifica il limite di 1 MB e stampa il peso per categoria |
| `npm run oracle` | rigenera `tests/fixtures/oracle-*.json` con `tools/oracle.py` |
| `npm run demo` | casi del cap. 15 e tabella /0–/32 da riga di comando |
| `npm run e2e` | build e prova nel browser del file aperto da disco (vedi sotto) |

Le proprietà (fast-check) usano un seme fisso; per provarne un altro: `FC_SEED=42 npm test`.

## Struttura

```
src/engine/   motore: funzioni pure, nessun DOM (F01–F07, F10 base, passaggi F12 in steps/)
src/i18n/     testi italiani indicizzati per codice: t(codice, parametri)
src/ui/       interfaccia: main, router, state, theme, format, shell, views/, components/
src/styles/   tokens (temi), fonts, base, layout, components, print
src/guides/   guide integrate: uso/ e subnetting/ (frammenti HTML), guide.css
src/assets/   font IBM Plex (WOFF2) con OFL.txt
tests/        test a tabella, proprietà, oracolo, architettura, moduli puri dell'interfaccia
tools/        oracle.py, size-check.js, demo.js, fonts.js, e2e.js, guides.js (plugin delle guide)
docs/         specifiche, specifica tecnica, stato del progetto
```

La regola delle dipendenze tra i moduli (specifica tecnica, 2.3) è verificata da `tests/architecture.test.js`: il motore non importa nulla fuori da sé e gli altri moduli lo usano solo da `src/engine/index.js`.

## Interfaccia

- **Navigazione con frammento** (`#/calcola/analisi?ip=172.16.45.200&p=20`): funziona da disco; `did=1` attiva i passaggi e `metodo=magic` sceglie il metodo per quella vista.
- **Layout**: barra in basso sotto 720 px, schede in alto fino a 979 px, barra laterale da 980 px.
- **Temi**: Automatico (segue sistema e contrasto elevato), Chiaro, Scuro, Alto contrasto, con le variabili della guida al subnetting; `tests/ui/contrast.test.js` verifica WCAG AA.
- **Guide**: `#/guide/uso/<sezione>` e `#/guide/subnetting/<ancora>` (`cap-9`, `app-a`, `gl-acl`). Il contenuto sta in `src/guides/<guida>/*.html`, frammenti letti in ordine di nome; `tools/guides.js` li inserisce nella pagina come `<template data-guide>` (riga "Guide" di `npm run size`). Ogni pulsante "?" apre la sezione con il nome della scheda; i collegamenti "Apri nel calcolatore" usano `did=1` e `metodo=`. `tests/ui/guides.test.js` verifica i collegamenti nei due sensi e confronta cheat sheet e tabelle host → prefisso con il motore.
- **Font**: IBM Plex Sans, Mono e Sans Condensed, sottoinsiemi Latin1 e Pi distribuiti da IBM senza modifiche (`tools/fonts.js`), licenza OFL in `src/assets/fonts/OFL.txt`.

## Prova nel browser

`npm run e2e` fa la build e apre `dist/index.html` da disco in Chrome con `playwright-core`, senza scaricare browser: usa `CHROME_PATH` o i percorsi usuali di Chrome/Chromium. Verifica layout e aree di tocco, i quattro temi con axe-core (WCAG 2.2 AA), tastiera, frammento, cronologia, Suddivisione, persistenza, export, sessione e busta cifrata, piani, guide (ancore con focus, glossario da tastiera, tema, stampa), stampa e PDF, focus e annunci, assenza di errori JavaScript e di richieste di rete (anche con il browser offline). Schermate e PDF in `e2e-report/`.

## Uso del motore

```js
import { analyzeText, explain } from './src/engine/index.js';
import { t } from './src/i18n/strings.it.js';

const r = analyzeText('172.16.45.200/20');
if (r.ok) {
  const steps = explain('F01', r.value, 'magic').steps;
  console.log(steps.map((s) => t(`step.${s.id}`, s.values)));
} else {
  console.log(t(r.error.code, r.error.params));
}
```

Ogni funzione pubblica restituisce `{ ok: true, value, warnings }` oppure `{ ok: false, error: { code, field, params } }` e non lancia eccezioni per input dell'utente.

## Integrazione continua e rilascio

`.github/workflows/ci.yml`:
- **a ogni push e pull request**:
  - job `test`: rigenera i fixture dell'oracolo e verifica che coincidano con quelli salvati, poi check, test con copertura, build (con `SOURCE_DATE_EPOCH` = data dell'ultimo commit) e controllo del peso;
  - job `e2e`: `npm run e2e` con il Chrome del runner (`CHROME_PATH`); schermate, PDF e `risultati.json` come artefatto `e2e-report`.
- **dal ramo `main`**, con i due job verdi: pubblicazione su GitHub Pages.
- **sui tag `v*`**:
  - controlla che il tag coincida con la versione di `package.json` e che esista `docs/note-rilascio/<tag>.md`;
  - poi crea la Release con `calcolatore-subnet-vX.Y.Z.html`, la sua impronta `.sha256` e la nota di rilascio.

**Per un nuovo rilascio**:
1. aggiornare la versione con `npm version X.Y.Z --no-git-tag-version`;
2. aggiornare `CHANGELOG.md` e scrivere `docs/note-rilascio/vX.Y.Z.md`;
3. fare il commit, poi `git tag -a vX.Y.Z -m "Calcolatore Subnet vX.Y.Z"` e `git push origin main vX.Y.Z`.

**GitHub Pages** va abilitato una volta: Settings → Pages → Source: **GitHub Actions**.

## Licenza

Codice: [MIT](LICENSE), © 2026 Paolo Pallavera. Font IBM Plex © IBM Corp., [SIL Open Font License 1.1](src/assets/fonts/OFL.txt), testo incluso anche nel file distribuito (Impostazioni → Informazioni).
