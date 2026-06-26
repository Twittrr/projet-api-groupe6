/**
 * @file app.js
 * @brief Construction de l'application Express du service Users.
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { globalLimiter, notFound, errorHandler } from './middleware/common.js';
import usersRoutes from './routes/users.routes.js';

/**
 * @brief Crée et configure l'application Express (Helmet, CORS, JSON, rate-limit, routes).
 * @returns Application Express prête à écouter.
 */
export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '64kb' }));
  app.use(globalLimiter);

  // Routes versionnées (/api/v1) + alias non versionné conservé pour rétro-compatibilité.
  app.use(['/api/users', '/api/v1/users'], usersRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
