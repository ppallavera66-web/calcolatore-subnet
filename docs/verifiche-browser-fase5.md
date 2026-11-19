# Verifiche nei browser · fase 5

Prove della specifica tecnica, sezione 11: Web Crypto, localStorage e appunti con la pagina aperta **da disco** (`file://`), più export, sessione e stampa. Le prove in Chrome le ho fatte io in automatico; quelle negli altri browser restano da fare a mano.

## Già verificato in automatico

`npm run e2e` usa Chrome for Testing 153.0.8010.12, senza interfaccia, su Linux, con la pagina aperta da disco. Esito: 40 prove su 40 nella fase 5, 52 su 52 nella fase 7 (v1.0.0).

| Voce | Esito in Chrome da `file://` |
|---|---|
| Contesto sicuro (`isSecureContext`) | sì |
| `crypto.subtle` (cifratura) | sì: export e import cifrati vanno e tornano |
| localStorage | sì: salvataggio, ricaricamento, due schede con l'evento `storage` |
| Appunti (API asincrona) | sì, con il permesso concesso dal programma di prova |
| Download con `Blob` e `download` | sì: CSV, JSON, Markdown, testo, snippet, sessione |
| Funzione disattivata senza Web Crypto | sì (simulata): casella "Cifra il file" disattivata con la spiegazione, file cifrato rifiutato |
| localStorage rifiutato | sì (simulato): interruttore disattivato con la spiegazione, l'app calcola normalmente |

## Come preparare le prove

1. Scarica `calcolatore-subnet-v1.0.0.html` dalla Release v1.0.0 del repository (è `dist/index.html` della build). Per le prove da HTTPS usa la pubblicazione su GitHub Pages.
2. Mettilo in una cartella, per esempio `Documenti/prova-subnet/`, e aprilo con un doppio clic o trascinandolo nel browser.
3. Per ogni browser compila la tabella dei risultati in fondo: **sì**, **no**, oppure una breve nota.

Prima di ripetere le prove nello stesso browser, usa **Impostazioni → Dati → Cancella tutti i dati**, così parti pulito.

## Prove

### P1 · Compatibilità dichiarata dalla pagina
1. Apri **Impostazioni** e scorri fino a **Informazioni → Compatibilità di questo browser**.
2. Annota le cinque righe: pagina aperta da, contesto sicuro, cifratura (Web Crypto), salvataggio nel browser (localStorage), appunti (API asincrona).

### P2 · Salvataggio nel browser (localStorage)
1. In **Impostazioni** accendi **Memorizza i dati**. Sotto l'interruttore deve comparire "Ultimo salvataggio: …".
2. Scegli il tema **Scuro**.
3. In **Calcola → Analisi** scrivi `172.16.45.200/20` e premi Invio.
4. **Chiudi la scheda** (non solo ricaricare), poi riapri il file.
5. Atteso: tema scuro già all'apertura, interruttore acceso e, nel pannello **Cronologia**, la voce `172.16.45.200/20`.
6. Annota anche se il browser chiede permessi o mostra avvisi.

### P3 · Spazio condiviso tra file aperti da disco
1. Copia il file HTML in **un'altra cartella**, per esempio `Desktop/`, e aprilo da lì.
2. Annota se ritrovi tema, cronologia e interruttore della prova P2:
   - **sì** = il browser condivide lo spazio tra tutti i file aperti da disco (per questo le chiavi hanno il prefisso `subnetcalc:`);
   - **no** = ogni cartella o ogni file ha uno spazio suo.

### P4 · Due schede
1. Apri lo stesso file in due schede, con **Memorizza i dati** acceso.
2. Nella prima scheda cambia il tema in **Alto contrasto**. Atteso: entro un secondo anche la seconda scheda cambia tema.
3. Nella prima scheda spegni **Memorizza i dati** e conferma con "Smetti e cancella". Atteso: nella seconda compare il messaggio "In un'altra scheda il salvataggio è stato spento…" e il suo interruttore si spegne.

### P5 · Spegnimento con conferma
1. Accendi **Memorizza i dati**, poi spegnilo: deve comparire la richiesta di conferma.
2. Scegli **Annulla**: l'interruttore deve restare acceso.
3. Spegnilo di nuovo e conferma con **Smetti e cancella**. Atteso: messaggio "Dati salvati cancellati da questo browser"; la cronologia della visita resta visibile finché non chiudi la pagina.

### P6 · Appunti
1. Apri **Analisi** con `172.16.45.200/20`, poi premi l'icona di copia accanto a **Rete**. Atteso: il messaggio "Copiato …".
2. Incolla in un editor di testo: deve comparire `172.16.32.0/20`.
3. Accendi **Impostazioni → Export**, torna ad Analisi e premi **Copia** nella barra di export. Incolla: atteso il riepilogo in colonne allineate.
4. Se il browser mostra "Copia non riuscita", annotalo: vuol dire che anche il metodo di riserva (`execCommand`) è stato rifiutato.

### P7 · Download e CSV in Excel
1. Con la barra di export attiva, in Analisi premi **CSV**, **JSON**, **Markdown** e **Testo**. Atteso: quattro file `subnet-analisi-172.16.32.0-20-AAAAMMGG-hhmm.*`.
2. Apri il CSV con Excel, oppure con LibreOffice usando il separatore `;`. Atteso: due colonne, accenti corretti ("Host utilizzabili", "Posizione dell'IP"), numeri senza separatori.
3. In **Pianifica → Suddivisione** usa `10.0.0.0/16 → /24`, premi **Salva come piano** e scrivi `=1+1` come etichetta della subnet n. 1. Esporta il CSV scegliendo "Tutte (256)". Atteso: in Excel la cella mostra `'=1+1` o `=1+1` come testo, **non** il numero 2.
4. Con `10.0.0.0/8 → /30` premi **CSV**. Atteso: "Tutte" non è selezionabile; un intervallo di più di 65.536 righe dà un errore; un intervallo valido scarica il file.

### P8 · Sessione cifrata (Web Crypto)
1. **Impostazioni → Esporta sessione**: spunta **Cifra il file**. Se la casella è disattivata, annota il testo della spiegazione e salta ai punti 6–7.
2. Scrivi `cavallo batteria graffetta` in entrambi i campi. Atteso: indicatore "Robustezza: ottima" e il file `subnetcalc-sessione-…-cifrato.json`.
3. Riapri **Esporta sessione**. Atteso: "Cifra il file" di nuovo spenta.
4. **Importa sessione** con il file cifrato e una passphrase sbagliata. Atteso: "Passphrase errata o file danneggiato.", con la possibilità di riprovare.
5. Riprova con la passphrase giusta. Atteso: l'anteprima con data, numero di calcoli e piani, e i pulsanti Sostituisci e Unisci.
6. Senza Web Crypto: annota se un file cifrato viene rifiutato con la spiegazione su HTTPS e localhost.
7. Annota quanto dura, a occhio, la cifratura (sui telefoni fino a circa un secondo).

### P9 · Passaggio tra browser
1. Esporta la sessione **in chiaro** da un browser.
2. Importala in un altro browser con **Unisci** e la casella **Applica anche le impostazioni del file** spuntata.
3. Atteso: cronologia, piani e tema del primo browser.

### P10 · Stampa e PDF
1. In Analisi, con la modalità didattica accesa, usa **Stampa** e salva in PDF.
2. Atteso: fondo chiaro, intestazione con input e data, passaggi presenti, niente barre di navigazione.

### P11 · Da HTTPS (dopo la pubblicazione su GitHub Pages)
Ripeti P1, P2 e P8 aprendo l'indirizzo di GitHub Pages: atteso **sì** su tutte le righe di P1. Su telefono (Safari per iOS, Chrome per Android) ripeti P1, P2, P6 e P8 da HTTPS, perché aprire un file da disco sul telefono è scomodo e poco rappresentativo. Verifica anche la **tastiera numerica di iOS** nei campi IP: dev'esserci la virgola, che il campo accetta come punto.

## Risultati da compilare

| Prova | Chrome | Edge | Firefox | Safari (macOS) | Safari iOS (HTTPS) | Chrome Android (HTTPS) |
|---|---|---|---|---|---|---|
| Versione del browser | 153 (CfT) | | | | | |
| P1 contesto sicuro | sì | | | | | |
| P1 Web Crypto | sì | | | | | |
| P1 localStorage | sì | | | | | |
| P1 appunti (API) | sì | | | | | |
| P2 salvataggio dopo la chiusura | sì | | | | | |
| P3 spazio condiviso tra cartelle | da provare | | | | – | – |
| P4 due schede | sì | | | | | |
| P5 conferma allo spegnimento | sì | | | | | |
| P6 copia | sì | | | | | |
| P7 download e CSV in Excel | download sì; Excel da provare | | | | | |
| P8 sessione cifrata | sì | | | | | |
| P9 passaggio tra browser | sì (fra due profili) | | | | | |
| P10 stampa e PDF | sì | | | | | |

Mandami le righe compilate: le uso per le note della guida all'uso (fase 6) e per eventuali correzioni (fase 7). Se una prova va storta, aggiungi una schermata di Impostazioni → Informazioni.

## Dove finiscono i risultati (fase 6)

La guida all'uso integrata ha la sezione **Browser e apertura da disco** (`src/guides/uso/03-risultati-dati.html`, `id="uso-browser"`, rotta `#/guide/uso/browser`). Oggi riporta quanto verificato in Chrome e formulazioni prudenti per gli altri browser; con le righe compilate qui sopra si aggiorna con i risultati reali (fase 7 o 8).
