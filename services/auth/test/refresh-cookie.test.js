/**
 * @file refresh-cookie.test.js
 * @brief Tests des options du cookie de refresh.
 *
 * Régression : un path `/api/auth` empêchait l'envoi du cookie sur les routes
 * versionnées `/api/v1/auth/refresh` → déconnexion au rechargement. Le path
 * doit être un préfixe commun aux deux familles de routes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refreshCookieOptions, REFRESH_COOKIE_PATH } from '../src/utils/cookies.js';

test('le path du cookie couvre /api/auth ET /api/v1/auth', () => {
  assert.equal(REFRESH_COOKIE_PATH, '/api');
  assert.ok('/api/auth/refresh'.startsWith(REFRESH_COOKIE_PATH));
  assert.ok('/api/v1/auth/refresh'.startsWith(REFRESH_COOKIE_PATH));
});

test('cookie httpOnly, sameSite=lax, 7 jours', () => {
  const opts = refreshCookieOptions(true);
  assert.equal(opts.httpOnly, true);
  assert.equal(opts.sameSite, 'lax');
  assert.equal(opts.maxAge, 7 * 24 * 60 * 60 * 1000);
  assert.equal(opts.path, '/api');
});

test('Secure activé en prod, désactivé hors prod', () => {
  assert.equal(refreshCookieOptions(true).secure, true);
  assert.equal(refreshCookieOptions(false).secure, false);
});
