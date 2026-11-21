# Revisione indipendente della fase 7

19 novembre 2026 · codice della fase 6 (commit `3e92612`)

Tre revisori separati hanno lavorato su una copia ferma del codice. Nessuno di loro aveva scritto il codice.
- **A**: motore e test.
- **B**: export, sessione, busta cifrata e storage.
- **C**: interfaccia, accessibilità e guide.

Ogni segnalazione è stata riprodotta prima della correzione. Ogni correzione ha un test (Vitest o e2e) che fallisce senza la correzione.

**Criterio "bloccante per la v1"** (concordato con Paolo): un calcolo sbagliato, dati persi o corrotti, una falla in import, busta o export, una funzione inutilizzabile, una violazione WCAG AA in un flusso principale, un requisito v1 mancante. Sono stati corretti anche alcuni difetti segnalati come "importanti" che rientrano in questo criterio: un risultato sbagliato senza avviso, una perdita di dati silenziosa, un annullamento che non annulla.

## Esito in breve

- **Motore**:
  - 0 differenze rispetto a `ipaddress` di Python su circa 55.000 casi nuovi, oltre all'oracolo del progetto;
  - nessuna eccezione su 300.000 input casuali;
  - nessun errore di calcolo negli esempi e negli esercizi della guida al subnetting.
- **Busta cifrata, validazione dell'import, protezione da XSS**: solide.
- **Corretti**: 19 difetti, pari a 21 segnalazioni: due sono state trovate da due revisori (tabella sotto).
- **Per la fase 8**: le altre segnalazioni, nell'elenco in fondo.

## Corretti nella fase 7

| ID | Gravità | Difetto | Correzione | Prova |
|---|---|---|---|---|
| B1 | bloccante | Un'altra scheda che accendeva "Memorizza i dati" sostituiva cronologia e piani non salvati di questa scheda, e qui accendeva il salvataggio | Con il salvataggio spento l'evento `storage` non tocca più i dati della visita; accendendo, i dati già salvati si uniscono a quelli della visita | `persistence.test.js` |
| B2 | bloccante | Con dati salvati illeggibili o di una versione successiva, accendere "Memorizza i dati" li sovrascriveva senza avviso | `needsOverwrite()` e conferma esplicita "Sovrascrivi e salva" | `persistence.test.js` |
| A1 | importante → corretto | Metodo dei multipli: per /31 e /32 il passaggio diceva "è il broadcast" | La frase compare solo da /0 a /30 | P12 esteso (`steps.test.js`) |
| A6 | importante (test) | P12 non verificava la frase sul broadcast | Condizione aggiunta a P12 | come sopra |
| A2 | importante → corretto | "100.0" host diventava 1.000, "2.5" diventava 25 | Separatore delle migliaia solo a gruppi di tre cifre | `ipv4.test.js` |
| A5 | importante → corretto | Nome ACL di sole cifre: IOS lo legge come lista numerata | Il nome deve iniziare con una lettera (specifica 3.6 aggiornata) | `snippets.test.js` |
| I1 | importante → corretto | Unisci toglieva voci attuali oltre il limite di 200 senza dirlo, e la descrizione diceva il contrario | Descrizione corretta; anteprima e riepilogo dicono quanti elementi restano fuori | `strings-ui.test.js`, guida all'uso |
| I2 | importante → corretto | CSV: formula preceduta da spazi non neutralizzata | Protezione anche dopo spazi iniziali e per i simboli a larghezza piena | `export.test.js` |
| I3 / C5 | importante / bloccante | `piano=<id>` con blocco o prefissi diversi apriva il piano sulle subnet sbagliate; etichette fuori intervallo | Il piano si apre solo se i parametri coincidono, altrimenti avviso; etichette solo entro il numero di subnet | `persistence.test.js`, e2e piani |
| I4 | importante → corretto | Area OSPF di un file importato copiata così com'era (caratteri di controllo, MB di spazi) | Solo cifre e punti, al massimo 15 caratteri, forma canonica | `session.test.js` |
| I5 | importante (test) | I test della busta non accertavano l'uso dell'AAD | Prova indipendente in cifratura e in decifratura; la rimozione dell'AAD ora fa fallire i test | `envelope.test.js` |
| I6 | importante → corretto | Esc durante la cifratura chiudeva la finestra ma il file veniva scaricato | Chiudere la finestra annulla davvero l'export e l'anteprima dell'import | e2e busta cifrata |
| M1 / C7 | minore / importante | Invio nei campi delle finestre non confermava | Invio conferma il modulo quando il campo non ha un'azione propria | e2e (passphrase) e piani |
| C1 | bloccante | Su telefono e su schermi medi il controllo con il focus finiva sotto le barre fisse (2.4.11) | `scroll-padding` in alto sotto i 980 px e in basso sotto i 720 px | e2e "con Tab il controllo… non finisce sotto le barre" |
| C2 | bloccante | "Torna su" invisibile ma raggiungibile con Tab (2.4.7) | `visibility: hidden` quando è nascosto | e2e, stessa prova |
| C3 | bloccante | Focus perso su `body` dopo il ridisegno: paginazione, esempi, Salva come piano, piani, cronologia (2.4.3) | Paginazione: focus sul controllo equivalente e annuncio della pagina. Esempi: focus sul primo campo. Negli altri casi: focus al primo controllo della finestra aperta o al titolo della schermata | e2e "focus conservato" |
| C4 | bloccante | Conversioni non annunciava i risultati (9.7, 4.1.3) | Annuncio del riquadro modificato | e2e |
| C6 | importante → corretto | "Apri in Analisi" dal Calcolo inverso perdeva l'IP già scritto | L'IP resta, cambia solo il prefisso | e2e |
| C10 | importante → corretto | Segnaposto sotto 4,5:1 (3,3:1 nel tema chiaro) | Colore del testo secondario, senza opacità | — (stessa variabile verificata da `contrast.test.js`) |

Durante la fase sono state aggiunte anche due prove e2e che non vengono dalla revisione: nessuna richiesta di rete in tutte le prove, e app funzionante con il browser offline (requisito "funziona offline").

## Per la fase 8

**Motore e passaggi**
- **A3**: una mask non valida scritta nel campo B di Stessa subnet (o nel Blocco di Suddivisione) dà l'errore sotto il campo A (o Prefisso). Serve `maskField` in `parseAddressInput`.
- **A4**: conteggi oltre 2^53 mostrano "Serve almeno una subnet" con un valore arrotondato. Proposta: NUMBER_RANGE in `parseCount` e testo originale nei parametri.
- **A7**: frasi dei passaggi false ai bordi:
  - "e 255 a destra" con l'ottetto interessante al 4° posto;
  - "la rete successiva scavalca" alla fine dello spazio IPv4;
  - "ottetti a destra" per /32;
  - sequenza di F06 con 2 subnet.
- **A8**: plurali ("1 bit presi", "ne avanzano 1"), iniziale minuscola, "non ne bastano 3", separatore delle migliaia in HOSTS_RANGE, "al massimo/almeno" nel caso C, ottetto non indicato in `mask-octet-invalid`.
- **A9**: mask con zeri iniziali e `/255.255.255.0` nel campo del prefisso danno il generico MASK_FORMAT.
- **A10**: robustezza di `iterateSubnets` (inizio non intero) e di `subnetAt` (nuovo prefisso più corto). Oggi non sono raggiungibili dall'interfaccia.
- **A11**:
  - P4 ripete l'implementazione;
  - P10 gira 300 volte invece di 1.000;
  - l'oracolo non confronta ambito e blocco principale di F04, motivo e suggerimenti di F03, offset, ruolo e reti adiacenti di F01. Queste parti sono state verificate dalla revisione con una prova differenziale (0 differenze).
- **A12**: specifica 4.1: `values` contiene anche booleani, array e oggetti.

**Dati**
- **M2**: l'ordinamento per data confronta stringhe con millisecondi facoltativi; serve `Date.parse`.
- **M3**: all'avvio non si contano la cronologia non valida né le etichette scartate.
- **M4**: la busta accetta campi in più non autenticati: rifiutarli o documentarlo.

**Interfaccia e guide**
- **C8**: i messaggi brevi emessi con una finestra modale aperta (piano salvato, sessione esportata, riepilogo dell'import) probabilmente non vengono letti dai lettori di schermo; vanno emessi dopo la chiusura.
- **C9**: i collegamenti del cap. 14 ("wildcard e ACL", "wildcard e OSPF") aprono Analisi con la sezione F10 chiusa.
- **C11**: aree di tocco di 40 e 32 px nelle guide a 390 px (selettore del tema, collegamenti rapidi, riquadro del glossario).
- **C12**: frammento non normalizzato con `pg` fuori intervallo o `caso` sconosciuto.
- **C13**: l'id di un piano eliminato resta nei collegamenti della barra laterale.
- **C14**: annunci ridondanti (cambio di metodo, "Trova").
- **C15**: guida all'uso:
  - l'ordine dei pulsanti di export è diverso (Snippet prima di Stampa);
  - "Vai alla validazione della mask" compare solo con una mask non valida.
- **C16**: la guida al subnetting dice "v0.4 · DA REVISIONARE" nell'intestazione e "da revisionare" nel piè di pagina: da sistemare con la revisione di Paolo.
- **C17**: stampa di Suddivisione con il prefisso scritto senza barra ("Blocco: 192.168.0.0 24").
- **C18**: la barra di export ha `role="toolbar"` ma non si naviga con le frecce.
- **C19**: "Trova" con un IP fuori dal blocco lascia evidenziata la riga precedente.
- **C6 (resto)**: senza IP in Analisi, "Apri in Analisi" mostra subito l'errore; il pulsante c'è solo nel caso A (la guida all'uso ne parla in generale).

## Esito nella fase 8 (v1.1.0)

Tutte le segnalazioni "Per la fase 8" sono state chiuse il 21 novembre 2026, ognuna con un test o una prova nel browser (`CHANGELOG.md`, sezione 1.1.0).

| ID | Esito | Prova |
|---|---|---|
| A3 | `maskField` in `parseAddressInput`: l'errore va sotto il campo che contiene la mask (B, Blocco, IP, rete dello snippet) | `ipv4.test.js`; e2e "mask non valida nel campo B…" |
| A4 | `parseCount` oltre 2^32 → NUMBER_RANGE con il testo scritto | `ipv4.test.js` |
| A7 | frasi corrette ai bordi (binario, numero magico, wildcard, F06 con 2 subnet) | `steps.test.js` (proprietà sui testi) |
| A8 | plurali, maiuscole, "ma ne servono", migliaia, caso C, ottetto nella mask non valida | `i18n.test.js` |
| A9 | MASK_LEADING_ZERO; "/255.255.255.0" nel campo del prefisso | `ipv4.test.js`, `validate-mask.test.js` |
| A10 | `subnetAt`, `indexOf` e `iterateSubnets` robusti fuori contratto | `subdivide.test.js` |
| A11 | P4 con un riferimento indipendente; P10 a 1.000 esecuzioni; oracolo esteso a F04 (ambito, principale), F03 (motivo, suggerimenti, wildcard), F01 (offset, ruolo, adiacenti) | `prefix.test.js`, `subdivide.test.js`, `oracle.test.js` (82.575 casi, 0 differenze) |
| A12 | specifica 4.1 aggiornata | — |
| M2 | ordinamento con `Date.parse` | `session.test.js` |
| M3 | conteggio di cronologia illeggibile ed etichette scartate all'avvio | `persistence.test.js` |
| M4 | campi in più nell'intestazione della busta rifiutati (decisione di Paolo) | `envelope.test.js` |
| C6 | senza IP nessun errore prima di Invio; guida all'uso precisata | e2e "Apri in Analisi senza un IP" |
| C8 | messaggi brevi rimandati alla chiusura della finestra modale. Nelle prove il caso non si è presentato (le finestre si chiudono già prima del messaggio): la correzione è una garanzia | e2e "messaggi brevi solo dopo la chiusura" |
| C9 | parametro `f10=1` nei collegamenti del cap. 14 | e2e "cap. 14" |
| C11 | 44 px per selettore del tema, collegamenti rapidi e riquadro del glossario | e2e "guide a 390 px…" |
| C12 | `pg` e `caso` riscritti nel frammento | `router.test.js`; e2e "frammento normalizzato" |
| C13 | `dropMissingPlan` | `persistence.test.js`; e2e "piano eliminato" |
| C14 | lo stesso annuncio non si ripete | e2e "annunci senza ripetizioni" |
| C15 | guida all'uso allineata all'app; test sui nomi dei pulsanti | `guides.test.js` |
| C16 | "v0.4 · versione di studio" (decisione di Paolo) | `guides.test.js` |
| C17 | "/24" nell'intestazione di stampa | e2e "stampa di Suddivisione" |
| C18 | modello ARIA della toolbar (tabindex mobile, frecce, Inizio, Fine) | e2e "barra di export…" |
| C19 | "Trova" fuori dal blocco toglie l'evidenziazione | e2e "annunci senza ripetizioni…" |
