/**
 * @file cookies.js
 * @brief Options du cookie de refresh — extrait ici pour la clarté et la testabilité.
 *
 * Le `path` est volontairement `/api` (et non `/api/auth`) : le frontend appelle
 * les routes versionnées `/api/v1/auth/refresh`. Avec un path `/api/auth`, le
 * navigateur n'enverrait PAS le cookie sur `/api/v1/...`, donc le refresh
 * silencieux échouerait au rechargement et l'utilisateur serait déconnecté.
 * `/api` est un préfixe commun à `/api/auth/*` ET `/api/v1/auth/*`.
 */
export const REFRESH_COOKIE = 'breezy_refresh';
export const REFRESH_COOKIE_PATH = '/api';
export const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 jours (aligné sur refreshTtl)

/**
 * @brief Construit les options du cookie de refresh (res.cookie / res.clearCookie).
 * @param isProd `true` en production → cookie `Secure` (HTTPS uniquement).
 */
export function refreshCookieOptions(isProd) {
  return {
    httpOnly: true,
    secure: Boolean(isProd),
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_COOKIE_MAX_AGE,
  };
}
