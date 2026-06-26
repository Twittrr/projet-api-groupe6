# Revue de conformité — Projet Breezy vs Cahier des charges

> **Type** : Revue technique et fonctionnelle complète
> **Date de revue** : 23 juin 2026
> **Référentiel** : *Cahier des charges - Projet Breezy v1.0 (03 juin 2026)*
> **Périmètre audité** : `services/{auth,users,posts,notifications,conversations,seeder}`, `frontend/`, `gateway/`, `.github/`, `docs/`, `docker-compose.yml`
> **Méthode** : lecture exhaustive du code, des configurations, de l'historique Git et de la documentation.

---

## 1. Synthèse exécutive

Le projet est **globalement très solide et largement conforme** au cahier des charges. Le cœur fonctionnel obligatoire (Fx1–Fx11) est **intégralement implémenté**, ainsi que la quasi-totalité des fonctionnalités *Should* et *Could have*. L'architecture microservices, la sécurité (JWT, bcrypt, RBAC, Helmet, CORS, rate-limiting) et la conteneurisation sont **au niveau attendu, voire au-delà**.

Les écarts se concentrent sur la **rigueur DevOps et qualité** plutôt que sur le fonctionnel :

| Domaine | Niveau de conformité |
|---|:---:|
| Fonctionnalités Fx1–Fx11 (Must) | ✅ 100 % |
| Fonctionnalités Should (Fx12,13,20,21) | ✅ 100 % |
| Fonctionnalités Could (Fx14–19,22,23) | ✅ ~95 % |
| Matrice RBAC (§6) | ✅ Conforme (1 nuance) |
| Architecture microservices (§7) | ✅ Conforme |
| Stack technique (§7.3) | ✅ Conforme |
| Bonnes pratiques API REST (§7.4) | ⚠️ Partiel (versioning + Swagger manquants) |
| ORM (§7.5) | ⚠️ Partiel (pas de migrations formelles) |
| Sécurité (§9) | ✅ Conforme (quelques durcissements possibles) |
| DevOps / Gitflow (§10.3) | ❌ Non conforme |
| CI/CD (§10.4) | ⚠️ Partiel (pas de tests, pas de push registry/deploy) |
| Tests unitaires & intégration | ❌ Absents |
| Documentation (§10.5) | ⚠️ Partiel (pas d'OpenAPI) |

**Top 5 des actions prioritaires** :
1. **Ajouter des tests** unitaires et d'intégration (actuellement : zéro test). *(§10.4 explicitement exigé)*
2. **Versionner les routes API** en `/api/v1/...`. *(§7.4 explicitement exigé)*
3. **Restaurer une vraie démarche Gitflow** (branche `develop`, branches `feature/*` atomiques, PR + revue). *(§10.3)*
4. **Compléter le pipeline CI/CD** : lint réel (ESLint) côté services, build + push d'images sur Docker Hub, étape de déploiement. *(§10.4)*
5. **Documentation OpenAPI/Swagger** en complément du `docs/API.md`. *(§7.4 / §10.5)*

---

## 2. Conformité fonctionnelle (§5 du cahier)

### 2.1 Fonctionnalités primaires obligatoires (Fx1–Fx11)

| ID | Fonctionnalité | État | Implémentation |
|----|----------------|:----:|----------------|
| **Fx1** | Création de comptes + validation | ✅ | `POST /api/auth/register` — validation Zod (username, email, mot de passe complexe), bcrypt 12 rounds. Création admin aussi via `POST /api/auth/users`. |
| **Fx2** | Authentification sécurisée | ✅ | `POST /api/auth/login` — JWT access (15 min) + refresh (7 j, cookie HttpOnly), rotation + révocation. |
| **Fx3** | Publication messages ≤ 280 car. | ✅ | `POST /api/posts` — limite 280 appliquée (schéma Zod + `maxlength` Mongoose). |
| **Fx4** | Affichage/édition sur le profil | ✅ | `GET /api/posts/:id`, `PATCH /api/posts/:id` (auteur uniquement), édition inline côté front. |
| **Fx5** | Flux chronologique | ✅ | `GET /api/posts/feed` — agrège `self + following`, tri `createdAt desc`, pagination par curseur (`before`). |
| **Fx6** | Liker un post | ✅ | `POST/DELETE /api/posts/:id/like` — index unique anti-doublon, `$inc` atomique, notification émise. |
| **Fx7** | Répondre à un post (commentaire) | ✅ | `POST /api/posts/:id/comments` — 280 car., compteur `commentCount`. |
| **Fx8** | Répondre à un commentaire (thread) | ✅ | `parentCommentId` + modèle `Reply` dédié, routes `/comments/:commentId/replies`. |
| **Fx9** | Suivre / être suivi | ✅ | `POST/DELETE /api/users/:id/follow` — modèle `Follow` (contrainte unique), anti self-follow, notification follow. |
| **Fx10** | Profil utilisateur | ✅ | `GET /api/users/:username`, `PATCH /api/users/me` — displayName, bio (≤160), avatarUrl. |
| **Fx11** | Liste des messages du profil | ✅ | `GET /api/posts/user/:userId` — paginé. |

> **Conclusion §5.1** : cœur obligatoire **100 % couvert**, avec une qualité d'implémentation supérieure aux attentes (rotation de tokens, idempotence des likes, compteurs atomiques).

### 2.2 Fonctionnalités secondaires (Fx12–Fx23)

| ID | Fonctionnalité | État | Remarque |
|----|----------------|:----:|----------|
| **Fx12** | Tags sur les messages | ✅ | Extraction `#hashtags`, jusqu'à 8 tags, index Mongo. |
| **Fx13** | Recherche par tags | ✅ | `GET /api/posts/tag/:tag` + tags tendances (agrégation 7 j). |
| **Fx14** | Notifications de mentions | ✅ | Détection `@username`, type `mention`. |
| **Fx15** | Notifications de likes | ✅ | Type `like`, émis depuis le service Posts. |
| **Fx16** | Notifications de followers | ✅ | Type `follow`, émis depuis le service Users. |
| **Fx17** | Messages privés | ✅ | Service **`conversations`** dédié (1:1 **et** groupes), messages ≤ 2000 car., compteur non-lus, notifications `message`. Temps réel par **polling** (pas de WebSocket — acceptable, le cahier ne l'exige pas). |
| **Fx18** | Images dans les messages | ✅ | Upload Multer + validation **magic-byte** (jpg/png/gif/webp), 10 Mo max. |
| **Fx19** | Vidéos dans les messages | ✅ | mp4 supporté par le même pipeline d'upload. |
| **Fx20** | Signalement de contenu | ✅ | `POST /api/posts/reports` — cible post/commentaire/utilisateur + snapshot. |
| **Fx21** | Suspension / bannissement | ✅ | `PATCH /api/users/:id/status` (mod/admin), `GET /api/users/banned`, file de modération + résolution des reports. |
| **Fx22** | Interface multi-langues | ✅ | i18n FR/EN (`i18n.ts`, `useT.ts`, store `lang`), persistance localStorage + sync préférence utilisateur. |
| **Fx23** | Thème personnalisé | ✅ | Clair/sombre via variables CSS + `data-theme`, persistance, accessible aux visiteurs. |

> **Bonus hors périmètre** (valorisables en soutenance) : **Stories** éphémères (TTL 24 h), **bookmarks/favoris**, suggestions d'utilisateurs, tags tendances, seeder ~1000 comptes.

> **Nuance Fx18/Fx19** : le cahier parle d'images/vidéos « dans les messages ». L'upload est rattaché aux **posts**. Les messages privés (conversations) ne portent que du texte. Conforme à l'esprit (médias dans les publications), mais à clarifier si le jury attend des médias dans la messagerie privée.

---

## 3. Conformité de la matrice RBAC (§6)

La matrice des permissions est **respectée** par les middlewares `authenticate` + `requireRole(...)` côté backend et `useRequireAuth([roles])` côté frontend.

Points vérifiés :
- **Visiteur** : accès `welcome`/`login`/`register` + thème (Fx23) ✅.
- **Création de compte par l'admin** (Fx1 admin) : `POST /api/auth/users` protégé `admin` ✅.
- **Modération** (Fx21) : `requireRole('moderator','admin')`, et **un admin ne peut pas être modéré** (protection implémentée) ✅.
- **Fx15/Fx16 réservées au rôle `user`** dans la matrice : en pratique tous les utilisateurs authentifiés reçoivent ces notifications. Écart **mineur et théorique** (la matrice distingue user/mod/admin sur les notifications likes/followers), sans impact réel.

> **Conclusion §6** : conforme. Le contrôle d'accès est appliqué **backend ET frontend**, comme exigé en §9.1.

---

## 4. Conformité architecture & technique (§7)

### 4.1 Architecture microservices (§7.1–7.2) — ✅

- 6 services applicatifs (`auth`, `users`, `posts`, `notifications`, `conversations`, `frontend`) + gateway Nginx + 2 bases (PostgreSQL, MongoDB).
- **Polyglot persistence** conforme : PostgreSQL/Sequelize pour le relationnel (users, follows), MongoDB/Mongoose pour le documentaire (posts, comments, likes, notifications, conversations).
- Réseau Docker dédié (`breezy-net`), isolation inter-services, communication interne via clé partagée `x-internal-key`.
- **Écart de schéma** : le cahier (§7.2) ne mentionne pas le service `conversations` — ici c'est un **ajout positif** qui dépasse le périmètre. Le diagramme du `README.md` n'inclut pas non plus `conversations` → **à mettre à jour pour cohérence documentaire**.

### 4.2 Stack technique (§7.3) — ✅

| Exigence | Attendu | Constaté |
|---|---|---|
| Runtime | Node.js LTS | ✅ Node 20 |
| Framework | Express | ✅ |
| Auth | JWT | ✅ HS256, access+refresh |
| BDD relationnelle | PostgreSQL + Sequelize | ✅ |
| BDD documentaire | MongoDB + Mongoose | ✅ |
| Frontend | React + Next.js | ✅ Next.js 14 (App Router) |
| Style | Tailwind CSS | ✅ mobile-first |
| HTTP client | Axios (interceptors JWT) | ✅ refresh auto sur 401 |
| State management | access store | ✅ Zustand |
| Reverse proxy / LB | Nginx ou Traefik | ✅ Nginx + scaling round-robin |
| Conteneurisation | Docker / Compose | ✅ |
| CI/CD | GitHub Actions | ⚠️ partiel (cf. §6) |
| Dependabot | Surveillance dépendances | ✅ npm + docker + github-actions |

### 4.3 Bonnes pratiques API REST (§7.4) — ⚠️ PARTIEL

| Bonne pratique | État | Détail |
|---|:---:|---|
| **Versionnage `/api/v1/...`** | ❌ **MANQUANT** | Toutes les routes sont en `/api/<service>` sans préfixe de version. **Exigence explicite non respectée.** |
| Verbes HTTP cohérents | ✅ | GET/POST/PATCH/DELETE corrects. |
| Codes HTTP normalisés | ✅ | 200/201/400/401/403/404/409/422/429/500. |
| Réponse JSON homogène `{ data, error, meta }` | ✅ | Implémenté uniformément (`utils/response.js`). |
| Pagination / tri / filtrage | ✅ | Curseur (`before`) et page/limit selon les endpoints. |
| **Documentation OpenAPI / Swagger** | ❌ **MANQUANT** | Seul `docs/API.md` (Markdown) existe. Pas de spec OpenAPI ni d'UI Swagger. |
| Validation systématique des entrées | ✅ | Zod sur tous les services. |
| Logs structurés + middleware d'erreurs centralisé | ⚠️ | Middleware d'erreurs centralisé ✅, mais logs en `console.*` (non structurés JSON). |

### 4.4 ORM (§7.5) — ⚠️ PARTIEL

- **Mongoose** : schémas typés, validators, index, TTL, refs/populate ✅ — exemplaire.
- **Sequelize** : modèles `User`, `Follow`, `RefreshToken` ✅, contraintes uniques ✅.
- **Écarts** :
  - **Pas de migrations** : le schéma est créé via `sequelize.sync()` + `ALTER TABLE` bruts dans `index.js`. Le cahier mentionne explicitement « modèles, **migrations**, associations, seeders ». À industrialiser (ex. `sequelize-cli` / Umzug).
  - **Associations implicites** : `hasMany`/`belongsTo` non déclarées explicitement (clés étrangères gérées manuellement). Fonctionnel mais non conforme à la lettre du §7.5.
  - **Pas de seeders Sequelize** : le seeding passe par un service `seeder` applicatif (approche valable, mais hors mécanisme ORM natif).

### 4.5 Modèle de données (§7.6) — ✅

Tous les agrégats attendus sont présents : `User`, `Follow`, `Post` (≤280, tags[], media[]), `Comment` (+`parentCommentId`), `Like`, `Notification`. **Extensions** : `Reply`, `Bookmark`, `Story`, `Report`, `Conversation`, `Message`, `RefreshToken`.

---

## 5. Exigences non fonctionnelles (§8) — ✅ globalement

| Propriété | État | Constat |
|---|:---:|---|
| Fiabilité | ✅ | Gestion d'erreurs centralisée, retries front sur 401, dégradation gracieuse (feed renvoie `[]` si Users indisponible). |
| Performance | ✅ | Index Mongo/PG ciblés, pagination, gzip gateway, compteurs dénormalisés. *(Pas de mesure chiffrée fournie — à documenter pour prouver < 200 ms / TTI < 3 s.)* |
| Disponibilité | ✅ | Healthchecks Docker sur tous les services, `restart: unless-stopped`. |
| Scalabilité | ✅ | Services stateless, `docker compose up --scale`, LB Nginx. |
| Connectivité | ⚠️ | CORS explicite ✅. **HTTPS/TLS absent au gateway** (HTTP:80) — acceptable en local, mais le §8 cible HTTPS en prod : à prévoir. |
| Évolutivité | ✅ | Découpage microservices, ORM. *(Contrats API non versionnés → cf. §4.3.)* |
| Accessibilité | ✅ | Mobile-first, responsive (BottomNav, breakpoints `lg:`), navigation clavier de base. |
| i18n | ✅ | FR/EN (Fx22). |

---

## 6. Sécurité (§9) — ✅ conforme, durcissements possibles

**Conforme** :
- JWT HS256 access (15 min, en mémoire côté client) + refresh (7 j, cookie **HttpOnly/Secure/SameSite**) ✅.
- **Rotation + révocation** des refresh tokens (table `refresh_tokens` + `jti`) — **au-delà** de l'exigence.
- bcrypt **12 rounds** + politique de complexité (min 8, maj/min/chiffre) ✅.
- Middleware d'authentification (signature + expiration) ✅.
- **RBAC backend ET frontend** ✅.
- **CORS** restreint aux origines connues ✅, **Helmet** ✅, **validation/sanitization** Zod ✅.
- **Rate limiting** sur login/register (service + gateway) ✅.
- Secrets via variables d'environnement, `.env` ignoré ✅, **garde de production** qui refuse de démarrer avec des secrets par défaut ✅ (excellent).
- **Dependabot** activé ✅.
- En-têtes de sécurité + **CSP** au gateway ✅.
- §9.3 (service tiers d'auth / OAuth2-OIDC) : notion documentée, non implémentée (cohérent avec « notion » et le hors-périmètre).

**Durcissements recommandés** (non bloquants) :
1. **Pas de protection CSRF** explicite sur le cookie de refresh (atténué par `SameSite=lax` + `path=/api/auth`, mais un token anti-CSRF serait plus robuste).
2. **Pas de purge** des refresh tokens révoqués/expirés (croissance de table).
3. **Rate limiting absent sur follow/unfollow** et certains endpoints d'écriture (risque de spam de notifications).
4. **Journalisation des évènements d'authentification** présente mais non structurée/centralisée (logs `console`).
5. CSP utilise `'unsafe-inline'` (limitation Next.js) — prévoir des nonces en durcissement.

---

## 7. DevOps, Gitflow & CI/CD (§10)

### 7.1 Gitflow & conventions (§10.3) — ❌ NON CONFORME

État constaté de l'historique Git :
- **Branches** : `main` + une unique branche `feature/all-app-v1`. **Aucune branche `develop`**, ni `release/*`, ni `hotfix/*`, ni `fix/*`.
- **8 commits au total**, dont plusieurs `fix:` empilés directement sur la branche feature monolithique.
- Un commit hors convention : `36111bd "Ajout d'une page..."` (pas de préfixe Conventional Commits).

**Écarts vs §10.3** :
- ❌ Modèle Gitflow non appliqué (manque `develop` comme branche d'intégration, branches de type non respectées).
- ❌ Principe « une feature = une branche + Pull Request avec revue » non respecté (tout est concentré dans `feature/all-app-v1`).
- ❌ « Un commit = un changement atomique » non respecté (commits larges « application complète », « recherche explore complète + notifications + compteur »).
- ⚠️ Conventional Commits **majoritairement** suivis (`feat:`, `fix:`) mais pas systématiquement.
- ❓ Kanban GitHub Projects, Issues liées aux User Stories, et revues de PR : **non vérifiables depuis le dépôt local** — à confirmer sur GitHub (exigés en §10.2).

### 7.2 CI/CD GitHub Actions (§10.4) — ⚠️ PARTIEL

Pipeline existant (`.github/workflows/ci.yml`) :

| Étape attendue (§10.4) | État | Détail |
|---|:---:|---|
| 1. Lint (ESLint / Prettier) | ⚠️ | Frontend : `npm run lint` (next lint) ✅. **Services : seulement `node --check`** (vérification syntaxique, **pas** un vrai lint ESLint/Prettier). |
| 2. Build front & back | ✅ | `npm run build` front + `docker compose build`. |
| 3. **Tests unitaires & d'intégration** | ❌ | `npm test --if-present` → **aucun test n'existe** (0 fichier `*.test.*`/`*.spec.*`). **Exigence non satisfaite.** |
| 4. Build d'images Docker | ✅ | `docker compose build`. |
| 5. **Push sur Docker Hub (sur tag)** | ❌ | Absent. |
| 6. **Déploiement** | ❌ | Absent. |

**Autre écart** : le service **`conversations` n'est pas inclus** dans la matrice CI (`[auth, users, posts, notifications]`) → il n'est ni vérifié ni « testé » par le pipeline.

### 7.3 Dependabot (§10.4) — ✅

`.github/dependabot.yml` couvre `npm`, `docker` et `github-actions` (hebdomadaire). Conforme et complet.

### 7.4 Documentation (§10.5) — ⚠️ PARTIEL

- `README.md` : présentation, prérequis, lancement (`docker compose up`), sécurité, fonctionnalités, scaling ✅. **Mais** : diagramme d'architecture **n'inclut pas `conversations`**, et la section « contribution » (exigée) est absente.
- `docs/SPECIFICATIONS-TECHNICO-FONCTIONNELLES.md` ✅ + `docs/API.md` ✅.
- ❌ **Pas de documentation OpenAPI/Swagger**.
- ⚠️ Wireframes/maquettes : un mockup HTML existe (`Breezy Mockup v2.dc.html`, `uploads/mockup.html`) mais pas formalisé dans `/docs`.
- ❌ Pas de PR template, issue templates, ni `CODEOWNERS`.

---

## 8. Environnements & déploiement (§11) — ✅

- Local conteneurisé (Docker Compose) ✅, volumes nommés (`pgdata`, `mongodata`, `uploads`) ✅, réseau dédié ✅, healthchecks + `restart: unless-stopped` ✅.
- Load balancing / routage Nginx ✅ (`/api/auth`, `/api/users`, `/api/posts`, `/api/notifications`, `/api/conversations`, `/uploads`, frontend), scaling horizontal documenté ✅.
- ❌ TLS non terminé au gateway (cohérent en local ; à ajouter pour staging/prod).
- Limites de ressources (`deploy.resources.limits`) définies par service ✅ — bon réflexe pour environnements à faibles ressources (objectif métier du projet).

---

## 9. Liste consolidée des écarts

### 9.1 Bloquants / exigences explicites non satisfaites
1. **Aucun test** unitaire ni d'intégration (§10.4). 
2. **Versionnage d'API `/api/v1/`** absent (§7.4).
3. **Gitflow non appliqué** : pas de `develop`, branche feature monolithique, commits non atomiques, pas de PR par feature (§10.3 / §10.2).
4. **CI/CD incomplet** : pas de lint réel côté services, pas de push d'images sur Docker Hub, pas d'étape de déploiement, `conversations` hors matrice (§10.4).

### 9.2 Importants (conformité partielle)
5. **OpenAPI/Swagger** absent (§7.4 / §10.5).
6. **Migrations Sequelize** absentes + associations implicites (§7.5).
7. **README** : diagramme sans `conversations`, section « contribution » manquante (§10.5).
8. **TLS/HTTPS** non géré au gateway (§8 / §11) — à prévoir hors local.

### 9.3 Mineurs / durcissements
9. Pas de protection CSRF explicite (§9.2).
10. Pas de purge des refresh tokens expirés/révoqués.
11. Rate limiting manquant sur follow/unfollow et écritures sensibles.
12. Logs non structurés (console vs JSON).
13. Nuance RBAC Fx15/Fx16 (notifications) vs matrice §6.
14. Médias non supportés dans la messagerie privée (clarifier l'attendu Fx18/Fx19).
15. Absence de PR/issue templates et `CODEOWNERS`.

---

## 10. Points forts à valoriser en soutenance

- Cœur fonctionnel **100 % livré** + nombreuses fonctionnalités *Could have* et **bonus** (stories, bookmarks, suggestions, tags tendances).
- **Sécurité supérieure aux attentes** : rotation/révocation de refresh tokens, garde de production anti-secrets-par-défaut, validation magic-byte des uploads, CSP et en-têtes au gateway, rate limiting double (gateway + service).
- **Architecture propre** : polyglot persistence cohérente, réponses API homogènes `{data,error,meta}`, dégradation gracieuse inter-services, healthchecks et limites de ressources.
- **Frontend abouti** : mobile-first, i18n FR/EN, thème clair/sombre, RBAC frontend, refresh JWT transparent.
- **Seeder réaliste** (~1000 comptes) pour une démo crédible.

---

## 11. Plan d'action recommandé (priorisé)

| Priorité | Action | Section | Effort |
|:---:|---|---|:---:|
| 🔴 P1 | Ajouter des tests (Jest/Vitest + supertest) sur auth, users, posts au minimum, et brancher l'étape CI « Tests » | §10.4 | Moyen |
| 🔴 P1 | Préfixer toutes les routes en `/api/v1/...` (gateway + services + front) | §7.4 | Faible |
| 🔴 P1 | Réinstaurer Gitflow : créer `develop`, découper en `feature/*`, ouvrir des PR avec revue | §10.3 | Faible |
| 🟠 P2 | Compléter la CI : ESLint réel par service, ajouter `conversations` à la matrice, job de build+push Docker Hub sur tag, étape de déploiement | §10.4 | Moyen |
| 🟠 P2 | Générer une spec **OpenAPI** + servir Swagger UI | §7.4 | Moyen |
| 🟠 P2 | Introduire des **migrations Sequelize** et déclarer les associations | §7.5 | Moyen |
| 🟢 P3 | Mettre à jour le `README` (diagramme avec `conversations`, section contribution) | §10.5 | Faible |
| 🟢 P3 | Durcissements sécurité : CSRF, purge des tokens, rate-limit écritures, logs structurés | §9 | Moyen |
| 🟢 P3 | Ajouter TLS au gateway pour staging/démo | §8/§11 | Faible |

---

*Fin de la revue de conformité.*
