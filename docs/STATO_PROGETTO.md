# Stato del progetto: Calcolatore Subnet

Ultimo aggiornamento: 21 novembre 2026 (fase 8, rilascio v1.1.0 pronto: tag da pubblicare)

## Fase corrente
**Fase 9 · Note di Paolo su applicazione e guide (v1.2)**
Modello consigliato: **Opus 5.5** · Impegno: **Medio**
Contenuto: le note di Paolo su applicazione e guide (Errore, Chiarezza, Mancanza, Taglio) in un'unica lista; revisione dei contenuti della guida al subnetting (dalla v0.4 "versione di studio" alla v1.0) e della guida all'uso; rilettura dei testi dei passaggi e dell'interfaccia insieme alle guide; eventuali prove nei browser; rilascio v1.2.0.

**Prima di iniziare (azione per Paolo):**
- pubblicare il tag `v1.1.0` (comandi nella sezione Repository) e controllare la Release;
- usare l'app (Release v1.1.0 o GitHub Pages) e leggere le due guide, annotando le note con le quattro etichette;
- se possibile, compilare la tabella di `docs/verifiche-browser-fase5.md` (Edge, Firefox, Safari, telefoni).

## Repository
- **GitHub**: <https://github.com/ppallavera66-web/calcolatore-subnet>, ramo `main`, con tutta la storia delle fasi 3–7 (un commit per passo), unita al commit iniziale creato da GitHub.
- **Tag `v1.0.0`**: pubblicato da Paolo il 21 novembre 2026 (il proxy della sessione rifiuta il push dei tag, HTTP 403). Il workflow ha creato la **Release v1.0.0** con `calcolatore-subnet-v1.0.0.html` (635.192 byte), la sua impronta `.sha256` e la nota `docs/note-rilascio/v1.0.0.md`: <https://github.com/ppallavera66-web/calcolatore-subnet/releases/tag/v1.0.0>. L'impronta coincide con quella della build locale (`03708850…8f37`).
- **Visibilità**: repository **pubblico** (decisione D4), reso tale da Paolo il 21 novembre 2026.
- **GitHub Pages**: attivo con sorgente "GitHub Actions", pubblicato a ogni push su `main`: <https://ppallavera66-web.github.io/calcolatore-subnet/>.
- **Tag `v1.1.0`**: preparato nella fase 8 sull'ultimo commit di `main` (aggiornamento di questo file), **da pubblicare da Paolo**:
  ```
  git pull
  git tag -a v1.1.0 -m "Calcolatore Subnet v1.1.0"
  git push origin v1.1.0
  ```
  Il workflow controlla che il tag coincida con la versione di `package.json` (1.1.0) e che esista `docs/note-rilascio/v1.1.0.md`, poi crea la Release con `calcolatore-subnet-v1.1.0.html` e la sua impronta `.sha256`.
- **Nei rilasci successivi** il tag va pubblicato dal computer di Paolo, finché il proxy della sessione lo rifiuta: `git pull`, poi `git tag -a vX.Y.Z -m "Calcolatore Subnet vX.Y.Z"` e `git push origin vX.Y.Z` (in PowerShell, nella cartella del clone).
- **Autore dei commit**: fino alla fase 7 `Paolo Pallavera <paolo.pallavera@users.noreply.github.com>`; dalla fase 8 l'indirizzo noreply dell'account, `Paolo Pallavera <358547414+ppallavera66-web@users.noreply.github.com>`, che collega i commit al profilo GitHub.

## Completato
- **Fase 0 · Impostazione** (conversazione iniziale):
  - lezione introduttiva sul metodo classico;
  - guida al subnetting v0.1 (`guida-subnetting.html`): 19 capitoli + 3 appendici, calcoli verificati con script;
  - decisioni su piattaforma, modalità, persistenza, export, cifratura, temi e guide (vedi `01_specifiche_progetto.md`).
- **Guida v0.2** (18 novembre 2026):
  - cap. 11 rinominato "Che mask mi serve? Il calcolo inverso", con tabella host richiesti → prefisso → mask (da /30 a /16) ed esempio completo;
  - glossario (appendice B) a 32 voci con colonna dei capitoli; accesso rapido a Glossario e Cheat sheet in cima all'indice;
  - termini del glossario evidenziati nel testo con popover (mouse, tocco, tastiera), definizioni lette dalla tabella del glossario;
  - pulsante "torna su".
- **Fase 1 · Revisione della guida → v0.3** (18 novembre 2026):
  - **temi** Automatico, Chiaro, Scuro, Alto contrasto, con selettore nell'indice laterale e in quello mobile; Automatico segue il sistema, compresa la richiesta di contrasto elevato; colori scritti a mano sostituiti da variabili; la stampa è sempre su fondo chiaro. Il tema **non viene memorizzato** (coerente con "Memorizza i dati" spento per default; in fase 6 la guida prenderà il tema dall'app);
  - **stampa**: le soluzioni degli esercizi vengono aperte prima della stampa e richiuse dopo, più la regola CSS per i browser recenti; in stampa compare l'etichetta "Soluzione" al posto di "Mostra la soluzione";
  - **allenamento** limitato ai blocchi privati RFC 1918, compatibili con il prefisso (10.0.0.0/8 sempre, 172.16.0.0/12 da /12, 192.168.0.0/16 da /16);
  - **eccezioni /31 e /32** segnalate nel cap. 13 (riquadro dedicato), nel passo 6 e nelle formule del cap. 7 e nella procedura della cheat sheet;
  - **colonna M della cheat sheet**: al posto del trattino "1 · 1°", "1 · 2°", "1 · 3°" per /8, /16, /24, con la convenzione spiegata nel cap. 6, nella nota della cheat sheet e nel glossario (ottetto interessante); formato uniforme "128 · 2°";
  - **tabella host → prefisso** richiamata nella cheat sheet in versione compatta, con collegamento al cap. 11;
  - **cap. 12**: corretto l'errore "200 mod 16 = 8 → 8° indirizzo" (è il 9°); decimali delle divisioni uniformati;
  - **cap. 15**: precisato che con mask diverse il gateway .1 può trovarsi fuori dalla subnet di B, con comportamento che dipende dal sistema operativo; allineata la voce corrispondente del cap. 18;
  - **appendice C**: "Decisioni da prendere" sostituita da "Decisioni prese"; aggiunta la colonna del rilascio (v1, v2, v3);
  - ritocchi: legenda "al passaggio del mouse o al tocco", versione v0.3 nell'intestazione e nel piè di pagina;
  - **verifiche**: script su tutte le righe della cheat sheet e sulle due tabelle host → prefisso (0 errori); 1.600 esercizi generati, tutti in blocchi privati; controllo nel browser dei quattro temi, del tema Automatico con preferenze di sistema chiara, scura e contrasto elevato, della stampa, della vista mobile; nessun errore JavaScript.
- **Fase 2 · Specifica tecnica v1** (18 novembre 2026):
  - prodotto `02_specifica_tecnica_v1.md` (versione 1.0): architettura e moduli ES con regola delle dipendenze; interfaccia del motore per F01–F07, F10 base e F12 con input, output, codici di errore e avviso, esempi; tabella di riferimento /0–/32; modello dei passaggi didattici e metodi per funzione; formati di export; schema JSON di sessione con regole di validazione e flusso di import; busta cifrata; persistenza; schermate, layout, navigazione, componenti, temi, accessibilità e schizzi dei flussi; strategia di test con casi, proprietà e criteri di uscita; rischi; consegne della fase 3;
  - **verifiche**: tutti i valori numerici della specifica (tabella /0–/32, esempi della guida, casi limite, F04–F07) calcolati con uno script indipendente basato su `ipaddress` di Python.
- **Fase 3 · Motore di calcolo e test automatici** (19 novembre 2026):
  - **scaffold** secondo la 2.1: `package.json` con versioni bloccate (Vite 8.3, vite-plugin-singlefile 2.3, Vitest 5.1 con coverage-v8, fast-check 4.10, TypeScript 5.9 solo per il controllo), `vite.config.js`, `jsconfig.json` con checkJs, workflow `.github/workflows/ci.yml` (test, Release sui tag `v*`, Pages da `main`), licenza MIT a nome di Paolo Pallavera, README, copia di specifiche, specifica tecnica e stato in `docs/`;
  - **motore** in `src/engine/`: F01 analisi, F02 conversioni, F03 validazione mask, F04 tipo di indirizzo, F05 calcolo inverso (casi A, B, C), F06 suddivisione a pagine con `subnetAt`, `indexOf`, `iterateSubnets`, F07 stessa subnet con prefissi diversi e gateway, F10 base wildcard e snippet Cisco; per ogni funzione la versione su valori e quella su testo (`…Text`); esiti `ok`/`fail` con codici stabili, nessuna eccezione per input dell'utente;
  - **passaggi didattici F12** in `src/engine/steps/` come dati strutturati, per tutti i metodi della 4.2: binario (6 passi del cap. 7), numero magico (5 domande, con `boundary-convention` e `zero-prefix`), multipli (divisione e resto), regole per F04, F05, F10, pesi e divisioni per F02; i passaggi ricalcolano i valori con l'aritmetica del proprio metodo e un test verifica che coincidano con il risultato;
  - **testi italiani** in `src/i18n/strings.it.js` con `t(codice, parametri)`: tutti gli errori, gli avvisi, i motivi, i blocchi speciali, le etichette e i modelli di tutti i passaggi;
  - **test**: 285 test in 15 file; casi a tabella della 10.2 (A–K, compresi /0, /31, /32, limiti dello spazio e convenzione dell'ottetto interessante), proprietà P1–P13 con 1.000 esecuzioni ciascuna a seme fisso, test di completezza dei testi (nessun codice senza testo, nessun testo orfano), test di architettura della 2.3;
  - **oracolo** `tools/oracle.py` (modulo `ipaddress`): 2.030 IP × 33 prefissi più conversioni, mask, calcolo inverso, suddivisioni, stessa subnet e blocchi speciali, in `tests/fixtures/oracle-f01.json` e `oracle-misc.json` (circa 3,5 MB, uscita deterministica); in CI i fixture vengono rigenerati e confrontati con quelli salvati;
  - **guscio minimo** (`index.html`, `src/ui/main.js`): analisi F01 con i passaggi e la tabella /0–/32, pulsante "torna su"; `tools/size-check.js` con peso per categoria; `tools/demo.js` (`npm run demo`) con i casi del cap. 15 e la tabella /0–/32;
  - **verifiche**:
    - 285 test verdi, anche con cinque semi diversi per le proprietà;
    - copertura: motore 100% istruzioni e 99,8% rami; motore più testi 100% istruzioni e 99,4% rami (soglia 95%);
    - oracolo: 74.535 casi, **0 differenze**; due mutazioni introdotte apposta nel motore (/31 trattato come /30, classe E ristretta) vengono rilevate;
    - test di architettura verde, e capace di rilevare due violazioni introdotte apposta (`Date` nel motore, import di `i18n` dal motore);
    - `npm run check` senza errori;
    - `dist/index.html` di 42.874 byte (4,1% del limite di 1 MB), senza riferimenti esterni, aperto da disco in Chrome senza errori JavaScript (risultato, passaggi, errori, avvisi, tabella, vista mobile);
    - tutti i passi del workflow eseguiti su un clone pulito con `npm ci`.
- **Fase 4 · Interfaccia, navigazione mobile, temi** (19 novembre 2026):
  - **temi** in `src/styles/tokens.css`: le variabili della guida v0.3 (Automatico con `prefers-color-scheme` e `prefers-contrast`, Chiaro, Scuro, Alto contrasto) più `--line-strong` per i bordi dei controlli (≥ 3:1); test di contrasto su tutte le coppie testo/sfondo e controllo/sfondo e sull'allineamento dei blocchi di Automatico;
  - **font IBM Plex** incorporati (D3): Sans 400/600, Mono 400/600, Sans Condensed 600/700, sottoinsiemi Latin1 e Pi distribuiti da IBM **senza modifiche** (`tools/fonts.js`, `src/styles/fonts.css`), licenza OFL in `src/assets/fonts/OFL.txt` e nella sezione Informazioni;
  - **moduli puri** con test: `format.js` (numeri, indirizzi, intervalli abbreviati, righe binarie rete/host, tipo di indirizzo, pagine, cronologia), `state.js` (archivio con sottoscrizioni, impostazioni in memoria, metodo per funzione, `did=1`, cronologia da 200 voci, id casuali), `router.js` (frammento della 9.3, normalizzazione, sostituzione mentre si scrive, nuova voce al cambio di scheda, ripiego su `location.replace` da disco), `history-map.js` (voci di cronologia nel formato 6.2 e riapertura);
  - **guscio e layout 9.2**: barra in basso sotto 720 px con aree sicure, schede in alto fino a 979 px, barra laterale di 240 px da 980 px; sottoschede come controllo segmentato scorrevole; "Salta al contenuto", titolo e focus a ogni cambio di vista, pulsante "torna su";
  - **componenti 9.4**: campo IP (virgola, divisione di `IP/n` e `IP mask`, la barra sposta nel campo del prefisso), prefisso o mask con cursore e − / +, calcolo dal vivo (150 ms, Invio forza, errori dopo 400 ms o all'uscita), scheda risultato con copia, pannello dei passaggi persistente con righe binarie colorate ed etichettate e collegamento "Capitolo N · titolo", interruttori `role="switch"`, controlli segmentati, `<dialog>`, esempi cliccabili, pulsante "?", barra di export predisposta (stampa attiva, formati in fase 5; su telefono pannello dal basso "Esporta");
  - **schermate**: Calcola (Analisi con F01, tipo di indirizzo F04 e sezione richiudibile F10 base con opzioni e passaggi; Conversioni con numero, indirizzo, prefisso e mask; Mask con ottetti in binario, motivo e suggerimenti cliccabili; Stessa subnet con verdetto, punti di vista di A e B e gateway); Pianifica (Calcolo inverso nei casi A, B, C; Suddivisione a pagine da 256 righe con "Vai alla subnet che contiene l'IP"; Piani salvati segnaposto); Guide (segnaposto con le rotte dei capitoli); Impostazioni (didattica, metodo predefinito, export, tema, dati, informazioni);
  - **cronologia della visita** in memoria con pannello e riapertura (registrata dopo 2 s di calma o subito con Invio);
  - **stampa 9.9** (`print.css`) e **accessibilità 9.7**: aree di tocco ≥ 44 px su telefono e schermi touch, focus visibile, errori collegati con `aria-describedby` e `aria-invalid`, risultati annunciati, nessuna informazione affidata al solo colore, movimento ridotto;
  - **prova nel browser** `npm run e2e` (playwright-core e axe-core, Chrome già installato, nessun download): 27 prove;
  - **verifiche** (su un clone pulito con `npm ci`):
    - 677 test in 22 file; copertura di motore e testi 100% istruzioni, 99,2% rami, 100% funzioni;
    - oracolo: fixture rigenerati identici; `npm run check` senza errori; test di architettura verde;
    - `dist/index.html` di 412.781 byte (39,4% del limite di 1 MB): JavaScript 123 KB, CSS 34 KB, font 245 KB;
    - e2e 27/27 in Chrome 153.0.8010.12 (headless, Linux) da `file://`: layout a 390, 800 e 1280 px senza scorrimento orizzontale; aree di tocco ≥ 44 px a 390 px; quattro temi e Automatico con sistema chiaro, scuro e contrasto elevato; **axe-core WCAG 2.2 AA senza violazioni** su otto schermate in ogni tema e a 390 px; tastiera (salta al contenuto, campi, Invio, frecce nel metodo con focus conservato, interruttori, Esc nei dialog con ritorno del focus); frammento e tasto indietro; collegamenti con input non validi; incolla di `IP mask`; cronologia; Suddivisione con ricerca dell'IP fino all'ultima pagina di un /8 → /30; stampa con PDF; nessun errore JavaScript.

- **Fase 5 · Impostazioni, persistenza, export/import, cifratura** (19 novembre 2026):
  - **persistenza** (8): adattatore `src/storage/storage.js` (asincrono, `try/catch` ovunque, riconosce `QuotaExceededError` nelle varianti dei browser, solo chiavi `subnetcalc:`) e `src/ui/persistence.js`. "Memorizza i dati" acceso salva subito e poi dopo 300 ms, scrivendo solo le chiavi cambiate; lo spegnimento chiede conferma e cancella le chiavi, i dati della visita restano. All'avvio i dati si leggono prima del primo disegno (il tema non lampeggia) e passano per la validazione e le migrazioni dell'import; i dati illeggibili o di una versione successiva vengono ignorati, con l'avviso e il pulsante "Cancella i dati salvati". Con lo spazio esaurito la cronologia scende a 100 voci, poi c'è l'avviso. Con più schede l'evento `storage` ricarica lo stato; lo spegnimento in un'altra scheda ferma il salvataggio. "Cancella tutti i dati" toglie anche chiavi e piani e spegne l'interruttore. Se il browser rifiuta lo storage, l'interruttore è disattivato con la spiegazione;
  - **export v1** (5): `src/export/` con `rows.js` (toRows per F01–F07 e F10, colonne e intervalli di F06), `csv.js` (`;`, CRLF, BOM, protezione dalle formule sui testi dell'utente), `json.js` (`subnetcalc-result`, indirizzi in forma puntata, passaggi strutturati), `markdown.js`, `text.js` (colonne allineate, usato anche per la copia), `steps.js` ("Includi i passaggi", righe binarie rete | host), `filename.js`, `download.js`, `clipboard.js` (spostato da `ui/`), `print.js`. Barra collegata in tutte le viste di calcolo e nel pannello dal basso su telefono; Snippet in Analisi. Per Suddivisione si sceglie tra pagina corrente, tutte (fino a 65.536 righe) e intervallo di indici, obbligatorio oltre quel limite;
  - **sessione JSON** (6): `src/session/` con `schema.js`, `inputs.js` (input della 6.2 validati dal motore e riportati in forma canonica), `validate.js` (regole 5–10), `migrate.js` (catena di migrazioni, oggi vuota, meccanismo provato), `session.js` (costruzione, regole 1–4, Sostituisci e Unisci, riepilogo). In Impostazioni → Dati: esporta e importa, anteprima, Sostituisci o Unisci, casella "Applica anche le impostazioni del file" spenta, riepilogo finale;
  - **busta cifrata** (7): `src/session/envelope.js` con AES-256-GCM, PBKDF2-SHA-256 a 600.000 iterazioni, sale di 16 byte e IV di 12 nuovi a ogni export, AAD come nella 7.2. Controllo dell'intestazione prima della passphrase (iterazioni 600.000–10.000.000, lunghezze, base64 canonico), nessuna busta annidata. Finestra con passphrase e conferma (minimo 12 caratteri Unicode), indicatore a quattro livelli, avviso, avanzamento; casella mai ricordata, campi svuotati alla fine. Se `crypto.subtle` manca, la funzione è disattivata con la spiegazione;
  - **piani salvati** (9.1): "Salva come piano" da Suddivisione (nome proposto, note), piano aperto con `piano=<id>` nel frammento, colonna Etichetta modificabile e salvata mentre si scrive, etichette nell'export. Cambiare blocco o prefissi chiude il piano. Vista Piani salvati con apertura, nome e note, eliminazione con conferma;
  - **Impostazioni → Informazioni**: riga "Compatibilità di questo browser" (pagina aperta da, contesto sicuro, Web Crypto, localStorage, appunti), utile per le prove nei browser;
  - **correzione della fase 4**: al passaggio del mouse il pulsante primario prendeva il colore del testo normale (regola più specifica di `.btn:hover`), con contrasto 3,4:1 nel tema chiaro; trovato da axe nella nuova prova;
  - **verifiche** (su un clone pulito con `npm ci`):
    - 988 test in 27 file (erano 677), anche con tre semi diversi per le proprietà; nuovi: storage (8), sessione con corpus di 23 file uno per regola della 6.3 più andata e ritorno, Unisci, limiti, migrazioni e inquinamento del prototipo anche a proprietà (45), busta cifrata con tutte le alterazioni della 10.4 (44), export (47), persistenza e piani (17), testi di export e import;
    - copertura di motore, testi, export, sessione e storage: 99,6% istruzioni, 97,1% rami, 99,8% funzioni (soglia 95%);
    - oracolo: fixture rigenerati identici; `npm run check` senza errori; test di architettura verde con i nuovi moduli;
    - `dist/index.html` di 481.672 byte (45,9% del limite di 1 MB): JavaScript 187 KB, CSS 38 KB, font 245 KB;
    - e2e 40/40 in Chrome 153.0.8010.12 (headless, Linux) da `file://`: le 27 prove della fase 4 più 13 nuove (persistenza, spegnimento con conferma, due schede, dati illeggibili, storage rifiutato, export in tutti i formati con passaggi, intervalli di F06, sessione con Sostituisci e Unisci, busta cifrata con passphrase errata e file manomesso, errori di import, Web Crypto assente, piani con etichette e ricaricamento, telefono a 390 px con aree di tocco); axe-core senza violazioni anche su finestre di export e import, intervallo di F06, Piani salvati e Suddivisione con un piano aperto;
    - da `file://` in Chrome: contesto sicuro, `crypto.subtle`, localStorage e appunti disponibili. Edge, Firefox, Safari e telefoni: lista di prove in `docs/verifiche-browser-fase5.md`, da compilare.

- **Fase 6 · Integrazione delle due guide e collegamenti con l'app** (19 novembre 2026):
  - **guide nella pagina**: contenuto in `src/guides/uso/*.html` e `src/guides/subnetting/*.html` (frammenti in ordine di nome); `tools/guides.js` è un plugin di Vite che li inserisce prima di `</body>` come `<template id="guide-<nome>" data-guide>` (anche con `npm run dev`, con ricarica quando cambia una guida). La vista clona il template: il contenuto non passa per il JavaScript e `npm run size` lo conta nella riga "Guide";
  - **guida al subnetting v0.4** (dalla v0.3 del progetto): niente Google Fonts, selettore del tema interno e script; collegamenti scritti come rotte `#/guide/subnetting/<ancora>`; titolo della guida in `h2` e sottotitoli `h5` → `h4` (l'`h1` è il titolo della schermata); `:target` del glossario sostituito da una classe; intestazione vuota della tabella MAC/IP con testo per i lettori di schermo. Il testo è quello della v0.3, tranne: frase finale del sommario iniziale, legenda dei termini ("con il tasto Tab"), introduzione del glossario, ultimo punto delle "Decisioni prese" dell'appendice C, piè di pagina e versione;
  - **difetto n. 6 chiuso**: i cinque widget (cap. 3, 7, 8, 11, 15) sono sostituiti da riquadri "Nel calcolatore" con collegamenti "Apri nel calcolatore" (`did=1` e `metodo=` del capitolo); altri collegamenti sugli esempi dei cap. 2, 4, 6, 9, 12, 13, 14, 16, 17, 18 e "Verifica nel calcolatore" nelle soluzioni degli esercizi 1–5 (45 collegamenti all'app). L'allenamento libero rimanda a F13 (v2). Con i widget è sparita la funzione `analyze()` della guida: la segnalazione sulla convenzione "1 · ottetto" è chiusa;
  - **vista delle guide** (`src/ui/views/guide.js`, al posto del segnaposto): indice laterale da 1.180 px e richiudibile in alto sotto, con selettore del tema (cambia l'impostazione dell'app, quindi si salva con "Memorizza i dati"), collegamenti rapidi a Cheat sheet e Glossario, voce attiva mentre si legge; arrivo su un'ancora con scorrimento immediato e focus sul titolo (anche ripremendo lo stesso collegamento, e dopo il caricamento dei caratteri); ancora inesistente → avviso; tabelle e blocchi binari che scorrono in orizzontale raggiungibili da tastiera; stampa dell'intera guida (fondo chiaro, niente indice, intestazione e collegamenti all'app, soluzioni aperte con l'etichetta "Soluzione", una pagina nuova per ogni parte);
  - **glossario** (`src/ui/guide-glossary.js`): parti pure provate in Node (ricerca dei termini, prima occorrenza per capitolo, parole intere anche accentate, maiuscole obbligatorie per le sigle); termini con `role="button"`, `aria-expanded` e `aria-describedby` verso la cella della definizione; riquadro inserito subito dopo il termine (Tab raggiunge i suoi collegamenti "Cap. N · titolo" e "Glossario"), Esc chiude e riporta il focus, il collegamento "Glossario" evidenzia la voce;
  - **guida all'uso** (20 sezioni in 5 parti): per cominciare (apertura, schermate, tre modi di lavorare, tastiera e accessibilità); una sezione per ogni pulsante "?" (Analisi, Conversioni, Mask, Stessa subnet, Calcolo inverso, Suddivisione, Piani salvati, Impostazioni); passaggi, cronologia, export, Memorizza i dati, sessione, cifratura, temi, browser e apertura da disco (con quanto verificato in Chrome e formulazioni prudenti per gli altri browser, da aggiornare con le prove di Paolo);
  - **collegamenti dall'app**: "?" anche in Impostazioni; "Capitolo N · titolo" dei passaggi e "?" arrivano al paragrafo con il focus sul titolo; il tasto indietro torna alla schermata di partenza con gli input;
  - **correzioni**: titolo del cap. 11 in `strings.it.js` allineato alla guida ("Che mask mi serve? Il calcolo inverso"); nota della cronologia senza il riferimento alla fase 5; in `main.js` i template delle guide restano nella pagina quando si costruisce il guscio;
  - **verifiche** (su un clone pulito con `npm ci`):
    - 1.023 test in 29 file (erano 988): nuovi `tests/ui/guides.test.js` (23: template e peso, contenuto senza script né risorse esterne, id unici nelle due guide, nessun widget, ogni capitolo citato da motore/testi/interfaccia esiste, ogni metodo rimanda a un capitolo esistente, ogni "?" ha la sua sezione, titoli `ui.cap.*` = `h3` della guida e viceversa, ogni collegamento delle guide è una rotta canonica con ancora esistente, "Apri nel calcolatore" con input validi per il motore, `did=1` e metodo previsto, glossario a 32 voci, **cheat sheet e tabelle host → prefisso confrontate con il motore**) e `tests/ui/guide-glossary.test.js` (8);
    - copertura di motore, testi, export, sessione e storage: 99,6% istruzioni, 97,1% rami, 99,8% funzioni;
    - oracolo: fixture rigenerati identici; `npm run check` senza errori; test di architettura verde;
    - `dist/index.html` di 630.611 byte (60,1% del limite di 1 MB): JavaScript 196 KB, CSS 49 KB, font 245 KB, **guide 126 KB**;
    - e2e 48/48 in Chrome 153.0.8010.12 (headless, Linux) da `file://`: le 40 prove della fase 5 più 8 sulle guide (ancore con focus e voce attiva, indice e tasto indietro, telefono a 390 px con indice in alto e aree di tocco, "Capitolo N" e i sette "?" più Impostazioni, Apri nel calcolatore con impostazioni invariate, glossario da tastiera e mouse, tema dall'indice salvato e ricaricato, stampa con PDF di 38 pagine); axe-core WCAG 2.2 AA senza violazioni sulle due guide nei tre temi espliciti, con il riquadro del glossario aperto, e a 390 px in tema scuro con l'indice aperto.

- **Fase 7 · Verifica finale e rilascio v1** (19 novembre 2026):
  - **revisione indipendente** (`docs/revisione-fase7.md`): tre revisori separati, nessuno dei quali aveva scritto il codice, su una copia ferma del codice della fase 6. A: motore e test. B: export, sessione, busta cifrata e storage. C: interfaccia, accessibilità e guide.
    - Esito: 0 differenze del motore rispetto a Python su circa 55.000 casi nuovi, nessuna eccezione su 300.000 input casuali, nessun errore di calcolo nella guida al subnetting.
    - Corretti 19 difetti, ognuno con un test che fallisce senza la correzione:
      - persistenza con più schede e con dati di una versione successiva (B1, B2);
      - passaggio "è il broadcast" con /31 e /32 (A1);
      - "100.0" host letto come 1.000 (A2);
      - nome ACL di sole cifre (A5);
      - Unisci senza avviso dei limiti (I1);
      - formule CSV dopo gli spazi (I2);
      - piano aperto su una suddivisione diversa (I3, C5);
      - area OSPF importata non validata (I4);
      - test dell'AAD (I5);
      - annullamento durante la cifratura (I6);
      - Invio nelle finestre (M1, C7);
      - focus sotto le barre fisse (C1) e "torna su" raggiungibile (C2);
      - focus perso al ridisegno (C3);
      - annunci di Conversioni (C4);
      - "Apri in Analisi" (C6);
      - contrasto dei segnaposto (C10).
    - Il resto è nell'elenco "Per la fase 8" del documento.
  - **requisiti** (`docs/verifica-requisiti-v1.md`): tabella requisito → dove → come verificato → esito, per le specifiche (sezioni 2–6) e la specifica tecnica (sezioni 0 e 9). Ciò che resta fuori: browser diversi da Chrome, telefoni reali, lettori di schermo reali, primo giro di Actions;
  - **CI**:
    - job `e2e` con il Chrome del runner (`CHROME_PATH`) e l'artefatto `e2e-report`;
    - Release e Pages solo con `test` ed `e2e` verdi;
    - controllo tag = versione di `package.json` e presenza della nota di rilascio;
    - Release con l'impronta `.sha256`;
    - build riproducibile con `SOURCE_DATE_EPOCH` = data dell'ultimo commit;
    - azioni aggiornate al runtime Node 24 (`checkout@v6`, `setup-node@v6`, `setup-python@v6`, `upload-artifact@v6`, `download-artifact@v7`, `upload-pages-artifact@v4`, `deploy-pages@v4`).
    - Il workflow è controllato con actionlint ed eseguito passo per passo in locale; il primo giro reale è quello del push;
  - **e2e**: nuove prove:
    - nessuna richiesta di rete e app funzionante con il browser offline;
    - Tab a 390 px senza controlli coperti dalle barre;
    - focus conservato (paginazione, esempi, piani);
    - annunci di Conversioni;
    - "Apri in Analisi";
    - Esc durante la cifratura;
    - Invio nella passphrase;
    - piano con parametri diversi;
  - **manifest PWA**: valutato e **non incluso nella v1** (`docs/decisione-pwa.md`):
    - Chrome non accetta un manifest come URL `data:`, quindi servirebbero file separati su Pages;
    - l'uso offline dell'app installata richiede un service worker;
    - il vantaggio è piccolo, perché il file unico funziona già offline e su iOS c'è "Aggiungi alla schermata Home".
    - Possibile in seguito, solo per Pages;
  - **rilascio**:
    - versione 1.0.0;
    - `REPO_URL` = repository GitHub (collegamento in Informazioni, in una nuova scheda);
    - `CHANGELOG.md` e `docs/note-rilascio/v1.0.0.md`;
    - README con download, Pages e istruzioni di rilascio;
    - specifica tecnica 3.6 aggiornata (nome ACL);
    - guida all'uso aggiornata su Unisci;
    - tag annotato `v1.0.0`;
  - **verifiche** (su un clone pulito con `npm ci`):
    - 1.037 test in 29 file, anche con altri due semi per le proprietà;
    - copertura di motore, testi, export, sessione e storage: 99,6% istruzioni, 97,3% rami, 99,8% funzioni;
    - oracolo: fixture rigenerati identici; `npm run check` senza errori;
    - `dist/index.html` di 635.192 byte (60,6% del limite di 1 MB): JavaScript 200 KB, CSS 49 KB, font 245 KB, guide 126 KB. Due build dello stesso commit producono lo stesso file;
    - e2e 52/52 in Chrome 153.0.8010.12 (headless, Linux) da `file://`;
    - actionlint senza segnalazioni;
    - su GitHub Actions (Chrome 157): `test` verde; `e2e` 51/52 al primo giro per un difetto del test (risultato letto prima del cambio di vista), poi 52/52 dopo la correzione.

- **Fase 8 · Revisione finale tecnica → v1.1.0** (21 novembre 2026):
  - **lista unificata**: l'elenco "Per la fase 8" di `docs/revisione-fase7.md` e le segnalazioni di questo file, per area e con la gravità. Paolo non aveva note proprie: la v1.1.0 contiene solo le correzioni tecniche, le sue note vanno nella v1.2 (fase 9). Esito voce per voce in fondo a `docs/revisione-fase7.md`;
  - **motore e passaggi**:
    - blocchi speciali 192.0.0.0/24 (RFC 6890) e 198.18.0.0/15 (RFC 2544) in F04, testi, test, oracolo e tabella del cap. 4;
    - mask non valida nel testo dell'indirizzo: errore sotto quel campo (A3);
    - conteggi oltre 2^32 → NUMBER_RANGE con il testo scritto (A4);
    - MASK_LEADING_ZERO e "/255.255.255.0" nel campo del prefisso (A9);
    - `subnetAt`, `indexOf`, `iterateSubnets` robusti fuori contratto (A10);
    - frasi dei passaggi vere ai bordi, con un test a proprietà sui testi (A7);
    - plurali, maiuscole, "ma ne servono", caso C, ottetto nella mask non valida (A8);
    - riga binaria bit per bit con una mask non valida in F03 (`bitwise`);
    - P4 indipendente, P10 a 1.000 esecuzioni, oracolo esteso a F04 (ambito, blocco principale), F03 (motivo, suggerimenti, wildcard), F01 (offset, ruolo, reti adiacenti) (A11); specifica 4.1 (A12);
  - **dati**: ordinamento per istante con `Date.parse` (M2); conteggio all'avvio di cronologia illeggibile ed etichette scartate (M3); campi in più nell'intestazione della busta rifiutati (M4);
  - **interfaccia**:
    - barra di export con il modello ARIA della toolbar (C18);
    - aree di tocco di 44 px nelle guide (C11);
    - messaggi brevi dopo la chiusura delle finestre modali (C8) e annunci non ripetuti (C14);
    - frammento normalizzato per `pg` e `caso` (C12); piano eliminato tolto dai collegamenti (C13);
    - stampa di Suddivisione con "/24" (C17); "Trova" fuori dal blocco (C19);
    - `f10=1` per i collegamenti del cap. 14 (C9); Analisi senza IP senza errore prima di Invio (C6);
  - **guide**:
    - guida al subnetting "v0.4 · versione di studio" (C16, decisione di Paolo);
    - convenzione di /0 nel cap. 6 e righe /0–/7 nella cheat sheet;
    - blocchi binari a 12 px sul telefono, con un'ombra sul bordo che scorre;
    - guida all'uso allineata all'app (C15, C6, frecce della barra) e test che confronta ogni nome di pulsante citato con i testi dell'interfaccia;
  - **rilascio**: versione 1.1.0, `CHANGELOG.md`, `docs/note-rilascio/v1.1.0.md`, README, `docs/verifica-requisiti-v1.md` aggiornata; specifica tecnica 3.4, 3.5, 3.6 (F04), 4.1, 7.3 e 9.3 aggiornate;
  - **verifiche** (su un clone pulito con `npm ci`):
    - 1.072 test in 29 file (erano 1.037), anche con altri tre semi per le proprietà;
    - copertura di motore, testi, export, sessione e storage: 99,6% istruzioni, 97,2% rami, 99,8% funzioni;
    - oracolo: 82.575 casi, 0 differenze, fixture rigenerati identici; una mutazione (blocco BENCHMARKING tolto) viene rilevata;
    - `npm run check` senza errori;
    - `dist/index.html` di 643.309 byte (61,4% del limite di 1 MB): JavaScript 204 KB, CSS 49 KB, font 245 KB, guide 129 KB;
    - e2e 64/64 in Chrome da `file://` (12 prove nuove), anche su GitHub Actions con Chrome 157. Le prove nuove falliscono senza le correzioni, tranne quella di C8: il caso non si è presentato, la correzione resta come garanzia;
    - GitHub Actions: un giro intermedio rosso per un errore del controllo dei tipi in `tools/e2e.js`, corretto nel commit successivo; poi `test`, `e2e` e `pages` verdi.

## Decisioni di Paolo
**Fase 1**
- Alla chiusura di ogni fase va sempre fornito il **titolo** della conversazione successiva (`Fase N · Titolo`) e il **prompt** da incollare per avviarla (regola registrata nella sezione 7.1 delle specifiche).
- Le note personali sulla guida (Errore, Chiarezza, Mancanza, Taglio) **non** sono state raccolte in questa fase per scelta: Paolo preferisce rivedere tutto alla fine, dopo la scrittura dell'applicazione, e correggere in un colpo solo applicazione e guide. Eventuali segnalazioni sparse nel frattempo vanno annotate qui sotto e applicate in quella revisione.

**Fase 2** (tutte le raccomandazioni approvate; dettagli nella sezione 1 della specifica tecnica)
- **D1 Build**: Vite con vite-plugin-singlefile; test con Vitest.
- **D2 Persistenza**: localStorage dietro un adattatore sostituibile.
- **D3 Font**: IBM Plex incorporato (OFL), WOFF2, caratteri latini, 6 pesi; limite del file unico 1 MB, guide comprese.
- **D4 Sorgenti**: GitHub, repository pubblico; GitHub Actions, Releases, GitHub Pages; copia dei documenti in `/docs`.
- **Minori**: JavaScript con JSDoc e `@ts-check`; fast-check e oracolo Python; /0 con M = 256 nel 1° ottetto; esiti con codici e testi separati; zeri iniziali rifiutati e virgola accettata; si salvano solo gli input; import con anteprima, Sostituisci/Unisci; AAD nella busta e iterazioni 600.000–10.000.000; F06 a pagine; navigazione con frammento; F04 come cap. 4 più classi D ed E; gateway facoltativo in F07; CSV con `;` e BOM; licenza MIT.

**Fase 3** (elenco degli interventi approvato)
- Licenza MIT a nome di **Paolo Pallavera**.
- Oracolo nella **forma completa** (2.000 IP casuali, ciascuno con tutti i 33 prefissi, più l'insieme fisso).
- **TypeScript 5.9** invece della 7.0 (riscrittura nativa, supporto a JSDoc e checkJs meno collaudato); serve solo al controllo dei tipi.
- Repository consegnato come archivio con storia git (account GitHub non collegato a Claude).

**Fase 4**
- Piano dei 16 interventi approvato.
- **Prova nel browser** con Playwright e axe-core come dipendenze di sviluppo (`npm run e2e`); l'inserimento in CI si valuta in fase 7.
- **Cronologia** fatta ora, solo in memoria; il salvataggio arriva in fase 5.
- **`--line-strong`** per i bordi dei controlli (≥ 3:1), senza toccare le variabili della guida.

**Fase 5**
- Piano dei 13 interventi approvato, con le scelte a–f: riga "Compatibilità di questo browser" in Informazioni; Unisci toglie anche i doppioni per contenuto; si salvano impostazioni, tema, cronologia e piani (non il metodo per funzione né gli input delle viste); più schede come descritto sopra; nomi dei file con l'input principale per le funzioni senza rete; "Includi i passaggi" nei formati testuali come testo e nel JSON come dati strutturati.
- Repository consegnato come archivio con storia git (account GitHub non collegato a Claude).

**Fase 6**
- Piano degli 11 interventi approvato, con le scelte a–d: guida al subnetting in **una pagina unica** (`cap-N` scorre al capitolo); **allenamento libero** sostituito dai collegamenti sugli esercizi 1–5, con rimando a F13 (v2); guida integrata come **v0.4**, con il repository come fonte (il file del progetto resta la v0.3); **note sui browser** con quanto verificato in Chrome e formulazioni prudenti per gli altri, da aggiornare con le prove. Aggiunto il pulsante "?" in Impostazioni.
- Fase svolta con Opus 5.5 invece di Sonnet 5.5.
- Repository consegnato come archivio con storia git (account GitHub non collegato a Claude).

**Fase 7**
- Piano degli interventi approvato, con **tre revisori** invece di uno.
- Nome utente GitHub: **ppallavera66-web**; account collegato a Claude durante la fase, push fatto dalla sessione.
- Nessuna prova nei browser fatta finora: la sezione "Browser e apertura da disco" resta prudente, le prove passano alla fase 8.
- Criterio di "bloccante" approvato: calcolo sbagliato, dati persi o corrotti, falla in import, busta o export, funzione inutilizzabile, violazione WCAG AA in un flusso principale, requisito v1 mancante.
- Repository reso **pubblico** (D4) e Pages attivato da Paolo; tag v1.0.0 pubblicato da Paolo (il proxy della sessione non permette di cambiare le impostazioni né di pubblicare i tag).
- Manifest PWA non incluso nella v1.

**Fase 8**
- Nessuna nota di Paolo in questa fase: la v1.1.0 contiene solo le correzioni tecniche; le note arrivano nella fase 9 per la v1.2.
- Guida al subnetting: resta la v0.4, con "versione di studio" al posto di "da revisionare"; nessuna rilettura generale da parte di Claude.
- Blocchi speciali 198.18.0.0/15 (RFC 2544) e 192.0.0.0/24 (RFC 6890) aggiunti in app e guida.
- Busta cifrata: i campi in più nell'intestazione si rifiutano (M4).
- Nessuna prova nei browser: la sezione "Browser e apertura da disco" resta prudente.
- Repository pubblico, Pages attivo, tag v1.0.0 pubblicati da Paolo; il tag v1.1.0 lo pubblica Paolo.

## Scelte tecniche della fase 3 (dove la specifica non decideva)
- **Codici aggiunti**: `MASK_OCTET_VALUE` e `MASK_NONCONTIGUOUS` anche come errori, sul campo `mask`, per una mask non valida dentro `IP mask` o `IP/mask` (caso E della 10.2); `ACL_NAME_FORMAT` e `ACL_ACTION_VALUE` per F10; motivi `BOTH_BLOCK_TOO_SMALL` e `BOTH_CONFLICT` per F05 caso C.
- **Parametri**: gli indici degli ottetti sono da 0 (l'interfaccia mostra l'ordinale); gli indirizzi negli avvisi sono stringhe puntate, pronte per i testi.
- **API in più**: `parseMask`, `parsePrefixOrMask`, `parseAddressWithPrefix`, `parseCount`; versioni su testo per tutte le funzioni (`analyzeText`, `classifyText`, `prefixForHostsText`, `prefixForSubnetsText`, `prefixForBothText`, `subdivideText`, `sameSubnetText`, `snippetsText`); `methodsFor`, `resolveMethod`. `subnetAt` e `indexOf` ricevono rete e prefisso del blocco separati.
- **Moduli in più**: `steps/common.js` (strumenti comuni) e `steps/convert.js` (passaggi di F02); `src/ui/globals.d.ts` per la versione iniettata da Vite.
- **Testi dei passaggi** già scritti in fase 3 (la 2.2 prevedeva solo gli errori), così il test di completezza copre anche i passaggi. Saranno rivisti con la guida nella revisione finale.
- **Larghezza in F02**: se il valore non entra nella larghezza richiesta (per esempio 256 con 8 bit), si usa la larghezza minima sufficiente.
- **Vite**: `base: './'` per l'apertura da disco; versione dell'app iniettata come `__APP_VERSION__`.
- **Guida v0.3 non copiata in `docs/`**: entra nel repository in fase 6, in `src/guides/`, presa dal progetto.

## Scelte tecniche della fase 4 (dove la specifica non decideva)
- **Font**: al posto di un sottoinsieme creato da noi (circa 69 KB) si usano i file "split" di IBM non modificati (Latin1 + Pi, 245 KB in base64): un sottoinsieme fatto da noi sarebbe una versione modificata, che per la OFL non può usare il nome riservato "Plex". Il sottoinsieme latino di Google/Fontsource non ha gli apici dei passaggi (2⁶), le frecce e ≤ ≥. I caratteri ▸ ▾ ⧉ non esistono in Plex: chevron e icona di copia sono SVG.
- **Parametri del frammento in più** rispetto alla 9.3: Conversioni `w` (larghezza), `a` (indirizzo), `pm` (prefisso o mask); Calcolo inverso `caso` (scritto solo quando non si deduce dagli altri parametri; ordine `p`, `h`, `s` come negli esempi); Suddivisione `ip` (un collegamento con `ip=` apre la pagina della subnet che lo contiene). Valori troncati a 200 caratteri e ripuliti dai caratteri di controllo.
- **Opzioni di F10** (numero e nome ACL, azione, processo e area OSPF) restano nella vista e non nel frammento.
- **"Cancella tutti i dati"** funziona già sullo stato in memoria (cronologia e impostazioni), con conferma; "Memorizza i dati", esporta e importa sessione sono visibili ma disattivati con la nota sulla fase 5.
- **Barra di export**: la stampa funziona; gli altri formati sono `aria-disabled` con la nota sulla fase 5.
- **Cronologia**: voce registrata dopo 2 s senza modifiche o subito con Invio; lo stesso input già presente torna in cima con la data nuova.
- **Su telefono** i valori della scheda risultato sono righe compatte (etichetta a sinistra, valore e copia a destra); rete e broadcast restano in evidenza.
- **Data di build** iniettata come `__BUILD_DATE__` (riproducibile con `SOURCE_DATE_EPOCH`); testo della OFL incorporato con `?raw`.
- **Titoli dei capitoli** della guida v0.3 in `strings.it.js` (`ui.cap.cap-N`), usati nei collegamenti "Capitolo N · titolo" e nel segnaposto delle Guide.
- **Test di completezza** dei testi `ui.*`: ogni testo è pulito e ogni chiave usata nel codice esiste (serve anche a tenere la copertura delle funzioni sopra il 95%).

## Scelte tecniche della fase 5 (dove la specifica non decideva)
- **Codici dell'import** in `session/schema.js`: oltre a quelli della 6.3 e della 7.3, `IMPORT_NESTED_ENVELOPE` (busta dentro la busta), `IMPORT_CRYPTO_UNAVAILABLE` e gli avvisi `IMPORT_W_MIGRATED`, `IMPORT_W_HISTORY_TRUNCATED`, `IMPORT_W_PLANS_TRUNCATED`, `IMPORT_W_LABELS_DROPPED`, `IMPORT_W_DUPLICATE_ID`. `version` non intera o negativa, e versioni precedenti senza migrazione, danno `IMPORT_BAD_FIELD` sul campo `version`.
- **Validazione**: un piano con un campo non valido viene scartato per intero; le etichette non valide si scartano una per una. Date ISO in UTC controllate anche sul calendario (niente 30 febbraio). Testi senza caratteri di controllo, separatori di riga Unicode e override bidirezionali; nelle note sono ammessi gli a capo (CRLF diventa LF). Lunghezze contate in caratteri Unicode. BOM iniziale del file accettato.
- **Unisci**: a parità di `id` resta l'elemento presente; poi i doppioni per contenuto (stessa funzione e stesso input) tengono la voce più recente; ordine per data, tagli a 200 voci e 100 piani (i piani nuovi in eccesso restano fuori).
- **Persistenza**: le chiavi salvate passano all'avvio per la stessa validazione dell'import (`meta.schema` fa da versione). `meta` contiene `{ schema, savedAt }`. Si scrivono solo le chiavi il cui JSON è cambiato, così il ricaricamento da un'altra scheda non provoca scritture a catena. Prima di chiudere la pagina (`pagehide`) si registrano la voce di cronologia in attesa e il salvataggio ritardato.
- **Base64** della busta: standard, con padding obbligatorio e forma canonica (bit di riempimento a zero), altrimenti `IMPORT_BAD_ENVELOPE`.
- **Robustezza della passphrase**: bit stimati come lunghezza × log2 dell'alfabeto usato (minuscole, maiuscole, cifre, simboli, altri caratteri), con un limite per i caratteri ripetuti; livelli a 50, 70 e 90 bit. Sotto i 12 caratteri è sempre "debole" e l'export non parte.
- **Export**: righe con valori grezzi (numeri senza separatori, indirizzi puntati, `null` = "nessuno"); testo, Markdown e copia mostrano i numeri con il separatore delle migliaia, CSV e JSON no. Nel CSV di F06 un broadcast assente è una cella vuota. Il JSON di F06 su un intervallo contiene il riepilogo senza la pagina, `range` e le subnet (con `label` se c'è un piano). Conversioni ha una barra per riquadro (numero, indirizzo, prefisso e mask). Lo Snippet scarica le tre configurazioni in un `.txt` con un'intestazione `!` per ciascuna. "Includi i passaggi" vale per la visita e non viene salvato.
- **Nomi dei file**: `subnet-tipo-<ip>` per un IP senza prefisso, `subnet-conversioni-<numero>-b<base>`, `subnet-conversioni-p<prefisso>`, `subnet-stessa-<a>-<b>`, `subnet-inverso-h…`/`-p…-s…`, `subnet-suddivisione-<rete>-<prefisso>-<nuovo>`, con `-n<da>-<a>` per un intervallo diverso da "tutte"; parti ripulite (lettere, cifre, `.`, `_`, `-`, al massimo 40 caratteri).
- **Piani**: parametro `piano` aggiunto al frammento di Suddivisione; etichette salvate mentre si scrive (al massimo 80 caratteri, 4.096 per piano, ripulite dai caratteri di controllo); nuovi piani in cima all'elenco.
- **Interfaccia**: nuove icone `import`, `save`, `edit`; `textField` accetta `type: "password"` e `autocomplete`; casella di spunta con l'etichetta come area di tocco da 44 px.
- **Copertura**: estesa a `src/export`, `src/session` e `src/storage` (prima solo motore e testi).

## Scelte tecniche della fase 6 (dove la specifica non decideva)
- **Contenuto come template**: le guide sono frammenti HTML statici, non moduli JavaScript; `tools/guides.js` (plugin di Vite) li inserisce come `<template data-guide>`, che `size-check.js` misurava già dalla fase 3. Il contenuto è nostro (nessun dato dell'utente), quindi si clona così com'è.
- **Ancore**: guida al subnetting = id dell'elemento (`cap-9`, `app-a`, `app-a-inv`, `cap-11-tabella`, `gl-acl`); guida all'uso = id con il prefisso `uso-` (`#/guide/uso/analisi` → `id="uso-analisi"`), per non confondersi con gli id dell'interfaccia (`src/ui/guide-anchors.js`). Le sezioni dei "?" hanno il nome della scheda; per Impostazioni il nome della sezione.
- **Indice**: generato dal contenuto (un gruppo per `.part`, una voce per `section.chap`); laterale da 1.180 px (con la barra dell'app da 240 px, sotto quella larghezza il testo sarebbe troppo stretto), richiudibile in alto sotto.
- **Arrivo su un'ancora**: scorrimento immediato (non animato), così il focus e la posizione sono certi; `scroll-margin-top` di 84 px sotto i 980 px per la barra in alto. `View.reveal` in `types.js` e `main.js`: una vista appena aperta con un'ancora gestisce da sé scorrimento e focus.
- **Glossario**: definizione letta dal lettore di schermo tramite `aria-describedby` verso la cella della tabella (`gl-…-def`), sempre presente; riquadro in posizione fissa, ricalcolata allo scorrimento.
- **Collegamenti "Apri nel calcolatore"**: testo completo e autonomo ("Apri nel calcolatore: 172.16.45.200/20 …"), dentro un riquadro con `role="group"`; la scheda Conversioni con il solo `pm` e Analisi senza input sono ammesse (il test accetta collegamenti senza input).
- **Tabelle verificate**: attributo `data-check` su cheat sheet e tabelle host → prefisso, letto dai test.
- **Stampa**: ogni parte della guida su una pagina nuova; i blocchi binari vanno a capo solo se non entrano nella riga.

## Scelte tecniche della fase 7 (dove la specifica non decideva)
- **Persistenza**:
  - con il salvataggio spento, l'evento `storage` di un'altra scheda viene ignorato;
  - accendendo "Memorizza i dati", i dati già salvati si uniscono a quelli della visita, con la logica di Unisci;
  - `needsOverwrite()` segnala i dati illeggibili o di una versione successiva prima di sovrascriverli.
- **Conteggi**: il separatore delle migliaia (punto o spazio) è ammesso solo a gruppi di tre cifre.
- **Nome ACL**: deve iniziare con una lettera (`^[A-Za-z][A-Za-z0-9_-]{0,63}$`).
- **CSV**: la protezione dalle formule vale anche dopo spazi iniziali (compresi U+3000 e BOM) e per `＝ ＋ － ＠`.
- **Input F10 nella sessione**: l'area come testo è ammessa solo con cifre e punti, al massimo 15 caratteri, e viene salvata nella forma del motore. L'area come numero resta un numero.
- **Piani**: `piano=<id>` apre il piano solo se blocco, prefisso e nuovo prefisso sono quelli del piano, altrimenti compare l'avviso `ui.plans.mismatch`. `setPlanLabel` accetta solo indici entro il numero di subnet.
- **Focus**: un `MutationObserver` in `main.js` sposta il focus quando il controllo che lo aveva viene tolto dal DOM: va al primo controllo della finestra aperta oppure al titolo della schermata. La paginazione di Suddivisione rimette il focus sul pulsante equivalente (o sul numero di pagina) e annuncia la pagina; gli esempi portano al primo campo.
- **Barre fisse**: `scroll-padding-top: 72px` sotto i 980 px; `scroll-padding-bottom` uguale all'altezza della barra in basso più 12 px sotto i 720 px.
- **Invio** nei campi senza `onEnter` non viene più bloccato: nelle finestre conferma il modulo.
- **Repository**: il commit iniziale creato da GitHub (README e LICENSE con il nome utente) è unito alla storia senza forzare il push; restano i file del progetto e la licenza MIT a nome di Paolo Pallavera.

## Scelte tecniche della fase 8 (dove la specifica non decideva)
- **Codici**: `MASK_LEADING_ZERO` (indice e valore dell'ottetto); NUMBER_RANGE con `max` per i conteggi (2^32, tutti i /32 di un /0); `IMPORT_BAD_ENVELOPE` con `unexpected: true` per un campo in più nella busta.
- **Blocchi speciali**: codici `IETF_PROTOCOL` (192.0.0.0/24) e `BENCHMARKING` (198.18.0.0/15), ambito "speciale".
- **Righe binarie**: `{ bitwise: true, prefix: null }` per una mask non valida; nell'export la riga intera senza la barra rete | host.
- **Annunci**: lo stesso testo di prima non si ripete finché non cambia schermata; un messaggio breve con una finestra modale aperta aspetta la chiusura (controllo ogni 150 ms).
- **Frammento**: `f10=1` in Analisi (si aggiorna aprendo e chiudendo la sezione, non durante la stampa); `caso` sconosciuto tolto in `buildHash`; `pg` riscritto da Suddivisione con la pagina mostrata.
- **Toolbar**: tabindex mobile, frecce in entrambe le direzioni con ritorno all'inizio, Inizio e Fine.
- **Guida su telefono**: blocchi binari a 12 px sotto i 560 px, senza andare a capo (l'allineamento in colonna è il contenuto); quelli oltre circa 46 caratteri scorrono, con un'ombra sul bordo.

## Segnalazioni da applicare nella revisione finale
- **Chiuse nella fase 8**: tutto l'elenco "Per la fase 8" di `docs/revisione-fase7.md`; blocchi binari su telefono; convenzione di /0 e righe /0–/7; blocchi speciali del cap. 4; righe bit per bit di F03; nomi dei pulsanti nella guida all'uso.
- **Per la fase 9 (v1.2), insieme alle note di Paolo**:
  - testi dei passaggi didattici e dell'interfaccia (`strings.it.js`): rilettura di tono e coerenza con i capitoli. Nella fase 8 sono state corrette solo le frasi false e gli accordi (A7, A8);
  - guida all'uso: rilettura del tono e degli esempi; sezione "Browser e apertura da disco" con le prove nei browser, quando ci sono;
  - guida al subnetting: revisione dei contenuti e passaggio alla v1.0.

## Problemi aperti
- **GitHub Actions**: verde sull'ultimo commit di `main` (`test`, `e2e` con Chrome 157, `pages`). Release v1.1.0 dopo il push del tag da parte di Paolo.
- **Da verificare su dispositivo**:
  - **tastiera numerica iOS** in italiano (i campi hanno `inputmode="decimal"`, la virgola è accettata);
  - Safari su iPhone e Android con Chrome. Le prove sono state fatte solo in Chrome desktop, con l'emulazione del telefono.
- **Verifiche nei browser**:
  - in Chrome da `file://` è tutto disponibile (contesto sicuro, Web Crypto, localStorage, appunti);
  - **da fare a mano** in Edge, Firefox, Safari e sui telefoni, con la lista `docs/verifiche-browser-fase5.md`, compresi lo spazio condiviso tra file aperti da cartelle diverse e il CSV aperto in Excel;
  - i risultati vanno nella sezione "Browser e apertura da disco" della guida all'uso (`src/guides/uso/03-risultati-dati.html`, `id="uso-browser"`).
- **Lettori di schermo reali** (NVDA, VoiceOver, TalkBack): mai provati. C8 è corretto come garanzia, ma va confermato con un lettore vero.
- **Peso del file unico**: `npm run size` a ogni build (fase 8: 643.309 byte, 61,4%; restano circa 400 KB).
- **Safari**: può cancellare i dati locali dopo un periodo di inattività. La nota è accanto all'interruttore e nella guida all'uso (Memorizza i dati, Browser).

## Prossima conversazione
**Titolo:** Fase 9 · Note di Paolo su applicazione e guide (v1.2)
**Modello:** Opus 5.5 · **Impegno:** Medio

**Prompt da incollare:**

> Iniziamo la fase 9: le mie note su applicazione e guide del Calcolatore Subnet, con rilascio v1.2.0.
>
> Leggi STATO_PROGETTO.md, 01_specifiche_progetto.md, 02_specifica_tecnica_v1.md e, nel repository, docs/revisione-fase7.md (con l'esito della fase 8) e CHANGELOG.md. Poi conferma modello e impegno per questa fase.
>
> Il codice è nel repository GitHub `ppallavera66-web/calcolatore-subnet` (tag v1.1.0), collegato alla sessione: lavora lì, con un commit per passo, e pubblica su `main`. Il tag v1.2.0 lo pubblico io: preparalo e scrivimi i comandi.
>
> Le mie note, con le etichette Errore, Chiarezza, Mancanza, Taglio, sono qui sotto. Se qui sotto non trovi note, fermati e chiedimele prima di proporre la lista.
>
> [Incolla le note.]
>
> [Facoltativo: risultati delle prove di `docs/verifiche-browser-fase5.md`.]
>
> Obiettivo:
> - un'unica lista di interventi che unisca le mie note e le voci "Per la fase 9" delle segnalazioni di STATO_PROGETTO.md, raggruppata per area (motore e passaggi, interfaccia e accessibilità, dati, guida all'uso, guida al subnetting) e con la gravità;
> - correzioni dell'applicazione e delle due guide, ognuna con un test o una prova nel browser quando si può; guida al subnetting portata alla v1.0;
> - rilettura dei testi dei passaggi e dell'interfaccia insieme alle guide, per tono e coerenza;
> - se arrivano i risultati delle prove nei browser: aggiornamento della sezione "Browser e apertura da disco" della guida all'uso;
> - rilascio v1.2.0: versione, CHANGELOG, nota di rilascio in docs/note-rilascio, tag preparato;
> - tutti i controlli verdi: test, copertura, oracolo, `npm run check`, `npm run size`, `npm run e2e`, GitHub Actions.
>
> Prima di scrivere codice proponimi la lista unificata e l'ordine di lavoro; dopo la mia conferma procedi, esegui test e controlli e riportami i risultati. Alla fine aggiorna STATO_PROGETTO.md con titolo e prompt della fase successiva (pianificazione della v2).

## Fasi successive
- **Fase 10 · Pianificazione della v2**: F08 VLSM, F09 summarization, F13 allenamento, export XLSX, snippet avanzati; 2–3 conversazioni secondo la sezione 7 delle specifiche; eventuale manifest PWA solo per Pages (`docs/decisione-pwa.md`).
