# Verifica dei requisiti della v1

Versione 1.1.1 · fase 9 · 22 novembre 2026 (prima stesura: 1.0.0, fase 7; requisiti invariati dalla 1.1.0, cambiano solo testi e guide)

Requisiti presi da `01_specifiche_progetto.md` (sezioni 2–6) e da `02_specifica_tecnica_v1.md` (sezioni 0 e 9). Per ogni requisito: dove è fatto, come è verificato, esito.

**Verifiche:**
- **T** = test di Vitest (`npm test`, file in `tests/`);
- **O** = oracolo Python (`tools/oracle.py`, 82.575 casi dalla v1.1; 74.535 nella v1.0);
- **E** = prova nel browser (`npm run e2e`, prove in `tools/e2e.js`, Chrome da `file://`);
- **A** = axe-core WCAG 2.2 AA dentro le prove E;
- **R** = revisione indipendente della fase 7 (`docs/revisione-fase7.md`), con le segnalazioni chiuse nella fase 8;
- **M** = prova manuale.

**Esito:**
- ✓ verificato;
- ◐ verificato solo in parte (per esempio solo in Chrome desktop), con il resto indicato nella colonna;
- — fuori dalla v1 per decisione.

## A. Specifiche di progetto

### 2 · Piattaforma

| N. | Requisito | Dove | Verifica | Esito |
|---|---|---|---|---|
| 2.1 | Un unico file HTML autosufficiente | `vite.config.js` (vite-plugin-singlefile), `tools/guides.js` | `npm run size` (file unico, peso per categoria); E "nessuna richiesta di rete in tutte le prove" | ✓ |
| 2.2 | Funziona offline, si apre da disco o da un web server | `base: './'`, font e guide incorporati | E: tutte le prove da `file://`; prova con il browser offline; T `guides.test.js` (niente risorse esterne nelle guide) | ✓ da disco in Chrome · ◐ HTTPS al primo giro di Pages |
| 2.3 | Sorgenti modulari (ES modules) uniti dalla build | `src/**`; regola delle dipendenze 2.3 | T `architecture.test.js` | ✓ |
| 2.4 | Responsive e mobile first: navigazione in basso su schermi piccoli (Calcola · Pianifica · Guide · Impostazioni) | `src/ui/shell.js`, `src/styles/layout.css` | E "layout 390/800/1280 px", aree di tocco ≥ 44 px a 390 px | ✓ |
| 2.5 | I campi IP aprono la tastiera numerica | `components/field.js` (`inputmode="decimal"`), virgola accettata (`engine/ipv4.js`) | T `ipv4.test.js` (virgola); E (attributo) | ◐ tastiera iOS da provare su dispositivo |
| 2.6 | Facoltativo: manifest PWA se ospitata in HTTPS | — | `docs/decisione-pwa.md` | — non nella v1 |

### 3 · Impostazioni utente

| N. | Requisito | Dove | Verifica | Esito |
|---|---|---|---|---|
| 3.1 | Modalità didattica, Export, Memorizza i dati: interruttori indipendenti, spenti per default | `ui/state.js` (`initialState`), `views/impostazioni.js` | T `state.test.js`; E "interruttori da tastiera" | ✓ |
| 3.2 | Memorizza i dati salva piani, cronologia e impostazioni nel browser | `storage/storage.js`, `ui/persistence.js` | T `storage.test.js`, `persistence.test.js` (anche più schede con il salvataggio spento e dati di una versione successiva, R: B1, B2); E "Memorizza i dati", "più schede", "dati illeggibili", "localStorage rifiutato" | ✓ Chrome · ◐ altri browser (`verifiche-browser-fase5.md`) |
| 3.3 | Cancella tutti i dati, con conferma, sempre disponibile | `views/impostazioni.js` | E "conferma di Cancella tutti i dati" | ✓ |
| 3.4 | Il salvataggio vale per quel browser; per spostare i dati si usa la sessione JSON | nota accanto all'interruttore; guida all'uso | E "esporta in chiaro → importa in un altro browser" | ✓ |
| 3.5 | Temi Automatico, Chiaro, Scuro, Alto contrasto | `styles/tokens.css`, `ui/theme.js` | T `contrast.test.js`; E "tema …" e "tema Automatico con …"; A in ogni tema | ✓ |

### 4 · Export e import

| N. | Requisito | Dove | Verifica | Esito |
|---|---|---|---|---|
| 4.1 | Copia negli appunti | `export/clipboard.js`, `export/text.js` | T `export.test.js` (appunti, DOM simulato); E "copia di un valore", barra di export | ✓ Chrome · ◐ altri browser |
| 4.2 | CSV, JSON, Markdown, testo | `export/csv.js`, `json.js`, `markdown.js`, `text.js`, `rows.js` | T `export.test.js` (CSV con `;`, CRLF, BOM, protezione dalle formule anche dopo spazi, R: I2); E "barra di export" | ✓ · ◐ CSV in Excel da provare |
| 4.3 | Stampa/PDF tramite il browser | `export/print.js`, `styles/print.css` | E "stampa" (PDF), "stampa della guida" | ✓ |
| 4.4 | Snippet di configurazione (ACL e OSPF con wildcard) | `engine/snippets.js`, sezione F10 di Analisi | T `snippets.test.js`; E barra di export (Snippet) | ✓ |
| 4.5 | Sessione JSON con `format`, versione e data; validazione prima di caricare | `session/schema.js`, `validate.js`, `session.js` | T `session.test.js` (corpus di 23 file, una regola per file, andata e ritorno, prototipo); E sessione e import | ✓ |
| 4.6 | Cifratura facoltativa, spenta per default, mai ricordata | `components/session-dialogs.js` | E "busta cifrata" (casella di nuovo spenta) | ✓ |
| 4.7 | All'import il file cifrato si riconosce da solo e la passphrase si chiede solo in quel caso | `session/session.js`, `session-dialogs.js` | T `session.test.js`; E busta cifrata | ✓ |
| 4.8 | AES-256-GCM, IV di 12 byte, PBKDF2-SHA-256, sale di 16 byte, 600.000 iterazioni salvate nel file | `session/envelope.js` | T `envelope.test.js` (formato, AAD provata in modo indipendente, R: I5, alterazioni della 10.4) | ✓ |
| 4.9 | Passphrase errata o file manomesso: import fermato con messaggio chiaro | `session/envelope.js` | T `envelope.test.js`; E passphrase errata e file manomesso | ✓ |
| 4.10 | Passphrase mai salvata; minimo 12 caratteri; indicatore di robustezza; avviso "non recuperabile" | `session-dialogs.js`, `envelope.js` (robustezza) | T `envelope.test.js` (robustezza); E busta cifrata | ✓ |
| 4.11 | Senza `crypto.subtle` la funzione è disattivata con la spiegazione | `session/envelope.js` (`cryptoAvailable`) | T `envelope.test.js`; E "Web Crypto assente" (simulato) | ✓ |
| 4.12 | XLSX | — | — | — v2 |

### 5 · Funzioni della v1

| N. | Funzione | Dove | Verifica | Esito |
|---|---|---|---|---|
| F01 | Analisi subnet | `engine/analyze.js`, `views/analisi.js` | T `analyze.test.js` (casi A–D della 10.2, proprietà P1–P6, P13); O; E | ✓ |
| F02 | Conversioni decimale/binario/esadecimale, CIDR/mask | `engine/convert.js`, `views/conversioni.js` | T `convert.test.js`, `prefix.test.js` (P7, P8); O; E "Conversioni" | ✓ |
| F03 | Validazione della mask con motivazione | `engine/validate-mask.js`, `views/mask.js` | T `validate-mask.test.js` (33 mask, 256 valori); O | ✓ |
| F04 | Tipo di indirizzo | `engine/classify.js`, `special-blocks.js`, Analisi | T `classify.test.js` (caso G, con 192.0.0.0/24 e 198.18.0.0/15 dalla v1.1); O (blocchi speciali, ambito e blocco principale) | ✓ |
| F05 | Calcolo inverso | `engine/inverse.js`, `views/inverso.js` | T `inverse.test.js` (caso H, P9); O; E "Calcolo inverso" | ✓ |
| F06 | Suddivisione ed elenco delle subnet | `engine/subdivide.js`, `views/suddivisione.js` | T `subdivide.test.js` (caso I, P10); O; E "vai alla subnet che contiene l'IP", intervalli di export | ✓ |
| F07 | Stessa subnet, anche con prefissi diversi | `engine/same-subnet.js`, `views/stessa.js` | T `same-subnet.test.js` (caso J, P11); O | ✓ |
| F10 | Wildcard e snippet (base) | `engine/snippets.js` | T `snippets.test.js` (caso K) | ✓ |
| F12 | Modalità didattica con scelta del metodo | `engine/steps/**`, `components/steps-panel.js` | T `steps.test.js` (P12: passaggi = risultato per ogni metodo); E controllo segmentato del metodo, "Apri nel calcolatore" | ✓ |
| F08, F09, F13 | VLSM, summarization, allenamento | — | — | — v2 |
| F11 | IPv6 di base | — | — | — v3 |

### 6 · Guide integrate

| N. | Requisito | Dove | Verifica | Esito |
|---|---|---|---|---|
| 6.1 | Guida all'uso breve, orientata ai compiti | `src/guides/uso/*.html` | R; T `guides.test.js` | ✓ |
| 6.2 | Ogni funzione ha un pulsante "?" che apre il paragrafo pertinente | viste di Calcola, Pianifica, Impostazioni; `ui/guide-anchors.js` | T "ogni pulsante ? ha la sua sezione"; E "?" con focus sul titolo | ✓ |
| 6.3 | Indice laterale, in alto su mobile | `views/guide.js` | E "guida a 390 px: indice in alto richiudibile" | ✓ |
| 6.4 | Selettore del tema nelle guide | `views/guide.js` | E "tema dall'indice salvato e ricaricato" | ✓ |
| 6.5 | Glossario con termini evidenziati e popover con collegamenti interni | `ui/guide-glossary.js` | T `guide-glossary.test.js`, `guides.test.js` (32 voci); E glossario da tastiera e mouse; A con il riquadro aperto | ✓ |
| 6.6 | Pulsante "torna su" | `ui/shell.js` | E (movimento ridotto sul pulsante) | ✓ |
| 6.7 | Guida al subnetting: widget sostituiti da "Apri nel calcolatore" che precompilano la funzione | `src/guides/subnetting/*.html` | T "nessun widget", "Apri nel calcolatore: input validi, did=1 e metodo"; E "Apri nel calcolatore" | ✓ |
| 6.8 | Ogni passaggio didattico rimanda al capitolo da cui viene | `engine/steps/**` (`chapter`), `steps-panel.js` | T "ogni metodo rimanda a un capitolo esistente", titoli `ui.cap.*` = guida; E "Capitolo N" | ✓ |
| 6.9 | Convenzione: con prefisso multiplo di 8 l'ottetto interessante è l'ultimo a 255 e M = 1 | `engine/prefix.js` | T caso C della 10.2, cheat sheet confrontata con il motore; O | ✓ |

## B. Specifica tecnica

### 0 · Ambito della v1

| N. | Requisito | Verifica | Esito |
|---|---|---|---|
| 0.1 | Nella v1: F01–F07, F10 base, F12 | sezione 5 qui sopra | ✓ |
| 0.2 | Tre interruttori e quattro temi | 3.1, 3.5 | ✓ |
| 0.3 | Persistenza facoltativa | 3.2 | ✓ |
| 0.4 | Export nei formati v1 | 4.1–4.4 | ✓ |
| 0.5 | Sessione JSON con cifratura facoltativa | 4.5–4.11 | ✓ |
| 0.6 | Integrazione delle due guide | sezione 6 qui sopra | ✓ |
| 0.7 | Fuori dalla v1: F08, F09, F13, XLSX, snippet avanzati, F11. Nell'app compaiono solo come rimandi (per esempio il VLSM suggerito in F05 caso C, F13 nella guida) | R | ✓ |
| 0.8 | Manifest PWA valutato in fase 7 | `docs/decisione-pwa.md` | ✓ (non nella v1) |

### 9 · Interfaccia

| N. | Requisito | Dove | Verifica | Esito |
|---|---|---|---|---|
| 9.1 | Mappa delle schermate: Calcola (4 schede), Pianifica (3), Guide (2), Impostazioni; F04 e F10 in Analisi; cronologia; piani salvati | `ui/views/index.js`, viste | T `router.test.js` ("ogni vista dichiarata ha una sezione"); E schede, cronologia, piani | ✓ |
| 9.2 | Layout: barra in basso < 720 px con aree sicure, schede in alto 720–979, barra laterale ≥ 980; "torna su" | `styles/layout.css`, `ui/shell.js` | E layout a 390, 800, 1280 px senza scorrimento orizzontale | ✓ |
| 9.3 | Navigazione con frammento: rotte, `did=1`, `metodo=`, parametri validati dal motore, sostituzione mentre si scrive, nuova voce al cambio di scheda, indirizzo sconosciuto → Analisi | `ui/router.js` | T `router.test.js`; E "schede, tasto indietro", "collegamento con input non validi", piano con parametri diversi (R: I3, C5) | ✓ (C12 chiusa nella v1.1: `pg` fuori intervallo e `caso` sconosciuto riscritti, E "frammento normalizzato") |
| 9.4 | Componenti: campo IP (virgola, incolla `IP/n` e `IP mask`, errore dopo 400 ms), prefisso o mask con cursore e − / +, calcolo dal vivo, scheda risultato con copia, pannello dei passaggi, barra di export (pannello dal basso su telefono), "?", interruttori `role="switch"`, `<dialog>`, `aria-live`, esempi cliccabili | `ui/components/**` | E "calcolo dal vivo", "incolla IP mask", "copia", "telefono: Esporta", "interruttori"; A | ✓ |
| 9.5 | Impostazioni: didattica, metodo, export, memorizza, tema; Dati sempre visibili; Informazioni con versione, data di build, licenze e repository | `views/impostazioni.js` | E Impostazioni; T `strings-ui.test.js` | ✓ |
| 9.6 | Temi con le variabili della guida, `data-theme`, stampa su fondo chiaro, tema salvato solo con Memorizza i dati e condiviso con le guide | `styles/tokens.css`, `ui/theme.js` | T `contrast.test.js`; E temi, stampa, "tema dall'indice" | ✓ |
| 9.7 | WCAG 2.2 AA: contrasto nei quattro temi, tastiera, focus visibile, etichette, risultati annunciati, tocco ≥ 44 px, movimento ridotto, niente informazioni affidate al solo colore | `styles/**`, componenti | T `contrast.test.js`; A su tutte le schermate in ogni tema e a 390 px; E tastiera, movimento ridotto, "con Tab il controllo non finisce sotto le barre", "focus conservato", annunci di Conversioni; R (C1–C4, C10 corretti) | ✓ in Chrome · ◐ lettori di schermo reali non provati |
| 9.8 | Errori sotto il campo con il testo del codice; avvisi con rimando al capitolo; /31 e /32 con broadcast "nessuno"; paginazione di F06 e "Vai alla subnet che contiene l'IP" | viste, `i18n/strings.it.js` | T `i18n.test.js` (ogni codice ha il suo testo); E | ✓ |
| 9.9 | Stampa: navigazione e pulsanti nascosti, input e data in testa, passaggi aperti, colori chiari | `styles/print.css`, `export/print.js` | E "stampa" con PDF | ✓ |
| 9.10 | Flussi principali (Analisi su telefono e desktop, export e import della sessione) | viste e dialog | E (flussi completi) | ✓ |

## C. Cosa resta fuori da questa verifica

- **Browser diversi da Chrome e telefoni reali**: Edge, Firefox, Safari, iOS e Android non sono stati provati (`docs/verifiche-browser-fase5.md` da compilare). La guida all'uso usa formulazioni prudenti nella sezione "Browser e apertura da disco".
- **GitHub Actions e Pages**: il workflow è stato controllato con actionlint ed eseguito in locale passo per passo; il primo giro reale avviene con il push.
- **Lettori di schermo reali** (NVDA, VoiceOver, TalkBack): non provati; la struttura accessibile è verificata con axe-core e dalla revisione.
