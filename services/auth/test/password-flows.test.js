/**
 * @file password-flows.test.js
 * @brief Tests des schémas et du jeton de réinitialisation (changement + mot de passe oublié).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../src/validators/auth.schema.js';
import {
  generateResetToken,
  hashResetToken,
  RESET_TOKEN_TTL_MS,
} from '../src/utils/resetToken.js';

test('changePasswordSchema : applique la politique au nouveau mot de passe', () => {
  assert.equal(
    changePasswordSchema.safeParse({ currentPassword: 'x', newPassword: 'Secret123' }).success,
    true
  );
  // nouveau sans majuscule → rejeté
  assert.equal(
    changePasswordSchema.safeParse({ currentPassword: 'x', newPassword: 'secret123' }).success,
    false
  );
  // ancien vide → rejeté
  assert.equal(
    changePasswordSchema.safeParse({ currentPassword: '', newPassword: 'Secret123' }).success,
    false
  );
});

test('forgotPasswordSchema : exige un e-mail valide', () => {
  assert.equal(forgotPasswordSchema.safeParse({ email: 'ada@breezy.local' }).success, true);
  assert.equal(forgotPasswordSchema.safeParse({ email: 'pas-un-email' }).success, false);
});

test('resetPasswordSchema : jeton + nouveau mot de passe conforme', () => {
  assert.equal(
    resetPasswordSchema.safeParse({ token: 'a'.repeat(20), newPassword: 'Secret123' }).success,
    true
  );
  // jeton trop court → rejeté
  assert.equal(
    resetPasswordSchema.safeParse({ token: 'abc', newPassword: 'Secret123' }).success,
    false
  );
  // mot de passe trop court → rejeté
  assert.equal(
    resetPasswordSchema.safeParse({ token: 'a'.repeat(20), newPassword: 'Ab1' }).success,
    false
  );
});

test('generateResetToken : hash reproductible et expiration ~1h', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const { token, tokenHash, expiresAt } = generateResetToken(now);
  assert.equal(tokenHash, hashResetToken(token)); // l'empreinte stockée correspond au jeton clair
  assert.notEqual(tokenHash, token); // on ne stocke jamais le jeton en clair
  assert.equal(expiresAt.getTime() - now.getTime(), RESET_TOKEN_TTL_MS);
});

test('generateResetToken : deux jetons sont distincts (entropie)', () => {
  assert.notEqual(generateResetToken().token, generateResetToken().token);
});

test('hashResetToken : un mauvais jeton ne correspond pas', () => {
  const { token, tokenHash } = generateResetToken();
  assert.notEqual(hashResetToken(`${token}x`), tokenHash);
});
