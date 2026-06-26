/**
 * @file resetToken.js
 * @brief Génération et hachage des jetons de réinitialisation de mot de passe.
 *
 * Le jeton clair (32 octets aléatoires) est envoyé à l'utilisateur ; seule son
 * empreinte SHA-256 est stockée en base. Le jeton ayant une forte entropie,
 * un simple SHA-256 suffit (pas besoin de bcrypt, réservé aux secrets faibles).
 */
import { randomBytes, createHash } from 'node:crypto';

/** Durée de validité d'un jeton de réinitialisation (1 heure). */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** @brief Empreinte SHA-256 (hex) d'un jeton clair, pour stockage/comparaison. */
export function hashResetToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * @brief Crée un jeton de réinitialisation.
 * @param now Date de référence (injectable pour les tests).
 * @returns `{ token, tokenHash, expiresAt }` — `token` à envoyer, le reste à persister.
 */
export function generateResetToken(now = new Date()) {
  const token = randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
  };
}
