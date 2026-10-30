/**
 * @file services.js
 * @brief Appels inter-services (Users, Notifications) ; dégradation gracieuse en cas de panne.
 */
import { env } from '../config/env.js';

/**
 * @brief Récupère les IDs suivis (service Users) pour construire le flux (Fx5).
 * @param userId Utilisateur dont on veut les abonnements.
 * @returns Tableau d'IDs suivis (vide en cas d'échec).
 */
export async function getFollowingIds(userId) {
  try {
    const res = await fetch(`${env.usersUrl}/api/users/internal/${userId}/following-ids`, {
      headers: { 'x-internal-key': env.internalKey },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.ids || [];
  } catch (err) {
    console.warn(`[posts] Échec récupération following-ids : ${err.message}`);
    return [];
  }
}

/**
 * @brief Extrait les @mentions d'un contenu et résout les usernames en IDs utilisateurs.
 * Exclut l'auteur pour éviter l'auto-notification.
 * @param content Texte du post / commentaire / reply.
 * @param authorId ID de l'auteur (exclu des résultats).
 * @returns Tableau d'IDs uniques des utilisateurs mentionnés.
 */
export async function getMentionedUserIds(content, authorId) {
  const usernames = [...new Set((content.match(/@(\w{3,30})/g) || []).map((m) => m.slice(1).toLowerCase()))];
  if (!usernames.length) return [];
  try {
    const url = `${env.usersUrl}/api/users/internal/batch-by-usernames?usernames=${encodeURIComponent(usernames.join(','))}`;
    const res = await fetch(url, { headers: { 'x-internal-key': env.internalKey } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data?.users || []).map((u) => u.id).filter((id) => id !== authorId);
  } catch (err) {
    console.warn(`[posts] Résolution @mentions échouée : ${err.message}`);
    return [];
  }
}

/**
 * @brief Émet une notification (service Notifications) sans bloquer l'action principale.
 * @param params `{ userId, type, actor, payload }` ; ignore l'auto-notification.
 * @returns Résout toujours (les erreurs sont journalisées, non propagées).
 */
export async function emitNotification({ userId, type, actor, payload }) {
  if (!userId || userId === actor?.id) return; // pas d'auto-notification
  try {
    await fetch(`${env.notifUrl}/api/notifications/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': env.internalKey },
      body: JSON.stringify({ userId, type, actor, payload }),
    });
  } catch (err) {
    console.warn(`[posts] Notification non émise (${type}): ${err.message}`);
  }
}
