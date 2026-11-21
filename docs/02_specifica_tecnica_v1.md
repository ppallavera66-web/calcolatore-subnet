# Calcolatore Subnet: specifica tecnica v1

Versione 1.0 · 18 novembre 2026 · Stato: approvata da Paolo (fase 2)

Documenti di riferimento: `01_specifiche_progetto.md` (v1.1), `guida-subnetting.html` (v0.3), `STATO_PROGETTO.md`.

Nel documento "deve" indica un requisito, "può" una facoltà. Gli esempi numerici sono stati verificati con uno script indipendente basato sul modulo `ipaddress` di Python.

---

## Indice

0. Scopo e ambito della v1
1. Decisioni della fase 2
2. Architettura: moduli, dipendenze, build
3. Motore di calcolo
4. Passaggi didattici (F12)
5. Export v1
6. Sessione JSON
7. Busta cifrata
8. Persistenza locale
9. Interfaccia: schermate e flussi
10. Strategia di test per la fase 3
11. Rischi e verifiche rimandate
12. Consegne e accettazione della fase 3

---

## 0. Scopo e ambito della v1

Questo documento traduce le specifiche di progetto in decisioni tecniche, abbastanza precise da poter scrivere il codice e i test senza ulteriori scelte di fondo.

**Nella v1**: F01–F07, F10 base, F12; impostazioni con i tre interruttori e i quattro temi; persistenza facoltativa; export nei formati v1; sessione JSON con cifratura facoltativa; integrazione delle due guide (fase 6).

**Fuori dalla v1**: F08 VLSM, F09 summarization, F13 allenamento, export XLSX, snippet avanzati (v2); F11 IPv6 (v3). Il manifest PWA resta facoltativo e si valuta in fase 7, con l'app ospitata in HTTPS.

Lo schema JSON e la struttura dei moduli sono pensati fin d'ora per accogliere le funzioni v2 senza rompere i file v1 (sezioni 2.1 e 6.3).

---

## 1. Decisioni della fase 2

### 1.1 Decisioni principali

| ID | Tema | Decisione |
|---|---|---|
| D1 | Build | **Vite** con **vite-plugin-singlefile**; test con **Vitest**. Il risultato è un unico HTML con JavaScript, CSS e font incorporati. |
| D2 | Persistenza | **localStorage** dietro un adattatore sostituibile. Verifica da disco e da HTTPS in fase 5. |
| D3 | Font | **IBM Plex incorporato** (licenza OFL), WOFF2, solo caratteri latini, 6 pesi: Sans 400/600, Mono 400/600, Sans Condensed 600/700. Corsivo simulato dal browser. |
| D4 | Sorgenti | **GitHub, repository pubblico**; test e build con GitHub Actions, file unico nelle Releases, pubblicazione HTTPS con GitHub Pages. Specifiche e stato restano nel progetto Claude, con copia in `/docs`. |

### 1.2 Decisioni minori

| ID | Decisione |
|---|---|
| m1 | JavaScript ES2022, tipi in JSDoc con `// @ts-check`, controllati da `tsc --noEmit` (nessuna compilazione TypeScript). |
| m2 | Test: Vitest + fast-check (test a proprietà) + oracolo indipendente in Python (`ipaddress`). |
| m3 | Prefisso **/0**: ottetto interessante il primo, **M = 256**, un unico blocco 0–255. In tabella: `256 · 1°`. |
| m4 | Il motore restituisce esiti con **codici stabili** e valori; i passaggi didattici sono dati strutturati. I testi in italiano li scrivono interfaccia ed export. |
| m5 | Input: zeri iniziali negli ottetti rifiutati con spiegazione; virgola accettata come punto; formati `IP/n`, `IP mask`, `IP/mask`. |
| m6 | Cronologia e piani salvano **solo gli input**; i risultati si ricalcolano. Cronologia massima 200 voci. |
| m7 | Import: limite 5 MB, anteprima, "Sostituisci" o "Unisci"; impostazioni applicate solo su scelta; "Memorizza i dati" mai modificato da un import; versioni precedenti migrate, successive rifiutate. |
| m8 | Busta cifrata: intestazione legata al contenuto come dato autenticato aggiuntivo (AAD) di GCM; iterazioni accettate da 600.000 a 10.000.000. Formato della sezione 4.1 delle specifiche invariato. |
| m9 | F06: conteggio e generazione a pagine; interfaccia 256 righe per pagina; export fino a 65.536 righe, oltre si sceglie un intervallo. |
| m10 | Navigazione con frammento (`#/calcola/analisi?ip=…&p=…`): funziona da disco, abilita "Apri nel calcolatore" e i preferiti. |
| m11 | F04: tabella del cap. 4 della guida più 224.0.0.0/4 e 240.0.0.0/4; vince il blocco più specifico. Blocchi aggiuntivi solo dopo la revisione finale. |
| m12 | F07: campo facoltativo "gateway", verificato rispetto alla subnet di ciascun host. |
| m13 | Numeri con separatore delle migliaia "." nell'interfaccia, senza separatori in CSV e JSON; CSV con `;`, CRLF e BOM UTF-8. |
| m14 | Licenza MIT per il codice; licenza OFL dei font inclusa nel file. |

---

## 2. Architettura: moduli, dipendenze, build

### 2.1 Struttura del repository

Nome proposto: `calcolatore-subnet`.

```
calcolatore-subnet/
├─ index.html                  pagina di ingresso (guscio dell'app)
├─ package.json  package-lock.json
├─ vite.config.js              Vite + singlefile + configurazione Vitest
├─ jsconfig.json               checkJs per tsc --noEmit
├─ src/
│  ├─ engine/                  MOTORE: funzioni pure, nessun DOM
│  │  ├─ index.js              API pubblica (unico punto di import per gli altri moduli)
│  │  ├─ result.js             ok(), fail(), warn()
│  │  ├─ errors.js             codici di errore e di avviso
│  │  ├─ ipv4.js               parsing, formattazione, conversioni uint32 ↔ testo/binario/esadecimale
│  │  ├─ prefix.js             prefisso ↔ mask, wildcard, ottetto interessante, numero magico
│  │  ├─ analyze.js            F01
│  │  ├─ convert.js            F02
│  │  ├─ validate-mask.js      F03
│  │  ├─ classify.js           F04
│  │  ├─ special-blocks.js     dati: blocchi speciali del cap. 4
│  │  ├─ inverse.js            F05
│  │  ├─ subdivide.js          F06
│  │  ├─ same-subnet.js        F07
│  │  ├─ snippets.js           F10 base
│  │  └─ steps/                F12
│  │     ├─ index.js           explain(fn, risultato, metodo)
│  │     ├─ binary.js  magic.js  multiples.js  rules.js
│  ├─ i18n/
│  │  └─ strings.it.js         tutti i testi: etichette, errori, avvisi, passaggi
│  ├─ session/                 schema, validazione, migrazioni, unione (fase 5)
│  │  ├─ schema.js  validate.js  migrate.js  session.js  envelope.js
│  ├─ storage/
│  │  └─ storage.js            adattatore localStorage (fase 5)
│  ├─ export/                  rows.js csv.js markdown.js text.js json.js clipboard.js print.js download.js
│  ├─ ui/                      interfaccia (fase 4)
│  │  ├─ main.js  router.js  state.js  theme.js  format.js
│  │  ├─ views/                calcola/ pianifica/ guide/ impostazioni/
│  │  └─ components/           ip-field prefix-field result-card steps-panel export-bar toggle dialog help-link to-top
│  ├─ styles/                  tokens.css base.css layout.css components.css print.css
│  ├─ assets/fonts/            *.woff2 + OFL.txt
│  └─ guides/                  guida all'uso e guida al subnetting (fase 6)
├─ tests/
│  ├─ engine/                  un file per modulo del motore
│  ├─ session/                 (fase 5)
│  ├─ fixtures/                oracle-*.json generati da tools/oracle.py, corpus di file di sessione
│  └─ architecture.test.js     regola delle dipendenze
├─ tools/
│  ├─ oracle.py                genera i risultati attesi con ipaddress
│  └─ size-check.js            limite di peso del file finale
├─ docs/                       copia di specifiche, specifica tecnica e stato del progetto
└─ .github/workflows/ci.yml
```

### 2.2 Responsabilità dei moduli

| Modulo | Responsabilità | Fase |
|---|---|---|
| `engine` | Tutti i calcoli e i passaggi didattici, come dati. Nessun testo per l'utente, nessun accesso a DOM, storage, rete, orologio o numeri casuali. | 3 |
| `i18n` | Testi italiani indicizzati per codice; funzione `t(codice, parametri)`. | 3 (errori), 4 |
| `export` | Trasforma un risultato del motore in righe e poi nei formati v1; download e appunti. | 5 |
| `session` | Costruzione, validazione, migrazione, unione della sessione; busta cifrata. | 5 |
| `storage` | Lettura e scrittura nel browser tramite adattatore. | 5 |
| `ui` | Schermate, navigazione, stato dell'app, temi, componenti. | 4 |

### 2.3 Regola delle dipendenze

| Modulo | Può importare da |
|---|---|
| `engine` | solo `engine` |
| `i18n` | nessuno |
| `storage` | nessuno |
| `session` | `engine` |
| `export` | `engine`, `i18n` |
| `ui` | tutti |

Gli altri moduli importano il motore solo da `engine/index.js`. Il test `architecture.test.js` legge le istruzioni `import` di ogni file e fallisce se la tabella non è rispettata; controlla inoltre che nei file di `engine` non compaiano `document`, `window`, `localStorage`, `fetch`, `Date` e `Math.random`. I test del motore girano in Node, senza ambiente browser.

### 2.4 Build e strumenti

- **Node.js**: versione LTS corrente. Le versioni delle dipendenze si fissano al momento dello scaffold nel `package-lock.json`.
- **Dipendenze di sviluppo**: `vite`, `vite-plugin-singlefile`, `vitest`, `@vitest/coverage-v8`, `fast-check`, `typescript` (solo per il controllo dei tipi). Nessuna dipendenza finisce nel file distribuito.
- **Comandi**:

| Comando | Effetto |
|---|---|
| `npm run dev` | server di sviluppo con aggiornamento immediato |
| `npm test` | test (Vitest), in modalità continua con `npm test -- --watch` |
| `npm run coverage` | test con copertura |
| `npm run check` | controllo dei tipi (`tsc --noEmit`) |
| `npm run build` | `dist/index.html`, file unico |
| `npm run size` | verifica il limite di peso |
| `npm run oracle` | rigenera i fixture con `tools/oracle.py` |

- **Configurazione Vite**: plugin `viteSingleFile()`; `build.target: "es2022"`; minificazione attiva; niente sourcemap; i font WOFF2 incorporati in base64 nel CSS.
- **Limite di peso**: `dist/index.html` al massimo **1 MB** (1.048.576 byte), guide comprese. `size-check.js` fallisce oltre il limite e stampa il peso per categoria (JS, CSS, font, guide).
- **Nome del file distribuito**: `calcolatore-subnet-vX.Y.Z.html`, prodotto dal flusso di rilascio.
- **Browser supportati**: le ultime due versioni di Chrome, Edge, Firefox e Safari, desktop e mobile (iOS e Android). Lo script inline di tipo `module` funziona anche con la pagina aperta da disco; i sorgenti modulari invece si usano solo con `npm run dev`.

### 2.5 Integrazione continua (GitHub Actions)

- A ogni push e pull request: installazione, `check`, `test` con copertura, `build`, `size`.
- A ogni tag `v*`: come sopra, poi creazione della Release con il file unico allegato.
- Dal ramo `main`: pubblicazione su GitHub Pages (HTTPS), utile per Web Crypto, uso da telefono e PWA.

---

## 3. Motore di calcolo

### 3.1 Convenzioni comuni

- **Indirizzi**: interi senza segno da 0 a 4.294.967.295, rappresentati come `Number` e normalizzati con `>>> 0` dopo ogni operazione bit a bit. Il valore 2^32 compare solo come conteggio (indirizzi di un /0).
- **Prefissi**: interi da 0 a 32.
- **Esito**: ogni funzione pubblica restituisce

```js
{ ok: true,  value: { ... }, warnings: [ { code, params } ] }
{ ok: false, error: { code, field, params } }
```

  Le funzioni non lanciano eccezioni per input dell'utente; un'eccezione indica solo un errore di programmazione. `field` indica il campo da evidenziare (`ip`, `prefix`, `mask`, …).
- **Output serializzabile**: solo oggetti semplici, numeri, stringhe, booleani, `null`. Niente `BigInt`, `Map`, `Set`, `Date`.
- **Due livelli di API**: funzioni su valori già validati (`analyze(ip, prefix)`) e funzioni su testo (`analyzeText(testoIP, testoPrefisso)`) che fanno parsing e validazione e poi chiamano le prime. L'interfaccia usa le seconde.
- **Formattazione**: il motore esporta gli strumenti di formattazione tecnica (`toDotted`, `toBinaryDotted`, `octetToBinary`, `toHex`), non quelli per l'utente (separatori delle migliaia, testi): quelli stanno in `ui/format.js` e `i18n`.

### 3.2 Ottetto interessante e numero magico

`interestingOctet(p)` restituisce `{ index, magic, bits, maskOctet, boundary }`:

| Prefisso | `index` (0 = primo) | Bit di rete nell'ottetto `b` | `magic` M | `boundary` |
|---|---|---|---|---|
| 0 | 0 | 0 | 256 | sì (m3) |
| 1–7 | 0 | p | 2^(8−b) | no |
| 8, 16, 24, 32 | p/8 − 1 | 8 | 1 | sì (convenzione della guida) |
| altri | ⌈p/8⌉ − 1 | p − 8·index | 2^(8−b) | no |

- `maskOctet` = 256 − M (per /0 vale 0, per i multipli di 8 vale 255).
- Con `boundary: true` l'interfaccia spiega la convenzione (cap. 6): l'ottetto interessante è l'ultimo che vale 255, le subnet avanzano di 1 in quell'ottetto e gli ottetti a destra vanno da 0 a 255. Per /0 spiega che il blocco è unico.
- Visualizzazione: `M · n°` (ordinale da 1), come nella colonna M della cheat sheet.

### 3.3 Regole sugli host

| Prefisso | Indirizzi | Host utilizzabili | Primo host | Ultimo host | Broadcast | `hostKind` |
|---|---|---|---|---|---|---|
| 0–30 | 2^(32−p) | 2^(32−p) − 2 | rete + 1 | broadcast − 1 | rete OR wildcard | `standard` |
| 31 | 2 | 2 | rete | rete + 1 | `null` (nessuno) | `p2p` (RFC 3021) |
| 32 | 1 | 1 | rete | rete | `null` (nessuno) | `single` |

### 3.4 Codici di errore e di avviso

Errori (`ok: false`):

| Codice | Quando | Parametri |
|---|---|---|
| `IP_EMPTY` | campo vuoto | — |
| `IP_FORMAT` | non quattro ottetti decimali separati da punti | `text` |
| `IP_OCTET_RANGE` | ottetto oltre 255 | `index`, `value` |
| `IP_LEADING_ZERO` | ottetto con zeri iniziali (`010`) | `index`, `value` |
| `INPUT_FORMAT` | combinazione IP/prefisso non riconosciuta | `text` |
| `PREFIX_EMPTY` | prefisso mancante dove richiesto (`10.0.0.1/`) | — |
| `PREFIX_FORMAT` | prefisso non numerico | `text` |
| `PREFIX_RANGE` | prefisso fuori da 0–32 | `value` |
| `MASK_FORMAT` | mask non in forma a quattro ottetti | `text` |
| `MASK_LEADING_ZERO` | mask con zeri iniziali in un ottetto (`255.255.255.000`), dalla v1.1 | `index`, `value` |
| `NUMBER_FORMAT` | numero non valido nella base indicata | `text`, `base` |
| `NUMBER_RANGE` | numero fuori da 0–4.294.967.295 | `value` |
| `BASE_UNSUPPORTED` | base diversa da 2, 10, 16 | `base` |
| `HOSTS_RANGE` | host richiesti fuori da 1–4.294.967.294 | `value` |
| `SUBNETS_RANGE` | subnet richieste < 1 | `value` |
| `SUBNETS_TOO_MANY` | il blocco non contiene abbastanza subnet | `requested`, `max` |
| `PREFIX_SHORTER` | nuovo prefisso più corto del blocco (F06) | `block`, `requested` |
| `PAGE_RANGE` | `offset` o `limit` non validi (F06) | `offset`, `limit` |
| `ACL_NUMBER_RANGE` | numero ACL standard fuori da 1–99 e 1300–1999 | `value` |
| `OSPF_PROCESS_RANGE` | processo OSPF fuori da 1–65535 | `value` |
| `OSPF_AREA_FORMAT` | area né intero 0–4.294.967.295 né forma puntata | `text` |

Avvisi (`warnings`, il risultato resta valido):

| Codice | Quando |
|---|---|
| `W_IS_NETWORK` | l'IP coincide con l'indirizzo di rete (prefisso ≤ 30) |
| `W_IS_BROADCAST` | l'IP coincide con il broadcast (prefisso ≤ 30) |
| `W_P2P` | prefisso /31: solo collegamenti punto-punto |
| `W_SINGLE` | prefisso /32: un solo host |
| `W_HOST_BITS_SET` | blocco indicato con bit di host a 1, normalizzato alla rete |
| `W_LOOKS_LIKE_WILDCARD` | mask non valida, ma il suo inverso è una mask valida |
| `W_MASKS_DIFFER` | F07: i due host usano prefissi diversi |
| `W_GATEWAY_OUTSIDE` | F07: il gateway non sta nella subnet dell'host |
| `W_GATEWAY_IS_NETWORK` / `W_GATEWAY_IS_BROADCAST` / `W_GATEWAY_IS_HOST` | F07: gateway uguale a rete, broadcast o all'host stesso |
| `W_NO_USABLE_HOSTS` | F05/F06: subnet risultanti /31 o /32 |
| `W_LARGE_LIST` | F06: oltre 65.536 subnet, l'export richiede un intervallo |
| `W_SAME_PREFIX` | F06: nuovo prefisso uguale a quello del blocco (una sola subnet) |

### 3.5 Parsing degli input (`ipv4.js`)

**`parseIPv4(testo)`**
1. Toglie gli spazi iniziali e finali; vuoto → `IP_EMPTY`.
2. Sostituisce le virgole con punti (tastiera numerica italiana).
3. Divide sui punti: devono risultare esattamente 4 parti, ciascuna di 1–3 cifre ASCII (`/^\d{1,3}$/`), altrimenti `IP_FORMAT`. Cifre a larghezza piena, spazi interni e punti doppi sono `IP_FORMAT`.
4. Una parte con più cifre che inizia per `0` → `IP_LEADING_ZERO` (alcuni strumenti leggono `010` come ottale, cioè 8).
5. Valore oltre 255 → `IP_OCTET_RANGE`.

**`parseAddressInput(testo)`**: riconosce le forme `a.b.c.d`, `a.b.c.d/n`, `a.b.c.d / n`, `a.b.c.d/m.m.m.m` e `a.b.c.d m.m.m.m` (uno o più spazi). Restituisce `{ ip, prefix | null, prefixSource: "cidr" | "mask" | null }`. Una mask non valida restituisce l'errore di F03 sul campo `mask`.

**`parsePrefix(testo)`**: accetta `n` o `/n`, da 0 a 32; ammessi zeri iniziali (`/08`), che non hanno ambiguità. Il campo del prefisso accetta anche la mask, con o senza la barra davanti (`/255.255.255.0`, dalla v1.1).

### 3.6 Schede delle funzioni

Ogni scheda indica firma, output, errori e avvisi, capitolo della guida, esempio verificato.

#### F01 · Analisi subnet · `analyze(ip, prefix)` · cap. 7, 9, 13

Output:

| Campo | Contenuto |
|---|---|
| `ip`, `prefix` | input |
| `mask`, `wildcard` | uint32 |
| `network`, `broadcast` | uint32; `broadcast` è `null` per /31 e /32 |
| `firstHost`, `lastHost` | uint32, regole della 3.3 |
| `totalAddresses`, `usableHosts`, `hostBits`, `hostKind` | regole della 3.3 |
| `interesting` | `{ index, magic, maskOctet, boundary, ipOctet, blockStart, blockEnd }` |
| `offset` | posizione dell'IP nel blocco, da 0 (`offset + 1` è "l'n-esimo indirizzo", cap. 12) |
| `role` | ruolo dell'IP: `network`, `broadcast`, `host`, `p2p`, `single` |
| `previousNetwork`, `nextNetwork` | reti adiacenti della stessa dimensione, `null` fuori dallo spazio IPv4 |
| `classification` | risultato di F04 |

Errori: quelli di parsing. Avvisi: `W_IS_NETWORK`, `W_IS_BROADCAST`, `W_P2P`, `W_SINGLE`.

Esempio `172.16.45.200/20`: rete `172.16.32.0`, broadcast `172.16.47.255`, host da `172.16.32.1` a `172.16.47.254`, 4.094 host, mask `255.255.240.0`, wildcard `0.0.15.255`, M `16 · 3°`, blocco 32–47, offset 3.528.

#### F02 · Conversioni · `convert.js` · cap. 3, 6

- `convertNumber(testo, base, { width })`: base 2, 10 o 16; valore 0–4.294.967.295. Output `{ value, dec, bin, hex, weights }`. `width` = 8, 32 o `auto` (minimo multiplo di 8, almeno 8). `weights` elenca i pesi dei bit a 1 (somma dei pesi, cap. 3). Prefissi `0b` e `0x` accettati; spazi e punti ignorati nella base 2 (per incollare `1100 1011`).
- `convertAddress(testo)`: indirizzo puntato → `{ dotted, binaryDotted, hexDotted, hex32, uint32 }`. Esempio `192.168.10.75` → `11000000.10101000.00001010.01001011`, `C0.A8.0A.4B`, `0xC0A80A4B`, 3.232.238.155.
- `prefixToMask(p)` → `{ mask, wildcard, maskBinary }`; `maskToPrefix(testo)` → usa F03.

Errori: `NUMBER_FORMAT`, `NUMBER_RANGE`, `BASE_UNSUPPORTED`, errori di parsing IP.

#### F03 · Validazione mask · `validateMask(testo)` · cap. 6

Output `{ valid, prefix | null, octets: [{ value, binary, allowed }], reason | null, suggestions }`. Una mask non valida è un risultato (`ok: true, valid: false`), non un errore; un testo che non ha forma di indirizzo dà `MASK_FORMAT`.

Ordine dei controlli e motivi:
1. Ogni ottetto deve essere uno dei 9 valori (0, 128, 192, 224, 240, 248, 252, 254, 255) → altrimenti `reason: { code: "MASK_OCTET_VALUE", params: { index, value, binary } }`.
2. Dopo un ottetto diverso da 255, tutti i successivi devono valere 0 → altrimenti `reason: { code: "MASK_NONCONTIGUOUS", params: { index } }`.

`suggestions`: le due mask valide più vicine, con prefissi `q` e `q + 1`, dove `q` è il numero di bit a 1 consecutivi da sinistra (se `q < 32`). Se l'inverso è una mask valida si aggiunge `W_LOOKS_LIKE_WILDCARD`.

Esempi: `255.255.255.192` valida /26; `255.255.250.0` non valida, ottetto 3 = `11111010`, suggerite `255.255.248.0` (/21) e `255.255.252.0` (/22); `255.255.0.255` non contigua dall'ottetto 4; `0.0.0.255` non contigua con `W_LOOKS_LIKE_WILDCARD` (/24); `0.0.0.0` valida /0; `255.255.255.254` valida /31.

#### F04 · Tipo di indirizzo · `classify(ip)` · cap. 4

Output `{ historicalClass: { letter, firstOctetRange, defaultPrefix | null, reserved }, scope, blocks, primary }`:
- classe dai primi bit: A 0–127, B 128–191, C 192–223, D 224–239, E 240–255. `defaultPrefix` 8/16/24 per A/B/C, `null` per D ed E. Per 0.x.x.x e 127.x.x.x `reserved: true` (esclusi dalla classe A, cap. 4);
- `scope`: `private` (RFC 1918), `special` (altri blocchi della tabella), `public` (nessun blocco);
- `blocks`: tutti i blocchi che contengono l'IP, dal più specifico; `primary` è il primo.

Tabella dati (`special-blocks.js`), uguale a quella del cap. 4 più le classi D ed E:

| Blocco | Codice | Ambito | Riferimento |
|---|---|---|---|
| 0.0.0.0/8 | `THIS_NETWORK` | special | RFC 1122 |
| 10.0.0.0/8 | `PRIVATE` | private | RFC 1918 |
| 100.64.0.0/10 | `CGNAT` | special | RFC 6598 |
| 127.0.0.0/8 | `LOOPBACK` | special | RFC 1122 |
| 169.254.0.0/16 | `LINK_LOCAL` (APIPA) | special | RFC 3927 |
| 172.16.0.0/12 | `PRIVATE` | private | RFC 1918 |
| 192.0.0.0/24 | `IETF_PROTOCOL` | special | RFC 6890 (dalla v1.1) |
| 192.0.2.0/24 | `DOCUMENTATION` | special | RFC 5737 |
| 192.168.0.0/16 | `PRIVATE` | private | RFC 1918 |
| 198.18.0.0/15 | `BENCHMARKING` | special | RFC 2544 (dalla v1.1) |
| 198.51.100.0/24 | `DOCUMENTATION` | special | RFC 5737 |
| 203.0.113.0/24 | `DOCUMENTATION` | special | RFC 5737 |
| 224.0.0.0/4 | `MULTICAST` (classe D) | special | RFC 5771 |
| 240.0.0.0/4 | `RESERVED` (classe E) | special | RFC 1112 |
| 255.255.255.255/32 | `LIMITED_BROADCAST` | special | RFC 919 |

Esempio: `255.255.255.255` → classe E, `primary` = `LIMITED_BROADCAST`, `blocks` = [`LIMITED_BROADCAST`, `RESERVED`].

#### F05 · Calcolo inverso · `inverse.js` · cap. 11

- `prefixForHosts(n)`, n da 1 a 4.294.967.294: h minimo con 2^h ≥ n + 2 e h ≥ 2; prefisso 32 − h. Output `{ prefix, mask, hostBits, needed: n + 2, power: 2^h, usableHosts, spare, alternatives }`. `alternatives`: `/31` (punto-punto) se n = 2, `/32` se n = 1.
- `prefixForSubnets(prefissoBlocco, s)`: s ≥ 1; bit presi in prestito = ⌈log₂ s⌉; nuovo prefisso = blocco + bit. Output `{ newPrefix, borrowedBits, subnets, spare, usableHostsPerSubnet }`. Oltre /32 → `SUBNETS_TOO_MANY`; risultato /31 o /32 → `W_NO_USABLE_HOSTS`.
- `prefixForBoth(prefissoBlocco, host, subnet)` (caso C): prefisso massimo ammesso dagli host `pH`, prefisso minimo richiesto dalle subnet `pS`. Fattibile se `pS ≤ pH` e `pH ≥ prefissoBlocco`. Output `{ feasible, range: [pS, pH], recommended: pH, alternative: pS, reason }`. `recommended` dà il maggior numero di subnet della dimensione minima sufficiente (come nella guida); `alternative` dà subnet più grandi. Se non è fattibile, `reason` indica il vincolo violato e l'interfaccia suggerisce un blocco più grande o il VLSM (v2).

Esempi: 43 host → /26, avanzano 19; 63 host → /25; 4.294.967.294 host → /0; `10.0.0.0/16` con 6 subnet → /19, 8 subnet, ne avanzano 2; `/24` con 20 host e 10 subnet → non fattibile (host → /27, subnet → /28); `/24` con 20 host e 8 subnet → /27.

#### F06 · Suddivisione · `subdivide.js` · cap. 11, 13

- `subdivide(ip, prefissoBlocco, nuovoPrefisso, { offset = 0, limit = 256 })`, con `limit` da 1 a 65.536.
- Il blocco viene normalizzato alla sua rete (`W_HOST_BITS_SET` se cambia). Nuovo prefisso uguale al blocco → una subnet e `W_SAME_PREFIX`; più corto → `PREFIX_SHORTER`.
- Output `{ block: { network, prefix }, newPrefix, count, borrowedBits, interesting, hostsPerSubnet, page: { offset, limit, items }, hasMore }`. Ogni elemento: `{ index, network, broadcast | null, firstHost, lastHost, usableHosts }`.
- Funzioni collegate: `subnetAt(blocco, nuovoPrefisso, indice)`, `indexOf(blocco, nuovoPrefisso, ip)` (quale subnet contiene un IP) e il generatore `iterateSubnets(...)` per l'export.
- `count` oltre 65.536 → `W_LARGE_LIST`.

Esempi: `10.0.0.0/16` → /19: 8 subnet da `10.0.0.0` a `10.0.224.0`, passo 32; `192.168.10.0/23` → /26: 8 subnet, la quinta è `192.168.11.0/26` (riporto, cap. 13); `10.0.0.0/8` → /30: 4.194.304 subnet, l'ultima (indice 4.194.303) è `10.255.255.252/30`; `10.0.5.0/16` → normalizzato a `10.0.0.0/16`.

#### F07 · Stessa subnet · `sameSubnet({ a, prefixA, b, prefixB, gateway })` · cap. 15

- `prefixB` facoltativo (se assente vale `prefixA`); `gateway` facoltativo (m12).
- Calcoli: rete di A e rete di B secondo la mask di A (A vede B locale?); rete di B e rete di A secondo la mask di B (B vede A locale?).
- `verdict`: `same` (ciascuno vede l'altro locale), `different` (nessuno dei due), `asymmetric` (uno sì e uno no). `masksDiffer` con `W_MASKS_DIFFER`.
- Dettaglio didattico per ciascun lato: ottetto interessante, M, blocchi dei due valori.
- Con il gateway: per ciascun host, `gatewayInSubnet` e gli avvisi `W_GATEWAY_*`.
- Avvisi `W_IS_NETWORK` / `W_IS_BROADCAST` se A o B coincidono con rete o broadcast della propria subnet.

Esempi (tabella del cap. 15): `192.168.10.70` e `.130` /25 → `different`; /24 → `same`; `172.16.33.10` e `172.16.46.200` /20 → `same`; `10.1.63.5` e `10.1.64.5` /19 → `different`. Con prefissi diversi: A `192.168.1.10/24`, B `192.168.1.200/25`, gateway `192.168.1.1` → `asymmetric` (A vede B locale, B no) e `W_GATEWAY_OUTSIDE` per B; A `192.168.1.10/24`, B `192.168.1.20/25` → `same` con `W_MASKS_DIFFER`.

#### F10 base · Wildcard e snippet · `snippets(ip, prefix, opzioni)` · cap. 14

- Normalizza alla rete (`W_HOST_BITS_SET`). Output `{ network, prefix, wildcard, lines: { aclStandard, aclNamed, ospf } }`.
- Opzioni con valori predefiniti: `acl: { number: 10, name: "SUBNET", action: "permit" }`, `ospf: { process: 1, area: 0 }`.
- Righe prodotte (sintassi Cisco IOS):

```
access-list 10 permit 192.168.10.64 0.0.0.63

ip access-list standard SUBNET
 permit 192.168.10.64 0.0.0.63

router ospf 1
 network 192.168.10.64 0.0.0.63 area 0
```

- Casi particolari: /32 → `permit host 10.1.1.1` nelle ACL e wildcard `0.0.0.0` in OSPF; /0 → `permit any` nelle ACL e `network 0.0.0.0 255.255.255.255 area 0` in OSPF.
- Il nome ACL inizia con una lettera e accetta lettere, cifre, `_` e `-`, massimo 64 caratteri (per Cisco IOS un nome che inizia con una cifra sarebbe ambiguo con le liste numerate; modifica della fase 7).
- Errori: `ACL_NUMBER_RANGE`, `OSPF_PROCESS_RANGE`, `OSPF_AREA_FORMAT`.
- v2: ACL estese, altri produttori (Juniper, MikroTik, nftables).

Esempi (cap. 14): /26 → `0.0.0.63`; /20 → `0.0.15.255`; /11 → `0.31.255.255`; /30 → `0.0.0.3`; `10.1.64.0/19` → `network 10.1.64.0 0.0.31.255 area 0`.

### 3.7 Tabella di riferimento /0–/32

Valori attesi, verificati con lo script; le righe /8–/32 coincidono con la cheat sheet della guida.

| CIDR | Subnet mask | Wildcard | M · ottetto | Indirizzi | Host |
|---|---|---|---|---|---|
| /0 | 0.0.0.0 | 255.255.255.255 | 256 · 1° | 4.294.967.296 | 4.294.967.294 |
| /1 | 128.0.0.0 | 127.255.255.255 | 128 · 1° | 2.147.483.648 | 2.147.483.646 |
| /2 | 192.0.0.0 | 63.255.255.255 | 64 · 1° | 1.073.741.824 | 1.073.741.822 |
| /3 | 224.0.0.0 | 31.255.255.255 | 32 · 1° | 536.870.912 | 536.870.910 |
| /4 | 240.0.0.0 | 15.255.255.255 | 16 · 1° | 268.435.456 | 268.435.454 |
| /5 | 248.0.0.0 | 7.255.255.255 | 8 · 1° | 134.217.728 | 134.217.726 |
| /6 | 252.0.0.0 | 3.255.255.255 | 4 · 1° | 67.108.864 | 67.108.862 |
| /7 | 254.0.0.0 | 1.255.255.255 | 2 · 1° | 33.554.432 | 33.554.430 |
| /8 | 255.0.0.0 | 0.255.255.255 | 1 · 1° | 16.777.216 | 16.777.214 |
| /9 | 255.128.0.0 | 0.127.255.255 | 128 · 2° | 8.388.608 | 8.388.606 |
| /10 | 255.192.0.0 | 0.63.255.255 | 64 · 2° | 4.194.304 | 4.194.302 |
| /11 | 255.224.0.0 | 0.31.255.255 | 32 · 2° | 2.097.152 | 2.097.150 |
| /12 | 255.240.0.0 | 0.15.255.255 | 16 · 2° | 1.048.576 | 1.048.574 |
| /13 | 255.248.0.0 | 0.7.255.255 | 8 · 2° | 524.288 | 524.286 |
| /14 | 255.252.0.0 | 0.3.255.255 | 4 · 2° | 262.144 | 262.142 |
| /15 | 255.254.0.0 | 0.1.255.255 | 2 · 2° | 131.072 | 131.070 |
| /16 | 255.255.0.0 | 0.0.255.255 | 1 · 2° | 65.536 | 65.534 |
| /17 | 255.255.128.0 | 0.0.127.255 | 128 · 3° | 32.768 | 32.766 |
| /18 | 255.255.192.0 | 0.0.63.255 | 64 · 3° | 16.384 | 16.382 |
| /19 | 255.255.224.0 | 0.0.31.255 | 32 · 3° | 8.192 | 8.190 |
| /20 | 255.255.240.0 | 0.0.15.255 | 16 · 3° | 4.096 | 4.094 |
| /21 | 255.255.248.0 | 0.0.7.255 | 8 · 3° | 2.048 | 2.046 |
| /22 | 255.255.252.0 | 0.0.3.255 | 4 · 3° | 1.024 | 1.022 |
| /23 | 255.255.254.0 | 0.0.1.255 | 2 · 3° | 512 | 510 |
| /24 | 255.255.255.0 | 0.0.0.255 | 1 · 3° | 256 | 254 |
| /25 | 255.255.255.128 | 0.0.0.127 | 128 · 4° | 128 | 126 |
| /26 | 255.255.255.192 | 0.0.0.63 | 64 · 4° | 64 | 62 |
| /27 | 255.255.255.224 | 0.0.0.31 | 32 · 4° | 32 | 30 |
| /28 | 255.255.255.240 | 0.0.0.15 | 16 · 4° | 16 | 14 |
| /29 | 255.255.255.248 | 0.0.0.7 | 8 · 4° | 8 | 6 |
| /30 | 255.255.255.252 | 0.0.0.3 | 4 · 4° | 4 | 2 |
| /31 | 255.255.255.254 | 0.0.0.1 | 2 · 4° | 2 | 2 (p2p) |
| /32 | 255.255.255.255 | 0.0.0.0 | 1 · 4° | 1 | 1 |

---

## 4. Passaggi didattici (F12)

### 4.1 Modello dei dati

`explain(fn, risultato, metodo)` restituisce:

```js
{
  fn: "F01",
  method: "magic",
  chapter: "cap-9",
  steps: [
    { id: "interesting-octet", chapter: "cap-6", values: { prefix: 20, index: 2 } },
    { id: "magic-number", chapter: "cap-9", values: { maskOctet: 240, magic: 16, bits: 4 } },
    ...
  ]
}
```

- `id` identifica il modello di testo in `strings.it.js`; `values` contiene valori serializzabili: numeri, stringhe tecniche, booleani (per esempio `carry`, `boundary`, `valid`), `null`, array e oggetti semplici di questi (per esempio `octets`, `suggestions`, `rows` dei pesi). Nessun testo per l'utente.
- Un passaggio può avere `bits: { rows: [{ label, value, prefix }] }` per le righe binarie colorate (ambra = rete, verde acqua = host, come nella guida). Dalla v1.1 una riga può avere `bitwise: true` e `prefix: null` (mask non valida in F03): ogni 1 e ogni 0 si mostra per quello che è, senza confine tra rete e host.
- `chapter` è l'ancora della guida (`cap-9`), usata per il collegamento "Capitolo 9".
- I passaggi non ricalcolano nulla di diverso dal risultato: un test verifica che ogni valore finale dei passaggi coincida con il campo corrispondente del risultato.

### 4.2 Metodi disponibili per funzione

| Funzione | Metodi | Capitoli |
|---|---|---|
| F01 | `binary`, `magic`, `multiples` | 7; 9 e 13; 12 e 13 |
| F02 | `weights` (sottrazione dei pesi), `divisions` (divisioni successive) | 3 |
| F03 | `binary` | 6 |
| F04 | `rules` | 4 |
| F05 | `rules` (casi A, B, C) | 11 |
| F06 | `magic` | 11, 13 |
| F07 | `magic`, `binary` (AND con la propria mask) | 15; 2 e 7 |
| F10 | `rules` (255 − mask, oppure M − 1 nell'ottetto interessante) | 14 |

Metodo predefinito dell'impostazione: `binary` (la base, cap. 7); per le funzioni che non lo prevedono si usa il primo metodo della riga. Il metodo scelto si ricorda per funzione durante la sessione.

### 4.3 Passaggi di F01

**Binario (cap. 7, i 6 passi):** `mask-binary` (mask in binario) → `ip-binary` (ottetto interessante in binario; ottetti a 255 copiati, a 0 azzerati) → `and-network` → `or-broadcast` (oppure `no-broadcast` per /31 e /32) → `host-range` → `host-count` (2^h − 2, oppure `host-count-exception` per /31 e /32, cap. 13 e 18).

**Numero magico (cap. 9 e 13, le 5 domande):** `interesting-octet` (con `boundary-convention` per /8, /16, /24, /32 e `zero-prefix` per /0) → `magic-number` (256 − mask e 2^(8−b)) → `block-multiple` (multiplo di M che non supera il valore) → `broadcast-quick` (rete + M − 1 e 255 a destra; con il riporto se rete + M = 256) → `host-quick` (M × 256^k − 2).

**Multipli (cap. 12):** come il numero magico, ma `block-multiple` è sostituito da `division` (parte intera di valore ÷ M, per M) e `remainder` (valore mod M = distanza dalla rete; posizione = resto + 1; resto = M − 1 indica il broadcast).

---

## 5. Export v1

### 5.1 Modello comune

`toRows(fn, risultato)` (in `export/rows.js`) produce una di due forme, con etichette da `strings.it.js`:
- **chiave/valore**: `{ title, pairs: [{ label, value }] }` per F01–F05, F07, F10;
- **tabella**: `{ title, columns: [{ key, label }], rows: [...] }` per F06.

Ogni formato parte da qui; se la modalità didattica è attiva, i formati testuali possono includere i passaggi (opzione "Includi i passaggi" nella barra).

### 5.2 Formati

| Formato | Regole |
|---|---|
| Appunti | testo semplice; `navigator.clipboard.writeText`, con ripiego su area di testo nascosta e `execCommand("copy")`; conferma "Copiato" annunciata ai lettori di schermo |
| CSV | separatore `;`, fine riga CRLF, BOM UTF-8; campi con `;`, `"` o a capo tra virgolette; numeri senza separatori; i campi di testo dell'utente che iniziano con `=`, `+`, `-`, `@` vengono preceduti da un apostrofo (protezione da formule) |
| JSON | `{ "format": "subnetcalc-result", "version": 1, "exportedAt", "fn", "input", "output" }`, numeri e indirizzi puntati; diverso dalla sessione |
| Markdown | tabella; i valori tecnici tra apici inversi |
| Testo | colonne allineate per carattere monospazio |
| Stampa/PDF | `window.print()` con `print.css` (sezione 9.9) |
| Snippet | blocco di F10, copiabile e scaricabile come `.txt` |

Colonne di F06: N., Rete, Prefisso, Primo host, Ultimo host, Broadcast, Host. Oltre 65.536 righe, l'interfaccia chiede un intervallo di indici.

Nomi dei file: `subnet-<funzione>-<rete>-<prefisso>-<AAAAMMGG-hhmm>.<ext>`, per esempio `subnet-analisi-172.16.32.0-20-20261118-2333.csv`. Il download usa `Blob` e un collegamento con attributo `download`, che funziona anche da disco.

---

## 6. Sessione JSON

### 6.1 Schema v1

```json
{
  "format": "subnetcalc-session",
  "version": 1,
  "exportedAt": "2026-11-18T22:33:00.000Z",
  "app": { "name": "Calcolatore Subnet", "version": "1.0.0" },
  "settings": {
    "theme": "auto",
    "didactic": false,
    "didacticMethod": "binary",
    "exportBar": false
  },
  "history": [
    {
      "id": "h7Kq2mX9pA4c",
      "at": "2026-11-18T22:30:12.000Z",
      "fn": "F01",
      "input": { "ip": "172.16.45.200", "prefix": 20 }
    }
  ],
  "plans": [
    {
      "id": "p3Vn8sT1wE6b",
      "type": "subdivision",
      "name": "Sede via Celoria",
      "createdAt": "2026-11-18T22:00:00.000Z",
      "updatedAt": "2026-11-18T22:31:00.000Z",
      "notes": "",
      "input": { "block": "10.40.0.0", "prefix": 16, "newPrefix": 24 },
      "labels": { "10": "VLAN 10 · Uffici", "20": "VLAN 20 · Laboratori" }
    }
  ]
}
```

| Campo | Tipo e vincoli |
|---|---|
| `format` | `"subnetcalc-session"` |
| `version` | intero; la v1 scrive 1 |
| `exportedAt` | data e ora ISO 8601 in UTC |
| `app` | `name` e `version` dell'app che ha scritto il file (informativo) |
| `settings.theme` | `auto`, `light`, `dark`, `contrast` |
| `settings.didactic`, `settings.exportBar` | booleani |
| `settings.didacticMethod` | `binary`, `magic`, `multiples` |
| `history` | fino a 200 voci, dalla più recente |
| `history[].id`, `plans[].id` | `[A-Za-z0-9_-]{1,64}`; generati con `crypto.getRandomValues` (disponibile anche fuori da HTTPS, a differenza di `randomUUID`) |
| `history[].fn` | `F01`–`F07`, `F10` |
| `history[].input` | solo gli input, secondo la tabella 6.2 |
| `plans` | fino a 100 piani |
| `plans[].type` | v1: `subdivision` (piano basato su F06); v2 aggiungerà `vlsm` e `summary` |
| `plans[].name` | 1–80 caratteri |
| `plans[].notes` | fino a 2.000 caratteri, a capo ammessi |
| `plans[].labels` | etichette per subnet, chiave = indice della subnet; fino a 4.096 voci di 80 caratteri |

L'impostazione "Memorizza i dati" **non** fa parte del file: riguarda il singolo browser (m7).

### 6.2 Input per funzione

| `fn` | `input` |
|---|---|
| F01 | `{ ip, prefix }` |
| F02 | `{ kind: "number", text, base }` oppure `{ kind: "address", text }` |
| F03 | `{ mask }` |
| F04 | `{ ip }` |
| F05 | `{ mode: "hosts", hosts }`, `{ mode: "subnets", prefix, subnets }`, `{ mode: "both", prefix, hosts, subnets }` |
| F06 | `{ block, prefix, newPrefix }` |
| F07 | `{ a, prefixA, b, prefixB, gateway }` (`prefixB` e `gateway` facoltativi) |
| F10 | `{ network, prefix, acl: { number, name, action }, ospf: { process, area } }` |

Indirizzi come stringhe puntate, prefissi e conteggi come interi.

### 6.3 Regole di validazione all'import

In quest'ordine; ogni errore bloccante ferma l'import con un messaggio chiaro, gli altri problemi finiscono nel rapporto.

1. **Dimensione** ≤ 5 MB (5.242.880 byte), controllata prima della lettura → `IMPORT_TOO_LARGE`.
2. **JSON valido** → `IMPORT_NOT_JSON`.
3. **Radice oggetto** e `format`: `subnetcalc-encrypted` → flusso della sezione 7; `subnetcalc-session` → si prosegue; altro → `IMPORT_UNKNOWN_FORMAT`.
4. **Versione**: intero; maggiore di quella supportata → `IMPORT_NEWER_VERSION` ("aggiorna l'app"); minore → catena di migrazioni (`migrate.js`, una funzione pura per ogni salto di versione).
5. **`exportedAt`** data ISO valida → altrimenti `IMPORT_BAD_FIELD`.
6. **Copia per lista ammessa**: si costruiscono oggetti nuovi copiando solo i campi previsti; chiavi sconosciute ignorate e contate; `__proto__`, `constructor`, `prototype` mai copiate.
7. **Impostazioni**: ogni campo non valido viene ignorato (resta il valore attuale) e segnalato.
8. **Cronologia**: oltre 200 voci si tengono le 200 più recenti; ogni voce con `id`, `at`, `fn` validi e input validato dalle funzioni di parsing del motore, altrimenti scartata e contata.
9. **Piani**: stesse regole, più `type` ammesso, limiti di lunghezza, indici delle etichette entro il numero di subnet del piano.
10. **Testo**: caratteri di controllo rifiutati (tranne l'a capo nelle note). L'interfaccia mostra sempre i testi del file come testo (`textContent`), mai come HTML.

Rapporto: `{ historyImported, historySkipped, plansImported, plansSkipped, settingsIgnored, unknownKeys, warnings }`.

### 6.4 Flusso di import

1. Impostazioni → Dati → **Importa sessione** → scelta del file.
2. Se cifrato, richiesta della passphrase (sezione 7.3).
3. Validazione e **anteprima**: data del file, versione dell'app che lo ha scritto, numero di voci di cronologia e di piani, eventuali scarti.
4. Scelta: **Sostituisci** (rimpiazza cronologia e piani attuali) oppure **Unisci** (aggiunge; a parità di `id` tiene l'elemento già presente); casella "Applica anche le impostazioni del file", spenta per default.
5. Conferma con il riepilogo ("Importate 34 voci e 2 piani; 1 voce scartata").

L'export della sessione funziona anche con "Memorizza i dati" spento: esporta lo stato della visita in corso.

---

## 7. Busta cifrata

### 7.1 Formato

Quello della sezione 4.1 delle specifiche, invariato:

```json
{
  "format": "subnetcalc-encrypted",
  "version": 1,
  "kdf": { "name": "PBKDF2-SHA-256", "iterations": 600000, "salt": "<base64>" },
  "cipher": { "name": "AES-256-GCM", "iv": "<base64>" },
  "data": "<base64>"
}
```

### 7.2 Cifratura

1. Testo in chiaro: JSON della sessione, compatto, codificato UTF-8.
2. Sale 16 byte e IV 12 byte da `crypto.getRandomValues`, nuovi a ogni export.
3. Chiave: PBKDF2 con SHA-256, 600.000 iterazioni, sale; chiave AES-GCM a 256 bit, non estraibile.
4. **Dato autenticato aggiuntivo (AAD)**: UTF-8 di `JSON.stringify([format, version, kdf.name, kdf.iterations, kdf.salt, cipher.name, cipher.iv])`. Un array ha ordine fisso, quindi la stringa è sempre la stessa per la stessa intestazione.
5. AES-GCM con tag a 128 bit; `data` = base64 standard (con padding) di testo cifrato più tag, come restituito da Web Crypto.
6. Nome file: `subnetcalc-sessione-AAAAMMGG-hhmm-cifrato.json`; in chiaro senza `-cifrato`.

### 7.3 Decifratura all'import

1. Controlli sull'intestazione: `version` = 1; `kdf.name` e `cipher.name` esatti; `iterations` intero tra 600.000 e 10.000.000; `salt` decodificato di 16 byte; `iv` di 12 byte; `data` di almeno 16 byte; nessun campo oltre a quelli della 7.1 (dalla v1.1: un campo in più non sarebbe autenticato dall'AAD). Altrimenti `IMPORT_BAD_ENVELOPE`.
2. Richiesta della passphrase, solo a questo punto.
3. Decifratura con la stessa AAD. Se fallisce → `IMPORT_DECRYPT_FAILED`: "Passphrase errata o file danneggiato" (GCM non permette di distinguere i due casi, ed è giusto così).
4. Il contenuto decifrato passa per la validazione 6.3 e deve essere `subnetcalc-session` (nessuna busta annidata).

### 7.4 Passphrase e interfaccia

- Casella **"Cifra il file"** nella finestra di export della sessione, spenta a ogni apertura (non viene ricordata).
- Con la casella attiva: passphrase e conferma, minimo 12 caratteri (contati come caratteri Unicode); indicatore di robustezza a quattro livelli (debole, media, buona, ottima) calcolato da lunghezza e varietà, senza dizionari esterni; avviso fisso: **una passphrase persa non è recuperabile** e va comunicata al destinatario per un canale separato.
- La passphrase non viene mai salvata, registrata in cronologia o inviata; i campi si svuotano a operazione conclusa.
- Durante derivazione e cifratura (fino a circa un secondo sui telefoni) si mostra un indicatore di avanzamento; le operazioni di Web Crypto sono asincrone e non bloccano la pagina.
- Disponibilità: se `crypto.subtle` manca (contesto non sicuro), la casella è disattivata con la spiegazione (aprire da HTTPS o da localhost). Un file cifrato importato in quelle condizioni produce lo stesso messaggio. Verifica pratica da disco nei vari browser: fase 5.

---

## 8. Persistenza locale

### 8.1 Adattatore

`storage.js` espone un'interfaccia asincrona, così un domani si può passare a IndexedDB senza toccare il resto: `isAvailable()`, `get(chiave)`, `set(chiave, valore)`, `remove(chiave)`, `clearAll()`, `usage()`. Tutte le chiamate sono protette da `try/catch`: se il browser rifiuta lo storage, l'app continua a funzionare senza salvare e lo dice nelle Impostazioni.

### 8.2 Chiavi

| Chiave | Contenuto |
|---|---|
| `subnetcalc:v1:meta` | versione dello schema, data dell'ultimo salvataggio |
| `subnetcalc:v1:settings` | impostazioni, compreso `persist: true` |
| `subnetcalc:v1:history` | cronologia (stesso formato della sessione) |
| `subnetcalc:v1:plans` | piani |

Il prefisso `subnetcalc:` evita collisioni con altre pagine aperte da disco, che in alcuni browser condividono lo stesso spazio.

### 8.3 Comportamento

- **"Memorizza i dati" spento** (default): nessuna chiave nel browser. Cronologia e piani vivono solo in memoria per la visita in corso.
- **Acceso**: si salva subito lo stato attuale; poi ogni modifica, con un ritardo di 300 ms per raggruppare le scritture.
- **Spegnimento**: conferma ("I dati salvati in questo browser verranno cancellati. Quelli della visita in corso restano finché non chiudi la pagina"), poi `clearAll()`.
- **Avvio**: se esiste `meta`, si caricano le chiavi; schema più vecchio → stesse migrazioni dell'import; dati illeggibili → si ignorano e si offre di cancellarli.
- **Spazio esaurito** (`QuotaExceededError`): si riduce la cronologia alle 100 voci più recenti e si riprova, poi si avvisa.
- **Più schede**: l'evento `storage` ricarica lo stato nelle altre schede; vale l'ultima scrittura.
- **Cancella tutti i dati**: sempre disponibile in Impostazioni, con conferma esplicita; cancella le chiavi, svuota cronologia e piani in memoria e riporta le impostazioni ai valori predefiniti.
- Nota fissa accanto all'interruttore: il salvataggio vale solo per questo browser e questo dispositivo, il browser può cancellarlo (Safari dopo un periodo di inattività), e non sostituisce l'export della sessione.

---

## 9. Interfaccia: schermate e flussi

### 9.1 Mappa delle schermate

| Sezione | Sottoschede | Funzioni |
|---|---|---|
| **Calcola** | Analisi · Conversioni · Mask · Stessa subnet | F01 con F04 e F10 base nella scheda risultato; F02; F03; F07 |
| **Pianifica** | Calcolo inverso · Suddivisione · Piani salvati | F05; F06; piani (v2: VLSM e Riassunto) |
| **Guide** | Guida all'uso · Guida al subnetting | fase 6 |
| **Impostazioni** | (pagina unica) | interruttori, metodo didattico, tema, dati, informazioni |

- **Tipo di indirizzo (F04)** non ha una sottoscheda propria: compare in Analisi; se si scrive un IP senza prefisso, Analisi mostra solo la classificazione e invita ad aggiungere il prefisso.
- **Wildcard e configurazione (F10 base)**: sezione richiudibile nella scheda risultato di Analisi.
- **Cronologia**: pulsante in Calcola e Pianifica che apre un pannello con gli ultimi calcoli; un tocco li riapre. Esiste sempre durante la visita, si salva solo con "Memorizza i dati".
- **Piani salvati**: da Suddivisione, "Salva come piano" con nome, note ed etichette per subnet (VLAN, uso).

### 9.2 Layout

| Larghezza | Navigazione | Contenuto |
|---|---|---|
| < 720 px (telefono) | barra in basso fissa: Calcola · Pianifica · Guide · Impostazioni, icona più etichetta, aree di tocco ≥ 48 px; sottoschede come controllo segmentato scorrevole in alto | una colonna; risultati in schede impilate |
| 720–979 px | schede in alto | due colonne dove serve |
| ≥ 980 px (come la guida) | barra laterale a sinistra (240 px) con sezioni e sottoschede | contenuto fino a 960 px; risultati in griglia di schede |

La barra in basso rispetta le aree sicure dei telefoni (`env(safe-area-inset-bottom)`). Il pulsante **"torna su"** è sempre presente nelle pagine lunghe (Suddivisione, Guide), sopra la barra in basso su mobile.

### 9.3 Navigazione con frammento

| Indirizzo | Effetto |
|---|---|
| `#/calcola/analisi?ip=172.16.45.200&p=20` | Analisi precompilata |
| `#/calcola/conversioni?n=203&b=10` | Conversioni |
| `#/calcola/mask?m=255.255.250.0` | Validazione mask |
| `#/calcola/stessa?a=10.1.63.5&pa=19&b=10.1.64.5&pb=19&gw=` | Stessa subnet |
| `#/pianifica/inverso?h=50` · `?p=16&s=6` · `?p=24&h=20&s=8` | Calcolo inverso, casi A, B, C |
| `#/pianifica/suddivisione?b=10.0.0.0&p=16&np=19&pg=0` | Suddivisione, pagina 0 |
| `#/pianifica/piani` | Piani salvati |
| `#/guide/uso/<sezione>` · `#/guide/subnetting/cap-9` | Guide (fase 6) |
| `#/impostazioni` | Impostazioni |

- Analisi accetta anche `f10=1`, che apre la sezione "Wildcard e configurazione" (dalla v1.1, collegamenti del cap. 14).
- Parametri facoltativi per la guida: `did=1` attiva la modalità didattica per quella vista e `metodo=magic` sceglie il metodo, senza cambiare le impostazioni salvate (collegamenti "Apri nel calcolatore", fase 6).
- I parametri passano per il parsing del motore: se non validi, il modulo si apre precompilato con l'errore visibile.
- Mentre si scrive, il frammento si aggiorna senza creare voci nella cronologia del browser; il cambio di scheda invece crea una voce, così il tasto "indietro" torna alla scheda precedente.
- Indirizzo vuoto o sconosciuto → `#/calcola/analisi`.

### 9.4 Componenti comuni

- **Campo IP**: `type="text" inputmode="decimal" autocomplete="off" autocapitalize="off" spellcheck="false"`; accetta la virgola; se si incolla `IP/n` o `IP mask` divide da solo i due valori; errore sotto il campo collegato con `aria-describedby`, mostrato dopo 400 ms di pausa o all'uscita dal campo.
- **Prefisso o mask**: un campo che accetta `/20`, `20` o `255.255.240.0`, con cursore 0–32 e pulsanti − e +; accanto mostra l'altra forma (`/20 = 255.255.240.0`).
- **Calcolo dal vivo**: il risultato si aggiorna appena l'input è valido (ritardo 150 ms); Invio forza il calcolo.
- **Scheda risultato**: rete e broadcast in evidenza; ogni valore con pulsante "copia"; etichetta del tipo (Privato, Pubblico, Speciale con nome del blocco); riquadro degli avvisi.
- **Pannello dei passaggi** (modalità didattica): sotto il risultato; selettore del metodo; passaggi numerati; righe binarie con i colori di rete e host; collegamento "Capitolo N" verso la guida.
- **Barra di export** (interruttore Export): Copia · CSV · JSON · Markdown · Testo · Stampa, più Snippet dove previsto; su telefono diventa un pulsante "Esporta" che apre un pannello dal basso.
- **Pulsante "?"** accanto al titolo di ogni funzione: apre il paragrafo pertinente della guida all'uso.
- **Interruttori**: `role="switch"` con `aria-checked`, etichetta e breve descrizione dell'effetto.
- **Finestre di dialogo**: elemento `<dialog>` per conferme, passphrase, anteprima dell'import.
- **Messaggi brevi** ("Copiato", "Sessione esportata"): area `aria-live="polite"`.
- **Stato iniziale vuoto**: esempi cliccabili ("Prova con 192.168.10.75/26").

### 9.5 Interruttori e impostazioni

| Impostazione | Effetto | Default |
|---|---|---|
| Modalità didattica | mostra il pannello dei passaggi; abilita la scelta del metodo predefinito | spenta |
| Metodo predefinito | `binary`, `magic`, `multiples` (sezione 4.2) | `binary` |
| Export | mostra la barra di export sui risultati | spento |
| Memorizza i dati | salva nel browser (sezione 8) | spento |
| Tema | Automatico, Chiaro, Scuro, Alto contrasto | Automatico |

La sezione **Dati** (Esporta sessione, Importa sessione, Cancella tutti i dati) è sempre visibile, indipendentemente dagli interruttori. La sezione **Informazioni** mostra versione, data di build, licenze (codice MIT, font OFL) e collegamento al repository.

### 9.6 Temi

- Stesse variabili CSS della guida v0.3 (`--bg`, `--surface`, `--surface-2`, `--line`, `--text`, `--muted`, `--strong`, `--net`, `--host`, `--warn`, `--ok`, `--on-net` e le varianti trasparenti), raccolte in `tokens.css` e condivise con le guide.
- Attributo `data-theme` su `<html>`: assente (Automatico, segue `prefers-color-scheme` e `prefers-contrast: more`), `light`, `dark`, `contrast`.
- La stampa è sempre su fondo chiaro.
- Il tema si salva solo con "Memorizza i dati"; le guide integrate usano lo stesso stato (fase 6).

### 9.7 Accessibilità

Obiettivo WCAG 2.2 livello AA: contrasto verificato in tutti e quattro i temi; uso completo da tastiera con ordine logico e focus sempre visibile; etichette su tutti i campi; risultati principali annunciati ai lettori di schermo; aree di tocco ≥ 44 px su mobile; rispetto di `prefers-reduced-motion`; nessuna informazione affidata al solo colore (rete e host hanno anche etichette).

### 9.8 Errori e casi limite nell'interfaccia

- Errori di input sotto il campo, con il testo del codice (per esempio `IP_LEADING_ZERO`: "Il terzo ottetto ha uno zero iniziale (01): scrivi 1. Alcuni programmi leggono 010 come numero ottale").
- Avvisi nel riquadro della scheda risultato, con rimando al capitolo (per esempio `W_IS_BROADCAST` → cap. 8, esercizio 5).
- /31 e /32: broadcast mostrato come "nessuno", con la spiegazione del cap. 13.
- F06 con molte subnet: paginazione (prima, precedente, pagina n, successiva, ultima) e campo "Vai alla subnet che contiene l'IP…".

### 9.9 Stampa

`print.css`: nasconde navigazione, barra di export, pulsanti e cronologia; mostra in testa input e data; apre i passaggi se la modalità didattica è attiva; colori chiari; tabelle senza spezzare le righe.

### 9.10 Schizzi dei flussi principali

**Analisi su telefono, modalità didattica attiva**

```
┌──────────────────────────────┐
│ Calcola                  🕘  │
│ [Analisi][Conversioni][Mask]›│
│                              │
│ Indirizzo IP                 │
│ [ 172.16.45.200           ]  │
│ Prefisso o mask              │
│ [ /20 ]  − ────●──── +       │
│ = 255.255.240.0              │
│                              │
│ ┌ Risultato ───── Privato ┐  │
│ │ Rete      172.16.32.0   ⧉│ │
│ │ Broadcast 172.16.47.255 ⧉│ │
│ │ Host      .32.1 – .47.254│ │
│ │ Utilizzabili  4.094      │ │
│ │ M 16·3°   Wild 0.0.15.255│ │
│ │ ▸ Wildcard e snippet     │ │
│ └──────────────────────────┘ │
│ Passaggi [Bin|Magico|Mult.]  │
│ 1 Ottetto interessante: 3°   │
│ 2 M = 256 − 240 = 16         │
│ 3 45 sta tra 32 e 47 → .32.0 │
│ …            Capitolo 9 →    │
│ [ Esporta ▾ ]                │
├──────────────────────────────┤
│ Calcola  Pianifica Guide Imp.│
└──────────────────────────────┘
```

**Analisi su desktop**

```
┌────────────┬──────────────────────────────────────────────┐
│ CALCOLA    │ Analisi subnet                          (?)  │
│ ▸ Analisi  │ [ 172.16.45.200 ]  [ /20 ] = 255.255.240.0   │
│   Convers. │ ┌ Rete ──────────┐ ┌ Broadcast ─────┐ ┌ Host ┐ │
│   Mask     │ │ 172.16.32.0    │ │ 172.16.47.255  │ │ 4.094│ │
│   Stessa   │ └────────────────┘ └────────────────┘ └──────┘ │
│ PIANIFICA  │ Primo .32.1 · Ultimo .47.254 · M 16 · 3° ·    │
│ GUIDE      │ Wildcard 0.0.15.255 · Privato (RFC 1918)      │
│ IMPOSTAZ.  │ Copia CSV JSON Markdown Testo Stampa Snippet  │
│            │ ── Passaggi · metodo binario ───────────────  │
│ Cronologia │ IP 45    0010 1101 …                          │
└────────────┴──────────────────────────────────────────────┘
```

**Export della sessione**

```
Impostazioni → Esporta sessione
  ┌ Esporta la sessione ───────────────────────────┐
  │ Contenuto: impostazioni, 34 calcoli, 2 piani    │
  │ [ ] Cifra il file                               │
  │     Passphrase   [············]  ▮▮▯▯ media     │
  │     Conferma     [············]                 │
  │     ⚠ Una passphrase persa non è recuperabile.  │
  │                        [Annulla]  [Esporta]     │
  └─────────────────────────────────────────────────┘
→ file subnetcalc-sessione-20261118-2333(-cifrato).json
```

**Import della sessione**

```
Impostazioni → Importa sessione → scelta del file
  → (se cifrato) passphrase → errore? "Passphrase errata o file danneggiato"
  → anteprima: data, versione, 34 calcoli, 2 piani, 1 voce scartata
  → [Sostituisci] [Unisci]   [ ] Applica anche le impostazioni del file
  → riepilogo "Importate 34 voci e 2 piani"
```

---

## 10. Strategia di test per la fase 3

### 10.1 Strumenti e livelli

| Livello | Strumento | Oggetto |
|---|---|---|
| Unitari a tabella | Vitest (`test.each`) | ogni funzione del motore con i casi della 10.2 |
| A proprietà | fast-check, seme fisso in CI, 1.000 esecuzioni per proprietà | invarianti della 10.3 |
| Oracolo indipendente | `tools/oracle.py` (`ipaddress`) → `tests/fixtures/oracle-*.json` | tutti i prefissi 0–32 su un insieme fisso di IP più 2.000 IP casuali a seme fisso; regole /31 e /32 applicate esplicitamente nello script |
| Architettura | `architecture.test.js` | regola delle dipendenze (2.3) |
| Passaggi didattici | Vitest | coerenza passaggi ↔ risultato per ogni metodo |
| Sessione e busta | Vitest (Node ha `crypto.subtle`) | progettati ora, scritti in fase 5 |

### 10.2 Casi a tabella

**A · Esempi ed esercizi della guida (F01)**

| Input | Rete | Broadcast | Host | M |
|---|---|---|---|---|
| 192.168.10.75/26 | 192.168.10.64 | 192.168.10.127 | 62 | 64 · 4° |
| 172.16.45.200/20 | 172.16.32.0 | 172.16.47.255 | 4.094 | 16 · 3° |
| 10.150.33.7/11 | 10.128.0.0 | 10.159.255.255 | 2.097.150 | 32 · 2° |
| 10.20.30.140/27 | 10.20.30.128 | 10.20.30.159 | 30 | 32 · 4° |
| 192.168.1.200/28 | 192.168.1.192 | 192.168.1.207 | 14 | 16 · 4° |
| 172.20.100.5/22 | 172.20.100.0 | 172.20.103.255 | 1.022 | 4 · 3° |
| 10.1.77.33/19 | 10.1.64.0 | 10.1.95.255 | 8.190 | 32 · 3° |
| 192.168.50.99/30 | 192.168.50.96 | 192.168.50.99 | 2 | 4 · 4° — `role: broadcast`, `W_IS_BROADCAST` |
| 10.0.0.255/23 · 10.0.1.0/23 | 10.0.0.0 | 10.0.1.255 | 510 | 2 · 3° — entrambi `role: host` (cap. 18) |

Più: offset di 192.168.1.200/28 = 8 (il 9° indirizzo, cap. 12); offset di 192.168.10.75/26 = 11.

**B · Tabella /0–/32** (sezione 3.7): mask, wildcard, M · ottetto, indirizzi, host per ogni riga.

**C · Convenzione dei prefissi multipli di 8 e /0**

| Input | Ottetto interessante | M | Blocco nell'ottetto | Rete · Broadcast |
|---|---|---|---|---|
| 10.1.2.3/8 | 1° | 1 | 10–10 | 10.0.0.0 · 10.255.255.255 |
| 172.16.45.200/16 | 2° | 1 | 16–16 | 172.16.0.0 · 172.16.255.255 |
| 10.1.2.3/24 | 3° | 1 | 2–2 | 10.1.2.0 · 10.1.2.255 |
| 10.1.1.1/32 | 4° | 1 | 1–1 | 10.1.1.1 · nessuno |
| 203.0.113.10/0 | 1° | 256 | 0–255 | 0.0.0.0 · 255.255.255.255 |

Tutte con `boundary: true`; i passaggi del metodo magico contengono `boundary-convention` (o `zero-prefix` per /0).

**D · /0, /31, /32 e limiti dello spazio**
- `203.0.113.10/0`: mask `0.0.0.0`, wildcard `255.255.255.255`, primo `0.0.0.1`, ultimo `255.255.255.254`, 4.294.967.296 indirizzi, 4.294.967.294 host, `nextNetwork` e `previousNetwork` `null`.
- `10.0.0.1/31`: rete `10.0.0.0`, broadcast `null`, primo `10.0.0.0`, ultimo `10.0.0.1`, 2 host, `role: p2p`, `W_P2P`.
- `192.168.1.255/31`: rete `192.168.1.254`, ultimo `192.168.1.255`.
- `10.1.1.1/32`: rete = primo = ultimo, 1 host, wildcard `0.0.0.0`, `W_SINGLE`.
- `0.0.0.0/32`, `255.255.255.255/32`: limiti dello spazio; `previousNetwork` di `0.0.0.0` e `nextNetwork` di `255.255.255.255` sono `null`.
- `255.255.255.253/30`: rete `255.255.255.252`, broadcast `255.255.255.255`, `nextNetwork` `null`.

**E · Parsing**

| Testo | Esito |
|---|---|
| `192.168.1.1`, ` 10.0.0.1 `, `192,168,1,1`, `0.0.0.0` | validi |
| `10.0.0.1/24`, `10.0.0.1 / 24`, `10.0.0.1 255.255.255.0`, `10.0.0.1/255.255.255.0` | validi, prefisso 24 |
| `` (vuoto) | `IP_EMPTY` |
| `192.168.1`, `192.168.1.1.1`, `10..0.1`, `a.b.c.d`, `１０.0.0.1` | `IP_FORMAT` |
| `192.168.1.256` | `IP_OCTET_RANGE` (indice 3, valore 256) |
| `192.168.01.1` | `IP_LEADING_ZERO` (indice 2) |
| `10.0.0.1/` | `PREFIX_EMPTY` |
| `10.0.0.1/-1`, `10.0.0.1/x` | `PREFIX_FORMAT` |
| `10.0.0.1/33` | `PREFIX_RANGE` |
| `10.0.0.1 255.255.0.255` | mask non valida, `MASK_NONCONTIGUOUS` |

**F · F03**: i casi della scheda 3.6, più tutte le 33 mask valide (deve tornare il prefisso giusto) e tutti i 256 valori di un ottetto (solo i 9 ammessi sono validi).

**G · F04**

| IP | Classe | Ambito | Blocco principale |
|---|---|---|---|
| 10.1.2.3 | A | private | PRIVATE |
| 172.31.255.255 | B | private | PRIVATE |
| 172.32.0.1 | B | public | — |
| 192.168.0.1 | C | private | PRIVATE |
| 100.64.0.1 · 100.127.255.255 | A | special | CGNAT |
| 100.128.0.1 | A | public | — |
| 127.0.0.1 | A (riservato) | special | LOOPBACK |
| 0.1.2.3 | A (riservato) | special | THIS_NETWORK |
| 169.254.10.10 | B | special | LINK_LOCAL |
| 192.0.2.1 · 198.51.100.7 · 203.0.113.200 | C | special | DOCUMENTATION |
| 224.0.0.5 · 239.255.255.255 | D | special | MULTICAST |
| 240.0.0.1 | E | special | RESERVED |
| 255.255.255.255 | E | special | LIMITED_BROADCAST (poi RESERVED) |
| 8.8.8.8 · 191.255.255.255 · 223.255.255.255 | A · B · C | public | — |

**H · F05**: i due estremi di ogni fascia della tabella host → prefisso (da 1–2 → /30 fino a 32.767–65.534 → /16); 50 → /26; 500 → /23; 1.000 → /22; 62 → /26; 63 → /25; 43 → /26 (avanzano 19); 4.294.967.294 → /0; 0 e 4.294.967.295 → `HOSTS_RANGE`; alternative /31 per 2 host e /32 per 1 host. Subnet: `/16` con 6 → /19 (8, avanzano 2), con 9 → /20 (16, avanzano 7); `/30` con 2 → /31 e `W_NO_USABLE_HOSTS`; `/32` con 2 → `SUBNETS_TOO_MANY`. Entrambi: `/24`, 20 host, 10 subnet → non fattibile; `/24`, 20 host, 8 subnet → /27.

**I · F06**: gli esempi della scheda 3.6, più: nuovo prefisso più corto → `PREFIX_SHORTER`; `/24` → `/24` → 1 subnet e `W_SAME_PREFIX`; `/8` → `/30` → `W_LARGE_LIST`; paginazione (prima pagina, ultima pagina parziale, `offset` oltre la fine → `PAGE_RANGE`); `indexOf` e `subnetAt` reciproci.

**J · F07**: i casi della scheda 3.6, compresi gateway dentro e fuori, gateway uguale a rete, broadcast o host.

**K · F10**: le wildcard del cap. 14; le righe ACL e OSPF di `192.168.10.64/26` e `10.1.64.0/19`; /32 (`host`), /0 (`any`); limiti di numero ACL (99 valido, 100 non valido, 1300 e 1999 validi), processo OSPF (0 e 65.536 non validi), area in forma intera e puntata.

### 10.3 Proprietà (fast-check)

| N. | Proprietà |
|---|---|
| P1 | rete ≤ IP ≤ rete + indirizzi − 1 |
| P2 | la rete è allineata: rete mod indirizzi = 0 |
| P3 | la mask ha 1 contigui e `popcount(mask)` = prefisso |
| P4 | wildcard = NOT mask (32 bit) |
| P5 | per prefisso ≤ 30, broadcast = rete OR wildcard, primo = rete + 1, ultimo = broadcast − 1 |
| P6 | metodo binario, numero magico e multipli danno la stessa rete e lo stesso broadcast |
| P7 | `maskToPrefix(prefixToMask(p))` = p per ogni p da 0 a 32 |
| P8 | `parseIPv4(toDotted(x))` = x per ogni intero a 32 bit |
| P9 | F05: per p da 0 a 30, `prefixForHosts(host(p)) = p` e `prefixForHosts(host(p) + 1) = p − 1` (per p ≥ 1) |
| P10 | F06: subnet disgiunte, contigue, ordinate, che coprono esattamente il blocco; `indexOf(subnetAt(i)) = i` |
| P11 | F07 con prefissi uguali è simmetrico e il verdetto è solo `same` o `different` |
| P12 | i valori finali dei passaggi coincidono con il risultato, per ogni funzione e metodo |
| P13 | ogni risultato del motore supera `JSON.parse(JSON.stringify(x))` senza perdite |

### 10.4 Test della sessione e della busta (scritti in fase 5)

- Corpus di file validi e non validi in `tests/fixtures/sessions/`, uno per regola della 6.3.
- Andata e ritorno: export → import identico; "Unisci" con id duplicati; impostazioni applicate solo su scelta.
- Inquinamento del prototipo: un file con `__proto__` non deve modificare `Object.prototype`.
- Busta: andata e ritorno; passphrase errata; `data`, `iv`, `salt` o `iterations` alterati (deve fallire grazie all'AAD); iterazioni fuori intervallo; lunghezze sbagliate.

### 10.5 Criteri di uscita della fase 3

- Tutti i test verdi in locale e in GitHub Actions.
- Copertura del motore ≥ 95% di istruzioni e di rami (`@vitest/coverage-v8`).
- Zero differenze rispetto all'oracolo Python.
- Test di architettura verde; `npm run check` senza errori.
- `npm run build` produce già un file unico funzionante (guscio minimo che chiama il motore), così il tooling è collaudato prima della fase 4.

---

## 11. Rischi e verifiche rimandate

| Rischio | Verifica | Fase |
|---|---|---|
| `crypto.subtle` assente con la pagina aperta da disco | prova in Chrome, Edge, Firefox, Safari; messaggio e funzione disattivata se assente | 5 |
| localStorage da disco: spazio condiviso o non persistente in alcuni browser | prova negli stessi browser; eventuale nota nella guida all'uso | 5 |
| Appunti da disco | prova di `navigator.clipboard` e del ripiego | 5 |
| Tastiera numerica iOS in italiano (virgola al posto del punto) | prova su dispositivo; la virgola è già accettata | 4 |
| Peso del file oltre 1 MB | `npm run size` a ogni build | 3–7 |
| Contrasto dei quattro temi nei componenti nuovi | verifica WCAG AA | 4 |
| Safari cancella i dati locali dopo inattività | nota accanto all'interruttore; export come backup | 5 |
| Coerenza tra app e guida (convenzioni, testi) | rimandi ai capitoli; revisione finale | 6, 8 |

---

## 12. Consegne e accettazione della fase 3

**Prerequisito**: repository GitHub pubblico `calcolatore-subnet` creato da Paolo (vuoto), da collegare alla sessione di lavoro. Se non è disponibile, la fase 3 lavora nello spazio di lavoro e consegna un archivio da caricare.

**Consegne**:
1. Scaffold del repository secondo la 2.1 (cartelle, `package.json`, configurazioni, CI, licenza MIT, `docs/`).
2. Motore completo: `engine/` con F01–F07, F10 base, F12 (passaggi strutturati) e i testi di errore e avviso in `strings.it.js`.
3. Test: casi della 10.2, proprietà della 10.3, oracolo Python con fixture, test di architettura.
4. Guscio minimo per collaudare `npm run build` e `npm run size`.
5. `STATO_PROGETTO.md` aggiornato, con titolo e prompt della fase 4.

**Accettazione**: criteri della 10.5, più una breve dimostrazione da riga di comando dei casi del cap. 15 e della tabella /0–/32.
