/**
 * @file errorHandler.js
 * @brief Middlewares de gestion centralisée des erreurs (404 + erreurs applicatives/Sequelize).
 */
import { fail, AppError } from '../utils/response.js';

/**
 * @brief Réponse 404 pour une route inexistante.
 * @param req Requête Express.
 * @param res Réponse Express.
 */
export function notFound(req, res) {
  return fail(res, 404, 'NOT_FOUND', `Route introuvable : ${req.method} ${req.originalUrl}`);
}

/**
 * @brief Middleware d'erreurs centralisé (dernier de la chaîne).
 * @param err Erreur capturée (AppError, erreurs Sequelize, ou inattendue).
 * @param req Requête Express.
 * @param res Réponse Express.
 * @param next Callback Express (requis par la signature à 4 arguments).
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return fail(res, err.status, err.code, err.message, err.details);
  }
  // Contraintes Sequelize (unicité, validation)
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors?.[0]?.path || 'champ';
    return fail(res, 409, 'CONFLICT', `Ce ${field} est déjà utilisé.`);
  }
  if (err.name === 'SequelizeValidationError') {
    return fail(res, 422, 'VALIDATION_ERROR', 'Données invalides.', err.errors?.map((e) => e.message));
  }
  console.error('[auth] Erreur non gérée :', err);
  return fail(res, 500, 'INTERNAL_ERROR', 'Une erreur interne est survenue.');
}
