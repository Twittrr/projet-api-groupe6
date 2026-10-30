/**
 * @file response.js
 * @brief Helpers de réponse HTTP homogènes `{ data, error, meta }` et erreur applicative typée.
 */

/**
 * @brief Réponse de succès.
 * @param res Réponse Express.
 * @param data Charge utile.
 * @param meta Métadonnées optionnelles (pagination, compteurs…).
 * @param status Code HTTP (200 par défaut).
 */
export function ok(res, data, meta = undefined, status = 200) {
  return res.status(status).json({ data, error: null, meta: meta ?? null });
}

/**
 * @brief Réponse de création (HTTP 201).
 * @param res Réponse Express.
 * @param data Ressource créée.
 * @param meta Métadonnées optionnelles.
 */
export function created(res, data, meta = undefined) {
  return ok(res, data, meta, 201);
}

/**
 * @brief Réponse d'erreur structurée.
 * @param res Réponse Express.
 * @param status Code HTTP.
 * @param code Code d'erreur applicatif (ex. `INVALID_CREDENTIALS`).
 * @param message Message lisible.
 * @param details Détails optionnels (erreurs de validation…).
 */
export function fail(res, status, code, message, details = undefined) {
  return res.status(status).json({
    data: null,
    error: { code, message, details: details ?? null },
    meta: null,
  });
}

/**
 * @brief Enveloppe un handler async pour router ses rejets vers le middleware d'erreurs (Express 4).
 * @param fn Handler async `(req, res, next)`.
 * @returns Handler Express sûr face aux promesses rejetées.
 */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @brief Erreur applicative typée, interceptée par le middleware d'erreurs centralisé.
 */
export class AppError extends Error {
  /**
   * @param status Code HTTP.
   * @param code Code d'erreur applicatif.
   * @param message Message lisible.
   * @param details Détails optionnels.
   */
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
