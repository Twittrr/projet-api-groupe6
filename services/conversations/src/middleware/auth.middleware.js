/**
 * @file auth.middleware.js
 * @brief Middlewares d'authentification JWT et de contrôle d'accès interne.
 */
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

function fail(res, status, code, message) {
  return res.status(status).json({ data: null, error: { code, message }, meta: null });
}

/** @brief Vérifie le Bearer JWT et attache `req.user` ({ id, username, role }). */
export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return fail(res, 401, 'UNAUTHENTICATED', "Jeton d'accès manquant.");
  try {
    const p = jwt.verify(token, env.jwt.accessSecret, { issuer: 'breezy-auth' });
    req.user = { id: p.sub, username: p.username, role: p.role };
    return next();
  } catch {
    return fail(res, 401, 'INVALID_TOKEN', 'Jeton invalide ou expiré.');
  }
}
