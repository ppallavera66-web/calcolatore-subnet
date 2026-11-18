# Stato del progetto: Calcolatore Subnet

Ultimo aggiornamento: 19 novembre 2026

## Fase corrente
**Fase 4 · Interfaccia, navigazione mobile, temi**
Modello consigliato: **Opus 5.5** (prima stesura), poi Sonnet 5.5 per le iterazioni · Impegno: **Alto**, poi medio
Contenuto: interfaccia completa al posto del guscio di collaudo, secondo la sezione 9 di `02_specifica_tecnica_v1.md` (schermate, layout, navigazione con frammento, componenti, temi, font, accessibilità, stampa), sopra il motore della fase 3.

**Prima di iniziare (azione per Paolo):** pubblicare su GitHub l'archivio della fase 3 (vedi "Repository" più sotto) e, se si vuole che la fase 4 lavori direttamente sul repository, collegare l'account GitHub nelle impostazioni di claude.ai (Connettori). In alternativa basta allegare l'archivio alla conversazione.

## Repository
- Repository locale con storia git (un commit per passo, ramo `main`), consegnato come archivio `calcolatore-subnet-fase3.zip` alla fine della fase 3: l'account GitHub non era collegato a Claude, quindi non è stato possibile pubblicarlo dalla sessione.
- Per pubblicarlo nel repository pubblico vuoto `calcolatore-subnet`: estrarre l'archivio, entrare nella cartella ed eseguire `git remote add origin https://github.com/<utente>/calcolatore-subnet.git` e `git push -u origin main`.
- Dopo il primo push: in GitHub, Settings → Pages → Source: **GitHub Actions**, per la pubblicazione HTTPS dal ramo `main`. Il primo giro reale della CI avviene con quel push (in locale tutti i passi del workflow sono già stati eseguiti su un clone pulito).

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

## Scelte tecniche della fase 3 (dove la specifica non decideva)
- **Codici aggiunti**: `MASK_OCTET_VALUE` e `MASK_NONCONTIGUOUS` anche come errori, sul campo `mask`, per una mask non valida dentro `IP mask` o `IP/mask` (caso E della 10.2); `ACL_NAME_FORMAT` e `ACL_ACTION_VALUE` per F10; motivi `BOTH_BLOCK_TOO_SMALL` e `BOTH_CONFLICT` per F05 caso C.
- **Parametri**: gli indici degli ottetti sono da 0 (l'interfaccia mostra l'ordinale); gli indirizzi negli avvisi sono stringhe puntate, pronte per i testi.
- **API in più**: `parseMask`, `parsePrefixOrMask`, `parseAddressWithPrefix`, `parseCount`; versioni su testo per tutte le funzioni (`analyzeText`, `classifyText`, `prefixForHostsText`, `prefixForSubnetsText`, `prefixForBothText`, `subdivideText`, `sameSubnetText`, `snippetsText`); `methodsFor`, `resolveMethod`. `subnetAt` e `indexOf` ricevono rete e prefisso del blocco separati.
- **Moduli in più**: `steps/common.js` (strumenti comuni) e `steps/convert.js` (passaggi di F02); `src/ui/globals.d.ts` per la versione iniettata da Vite.
- **Testi dei passaggi** già scritti in fase 3 (la 2.2 prevedeva solo gli errori), così il test di completezza copre anche i passaggi. Saranno rivisti con la guida nella revisione finale.
- **Larghezza in F02**: se il valore non entra nella larghezza richiesta (per esempio 256 con 8 bit), si usa la larghezza minima sufficiente.
- **Vite**: `base: './'` per l'apertura da disco; versione dell'app iniettata come `__APP_VERSION__`.
- **Guida v0.3 non copiata in `docs/`**: entra nel repository in fase 6, in `src/guides/`, presa dal progetto.

## Segnalazioni da applicare nella revisione finale
- Guida, widget del cap. 7 e 15: la funzione `analyze()` tratta /8, /16, /24 come "confine sull'ottetto" senza numero magico; l'app segue la convenzione "1 · ottetto". Si risolve in fase 6 con la sostituzione dei widget (difetto n. 6).
- Guida, cap. 6 e cheat sheet: valutare l'aggiunta della convenzione per **/0** (M = 256 nel 1° ottetto, decisa in fase 2) e delle righe /0–/7 nella cheat sheet.
- Guida, cap. 4: eventuali blocchi speciali aggiuntivi (per esempio 198.18.0.0/15, 192.0.0.0/24) solo insieme all'app (decisione m11).
- Testi dei passaggi didattici (`strings.it.js`): rileggerli insieme alla guida, per tono e coerenza con i capitoli.

## Problemi aperti
- Primo giro reale di GitHub Actions al primo push; abilitare GitHub Pages con sorgente "GitHub Actions".
- Difetto noto n. 6 della guida (widget interni da sostituire con collegamenti "Apri nel calcolatore"): **fase 6**.
- Da verificare in **fase 4**: tastiera numerica iOS in italiano (virgola al posto del punto, già accettata dal motore), contrasto dei componenti nuovi nei quattro temi, peso del file con i font IBM Plex incorporati.
- Da verificare in **fase 5**: Web Crypto API, localStorage e appunti con la pagina aperta da `file://` in Chrome, Edge, Firefox, Safari.
- Peso del file unico: controllo `npm run size` a ogni build (fase 3: 42.874 byte).

## Prossima conversazione
**Titolo:** Fase 4 · Interfaccia, navigazione mobile, temi
**Modello:** Opus 5.5 · **Impegno:** Alto (le iterazioni successive con Sonnet 5.5, impegno medio)

**Prompt da incollare:**

> Iniziamo la fase 4: interfaccia, navigazione mobile e temi del Calcolatore Subnet.
>
> Leggi STATO_PROGETTO.md, 01_specifiche_progetto.md e 02_specifica_tecnica_v1.md (soprattutto le sezioni 2, 3, 4 e 9); usa guida-subnetting.html (v0.3) come riferimento per variabili dei temi, colori di rete e host e stile. Poi conferma modello e impegno per questa fase.
>
> Il codice della fase 3 è [nel repository GitHub `calcolatore-subnet`, da collegare alla sessione / nell'archivio calcolatore-subnet-fase3.zip che allego]: lavora lì, con un commit per passo; se non puoi pubblicare sul repository, consegnami un archivio aggiornato.
>
> Obiettivo, secondo la sezione 9 della specifica tecnica:
> - sostituire il guscio di collaudo con l'interfaccia vera in src/ui (main, router, state, theme, format) e src/styles (tokens, base, layout, components, print);
> - schermate: Calcola (Analisi con F04 e F10 base nella scheda risultato, Conversioni, Mask, Stessa subnet), Pianifica (Calcolo inverso nei casi A, B, C; Suddivisione a pagine con "vai alla subnet che contiene l'IP"; Piani salvati come segnaposto per la fase 5), Guide (segnaposto per la fase 6), Impostazioni (interruttori e tema, per ora solo in memoria);
> - layout delle 9.2 (barra in basso sotto 720 px, schede, barra laterale da 980 px), navigazione con frammento della 9.3, componenti della 9.4 (campo IP, prefisso o mask con cursore, calcolo dal vivo, scheda risultato con copia, pannello dei passaggi con righe binarie colorate e collegamento al capitolo, pulsante "torna su"), barra di export predisposta ma collegata in fase 5;
> - temi Automatico, Chiaro, Scuro, Alto contrasto con le variabili della guida; font IBM Plex incorporati (D3) con licenza OFL; stampa della 9.9; accessibilità della 9.7;
> - test per format.js, router e stato; prova nel browser (desktop e mobile, quattro temi, tastiera, apertura da disco); npm run size sotto 1 MB.
>
> Prima di scrivere codice proponimi l'elenco degli interventi e l'ordine di lavoro; dopo la mia conferma procedi, esegui test e controlli e riportami i risultati. Alla fine aggiorna STATO_PROGETTO.md con titolo e prompt per la fase 5.

## Fasi successive
- Fase 5 · Impostazioni, persistenza, export/import, cifratura · Opus 5.5 · Impegno alto
- Fase 6 · Integrazione delle due guide e collegamenti con l'app · Sonnet 5.5 · Impegno medio
- Fase 7 · Verifica finale (con revisione indipendente) e rilascio v1 · Opus 5.5 · Impegno medio
- Fase 8 · Revisione finale di Paolo su applicazione e guide · Opus 5.5 · Impegno medio
