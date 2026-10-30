# Breezy 🌬️

> Un réseau social léger et réactif, inspiré de Twitter/X, **optimisé pour les environnements à faibles ressources**.
> Projet du module *Développement d'applications distribuées* (PGE A3 FISA INFO — CESI).

Breezy permet de publier des messages courts (≤ 280 caractères), d'interagir (likes,
commentaires en thread, follows), de gérer des médias, des tags, des notifications et une
modération de contenu. L'application suit une **architecture microservices conteneurisée**
exposée derrière un **reverse proxy / load balancer**.

---

## 🏛️ Architecture

```
                         ┌──────────────────────────┐
   Navigateur  ───────▶  │   Gateway Nginx (:8080)   │  reverse proxy + load balancing
   (mobile-first)        └────┬───────┬───────┬──────┘
                              │       │       │
            ┌─────────────────┘       │       └──────────────────┐
            ▼                 ▼        ▼                          ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
    │ Frontend     │  │ Service Auth │  │ Service Users│  │ Service Posts    │
    │ Next.js :3000│  │ Express :4001│  │ Express :4002│  │ Express :4003    │
    └──────────────┘  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘
                             │                  │                   │
                             ▼                  ▼                   ▼
                       ┌──────────────────────────┐         ┌──────────────┐
                       │   PostgreSQL (Sequelize) │         │   MongoDB     │
                       │   users, follows         │         │ (Mongoose)    │
                       └──────────────────────────┘         │ posts,        │
                                                            │ comments,     │
                       ┌──────────────────────────┐         │ likes, reports│
                       │ Service Notifications     │────────▶│ notifications │
                       │ Express :4004 (Mongoose)  │         └──────────────┘
                       └──────────────────────────┘
```

| Brique | Techno | Base de données |
|---|---|---|
| **Gateway** | Nginx | — |
| **Frontend** | Next.js 14 (App Router) + Tailwind CSS | — |
| **Auth** | Node.js + Express + JWT + bcrypt | PostgreSQL (Sequelize) |
| **Users** | Node.js + Express | PostgreSQL (Sequelize) |
| **Posts** | Node.js + Express + Multer | MongoDB (Mongoose) |
| **Notifications** | Node.js + Express | MongoDB (Mongoose) |

📄 **Spécifications détaillées** : [`docs/SPECIFICATIONS-TECHNICO-FONCTIONNELLES.md`](docs/SPECIFICATIONS-TECHNICO-FONCTIONNELLES.md)
📡 **Référence API** : [`docs/API.md`](docs/API.md)

---

## 🚀 Démarrage rapide

### Prérequis
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (avec Docker Compose)
- (Optionnel pour le dev hors conteneur) Node.js 20 LTS

### Lancement (tout en conteneurs)

```bash
# 1. Cloner puis se placer dans le dossier du projet
cp .env.example .env          # configurer les variables (secrets, etc.)

# 2. Construire et démarrer l'ensemble de la stack
docker compose up --build

# 3. Ouvrir l'application
#    Frontend  : http://localhost:8080
#    API       : http://localhost:8080/api/...
```

Un **compte administrateur** est créé automatiquement au premier démarrage
(`SEED_ADMIN_*` dans `.env`) — par défaut `admin` / `Admin123!`.

### Peupler avec des données de démonstration (~1000 utilisateurs)

```bash
# Génère ~1000 profils + posts, stories, follows, likes, commentaires, notifications
docker compose --profile seed run --rm seeder
```

- Idempotent : si la base contient déjà des utilisateurs, le seeding est ignoré
  (forcer avec `SEED_FORCE=true`).
- **Tous les comptes générés** ont le même mot de passe : `Password123!`.
- Comptes vedettes (repris de la maquette) : `@ada` (admin), `@margaux` (modératrice),
  `@jules`, `@ines`, `@sami`.

### Scaler un service (load balancing)

```bash
docker compose up -d --scale posts=3
# Nginx répartit les requêtes /api/posts entre les 3 répliques (resolver DNS Docker
# + proxy_pass dynamique — cf. gateway/nginx.conf). Vérifier la répartition :
docker compose logs gateway | grep '/api/posts'   # $upstream_addr doit varier
```

> Détails et limites de montée en charge : [`docs/SCALABILITE.md`](docs/SCALABILITE.md).

---

## 🔐 Sécurité (résumé)

- **JWT** : `accessToken` (15 min, en mémoire côté client) + `refreshToken` (7 j, cookie **HttpOnly/Secure**).
- **bcrypt** (12 rounds) pour le hachage des mots de passe + politique de complexité.
- **RBAC** : middleware par rôle (`visitor`, `user`, `moderator`, `admin`) appliqué backend **et** frontend.
- **Helmet**, **CORS** restreint, **rate-limiting** (login/register), validation **Zod** systématique.
- Secrets via variables d'environnement (jamais commités), **Dependabot** activé.

Détails complets : section 9 des spécifications.

---

## 🧪 Fonctionnalités couvertes

| Bloc | Fonctionnalités |
|---|---|
| **Must (Fx1–Fx11)** | Inscription, connexion, posts, profil, fil chronologique, likes, commentaires + threads, follows |
| **Should (Fx12,13,20,21)** | Tags, recherche par tags, signalement, modération (suspension/bannissement) |
| **Could** | Notifications (likes/commentaires/follows), images & vidéos, thème clair/sombre |

Matrice de permissions complète : section 6 des spécifications.

---

## 🗂️ Structure du dépôt

```
.
├── docker-compose.yml          # orchestration locale
├── .env.example                # variables d'environnement
├── gateway/                    # reverse proxy Nginx
├── services/
│   ├── auth/                   # authentification (PostgreSQL)
│   ├── users/                  # profils & graphe social (PostgreSQL)
│   ├── posts/                  # posts, commentaires, likes, signalements (MongoDB)
│   └── notifications/          # notifications (MongoDB)
├── frontend/                   # application Next.js
├── perf/                       # test de charge lecture (k6 + rapport)
├── azure/                      # provisioning Azure Container Apps (provision.sh)
├── docs/                       # spécifications, API, architecture, déploiement
└── .github/                    # CI + CD (Actions) + Dependabot
```

---

## 🔄 CI/CD

- **CI** (`.github/workflows/ci.yml`, sur push/PR) : tests `node:test` (unitaires +
  smoke) de chaque microservice, lint + build du frontend, puis `docker compose build`.

  ```bash
  cd services/<svc> && npm install && npm test   # lancer les tests en local
  ```
- **CD** (`.github/workflows/release.yml`, **manuel**) : build et push des images sur
  **Docker Hub**, puis (option `deploy`) déploiement sur **Azure Container Apps**.
- **Perf** (`.github/workflows/perf-read.yml`, manuel ou chaque lundi à 3 h UTC) : test de
  charge en lecture sur runner gratuit, pour connaître le nombre d'utilisateurs simultanés
  (détail ci-dessous).

📄 Guide de déploiement complet : [`docs/DEPLOIEMENT-AZURE.md`](docs/DEPLOIEMENT-AZURE.md).

### ⚡ Test de charge — lecture des données (utilisateurs simultanés)

`.github/workflows/perf-read.yml` mesure **combien d'utilisateurs peuvent lire les données en
même temps** en n'utilisant que les ressources gratuites de GitHub Actions (runner
`ubuntu-latest` : 4 vCPU, 16 Go). Aucun service externe, aucun secret : la stack complète
(PostgreSQL, MongoDB, microservices, gateway) est construite et démarrée dans le job, puis
peuplée avec les données de démonstration (~1000 utilisateurs, ~6000 posts).

Le générateur de charge est [k6](https://k6.io). Chaque utilisateur virtuel enchaîne des
lectures réalistes — 35 % flux public (`explore`), 25 % fil d'abonnements (`feed`), 8 %
tendances, 15 % profil, 10 % posts d'un auteur, 7 % détail d'un post — avec un temps de
réflexion de 0,5 à 1,5 s entre deux actions.

**Lancement** : onglet *Actions* → *Perf — lecture des données* → *Run workflow* (les paliers
et la durée de chaque palier sont modifiables). Un run automatique a lieu chaque lundi à 3 h UTC.

```bash
# En local, une fois la stack perf démarrée et seedée (commandes du workflow) :
mkdir -p perf/results
k6 run -e BASE_URL=http://localhost:8081 -e VUS=50 -e DURATION=45s \
  -e LEVEL=50 -e RESULT_DIR=perf/results perf/k6/read-load.js
node perf/report.mjs
```

**Résultat** : un tableau par palier (requêtes/s, p50, p95, p99, taux d'erreur) publié dans le
résumé du run et conservé dans l'artefact `perf-lecture-<run_id>`. La **capacité retenue** est
le plus grand palier qui respecte p95 ≤ 500 ms et ≤ 1 % d'erreurs.

Deux précisions de lecture :

- le test passe par `gateway-perf`, l'image du gateway avec la configuration cloud **sans
  rate-limit par IP** : on mesure la capacité applicative, pas le limiteur anti-abus ;
- k6 tourne sur le même runner que la stack, qui partage 4 vCPU. Les chiffres décrivent cette
  machine gratuite, pas une infrastructure de production.

---

## 🤝 Contribution (Gitflow)

- Branches : `main`, `develop`, `feature/*`, `fix/*`, `release/*`, `hotfix/*`.
- **Conventional Commits** : `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`.
- Pull Request obligatoire avec revue de code avant merge.

---

## 👥 Équipe

Projet réalisé dans le cadre du module *Développement d'applications distribuées* — CESI A3 FISA INFO.
