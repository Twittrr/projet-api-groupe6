/**
 * @file health.test.js
 * @brief Smoke test : l'app démarre et /api/users/health répond 200 (sans DB).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

test('GET /api/users/health → 200 { status: ok }', async () => {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/users/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.status, 'ok');
    assert.equal(body.data.service, 'users');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
