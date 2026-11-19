/** Versione dell'app, iniettata da Vite (vite.config.js, opzione define). */
declare const __APP_VERSION__: string;
/** Data di build (AAAA-MM-GG), iniettata da Vite. */
declare const __BUILD_DATE__: string;

/** Testo di un file importato con il suffisso ?raw (Vite). */
declare module '*?raw' {
  const content: string;
  export default content;
}
