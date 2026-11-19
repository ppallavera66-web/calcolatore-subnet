# Registro delle modifiche

Formato ispirato a [Keep a Changelog](https://keepachangelog.com/it/1.1.0/); versioni secondo [Semantic Versioning](https://semver.org/lang/it/).

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

[1.0.0]: https://github.com/ppallavera66-web/calcolatore-subnet/releases/tag/v1.0.0
