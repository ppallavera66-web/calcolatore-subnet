// @ts-check
/**
 * Tipi condivisi dall'interfaccia (solo JSDoc).
 *
 * @typedef {import('./state.js').AppState} AppState
 * @typedef {import('./router.js').Route} Route
 * @typedef {ReturnType<typeof import('./state.js').createStore<AppState>>} Store
 *
 * @typedef {object} Ctx contesto passato a viste e componenti
 * @property {Store} store
 * @property {() => Route} route rotta corrente
 * @property {(view: string, params: Record<string, string>) => void} setParams aggiorna input e frammento mentre si scrive
 * @property {(view: string, params?: Record<string, string>, anchor?: string | null) => void} go naviga verso una vista (nuova voce di cronologia del browser)
 * @property {(view: string, params?: Record<string, string>, anchor?: string | null) => string} href frammento di una vista
 * @property {(text: string) => void} announce annuncio per i lettori di schermo
 * @property {(text: string) => void} toast messaggio breve visibile e annunciato
 * @property {(text: string, what: string) => Promise<void>} copy copia negli appunti con conferma
 * @property {(entry: { fn: string, input: Record<string, any> } | null, now?: boolean) => void} record registra in cronologia (dopo una pausa, o subito)
 * @property {() => void} openHistory apre il pannello della cronologia
 * @property {() => void} print stampa la vista
 * @property {ReturnType<typeof import('./persistence.js').createPersistence>} persistence salvataggio nel browser (8.3)
 * @property {(fn: (e: import('./persistence.js').PersistEvent) => void) => () => void} onPersistEvent avvisi della persistenza; restituisce la funzione per smettere
 * @property {() => string} newId identificativo casuale di 12 caratteri (6.1)
 * @property {() => string} now data e ora ISO
 *
 * @typedef {object} View
 * @property {HTMLElement} el
 * @property {(route: Route) => void} [update] la rotta della stessa vista è cambiata (tasto indietro, collegamento)
 * @property {() => void} [destroy]
 * @property {() => string[]} [printInputs] righe con gli input, per l'intestazione di stampa
 */
export {};
