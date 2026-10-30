/**
 * @file database.js
 * @brief Connexion MongoDB (Mongoose) avec stratégie de reconnexion au démarrage.
 */
import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * @brief Connexion à MongoDB avec retries (la base peut démarrer après le service).
 * @param retries Nombre maximal de tentatives.
 * @param delayMs Délai entre tentatives (ms).
 * @throws La dernière erreur si toutes les tentatives échouent.
 */
export async function connectWithRetry(retries = 10, delayMs = 3000) {
  mongoose.set('strictQuery', true);
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log('[posts] Connecté à MongoDB');
      return;
    } catch (err) {
      console.warn(`[posts] MongoDB indisponible (tentative ${attempt}/${retries}): ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
