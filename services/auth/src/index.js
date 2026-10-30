/**
 * @file index.js
 * @brief Point d'entrée du service Auth : connexion DB, synchronisation, seed admin, écoute.
 */
import { createApp } from './app.js';
import { sequelize, connectWithRetry } from './config/database.js';
import { env } from './config/env.js';
import './models/user.model.js';
import './models/refreshToken.model.js';
import { seedAdmin } from './seed.js';

/**
 * @brief Applique les migrations de colonnes manquantes de façon idempotente.
 * `ADD COLUMN IF NOT EXISTS` ne fait rien si la colonne existe déjà.
 */
async function migrate() {
  await sequelize.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'fr'`);
  await sequelize.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS theme VARCHAR(10) NOT NULL DEFAULT 'light'`);
}

/** @brief Démarre le service (connexion PostgreSQL, sync du schéma, compte admin, écoute HTTP). */
async function bootstrap() {
  await connectWithRetry();
  await migrate();
  await sequelize.sync(); // crée les tables manquantes ; migrate() gère les colonnes ajoutées
  await seedAdmin();

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
