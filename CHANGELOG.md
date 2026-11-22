# Registro delle modifiche

Formato ispirato a [Keep a Changelog](https://keepachangelog.com/it/1.1.0/); versioni secondo [Semantic Versioning](https://semver.org/lang/it/).

## [1.1.1] · 22 novembre 2026

Correzioni di testo nell'app e nelle due guide, dalla rilettura della fase 9. Nessuna funzione nuova, nessun cambiamento ai calcoli né ai formati dei file.

**Le note di revisione di Paolo** (Errore, Chiarezza, Mancanza, Taglio) **non sono incluse**: richiedono di rivedere pezzo per pezzo app e guide, e arriveranno in una versione successiva, insieme alla guida al subnetting v1.0.

### Interfaccia
- **Calcolo inverso**: "Host di scorta" al posto di "Indirizzi di scorta", anche nell'export: il valore conta gli host (43 host in un /26 → 19 di scorta).
- **Gateway fuori dalla subnet**: l'avviso di Stessa subnet dice la stessa cosa dei cap. 15 e 18: a seconda del sistema operativo la configurazione viene rifiutata oppure accettata con risultati imprevedibili.
- **Import della sessione**: il riepilogo parla di "calcoli", come l'anteprima ("Importati 34 calcoli e 2 piani"); plurali corretti negli avvisi ("1 etichetta non valida esclusa").
- Separatore delle migliaia nell'etichetta della colonna dei piani ("subnet n. 65.536").

### Guide
- **Guida al subnetting v0.5**, ancora "versione di studio":
  - l'apertura non presenta più VLSM e summarization come funzioni già presenti;
  - cap. 11: perché un laboratorio da 60 postazioni non va in un /26;
  - cap. 14: "valori pari del terzo ottetto";
  - cap. 15 e 18: stessa descrizione del gateway fuori dalla subnet;
  - cap. 18: "Casi limite: /30, /31, /32 e /0", come il contenuto;
  - appendice C riscritta come **"Il calcolatore e la guida"**: per ogni capitolo la scheda dell'app che lo mette in pratica, o la versione in cui arriverà.
- **Guida all'uso**: "Browser e apertura da disco" dice solo quello che è stato provato (Chrome sul computer); "host di scorta" nel calcolo inverso.
- `docs/verifiche-browser-fase5.md`: le prove partono dalla Release più recente.

### Verifica
- 1.081 test (erano 1.072); copertura 99,6% istruzioni, 97,2% rami, 99,8% funzioni.
- Oracolo: 82.575 casi, 0 differenze, fixture invariati.
- 66 prove nel browser (erano 64), in Chrome da `file://`.

### Ancora da fare
- Note di revisione di Paolo su app e guide; guida al subnetting v1.0.
- Prove in Edge, Firefox, Safari e sui telefoni ([`docs/verifiche-browser-fase5.md`](docs/verifiche-browser-fase5.md)); lettori di schermo reali.

## [1.1.0] · 21 novembre 2026

Revisione finale tecnica: le segnalazioni "Per la fase 8" della revisione indipendente ([`docs/revisione-fase7.md`](docs/revisione-fase7.md)) e quelle raccolte nello stato del progetto. Nessuna funzione nuova, nessun cambiamento ai formati dei file, tranne la busta cifrata, che rifiuta i campi in più.

### Calcoli e passaggi
- **Tipo di indirizzo**: due blocchi speciali in più, 192.0.0.0/24 (assegnazioni IETF, RFC 6890) e 198.18.0.0/15 (benchmark, RFC 2544), anche nella tabella del cap. 4.
- **Errori sul campo giusto**: una mask non valida scritta insieme all'indirizzo (per esempio nel campo B di Stessa subnet o nel Blocco di Suddivisione) dà l'errore sotto quel campo.
- **Conteggi enormi**: oltre 2^32 host o subnet il messaggio dice che il numero è troppo grande, con il testo scritto, invece di un valore arrotondato.
- **Mask**: con zeri iniziali (255.255.255.000) un messaggio che indica l'ottetto; "/255.255.255.0" accettata nel campo del prefisso.
- **Passaggi didattici**:
  - frasi vere anche ai bordi: niente "255 a destra" senza ottetti a destra, niente "scavalca" nell'ultimo blocco dello spazio IPv4, sequenza con 2 subnet;
  - plurali, maiuscole e formulazioni ("1 bit preso in prestito", "ne avanza 1", "ma ne servono 3", caso C senza "al massimo/almeno");
  - con una mask non valida la riga binaria mostra 1 e 0 bit per bit, senza un confine rete/host.

### Dati
- Cronologia e piani ordinati per istante, anche con i millisecondi facoltativi.
- All'avvio l'avviso degli elementi esclusi conta anche la cronologia illeggibile e le etichette scartate.
- **Busta cifrata**: un campo in più nell'intestazione (non autenticato) fa rifiutare il file prima della passphrase.

### Interfaccia e accessibilità
- Barra di export navigabile con le frecce (modello ARIA della toolbar).
- Messaggi brevi emessi dopo la chiusura delle finestre, così i lettori di schermo li leggono; lo stesso annuncio non si ripete.
- Guide a 390 px: selettore del tema, collegamenti rapidi e riquadro del glossario da 44 px.
- Frammento riscritto con una pagina fuori intervallo o un caso sconosciuto; un piano eliminato non resta nei collegamenti.
- Suddivisione: "Trova" fuori dal blocco toglie l'evidenziazione; stampa con "/24".
- Analisi: `f10=1` apre "Wildcard e configurazione" (collegamenti del cap. 14); senza IP nessun errore finché non si preme Invio.

### Guide
- **Guida al subnetting v0.4, versione di studio** (non più "da revisionare"): convenzione di /0 nel cap. 6, righe /0–/7 nella cheat sheet, nuovi blocchi nel cap. 4, blocchi binari più stretti sul telefono.
- **Guida all'uso**: ordine dei pulsanti di export, "Vai alla validazione della mask", "Apri in Analisi", frecce nella barra; ogni nome di pulsante citato è verificato contro l'interfaccia.

### Verifica
- 1.072 test (erano 1.037), anche con altri tre semi per le proprietà; copertura 99,6% istruzioni, 97,2% rami, 99,8% funzioni.
- Oracolo esteso: ambito e blocco principale di F04, motivo e suggerimenti di F03, offset, ruolo e reti adiacenti di F01 (82.575 casi, 0 differenze).
- 64 prove nel browser (erano 52), in Chrome da `file://`.

### Ancora da fare
- Prove in Edge, Firefox, Safari e sui telefoni ([`docs/verifiche-browser-fase5.md`](docs/verifiche-browser-fase5.md)); lettori di schermo reali.
- Revisione dei contenuti delle due guide e dei testi con le note di Paolo: v1.2.

## [1.0.0] · 19 novembre 2026

Prima versione pubblica: un unico file HTML che funziona offline, da disco o da un web server.

### Funzioni
- **Calcola**:
  - **Analisi** (F01), con il tipo di indirizzo (F04) e la sezione "Wildcard e configurazione" (F10 base: ACL standard, ACL con nome, OSPF);
  - **Conversioni** (F02): numero in base 2, 10, 16, indirizzo, prefisso e mask;
  - **Mask** (F03): validazione con il motivo e due mask valide suggerite;
  - **Stessa subnet** (F07): anche con prefissi diversi e con il gateway.
- **Pianifica**:
  - **Calcolo inverso** (F05): host, subnet o entrambi;
  - **Suddivisione** (F06): a pagine, fino a /0 → /32, con "Vai alla subnet che contiene l'IP";
  - **Piani salvati**, con nome, note ed etichette per subnet.
- **Modalità didattica** (F12): passaggi con il metodo binario, del numero magico o dei multipli, ognuno con il collegamento al capitolo della guida.
- **Export**: copia, CSV (`;`, BOM, protezione dalle formule), JSON, Markdown, testo, stampa/PDF, snippet; intervalli di righe per Suddivisione.
- **Sessione JSON**: export e import con anteprima, Sostituisci o Unisci, validazione di ogni campo; **cifratura facoltativa** AES-256-GCM con PBKDF2-SHA-256 (600.000 iterazioni) tramite Web Crypto.
- **Memorizza i dati** (facoltativo, spento per default) in questo browser, con più schede e con la conferma prima di cancellare o sovrascrivere.
- **Temi**: Automatico, Chiaro, Scuro, Alto contrasto. **Accessibilità**: obiettivo WCAG 2.2 AA (tastiera, focus visibile, annunci, aree di tocco ≥ 44 px).
- **Guide integrate**:
  - **guida all'uso**, con i pulsanti "?";
  - **guida al subnetting v0.4**, con indice, glossario e 45 collegamenti "Apri nel calcolatore".
- Navigazione con indirizzo (`#/calcola/analisi?ip=…&p=…`), cronologia della visita, pulsante "torna su", font IBM Plex incorporati (OFL).

### Verifica
- 1.037 test (Vitest e fast-check).
- Oracolo indipendente in Python (`ipaddress`, 74.535 casi, 0 differenze).
- 52 prove nel browser in Chrome da `file://`, con axe-core e senza richieste di rete.
- Revisione indipendente della fase 7: [`docs/revisione-fase7.md`](docs/revisione-fase7.md).
- Requisiti: [`docs/verifica-requisiti-v1.md`](docs/verifica-requisiti-v1.md).

### Correzioni dalla revisione della fase 7
- **Persistenza**: un'altra scheda non sostituisce più i dati della visita quando qui il salvataggio è spento; prima di sovrascrivere dati illeggibili o di una versione più recente si chiede conferma.
- **Calcoli e passaggi**:
  - "100.0" o "2.5" host danno un errore invece di diventare 1000 e 25;
  - il metodo dei multipli non dice più "è il broadcast" per /31 e /32;
  - il nome di un'ACL deve iniziare con una lettera.
- **Dati**:
  - CSV protetto anche dalle formule precedute da spazi;
  - area OSPF importata validata;
  - Unisci dice quanti elementi restano fuori per i limiti;
  - chiudere la finestra durante la cifratura annulla l'export;
  - un piano non si apre più su una suddivisione diversa.
- **Accessibilità**:
  - focus mai sotto le barre fisse né perso quando la vista si ridisegna;
  - "torna su" nascosto non raggiungibile;
  - Conversioni annuncia i risultati;
  - segnaposto a 4,5:1;
  - Invio conferma le finestre.

### Non incluso
- VLSM (F08), summarization (F09), allenamento (F13), export XLSX, snippet avanzati: v2.
- IPv6 (F11): v3.
- Manifest PWA: non nella v1 ([`docs/decisione-pwa.md`](docs/decisione-pwa.md)).
- Prove in Edge, Firefox, Safari e sui telefoni: da fare ([`docs/verifiche-browser-fase5.md`](docs/verifiche-browser-fase5.md)).

[1.1.1]: https://github.com/ppallavera66-web/calcolatore-subnet/releases/tag/v1.1.1
[1.1.0]: https://github.com/ppallavera66-web/calcolatore-subnet/releases/tag/v1.1.0
[1.0.0]: https://github.com/ppallavera66-web/calcolatore-subnet/releases/tag/v1.0.0
