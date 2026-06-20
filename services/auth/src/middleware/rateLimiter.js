/**
 * @file rateLimiter.js
 * @brief Limiteurs de débit : strict sur l'authentification, global ailleurs.
 */
import rateLimit from 'express-rate-limit';

/**
 * @brief Limiteur strict (login/register) : protège du brute-force et de l'énumération de comptes.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20, // 20 tentatives / IP / fenêtre
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
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
