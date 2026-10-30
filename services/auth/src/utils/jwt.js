/**
 * @file jwt.js
 * @brief Génération et vérification des jetons JWT (access + refresh).
 */
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

/**
 * @brief Génère un access token court (claims minimaux : identité + rôle).
 * @param user Utilisateur source (`id`, `username`, `role`).
 * @returns Access token signé.
 */
export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessTtl, issuer: 'breezy-auth' }
  );
}

/**
 * @brief Génère un refresh token long avec jti unique.
 * @param user Utilisateur source (`id`).
 * @returns `{ token, jti, expiresAt }` — le token signé, son identifiant et sa date d'expiration.
 */
export function signRefreshToken(user) {
  const jti = randomUUID();
  const token = jwt.sign(
    { sub: user.id, type: 'refresh', jti },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshTtl, issuer: 'breezy-auth' }
  );
  const decoded = jwt.decode(token);
  return { token, jti, expiresAt: new Date(decoded.exp * 1000) };
}

/**
 * @brief Vérifie un access token.
 * @param token Jeton à vérifier.
 * @returns Payload décodé.
 */
export function verifyAccess(token) {
  return jwt.verify(token, env.jwt.accessSecret, { issuer: 'breezy-auth' });
}

/**
 * @brief Vérifie la signature et le type d'un refresh token.
 * La révocation (blacklist) est vérifiée séparément dans le contrôleur.
 * @param token Jeton à vérifier.
 * @returns Payload décodé.
 */
export function verifyRefresh(token) {
  const payload = jwt.verify(token, env.jwt.refreshSecret, { issuer: 'breezy-auth' });
  if (payload.type !== 'refresh') throw new Error('Token type mismatch');
  return payload;
}
