/**
 * @file index.js
 * @brief Point d'entrée du service Posts : connexion MongoDB puis écoute HTTP.
 */
import { createApp } from './app.js';
import { connectWithRetry } from './config/database.js';
import { env } from './config/env.js';

/** @brief Démarre le service (connexion MongoDB, écoute HTTP). */
async function bootstrap() {
  await connectWithRetry();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`[posts] Service Posts démarré sur le port ${env.port} (${env.nodeEnv})`);
  });
}

try {
  await bootstrap();
} catch (err) {
  console.error('[posts] Échec du démarrage :', err);
  process.exit(1);
}
