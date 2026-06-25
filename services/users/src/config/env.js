/**
 * @file env.js
 * @brief Configuration centralisée du service Users (variables d'environnement).
 */
export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4002),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:8080')
    .split(',').map((o) => o.trim()).filter(Boolean),
  jwt: { accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret' },
  internalKey: process.env.INTERNAL_API_KEY || 'dev_internal_key',
  notifUrl: `http://notifications:${process.env.NOTIF_PORT || 4004}`,
  db: {
    host: process.env.POSTGRES_HOST || 'postgres',
    port: Number(process.env.POSTGRES_PORT || 5432),
    name: process.env.POSTGRES_DB || 'breezy',
    user: process.env.POSTGRES_USER || 'breezy',
    password: process.env.POSTGRES_PASSWORD || 'breezy',
    // TLS requis par les bases managées (ex. Azure Database for PostgreSQL).
    ssl: process.env.POSTGRES_SSL === 'true',
  },
  isProd: (process.env.NODE_ENV || 'development') === 'production',
};
