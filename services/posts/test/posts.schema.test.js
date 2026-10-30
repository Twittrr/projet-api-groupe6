/**
 * @file posts.schema.test.js
 * @brief Tests unitaires des schémas Zod du service Posts.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPostSchema, createCommentSchema } from '../src/validators/posts.schema.js';

test('createPostSchema : post valide accepté', () => {
  const r = createPostSchema.safeParse({ content: 'Hello Breezy 🌬️', tags: ['tech'] });
  assert.equal(r.success, true);
});

test('createPostSchema : contenu vide rejeté', () => {
  assert.equal(createPostSchema.safeParse({ content: '' }).success, false);
});

test('createPostSchema : au-delà de 280 caractères rejeté', () => {
  assert.equal(createPostSchema.safeParse({ content: 'a'.repeat(281) }).success, false);
});

test('createPostSchema : média avec upload local accepté', () => {
  const r = createPostSchema.safeParse({
    content: 'photo',
    media: [{ url: '/uploads/photo-123.jpg', type: 'image' }],
  });
  assert.equal(r.success, true);
});

test('createPostSchema : média avec URL externe rejeté (anti-injection)', () => {
  const r = createPostSchema.safeParse({
    content: 'photo',
    media: [{ url: 'https://evil.example.com/x.jpg', type: 'image' }],
  });
  assert.equal(r.success, false);
});

test('createCommentSchema : commentaire valide accepté', () => {
  assert.equal(createCommentSchema.safeParse({ content: 'bien vu' }).success, true);
  assert.equal(createCommentSchema.safeParse({ content: '' }).success, false);
});
