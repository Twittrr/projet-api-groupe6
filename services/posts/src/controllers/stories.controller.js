/**
 * @file stories.controller.js
 * @brief Stories éphémères : rail (regroupé par auteur), lecteur, publication.
 */
import { Story } from '../models/story.model.js';
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
 * @brief Rail de stories : une entrée par auteur ayant une story active (≤ 24 h).
 * @param req Requête Express (auth optionnelle).
 * @param res Réponse Express ; renvoie `{ stories }` (max 30 auteurs).
 */
export async function listStories(req, res) {
  const stories = await Story.find({ expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });

  // Regroupement par auteur (la plus récente définit le dégradé du cercle)
  const byAuthor = new Map();
  for (const s of stories) {
    if (!byAuthor.has(s.authorId)) {
      byAuthor.set(s.authorId, {
        authorId: s.authorId,
        authorUsername: s.authorUsername,
        gradient: s.gradient,
        count: 0,
        seen: req.user ? s.authorId === req.user.id : false,
      });
    }
    byAuthor.get(s.authorId).count += 1;
  }
  return ok(res, { stories: [...byAuthor.values()].slice(0, 30) });
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
