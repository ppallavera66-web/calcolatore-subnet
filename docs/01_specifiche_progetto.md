# Calcolatore Subnet: specifiche di progetto

Versione 1.1 · 18 novembre 2026 · Stato: approvate da Paolo

## 1. Obiettivo
Un'applicazione web per il calcolo delle subnet IPv4 che serva a tre usi, attivabili dall'utente:
- **calcolo rapido**: risultato immediato, interfaccia essenziale;
- **didattico**: ogni risultato mostra i passaggi con il metodo scelto (binario, numero magico, multipli), con rimandi alla guida;
- **professionale**: pianificazione, export nei vari formati, condivisione dei dati, anche cifrati.

## 2. Piattaforma
- Pagina web distribuita come **un unico file HTML** autosufficiente: nessuna installazione, funziona offline, si apre da disco o da qualunque web server.
- Sorgenti **modulari** (ES modules), uniti in un solo file da uno strumento di build (proposta: Vite con plugin single-file; da confermare nella fase 2).
- **Responsive e mobile first**: su schermi piccoli la navigazione va in basso (Calcola · Pianifica · Guide · Impostazioni); i campi IP aprono la tastiera numerica.
- Facoltativo, se ospitata in HTTPS: manifest PWA per l'installazione sul telefono.

## 3. Impostazioni utente (interruttori indipendenti)
| Interruttore | Effetto | Default |
|---|---|---|
| Modalità didattica | Mostra i passaggi sotto ogni risultato, con la scelta del metodo | Spento |
| Export | Mostra la barra di export sui risultati | Spento |
| Memorizza i dati | Salva piani, cronologia e impostazioni nel browser (IndexedDB o localStorage) | Spento |

- Pulsante **Cancella tutti i dati**, con conferma esplicita, sempre disponibile.
- Il salvataggio locale vale solo per quel browser e quel dispositivo: per spostare o condividere i dati si usa export/import JSON.
- Tema: **Automatico** (segue il sistema), **Chiaro**, **Scuro**, **Alto contrasto**.

## 4. Export e import
**Formati di export, v1**: copia negli appunti, CSV, JSON, Markdown, testo semplice, stampa/PDF tramite il browser, snippet di configurazione (ACL e OSPF con wildcard).
**v2**: XLSX (richiede una libreria esterna, da valutare per il peso).

**Sessione JSON**: export e import dell'intero lavoro (impostazioni, piani VLSM, cronologia) per passare i dati ad altri senza trasferire l'applicazione. Il file contiene un campo `format`, la versione dello schema e la data; all'import si valida la struttura prima di caricare.

### 4.1 Export cifrato
Opzione "Cifra il file" all'export del JSON, **facoltativa e disattivata per default**: l'export standard produce sempre un JSON in chiaro, importabile senza passphrase (ad esempio per conservare gli esercizi svolti in modalità didattica). La cifratura si attiva solo con una scelta esplicita a ogni export, mai in automatico, e non viene ricordata come impostazione predefinita. Il file cifrato resta illeggibile senza la passphrase, che va comunicata al destinatario per un canale separato. All'import l'app riconosce da sola se il file è cifrato e chiede la passphrase solo in quel caso.
- **Tecnologia**: Web Crypto API del browser, nessuna libreria esterna.
- **Cifratura**: AES-256-GCM, IV casuale di 12 byte per ogni export. GCM garantisce anche l'integrità: una passphrase sbagliata o un file manomesso vengono rilevati e l'import si ferma con un messaggio chiaro.
- **Derivazione della chiave**: PBKDF2-SHA-256 dalla passphrase, sale casuale di 16 byte, 600.000 iterazioni (raccomandazione OWASP); il numero di iterazioni è salvato nel file, così si potrà aumentare in futuro senza rompere i file vecchi.
- **Formato del file** (busta JSON):
```json
{
  "format": "subnetcalc-encrypted",
  "version": 1,
  "kdf": { "name": "PBKDF2-SHA-256", "iterations": 600000, "salt": "<base64>" },
  "cipher": { "name": "AES-256-GCM", "iv": "<base64>" },
  "data": "<base64 del JSON di sessione cifrato>"
}
```
- **Regole**: la passphrase non viene mai salvata né inviata altrove; lunghezza minima 12 caratteri con indicatore di robustezza; avviso esplicito che **una passphrase persa non è recuperabile**.
- **Da verificare nella fase 5**: disponibilità di `crypto.subtle` quando la pagina è aperta da disco (`file://`) nei principali browser, perché la Web Crypto API richiede un contesto sicuro. Se non disponibile, la funzione va disattivata con un messaggio che spiega come risolvere (aprire la pagina da HTTPS o da localhost).

## 5. Funzioni
| ID | Funzione | Rilascio | Cap. guida |
|---|---|---|---|
| F01 | Analisi subnet (rete, broadcast, range, host, mask, wildcard, numero magico) | v1 | 7, 9, 13 |
| F02 | Conversioni decimale/binario/esadecimale, CIDR/mask | v1 | 3, 6 |
| F03 | Validazione mask con motivazione | v1 | 6 |
| F04 | Tipo di indirizzo (classe storica, privato/pubblico, speciale) | v1 | 4 |
| F05 | Calcolo inverso (host o subnet richiesti → prefisso) | v1 | 11 |
| F06 | Suddivisione di un blocco ed elenco delle subnet | v1 | 11, 13 |
| F07 | Verifica stessa subnet (anche con prefissi diversi sui due host) | v1 | 15 |
| F12 | Modalità didattica con scelta del metodo | v1 | 7–17 |
| F08 | Pianificatore VLSM | v2 | 16 |
| F09 | Summarization con avviso di riassunto troppo largo | v2 | 17 |
| F10 | Wildcard e snippet di configurazione | v1 (base) / v2 | 14 |
| F13 | Allenamento con verifica della risposta e tempi | v2 | 8 |
| F11 | Modulo IPv6 di base | v3 | 19 |

## 6. Guide integrate
- **Guida all'uso**: breve, orientata ai compiti. Ogni funzione ha un pulsante "?" che apre il paragrafo pertinente.
- **Elementi comuni alle due guide**: indice laterale (in alto su mobile), selettore del tema, glossario con termini evidenziati nel testo e popover di spiegazione con collegamenti interni, pulsante "torna su".
- **Guida al subnetting**: il manuale esistente (`guida-subnetting.html`, v0.3, revisionato nella fase 1). I widget interni vengono sostituiti da collegamenti "Apri nel calcolatore" che precompilano la funzione vera; ogni passaggio didattico dell'app rimanda al capitolo da cui viene. Convenzione adottata nella guida e da rispettare nell'app: con prefisso multiplo di 8 l'ottetto interessante è l'ultimo che vale 255 e il numero magico è 1.

## 7. Fasi, modello e impegno
| Fase | Contenuto | Modello | Impegno |
|---|---|---|---|
| 1 | Revisione della guida al subnetting (difetti noti) · **completata** | Opus 5.5 | Medio |
| 2 | Specifica tecnica v1: struttura dei moduli, schema JSON di sessione, schermate e flussi, scelta del tooling | Opus 5.5 | Alto |
| 3 | Motore di calcolo e test automatici | Opus 5.5 | Alto |
| 4 | Interfaccia, navigazione mobile, temi | Opus 5.5 (prima stesura), Sonnet 5.5 (iterazioni) | Alto, poi medio |
| 5 | Impostazioni, persistenza, export/import, cifratura | Opus 5.5 | Alto |
| 6 | Integrazione delle due guide e collegamenti con l'app | Sonnet 5.5 | Medio |
| 7 | Verifica finale (con revisione indipendente) e rilascio v1 | Opus 5.5 | Medio |
| 8 | Revisione finale tecnica (segnalazioni della revisione indipendente e dello stato), rilascio v1.1.0 · **completata** | Opus 5.5 | Medio |
| 9 | Rilettura di testi e guide, guida al subnetting v0.5, rilascio v1.1.1 · **completata** (le note di Paolo sono rimandate) | Opus 5.5 | Medio |
| 10 | Pianificazione della v2 (specifica tecnica v2, fasi), con il posto per le note di Paolo (v1.2.0) e la guida al subnetting v1.0 | Opus 5.5 | Alto |
| – | Correzioni minori tra una fase e l'altra | Sonnet 5.5 | Basso |

Stima: v1 completa in 6–7 conversazioni. La v2 richiede altre 2–3 conversazioni.

### 7.1 Regole di lavoro
- **Una fase per conversazione.** All'inizio si leggono `STATO_PROGETTO.md` e queste specifiche e si confermano modello e impegno; prima di modificare o produrre si propone l'elenco degli interventi e si attende la conferma di Paolo.
- **Chiusura di ogni fase**: oltre ai file prodotti, si aggiorna `STATO_PROGETTO.md` e si fornisce sempre a Paolo, nella risposta finale e nello stato del progetto:
  - il **titolo** della conversazione successiva, nel formato `Fase N · Titolo`;
  - il **prompt** completo da incollare per avviarla.
- **Revisione di Paolo**: le note personali (Errore, Chiarezza, Mancanza, Taglio) non vengono raccolte fase per fase. Paolo rivede tutto alla fine, applicazione e guide insieme, e le correzioni si applicano in un colpo solo (fase 9, dopo la revisione tecnica della fase 8). Eventuali segnalazioni sparse nel frattempo si annotano in `STATO_PROGETTO.md`.

## 8. Difetti noti della guida v0.1
Tutti risolti nella v0.3 (fase 1), tranne il n. 6, rimandato alla fase 6.
1. ~~Solo tema scuro~~: aggiunti i temi Automatico, Chiaro, Scuro, Alto contrasto.
2. ~~Soluzioni chiuse in stampa~~: aperte automaticamente in stampa.
3. ~~Allenamento con indirizzi pubblici~~: limitato ai blocchi privati.
4. ~~Formula degli host senza eccezioni /31 e /32~~: eccezioni segnalate nei cap. 7, 13 e nella cheat sheet.
5. ~~Trattino nella colonna M della cheat sheet~~: sostituito con "1 · ottetto" e spiegato.
6. I widget interni vanno sostituiti dai collegamenti all'app (**fase 6**).
