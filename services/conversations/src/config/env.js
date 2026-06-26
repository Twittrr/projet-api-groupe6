/**
 * @file env.js
 * @brief Configuration centralisée du service Conversations (variables d'environnement).
 */
export const env = {
  nodeEnv:     process.env.NODE_ENV || 'development',
  port:        Number(process.env.PORT || 4005),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:8080')
    .split(',').map((o) => o.trim()).filter(Boolean),
  mongoUri:    process.env.MONGO_URI || 'mongodb://mongo:27017/breezy',
  jwt:         { accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret' },
  internalKey: process.env.INTERNAL_API_KEY || 'dev_internal_key',
  usersUrl:         process.env.USERS_URL || `http://users:${process.env.USERS_PORT || 4002}`,
  notificationsUrl: process.env.NOTIFICATIONS_URL || `http://notifications:${process.env.NOTIF_PORT || 4004}`,
  isProd:      (process.env.NODE_ENV || 'development') === 'production',
};

if (env.isProd && env.jwt.accessSecret === 'dev_access_secret') {
  throw new Error('[conversations] ARRÊT — JWT_ACCESS_SECRET non configuré en production.');
}
