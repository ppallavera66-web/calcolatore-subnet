// @ts-check
/**
 * Testi italiani indicizzati per codice (specifica tecnica, 2.2 e 3.4; passaggi della sezione 4).
 * Nessun import: questo modulo non dipende da nessun altro (regola 2.3).
 *
 * Chiavi:
 * - codici di errore, avviso e motivo del motore (es. `IP_LEADING_ZERO`, `W_P2P`);
 * - `step.<id>` per i passaggi didattici;
 * - `block.<codice>`, `method.<metodo>`, `role.<ruolo>`, `kind.<tipo>`, `scope.<ambito>`,
 *   `verdict.<esito>`, `field.<campo>`, `chapter`.
 */

/** @typedef {Record<string, any>} Params */
/** @typedef {string | ((p: Params) => string)} Template */

const ORDINALS = ['primo', 'secondo', 'terzo', 'quarto'];

/**
 * Ordinale dell'ottetto a partire da un indice 0–3 ("terzo").
 * @param {number} index
 */
export const ord = (index) => ORDINALS[index] ?? String(index + 1);

/**
 * Ordinale breve ("3°").
 * @param {number} index
 */
export const ordShort = (index) => `${index + 1}°`;

/**
 * Intero con separatore delle migliaia "." (m13).
 * @param {number} n
 */
export function fmtNumber(n) {
  const s = String(Math.trunc(Math.abs(n)));
  const out = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return n < 0 ? `−${out}` : out;
}

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
/**
 * Esponente in apice ("2⁶").
 * @param {number} n
 */
export const sup = (n) =>
  String(n)
    .split('')
    .map((d) => SUP[Number(d)])
    .join('');

/**
 * Numero magico con l'ottetto, come nella colonna M della cheat sheet ("16 · 3°").
 * @param {number} magic
 * @param {number} index
 */
export const magicLabel = (magic, index) => `${magic} · ${ordShort(index)}`;

const hostName = (/** @type {string} */ h) => (h === 'a' ? 'A' : h === 'b' ? 'B' : h);
const yesNo = (/** @type {boolean} */ b) => (b ? 'sì' : 'no');

/** @type {Record<string, Template>} */
export const STRINGS = {
  // ---------------------------------------------------------------- errori
  IP_EMPTY: "Scrivi un indirizzo IP, per esempio 192.168.10.75.",
  IP_FORMAT: (p) => `"${p.text}" non è un indirizzo IPv4: servono quattro numeri da 0 a 255 separati da punti, per esempio 192.168.10.75.`,
  IP_OCTET_RANGE: (p) => `Il ${ord(p.index)} ottetto vale ${p.value}: ogni ottetto va da 0 a 255.`,
  IP_LEADING_ZERO: (p) =>
    `Il ${ord(p.index)} ottetto ha uno zero iniziale (${p.value}): scrivi ${Number(p.value)}. Alcuni programmi leggono 010 come numero ottale, cioè 8.`,
  INPUT_FORMAT: (p) => `"${p.text}" non è una forma riconosciuta. Usa IP/prefisso (10.0.0.1/24) oppure IP e mask (10.0.0.1 255.255.255.0).`,
  PREFIX_EMPTY: 'Manca il prefisso: scrivi /n con n da 0 a 32, oppure la mask.',
  PREFIX_FORMAT: (p) => `"${p.text}" non è un prefisso: scrivi un numero da 0 a 32, con o senza la barra (/24).`,
  PREFIX_RANGE: (p) => `Il prefisso /${p.value} non esiste: va da /0 a /32.`,
  MASK_FORMAT: (p) => `"${p.text}" non è una mask: servono quattro numeri da 0 a 255 separati da punti, per esempio 255.255.255.0.`,
  MASK_OCTET_VALUE: (p) =>
    `Il ${ord(p.index)} ottetto della mask vale ${p.value} (${p.binary}): non è uno dei 9 valori ammessi (0, 128, 192, 224, 240, 248, 252, 254, 255).`,
  MASK_NONCONTIGUOUS: (p) =>
    `La mask non è contigua: dopo un ottetto diverso da 255 gli altri devono valere 0, invece il ${ord(p.index)} ottetto no.`,
  NUMBER_FORMAT: (p) =>
    p.base === 2
      ? `"${p.text}" non è un numero binario: usa solo 0 e 1.`
      : p.base === 16
        ? `"${p.text}" non è un numero esadecimale: usa le cifre 0–9 e A–F.`
        : `"${p.text}" non è un numero intero: usa solo cifre.`,
  NUMBER_RANGE: (p) => `"${p.value}" è troppo grande: il massimo è 4.294.967.295 (32 bit).`,
  BASE_UNSUPPORTED: (p) => `Base ${p.base} non prevista: scegli 2, 10 o 16.`,
  HOSTS_RANGE: (p) => `Gli host richiesti vanno da 1 a 4.294.967.294 (hai scritto ${p.value}).`,
  SUBNETS_RANGE: (p) => `Serve almeno una subnet (hai scritto ${p.value}).`,
  SUBNETS_TOO_MANY: (p) => `Il blocco contiene al massimo ${fmtNumber(p.max)} subnet: non ne bastano ${fmtNumber(p.requested)}.`,
  PREFIX_SHORTER: (p) => `Il nuovo prefisso /${p.requested} è più corto del blocco /${p.block}: per suddividere serve un prefisso uguale o più lungo.`,
  PAGE_RANGE: (p) => `Pagina non valida (inizio ${p.offset}, righe ${p.limit}).`,
  ACL_NUMBER_RANGE: (p) => `L'ACL standard numerata va da 1 a 99 o da 1300 a 1999 (hai scritto ${p.value}).`,
  ACL_NAME_FORMAT: (p) => `Nome ACL non valido ("${p.text}"): usa da 1 a 64 caratteri tra lettere, cifre, _ e -.`,
  ACL_ACTION_VALUE: (p) => `Azione ACL non valida ("${p.value}"): scegli permit o deny.`,
  OSPF_PROCESS_RANGE: (p) => `Il processo OSPF va da 1 a 65535 (hai scritto ${p.value}).`,
  OSPF_AREA_FORMAT: (p) => `Area OSPF non valida ("${p.text}"): scrivi un intero (0) o la forma puntata (0.0.0.0).`,

  // ---------------------------------------------------------------- avvisi
  W_IS_NETWORK: (p) =>
    `${p.host ? `L'host ${hostName(p.host)}` : "L'indirizzo"} ${p.ip} è l'indirizzo di rete della propria subnet /${p.prefix}: non si assegna a un host.`,
  W_IS_BROADCAST: (p) =>
    `${p.host ? `L'host ${hostName(p.host)}` : "L'indirizzo"} ${p.ip} è il broadcast della propria subnet /${p.prefix}: non si assegna a un host (cap. 8, esercizio 5).`,
  W_P2P: 'Prefisso /31: due indirizzi, entrambi assegnabili, solo per collegamenti punto-punto (RFC 3021). Non c\'è broadcast.',
  W_SINGLE: 'Prefisso /32: un solo indirizzo, che identifica un singolo host (loopback, rotte e regole per un indirizzo).',
  W_HOST_BITS_SET: (p) => `${p.given}/${p.prefix} ha bit di host a 1: uso la rete ${p.network}/${p.prefix}.`,
  W_LOOKS_LIKE_WILDCARD: (p) => `Sembra una wildcard: invertita è la mask valida /${p.prefix} (cap. 14).`,
  W_MASKS_DIFFER: (p) => `I due host usano prefissi diversi (/${p.prefixA} e /${p.prefixB}): ognuno decide con la propria mask (cap. 15).`,
  W_GATEWAY_OUTSIDE: (p) =>
    `Il gateway ${p.gateway} è fuori dalla subnet dell'host ${hostName(p.host)} (${p.network}/${p.prefix}): a seconda del sistema operativo la configurazione viene rifiutata o il traffico verso l'esterno non parte.`,
  W_GATEWAY_IS_NETWORK: (p) => `Il gateway ${p.gateway} è l'indirizzo di rete della subnet dell'host ${hostName(p.host)}.`,
  W_GATEWAY_IS_BROADCAST: (p) => `Il gateway ${p.gateway} è il broadcast della subnet dell'host ${hostName(p.host)}.`,
  W_GATEWAY_IS_HOST: (p) => `Il gateway ${p.gateway} coincide con l'host ${hostName(p.host)} stesso.`,
  W_NO_USABLE_HOSTS: (p) =>
    p.prefix === 31
      ? 'Le subnet risultanti sono /31: due indirizzi, utili solo per collegamenti punto-punto.'
      : 'Le subnet risultanti sono /32: un solo indirizzo ciascuna.',
  W_LARGE_LIST: (p) => `Le subnet sono ${fmtNumber(p.count)}: oltre ${fmtNumber(p.max)} righe l'export richiede un intervallo.`,
  W_SAME_PREFIX: (p) => `Il nuovo prefisso è uguale a quello del blocco (/${p.prefix}): risulta una sola subnet.`,

  // ---------------------------------------------------------------- motivi (F05 caso C)
  BOTH_BLOCK_TOO_SMALL: (p) =>
    `Per ${fmtNumber(p.hosts)} host serve almeno un /${p.hostsPrefix}, più grande dell'intero blocco /${p.blockPrefix}: serve un blocco più grande.`,
  BOTH_CONFLICT: (p) =>
    `Con subnet da /${p.hostsPrefix} (per ${fmtNumber(p.hosts)} host) il blocco /${p.blockPrefix} ne contiene ${fmtNumber(p.maxSubnets)}, ma ne servono ${fmtNumber(p.subnets)}: serve un blocco più grande o il VLSM.`,

  // ---------------------------------------------------------------- blocchi speciali (F04)
  'block.THIS_NETWORK': '"Questa rete" (0.0.0.0/8); 0.0.0.0/0 indica la rotta di default',
  'block.PRIVATE': 'Privato (RFC 1918)',
  'block.CGNAT': 'Carrier-grade NAT degli operatori',
  'block.LOOPBACK': "Loopback: l'host stesso",
  'block.LINK_LOCAL': 'Link-local / APIPA',
  'block.DOCUMENTATION': 'Riservato alla documentazione',
  'block.MULTICAST': 'Multicast (classe D)',
  'block.RESERVED': 'Riservato (classe E)',
  'block.LIMITED_BROADCAST': 'Broadcast limitato',

  // ---------------------------------------------------------------- etichette
  'method.binary': 'Binario',
  'method.magic': 'Numero magico',
  'method.multiples': 'Multipli',
  'method.weights': 'Sottrazione dei pesi',
  'method.divisions': 'Divisioni successive',
  'method.rules': 'Regole',
  'role.network': 'indirizzo di rete',
  'role.broadcast': 'broadcast',
  'role.host': 'host',
  'role.p2p': 'punto-punto',
  'role.single': 'host singolo',
  'kind.standard': 'standard',
  'kind.p2p': 'punto-punto (RFC 3021)',
  'kind.single': 'host singolo',
  'scope.private': 'Privato',
  'scope.special': 'Speciale',
  'scope.public': 'Pubblico',
  'verdict.same': 'Stessa subnet',
  'verdict.different': 'Subnet diverse',
  'verdict.asymmetric': 'Asimmetrico: uno vede l\'altro come locale, l\'altro no',
  'field.ip': 'Indirizzo IP',
  'field.prefix': 'Prefisso o mask',
  'field.mask': 'Mask',
  'field.number': 'Numero',
  'field.base': 'Base',
  'field.hosts': 'Host richiesti',
  'field.subnets': 'Subnet richieste',
  'field.block': 'Blocco',
  'field.newPrefix': 'Nuovo prefisso',
  'field.page': 'Pagina',
  'field.a': 'Host A',
  'field.b': 'Host B',
  'field.prefixA': 'Prefisso di A',
  'field.prefixB': 'Prefisso di B',
  'field.gateway': 'Gateway',
  'field.network': 'Rete',
  'field.aclNumber': 'Numero ACL',
  'field.aclName': 'Nome ACL',
  'field.aclAction': 'Azione ACL',
  'field.ospfProcess': 'Processo OSPF',
  'field.ospfArea': 'Area OSPF',
  chapter: (p) => `Capitolo ${String(p.chapter).replace(/^cap-/, '')}`,
  none: 'nessuno',

  // ---------------------------------------------------------------- interfaccia (fase 4): etichette comuni
  'ui.class': 'Classe',
  'ui.reserved': 'riservato',
  'ui.base': 'base',
  'ui.history.hosts': (p) => `${p.hosts} host`,
  'ui.history.subnets': (p) => `/${p.prefix} in ${p.subnets} subnet`,
  'ui.history.both': (p) => `/${p.prefix}, ${p.hosts} host, ${p.subnets} subnet`,
  'ui.yes': 'sì',
  'ui.no': 'no',
  'ui.close': 'Chiudi',
  'ui.cancel': 'Annulla',
  'ui.optional': 'facoltativo',

  // ---------------------------------------------------------------- interfaccia: app e navigazione (9.1, 9.2)
  'ui.app.name': 'Calcolatore Subnet',
  'ui.app.tagline': 'IPv4 · calcolo, didattica, pianificazione',
  'ui.skip': 'Salta al contenuto',
  'ui.nav.main': 'Sezioni',
  'ui.nav.tabs': (p) => `Schede di ${p.section}`,
  'ui.section.calcola': 'Calcola',
  'ui.section.pianifica': 'Pianifica',
  'ui.section.guide': 'Guide',
  'ui.section.impostazioni': 'Impostazioni',
  'ui.tab.analisi': 'Analisi',
  'ui.tab.conversioni': 'Conversioni',
  'ui.tab.mask': 'Mask',
  'ui.tab.stessa': 'Stessa subnet',
  'ui.tab.inverso': 'Calcolo inverso',
  'ui.tab.suddivisione': 'Suddivisione',
  'ui.tab.piani': 'Piani salvati',
  'ui.tab.uso': "Guida all'uso",
  'ui.tab.subnetting': 'Guida al subnetting',
  'ui.title.calcola/analisi': 'Analisi subnet',
  'ui.title.calcola/conversioni': 'Conversioni',
  'ui.title.calcola/mask': 'Validazione mask',
  'ui.title.calcola/stessa': 'Stessa subnet?',
  'ui.title.pianifica/inverso': 'Calcolo inverso',
  'ui.title.pianifica/suddivisione': 'Suddivisione di un blocco',
  'ui.title.pianifica/piani': 'Piani salvati',
  'ui.title.guide/uso': "Guida all'uso",
  'ui.title.guide/subnetting': 'Guida al subnetting',
  'ui.title.impostazioni': 'Impostazioni',
  'ui.lead.calcola/analisi': 'Rete, broadcast, host, mask, wildcard e numero magico di un indirizzo, con il tipo di indirizzo e le righe di configurazione.',
  'ui.lead.calcola/conversioni': 'Decimale, binario ed esadecimale; indirizzi in binario; prefisso e mask.',
  'ui.lead.calcola/mask': 'Una mask è valida se ha tutti gli 1 consecutivi a sinistra: qui vedi perché sì o perché no.',
  'ui.lead.calcola/stessa': 'Due host stanno nella stessa subnet? Ognuno decide con la propria mask, anche se sono diverse.',
  'ui.lead.pianifica/inverso': 'Dal requisito al prefisso: quanti host, quante subnet, o entrambi.',
  'ui.lead.pianifica/suddivisione': 'Tutte le subnet di un blocco con il nuovo prefisso, a pagine, con la ricerca della subnet che contiene un indirizzo.',
  'ui.lead.pianifica/piani': 'Piani di indirizzamento con nome, note ed etichette per subnet.',
  'ui.lead.guide/uso': 'Come si usa ogni funzione del calcolatore.',
  'ui.lead.guide/subnetting': 'Il manuale: dalle basi del binario ai metodi rapidi e alla progettazione.',
  'ui.lead.impostazioni': 'Modalità d\'uso, tema, dati e informazioni.',
  'ui.toTop': "Torna all'inizio della pagina",
  'ui.help': (p) => `Guida all'uso: ${p.topic}`,
  'ui.titleSuffix': 'Calcolatore Subnet',

  // ---------------------------------------------------------------- interfaccia: cronologia (9.1)
  'ui.history.open': 'Cronologia',
  'ui.history.title': 'Cronologia della visita',
  'ui.history.empty': 'Nessun calcolo ancora. I calcoli completati compaiono qui: un tocco li riapre.',
  'ui.history.note': 'La cronologia vale per questa visita. Con "Memorizza i dati" (fase 5) verrà salvata nel browser.',
  'ui.history.clear': 'Svuota la cronologia',
  'ui.history.cleared': 'Cronologia svuotata',
  'ui.history.remove': (p) => `Elimina dalla cronologia: ${p.summary}`,
  'ui.history.count': (p) => (p.n === 1 ? '1 calcolo' : `${p.n} calcoli`),
  'ui.fn.F01': 'Analisi',
  'ui.fn.F02': 'Conversione',
  'ui.fn.F03': 'Mask',
  'ui.fn.F04': 'Tipo di indirizzo',
  'ui.fn.F05': 'Calcolo inverso',
  'ui.fn.F06': 'Suddivisione',
  'ui.fn.F07': 'Stessa subnet',
  'ui.fn.F10': 'Snippet',

  // ---------------------------------------------------------------- interfaccia: componenti comuni (9.4)
  'ui.copy': (p) => `Copia ${p.what}`,
  'ui.copied': (p) => `Copiato: ${p.text}`,
  'ui.copyFailed': 'Copia non riuscita: seleziona il testo e copialo a mano.',
  'ui.field.ip': 'Indirizzo IP',
  'ui.field.ip.hint': 'Anche IP/prefisso o IP e mask: i due valori si dividono da soli. La virgola vale come punto.',
  'ui.field.prefix': 'Prefisso o mask',
  'ui.field.prefix.hint': '/20, 20 oppure 255.255.240.0',
  'ui.prefix.slider': 'Prefisso',
  'ui.prefix.valuetext': (p) => `/${p.prefix}, mask ${p.mask}`,
  'ui.prefix.dec': 'Prefisso più corto',
  'ui.prefix.inc': 'Prefisso più lungo',
  'ui.empty.try': 'Prova con',
  'ui.result': 'Risultato',
  'ui.warnings': 'Avvisi',
  'ui.unavailable': 'In arrivo',

  // ---------------------------------------------------------------- interfaccia: scheda risultato di Analisi (F01, F04, F10)
  'ui.r.network': 'Rete',
  'ui.r.broadcast': 'Broadcast',
  'ui.r.hostRange': 'Host',
  'ui.r.firstHost': 'Primo host',
  'ui.r.lastHost': 'Ultimo host',
  'ui.r.usable': 'Host utilizzabili',
  'ui.r.total': 'Indirizzi',
  'ui.r.mask': 'Subnet mask',
  'ui.r.wildcard': 'Wildcard',
  'ui.r.magic': 'Numero magico',
  'ui.r.block': 'Blocco',
  'ui.r.blockRange': (p) => `${p.start}–${p.end} nel ${ord(p.index)} ottetto`,
  'ui.r.position': "Posizione dell'IP",
  'ui.r.positionValue': (p) => `${fmtNumber(p.n)}° indirizzo · ${p.role}`,
  'ui.r.previous': 'Rete precedente',
  'ui.r.next': 'Rete successiva',
  'ui.r.outside': 'fuori dallo spazio IPv4',
  'ui.r.class': 'Classe storica',
  'ui.r.type': 'Tipo di indirizzo',
  'ui.r.blocks': 'Blocchi riservati',
  'ui.r.noPrefix': 'Aggiungi il prefisso o la mask per calcolare rete, broadcast e host.',
  'ui.r.defaultPrefix': (p) => `mask di default /${p.prefix}`,
  'ui.r.noDefault': 'nessuna mask di default',
  'ui.announce.analisi': (p) => `Rete ${p.network}, broadcast ${p.broadcast}, ${p.hosts} host utilizzabili.`,
  'ui.announce.classify': (p) => `Indirizzo ${p.scope}, classe ${p.cls}.`,
  'ui.snip.title': 'Wildcard e configurazione (ACL, OSPF)',
  'ui.snip.aclStandard': 'ACL standard numerata',
  'ui.snip.aclNamed': 'ACL standard con nome',
  'ui.snip.ospf': 'OSPF',
  'ui.snip.options': 'Opzioni',
  'ui.snip.lines': (p) => `righe ${p.what}`,

  // ---------------------------------------------------------------- interfaccia: passaggi didattici (F12)
  'ui.steps.title': 'Passaggi',
  'ui.steps.method': 'Metodo',
  'ui.steps.legend': 'Nelle righe binarie: in ambra i bit di rete, in verde acqua i bit di host.',
  'ui.steps.chapter': (p) => `Capitolo ${String(p.chapter).replace(/^cap-/, '')} · ${p.title}`,
  'ui.bits.net': 'bit di rete',
  'ui.bits.host': 'bit di host',
  'ui.bits.ip': 'IP',
  'ui.bits.mask': 'Mask',
  'ui.bits.network': 'Rete',
  'ui.bits.broadcast': 'Broadcast',

  // ---------------------------------------------------------------- interfaccia: barra di export (5, 9.4)
  'ui.export.title': 'Esporta',
  'ui.export.copy': 'Copia',
  'ui.export.csv': 'CSV',
  'ui.export.json': 'JSON',
  'ui.export.md': 'Markdown',
  'ui.export.text': 'Testo',
  'ui.export.print': 'Stampa',
  'ui.export.snippet': 'Snippet',
  'ui.export.pending': 'I formati di export arrivano con la fase 5; la stampa funziona già.',

  // ---------------------------------------------------------------- interfaccia: Conversioni (F02)
  'ui.conv.number': 'Numero',
  'ui.conv.number.hint': 'Da 0 a 4.294.967.295. In binario puoi separare i gruppi con spazi o punti; 0b e 0x sono accettati.',
  'ui.conv.base': 'Base del numero',
  'ui.conv.base.10': 'Decimale',
  'ui.conv.base.2': 'Binario',
  'ui.conv.base.16': 'Esadecimale',
  'ui.conv.width': 'Larghezza',
  'ui.conv.width.auto': 'Automatica',
  'ui.conv.width.8': '8 bit',
  'ui.conv.width.32': '32 bit',
  'ui.conv.dec': 'Decimale',
  'ui.conv.bin': 'Binario',
  'ui.conv.hex': 'Esadecimale',
  'ui.conv.weights': 'Somma dei pesi',
  'ui.conv.address': 'Indirizzo in notazione puntata',
  'ui.conv.address.title': 'Indirizzo',
  'ui.conv.binaryDotted': 'Binario',
  'ui.conv.hexDotted': 'Esadecimale per ottetto',
  'ui.conv.hex32': 'Esadecimale a 32 bit',
  'ui.conv.uint32': 'Intero a 32 bit',
  'ui.conv.pm.title': 'Prefisso e mask',
  'ui.conv.pm': 'Prefisso o mask',
  'ui.conv.prefix': 'Prefisso',
  'ui.conv.maskBinary': 'Mask in binario',
  'ui.conv.toMask': 'Vai alla validazione della mask',

  // ---------------------------------------------------------------- interfaccia: Mask (F03)
  'ui.mask.field': 'Subnet mask',
  'ui.mask.field.hint': 'Quattro ottetti, per esempio 255.255.255.192',
  'ui.mask.valid': (p) => `Mask valida: /${p.prefix}`,
  'ui.mask.invalid': 'Mask non valida',
  'ui.mask.octets': 'Gli ottetti',
  'ui.mask.col.octet': 'Ottetto',
  'ui.mask.col.value': 'Valore',
  'ui.mask.col.binary': 'Binario',
  'ui.mask.col.check': 'Valore ammesso',
  'ui.mask.suggestions': 'Le mask valide più vicine',
  'ui.mask.use': (p) => `${p.mask} (/${p.prefix})`,

  // ---------------------------------------------------------------- interfaccia: Stessa subnet (F07)
  'ui.same.a': 'Host A',
  'ui.same.pa': 'Prefisso o mask di A',
  'ui.same.b': 'Host B',
  'ui.same.pb': 'Prefisso o mask di B',
  'ui.same.pb.hint': 'Facoltativo: se vuoto, uguale ad A.',
  'ui.same.gw': 'Gateway',
  'ui.same.gw.hint': 'Facoltativo: viene verificato rispetto alla subnet di ciascun host.',
  'ui.same.side': (p) => `Dal punto di vista di ${p.host} (/${p.prefix})`,
  'ui.same.own': 'Propria rete',
  'ui.same.other': (p) => `Rete di ${p.other} con questa mask`,
  'ui.same.local': (p) => `${p.other} è locale`,
  'ui.same.gwIn': 'Gateway nella subnet',
  'ui.announce.same': (p) => `${p.verdict}.`,

  // ---------------------------------------------------------------- interfaccia: Calcolo inverso (F05)
  'ui.inv.case': 'Che cosa ti serve?',
  'ui.inv.a': 'Host per subnet',
  'ui.inv.b': 'Numero di subnet',
  'ui.inv.c': 'Entrambi',
  'ui.inv.hosts': 'Host richiesti per subnet',
  'ui.inv.hosts.hint': 'Conta anche gateway, stampanti, interfacce di gestione e un margine di crescita.',
  'ui.inv.prefix': 'Prefisso del blocco',
  'ui.inv.prefix.hint': '/16 oppure 255.255.0.0',
  'ui.inv.subnets': 'Subnet richieste',
  'ui.inv.result.prefix': 'Prefisso',
  'ui.inv.result.mask': 'Mask',
  'ui.inv.result.available': 'Host disponibili',
  'ui.inv.result.spare': 'Indirizzi di scorta',
  'ui.inv.result.newPrefix': 'Nuovo prefisso',
  'ui.inv.result.count': 'Subnet ottenute',
  'ui.inv.result.spareSubnets': 'Subnet di scorta',
  'ui.inv.result.hostsPer': 'Host per subnet',
  'ui.inv.result.borrowed': 'Bit presi in prestito',
  'ui.inv.feasible': 'Si può fare',
  'ui.inv.infeasible': 'Non si può fare con subnet tutte uguali',
  'ui.inv.result.range': 'Prefissi possibili',
  'ui.inv.result.recommended': 'Consigliato',
  'ui.inv.result.recommendedNote': (p) => `${fmtNumber(p.subnets)} subnet da ${fmtNumber(p.hosts)} host`,
  'ui.inv.result.alternative': 'Con subnet più grandi',
  'ui.inv.vlsm': 'Per subnet di dimensioni diverse servirà il pianificatore VLSM (versione 2).',
  'ui.inv.openAnalysis': 'Apri in Analisi',
  'ui.announce.inverse': (p) => `Prefisso /${p.prefix}.`,

  // ---------------------------------------------------------------- interfaccia: Suddivisione (F06)
  'ui.sub.block': 'Blocco',
  'ui.sub.block.hint': 'Indirizzo del blocco, anche nella forma 10.0.0.0/16',
  'ui.sub.prefix': 'Prefisso del blocco',
  'ui.sub.newPrefix': 'Nuovo prefisso',
  'ui.sub.summary': 'Riepilogo',
  'ui.sub.network': 'Blocco',
  'ui.sub.count': 'Subnet',
  'ui.sub.borrowed': 'Bit presi in prestito',
  'ui.sub.size': 'Indirizzi per subnet',
  'ui.sub.hosts': 'Host per subnet',
  'ui.sub.step': 'Passo',
  'ui.sub.caption': (p) => `Subnet da ${fmtNumber(p.from)} a ${fmtNumber(p.to)} di ${fmtNumber(p.count)}`,
  'ui.sub.col.n': 'N.',
  'ui.sub.col.network': 'Rete',
  'ui.sub.col.first': 'Primo host',
  'ui.sub.col.last': 'Ultimo host',
  'ui.sub.col.broadcast': 'Broadcast',
  'ui.sub.col.hosts': 'Host',
  'ui.sub.find': "Vai alla subnet che contiene l'IP",
  'ui.sub.find.button': 'Trova',
  'ui.sub.find.found': (p) => `${p.ip} sta nella subnet n. ${fmtNumber(p.n)}: ${p.cidr}.`,
  'ui.sub.find.outside': (p) => `${p.ip} non appartiene al blocco ${p.block}.`,
  'ui.pager': 'Pagine',
  'ui.pager.first': 'Prima pagina',
  'ui.pager.prev': 'Pagina precedente',
  'ui.pager.next': 'Pagina successiva',
  'ui.pager.last': 'Ultima pagina',
  'ui.pager.page': 'Pagina',
  'ui.pager.of': (p) => `di ${fmtNumber(p.pages)}`,
  'ui.pager.go': 'Vai',
  'ui.announce.subdivide': (p) => `${fmtNumber(p.count)} subnet /${p.prefix}.`,

  // ---------------------------------------------------------------- interfaccia: Piani salvati e Guide (segnaposto)
  'ui.plans.empty': 'Nessun piano salvato.',
  'ui.plans.pending': 'Il salvataggio di un piano da Suddivisione, con nome, note ed etichette per subnet (VLAN, uso), arriva con la fase 5.',
  'ui.plans.toSubdivide': 'Vai a Suddivisione',
  'ui.guide.pending': 'Le due guide entrano nel calcolatore con la fase 6, con indice, glossario e collegamenti "Apri nel calcolatore".',
  'ui.guide.target': (p) => `Il collegamento porta a: ${p.target}.`,
  'ui.guide.chapters': 'Capitoli della guida al subnetting',

  // ---------------------------------------------------------------- interfaccia: Impostazioni (9.5)
  'ui.set.modes': "Modalità d'uso",
  'ui.set.didactic': 'Modalità didattica',
  'ui.set.didactic.desc': 'Mostra i passaggi sotto ogni risultato, con la scelta del metodo.',
  'ui.set.method': 'Metodo predefinito dei passaggi',
  'ui.set.method.desc': 'Vale dove la funzione lo prevede; in ogni pannello dei passaggi puoi cambiarlo per la visita in corso.',
  'ui.set.export': 'Export',
  'ui.set.export.desc': 'Mostra la barra di export sui risultati.',
  'ui.set.theme': 'Tema',
  'ui.theme.auto': 'Automatico',
  'ui.theme.light': 'Chiaro',
  'ui.theme.dark': 'Scuro',
  'ui.theme.contrast': 'Alto contrasto',
  'ui.theme.auto.desc': 'Segue il sistema, compresa la richiesta di contrasto elevato.',
  'ui.set.data': 'Dati',
  'ui.set.persist': 'Memorizza i dati',
  'ui.set.persist.desc': 'Salva impostazioni, cronologia e piani in questo browser.',
  'ui.set.persist.pending': 'Disponibile con la fase 5. Per ora impostazioni e cronologia restano in memoria fino alla chiusura della pagina.',
  'ui.set.persist.note': 'Il salvataggio vale solo per questo browser e questo dispositivo, il browser può cancellarlo (Safari dopo un periodo di inattività) e non sostituisce l\'export della sessione.',
  'ui.set.exportSession': 'Esporta sessione',
  'ui.set.importSession': 'Importa sessione',
  'ui.set.session.pending': 'Export e import della sessione, anche cifrati, arrivano con la fase 5.',
  'ui.set.clear': 'Cancella tutti i dati',
  'ui.set.clear.desc': 'Svuota la cronologia e riporta le impostazioni ai valori predefiniti.',
  'ui.set.clear.title': 'Cancellare tutti i dati?',
  'ui.set.clear.body': 'La cronologia della visita viene svuotata e le impostazioni tornano ai valori predefiniti. L\'operazione non si può annullare.',
  'ui.set.clear.ok': 'Cancella tutto',
  'ui.set.cleared': 'Dati cancellati',
  'ui.set.about': 'Informazioni',
  'ui.about.version': 'Versione',
  'ui.about.build': 'Build',
  'ui.about.code': 'Codice',
  'ui.about.codeLicense': 'Licenza MIT · © 2026 Paolo Pallavera',
  'ui.about.fonts': 'Caratteri',
  'ui.about.fontsLicense': 'IBM Plex Sans, Mono e Sans Condensed · © IBM Corp. · SIL Open Font License 1.1',
  'ui.about.ofl': 'Testo della licenza dei caratteri',
  'ui.about.repo': 'Sorgenti',
  'ui.about.repoText': 'Repository calcolatore-subnet su GitHub',
  'ui.about.engine': 'Motore',
  'ui.about.engineText': 'Calcoli verificati con un oracolo Python indipendente (modulo ipaddress).',
  'ui.print.date': (p) => `Stampato il ${p.date}`,

  // ---------------------------------------------------------------- titoli dei capitoli della guida al subnetting (v0.3)
  'ui.cap.cap-1': "Cos'è una rete dati",
  'ui.cap.cap-2': "L'indirizzo IP come indirizzo postale",
  'ui.cap.cap-3': 'Perché il binario',
  'ui.cap.cap-4': 'Classi, indirizzi speciali e CIDR',
  'ui.cap.cap-5': 'Perché creare sottoreti',
  'ui.cap.cap-6': 'Subnet mask e notazione CIDR',
  'ui.cap.cap-7': 'Il metodo binario passo-passo',
  'ui.cap.cap-8': 'Esercizi guidati',
  'ui.cap.cap-9': 'Il numero magico',
  'ui.cap.cap-10': 'La tabella a scaletta',
  'ui.cap.cap-11': 'Che mask mi serve?',
  'ui.cap.cap-12': 'Il metodo dei multipli',
  'ui.cap.cap-13': 'Broadcast e host in un lampo',
  'ui.cap.cap-14': 'Wildcard mask rapida',
  'ui.cap.cap-15': 'Stessa subnet o no?',
  'ui.cap.cap-16': 'VLSM: il piano di indirizzamento',
  'ui.cap.cap-17': 'Supernetting e summarization',
  'ui.cap.cap-18': 'Casi limite: /30, /31, /32',
  'ui.cap.cap-19': 'Cenni di IPv6',

  // ---------------------------------------------------------------- passaggi: F01 binario (cap. 7)
  'step.mask-binary': (p) => `La mask /${p.prefix} in binario è ${p.maskBinary}, cioè ${p.mask}. Ottetto interessante: il ${ord(p.index)} (mask ${p.maskOctet}).`,
  'step.ip-binary': (p) => {
    const copied = p.copied.length ? `Gli ottetti con mask 255 (${p.copied.map(ordShort).join(', ')}) si copiano` : '';
    const zeroed = p.zeroed.length ? `quelli con mask 0 (${p.zeroed.map(ordShort).join(', ')}) diventano 0` : '';
    const rest = [copied, zeroed].filter(Boolean).join('; ');
    return `Converti in binario solo l'ottetto interessante: ${p.ipOctet} = ${p.ipOctetBinary}.${rest ? ` ${rest}.` : ''}`;
  },
  'step.and-network': (p) => `Rete = IP AND mask: ${p.ipOctet} AND ${p.maskOctet} = ${p.networkOctet}, quindi la rete è ${p.network}.`,
  'step.or-broadcast': (p) => `Broadcast = rete con tutti i bit di host a 1: ${p.networkOctet} diventa ${p.broadcastOctet}, e 255 a destra. Broadcast ${p.broadcast}.`,
  'step.no-broadcast': (p) =>
    p.prefix === 31
      ? 'Con /31 non ci sono indirizzi di rete e di broadcast da togliere: è un collegamento punto-punto (RFC 3021).'
      : 'Con /32 il blocco è un solo indirizzo: niente broadcast.',
  'step.host-range': (p) => (p.hostKind === 'standard' ? `Primo host = rete + 1 = ${p.firstHost}; ultimo host = broadcast − 1 = ${p.lastHost}.` : `Indirizzi assegnabili: da ${p.firstHost} a ${p.lastHost}.`),
  'step.host-count': (p) => `Host utilizzabili = 2${sup(p.hostBits)} − 2 = ${fmtNumber(p.power)} − 2 = ${fmtNumber(p.usableHosts)}.`,
  'step.host-count-exception': (p) =>
    p.prefix === 31 ? 'Eccezione /31: 2 indirizzi, entrambi assegnabili (cap. 18).' : 'Eccezione /32: 1 indirizzo, un solo host (cap. 18).',

  // ---------------------------------------------------------------- passaggi: numero magico e multipli (cap. 9, 12, 13)
  'step.interesting-octet': (p) => `Ottetto interessante del /${p.prefix}: il ${ord(p.index)}${p.bits ? `, con ${p.bits} bit di rete` : ''}.`,
  'step.boundary-convention': (p) =>
    `/${p.prefix} è un multiplo di 8: il confine cade tra due ottetti. Per convenzione l'ottetto interessante è l'ultimo che vale 255 (il ${ord(p.index)}), M = 1: le subnet avanzano di 1 lì e gli ottetti a destra vanno da 0 a 255.`,
  'step.zero-prefix': '/0 non ha bit di rete: per convenzione l\'ottetto interessante è il primo e M = 256, cioè un unico blocco da 0 a 255 che contiene tutti gli indirizzi.',
  'step.magic-number': (p) => `M = 256 − ${p.maskOctet} = ${p.magic} (oppure 2${sup(p.exponent)} = ${p.magic}).`,
  'step.block-multiple': (p) =>
    `Il multiplo di ${p.magic} che non supera ${p.ipOctet} è ${p.blockStart}: ${p.ipOctet} sta tra ${p.blockStart} e ${p.blockEnd}. Rete ${p.network}.`,
  'step.division': (p) => `${p.ipOctet} ÷ ${p.magic} = ${p.quotient} (parte intera); ${p.quotient} × ${p.magic} = ${p.blockStart}. Rete ${p.network}.`,
  'step.remainder': (p) =>
    `${p.ipOctet} mod ${p.magic} = ${p.remainder}, e ${p.ipOctet} − ${p.remainder} = ${p.blockStart}. L'indirizzo è il ${fmtNumber(p.position)}° del blocco${p.remainderIsLast && p.rightOctets === 0 ? ': resto = M − 1, è il broadcast' : ''}.`,
  'step.broadcast-quick': (p) =>
    `Broadcast = ${p.blockStart} + ${p.magic} − 1 = ${p.broadcastOctet}${p.rightOctets ? ', e 255 a destra' : ''}: ${p.broadcast}.${p.carry ? ` La rete successiva scavalca nell'ottetto a sinistra (${p.blockStart} + ${p.magic} = 256).` : ''}`,
  'step.host-quick': (p) =>
    p.rightOctets
      ? `Host = ${p.magic} × 256${p.rightOctets > 1 ? sup(p.rightOctets) : ''} − 2 = ${fmtNumber(p.usableHosts)}.`
      : `Host = ${p.magic} − 2 = ${fmtNumber(p.usableHosts)}.`,

  // ---------------------------------------------------------------- passaggi: F02 (cap. 3)
  'step.number-weights': (p) => `${fmtNumber(p.value)} con la sottrazione dei pesi: ${p.rows.filter((/** @type {any} */ r) => r.fits).map((/** @type {any} */ r) => fmtNumber(r.weight)).join(' + ') || '0'} → ${p.binary}.`,
  'step.number-divisions': (p) => `${fmtNumber(p.value)} con le divisioni successive per 2, leggendo i resti dal basso: ${p.binary}.`,
  'step.number-hex': (p) => `Ogni gruppo di 4 bit è una cifra esadecimale: ${p.nibbles.map((/** @type {any} */ n) => `${n.bits} = ${n.hex}`).join(', ')} → ${p.hex}.`,
  'step.octet-weights': (p) => `${ord(p.index)} ottetto, ${p.value}: ${p.rows.filter((/** @type {any} */ r) => r.fits).map((/** @type {any} */ r) => r.weight).join(' + ') || '0'} → ${p.binary}.`,
  'step.octet-divisions': (p) => `${ord(p.index)} ottetto, ${p.value}: resti delle divisioni per 2 letti dal basso → ${p.binary}.`,
  'step.address-result': (p) => `In binario ${p.binaryDotted}; in esadecimale ${p.hexDotted}.`,

  // ---------------------------------------------------------------- passaggi: F03 (cap. 6)
  'step.mask-octets': (p) => `Gli ottetti in binario: ${p.octets.map((/** @type {any} */ o) => `${o.value} = ${o.binary}`).join(' · ')}.`,
  'step.mask-octet-invalid': (p) => `${p.value} (${p.binary}) non è uno dei 9 valori ammessi: la mask non è valida.`,
  'step.mask-noncontiguous': (p) => `Dopo un ottetto diverso da 255 deve esserci solo 0, ma il ${ord(p.index)} ottetto no: gli 1 non sono consecutivi.`,
  'step.mask-valid': (p) => `Gli 1 sono tutti consecutivi da sinistra: ${p.prefix} bit, quindi /${p.prefix}.`,
  'step.mask-suggestions': (p) => `Le mask valide più vicine: ${p.suggestions.map((/** @type {any} */ s) => `${s.mask} (/${s.prefix})`).join(' e ')}.`,
  'step.mask-wildcard-hint': (p) => `Invertita è la mask /${p.prefix}: forse è una wildcard (cap. 14).`,

  // ---------------------------------------------------------------- passaggi: F04 (cap. 4)
  'step.class-first-bits': (p) => `Primo ottetto ${p.firstOctet} = ${p.binary}: inizia con ${p.leadingBits}, classe ${p.letter} (${p.range[0]}–${p.range[1]}).`,
  'step.class-reserved': (p) => (p.firstOctet === 0 ? '0.x.x.x significa "questa rete": è escluso dalla classe A.' : '127.x.x.x è il loopback: è escluso dalla classe A.'),
  'step.class-default-prefix': (p) => `Mask di default della classe ${p.letter}: /${p.defaultPrefix} (${p.mask}). Oggi conta solo il prefisso (CIDR).`,
  'step.class-no-mask': (p) => `La classe ${p.letter} non ha una mask di default.`,
  'step.special-blocks': (p) => `L'indirizzo sta in: ${p.blocks.map((/** @type {any} */ b) => b.cidr).join(', ')}.`,
  'step.public-address': 'Non sta in nessun blocco riservato: è un indirizzo pubblico.',
  'step.scope': (p) => `Tipo: ${String(STRINGS[`scope.${p.scope}`]).toLowerCase()}.`,

  // ---------------------------------------------------------------- passaggi: F05 (cap. 11)
  'step.hosts-needed': (p) => `Agli host si aggiungono rete e broadcast: ${fmtNumber(p.hosts)} + 2 = ${fmtNumber(p.needed)}.`,
  'step.hosts-power': (p) => `La più piccola potenza di 2 che sia almeno ${fmtNumber(p.needed)} è 2${sup(p.hostBits)} = ${fmtNumber(p.power)}.`,
  'step.hosts-prefix': (p) => `h = ${p.hostBits} bit di host → /${p.prefix} (32 − ${p.hostBits}), mask ${p.mask}.`,
  'step.hosts-spare': (p) => `Host disponibili ${fmtNumber(p.usableHosts)}: ne avanzano ${fmtNumber(p.spare)}.`,
  'step.hosts-alt': (p) => (p.altPrefix === 31 ? 'Per un collegamento punto-punto basta anche un /31 (cap. 18).' : 'Per un solo host si può usare anche un /32 (cap. 18).'),
  'step.subnets-power': (p) => `La più piccola potenza di 2 che sia almeno ${fmtNumber(p.subnets)} è 2${sup(p.borrowedBits)} = ${fmtNumber(p.power)}.`,
  'step.subnets-prefix': (p) => `Si prendono in prestito ${p.borrowedBits} bit: /${p.blockPrefix} + ${p.borrowedBits} = /${p.newPrefix}.`,
  'step.subnets-spare': (p) => `${fmtNumber(p.power)} subnet, ne avanzano ${fmtNumber(p.spare)}; ognuna con ${fmtNumber(p.usableHostsPerSubnet)} host.`,
  'step.both-hosts': (p) => `Per ${fmtNumber(p.hosts)} host serve al massimo un /${p.hostsPrefix}.`,
  'step.both-subnets': (p) =>
    p.subnetsPrefix === null
      ? `Il blocco /${p.blockPrefix} non contiene ${fmtNumber(p.subnets)} subnet.`
      : `Per ${fmtNumber(p.subnets)} subnet dal /${p.blockPrefix} serve almeno un /${p.subnetsPrefix}.`,
  'step.both-feasible': (p) =>
    `Vanno bene i prefissi da /${p.range[0]} a /${p.range[1]}. Consigliato /${p.recommended} (${fmtNumber(p.subnetsAtRecommended)} subnet della dimensione minima sufficiente)${p.alternative !== p.recommended ? `; con /${p.alternative} le subnet sono più grandi` : ''}.`,
  'step.both-infeasible': (p) =>
    p.reason === 'BOTH_BLOCK_TOO_SMALL'
      ? `Non si può: gli host richiedono un /${p.hostsPrefix}, più grande del blocco /${p.blockPrefix}.`
      : `Non si può con subnet tutte uguali: gli host chiedono al massimo /${p.hostsPrefix}, le subnet almeno ${p.subnetsPrefix === null ? 'più di /32' : `/${p.subnetsPrefix}`}. Serve un blocco più grande o il VLSM.`,

  // ---------------------------------------------------------------- passaggi: F06 (cap. 11, 13)
  'step.subdivide-borrowed': (p) => `Da /${p.blockPrefix} a /${p.newPrefix}: ${p.borrowedBits} bit presi in prestito, 2${sup(p.borrowedBits)} = ${fmtNumber(p.count)} subnet.`,
  'step.subdivide-sequence': (p) =>
    p.count > 1
      ? `Le subnet avanzano di ${p.magic} nel ${ord(p.index)} ottetto: ${p.first}, ${p.second}, … fino a ${p.last}.`
      : `Una sola subnet: ${p.first}.`,
  'step.carry': (p) => `Riporto: dopo ${p.before} viene ${p.after}, perché nel ${ord(p.index)} ottetto si arriva a 256 (cap. 13).`,

  // ---------------------------------------------------------------- passaggi: F07 (cap. 15)
  'step.same-rule': (p) =>
    p.masksDiffer
      ? `Prefissi diversi (/${p.prefixA} e /${p.prefixB}): ogni host decide con la propria mask, quindi si fa il controllo due volte.`
      : `Stesso prefisso /${p.prefixA}: ottetti a sinistra identici, stesso blocco di M nell'ottetto interessante, ottetti a destra indifferenti.`,
  'step.same-rule-binary': (p) =>
    p.masksDiffer
      ? `Prefissi diversi (/${p.prefixA} e /${p.prefixB}): ogni host fa AND tra i due indirizzi e la propria mask.`
      : `Ogni host fa AND tra i due indirizzi e la mask /${p.prefixA}: se le reti coincidono, l'altro è locale.`,
  'step.same-side-magic': (p) =>
    `Per ${hostName(p.side)} (/${p.prefix}, M = ${p.magic} nel ${ord(p.index)} ottetto): ottetti a sinistra ${p.leftOctetsEqual ? 'uguali' : 'diversi'}; ${p.selfValue} → blocco ${p.selfBlockStart}–${p.selfBlockEnd}, ${p.otherValue} → blocco ${p.otherBlockStart}–${p.otherBlockEnd}. L'altro è locale: ${yesNo(p.local)}.`,
  'step.same-side-and': (p) =>
    `Per ${hostName(p.side)} (/${p.prefix}): ${p.self} → rete ${p.selfNetwork}; ${p.other} → rete ${p.otherNetwork}. L'altro è locale: ${yesNo(p.local)}.`,
  'step.same-verdict': (p) => `${STRINGS[`verdict.${p.verdict}`]}.`,

  // ---------------------------------------------------------------- passaggi: F10 (cap. 14)
  'step.wildcard-rule': (p) => `Wildcard = 255 − mask, ottetto per ottetto: ${p.octets.map((/** @type {any} */ o) => `255 − ${o.mask} = ${o.wildcard}`).join(' · ')} → ${p.wildcard}.`,
  'step.wildcard-magic': (p) => `In pratica: nell'ottetto interessante (il ${ord(p.index)}) vale M − 1 = ${p.wildcardOctet}, 0 a sinistra e 255 a destra.`,
  'step.snippet-host': (p) => `Con /32 le ACL usano la parola chiave host: host ${p.network}.`,
  'step.snippet-any': 'Con /0 le ACL usano la parola chiave any (qualunque indirizzo).',

  // ---------------------------------------------------------------- export (5)
  'export.item': 'Voce',
  'export.value': 'Valore',
  'export.prefix': 'Prefisso',
  'export.yes': 'sì',
  'export.no': 'no',
  'export.result': 'Esito',
  'export.reason': 'Motivo',
  'export.defaultMask': 'Mask di default',
  'export.alternative': 'Alternativa',
  'export.label': 'Etichetta',
  'export.plan': 'Piano',
  'export.rows': 'Righe esportate',
  'export.warnings': 'Avvisi',
  'export.method': 'metodo',
  'export.bitsLegend': 'a sinistra della barra i bit di rete, a destra quelli di host',
  'export.chapters': 'Nella guida',
  'export.same.aSeesB': 'A vede B come locale',
  'export.same.bSeesA': 'B vede A come locale',
  'export.same.netA': 'Rete di A (mask di A)',
  'export.same.bWithA': 'Rete di B con la mask di A',
  'export.same.netB': 'Rete di B (mask di B)',
  'export.same.aWithB': 'Rete di A con la mask di B',
  'export.same.gwA': 'Gateway nella subnet di A',
  'export.same.gwB': 'Gateway nella subnet di B',

  // ---------------------------------------------------------------- import della sessione (6.3, 7.3)
  IMPORT_TOO_LARGE: (p) => `Il file pesa ${fmtNumber(Math.ceil(p.size / 1024))} KB e supera il limite di 5 MB.`,
  IMPORT_NOT_JSON: 'Il file non è in formato JSON: forse non è una sessione esportata da questa app.',
  IMPORT_UNKNOWN_FORMAT: (p) =>
    p.format ? `Il file è nel formato "${p.format}": non è una sessione del Calcolatore Subnet.` : 'Il file non è una sessione del Calcolatore Subnet.',
  IMPORT_NEWER_VERSION: (p) => `Il file usa la versione ${p.version} del formato, questa app legge fino alla ${p.supported}: aggiorna l'app per importarlo.`,
  IMPORT_BAD_FIELD: (p) => `Il campo "${p.field}" del file non è valido.`,
  IMPORT_BAD_ENVELOPE: (p) => `Il file cifrato è danneggiato o incompleto (campo "${p.field}").`,
  IMPORT_DECRYPT_FAILED: 'Passphrase errata o file danneggiato.',
  IMPORT_NESTED_ENVELOPE: 'Il contenuto decifrato è a sua volta un file cifrato: non viene importato.',
  IMPORT_CRYPTO_UNAVAILABLE:
    'Con la pagina aperta così il browser non mette a disposizione la cifratura (Web Crypto). Apri l\'app da un indirizzo HTTPS (per esempio GitHub Pages) o da localhost.',
  IMPORT_W_MIGRATED: (p) => `Il file era nella versione ${p.from} del formato ed è stato aggiornato alla ${p.to}.`,
  IMPORT_W_HISTORY_TRUNCATED: (p) => `Cronologia oltre le ${p.max} voci: tenute le più recenti, ${fmtNumber(p.dropped)} escluse.`,
  IMPORT_W_PLANS_TRUNCATED: (p) => `Più di ${p.max} piani: tenuti quelli modificati più di recente, ${fmtNumber(p.dropped)} esclusi.`,
  IMPORT_W_LABELS_DROPPED: (p) => `Piano "${p.plan}": ${fmtNumber(p.count)} etichette non valide escluse.`,
  IMPORT_W_DUPLICATE_ID: (p) => `${fmtNumber(p.count)} elementi con identificativo ripetuto nel file: tenuto il primo.`,
};

/**
 * Testo per un codice, con i parametri. Un codice senza testo restituisce il codice stesso.
 * @param {string} code
 * @param {Params} [params]
 * @returns {string}
 */
export function t(code, params = {}) {
  const tpl = STRINGS[code];
  if (tpl === undefined) return code;
  return typeof tpl === 'function' ? tpl(params) : tpl;
}
