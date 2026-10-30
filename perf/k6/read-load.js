/**
 * @file read-load.js
 * @brief Scénario k6 — lecture seule des données Breezy.
 *
 * Un utilisateur virtuel (VU) = un utilisateur connecté qui enchaîne des lectures
 * avec un temps de réflexion entre deux actions (comme un humain).
 * On mesure donc « combien d'utilisateurs simultanés » la stack encaisse.
 *
 * Variables d'environnement :
 *   BASE_URL    URL du gateway (défaut http://localhost:8081)
 *   VUS         nombre d'utilisateurs simultanés (défaut 10)
 *   DURATION    durée du palier (défaut 45s)
 *   THINK_MIN / THINK_MAX  temps de réflexion entre deux lectures, en secondes
 *   LEVEL       étiquette du palier, utilisée dans le nom du fichier de résultats
 *   RESULT_DIR  dossier de sortie des résultats (défaut perf/results)
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8081';
const VUS = Number(__ENV.VUS || 10);
const DURATION = __ENV.DURATION || '45s';
const THINK_MIN = Number(__ENV.THINK_MIN || 0.5);
const THINK_MAX = Number(__ENV.THINK_MAX || 1.5);

// Jetons préparés par perf/prepare-tokens.mjs (5 comptes de démonstration).
const seed = JSON.parse(open('../tokens.json'));
const users = seed.users;
const samplePostId = seed.postId;

// Latence par endpoint : permet d'identifier la lecture qui sature en premier.
const latence = {
  explore: new Trend('latence_explore', true),
  feed: new Trend('latence_feed', true),
  tendances: new Trend('latence_tendances', true),
  profil: new Trend('latence_profil', true),
  'posts-auteur': new Trend('latence_posts_auteur', true),
  'post-detail': new Trend('latence_post_detail', true),
};

export const options = {
  scenarios: {
    lecteurs: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
      gracefulStop: '10s',
    },
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

/**
 * @brief Tire une lecture selon une répartition réaliste : flux public, fil
 *        d'abonnements, tendances, profil, posts d'un auteur, détail d'un post.
 */
function pickRead(user) {
  const r = Math.random();
  const auth = { Authorization: `Bearer ${user.token}` };

  if (r < 0.35) return { name: 'explore', url: `${BASE_URL}/api/posts/explore` };
  if (r < 0.60) return { name: 'feed', url: `${BASE_URL}/api/posts/feed`, headers: auth };
  if (r < 0.68) return { name: 'tendances', url: `${BASE_URL}/api/posts/tags/trending` };
  if (r < 0.83) return { name: 'profil', url: `${BASE_URL}/api/users/${user.username}` };
  if (r < 0.93) return { name: 'posts-auteur', url: `${BASE_URL}/api/posts/user/${user.id}` };
  return { name: 'post-detail', url: `${BASE_URL}/api/posts/${samplePostId}` };
}

export default function () {
  const user = users[Math.floor(Math.random() * users.length)];
  const { name, url, headers } = pickRead(user);

  const res = http.get(url, { headers, tags: { endpoint: name } });
  latence[name].add(res.timings.duration);

  check(res, {
    'statut 200': (r) => r.status === 200,
    'corps non vide': (r) => r.body && r.body.length > 20,
  });

  sleep(THINK_MIN + Math.random() * (THINK_MAX - THINK_MIN));
}

/**
 * @brief Écrit le résumé du palier en JSON (lu ensuite par perf/report.mjs).
 *        Évite --summary-export, déprécié selon les versions de k6.
 */
export function handleSummary(data) {
  const dir = __ENV.RESULT_DIR || 'perf/results';
  const level = __ENV.LEVEL || String(VUS);

  const d = data.metrics.http_req_duration.values;
  const rate = data.metrics.http_req_failed.values.rate;
  const rps = data.metrics.http_reqs.values.rate;
  const line = `VUs=${level}  ${rps.toFixed(1)} req/s  p50=${d.med.toFixed(0)}ms  ` +
               `p95=${d['p(95)'].toFixed(0)}ms  p99=${d['p(99)'].toFixed(0)}ms  ` +
               `erreurs=${(rate * 100).toFixed(2)}%`;

  return {
    [`${dir}/vus-${level}.json`]: JSON.stringify(data),
    stdout: line + '\n',
  };
}
