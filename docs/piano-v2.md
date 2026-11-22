# Calcolatore Subnet: piano della v2

Versione 1.0 · 22 novembre 2026 · Stato: approvato da Paolo (fase 10)

Documenti collegati: `01_specifiche_progetto.md` (v1.2), `02_specifica_tecnica_v1.md`, `03_specifica_tecnica_v2.md` (dettaglio tecnico di tutto ciò che segue), `STATO_PROGETTO.md`.

---

## Indice

1. Ambito della v2
2. Suddivisione in fasi
3. Decisioni della fase 10
4. Voci aperte

---

## 1. Ambito della v2

Per ogni funzione: che cosa entra nella 2.0.0 e che cosa resta fuori. Le funzioni rimaste fuori si potranno valutare dopo la 2.0.0, senza impegni di data.

### 1.1 F08 · Pianificatore VLSM (cap. 16)

**Entra**
- Un blocco (`IP/prefisso`, normalizzato alla rete) e un elenco di **segmenti**, ciascuno con nome e host richiesti; fino a 256 segmenti.
- Prefisso di ogni segmento con il calcolo inverso (F05); assegnazione **dal più grande al più piccolo**, a parità di dimensione nell'ordine dato, come nel cap. 16. Ogni subnet parte dal broadcast della precedente + 1 e risulta sempre allineata.
- Opzioni: **margine di crescita** unico per tutti i segmenti (0, 25, 50, 100%, non applicato ai segmenti da 1 o 2 host); **collegamenti punto-punto come /31** e host singoli come /32 (RFC 3021), spento per default (/30 come nella guida).
- Risultato: tabella dei segmenti (anche nell'ordine dato), **spazio libero** come elenco di blocchi CIDR, indirizzi usati e percentuale di utilizzo. Se il piano non entra, l'errore indica gli indirizzi necessari e il **prefisso minimo** del blocco che lo conterrebbe.
- Segmenti **incollati da un foglio di calcolo** (colonne nome e host separate da tabulazione, `;` o `,`).
- Passaggi didattici (cap. 16 e 11); "Salva come piano" (tipo `vlsm`), cronologia, export in tutti i formati, collegamenti "Apri in Analisi" e "Apri in Suddivisione" per ogni subnet.
- Dal Calcolo inverso, caso C non fattibile: collegamento al pianificatore con il blocco già scritto.

**Resta fuori**
- Posizioni fissate a mano, subnet già esistenti da evitare, ordine diverso da quello decrescente.
- Più blocchi di partenza, assegnazione automatica tra sedi.
- Margine di crescita diverso per ogni segmento.

### 1.2 F09 · Summarization con avviso di riassunto troppo largo (cap. 17)

**Entra**
- Un elenco di reti `IP/prefisso` (una per riga, oppure separate da virgole o spazi), fino a 1.024; ogni rete normalizzata; doppioni e reti contenute in altre segnalati e tolti.
- **Riassunto unico**: il prefisso più lungo che contiene tutte le reti. Se contiene indirizzi che non fanno parte delle reti date, avviso **"riassunto troppo largo"**, con il numero di indirizzi in più e l'elenco dei blocchi estranei.
- **Riassunto esatto**: il numero minimo di rotte che coprono esattamente le reti date (le "due o più rotte riassuntive" del cap. 17).
- Passaggi didattici: metodo binario dei bit in comune e metodo rapido (potenza di 2 e multiplo di N), quest'ultimo solo quando le reti sono contigue e della stessa dimensione.
- "Salva come piano" (tipo `summary`), cronologia, export in tutti i formati.

**Resta fuori**
- Tabelle di routing con next hop, metriche o protocolli.
- Ricerca del miglior compromesso (al massimo N rotte con il minimo di indirizzi estranei).
- Reti IPv6 (con F11, v3).

### 1.3 F13 · Allenamento con verifica della risposta e tempi (cap. 8)

**Entra**
- Cinque tipi di esercizio: **analisi** (rete, broadcast, primo e ultimo host, numero di host, come gli esercizi del cap. 8), **mask ↔ prefisso**, **calcolo inverso** (host → prefisso), **stessa subnet** (sì o no), **wildcard**.
- Tre livelli (prefissi nell'ultimo ottetto, nel terzo, nel secondo e casi limite /31, /32); indirizzi **solo nei blocchi privati RFC 1918**, come nella guida.
- Serie di 5, 10 o 20 esercizi oppure modalità libera; **verifica campo per campo**, con la risposta giusta e il collegamento ai passaggi del metodo scelto.
- **Tempi**: per esercizio e per serie; statistiche per tipo e livello (risposte giuste, tempo medio, tempo migliore).
- **Serie condivisibile**: il seme della serie nel collegamento, così la stessa serie si può dare a più persone (per esempio in aula).
- Tentativi salvati nella sessione e con "Memorizza i dati" (al massimo 500).

**Resta fuori**
- Classifiche, account, raccolta dei risultati di una classe.
- Esercizi di VLSM e summarization (possibili dopo la 2.0.0).
- Limite di tempo con conto alla rovescia.

### 1.4 Export XLSX

**Entra**
- Formato XLSX per tutti i risultati che oggi hanno l'export (F01–F07, F10) e per F08 e F09: un foglio per tabella, intestazione in grassetto e bloccata, numeri come numeri con il separatore delle migliaia, indirizzi come testo; "Includi i passaggi" come foglio a parte.
- Stesso limite di righe del CSV (65.536 per F06, con la scelta dell'intervallo oltre).
- **Scrittore nostro** (decisione V5): circa 5 KB, nessuna libreria esterna.

**Resta fuori**
- Formule, grafici, formattazione condizionale, fogli protetti.
- ODS, export della sessione in XLSX, **import** da XLSX (per i segmenti di F08 basta incollare).

### 1.5 Snippet avanzati (F10, cap. 14)

**Entra**
- **Cisco IOS, ACL estese**: numerate (100–199, 2000–2699) e con nome; protocollo `ip`, `tcp`, `udp`, `icmp`; origine = la subnet; destinazione `any`, un host o un'altra subnet; porta di destinazione `eq` per TCP e UDP.
- **Juniper Junos**: `prefix-list` e termine di un `firewall filter` con `source-prefix-list`.
- **MikroTik RouterOS 7**: `address-list`, regola di `filter` con `src-address-list`, `interface-template` OSPF con `networks`.
- **Linux nftables**: regola con `ip saddr` e insieme con `flags interval`.
- Ogni blocco porta una riga di commento con il produttore e l'avviso di verificare la sintassi sul proprio apparato.

**Resta fuori**
- Altri produttori (HPE Comware, Huawei VRP, Fortinet, pfSense…).
- Snippet per un piano intero (tutte le subnet di un VLSM, rotte riassuntive di F09).
- Intervalli di porte, porte di origine, opzioni `log`, `established`.

### 1.6 Altro nella 2.0.0

- **Sessione v2** con migrazione dalla v1 (decisione V4).
- **Guide**: capitoli 8, 11, 14, 16, 17 e appendice C collegati alle funzioni nuove; guida all'uso con le sezioni nuove; guida al subnetting **v0.6** durante lo sviluppo, **v1.0** con le note di Paolo (fase 15).
- **Note di revisione di Paolo** (Errore, Chiarezza, Mancanza, Taglio) su app e guide: fase 15 (decisione V1).

### 1.7 Fuori dalla 2.0.0

- **Manifest PWA** (decisione V9).
- **F11 IPv6** (v3).

---

## 2. Suddivisione in fasi

Una fase per conversazione, come nella v1. All'inizio di ogni fase si propone l'elenco degli interventi e si attende la conferma di Paolo; alla fine si aggiorna `STATO_PROGETTO.md` con titolo e prompt della fase successiva. Ogni fase di sviluppo si chiude con una **beta** (decisione V3), il cui tag lo pubblica Paolo.

| Fase | Titolo | Contenuto | Modello | Impegno |
|---|---|---|---|---|
| 11 | VLSM e summarization | Motore e passaggi di F08 e F09, oracolo; schermate VLSM e Riassunto; piani `vlsm` e `summary`, sessione v2 con migrazione, persistenza; export nei formati v1; cap. 11, 16, 17; guida all'uso; CI per beta e Pages dai tag. Beta `2.0.0-beta.1` | Opus 5.5 | Alto |
| 12 | Allenamento | Generatore a seme e verifica (F13); schermata Allenamento; tentativi nella sessione e nella persistenza; statistiche; serie condivisibile; cap. 8, appendice C; guida all'uso. Beta `2.0.0-beta.2` | Opus 5.5 | Alto |
| 13 | Export XLSX e snippet avanzati | Scrittore XLSX con prova in Python; XLSX in tutte le barre di export; snippet Cisco estesi, Junos, RouterOS, nftables; cap. 14, appendice C; guida all'uso; `docs/verifiche-browser` aggiornata (XLSX in Excel e LibreOffice). Beta `2.0.0-beta.3` | Opus 5.5 | Medio |
| 14 | Verifica finale v2 | Revisione indipendente con tre revisori (motore; dati ed export; interfaccia, accessibilità e guide), come nella fase 7; correzione dei bloccanti; `docs/verifica-requisiti-v2.md`; release candidate `2.0.0-rc.1` | Opus 5.5 | Medio |
| 15 | Revisione di Paolo e rilascio 2.0.0 | Note di Paolo su app e guide applicate in un colpo solo; guida al subnetting **v1.0**; esiti delle prove nei browser, se ci sono; rilascio **2.0.0** | Opus 5.5 | Medio |

Stima: 5 conversazioni (3 di sviluppo, una di verifica, una di revisione), contro le 2–3 della stima iniziale, che non contava verifica e revisione: nella v1 sono state le fasi 7, 8 e 9.

### 2.1 Criteri di accettazione comuni a ogni fase

- Test verdi in locale e su GitHub Actions (`test`, `e2e`); copertura di motore, testi, export, sessione e storage ≥ 95% di istruzioni e di rami.
- Oracolo Python: 0 differenze, fixture rigenerati identici.
- `npm run check` senza errori; test di architettura verde con i moduli nuovi.
- Peso del file entro il budget della fase (decisione V10); `npm run size` riportato nello stato.
- axe-core WCAG 2.2 AA senza violazioni sulle schermate nuove, in tutti i temi e a 390 px.
- Ogni difetto corretto ha un test che fallisce senza la correzione.
- Nessun cambiamento ai risultati delle funzioni v1: l'oracolo v1 resta identico.
- Guida all'uso e guida al subnetting allineate alle schermate nuove (i test dei collegamenti e dei nomi dei pulsanti coprono anche le parti nuove).
- `CHANGELOG.md`, nota di rilascio della beta, `STATO_PROGETTO.md` con titolo e prompt della fase successiva.

### 2.2 Criteri di accettazione per fase

**Fase 11**
- F08: gli esempi della specifica tecnica v2 (3.2), compreso quello del cap. 16, coincidono con l'oracolo; proprietà: subnet disgiunte, allineate, dentro il blocco, ciascuna con host ≥ richiesti; spazio libero + subnet = blocco.
- F09: esempi della 3.3 (compresi i due del cap. 17); proprietà: il riassunto esatto copre esattamente l'unione delle reti date ed è minimo (coincide con `collapse_addresses`); il riassunto unico contiene tutte le reti ed è il più lungo possibile.
- Sessione: un file v1 si importa e diventa v2 (migrazione provata con il corpus v1 esistente); un file v2 con un piano non valido viene scartato con il conteggio; dati salvati v1 caricati all'avvio e riscritti come v2.
- e2e: VLSM da tastiera e da incolla, piano salvato e riaperto, Riassunto con avviso, telefono a 390 px.
- Pages pubblicato dal tag della beta.

**Fase 12**
- Generatore: stesso seme → stessa serie (test con fixture); tutti gli indirizzi nei blocchi RFC 1918; distribuzione dei livelli e dei tipi provata a proprietà.
- Verifica: ogni risposta giusta in tutte le forme ammesse (3.4 della specifica) viene accettata; ogni risposta sbagliata viene rifiutata; il risultato atteso coincide con quello di F01, F03, F05, F07, F10.
- Tempi misurati con `performance.now()` nell'interfaccia, mai nel motore; statistiche ricalcolate dai tentativi.
- e2e: serie completa da tastiera, collegamento con il seme che riproduce la serie, tentativi salvati e ricaricati.

**Fase 13**
- XLSX: file riletti da `openpyxl` in CI con valori, tipi, fogli e intestazione bloccata attesi; testi che iniziano con `=` restano testo; file di F06 da 65.536 righe; compressione attiva dove c'è `CompressionStream`, file non compresso altrimenti (entrambi letti correttamente).
- Snippet: righe di riferimento per ogni produttore controllate a tabella; limiti dei numeri delle ACL estese; porte solo con TCP e UDP.
- Prova manuale di Paolo: un XLSX aperto in Excel (voce in `docs/verifiche-browser-fase5.md`).

**Fase 14**
- Nessun bloccante aperto (criterio della fase 7); requisiti v2 tutti con esito.

**Fase 15**
- Ogni nota di Paolo con il suo esito; guida al subnetting v1.0; Release 2.0.0 "Latest".

---

## 3. Decisioni della fase 10

Tutte approvate da Paolo il 22 novembre 2026, come raccomandate.

| N. | Tema | Decisione |
|---|---|---|
| V1 | Note di Paolo e versione 1.2.0 | Nessuna 1.2.0 separata: le note su app e guide si applicano **insieme, alla fine**, nella fase 15, con la guida al subnetting v1.0 e il rilascio 2.0.0. È coerente con la scelta di rivedere tutto in un colpo solo e evita di rileggere due volte i capitoli 8, 16 e 17. Un errore di calcolo trovato nel frattempo diventa subito una correzione 1.1.x. |
| V2 | Ordine delle fasi | **Per funzione** (VLSM con Riassunto, poi Allenamento, poi XLSX con snippet), non "prima il motore": ogni fase si chiude con qualcosa che Paolo può provare. |
| V3 | Rilasci intermedi e Pages | Una **beta** alla fine di ogni fase di sviluppo (`2.0.0-beta.N`, Release segnata come pre-release, la "Latest" resta la 1.1.1); poi `2.0.0-rc.1` e `2.0.0`. **Pages pubblica l'ultimo tag**, beta comprese, non più ogni push su `main`. |
| V4 | Schema di sessione | **Versione 2**, con la migrazione 1 → 2. Una 1.1.x davanti a un file v2 dice "aggiorna l'app" invece di scartare i piani nuovi come non validi. Le chiavi del browser restano `subnetcalc:v1:*` (il `v1` indica la disposizione delle chiavi, la versione dello schema sta in `meta`); si aggiunge `subnetcalc:v1:training`. |
| V5 | Export XLSX | **Scrittore nostro** (prova della fase 10: 4,2 KB minificato) con compressione `CompressionStream("deflate-raw")` e file non compresso se manca. Misure della fase 10, solo la scrittura, minificato: SheetJS 0.18.5 da npm 287 KB (versione ferma), ExcelJS 947 KB, write-excel-file 72 KB. |
| V6 | Posto dell'Allenamento | Terza sottoscheda di **Guide** (Guida all'uso · Guida al subnetting · Allenamento), non una quinta voce della barra in basso. |
| V7 | Dati dell'Allenamento | Si salvano i **tentativi** (domanda, risposte, esito, tempo; al massimo 500); le statistiche si ricalcolano. Viaggiano nella sessione e si salvano con "Memorizza i dati". **Serie condivisibile** con il seme nel collegamento. |
| V8 | F08 e F09 nella cronologia | Sì, entro i limiti (256 segmenti, 1.024 reti); per i lavori lunghi "Salva come piano". |
| V9 | Manifest PWA | **Non nella 2.0.0.** Se ne riparla dopo le prove sui telefoni; restano valide le ragioni di `docs/decisione-pwa.md`. |
| V10 | Peso | Stima per la v2: circa +130 KB, fino a circa 770 KB (74% del limite). **Soglia di attenzione 900 KB**, per lasciare spazio all'IPv6 della v3. Budget per fase nella specifica tecnica v2 (2.4). |
| V11 | Modelli e impegno | Opus 5.5 per tutte le fasi; impegno Alto per le fasi 11 e 12, Medio per le fasi 13, 14 e 15 (tabella della sezione 2). |

### 3.1 Azioni per Paolo collegate alle decisioni

- **V3, prima della beta della fase 11**: in GitHub, Settings → Environments → `github-pages` → "Deployment branches and tags", aggiungere una regola per i tag `v*`. L'ambiente creato da Pages di solito ammette solo il ramo predefinito, e senza la regola la pubblicazione da un tag viene rifiutata. La fase 11 indicherà il passaggio con precisione dopo averlo provato.
- **V3, alla fine delle fasi 11–15**: pubblicare il tag dal proprio computer (il proxy della sessione rifiuta il push dei tag), con i comandi indicati in `STATO_PROGETTO.md`.

---

## 4. Voci aperte

| Voce | Dove si chiude | Note |
|---|---|---|
| **Note di revisione di Paolo** (Errore, Chiarezza, Mancanza, Taglio) su app e guide | Fase 15 | Mancano ancora; Paolo le prepara rivedendo pezzo per pezzo la release candidate della fase 14. Segnalazioni sparse nel frattempo: in `STATO_PROGETTO.md`. |
| **Guida al subnetting v1.0** | Fase 15 | Dopo le note di Paolo. Durante lo sviluppo la guida passa alla v0.6 (cap. 8, 11, 14, 16, 17, appendice C). |
| Prove in Edge, Firefox, Safari e sui telefoni | Quando Paolo le fa; esiti nella fase 15 | Lista in `docs/verifiche-browser-fase5.md`; la fase 13 aggiunge le voci di XLSX e Allenamento. Sono anche la condizione per riparlare del manifest PWA (V9). |
| Lettori di schermo reali (NVDA, VoiceOver, TalkBack) | Fase 14 o 15, se Paolo può | Mai provati; le schermate nuove vanno provate anche con un lettore vero. |
| Tag `v1.1.1` | Prima della fase 11 | Preparato nella fase 9, non ancora pubblicato al 22 novembre 2026. |
