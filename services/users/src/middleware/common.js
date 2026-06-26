/**
 * @file common.js
 * @brief Middlewares partagés du service Users : auth, RBAC, validation, erreurs, rate-limit.
 */
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { fail, AppError } from '../utils/response.js';

/**
 * @brief Authentification stricte : exige un JWT valide et peuple `req.user`.
 * @param req Requête Express.
 * @param res Réponse Express.
 * @param next Callback Express.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return fail(res, 401, 'UNAUTHENTICATED', "Jeton d'accès manquant.");
  try {
    const p = jwt.verify(token, env.jwt.accessSecret, { issuer: 'breezy-auth' });
    req.user = { id: p.sub, username: p.username, role: p.role };
    next();
  } catch {
    return fail(res, 401, 'INVALID_TOKEN', 'Jeton invalide ou expiré.');
  }
}

/**
 * @brief Authentification optionnelle : enrichit `req.user` si un JWT valide est présent.
 * @param req Requête Express.
 * @param _res Réponse Express (inutilisée).
 * @param next Callback Express.
 */
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const p = jwt.verify(token, env.jwt.accessSecret, { issuer: 'breezy-auth' });
      req.user = { id: p.sub, username: p.username, role: p.role };
    } catch { /* ignore : route accessible sans jeton */ }
  }
  next();
}

// RBAC
/**
 * @brief Restreint l'accès aux rôles autorisés (RBAC).
 * @param roles Rôles autorisés.
 * @returns Middleware Express (403 si rôle non autorisé).
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return fail(res, 401, 'UNAUTHENTICATED', 'Authentification requise.');
    if (!roles.includes(req.user.role)) return fail(res, 403, 'FORBIDDEN', 'Droits insuffisants.');
    next();
  };
}

/**
 * @brief Protège les endpoints internes service-à-service via une clé partagée.
 * @param req Requête Express (en-tête `x-internal-key`).
 * @param res Réponse Express.
 * @param next Callback Express.
 */
export function requireInternal(req, res, next) {
  if (req.headers['x-internal-key'] !== env.internalKey) {
    return fail(res, 403, 'FORBIDDEN', 'Accès interne refusé.');
  }
  next();
}

export function validate(schema) {
  return (req, _res, next) => {
    const r = schema.safeParse(req.body);
    if (!r.success) {
      const details = r.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
      return next(new AppError(422, 'VALIDATION_ERROR', 'Validation des champs échouée.', details));
    }
    req.body = r.data;
    next();
  };
}

// Enveloppe les handlers async pour router leurs rejets vers errorHandler (Express 4)
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const globalLimiter = rateLimit({ windowMs: 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });

// Limiteur d'écriture : protège les actions sociales (follow/unfollow) du spam et
// de la génération massive de notifications. Seuils relâchés en développement.
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 30 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { data: null, error: { code: 'RATE_LIMITED', message: "Trop d'actions. Réessayez plus tard." }, meta: null },
});

export function notFound(req, res) {
  return fail(res, 404, 'NOT_FOUND', `Route introuvable : ${req.method} ${req.originalUrl}`);
}

/**
 * @brief Middleware d'erreurs centralisé (AppError, contraintes Sequelize, erreurs inattendues).
 * @param err Erreur capturée.
 * @param req Requête Express.
 * @param res Réponse Express.
 * @param next Callback Express (signature à 4 arguments requise).
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) return fail(res, err.status, err.code, err.message, err.details);
  if (err.name === 'SequelizeUniqueConstraintError') return fail(res, 409, 'CONFLICT', 'Ressource déjà existante.');
  console.error('[users] Erreur non gérée :', err);
  return fail(res, 500, 'INTERNAL_ERROR', 'Une erreur interne est survenue.');
}
