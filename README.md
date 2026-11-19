# Calcolatore Subnet

Calcolatore di subnet IPv4 in un **unico file HTML** autosufficiente, che funziona offline e si apre da disco o da qualunque web server. Serve per il calcolo rapido, la didattica (passaggi con il metodo binario, del numero magico o dei multipli) e il lavoro professionale.

Stato: **fase 5 completata** (impostazioni salvate, export, sessione JSON, cifratura, piani salvati). Le guide integrate arrivano con la fase 6. Specifiche e stato del progetto sono in [`docs/`](docs/).

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
src/assets/   font IBM Plex (WOFF2) con OFL.txt
tests/        test a tabella, proprietà, oracolo, architettura, moduli puri dell'interfaccia
tools/        oracle.py, size-check.js, demo.js, fonts.js, e2e.js
docs/         specifiche, specifica tecnica, stato del progetto
```

La regola delle dipendenze tra i moduli (specifica tecnica, 2.3) è verificata da `tests/architecture.test.js`: il motore non importa nulla fuori da sé e gli altri moduli lo usano solo da `src/engine/index.js`.

## Interfaccia

- **Navigazione con frammento** (`#/calcola/analisi?ip=172.16.45.200&p=20`): funziona da disco; `did=1` attiva i passaggi e `metodo=magic` sceglie il metodo per quella vista.
- **Layout**: barra in basso sotto 720 px, schede in alto fino a 979 px, barra laterale da 980 px.
- **Temi**: Automatico (segue sistema e contrasto elevato), Chiaro, Scuro, Alto contrasto, con le variabili della guida al subnetting; `tests/ui/contrast.test.js` verifica WCAG AA.
- **Font**: IBM Plex Sans, Mono e Sans Condensed, sottoinsiemi Latin1 e Pi distribuiti da IBM senza modifiche (`tools/fonts.js`), licenza OFL in `src/assets/fonts/OFL.txt`.

## Prova nel browser

`npm run e2e` fa la build e apre `dist/index.html` da disco in Chrome con `playwright-core`, senza scaricare browser: usa `CHROME_PATH` o i percorsi usuali di Chrome/Chromium. Verifica layout e aree di tocco, i quattro temi con axe-core (WCAG 2.2 AA), tastiera, frammento, cronologia, Suddivisione, stampa e PDF, assenza di errori JavaScript. Schermate e PDF in `e2e-report/`.

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

## Integrazione continua

`.github/workflows/ci.yml`: a ogni push e pull request rigenera i fixture dell'oracolo e verifica che coincidano con quelli salvati, poi esegue check, test con copertura, build e controllo del peso. Sui tag `v*` crea la Release con il file `calcolatore-subnet-vX.Y.Z.html`; dal ramo `main` pubblica su GitHub Pages (da abilitare in Settings → Pages → Source: GitHub Actions).

## Licenza

Codice: [MIT](LICENSE), © 2026 Paolo Pallavera. Font IBM Plex © IBM Corp., [SIL Open Font License 1.1](src/assets/fonts/OFL.txt), testo incluso anche nel file distribuito (Impostazioni → Informazioni).
