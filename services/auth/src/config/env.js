/**
 * @file env.js
 * @brief Configuration centralisée du service Auth (issue des variables d'environnement).
 */
export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4001),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:8080')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  // URL publique du frontend, pour construire le lien de réinitialisation de mot de passe.
  appUrl: process.env.APP_URL || '',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
  },

  // Connexion fédérée Google (OpenID Connect). Vide => endpoint désactivé (503).
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },

  db: {
    host: process.env.POSTGRES_HOST || 'postgres',
    port: Number(process.env.POSTGRES_PORT || 5432),
    name: process.env.POSTGRES_DB || 'breezy',
    user: process.env.POSTGRES_USER || 'breezy',
    password: process.env.POSTGRES_PASSWORD || 'breezy',
    // TLS requis par les bases managées (ex. Azure Database for PostgreSQL).
    ssl: process.env.POSTGRES_SSL === 'true',
  },

  seedAdmin: {
    username: process.env.SEED_ADMIN_USERNAME || 'admin',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@breezy.local',
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin123!',
  },

  isProd: (process.env.NODE_ENV || 'development') === 'production',
};

// Garde de démarrage : refuse de démarrer en production avec des secrets par défaut.
if (env.isProd) {
  const unsafe = [];
  if (env.jwt.accessSecret === 'dev_access_secret') unsafe.push('JWT_ACCESS_SECRET');
  if (env.jwt.refreshSecret === 'dev_refresh_secret') unsafe.push('JWT_REFRESH_SECRET');
  if (env.db.password === 'breezy') unsafe.push('POSTGRES_PASSWORD');
  if (env.seedAdmin.password === 'Admin123!') unsafe.push('SEED_ADMIN_PASSWORD');
  if (unsafe.length) {
    throw new Error(`[auth] ARRÊT — variables non sécurisées en production : ${unsafe.join(', ')}`);
  }
}
