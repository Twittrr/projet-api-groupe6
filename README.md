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
                       ┌──────────────────────────┐         ┌───────────────┐
                       │   PostgreSQL (Sequelize) │         │    MongoDB     │
                       │   users, follows         │         │  (Mongoose)    │
                       └──────────────────────────┘         │  posts,        │
                                                            │  comments,     │
                       ┌──────────────────────────┐         │  likes, reports│
                       │ Service Notifications     │────────▶│  notifications │
                       │ Express :4004 (Mongoose)  │         │  conversations,│
                       └──────────────────────────┘         │  messages      │
                       ┌──────────────────────────┐         └───────▲────────┘
                       │ Service Conversations     │─────────────────┘
                       │ Express :4005 (Mongoose)  │  messagerie privée (Fx17)
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
| **Conversations** | Node.js + Express | MongoDB (Mongoose) |

> **Versionnage de l'API** : toutes les routes sont exposées sous `/api/v1/...`
> (ex. `/api/v1/auth/login`). L'alias non versionné `/api/...` reste accepté pour la
> rétro-compatibilité, mais les nouveaux clients doivent cibler `/api/v1`.

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

📄 Guide de déploiement complet : [`docs/DEPLOIEMENT-AZURE.md`](docs/DEPLOIEMENT-AZURE.md).

---

## 🤝 Contribution (Gitflow)

- Branches : `main`, `develop`, `feature/*`, `fix/*`, `release/*`, `hotfix/*`.
- **Conventional Commits** : `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`.
- Pull Request obligatoire avec revue de code avant merge.

---

## 👥 Équipe

Projet réalisé dans le cadre du module *Développement d'applications distribuées* — CESI A3 FISA INFO.
