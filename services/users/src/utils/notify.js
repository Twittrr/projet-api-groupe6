/**
 * @file notify.js
 * @brief Émission de notifications vers le service Notifications (appel interne, non bloquant).
 */
import { env } from '../config/env.js';

/**
 * @brief Émet une notification ; une panne du service ne casse jamais l'action principale.
 * @param params `{ userId, type, actor, payload }`.
 * @returns Résout toujours (les erreurs sont journalisées, non propagées).
 */
export async function emitNotification({ userId, type, actor, payload }) {
  try {
    await fetch(`${env.notifUrl}/api/notifications/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': env.internalKey },
      body: JSON.stringify({ userId, type, actor, payload }),
    });
  } catch (err) {
    console.warn(`[users] Notification non émise (${type}): ${err.message}`);
  }
}
