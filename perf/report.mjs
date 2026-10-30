#!/usr/bin/env node
/**
 * @file report.mjs
 * @brief Agrège les paliers k6 (perf/results/vus-<N>.json) en un tableau Markdown
 *        et détermine le nombre maximal d'utilisateurs simultanés soutenable.
 *
 * Seuils (variables d'environnement) :
 *   P95_LIMIT    latence p95 maximale acceptée, en ms (défaut 500)
 *   ERROR_LIMIT  taux d'erreur maximal accepté, en % (défaut 1)
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = process.env.RESULT_DIR || 'perf/results';
const P95_LIMIT = Number(process.env.P95_LIMIT || 500);
const ERROR_LIMIT = Number(process.env.ERROR_LIMIT || 1);

/** @brief Lit les paliers et les trie par nombre d'utilisateurs croissant. */
function loadLevels() {
  return readdirSync(DIR)
    .filter((f) => /^vus-\d+\.json$/.test(f))
    .map((f) => {
      const data = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
      const d = data.metrics.http_req_duration.values;
      return {
        vus: Number(f.match(/\d+/)[0]),
        rps: data.metrics.http_reqs.values.rate,
        total: data.metrics.http_reqs.values.count,
        p50: d.med,
        p95: d['p(95)'],
        p99: d['p(99)'],
        errors: data.metrics.http_req_failed.values.rate * 100,
        metrics: data.metrics,
      };
    })
    .sort((a, b) => a.vus - b.vus);
}

const ms = (v) => `${Math.round(v)} ms`;
const levels = loadLevels();

if (!levels.length) {
  console.error(`[report] aucun résultat dans ${DIR}/`);
  process.exit(1);
}

for (const l of levels) {
  l.ok = l.p95 <= P95_LIMIT && l.errors <= ERROR_LIMIT;
}

// Capacité = plus grand palier tel que TOUS les paliers jusqu'à lui sont valides.
const maxTested = levels[levels.length - 1].vus;
let capacity = 0;
for (const l of levels) {
  if (!l.ok) break;
  capacity = l.vus;
}
const capacityLabel = capacity === 0 ? '0'
  : (capacity === maxTested ? `≥ ${maxTested}` : String(capacity));

const lines = [];
lines.push('## ⚡ Charge lecture — utilisateurs simultanés');
lines.push('');
lines.push(`Seuils de validité : **p95 ≤ ${P95_LIMIT} ms** et **erreurs ≤ ${ERROR_LIMIT} %**.`);
lines.push('');
lines.push(`**Capacité mesurée : ${capacityLabel} utilisateurs simultanés** ` +
           `(sur un runner GitHub Actions gratuit : 4 vCPU, 16 Go, stack comprise).`);
lines.push('');
lines.push('| Utilisateurs simultanés | Requêtes/s | p50 | p95 | p99 | Erreurs | Verdict |');
lines.push('|---:|---:|---:|---:|---:|---:|:---|');
for (const l of levels) {
  lines.push(`| ${l.vus} | ${l.rps.toFixed(1)} | ${ms(l.p50)} | ${ms(l.p95)} | ${ms(l.p99)} | ` +
             `${l.errors.toFixed(2)} % | ${l.ok ? '✅' : '❌'} |`);
}
lines.push('');

// Détail par endpoint au dernier palier valide (métriques `latence_*` du script k6).
const top = levels.filter((l) => l.ok).pop() || levels[levels.length - 1];
const perEndpoint = Object.keys(top.metrics)
  .filter((k) => k.startsWith('latence_'))
  .map((k) => ({
    name: k.replace('latence_', '').replaceAll('_', '-'),
    p95: top.metrics[k].values['p(95)'],
  }))
  .sort((a, b) => b.p95 - a.p95);

if (perEndpoint.length) {
  lines.push(`### Détail par endpoint — ${top.vus} utilisateurs simultanés`);
  lines.push('');
  lines.push('| Endpoint | p95 |');
  lines.push('|---|---:|');
  for (const e of perEndpoint) lines.push(`| \`${e.name}\` | ${ms(e.p95)} |`);
  lines.push('');
}

lines.push('> Mesure indicative : le générateur de charge (k6) tourne sur le même runner que la');
lines.push('> stack. Les valeurs reflètent cette machine, pas une infrastructure de production.');
lines.push('');

const md = lines.join('\n');
mkdirSync(DIR, { recursive: true });
writeFileSync(join(DIR, 'report.md'), md);
process.stdout.write(md);
