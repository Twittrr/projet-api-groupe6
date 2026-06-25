/**
 * @file jwt.test.js
 * @brief Tests unitaires de la génération/vérification des jetons JWT (sans DB).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  signAccessToken,
  verifyAccess,
  signRefreshToken,
  verifyRefresh,
} from '../src/utils/jwt.js';

const user = { id: 'u-123', username: 'ada', role: 'admin' };

test('access token : round-trip sign → verify conserve les claims', () => {
  const token = signAccessToken(user);
  const payload = verifyAccess(token);
  assert.equal(payload.sub, user.id);
  assert.equal(payload.username, user.username);
  assert.equal(payload.role, user.role);
  assert.equal(payload.iss, 'breezy-auth');
});

test('access token : un jeton falsifié est rejeté', () => {
  const token = signAccessToken(user);
  const tampered = token.slice(0, -2) + (token.endsWith('a') ? 'bb' : 'aa');
  assert.throws(() => verifyAccess(tampered));
});

test('refresh token : retourne token + jti + expiresAt et se vérifie', () => {
  const { token, jti, expiresAt } = signRefreshToken(user);
  assert.ok(typeof token === 'string' && token.length > 0);
  assert.ok(typeof jti === 'string' && jti.length > 0);
  assert.ok(expiresAt instanceof Date);

  const payload = verifyRefresh(token);
  assert.equal(payload.sub, user.id);
  assert.equal(payload.type, 'refresh');
  assert.equal(payload.jti, jti);
});

test('refresh token : un access token n’est pas accepté comme refresh', () => {
  const access = signAccessToken(user);
  assert.throws(() => verifyRefresh(access));
});
