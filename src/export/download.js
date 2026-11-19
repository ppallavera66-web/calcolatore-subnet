// @ts-check
/**
 * Download di un file (5.2): `Blob` e un collegamento con attributo `download`, che funziona anche
 * con la pagina aperta da disco. L'URL temporaneo viene rilasciato poco dopo il clic.
 */

/** Tipi MIME per estensione. */
export const MIME = Object.freeze({
  csv: 'text/csv;charset=utf-8',
  json: 'application/json;charset=utf-8',
  md: 'text/markdown;charset=utf-8',
  txt: 'text/plain;charset=utf-8',
});

/**
 * @param {string} text
 * @param {string} fileName
 * @param {string} [mime]
 */
export function downloadText(text, fileName, mime = MIME.txt) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Legge un file scelto dall'utente come testo UTF-8 (import della sessione).
 * @param {Blob} file
 * @returns {Promise<string>}
 */
export function readFileText(file) {
  if (typeof file.text === 'function') return file.text();
  /* c8 ignore next 7 */
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(file, 'utf-8');
  });
}
