/**
 * @file upload-limit.test.js
 * @brief Limite de taille des images à l'upload (4 Mo) ; la vidéo n'est pas concernée.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imageExceedsLimit } from '../src/controllers/upload.controller.js';

const MB = 1024 * 1024;

test('image de 5 Mo rejetée', () => {
  assert.equal(imageExceedsLimit('image/jpeg', 5 * MB), true);
});

test('image de 4 Mo pile acceptée (limite inclusive)', () => {
  assert.equal(imageExceedsLimit('image/png', 4 * MB), false);
});

test('petite image acceptée', () => {
  assert.equal(imageExceedsLimit('image/webp', 500 * 1024), false);
});

test('vidéo de 8 Mo non soumise à la limite image', () => {
  assert.equal(imageExceedsLimit('video/mp4', 8 * MB), false);
});
