/**
 * @file authenticate.js
 * @brief Middlewares d'authentification JWT et de contrôle d'accès par rôle (RBAC).
 */
import { verifyAccess } from '../utils/jwt.js';
import { fail } from '../utils/response.js';

/**
 * @brief Vérifie le JWT d'accès (signature + expiration) et peuple `req.user`.
 * @param req Requête Express (en-tête `Authorization: Bearer <token>`).
 * @param res Réponse Express.
 * @param next Callback Express.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return fail(res, 401, 'UNAUTHENTICATED', "Jeton d'accès manquant.");
  try {
    const payload = verifyAccess(token);
    req.user = { id: payload.sub, username: payload.username, role: payload.role };
    next();
  } catch {
    return fail(res, 401, 'INVALID_TOKEN', 'Jeton invalide ou expiré.');
  }
}

/**
 * @brief Restreint l'accès aux rôles autorisés (RBAC).
 * @param roles Rôles autorisés.
 * @returns Middleware Express renvoyant 403 si le rôle courant n'est pas autorisé.
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return fail(res, 401, 'UNAUTHENTICATED', 'Authentification requise.');
    if (!roles.includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Droits insuffisants pour cette action.');
    }
    next();
  };
}
