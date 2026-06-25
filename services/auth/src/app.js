/**
 * @file app.js
 * @brief Construction de l'application Express du service Auth (sécurité + routes).
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';

/**
 * @brief Crée et configure l'application Express (Helmet, CORS, JSON, rate-limit, routes).
 * @returns Application Express prête à écouter.
 */
export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // derrière le reverse proxy Nginx (IP réelle pour le rate-limit)
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true, // cookies de refresh
    })
  );
  app.use(express.json({ limit: '64kb' }));
  app.use(cookieParser());
  app.use(globalLimiter);

  // Routes versionnées (/api/v1) + alias non versionné conservé pour rétro-compatibilité.
  app.use(['/api/auth', '/api/v1/auth'], authRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
