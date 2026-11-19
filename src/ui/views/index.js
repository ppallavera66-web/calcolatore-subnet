// @ts-check
/**
 * Registro delle viste (specifica tecnica, 9.1): una funzione che crea la vista per ogni rotta.
 */
import { createAnalisi } from './analisi.js';
import { createConversioni } from './conversioni.js';
import { createMask } from './mask.js';
import { createStessa } from './stessa.js';
import { createInverso } from './inverso.js';
import { createSuddivisione } from './suddivisione.js';
import { createGuide } from './placeholders.js';
import { createPiani } from './piani.js';
import { createImpostazioni } from './impostazioni.js';

/** @type {Record<string, (ctx: import('../types.js').Ctx, route: import('../types.js').Route) => import('../types.js').View>} */
export const VIEWS = {
  'calcola/analisi': createAnalisi,
  'calcola/conversioni': createConversioni,
  'calcola/mask': createMask,
  'calcola/stessa': createStessa,
  'pianifica/inverso': createInverso,
  'pianifica/suddivisione': createSuddivisione,
  'pianifica/piani': createPiani,
  'guide/uso': createGuide,
  'guide/subnetting': createGuide,
  impostazioni: createImpostazioni,
};
