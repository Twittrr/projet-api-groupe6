/**
 * @file rateLimiter.js
 * @brief Limiteurs de débit : strict sur l'authentification, global ailleurs.
 */
import rateLimit from 'express-rate-limit';

const isProd = process.env.NODE_ENV === 'production';

/**
 * @brief Limiteur strict (login/register/refresh) : protège du brute-force.
 * En développement les seuils sont volontairement relâchés pour ne pas bloquer
 * les montages multiples (bootstrap, HMR, tests répétés).
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,          // fenêtre 15 min
  max: isProd ? 30 : 300,             // prod : 30 ; dev : 300
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    data: null,
    error: { code: 'RATE_LIMITED', message: 'Trop de tentatives. Réessayez plus tard.' },
    meta: null,
  },
});

// Limiteur global plus permissif
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 200 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
});
