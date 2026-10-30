/**
 * @file auth.controller.js
 * @brief Logique d'authentification : inscription, connexion, refresh (avec blacklist), déconnexion, profil.
 */
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { User, publicUser } from '../models/user.model.js';
import { RefreshToken } from '../models/refreshToken.model.js';
import { signAccessToken, signRefreshToken, verifyRefresh } from '../utils/jwt.js';
import { ok, created, AppError } from '../utils/response.js';
import { env } from '../config/env.js';

const BCRYPT_ROUNDS = 12;
const REFRESH_COOKIE = 'breezy_refresh';

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

/**
 * @brief Fx1 — Crée un compte et ouvre la session.
 */
export async function register(req, res) {
  const { username, email, password } = req.body;
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ username, email, passwordHash, role: 'user' });

  const accessToken = signAccessToken(user);
  const { token: refreshToken, jti, expiresAt } = signRefreshToken(user);
  await RefreshToken.create({ jti, userId: user.id, expiresAt });
  setRefreshCookie(res, refreshToken);
  return created(res, { user: publicUser(user), accessToken });
}

/**
 * @brief Fx2 — Authentifie un utilisateur (username ou email + mot de passe).
 */
export async function login(req, res) {
  const { identifier, password } = req.body;
  const user = await User.findOne({
    where: { [Op.or]: [{ username: identifier }, { email: identifier }] },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Identifiant ou mot de passe incorrect.');
  }
  if (user.status === 'banned') {
    throw new AppError(403, 'ACCOUNT_BANNED', 'Ce compte a été banni.');
  }
  if (user.status === 'suspended') {
    throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Ce compte est temporairement suspendu.');
  }

  const accessToken = signAccessToken(user);
  const { token: refreshToken, jti, expiresAt } = signRefreshToken(user);
  await RefreshToken.create({ jti, userId: user.id, expiresAt });
  setRefreshCookie(res, refreshToken);
  return ok(res, { user: publicUser(user), accessToken });
}

/**
 * @brief Renouvelle l'access token avec rotation et vérification de blacklist.
 * Si le jti est révoqué ou inconnu, la session est invalide (replay attack détecté).
 */
export async function refresh(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw new AppError(401, 'NO_REFRESH', 'Aucun jeton de rafraîchissement.');

  let payload;
  try {
    payload = verifyRefresh(token);
  } catch {
    throw new AppError(401, 'INVALID_REFRESH', 'Jeton de rafraîchissement invalide ou expiré.');
  }

  // Vérification de la blacklist
  const stored = await RefreshToken.findOne({ where: { jti: payload.jti } });
  if (!stored || stored.revoked) {
    // Token inconnu ou révoqué : révoquer tous les tokens de cet utilisateur par précaution
    if (stored?.userId) {
      await RefreshToken.update({ revoked: true }, { where: { userId: stored.userId } });
    }
    throw new AppError(401, 'INVALID_REFRESH', 'Jeton révoqué. Veuillez vous reconnecter.');
  }

  const user = await User.findByPk(payload.sub);
  if (!user || user.status === 'banned') {
    await stored.update({ revoked: true });
    throw new AppError(401, 'INVALID_REFRESH', 'Compte introuvable ou désactivé.');
  }
  if (user.status === 'suspended') {
    throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Ce compte est temporairement suspendu.');
  }

  // Rotation : révocation de l'ancien token, émission du nouveau
  await stored.update({ revoked: true });
  const accessToken = signAccessToken(user);
  const { token: newRefreshToken, jti: newJti, expiresAt } = signRefreshToken(user);
  await RefreshToken.create({ jti: newJti, userId: user.id, expiresAt });
  setRefreshCookie(res, newRefreshToken);
  return ok(res, { user: publicUser(user), accessToken });
}

/**
 * @brief Déconnecte l'utilisateur en révoquant le refresh token courant.
 */
export async function logout(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    try {
      const payload = verifyRefresh(token);
      await RefreshToken.update({ revoked: true }, { where: { jti: payload.jti } });
    } catch { /* token déjà invalide ou expiré — pas d'erreur à remonter */ }
  }
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  return ok(res, { loggedOut: true });
}

/**
 * @brief Retourne le profil de la session courante.
 */
export async function me(req, res) {
  const user = await User.findByPk(req.user.id);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable.');
  return ok(res, { user: publicUser(user) });
}

/**
 * @brief Fx1 (admin) — Crée un compte avec un rôle imposé.
 */
export async function adminCreateUser(req, res) {
  const { username, email, password, role } = req.body;
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ username, email, passwordHash, role });
  return created(res, { user: publicUser(user) });
}
