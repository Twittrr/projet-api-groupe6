/**
 * @file database.js
 * @brief Connexion PostgreSQL (Sequelize) avec stratégie de reconnexion au démarrage.
 */
import { Sequelize } from 'sequelize';
import { env } from './env.js';

/** Instance Sequelize partagée (pool de connexions PostgreSQL). */
export const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'postgres',
  logging: false,
  pool: { max: 10, min: 0, idle: 10000, acquire: 30000 },
  // SSL activé pour les bases managées (POSTGRES_SSL=true). rejectUnauthorized=false
  // accepte le certificat managé Azure sans avoir à fournir la chaîne de CA.
  dialectOptions: env.db.ssl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
});

/**
 * @brief Tente de se connecter à PostgreSQL avec retries (la base peut démarrer après le service).
 * @param retries Nombre maximal de tentatives.
 * @param delayMs Délai entre tentatives (ms).
 * @throws La dernière erreur si toutes les tentatives échouent.
 */
export async function connectWithRetry(retries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sequelize.authenticate();
      return;
    } catch (err) {
      console.warn(`[auth] PostgreSQL indisponible (tentative ${attempt}/${retries}): ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
