# Calcolatore Subnet: specifica tecnica v2

Versione 1.0 · 22 novembre 2026 · Stato: approvata da Paolo (fase 10)

Documenti di riferimento: `piano-v2.md` (ambito, fasi, decisioni V1–V11), `01_specifiche_progetto.md` (v1.2), `02_specifica_tecnica_v1.md` (v1.0 con gli aggiornamenti delle versioni 1.1 e 1.1.1), guida al subnetting v0.5, `STATO_PROGETTO.md`.

Nel documento "deve" indica un requisito, "può" una facoltà. Tutto ciò che la v1 ha già deciso resta valido, se qui non viene cambiato in modo esplicito: architettura (2), esiti con codici (3.1), passaggi come dati (4.1), testi in `strings.it.js`, accessibilità (9.7), regole di validazione dell'import (6.3).

Gli esempi numerici sono stati calcolati con uno script indipendente basato sul modulo `ipaddress` di Python (fase 10). La sintassi degli snippet è stata controllata il 22 novembre 2026 sulla documentazione dei produttori (fonti nella 5.4).

---

## Indice

0. Scopo e ambito
1. Decisioni
2. Architettura: moduli nuovi, dipendenze, peso
3. Motore: F08, F09, F13, F10 avanzato
4. Passaggi didattici
5. Export: XLSX, righe di F08 e F09, snippet
6. Sessione JSON v2
7. Persistenza
8. Interfaccia
9. Guide
10. Test e oracolo
11. Rischi e verifiche rimandate

---

## 0. Scopo e ambito

Questo documento traduce il piano della v2 in decisioni tecniche, abbastanza precise da scrivere codice e test nelle fasi 11–13 senza altre scelte di fondo.

**Nella 2.0.0**: F08 pianificatore VLSM, F09 summarization, F13 allenamento, export XLSX, snippet avanzati di F10, sessione v2. Che cosa entra e che cosa resta fuori di ciascuna funzione: `piano-v2.md`, sezione 1.

**Fuori dalla 2.0.0**: manifest PWA (V9), F11 IPv6 (v3).

**Invariato**: i risultati di F01–F07 e di F10 base. L'oracolo v1 e i suoi fixture non cambiano; le funzioni nuove usano quelle esistenti (F05 per i prefissi del VLSM, F01 e F07 per le soluzioni dell'allenamento) senza modificarle.

---

## 1. Decisioni

Le decisioni V1–V11 della fase 10 sono nel piano (sezione 3). Qui le scelte tecniche che ne derivano:

| ID | Decisione |
|---|---|
| t1 | Il motore resta puro (2.3 della v1): niente `Date`, `Math.random`, `performance`, DOM. Il generatore dell'allenamento riceve un **seme** e usa un generatore pseudocasuale nostro (3.4.1); seme e tempi li gestisce l'interfaccia. |
| t2 | Ogni funzione nuova ha la versione su valori e quella su testo (`…Text`), come nella v1. |
| t3 | F08 e F09 restituiscono risultati anche grandi (256 segmenti, 1.024 reti, fino a 1.024 blocchi estranei): niente paginazione, tutto in memoria. |
| t4 | Lo scrittore XLSX sta in `src/export/xlsx.js` ed è l'unico codice che conosce il formato; riceve il documento comune dell'export (5.1). |
| t5 | Lo schema di sessione passa alla versione 2; la migrazione 1 → 2 è pura e senza perdite (6.5). |
| t6 | I parametri di frammento con elenchi (segmenti di F08, reti di F09) hanno un limite di 2.000 caratteri invece di 200 (8.3). |
| t7 | Le statistiche dell'allenamento non si salvano: si ricalcolano dai tentativi (stessa regola m6 della v1: si salvano gli input). |

---

## 2. Architettura: moduli nuovi, dipendenze, peso

### 2.1 File nuovi

```
src/engine/
  vlsm.js                 F08 · planVlsm, planVlsmText, parseSegments
  summary.js              F09 · summarize, summarizeText, parseNetworkList
  cidr.js                 strumenti comuni: rangeToCidrs, blockOf, covers (usati da F08 e F09)
  training/
    prng.js               generatore pseudocasuale a 32 bit con seme (mulberry32)
    generate.js           F13 · seriesOf, questionAt, livelli e tipi
    check.js              F13 · checkAnswer, parseAnswer
  snippets-vendors.js     F10 v2 · righe Cisco estese, Junos, RouterOS, nftables
  steps/vlsm.js  steps/summary.js  steps/training.js
src/export/
  xlsx.js                 scrittore XLSX (ZIP, CRC32, XML)
src/ui/views/
  vlsm.js  riassunto.js  allenamento.js
src/ui/components/
  segment-table.js        tabella modificabile dei segmenti di F08
  network-list.js         area di testo delle reti di F09 con conteggio e righe sbagliate
  training-card.js        domanda, campi di risposta, esito, cronometro
src/guides/uso/           sezioni nuove (9.2)
tests/engine/  vlsm.test.js  summary.test.js  training.test.js  snippets-vendors.test.js  cidr.test.js
tests/export/  xlsx.test.js
tests/session/ migrate-v2.test.js  (corpus in tests/fixtures/sessions/v2/)
tests/fixtures/ oracle-v2.json  training-series.json
tools/
  oracle.py               esteso con F08, F09, soluzioni di F13
  xlsx-check.py           rilegge con openpyxl i file prodotti da tools/xlsx-fixtures.js
  xlsx-fixtures.js        produce i file XLSX di prova in tests/fixtures/xlsx/ (non salvati nel repository)
```

### 2.2 Regola delle dipendenze

Invariata (tabella 2.3 della v1). Il test di architettura deve coprire anche le cartelle nuove (`engine/training/`) e controllare che in `engine` non compaiano `performance`, `crypto`, `Date`, `Math.random`.

### 2.3 Dipendenze esterne

Nessuna nuova dipendenza nel file distribuito. Per le prove: `openpyxl` in Python (già disponibile con `setup-python`, installato con `pip` nel job `test`).

### 2.4 Peso

| Dopo la fase | Previsto | Limite della fase |
|---|---|---|
| 1.1.1 (oggi) | 642.575 byte (61,3%) | — |
| 11 · VLSM e summarization | circa 700 KB | 740 KB |
| 12 · Allenamento | circa 740 KB | 780 KB |
| 13 · XLSX e snippet | circa 770 KB | 810 KB |
| **Soglia di attenzione** | | **900 KB** (V10) |

Se una fase supera il proprio limite, prima di procedere si cerca dove alleggerire (testi duplicati, CSS) e se ne parla con Paolo. `size-check.js` resta invariato (limite 1 MB); il limite della fase è controllato nello stato del progetto.

### 2.5 Integrazione continua (V3)

- Il job `pages` gira sui **tag `v*`** e non più a ogni push su `main`. Pubblica il file del tag, comprese le beta e le release candidate.
- Il job `release` crea una **pre-release** quando il tag contiene un trattino (`v2.0.0-beta.1`, `v2.0.0-rc.1`): `gh release create … --prerelease`. Le altre restano "Latest".
- Controllo del tag invariato: il tag deve coincidere con la versione di `package.json` e deve esistere `docs/note-rilascio/<tag>.md`.
- Nel job `test`: `pip install openpyxl`, poi `node tools/xlsx-fixtures.js` e `python3 tools/xlsx-check.py` (fase 13).
- L'ambiente `github-pages` deve ammettere i tag `v*` (azione di Paolo, piano 3.1).

---

## 3. Motore

### 3.1 Codici nuovi

Errori (`ok: false`):

| Codice | Quando | Parametri |
|---|---|---|
| `VLSM_NO_SEGMENTS` | nessun segmento | — |
| `VLSM_TOO_MANY_SEGMENTS` | più di 256 segmenti | `max` |
| `VLSM_SEGMENT_FORMAT` | riga incollata non riconosciuta | `line`, `text` |
| `VLSM_SEGMENT_HOSTS` | host di un segmento non validi (errore di `parseCount` o fuori da 1–4.294.967.294) | `index`, `code`, `params` |
| `VLSM_NAME_FORMAT` | nome oltre 80 caratteri o con caratteri di controllo | `index` |
| `VLSM_GROWTH_VALUE` | margine diverso da 0, 25, 50, 100 | `value` |
| `VLSM_NO_SPACE` | il piano non entra nel blocco | `needed`, `available`, `minPrefix` (`null` se servirebbe più di /0) |
| `SUMMARY_EMPTY` | nessuna rete | — |
| `SUMMARY_TOO_MANY` | più di 1.024 reti | `max` |
| `SUMMARY_ITEM` | una rete dell'elenco non è valida | `line`, `text`, `code`, `params` (errore di parsing originale) |
| `SUMMARY_PREFIX_MISSING` | una riga senza prefisso | `line`, `text` |
| `TRAIN_KIND_VALUE` | tipo di esercizio sconosciuto | `value` |
| `TRAIN_LEVEL_VALUE` | livello diverso da 1, 2, 3 | `value` |
| `TRAIN_LENGTH_VALUE` | lunghezza della serie diversa da 5, 10, 20 | `value` |
| `TRAIN_SEED_FORMAT` | seme non valido | `text` |
| `ACL_EXT_NUMBER_RANGE` | numero ACL estesa fuori da 100–199 e 2000–2699 | `value` |
| `ACL_PROTOCOL_VALUE` | protocollo diverso da `ip`, `tcp`, `udp`, `icmp` | `value` |
| `PORT_RANGE` | porta fuori da 1–65535 | `value` |
| `PORT_PROTOCOL` | porta indicata con `ip` o `icmp` | `protocol` |
| `DEST_KIND_VALUE` | tipo di destinazione diverso da `any`, `host`, `subnet` | `value` |

Gli errori di parsing della destinazione usano i codici della v1 con `field: "destination"`.

Avvisi (`warnings`):

| Codice | Quando |
|---|---|
| `W_HOST_BITS_SET` | (v1) blocco di F08 o reti di F09 con bit di host a 1; per F09 con `count` |
| `W_VLSM_FULL` | nessuno spazio libero dopo l'assegnazione |
| `W_VLSM_GROWTH_PREFIX` | il margine di crescita ha cambiato il prefisso di almeno un segmento (`count`) |
| `W_VLSM_DUPLICATE_NAME` | due o più segmenti con lo stesso nome non vuoto (`names`) |
| `W_NO_USABLE_HOSTS` | (v1) un segmento /31 o /32 senza l'opzione punto-punto (non può capitare con le regole della 3.2; resta per sicurezza) |
| `W_SUMMARY_TOO_WIDE` | il riassunto unico contiene indirizzi estranei (`extra`, `blocks`) |
| `W_SUMMARY_DUPLICATE` | reti ripetute, tolte (`count`) |
| `W_SUMMARY_CONTAINED` | reti contenute in altre, tolte (`count`) |
| `W_SUMMARY_SINGLE` | dopo la pulizia resta una sola rete |
| `W_SUMMARY_EXTRA_TRUNCATED` | blocchi estranei oltre 1.024: elenco tagliato (`total`) |

### 3.2 F08 · Pianificatore VLSM · `vlsm.js` · cap. 16 e 11

**Firma**
- `planVlsm(blockNetwork, blockPrefix, segments, options)`
  - `segments`: `[{ name, hosts }]`, da 1 a 256; `name` stringa di 0–80 caratteri (vuota ammessa: l'interfaccia mostra "Segmento N"), `hosts` intero da 1 a 4.294.967.294.
  - `options`: `{ growth: 0 | 25 | 50 | 100, p2p31: boolean }`, predefinito `{ growth: 0, p2p31: false }`.
- `planVlsmText(testoBlocco, segmentiTesto, options)`: blocco come `IP/n` o `IP mask`; `segmentiTesto` è un array di `{ name, hostsText }` (dalla tabella) oppure una stringa incollata.
- `parseSegments(testo)` → `[{ name, hosts }]` o `VLSM_SEGMENT_FORMAT`. Regole: una riga per segmento, righe vuote ignorate; separatore tabulazione, poi `;`, poi l'ultima `,` della riga; l'ultimo campo è il numero di host (con le regole di `parseCount`), il resto è il nome; una riga con un solo campo numerico è un segmento senza nome; una prima riga il cui ultimo campo non è un numero è trattata come intestazione e saltata (una sola volta).

**Algoritmo**
1. Normalizza il blocco alla rete (`W_HOST_BITS_SET` se cambia).
2. Host previsti di ogni segmento: `hosts` se `hosts ≤ 2`, altrimenti `ceil(hosts × (100 + growth) / 100)`, al massimo 4.294.967.294.
3. Prefisso: con `p2p31` attivo, 2 host → /31 e 1 host → /32; altrimenti `prefixForHosts(previsti)` di F05 (1 o 2 host → /30). `growthChanged` = il prefisso è diverso da quello senza margine.
4. Ordine di assegnazione: dimensione decrescente (prefisso crescente), a parità nell'ordine dato.
5. Somma delle dimensioni `needed`. Se `needed` supera gli indirizzi del blocco → `VLSM_NO_SPACE` con `minPrefix = 32 − ⌈log₂ needed⌉` (le dimensioni sono potenze di 2 in ordine decrescente, quindi stanno in un blocco grande quanto la potenza di 2 successiva).
6. Assegnazione: la prima subnet parte dalla rete del blocco, ogni subnet dal broadcast della precedente + 1. Con l'ordine decrescente ogni inizio è un multiplo della dimensione (invariante verificato dai test, non corretto dal codice).
7. Spazio libero: l'intervallo dal primo indirizzo non usato alla fine del blocco, scomposto nel numero minimo di blocchi CIDR (`rangeToCidrs`).

**Output**

| Campo | Contenuto |
|---|---|
| `block` | `{ network, prefix }` normalizzato |
| `options` | opzioni effettive |
| `segments` | nell'ordine dato: `{ index, name, hosts, plannedHosts, prefix, growthChanged, order, network, broadcast \| null, firstHost, lastHost, usableHosts, spare }` (`spare` = `usableHosts − hosts`) |
| `allocation` | indici dei segmenti nell'ordine di assegnazione |
| `free` | `[{ network, prefix, addresses }]` dal più basso |
| `usedAddresses`, `freeAddresses`, `totalAddresses` | conteggi; la percentuale la calcola l'interfaccia |

Errori: parsing del blocco, codici `VLSM_*` della 3.1. Avvisi: `W_HOST_BITS_SET`, `W_VLSM_FULL`, `W_VLSM_GROWTH_PREFIX`, `W_VLSM_DUPLICATE_NAME`.

**Esempi verificati**

E1 · cap. 16, `192.168.100.0/24`, Laboratorio 100, Aule 50, Uffici 25, Stampanti 10, P2P 1 e P2P 2 da 2 host, nessuna opzione:

| Segmento | Subnet | Host disponibili |
|---|---|---|
| Laboratorio | 192.168.100.0/25 | 126 |
| Aule | 192.168.100.128/26 | 62 |
| Uffici | 192.168.100.192/27 | 30 |
| Stampanti | 192.168.100.224/28 | 14 |
| P2P 1 | 192.168.100.240/30 | 2 |
| P2P 2 | 192.168.100.244/30 | 2 |

Usati 248 indirizzi su 256; libero `192.168.100.248/29`.

E2 · come E1 con `p2p31`: P2P 1 `192.168.100.240/31`, P2P 2 `192.168.100.242/31`; usati 244; liberi `192.168.100.244/30` e `192.168.100.248/29`.

E3 · come E1 con margine 25%: host previsti 125, 63, 32, 13, 2, 2 → /25, /25, /26, /28, /30, /30; servono 344 indirizzi su 256 → `VLSM_NO_SPACE`, `minPrefix` 23. Le Aule passano da /26 a /25 (63 + 2 = 65 > 64), così come gli Uffici da /27 a /26: `growthChanged` vero per entrambi.

E4 · E3 nel blocco `192.168.100.0/23`: Laboratorio `192.168.100.0/25`, Aule `192.168.100.128/25`, Uffici `192.168.101.0/26`, Stampanti `192.168.101.64/28`, P2P `192.168.101.80/30` e `.84/30`; usati 344 su 512; liberi `192.168.101.88/29`, `192.168.101.96/27`, `192.168.101.128/25`; `W_VLSM_GROWTH_PREFIX` con `count` 2.

E5 · ordine a parità di dimensione e spazio libero frammentato, `10.20.0.0/22`: Wi-Fi ospiti 200 → `10.20.0.0/24`; Aula A 60 → `10.20.1.0/26`; Aula B 60 → `10.20.1.64/26`; Server 14 → `10.20.1.128/28`; Gestione 6 → `10.20.1.144/29`; usati 408 su 1.024; liberi `10.20.1.152/29`, `10.20.1.160/27`, `10.20.1.192/26`, `10.20.2.0/23`.

E6 · `10.20.1.0/22` → normalizzato a `10.20.0.0/22` con `W_HOST_BITS_SET`.

E7 · casi limite: un solo segmento grande quanto il blocco (`10.0.0.0/24`, 254 host → `/24`, `W_VLSM_FULL`); 255 host in un /24 → `VLSM_NO_SPACE` con `minPrefix` 23; blocco /32 con un segmento da 1 host e `p2p31` → `/32`, `W_VLSM_FULL`; 257 segmenti → `VLSM_TOO_MANY_SEGMENTS`.

### 3.3 F09 · Summarization · `summary.js` · cap. 17

**Firma**
- `summarize(networks)`: `[{ network, prefix }]`, da 1 a 1.024.
- `summarizeText(testo)`: una rete per riga, oppure separate da virgole, punti e virgola o spazi; ogni rete `IP/n` o `IP mask`; righe vuote ignorate. Un elemento senza prefisso → `SUMMARY_PREFIX_MISSING`; un errore di parsing → `SUMMARY_ITEM` con il numero di riga (o di elemento) e il codice originale.
- `parseNetworkList(testo)` → l'elenco o l'errore (usato anche dalla validazione della sessione).

**Algoritmo**
1. Normalizza ogni rete (conta quelle con bit di host a 1).
2. Toglie i doppioni e le reti contenute in un'altra rete dell'elenco; per ogni elemento dato registra lo stato `kept`, `duplicate` (con l'indice del primo uguale) o `contained` (con l'indice della rete che lo contiene).
3. **Riassunto esatto**: unisce ripetutamente due blocchi adiacenti, della stessa dimensione e allineati sul doppio, fino a quando non si può più (risultato uguale a `collapse_addresses` di Python, ordinato per indirizzo).
4. **Riassunto unico**: `lo` = indirizzo più basso, `hi` = più alto; prefisso = 32 − lunghezza in bit di `lo XOR hi`; rete = `lo` con la mask del prefisso.
5. Indirizzi estranei = indirizzi del riassunto unico − indirizzi del riassunto esatto. Se sono più di 0: `W_SUMMARY_TOO_WIDE` e `extraBlocks`, cioè il complemento del riassunto esatto dentro il riassunto unico in blocchi CIDR minimi, al massimo 1.024 (oltre, `W_SUMMARY_EXTRA_TRUNCATED`).
6. **Metodo rapido** (`rapid`): applicabile se dopo la pulizia ci sono N ≥ 2 reti della stessa dimensione, contigue. Allora `exact` se N è una potenza di 2 e la prima rete è un multiplo di N blocchi (cap. 17); altrimenti il motivo (`not-power-of-two`, `not-aligned`). Se non è applicabile: `different-sizes` o `not-contiguous`.

**Output**

| Campo | Contenuto |
|---|---|
| `items` | gli elementi dati: `{ line, network, prefix, normalized, status, ref \| null }` |
| `networks` | reti dopo la pulizia, ordinate |
| `single` | `{ network, prefix, addresses }` |
| `exact` | `[{ network, prefix, addresses }]` |
| `coveredAddresses`, `extraAddresses` | conteggi |
| `extraBlocks` | `[{ network, prefix, addresses }]`, al massimo 1.024 |
| `rapid` | `{ applicable, count, size, exact, reason \| null }` |
| `commonBits` | bit iniziali uguali (= prefisso del riassunto unico), per i passaggi |

**Esempi verificati**

| Reti | Riassunto unico | Indirizzi estranei | Riassunto esatto |
|---|---|---|---|
| 172.16.32.0/24 … 172.16.35.0/24 (cap. 17) | 172.16.32.0/22 | 0 | 172.16.32.0/22 |
| 172.16.33.0/24 … 172.16.36.0/24 (cap. 17, troppo largo) | 172.16.32.0/21 | 1.024: 172.16.32.0/24, 172.16.37.0/24, 172.16.38.0/23 | 172.16.33.0/24, 172.16.34.0/23, 172.16.36.0/24 |
| 192.168.0.0/24, 192.168.2.0/24 | 192.168.0.0/22 | 512: 192.168.1.0/24, 192.168.3.0/24 | le due reti date |
| 10.0.0.0/16, 10.0.1.0/24 | 10.0.0.0/16 (`W_SUMMARY_CONTAINED`, `W_SUMMARY_SINGLE`) | 0 | 10.0.0.0/16 |
| 10.1.1.1/24, 10.1.0.0/24 | 10.1.0.0/23 (`W_HOST_BITS_SET`, `count` 1) | 0 | 10.1.0.0/23 |
| 10.0.0.0/8, 11.0.0.0/8 | 10.0.0.0/7 | 0 | 10.0.0.0/7 |
| 0.0.0.0/1, 128.0.0.0/1 | 0.0.0.0/0 | 0 | 0.0.0.0/0 |
| 192.168.10.64/26 | 192.168.10.64/26 (`W_SUMMARY_SINGLE`) | 0 | 192.168.10.64/26 |

Metodo rapido: nel primo esempio `count` 4, `exact` vero; nel secondo `count` 4, `exact` falso con `not-aligned` (33 non è multiplo di 4); nel terzo non applicabile, `not-contiguous`.

### 3.4 F13 · Allenamento · `training/` · cap. 8

#### 3.4.1 Generatore

- `prng.js`: **mulberry32** su un seme intero senza segno a 32 bit; `next()` restituisce un intero a 32 bit, `int(min, max)` un intero uniforme con rifiuto (niente modulo distorto), `pick(array)`.
- Seme nel collegamento: da 1 a 7 caratteri in base 36 (`[0-9a-z]`), valore da 0 a 2^32 − 1; altrimenti `TRAIN_SEED_FORMAT`. L'interfaccia sceglie un seme nuovo con `crypto.getRandomValues`.
- `seriesOf({ seed, kinds, level, length })` → `[question]`: con lo stesso seme, gli stessi tipi, livello e lunghezza si ottiene sempre la stessa serie. Il tipo di ogni esercizio si sceglie a rotazione casuale tra quelli indicati, senza due uguali di fila quando i tipi sono più di uno.
- `questionAt({ seed, kinds, level }, index)` per la modalità libera (seme della visita, indice crescente): l'esercizio n si genera da un seme derivato (`(seed ^ Math.imul(index + 1, 0x9E3779B9)) >>> 0`), così non dipende dai precedenti.

#### 3.4.2 Tipi di esercizio e livelli

| Tipo | Domanda | Campi della risposta | Soluzione da |
|---|---|---|---|
| `analysis` | `ip`, `prefix` | `network`, `broadcast`, `firstHost`, `lastHost`, `hosts` | F01 |
| `mask` | `prefix` → mask, oppure `mask` → prefisso (verso scelto a caso) | `mask` oppure `prefix` | F02/F03 |
| `inverse` | `hosts` | `prefix` | F05 caso A |
| `same` | `a`, `b`, `prefix` (uguale per i due) | `same` (sì/no) | F07 |
| `wildcard` | `prefix` oppure `mask` | `wildcard` | F10 |

| Livello | Prefissi | Host (calcolo inverso) |
|---|---|---|
| 1 · Base | /24–/30 (ottetto interessante il 4°) | 2–254 |
| 2 · Intermedio | /16–/23 (3°) | 255–65.534 |
| 3 · Avanzato | /8–/15 (2°) e, una volta su cinque, /31 o /32 | 65.535–16.777.214 |

- Indirizzi solo nei blocchi privati compatibili con il prefisso, come nella guida (v0.3): 10.0.0.0/8 sempre, 172.16.0.0/12 da /12, 192.168.0.0/16 da /16.
- `same`: metà degli esercizi con i due indirizzi nella stessa subnet, metà in subnet adiacenti (l'errore tipico del cap. 15).
- `analysis` con /31 o /32: il campo `broadcast` si risponde con "nessuno".

#### 3.4.3 Verifica

`checkAnswer(question, answers)` → `{ fields: [{ key, expected, given, status }], allRight }`, con `status` uguale a `right`, `wrong` o `unreadable`.

Forme ammesse per ogni campo (dopo aver tolto gli spazi iniziali e finali; virgola come punto):
- **indirizzi**: le regole di `parseIPv4`; un ottetto con zeri iniziali è `unreadable`, con il codice di errore per la spiegazione;
- **prefisso**: `26` o `/26`;
- **mask** e **wildcard**: forma puntata; una mask scritta come prefisso nel campo mask è `wrong`, con la nota che serve la forma puntata;
- **host**: le regole di `parseCount` (`4094`, `4.094`, `4 094`);
- **broadcast assente**: `nessuno`, `-` o `—` (maiuscole indifferenti);
- **stessa subnet**: valore `true`/`false` dai due pulsanti dell'interfaccia.

Un campo vuoto è `wrong`. `expected` è il valore del motore (uint32, numero, booleano o `null`), che l'interfaccia formatta.

#### 3.4.4 Tentativi

Il motore non registra nulla. L'interfaccia costruisce per ogni esercizio verificato un **tentativo** (6.3) con il tempo misurato da sé (8.5).

### 3.5 F10 v2 · Snippet avanzati · `snippets-vendors.js` · cap. 14

**Opzioni**: quelle della v1 (`acl`, `ospf`) più:

```js
extended: {
  number: 100,                 // 100–199, 2000–2699
  name: "SUBNET-EXT",          // stesse regole del nome della v1
  action: "permit",            // permit | deny
  protocol: "ip",              // ip | tcp | udp | icmp
  destination: { kind: "any" } // | { kind: "host", ip } | { kind: "subnet", network, prefix }
  port: null                   // 1–65535, solo con tcp e udp
}
```

**Output**: `lines` della v1 (`aclStandard`, `aclNamed`, `ospf`) più `ciscoExtended`, `ciscoExtendedNamed`, `junos`, `routeros`, `routerosOspf`, `nftables`, `nftablesSet`. Ogni blocco è un array di righe senza testo per l'utente, tranne i commenti tecnici fissi indicati sotto.

Regole comuni:
- origine = la subnet normalizzata; azione: `permit`/`deny` per Cisco, `accept`/`discard` per Junos, `accept`/`drop` per RouterOS e nftables;
- /32 → `host a.b.c.d` (Cisco) e `a.b.c.d/32` (gli altri); /0 → `any` (Cisco), `0.0.0.0/0` (Junos), nessuna condizione sull'origine (RouterOS e nftables);
- nome per Junos e RouterOS = nome ACL della v1; per nftables lo stesso con `-` sostituito da `_`; il termine Junos si chiama `permit-subnet` o `deny-subnet` secondo l'azione.

**Esempio verificato**: `192.168.10.64/26`, `tcp`, destinazione `10.1.64.0/19`, porta 443, azione `permit`, numero 100, nomi predefiniti.

```
access-list 100 permit tcp 192.168.10.64 0.0.0.63 10.1.64.0 0.0.31.255 eq 443

ip access-list extended SUBNET-EXT
 permit tcp 192.168.10.64 0.0.0.63 10.1.64.0 0.0.31.255 eq 443
```

```
set policy-options prefix-list SUBNET 192.168.10.64/26
set firewall family inet filter SUBNET term permit-subnet from source-prefix-list SUBNET
set firewall family inet filter SUBNET term permit-subnet from destination-address 10.1.64.0/19
set firewall family inet filter SUBNET term permit-subnet from protocol tcp
set firewall family inet filter SUBNET term permit-subnet from destination-port 443
set firewall family inet filter SUBNET term permit-subnet then accept
```

```
/ip/firewall/address-list/add list=SUBNET address=192.168.10.64/26
/ip/firewall/filter/add chain=forward src-address-list=SUBNET protocol=tcp dst-address=10.1.64.0/19 dst-port=443 action=accept
```

```
/routing/ospf/instance/add name=ospf-1 version=2
/routing/ospf/area/add name=area-0 area-id=0.0.0.0 instance=ospf-1
/routing/ospf/interface-template/add networks=192.168.10.64/26 area=area-0
```

```
nft add rule inet filter forward ip saddr 192.168.10.64/26 ip daddr 10.1.64.0/19 tcp dport 443 accept
```

```
nft add set inet filter SUBNET '{ type ipv4_addr; flags interval; }'
nft add element inet filter SUBNET '{ 192.168.10.64/26 }'
nft add rule inet filter forward ip saddr @SUBNET accept
```

Note sulla sintassi:
- Junos configura OSPF sulle interfacce, non con un comando `network`: per Junos non c'è blocco OSPF, e l'interfaccia lo dice.
- In RouterOS 7, OSPF richiede un'istanza e un'area con nome. Il processo OSPF della v1 diventa `ospf-<n>`, l'area `area-<area>` con `area-id` in forma puntata (0 → `0.0.0.0`, 1.1.1.1 resta tale).
- nftables: le regole presuppongono la tabella `inet filter` e la catena `forward`. La prima riga del blocco nell'interfaccia lo ricorda come commento (`# presuppone: table inet filter, chain forward`).
- Con `icmp` e `ip`: Cisco `icmp`/`ip`; Junos `protocol icmp` oppure nessuna condizione per `ip`; RouterOS `protocol=icmp`; nftables `ip protocol icmp`.

---

## 4. Passaggi didattici

### 4.1 Metodi per funzione (aggiunte alla tabella 4.2 della v1)

| Funzione | Metodi | Capitoli |
|---|---|---|
| F08 | `rules` (ordina, dimensiona, assegna) | 16; 11 |
| F09 | `binary` (bit in comune), `magic` (metodo rapido) | 17 |
| F13 | nessun metodo proprio: la soluzione apre i passaggi della funzione d'origine con il metodo scelto | 7, 9, 12 (analisi); 6; 11; 15; 14 |

### 4.2 Passaggi di F08

1. `vlsm-sort`: elenco dei segmenti ordinati per dimensione, con la regola d'oro dell'allineamento (cap. 16).
2. `vlsm-size`, uno per segmento: host → host + 2 → potenza di 2 → prefisso, come nel passo 1 del cap. 16; con il margine anche "100 + 25% = 125"; con `p2p31` la regola /31 o /32.
3. `vlsm-place`, uno per segmento: inizio = broadcast precedente + 1, controllo "inizio multiplo di M"; fine = inizio + M − 1.
4. `vlsm-free`: spazio libero e blocchi CIDR, oppure `vlsm-no-space` con il conto (indirizzi necessari, disponibili, prefisso minimo).
5. `vlsm-usage`: indirizzi usati su totali.

L'interfaccia mostra per esteso i passaggi dei primi 12 segmenti e raccoglie gli altri in "Mostra tutti" (i dati ci sono tutti, P12 resta valida).

### 4.3 Passaggi di F09

**Binario (cap. 17):** `summary-binary` (le reti, con l'ottetto interessante in binario, come nel capitolo; fino a 16 reti, oltre solo la prima e l'ultima) → `common-bits` (conteggio, per esempio 8 + 8 + 6 = 22) → `summary-result` → `summary-extra` (se è troppo largo: indirizzi e blocchi estranei) → `summary-exact` (le unioni a due a due che portano al riassunto esatto).

**Rapido (cap. 17):** `rapid-check` (N reti della stessa dimensione e contigue? N potenza di 2? la prima multiplo di N?) → `rapid-result` (prefisso − log₂N) oppure `rapid-not-applicable` con il motivo e il rimando al metodo binario.

### 4.4 Soluzioni dell'allenamento

Ogni esito mostra la soluzione e il collegamento "Vedi i passaggi", che apre la funzione d'origine con `did=1` e il metodo scelto (per `analysis` il metodo predefinito delle impostazioni). Il collegamento crea una voce nella cronologia del browser: il tasto indietro torna all'allenamento, nello stesso punto della serie (8.5).

---

## 5. Export

### 5.1 Documento comune

Il documento di `toRows` (5.1 della v1, `export/rows.js`) si estende con un campo facoltativo `tables`:

```js
{ title, pairs, columns?, rows?, tables?: [{ key, title, columns, rows }], notes? }
```

- F08: `pairs` (blocco, opzioni, indirizzi usati, liberi, utilizzo); `tables`: `piano` (nell'ordine di assegnazione) e `libero`.
- F09: `pairs` (riassunto unico, indirizzi, estranei, numero di rotte esatte); `tables`: `reti` (date, con lo stato), `esatto`, `estranei` (se ci sono).
- Gli altri documenti restano come sono. CSV, testo e Markdown scrivono le tabelle una dopo l'altra, con il titolo e una riga vuota in mezzo; il JSON (`subnetcalc-result`) contiene l'output del motore con gli indirizzi in forma puntata, come nella v1.

Colonne:

| Tabella | Colonne |
|---|---|
| F08 `piano` | N., Segmento, Host richiesti, Host previsti, Prefisso, Rete, Primo host, Ultimo host, Broadcast, Host disponibili, Scorta |
| F08 `libero` | Rete, Prefisso, Indirizzi |
| F09 `reti` | Riga, Rete, Prefisso, Stato |
| F09 `esatto`, `estranei` | Rete, Prefisso, Indirizzi |

I nomi dei segmenti sono testi dell'utente (`user: true`): nel CSV si proteggono dalle formule come le etichette della v1.

Nomi dei file: `subnet-vlsm-<rete>-<prefisso>`, `subnet-riassunto-<prima rete>-<n>reti`, con la stessa pulizia della v1.

### 5.2 XLSX · `export/xlsx.js`

**Struttura del file** (Office Open XML, SpreadsheetML), solo le parti necessarie:
- `[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`, `xl/styles.xml`, `xl/worksheets/sheetN.xml`;
- stili: 0 normale, 1 grassetto (intestazioni), 2 numero con separatore delle migliaia (`numFmtId` 3, mostrato secondo la lingua di Excel);
- celle: numeri come `<v>`; testi come stringhe in linea (`t="inlineStr"`, `xml:space="preserve"`), quindi **mai interpretati come formule** (un testo che inizia con `=` resta testo); `null` = cella vuota; indirizzi e prefissi come testo ("/24" no: il prefisso è un numero, la colonna Prefisso è numerica);
- caratteri XML protetti (`& < > "`); caratteri di controllo non ammessi da XML tolti; testi oltre 32.767 caratteri tagliati (limite di Excel);
- per ogni foglio: riga di intestazione bloccata (`pane` con `ySplit="1"`), larghezze delle colonne calcolate dal testo più lungo (minimo 8, massimo 60 caratteri);
- nomi dei fogli dal titolo della tabella: al massimo 31 caratteri, senza `[ ] : * ? / \`, unici.

**Fogli per risultato**: "Risultato" con le coppie (Campo, Valore) per F01–F05, F07, F10; "Riepilogo" più un foglio per tabella per F06, F08, F09; "Passaggi" con una riga per passaggio se "Includi i passaggi" è acceso.

**ZIP**: intestazioni locali e directory centrale, CRC32 su tabella, nomi ASCII, data fissa (1 gennaio 1980) per un file riproducibile. Compressione **deflate** con `CompressionStream("deflate-raw")` se c'è (metodo 8), altrimenti nessuna compressione (metodo 0); la scelta è automatica e non si mostra. Misura della fase 10: 65.536 righe di F06 → 30 MB senza compressione, 2,1 MB compresso.

**Interfaccia della funzione**: `toXlsx(doc, { steps }) → Promise<Blob>` (asincrona per la compressione), con il tipo MIME `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. Il pulsante "XLSX" si aggiunge alla barra dopo "CSV"; durante la scrittura di un file grande compare l'indicatore di avanzamento della finestra di export.

### 5.3 Snippet nell'interfaccia

La sezione "Wildcard e configurazione" di Analisi ha un selettore **Produttore**: Cisco IOS (predefinito), Juniper Junos, MikroTik RouterOS, Linux nftables. Per Cisco ci sono le sottosezioni ACL standard (v1), ACL estesa (nuova) e OSPF; per gli altri, il filtro e, dove esiste, OSPF. Le opzioni dell'ACL estesa (protocollo, destinazione, porta) valgono anche per i filtri degli altri produttori. Il download `.txt` contiene i blocchi del produttore scelto. Ogni blocco ha un commento iniziale con il produttore e la frase fissa "Verifica la sintassi sul tuo apparato prima di applicarla" (`!` per Cisco, `#` per gli altri).

### 5.4 Fonti della sintassi (controllate il 22 novembre 2026)

- Cisco IOS: numeri delle ACL estese 100–199 e 2000–2699, sintassi `access-list <n> {permit|deny} <protocollo> <origine> <destinazione> [eq <porta>]` e `ip access-list extended` (Cisco IOS IP Command Reference e materiali CCNA).
- Juniper: `policy-options prefix-list`, `firewall family inet filter … term … from source-prefix-list`, `destination-address`, `protocol`, `destination-port`, `then accept|discard` (documentazione Junos, esempi di filtri stateless).
- MikroTik RouterOS 7: `/ip/firewall/address-list/add list= address=`, `/ip/firewall/filter/add chain= src-address-list= action=`, `/routing/ospf/instance`, `/routing/ospf/area`, `/routing/ospf/interface-template/add networks= area=` (manuale RouterOS 7).
- nftables: `ip saddr <prefisso>`, insiemi con `type ipv4_addr` e `flags interval` (wiki di nftables, documentazione Red Hat).

La fase 13 ricontrolla le fonti prima di scrivere le righe di riferimento dei test.

---

## 6. Sessione JSON v2

### 6.1 Schema

```json
{
  "format": "subnetcalc-session",
  "version": 2,
  "exportedAt": "2026-12-10T21:00:00.000Z",
  "app": { "name": "Calcolatore Subnet", "version": "2.0.0" },
  "settings": { "theme": "auto", "didactic": true, "didacticMethod": "magic", "exportBar": true },
  "history": [
    { "id": "h1", "at": "2026-12-10T20:58:00.000Z", "fn": "F09",
      "input": { "networks": ["172.16.32.0/24", "172.16.33.0/24", "172.16.34.0/24", "172.16.35.0/24"] } }
  ],
  "plans": [
    {
      "id": "p1", "type": "vlsm", "name": "Sede via Celoria",
      "createdAt": "2026-12-10T20:00:00.000Z", "updatedAt": "2026-12-10T20:30:00.000Z", "notes": "",
      "input": {
        "block": "192.168.100.0", "prefix": 24, "growth": 0, "p2p31": false,
        "segments": [ { "name": "Laboratorio", "hosts": 100 }, { "name": "Aule", "hosts": 50 } ]
      }
    },
    {
      "id": "p2", "type": "summary", "name": "Rotte verso la sede",
      "createdAt": "2026-12-10T20:40:00.000Z", "updatedAt": "2026-12-10T20:40:00.000Z", "notes": "",
      "input": { "networks": ["172.16.33.0/24", "172.16.34.0/24"] }
    }
  ],
  "training": {
    "attempts": [
      {
        "id": "t1", "at": "2026-12-10T20:50:00.000Z", "kind": "analysis", "level": 1,
        "seed": "k3x9a", "index": 0,
        "question": { "ip": "10.20.30.140", "prefix": 27 },
        "answers": { "network": "10.20.30.128", "broadcast": "10.20.30.159",
                     "firstHost": "10.20.30.129", "lastHost": "10.20.30.158", "hosts": "30" },
        "result": { "right": ["network", "broadcast", "firstHost", "lastHost", "hosts"], "wrong": [] },
        "ms": 48210
      }
    ]
  }
}
```

### 6.2 Campi nuovi e cambiati

| Campo | Tipo e vincoli |
|---|---|
| `version` | 2 |
| `history[].fn` | `F01`–`F10` (aggiunti `F08`, `F09`) |
| `history[].input` | per F08 e F09 come `plans[].input` dei tipi `vlsm` e `summary` |
| `plans[].type` | `subdivision`, `vlsm`, `summary` |
| `plans[].labels` | solo per `subdivision` (nel `vlsm` i nomi stanno nei segmenti) |
| `plans[].input` (`vlsm`) | `block` puntato, `prefix` 0–32, `growth` 0/25/50/100, `p2p31` booleano, `segments` 1–256 elementi `{ name, hosts }` (nome 0–80 caratteri senza caratteri di controllo, host intero 1–4.294.967.294) |
| `plans[].input` (`summary`) | `networks`: 1–1.024 stringhe `a.b.c.d/n` |
| `training` | facoltativo; `attempts` fino a 500, dal più recente |
| `attempts[].kind`, `level` | 3.4.2 |
| `attempts[].seed`, `index` | seme della serie (base 36) e posizione; `seed` `null` per la modalità libera con seme non condiviso |
| `attempts[].question` | input dell'esercizio, validato come gli input della funzione d'origine |
| `attempts[].answers` | testi scritti, ciascuno al massimo 40 caratteri, solo chiavi dei campi del tipo; per `same` un booleano |
| `attempts[].result` | `right` e `wrong`: chiavi dei campi, insieme uguale a quello del tipo (un campo `unreadable` conta tra i `wrong`) |
| `attempts[].ms` | intero da 0 a 86.400.000 (24 ore) |

Gli input si salvano in forma canonica (indirizzi di rete già normalizzati, conteggi interi), passando per il parsing del motore come nella v1.

### 6.3 Regole di validazione (aggiunte alla 6.3 della v1)

11. **Piani `vlsm` e `summary`**: input validato con `planVlsm` o `parseNetworkList` solo nella **forma**: un piano VLSM che non entra nel blocco resta valido (l'interfaccia mostra l'errore all'apertura); un campo fuori dai vincoli scarta il piano intero.
12. **Cronologia F08 e F09**: stesse regole dei piani; una voce non valida si scarta e si conta.
13. **Allenamento**: ogni tentativo con `id`, `at`, `kind`, `level` validi, domanda validata, `answers` e `result` coerenti con il tipo; altrimenti si scarta e si conta. Oltre 500 si tengono i 500 più recenti (`IMPORT_W_TRAINING_TRUNCATED`).
14. **Unisci**: tentativi uniti per `id` (resta quello presente), poi ordinati per `at` e tagliati a 500.

Rapporto: ai campi della v1 si aggiungono `trainingImported` e `trainingSkipped`; l'anteprima mostra anche "N esercizi dell'allenamento".

### 6.4 Compatibilità con le versioni precedenti dell'app

- Un file v2 aperto con la 1.1.x: `IMPORT_NEWER_VERSION` ("aggiorna l'app"), come già previsto dalla v1. Lo stesso per i dati salvati nel browser: la 1.1.x li ignora e chiede conferma prima di sovrascriverli (`needsOverwrite`, fase 7).
- Le due versioni aperte da disco nello stesso browser condividono lo spazio di localStorage in alcuni browser (Chrome lo condivide per tutte le pagine `file://`): il comportamento sopra protegge i dati della v2 dalla 1.1.x.

### 6.5 Migrazione 1 → 2

`MIGRATIONS[1]` (in `session/migrate.js`): restituisce un oggetto nuovo con gli stessi `settings`, `history` e `plans` e `training: { attempts: [] }`; la catena imposta `version: 2`. Nessun campo della v1 cambia significato, quindi la migrazione non perde dati. Test: tutto il corpus v1 di `tests/fixtures/sessions/` importato con la v2 dà gli stessi conteggi della v1 più `IMPORT_W_MIGRATED`.

---

## 7. Persistenza

| Chiave | Contenuto |
|---|---|
| `subnetcalc:v1:meta` | `{ schema: 2, savedAt }` |
| `subnetcalc:v1:settings`, `…:history`, `…:plans` | come nella v1, con i tipi nuovi |
| `subnetcalc:v1:training` | `{ attempts }` (nuova) |

- All'avvio, dati con `schema: 1` passano per la migrazione dell'import e vengono riscritti come schema 2 al primo salvataggio (solo con "Memorizza i dati" acceso).
- Spazio esaurito: prima si riduce la cronologia a 100 voci (v1), poi i tentativi a 200, poi l'avviso.
- "Cancella tutti i dati" toglie anche `…:training`.
- Più schede: l'evento `storage` su `…:training` ricarica i tentativi; un tentativo in corso nella scheda non si perde (si aggiunge dopo il ricaricamento).

---

## 8. Interfaccia

### 8.1 Mappa delle schermate (aggiornamento della 9.1 della v1)

| Sezione | Sottoschede |
|---|---|
| Calcola | Analisi · Conversioni · Mask · Stessa subnet (invariato; Analisi con gli snippet della 5.3) |
| Pianifica | Calcolo inverso · Suddivisione · **VLSM** · **Riassunto** · Piani salvati |
| Guide | Guida all'uso · Guida al subnetting · **Allenamento** |
| Impostazioni | invariato; in Dati, il riepilogo conta anche gli esercizi dell'allenamento |

Piani salvati elenca i tre tipi con un'etichetta (Suddivisione, VLSM, Riassunto) e li apre nella vista giusta.

### 8.2 VLSM

- Campo **Blocco** (IP/prefisso, come Suddivisione); **tabella dei segmenti** con una riga per segmento (Nome, Host) e i pulsanti "Aggiungi segmento" e "Togli" su ogni riga; Invio nell'ultimo campo Host aggiunge una riga; incollare più righe in un campo le divide in segmenti (`parseSegments`), con l'annuncio "N segmenti incollati".
- Opzioni: **Margine di crescita** (controllo segmentato 0 · 25% · 50% · 100%) e interruttore "Collegamenti punto-punto come /31".
- Calcolo dal vivo come nella v1 (150 ms); gli errori per riga stanno sotto il campo della riga.
- Risultato: riepilogo (usati, liberi, utilizzo con una barra che ha anche il testo); tabella del piano nell'ordine di assegnazione, con l'interruttore "Ordine dato" che mostra la stessa tabella nell'ordine dei segmenti; ogni riga ha "Apri in Analisi"; tabella dello spazio libero con "Apri in Suddivisione".
- Su telefono la tabella del piano diventa una pila di schede (nome, subnet, host disponibili, scorta), come la scheda risultato della v1.
- "Salva come piano" con nome proposto dal blocco e note; un piano aperto si aggiorna mentre si modifica (come le etichette della v1) e si chiude se cambia il blocco.
- "?" verso `#/guide/uso/vlsm`; passaggi con il collegamento al cap. 16.

```
┌──────────────────────────────┐
│ Pianifica                🕘  │
│ ‹[Suddiv.][VLSM][Riassunto]› │
│ Blocco [ 192.168.100.0/24 ]  │
│ Segmenti                     │
│ [Laboratorio    ] [ 100 ] ✕  │
│ [Aule           ] [  50 ] ✕  │
│ [Uffici         ] [  25 ] ✕  │
│ + Aggiungi segmento          │
│ Margine [0|25%|50%|100%]     │
│ Punto-punto come /31   ( )   │
│ ┌ Piano ── 248 su 256 · 97%┐ │
│ │ Laboratorio  .0/25   126 │ │
│ │ Aule         .128/26  62 │ │
│ │ …                        │ │
│ │ Libero  192.168.100.248/29│ │
│ └──────────────────────────┘ │
│ [Salva come piano] [Esporta▾]│
└──────────────────────────────┘
```

### 8.3 Riassunto

- Area di testo **Reti** (una per riga), con il conteggio "N reti" e, per gli errori, la riga indicata ("Riga 3: …"); esempio cliccabile con le quattro reti del cap. 17.
- Risultato: scheda del **riassunto unico** (in evidenza; con l'avviso "Riassunto troppo largo" ben visibile, numero di indirizzi in più e blocchi estranei, ciascuno con "Apri in Analisi"); scheda del **riassunto esatto** con le rotte; elenco delle reti date con lo stato (tenuta, doppione, contenuta in …).
- Passaggi con il selettore Binario · Rapido; "?" verso `#/guide/uso/riassunto`.

### 8.4 Frammenti nuovi (aggiunta alla 9.3 della v1)

| Indirizzo | Effetto |
|---|---|
| `#/pianifica/vlsm?b=192.168.100.0&p=24&seg=Laboratorio:100;Aule:50&g=25&p2p=1` | VLSM precompilato (`g` e `p2p` facoltativi) |
| `#/pianifica/vlsm?piano=<id>` | piano VLSM salvato |
| `#/pianifica/riassunto?r=172.16.32.0/24,172.16.33.0/24` | Riassunto precompilato |
| `#/pianifica/riassunto?piano=<id>` | piano di riassunto salvato |
| `#/guide/allenamento?tipi=analysis,mask&livello=1&n=10&seme=k3x9a` | serie condivisibile |
| `#/guide/allenamento` | modalità scelta dall'utente |
| `#/calcola/analisi?ip=…&p=…&f10=1&prod=junos` | snippet con il produttore (`cisco`, `junos`, `routeros`, `nftables`) |

- `seg`: segmenti separati da `;`, nome e host da `:` (l'ultimo `:` del segmento), nomi codificati con `encodeURIComponent`. `seg` e `r` hanno un limite di **2.000 caratteri** (t6); oltre, il collegamento non si propone e l'interfaccia suggerisce di salvare il piano.
- Mentre si scrive nei segmenti o nelle reti il frammento si aggiorna (senza voci nella cronologia del browser) solo se resta entro il limite.

### 8.5 Allenamento

- **Impostazione della serie**: tipi (caselle, almeno uno), livello (controllo segmentato), lunghezza (5 · 10 · 20 · Libera); "Inizia". Un collegamento con `seme` apre direttamente la serie, con la riga "Serie condivisa: tutti quelli che usano questo collegamento ricevono gli stessi esercizi".
- **Esercizio**: domanda in alto (per esempio "Trova rete, broadcast, primo e ultimo host e numero di host di 10.20.30.140/27"); un campo per ogni risposta, con le stesse tastiere del resto dell'app; "Verifica" (anche con Invio nell'ultimo campo). Il **cronometro** parte quando l'esercizio compare e si ferma alla verifica; il tempo trascorso si vede in piccolo e non viene annunciato a ogni secondo (`aria-live` spento), solo nell'esito.
- **Pagina nascosta**: con `visibilitychange` il cronometro si mette in pausa e riparte al ritorno (il tempo conta solo con la pagina visibile); tempi misurati con `performance.now()`.
- **Esito**: per ogni campo ✓ o ✗ con il testo (giusto, sbagliato, non leggibile, con la spiegazione dell'errore di parsing), la risposta attesa, "Vedi i passaggi" e "Prossimo esercizio". Annuncio dell'esito ai lettori di schermo ("4 risposte giuste su 5, 48 secondi").
- **Fine della serie**: riepilogo (giuste, tempo totale e medio, esercizio più lento), "Rifai la stessa serie", "Nuova serie", "Copia il collegamento della serie".
- **Statistiche**: per tipo e livello, calcolate dai tentativi (esercizi, tutti giusti, percentuale, tempo medio, tempo migliore); "Cancella i tentativi" con conferma.
- **Stato della serie** in memoria durante la visita: tornare da "Vedi i passaggi" con il tasto indietro riporta all'esercizio, con l'esito visibile.

```
┌──────────────────────────────┐
│ Guide                        │
│ [Uso][Subnetting][Allenam.]  │
│ Esercizio 3 di 10 · Base     │
│ Analisi di 10.20.30.140/27   │
│ Rete        [10.20.30.128 ]✓ │
│ Broadcast   [10.20.30.159 ]✓ │
│ Primo host  [10.20.30.129 ]✓ │
│ Ultimo host [10.20.30.158 ]✓ │
│ Host        [32           ]✗ │
│   atteso 30 (2⁵ − 2)         │
│ 4 su 5 · 48 s                │
│ [Vedi i passaggi] [Prossimo] │
└──────────────────────────────┘
```

### 8.6 Accessibilità

Stesso obiettivo della v1 (WCAG 2.2 AA). In più:
- tabella dei segmenti: ogni campo con l'etichetta della colonna e il numero della riga ("Nome del segmento 3"), "Togli" con il nome del segmento, focus sul campo nuovo dopo "Aggiungi" e sulla riga precedente dopo "Togli";
- avviso "Riassunto troppo largo" con icona **e** testo, mai solo colore;
- esiti dell'allenamento con ✓/✗ e testo; cronometro non annunciato a ogni secondo;
- barra dell'utilizzo con il valore anche in testo.

---

## 9. Guide

### 9.1 Guida al subnetting v0.6 (durante lo sviluppo)

| Capitolo | Modifica | Fase |
|---|---|---|
| 8 | "Allenamento libero": collegamento all'Allenamento, con i livelli | 12 |
| 11 | caso C non fattibile: collegamento al pianificatore VLSM | 11 |
| 14 | ACL estese e altri produttori, con un "Apri nel calcolatore" che apre gli snippet | 13 |
| 16 | riquadro "Nel calcolatore": "Apri nel calcolatore: il piano della sede" (E1) e il caso con il margine (E3) | 11 |
| 17 | riquadro "Nel calcolatore": i due esempi del capitolo nel Riassunto | 11 |
| App. C | righe di cap. 8, 16, 17 con la scheda dell'app al posto di "arriverà con la versione 2"; riga del cap. 14 con gli altri produttori | 11–13 |

Il testo dei capitoli non cambia oltre a questi riquadri: la rilettura generale è nella fase 15 (guida v1.0, con le note di Paolo).

### 9.2 Guida all'uso

Sezioni nuove: `uso-vlsm`, `uso-riassunto` (parte "Pianifica"), `uso-allenamento` (nuova parte "Allenarsi"); aggiornate `uso-analisi` (produttori degli snippet), `uso-export` (XLSX), `uso-sessione` (esercizi dell'allenamento), `uso-piani` (tre tipi), `uso-schermate`. Ogni "?" nuovo ha la sua sezione (il test della fase 6 lo controlla già).

---

## 10. Test e oracolo

### 10.1 Casi a tabella

- **F08**: E1–E7 della 3.2; parsing dei segmenti incollati (tabulazione, `;`, `,`, intestazione, righe vuote, nome con virgole, numero con il punto delle migliaia, riga sbagliata con il numero di riga); margini 0/25/50/100 sullo stesso piano; nomi doppi; 256 e 257 segmenti.
- **F09**: tutti gli esempi della 3.3; elenchi con doppioni, contenuti, bit di host; separatori misti; riga senza prefisso; 1.024 e 1.025 reti; caso con più di 1.024 blocchi estranei (taglio e avviso).
- **F13**: per ogni tipo e livello, una serie a seme fisso confrontata con `tests/fixtures/training-series.json`; per ogni campo, le forme ammesse della 3.4.3 (giuste e sbagliate); /31 e /32 con "nessuno"; seme non valido; tipi, livelli e lunghezze non validi.
- **F10 v2**: l'esempio della 3.5 per ogni produttore; /32 e /0 per ogni produttore; limiti dei numeri delle ACL estese (99 e 200 non validi, 100, 199, 2000, 2699 validi); porta con `ip` e `icmp` → `PORT_PROTOCOL`; porte 0 e 65.536; area OSPF intera e puntata in RouterOS.
- **XLSX**: documento con coppie, con tabella, con più tabelle, con passaggi; caratteri speciali e di controllo; testo che inizia con `=`; nomi di fogli lunghi o con caratteri vietati; con e senza `CompressionStream` (in Node si può togliere per la prova).
- **Sessione v2**: corpus nuovo in `tests/fixtures/sessions/v2/`, un file per regola 11–14; tutto il corpus v1 migrato; andata e ritorno con i tre tipi di piano e i tentativi; Unisci dei tentativi; inquinamento del prototipo nei campi nuovi.

### 10.2 Proprietà (fast-check, 1.000 esecuzioni a seme fisso)

| N. | Proprietà |
|---|---|
| P14 | F08: le subnet sono disgiunte, allineate (rete mod dimensione = 0), dentro il blocco, con host disponibili ≥ host previsti ≥ host richiesti |
| P15 | F08: subnet + spazio libero coprono esattamente il blocco, senza sovrapposizioni; `usedAddresses + freeAddresses = totalAddresses` |
| P16 | F08: permutando i segmenti, l'insieme delle subnet assegnate e lo spazio libero non cambiano; cambia solo quale segmento riceve quale subnet tra quelli della stessa dimensione |
| P17 | F08: `VLSM_NO_SPACE` se e solo se la somma delle dimensioni supera il blocco; con il blocco di `minPrefix` (stessa rete allineata) il piano entra |
| P18 | F09: il riassunto esatto copre esattamente l'unione delle reti date, ed è minimo (nessuna coppia unibile) |
| P19 | F09: il riassunto unico contiene tutte le reti; la rete con un bit di prefisso in più che contiene la prima rete non contiene l'ultima |
| P20 | F09: `extraAddresses = 0` se e solo se il riassunto esatto è una sola rete uguale al riassunto unico |
| P21 | F13: stesso seme, tipi, livello e lunghezza → stessa serie; indirizzi sempre nei blocchi RFC 1918 compatibili; prefissi nel livello |
| P22 | F13: la soluzione attesa, scritta nella forma canonica, è sempre `right`; cambiando un campo con un valore diverso valido diventa `wrong` |
| P23 | XLSX: `toXlsx` produce un ZIP valido (CRC giusti, directory centrale coerente) per ogni documento generato a caso |
| P24 | Sessione: export → import di una sessione v2 generata a caso restituisce gli stessi dati |
| P25 | Ogni risultato dei motori nuovi supera `JSON.parse(JSON.stringify(x))` senza perdite (P13 estesa) |

P6 e P12 (coerenza tra metodi e tra passaggi e risultato) si estendono a F08 e F09.

### 10.3 Oracolo (`tools/oracle.py`, fixture `oracle-v2.json`)

- **F08**: implementazione indipendente in Python (quella usata per gli esempi della fase 10: `ipaddress.ip_network`, ordinamento, `summarize_address_range` per lo spazio libero) su 500 piani casuali a seme fisso (blocchi /8–/30, 1–40 segmenti, margini e `p2p31` a caso, anche piani che non entrano).
- **F09**: `ipaddress.collapse_addresses` per il riassunto esatto, bit in comune per quello unico, `address_exclude` per i blocchi estranei; 1.000 elenchi casuali (1–64 reti, anche sovrapposte e con bit di host).
- **F13**: le soluzioni di 1.000 esercizi per tipo e livello, generati dal motore JavaScript (`tests/fixtures/training-series.json`, scritto da uno script Node) e risolti da Python.
- **XLSX**: `tools/xlsx-check.py` con `openpyxl` rilegge i file di `tools/xlsx-fixtures.js` e controlla fogli, valori, tipi delle celle, intestazione bloccata, testi con `=`.
- Come nella v1, in CI i fixture si rigenerano e si confrontano con quelli salvati; l'oracolo v1 (`oracle-f01.json`, `oracle-misc.json`) deve restare identico.

### 10.4 Prove nel browser (`npm run e2e`)

Per ogni fase, oltre alle prove della v1 (che restano tutte):
- **11**: VLSM da tastiera (aggiungi, togli, Invio), incolla da foglio di calcolo, margine, /31, errore di spazio con il prefisso minimo, piano salvato e riaperto, "Apri in Analisi"; Riassunto con i due esempi del cap. 17, avviso visibile, blocchi estranei; collegamenti del cap. 16 e 17; sessione v2 con Sostituisci e Unisci; dati v1 nel browser migrati; 390 px con la pila di schede; axe su VLSM, Riassunto e Piani salvati in tutti i temi.
- **12**: serie da 5 interamente da tastiera, esito annunciato, "Vedi i passaggi" e ritorno con il tasto indietro, collegamento con il seme che riproduce la serie, pausa del cronometro con la pagina nascosta (simulata), statistiche, tentativi salvati e ricaricati; axe in tutti i temi e a 390 px.
- **13**: download XLSX da ogni vista (file non vuoto, tipo giusto, riletto in Node); snippet per ogni produttore con copia; axe sulla sezione degli snippet.

### 10.5 Criteri di uscita

Quelli del piano (2.1 e 2.2), più: copertura dei moduli nuovi ≥ 95% di istruzioni e di rami; oracolo v2 con 0 differenze; fixture v1 invariati.

---

## 11. Rischi e verifiche rimandate

| Rischio | Verifica | Fase |
|---|---|---|
| Excel rifiuta o ripara un XLSX scritto da noi (Excel è più severo di openpyxl) | prova di Paolo in Excel e in LibreOffice; parti minime ma complete (stili compresi) | 13 |
| `CompressionStream("deflate-raw")` assente in un browser | file non compresso, provato nei test; voce nella lista delle prove | 13 |
| Pages da tag rifiutato dalle regole dell'ambiente `github-pages` | regola per i tag `v*` (piano 3.1), prova con la prima beta | 11 |
| Frammenti lunghi (segmenti, reti) troncati da qualche programma che condivide i collegamenti | limite di 2.000 caratteri; "Salva come piano" per i lavori lunghi | 11 |
| Sintassi dei produttori cambiata o diversa tra versioni | commento "verifica sul tuo apparato"; fonti ricontrollate nella fase 13 | 13 |
| Tempi dell'allenamento falsati da schede in secondo piano o telefono in pausa | pausa con `visibilitychange`; prova e2e simulata | 12 |
| Spazio del browser con tentativi e cronologia di F08/F09 | riduzione a scalini (7); 500 tentativi ≈ 150 KB | 11–12 |
| Peso oltre il budget | `npm run size` a ogni build, limiti per fase (2.4) | 11–13 |
| Lettori di schermo con tabelle modificabili e cronometro | prova con un lettore reale, se Paolo può | 14–15 |
