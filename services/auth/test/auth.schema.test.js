/**
 * @file auth.schema.test.js
 * @brief Tests unitaires des schémas Zod du service Auth.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerSchema, loginSchema } from '../src/validators/auth.schema.js';

test('registerSchema : inscription valide acceptée', () => {
  const r = registerSchema.safeParse({
    username: 'ada_lovelace',
    email: 'ada@breezy.local',
    password: 'Secret123',
  });
  assert.equal(r.success, true);
});

test('registerSchema : mot de passe sans majuscule rejeté', () => {
  const r = registerSchema.safeParse({
    username: 'ada',
    email: 'ada@breezy.local',
    password: 'secret123',
  });
  assert.equal(r.success, false);
});

test('registerSchema : mot de passe trop court rejeté', () => {
  const r = registerSchema.safeParse({
    username: 'ada',
    email: 'ada@breezy.local',
    password: 'Ab1',
  });
  assert.equal(r.success, false);
});

test('registerSchema : email invalide rejeté', () => {
  const r = registerSchema.safeParse({
    username: 'ada',
    email: 'pas-un-email',
    password: 'Secret123',
  });
  assert.equal(r.success, false);
});

test('registerSchema : username trop court rejeté', () => {
  const r = registerSchema.safeParse({
    username: 'ab',
    email: 'ada@breezy.local',
    password: 'Secret123',
  });
  assert.equal(r.success, false);
});

test('loginSchema : identifiant + mot de passe requis', () => {
  assert.equal(loginSchema.safeParse({ identifier: 'ada', password: 'x' }).success, true);
  assert.equal(loginSchema.safeParse({ identifier: '', password: '' }).success, false);
});
