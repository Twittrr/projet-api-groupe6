/**
 * @file database.js
 * @brief Connexion PostgreSQL (Sequelize) du service Users, avec reconnexion au démarrage.
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
});

export async function connectWithRetry(retries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sequelize.authenticate();
      return;
    } catch (err) {
      console.warn(`[users] PostgreSQL indisponible (tentative ${attempt}/${retries}): ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
