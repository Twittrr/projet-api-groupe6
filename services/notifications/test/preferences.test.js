/**
 * @file preferences.test.js
 * @brief Filtrage des notifications à l'émission selon les préférences (logique pure, sans DB).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prefAllows, NOTIF_TYPES } from '../src/model.js';

test('sans préférences, tous les types sont autorisés (défaut)', () => {
  for (const type of NOTIF_TYPES) {
    assert.equal(prefAllows(null, type), true);
    assert.equal(prefAllows(undefined, type), true);
  }
});

test('un type à false est refusé, les autres restent autorisés', () => {
  const pref = { like: false, comment: true };
  assert.equal(prefAllows(pref, 'like'), false);
  assert.equal(prefAllows(pref, 'comment'), true);
  // type absent du document => autorisé par défaut
  assert.equal(prefAllows(pref, 'follow'), true);
});

test('un type explicitement à true est autorisé', () => {
  assert.equal(prefAllows({ message: true }, 'message'), true);
});
