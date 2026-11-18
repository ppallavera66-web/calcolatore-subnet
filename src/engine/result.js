// @ts-check
/**
 * Esiti del motore (specifica tecnica, 3.1).
 * Le funzioni pubbliche non lanciano eccezioni per input dell'utente:
 * restituiscono sempre un esito `ok` oppure `fail`.
 */

/**
 * @typedef {{ code: string, params: Record<string, any> }} Warning
 * @typedef {{ code: string, field: string | null, params: Record<string, any> }} EngineError
 */

/**
 * @template T
 * @typedef {{ ok: true, value: T, warnings: Warning[] }} Ok
 */

/**
 * @typedef {{ ok: false, error: EngineError }} Fail
 */

/**
 * @template T
 * @typedef {Ok<T> | Fail} Result
 */

/**
 * @template T
 * @param {T} value
 * @param {Warning[]} [warnings]
 * @returns {Ok<T>}
 */
export function ok(value, warnings = []) {
  return { ok: true, value, warnings };
}

/**
 * @param {string} code
 * @param {string | null} [field]
 * @param {Record<string, any>} [params]
 * @returns {Fail}
 */
export function fail(code, field = null, params = {}) {
  return { ok: false, error: { code, field, params } };
}

/**
 * @param {string} code
 * @param {Record<string, any>} [params]
 * @returns {Warning}
 */
export function warn(code, params = {}) {
  return { code, params };
}

