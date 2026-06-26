/**
 * @file stories.controller.js
 * @brief Stories éphémères : rail (regroupé par auteur), lecteur, publication.
 */
import { Story } from '../models/story.model.js';
import { getFollowingIds } from '../utils/services.js';
import { ok, created } from '../utils/response.js';

const GRADIENTS = [
  'linear-gradient(135deg,#4B87F5,#1E3A5F)',
  'linear-gradient(135deg,#7C3AED,#2563EB)',
  'linear-gradient(135deg,#3E7C5A,#0F3D28)',
  'linear-gradient(135deg,#B45309,#7C2D12)',
  'linear-gradient(135deg,#0F766E,#134E4A)',
  'linear-gradient(135deg,#E5E2D8,#C2BFB2)',
];

/**
 * @brief Regroupe les stories par auteur pour le rail (fonction pure, testable).
 *
 * `seen` : un auteur n'est "vu" que si TOUTES ses stories actives le sont
 * (`viewedBy` contient `userId`). Sa propre story est toujours "vue". Anonyme : non vu.
 * @param stories Stories actives, triées du plus récent au plus ancien.
 * @param userId  Utilisateur courant (ou null/undefined si anonyme).
 * @returns Une entrée par auteur (max 30).
 */
export function groupStories(stories, userId) {
  const byAuthor = new Map();
  for (const s of stories) {
    if (!byAuthor.has(s.authorId)) {
      byAuthor.set(s.authorId, {
        authorId: s.authorId,
        authorUsername: s.authorUsername,
        gradient: s.gradient,
        count: 0,
        seen: Boolean(userId), // authentifié : vu par défaut, invalidé par une story non vue
      });
    }
    const g = byAuthor.get(s.authorId);
    g.count += 1;
    if (userId && s.authorId !== userId && !(s.viewedBy || []).includes(userId)) {
      g.seen = false;
    }
  }
  return [...byAuthor.values()].slice(0, 30);
}

/**
 * @brief Rail de stories : une entrée par auteur SUIVI (+ soi-même) ayant une story active.
 * @param req Requête Express (auth optionnelle).
 * @param res Réponse Express ; renvoie `{ stories }` (max 30 auteurs).
 */
export async function listStories(req, res) {
  const filter = { expiresAt: { $gt: new Date() } };
  // #11b : abonnés uniquement — on ne montre que les auteurs suivis (+ soi-même).
  if (req.user) {
    const following = await getFollowingIds(req.user.id);
    filter.authorId = { $in: [req.user.id, ...following] };
  }
  const stories = await Story.find(filter).sort({ createdAt: -1 });
  return ok(res, { stories: groupStories(stories, req.user?.id) });
}

/**
 * @brief Marque toutes les stories actives d'un auteur comme vues par l'utilisateur courant (#11a).
 * @param req Requête Express authentifiée ; param `authorId`.
 * @param res Réponse Express ; renvoie `{ viewed: true }`.
 */
export async function markStoriesViewed(req, res) {
  await Story.updateMany(
    { authorId: req.params.authorId, expiresAt: { $gt: new Date() } },
    { $addToSet: { viewedBy: req.user.id } },
  );
  return ok(res, { viewed: true });
}

/**
 * @brief Stories actives d'un auteur, pour le lecteur plein écran.
 * @param req Requête Express ; param `authorId`.
 * @param res Réponse Express ; renvoie `{ stories }` triées chronologiquement.
 */
export async function getUserStories(req, res) {
  const stories = await Story.find({
    authorId: req.params.authorId,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: 1 });
  return ok(res, { stories });
}

/**
 * @brief Publie une story (expire automatiquement après 24 h).
 * @param req Requête Express authentifiée ; body `{ gradient?, text?, mediaUrl? }`.
 * @param res Réponse Express ; renvoie `{ story }` (201).
 */
export async function createStory(req, res) {
  const gradient = req.body.gradient || GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
  const story = await Story.create({
    authorId: req.user.id,
    authorUsername: req.user.username,
    gradient,
    text: req.body.text || '',
    mediaUrl: req.body.mediaUrl || null,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  return created(res, { story });
}
