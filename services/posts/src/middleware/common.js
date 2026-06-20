/**
 * @file common.js
 * @brief Middlewares partagés du service Posts : auth, RBAC, validation, erreurs, rate-limit.
 */
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { fail, AppError } from '../utils/response.js';

/** @brief Authentification stricte : exige un JWT valide et peuple `req.user`. */
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

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const p = jwt.verify(token, env.jwt.accessSecret, { issuer: 'breezy-auth' });
      req.user = { id: p.sub, username: p.username, role: p.role };
    } catch { /* route accessible sans jeton */ }
  }
  next();
}

// Enveloppe les handlers async pour router leurs rejets vers errorHandler (Express 4)
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function requireInternal(req, res, next) {
  if (req.headers['x-internal-key'] !== env.internalKey) {
    return fail(res, 403, 'FORBIDDEN', 'Accès interne refusé.');
  }
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return fail(res, 401, 'UNAUTHENTICATED', 'Authentification requise.');
    if (!roles.includes(req.user.role)) return fail(res, 403, 'FORBIDDEN', 'Droits insuffisants.');
    next();
  };
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

export const globalLimiter = rateLimit({ windowMs: 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });

export function notFound(req, res) {
  return fail(res, 404, 'NOT_FOUND', `Route introuvable : ${req.method} ${req.originalUrl}`);
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) return fail(res, err.status, err.code, err.message, err.details);
  if (err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Fichier trop volumineux (max 10 Mo).' : 'Upload invalide.';
    return fail(res, 422, 'UPLOAD_ERROR', msg);
  }
  if (err.name === 'CastError') return fail(res, 400, 'BAD_ID', 'Identifiant de ressource invalide.');
  if (err.name === 'ValidationError') return fail(res, 422, 'VALIDATION_ERROR', err.message);
  if (err.code === 11000) return fail(res, 409, 'CONFLICT', 'Action déjà effectuée.');
  console.error('[posts] Erreur non gérée :', err);
  return fail(res, 500, 'INTERNAL_ERROR', 'Une erreur interne est survenue.');
}
