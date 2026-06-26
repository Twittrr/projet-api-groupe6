/**
 * @file app.js
 * @brief Construction de l'application Express du service Posts (médias statiques inclus).
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'node:path';
import { env } from './config/env.js';
import { globalLimiter, notFound, errorHandler } from './middleware/common.js';
import postsRoutes from './routes/posts.routes.js';

/**
 * @brief Crée et configure l'application Express (sécurité, médias `/uploads`, routes).
 * @returns Application Express prête à écouter.
 */
export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  // crossOriginResourcePolicy assoupli pour servir les médias au frontend
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '256kb' }));
  app.use(globalLimiter);

  // Médias uploadés (servis aussi via le gateway sur /uploads)
  app.use('/uploads', express.static(path.resolve('uploads')));

  // Routes versionnées (/api/v1) + alias non versionné conservé pour rétro-compatibilité.
  app.use(['/api/posts', '/api/v1/posts'], postsRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
