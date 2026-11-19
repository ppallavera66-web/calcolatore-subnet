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
 *
 * @typedef {object} View
 * @property {HTMLElement} el
 * @property {(route: Route) => void} [update] la rotta della stessa vista è cambiata (tasto indietro, collegamento)
 * @property {() => void} [destroy]
 * @property {() => string[]} [printInputs] righe con gli input, per l'intestazione di stampa
 */
export {};
