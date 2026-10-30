/**
 * @file reports.controller.js
 * @brief Signalements de contenu (Fx20) et leur traitement par la modération (Fx21).
 */
import { Report } from '../models/report.model.js';
import { Post } from '../models/post.model.js';
import { Comment } from '../models/comment.model.js';
import { ok, created, AppError } from '../utils/response.js';

/**
 * @brief Fx20 — Signale un contenu (post/commentaire/utilisateur) avec aperçu dénormalisé.
 * @param req Requête Express authentifiée ; body `{ targetType, targetId, reason }`.
 * @param res Réponse Express ; renvoie `{ report }` (201).
 */
export async function createReport(req, res) {
  const { targetType, targetId, reason } = req.body;

  // Construire un aperçu dénormalisé pour faciliter la modération
  let snapshot = {};
  if (targetType === 'post') {
    const p = await Post.findById(targetId).catch(() => null);
    if (p) snapshot = { authorUsername: p.authorUsername, content: p.content };
  } else if (targetType === 'comment') {
    const c = await Comment.findById(targetId).catch(() => null);
    if (c) snapshot = { authorUsername: c.authorUsername, content: c.content };
  }

  const report = await Report.create({
    targetType,
    targetId,
    reason,
    reporterId: req.user.id,
    reporterUsername: req.user.username,
    snapshot,
  });
  return created(res, { report });
}

/**
 * @brief Fx21 — Liste les signalements selon leur statut (par défaut « open »).
 * @param req Requête Express (modérateur/admin) ; query `status`.
 * @param res Réponse Express ; renvoie `{ reports }`.
 */
export async function listReports(req, res) {
  const status = req.query.status || 'open';
  const reports = await Report.find({ status }).sort({ createdAt: -1 }).limit(100);
  return ok(res, { reports });
}

/**
 * @brief Fx21 — Traite un signalement (marque « reviewed » ou « dismissed »).
 * @param req Requête Express (modérateur/admin) ; param `id`, body `{ status }`.
 * @param res Réponse Express ; renvoie `{ report }`.
 * @throws AppError 404 si le signalement est introuvable.
 */
export async function resolveReport(req, res) {
  const report = await Report.findById(req.params.id);
  if (!report) throw new AppError(404, 'NOT_FOUND', 'Signalement introuvable.');
  report.status = req.body.status;
  await report.save();
  return ok(res, { report });
}
