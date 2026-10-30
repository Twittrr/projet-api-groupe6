#!/usr/bin/env node
/**
 * @file prepare-tokens.mjs
 * @brief Prépare le test de charge : connexion des comptes de démonstration et
 *        récupération d'un post réel, puis écrit perf/tokens.json pour k6.
 *
 * Variables d'environnement :
 *   BASE_URL             URL du gateway (défaut http://localhost:8081)
 *   SEED_USER_PASSWORD   mot de passe des comptes seedés (obligatoire)
 *   PERF_ACCOUNTS        comptes séparés par des virgules (défaut : comptes vedettes)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8081';
const PASSWORD = process.env.SEED_USER_PASSWORD;
const ACCOUNTS = (process.env.PERF_ACCOUNTS || 'ada,margaux,jules,ines,sami')
  .split(',').map((s) => s.trim()).filter(Boolean);

if (!PASSWORD) {
  console.error('[prepare] SEED_USER_PASSWORD manquant.');
  process.exit(1);
}

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'tokens.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** @brief Attend que la stack réponde (les services démarrent en parallèle). */
async function waitForStack(attempts = 30) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/posts/explore`);
      if (res.ok) return;
    } catch { /* stack pas encore prête */ }
    console.log(`[prepare] stack pas prête (${i}/${attempts})…`);
    await sleep(3000);
  }
  throw new Error('stack injoignable');
}

/** @brief Connexion d'un compte seedé ; renvoie le jeton d'accès et l'id. */
async function login(username) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: username, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`login ${username} → HTTP ${res.status}`);
  const json = await res.json();
  return { username, id: json.data.user.id, token: json.data.accessToken };
}

async function main() {
  await waitForStack();

  const users = [];
  for (const username of ACCOUNTS) {
    try {
      users.push(await login(username));
      console.log(`[prepare] connecté : @${username}`);
    } catch (err) {
      // Un compte de démonstration peut être suspendu (le seeder en suspend ~1 %) :
      // on continue avec les autres plutôt que de faire échouer le run.
      console.warn(`[prepare] ignoré : ${err.message}`);
    }
  }
  if (!users.length) throw new Error('aucun compte de démonstration utilisable');

  const explore = await fetch(`${BASE_URL}/api/posts/explore`).then((r) => r.json());
  const postId = explore.data.posts[0].id;

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ baseUrl: BASE_URL, postId, users }, null, 2));
  console.log(`[prepare] ${users.length} jetons écrits dans ${OUT}`);
}

main().catch((err) => {
  console.error('[prepare] échec :', err.message);
  process.exit(1);
});
