/**
 * @file response.js
 * @brief Helpers de réponse HTTP homogènes `{ data, error, meta }` + erreur applicative typée.
 */

/** @brief Réponse de succès `{ data, error: null, meta }`. */
export function ok(res, data, meta = undefined, status = 200) {
  return res.status(status).json({ data, error: null, meta: meta ?? null });
}
export function created(res, data, meta = undefined) {
  return ok(res, data, meta, 201);
}
export function fail(res, status, code, message, details = undefined) {
  return res.status(status).json({ data: null, error: { code, message, details: details ?? null }, meta: null });
}
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
