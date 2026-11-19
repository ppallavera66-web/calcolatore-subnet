# Manifest PWA: valutazione e decisione (fase 7)

Specifiche di progetto, sezione 2: "Facoltativo, se ospitata in HTTPS: manifest PWA per l'installazione sul telefono". Specifica tecnica, sezione 0: "si valuta in fase 7, con l'app ospitata in HTTPS".

## Decisione

**Nessun manifest PWA nella v1.0.0.** La possibilità resta aperta per una versione successiva, come aggiunta riservata alla pubblicazione su GitHub Pages. Il file unico distribuito nelle Release resta invariato.

## Motivi

1. **Il manifest non può stare dentro il file unico.** Chrome non accetta un manifest scritto come URL `data:`: nella discussione delle specifiche, gli sviluppatori di Chromium hanno detto di non supportarlo e di non avere piani per farlo. In più `start_url` e `scope` devono avere la stessa origine del documento. Servirebbero quindi file separati su Pages: `manifest.webmanifest` e almeno due icone PNG (192 e 512 px). La pubblicazione su Pages smetterebbe di essere "un solo file".
2. **L'uso offline dopo l'installazione richiede un service worker.** Dalla versione 108 su Android e 112 su desktop, Chrome permette di installare dal menu anche senza service worker. Un'app installata così, però, senza rete apre la pagina offline di Chrome e non il calcolatore. Perché l'app installata funzioni offline serve un service worker che conservi la pagina in cache (un terzo file, con la gestione degli aggiornamenti). Il richiamo automatico all'installazione chiede comunque un gestore `fetch`.
3. **Il vantaggio è piccolo.** Il file unico funziona già offline: basta salvarlo sul telefono o sul computer e aprirlo. Su iPhone e iPad, Safari offre "Aggiungi alla schermata Home" per qualunque pagina, anche senza manifest. Chrome su Android offre "Aggiungi a schermata Home" come scorciatoia.
4. **Ci sarebbero costi di manutenzione e di prova.** Bisognerebbe gestire la versione della cache, aggiornare chi ha già installato l'app e provare su dispositivi reali. Le prove sui telefoni non sono ancora state fatte, nemmeno per la pagina normale (problemi aperti in `STATO_PROGETTO.md`).

## Se in futuro si decide di farlo

- Solo per GitHub Pages, nel job `pages` del workflow: `manifest.webmanifest` (nome, `short_name`, `start_url: "./"`, `display: "standalone"`, colori del tema), icone 192, 512 e maskable, e un service worker *cache-first* della sola `index.html`, con il nome della cache legato alla versione.
- Il collegamento al manifest va aggiunto solo nella copia pubblicata su Pages, così il file della Release continua ad aprirsi da disco senza richieste verso file mancanti.
- Prove: installazione in Chrome Android e desktop, avvio offline, aggiornamento a una versione nuova, "Aggiungi alla schermata Home" su iOS.

## Fonti consultate (19 novembre 2026)

- Chrome for Developers, "Revisiting Chrome's installability criteria": il service worker con `fetch` non è più richiesto per l'installazione dal menu dalle versioni 108 (mobile) e 112 (desktop); il richiamo automatico all'installazione lo richiede ancora.
- W3C, public-webapps-github (febbraio 2021), discussione sull'identità delle app: "We don't support data: urls for manifests, and have no plans to change that".
- MDN, `start_url`: deve avere la stessa origine della pagina che collega il manifest.
