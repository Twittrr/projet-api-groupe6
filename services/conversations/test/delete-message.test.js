/**
 * @file delete-message.test.js
 * @brief Règle d'autorisation de suppression : seul l'auteur peut supprimer son message.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canDeleteMessage } from '../src/controllers/conversations.controller.js';

test("l'auteur peut supprimer son message", () => {
  assert.equal(canDeleteMessage({ authorId: 'u1' }, 'u1'), true);
});

test('un autre participant ne peut pas supprimer le message', () => {
  assert.equal(canDeleteMessage({ authorId: 'u1' }, 'u2'), false);
});

test('message absent → suppression refusée', () => {
  assert.equal(canDeleteMessage(null, 'u1'), false);
});
