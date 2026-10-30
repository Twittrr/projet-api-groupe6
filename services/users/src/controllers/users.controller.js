/**
 * @file users.controller.js
 * @brief Profils, graphe social (follows), recherche, suggestions et modération de comptes.
 */
import { Op } from 'sequelize';
import { User, Follow, publicUser } from '../models/index.js';
import { ok, created, AppError } from '../utils/response.js';
import { emitNotification } from '../utils/notify.js';

async function socialCounts(userId, viewerId) {
  const [followers, following, isFollowing] = await Promise.all([
    Follow.count({ where: { followedId: userId } }),
    Follow.count({ where: { followerId: userId } }),
    viewerId ? Follow.count({ where: { followerId: viewerId, followedId: userId } }) : 0,
  ]);
  return { followers, following, isFollowing: isFollowing > 0 };
}

/** @brief Fx10 — Profil public d'un utilisateur (par username). */
export async function getProfile(req, res) {
  const user = await User.findOne({ where: { username: req.params.username } });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable.');
  const counts = await socialCounts(user.id, req.user?.id);
  return ok(res, { user: publicUser(user, counts) });
}

/** @brief Fx10 — Met à jour le profil de l'utilisateur courant. */
export async function updateMe(req, res) {
  const user = await User.findByPk(req.user.id);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable.');
  const { displayName, bio, avatarUrl } = req.body;
  if (displayName !== undefined) user.displayName = displayName;
  if (bio !== undefined) user.bio = bio;
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
  await user.save();
  return ok(res, { user: publicUser(user) });
}

/** @brief Met à jour la langue préférée. */
export async function updateLanguage(req, res) {
  const user = await User.findByPk(req.user.id);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable.');
  user.language = req.body.language;
  await user.save();
  return ok(res, { user: publicUser(user) });
}

/** @brief Met à jour le thème préféré. */
export async function updateTheme(req, res) {
  const user = await User.findByPk(req.user.id);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable.');
  user.theme = req.body.theme;
  await user.save();
  return ok(res, { user: publicUser(user) });
}

/** @brief Fx9 — Suit un utilisateur et émet une notification (Fx16). */
export async function follow(req, res) {
  const targetId = req.params.id;
  if (targetId === req.user.id) throw new AppError(400, 'BAD_REQUEST', 'Vous ne pouvez pas vous suivre vous-même.');
  const target = await User.findByPk(targetId);
  if (!target) throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable.');

  const [, isNew] = await Follow.findOrCreate({
    where: { followerId: req.user.id, followedId: targetId },
  });
  if (isNew) {
    emitNotification({
      userId: targetId,
      type: 'follow',
      actor: { id: req.user.id, username: req.user.username },
      payload: {},
    });
  }
  return created(res, { following: true });
}

/** @brief Fx9 — Cesse de suivre un utilisateur. */
export async function unfollow(req, res) {
  await Follow.destroy({ where: { followerId: req.user.id, followedId: req.params.id } });
  return ok(res, { following: false });
}

/**
 * @brief Liste paginée des abonnés d'un utilisateur.
 * Query params : `page` (défaut 1), `limit` (défaut 50, max 100).
 */
export async function listFollowers(req, res) {
  const page  = Math.max(1, Number.parseInt(req.query.page)  || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit) || 50));
  const offset = (page - 1) * limit;

  const { count, rows } = await Follow.findAndCountAll({
    where: { followedId: req.params.id },
    limit,
    offset,
    order: [['createdAt', 'DESC']],
  });
  const ids = rows.map((r) => r.followerId);
  const users = ids.length
    ? await User.findAll({ where: { id: { [Op.in]: ids } } })
    : [];
  return ok(res, { users: users.map((u) => publicUser(u)) }, {
    page, limit, total: count, pages: Math.ceil(count / limit),
  });
}

/**
 * @brief Liste paginée des abonnements d'un utilisateur.
 * Query params : `page` (défaut 1), `limit` (défaut 50, max 100).
 */
export async function listFollowing(req, res) {
  const page  = Math.max(1, Number.parseInt(req.query.page)  || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit) || 50));
  const offset = (page - 1) * limit;

  const { count, rows } = await Follow.findAndCountAll({
    where: { followerId: req.params.id },
    limit,
    offset,
    order: [['createdAt', 'DESC']],
  });
  const ids = rows.map((r) => r.followedId);
  const users = ids.length
    ? await User.findAll({ where: { id: { [Op.in]: ids } } })
    : [];
  return ok(res, { users: users.map((u) => publicUser(u)) }, {
    page, limit, total: count, pages: Math.ceil(count / limit),
  });
}

/**
 * @brief Résout un lot de usernames en objets publics (appels internes Fx14 — @mentions).
 * Query param : `usernames` (liste séparée par virgules, max 20).
 */
export async function batchByUsernames(req, res) {
  const usernames = (req.query.usernames || '').split(',').map((u) => u.trim().toLowerCase()).filter(Boolean).slice(0, 20);
  if (!usernames.length) return ok(res, { users: [] });
  const users = await User.findAll({ where: { username: { [Op.in]: usernames } } });
  return ok(res, { users: users.map((u) => publicUser(u)) });
}

/** @brief Recherche d'utilisateurs par username ou nom affiché. */
export async function searchUsers(req, res) {
  const q = (req.query.q || '').toString().trim();
  const where = q
    ? { [Op.or]: [{ username: { [Op.iLike]: `%${q}%` } }, { displayName: { [Op.iLike]: `%${q}%` } }] }
    : {};
  const users = await User.findAll({ where, limit: 20, order: [['createdAt', 'DESC']] });
  return ok(res, { users: users.map((u) => publicUser(u)) });
}

/** @brief Suggestions « à suivre » : utilisateurs actifs non encore suivis. */
export async function suggestions(req, res) {
  const followed = await Follow.findAll({ where: { followerId: req.user.id } });
  const excluded = [req.user.id, ...followed.map((f) => f.followedId)];
  const users = await User.findAll({
    where: { id: { [Op.notIn]: excluded }, status: 'active' },
    limit: 5,
    order: [['createdAt', 'DESC']],
  });
  return ok(res, { users: users.map((u) => publicUser(u)) });
}

/** @brief Fx21 — Liste tous les utilisateurs bannis (mod/admin). */
export async function listBanned(req, res) {
  const users = await User.findAll({
    where: { status: 'banned' },
    order: [['updatedAt', 'DESC']],
  });
  return ok(res, { users: users.map((u) => publicUser(u)) });
}

/** @brief Fx21 — Modère un compte (suspend/ban/réactive). Un admin ne peut être modéré. */
export async function moderateStatus(req, res) {
  const { status } = req.body;
  const target = await User.findByPk(req.params.id);
  if (!target) throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable.');
  if (target.role === 'admin') throw new AppError(403, 'FORBIDDEN', 'Impossible de modérer un administrateur.');
  target.status = status;
  await target.save();
  return ok(res, { user: publicUser(target) });
}

// --- Endpoints internes (service-à-service) ---

/** @brief (Interne) IDs des utilisateurs suivis, consommé par le service Posts. */
export async function internalFollowingIds(req, res) {
  const rows = await Follow.findAll({ where: { followerId: req.params.id } });
  return ok(res, { ids: rows.map((r) => r.followedId) });
}

/**
 * @brief (Interne) Résolution par lot d'IDs → profils publics.
 * Consommé par le service Conversations pour résoudre les usernames des participants.
 * Query param : `ids` — liste d'UUIDs séparés par des virgules (max 100).
 */
export async function internalBatchUsers(req, res) {
  const ids = (req.query.ids || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 100);
  if (!ids.length) return ok(res, { users: [] });
  const users = await User.findAll({ where: { id: { [Op.in]: ids } } });
  return ok(res, { users: users.map((u) => publicUser(u)) });
}
