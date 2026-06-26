/**
 * @file index.js
 * @brief Point d'entrée du service Auth : connexion DB, synchronisation, seed admin, écoute.
 */
import { createApp } from './app.js';
import { Op } from 'sequelize';
import { sequelize, connectWithRetry } from './config/database.js';
import { env } from './config/env.js';
import { User } from './models/user.model.js';
import { RefreshToken } from './models/refreshToken.model.js';
import { seedAdmin } from './seed.js';

// Associations explicites (§7.5) : un utilisateur possède plusieurs refresh tokens.
User.hasMany(RefreshToken, { foreignKey: 'userId' });
RefreshToken.belongsTo(User, { foreignKey: 'userId' });

/**
 * @brief Purge périodique des refresh tokens expirés (limite la croissance de table).
 * Les tokens révoqués mais non encore expirés sont conservés pour la détection de rejeu.
 */
function startTokenPurge() {
  const purge = async () => {
    try {
      const n = await RefreshToken.destroy({ where: { expiresAt: { [Op.lt]: new Date() } } });
      if (n) console.log(`[auth] Purge de ${n} refresh token(s) expiré(s)`);
    } catch (e) {
      console.error('[auth] Échec de la purge des tokens :', e.message);
    }
  };
  purge();
  setInterval(purge, 60 * 60 * 1000).unref(); // toutes les heures
}

/**
 * @brief Applique les migrations de colonnes manquantes de façon idempotente.
 * `ADD COLUMN IF NOT EXISTS` ne fait rien si la colonne existe déjà.
 */
async function migrate() {
  await sequelize.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'fr'`);
  await sequelize.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS theme VARCHAR(10) NOT NULL DEFAULT 'light'`);
  // Identité fédérée (Google) : fournisseur + identifiant externe ; le mot de passe devient optionnel.
  await sequelize.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS provider VARCHAR(10) NOT NULL DEFAULT 'local'`);
  await sequelize.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS "googleId" VARCHAR(255)`);
  await sequelize.query(`ALTER TABLE IF EXISTS users ALTER COLUMN "passwordHash" DROP NOT NULL`);
  await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_uniq ON users ("googleId") WHERE "googleId" IS NOT NULL`);
  // Réinitialisation de mot de passe (cf. utils/resetToken.js).
  await sequelize.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS "resetTokenHash" VARCHAR(64)`);
  await sequelize.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS "resetTokenExpires" TIMESTAMP WITH TIME ZONE`);
}

/** @brief Démarre le service (connexion PostgreSQL, sync du schéma, compte admin, écoute HTTP). */
async function bootstrap() {
  await connectWithRetry();
  await migrate();
  await sequelize.sync(); // crée les tables manquantes ; migrate() gère les colonnes ajoutées
  await seedAdmin();
  startTokenPurge();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`[auth] Service Auth démarré sur le port ${env.port} (${env.nodeEnv})`);
  });
}

try {
  await bootstrap();
} catch (err) {
  console.error('[auth] Échec du démarrage :', err);
  process.exit(1);
}
