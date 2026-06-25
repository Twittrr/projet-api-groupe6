/**
 * @file index.js
 * @brief Service Conversations : app Express, middlewares, routes et démarrage.
 */
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import conversationsRouter from './routes/conversations.routes.js';

const fail = (res, status, code, message) =>
  res.status(status).json({ data: null, error: { code, message }, meta: null });

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '64kb' }));
  app.use(rateLimit({ windowMs: 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));

  app.get(['/api/conversations/health', '/api/v1/conversations/health'], (_req, res) =>
    res.json({ data: { status: 'ok', service: 'conversations' }, error: null })
  );

  // Routes versionnées (/api/v1) + alias non versionné conservé pour rétro-compatibilité.
  app.use(['/api/conversations', '/api/v1/conversations'], conversationsRouter);

  app.use((req, res) => fail(res, 404, 'NOT_FOUND', `Route introuvable : ${req.method} ${req.originalUrl}`));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.name === 'CastError')      return fail(res, 400, 'BAD_ID', 'Identifiant invalide.');
    if (err.name === 'ValidationError') return fail(res, 422, 'VALIDATION_ERROR', err.message);
    console.error('[conversations] Erreur :', err);
    return fail(res, 500, 'INTERNAL_ERROR', 'Une erreur interne est survenue.');
  });

  return app;
}

async function connectWithRetry(retries = 10, delayMs = 3000) {
  mongoose.set('strictQuery', true);
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
      return;
    } catch (err) {
      console.warn(`[conversations] MongoDB indisponible (${attempt}/${retries}): ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

// Démarrage uniquement quand le fichier est exécuté directement (pas à l'import, ex. tests).
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  try {
    await connectWithRetry();
    createApp().listen(env.port, () => console.log(`[conversations] démarré sur le port ${env.port}`));
  } catch (err) {
    console.error('[conversations] Échec du démarrage :', err);
    process.exit(1);
  }
}
