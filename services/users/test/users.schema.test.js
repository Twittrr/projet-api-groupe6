/**
 * @file users.schema.test.js
 * @brief Tests unitaires des schémas Zod du service Users.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  updateProfileSchema,
  moderateStatusSchema,
} from '../src/validators/users.schema.js';

test('updateProfileSchema : profil valide accepté', () => {
  const r = updateProfileSchema.safeParse({ displayName: 'Ada', bio: 'Pionnière' });
  assert.equal(r.success, true);
});

test('updateProfileSchema : avatarUrl null accepté', () => {
  assert.equal(updateProfileSchema.safeParse({ avatarUrl: null }).success, true);
});

test('updateProfileSchema : bio au-delà de 160 caractères rejetée', () => {
  assert.equal(updateProfileSchema.safeParse({ bio: 'x'.repeat(161) }).success, false);
});

test('updateProfileSchema : avatarUrl non-URL rejetée', () => {
  assert.equal(updateProfileSchema.safeParse({ avatarUrl: 'pas-une-url' }).success, false);
});

test('moderateStatusSchema : statut hors enum rejeté', () => {
  assert.equal(moderateStatusSchema.safeParse({ status: 'active' }).success, true);
  assert.equal(moderateStatusSchema.safeParse({ status: 'deleted' }).success, false);
});
