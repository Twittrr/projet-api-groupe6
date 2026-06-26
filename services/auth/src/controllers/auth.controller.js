/**
 * @file auth.controller.js
 * @brief Logique d'authentification : inscription, connexion, refresh (avec blacklist), déconnexion, profil.
 */
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { OAuth2Client } from 'google-auth-library';
import { User, publicUser } from '../models/user.model.js';
import { RefreshToken } from '../models/refreshToken.model.js';
import { signAccessToken, signRefreshToken, verifyRefresh } from '../utils/jwt.js';
import { ok, created, AppError } from '../utils/response.js';
import { env } from '../config/env.js';
import { REFRESH_COOKIE, REFRESH_COOKIE_PATH, refreshCookieOptions } from '../utils/cookies.js';
import { generateResetToken, hashResetToken } from '../utils/resetToken.js';

const BCRYPT_ROUNDS = 12;

// Client OAuth Google, instancié une seule fois (réutilise le cache de clés publiques).
const googleClient = env.google.clientId ? new OAuth2Client(env.google.clientId) : null;

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions(env.isProd));
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

  // Compte fédéré (Google) sans mot de passe : la connexion par mot de passe n'est pas possible.
  if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
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
 * @brief Génère un nom d'utilisateur unique et valide (^\w{3,30}$) à partir d'une base libre.
 * @param base Chaîne source (pseudo Google ou partie locale de l'e-mail).
 * @returns Un username disponible respectant les contraintes du modèle.
 */
async function uniqueUsername(base) {
  let root = String(base || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (root.length < 3) root = `user${root}`;
  root = root.slice(0, 24); // marge pour un éventuel suffixe numérique
  let candidate = root;
  let i = 0;
  // eslint-disable-next-line no-await-in-loop
  while (await User.findOne({ where: { username: candidate } })) {
    i += 1;
    candidate = `${root}${i}`.slice(0, 30);
  }
  return candidate;
}

/**
 * @brief Connexion / inscription via Google (OpenID Connect, sans mot de passe).
 *
 * Vérifie le jeton d'identité Google côté serveur (audience = GOOGLE_CLIENT_ID), puis :
 *  1. retrouve le compte déjà lié (googleId) ;
 *  2. sinon, rattache un compte existant au même e-mail (vérifié par Google) ;
 *  3. sinon, crée un compte fédéré en réutilisant le pseudo Google.
 * Émet ensuite les jetons de session habituels (access + refresh), comme la connexion classique.
 */
export async function googleAuth(req, res) {
  if (!googleClient) {
    throw new AppError(503, 'GOOGLE_DISABLED', "La connexion Google n'est pas configurée sur ce serveur.");
  }

  const { credential } = req.body;
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.google.clientId });
    payload = ticket.getPayload();
  } catch {
    throw new AppError(401, 'GOOGLE_INVALID', 'Jeton Google invalide ou expiré.');
  }

  if (!payload?.email || payload.email_verified === false) {
    throw new AppError(401, 'GOOGLE_EMAIL_UNVERIFIED', 'Adresse Google absente ou non vérifiée.');
  }

  const googleId = payload.sub;
  const email = payload.email.toLowerCase();
  const displayName = payload.name || payload.given_name || email.split('@')[0];
  const picture = payload.picture || null;

  // 1) Compte Google déjà lié.
  let user = await User.findOne({ where: { googleId } });

  // 2) Rattachement à un compte e-mail existant (Google a déjà vérifié l'adresse).
  if (!user) {
    user = await User.findOne({ where: { email } });
    if (user) {
      user.googleId = googleId;
      if (!user.avatarUrl && picture) user.avatarUrl = picture;
      await user.save();
    }
  }

  // 3) Création d'un nouveau compte fédéré (sans mot de passe).
  if (!user) {
    const username = await uniqueUsername(displayName || email.split('@')[0]);
    user = await User.create({
      username,
      email,
      passwordHash: null,
      provider: 'google',
      googleId,
      displayName,
      avatarUrl: picture,
      role: 'user',
    });
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
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
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
 * @brief Change le mot de passe de la session courante (réglages).
 * Vérifie l'ancien mot de passe, applique la politique du nouveau, puis révoque
 * les autres sessions (refresh tokens des autres appareils) en gardant celle-ci.
 */
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findByPk(req.user.id);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable.');
  if (!user.passwordHash) {
    throw new AppError(400, 'NO_PASSWORD', "Ce compte n'utilise pas de mot de passe (connexion Google).");
  }
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Mot de passe actuel incorrect.');
  }

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await user.save();

  // Révoque les autres sessions ; conserve la session courante (jti du cookie de refresh).
  let currentJti = null;
  try { currentJti = verifyRefresh(req.cookies?.[REFRESH_COOKIE]).jti; } catch { /* pas de session courante valide */ }
  await RefreshToken.update(
    { revoked: true },
    { where: { userId: user.id, revoked: false, ...(currentJti ? { jti: { [Op.ne]: currentJti } } : {}) } }
  );
  return ok(res, { changed: true });
}

/**
 * @brief Demande de réinitialisation de mot de passe.
 * Réponse TOUJOURS générique (n'expose pas l'existence d'un compte). Aucun e-mail
 * n'est envoyé (pas de SMTP configuré) : le lien est journalisé côté serveur, et
 * renvoyé dans la réponse HORS production uniquement, pour faciliter le test.
 */
export async function forgotPassword(req, res) {
  const { email } = req.body;
  const generic = { message: 'Si un compte existe pour cet e-mail, un lien de réinitialisation a été envoyé.' };

  const user = await User.findOne({ where: { email } });
  // Seuls les comptes locaux (avec mot de passe) peuvent réinitialiser.
  if (user && user.passwordHash) {
    const { token, tokenHash, expiresAt } = generateResetToken();
    user.resetTokenHash = tokenHash;
    user.resetTokenExpires = expiresAt;
    await user.save();
    const link = `${env.appUrl}/reset?token=${token}`;
    console.log(`[auth] Lien de réinitialisation pour ${email} : ${link}`);
    if (!env.isProd) return ok(res, { ...generic, resetToken: token, resetLink: link });
  }
  return ok(res, generic);
}

/**
 * @brief Réinitialise le mot de passe via un jeton valide et non expiré.
 * Invalide le jeton (usage unique) et révoque toutes les sessions par sécurité.
 */
export async function resetPassword(req, res) {
  const { token, newPassword } = req.body;
  const user = await User.findOne({
    where: { resetTokenHash: hashResetToken(token), resetTokenExpires: { [Op.gt]: new Date() } },
  });
  if (!user) throw new AppError(400, 'INVALID_RESET', 'Jeton de réinitialisation invalide ou expiré.');

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.resetTokenHash = null;
  user.resetTokenExpires = null;
  await user.save();
  await RefreshToken.update({ revoked: true }, { where: { userId: user.id, revoked: false } });
  return ok(res, { reset: true });
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
