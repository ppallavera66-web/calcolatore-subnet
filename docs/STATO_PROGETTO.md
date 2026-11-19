# Stato del progetto: Calcolatore Subnet

Ultimo aggiornamento: 19 novembre 2026 (fase 6)

## Fase corrente
**Fase 7 · Verifica finale (con revisione indipendente) e rilascio v1**
Modello consigliato: **Opus 5.5** · Impegno: **Medio**
Contenuto: revisione indipendente di codice, guide e test; verifica dei criteri di accettazione della v1; prove nei browser; `npm run e2e` in CI; rilascio v1.0.0 (versione, tag, Release con il file unico, GitHub Pages).

**Prima di iniziare (azione per Paolo):** allegare `calcolatore-subnet-fase6.zip` alla conversazione (oppure pubblicarlo su GitHub e collegare l'account GitHub in claude.ai, Connettori); se possibile, compilare la tabella di `docs/verifiche-browser-fase5.md` e incollarla nel prompt: i risultati servono alla sezione "Browser e apertura da disco" della guida all'uso.

## Repository
- Repository locale con storia git (un commit per passo, ramo `main`), consegnato come archivio `calcolatore-subnet-fase6.zip` alla fine della fase 6 (comprende i commit delle fasi 3, 4, 5 e 6): l'account GitHub non era collegato a Claude, quindi non è stato possibile pubblicarlo dalla sessione. Insieme all'archivio c'è `calcolatore-subnet-fase6.html`, il file unico pronto da aprire.
- Per pubblicarlo nel repository pubblico vuoto `calcolatore-subnet`: estrarre l'archivio, entrare nella cartella ed eseguire `git remote add origin https://github.com/<utente>/calcolatore-subnet.git` e `git push -u origin main`.
- Dopo il primo push: in GitHub, Settings → Pages → Source: **GitHub Actions**, per la pubblicazione HTTPS dal ramo `main`. Il primo giro reale della CI avviene con quel push (in locale tutti i passi del workflow, più `npm run e2e`, sono stati eseguiti su un clone pulito).
- Da completare: in `src/ui/views/impostazioni.js` la costante `REPO_URL` è vuota finché non si conosce il nome utente GitHub; la sezione Informazioni mostra per ora il nome del repository senza collegamento.

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

## Segnalazioni da applicare nella revisione finale
- ~~Guida, widget del cap. 7 e 15: la funzione `analyze()` tratta /8, /16, /24 come "confine sull'ottetto"~~: **chiusa in fase 6** (widget sostituiti).
- Guida al subnetting, telefono: i blocchi binari larghi (per esempio cap. 13, cap. 17) scorrono in orizzontale come nella v0.3; valutare una versione più stretta o a capo per gli schermi piccoli.
- Guida all'uso: rileggerla tutta insieme ai testi dell'interfaccia (tono, nomi dei pulsanti, esempi) e aggiornare "Browser e apertura da disco" con le prove nei browser.
- Guida, cap. 6 e cheat sheet: valutare l'aggiunta della convenzione per **/0** (M = 256 nel 1° ottetto, decisa in fase 2) e delle righe /0–/7 nella cheat sheet.
- Guida, cap. 4: eventuali blocchi speciali aggiuntivi (per esempio 198.18.0.0/15, 192.0.0.0/24) solo insieme all'app (decisione m11).
- Testi dei passaggi didattici (`strings.it.js`): rileggerli insieme alla guida, per tono e coerenza con i capitoli.
- App, F03 (passaggi): con una mask non valida la riga binaria dei passaggi colora come "rete" gli 1 contigui da sinistra (prefisso calcolato dal motore); valutare se mostrare invece 1 e 0 bit per bit, come la tabella degli ottetti.
- App, testi dell'interfaccia (`ui.*` di `strings.it.js`): rileggerli insieme ai testi dei passaggi, per tono e coerenza con le guide.


## Problemi aperti
- Primo giro reale di GitHub Actions al primo push; abilitare GitHub Pages con sorgente "GitHub Actions".
- Nome utente GitHub da inserire in `REPO_URL` (`src/ui/views/impostazioni.js`) per il collegamento nella sezione Informazioni.
- Da verificare su dispositivo: **tastiera numerica iOS** in italiano (i campi hanno `inputmode="decimal"`, la virgola è accettata), Safari su iPhone e Android con Chrome. In fase 4 la prova è stata fatta solo in Chrome desktop, con emulazione del telefono.
- Verifiche nei browser della fase 5: in Chrome da `file://` tutto disponibile (contesto sicuro, Web Crypto, localStorage, appunti). **Da fare a mano** in Edge, Firefox, Safari e sui telefoni con la lista `docs/verifiche-browser-fase5.md` (compresi lo spazio condiviso tra file aperti da cartelle diverse e il CSV aperto in Excel); i risultati vanno nella sezione "Browser e apertura da disco" della guida all'uso (`src/guides/uso/03-risultati-dati.html`, `id="uso-browser"`), oggi scritta con formulazioni prudenti.
- `npm run e2e` in CI: da valutare in fase 7 (serve Chrome nel runner; `CHROME_PATH` già supportato).
- Peso del file unico: controllo `npm run size` a ogni build (fase 6: 630.611 byte, 60,1%, di cui guide 126 KB; restano circa 405 KB).
- Salvataggio di Safari: può cancellare i dati locali dopo un periodo di inattività. La nota è accanto all'interruttore e nella guida all'uso (Memorizza i dati, Browser).

## Prossima conversazione
**Titolo:** Fase 7 · Verifica finale (con revisione indipendente) e rilascio v1
**Modello:** Opus 5.5 · **Impegno:** Medio

**Prompt da incollare:**

> Iniziamo la fase 7: verifica finale (con revisione indipendente) e rilascio v1 del Calcolatore Subnet.
>
> Leggi STATO_PROGETTO.md, 01_specifiche_progetto.md e 02_specifica_tecnica_v1.md (soprattutto le sezioni 0, 2.4, 2.5, 9.7, 10.5 e 11). Poi conferma modello e impegno per questa fase.
>
> Il codice della fase 6 è [nel repository GitHub `calcolatore-subnet`, collegato alla sessione / nell'archivio calcolatore-subnet-fase6.zip che allego]: lavora lì, con un commit per passo; se non puoi pubblicare sul repository, consegnami un archivio aggiornato.
>
> [Facoltativo: risultati delle prove di `docs/verifiche-browser-fase5.md`, incollati qui; il mio nome utente GitHub per `REPO_URL`.]
>
> Obiettivo:
> - revisione indipendente, fatta da un agente separato che non ha scritto il codice, su motore, interfaccia, export, sessione e busta cifrata, guide e test, con un elenco di difetti ordinato per gravità; correzione di quelli bloccanti per la v1, gli altri annotati per la fase 8;
> - controllo dei requisiti della v1 (specifiche, sezioni 2–6; specifica tecnica, sezioni 0 e 9) con una tabella requisito → dove è fatto → come è verificato;
> - se arrivano i risultati delle prove nei browser: aggiornamento della sezione "Browser e apertura da disco" della guida all'uso ed eventuali correzioni;
> - `npm run e2e` in GitHub Actions (Chrome del runner, `CHROME_PATH`), con le schermate come artefatto;
> - valutazione del manifest PWA (specifiche, sezione 2) e decisione;
> - rilascio: versione 1.0.0 in `package.json`, `REPO_URL` se conosco il nome utente, CHANGELOG, nota di rilascio, tag `v1.0.0` e istruzioni per Release e GitHub Pages;
> - tutti i controlli verdi: test, copertura, oracolo, `npm run check`, `npm run size`, `npm run e2e`.
>
> Prima di scrivere codice proponimi l'elenco degli interventi e l'ordine di lavoro; dopo la mia conferma procedi, esegui test e controlli e riportami i risultati. Alla fine aggiorna STATO_PROGETTO.md con titolo e prompt per la fase 8.

## Fasi successive
- Fase 8 · Revisione finale di Paolo su applicazione e guide · Opus 5.5 · Impegno medio
