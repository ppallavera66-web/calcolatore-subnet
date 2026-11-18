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
