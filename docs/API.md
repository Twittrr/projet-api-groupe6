# Référence API — Breezy

Toutes les routes sont préfixées par `/api/v1` et exposées via le gateway (`http://localhost:8080`).
L'alias historique `/api/...` (sans version) reste accepté pour la rétro-compatibilité.
Format de réponse homogène : `{ "data": ..., "error": ..., "meta": ... }`.
Authentification : en-tête `Authorization: Bearer <accessToken>` (sauf routes publiques).

> Spécification machine : [`docs/openapi.yaml`](openapi.yaml) (OpenAPI 3.0).
>
> Codes HTTP : `200` OK · `201` Créé · `400` Requête invalide · `401` Non authentifié ·
> `403` Interdit (RBAC) · `404` Introuvable · `409` Conflit · `422` Validation · `429` Rate-limit.

---

## 🔑 Auth — `/api/auth` (service Auth)

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | — | Inscription (Fx1). Body : `{ username, email, password }` |
| `POST` | `/login` | — | Connexion (Fx2). Body : `{ identifier, password }` |
| `POST` | `/refresh` | cookie | Renouvelle l'`accessToken` (rotation du refresh) |
| `POST` | `/logout` | — | Invalide le cookie de refresh |
| `GET` | `/me` | ✅ | Profil de la session courante |
| `POST` | `/users` | admin | Création de compte avec rôle (Fx1 admin) |

`register`/`login` renvoient `{ user, accessToken }` et posent un cookie `breezy_refresh` (HttpOnly).

---

## 👤 Users — `/api/users` (service Users)

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/search?q=` | optionnel | Recherche d'utilisateurs |
| `GET` | `/suggestions` | ✅ | Suggestions « à suivre » |
| `PATCH` | `/me` | ✅ | Met à jour son profil (Fx10) : `{ displayName, bio, avatarUrl }` |
| `GET` | `/:username` | optionnel | Profil public + compteurs (Fx10) |
| `POST` | `/:id/follow` | ✅ | Suivre (Fx9) → notification Fx16 |
| `DELETE` | `/:id/follow` | ✅ | Ne plus suivre |
| `GET` | `/:id/followers` | — | Liste des abonnés |
| `GET` | `/:id/following` | — | Liste des abonnements |
| `PATCH` | `/:id/status` | mod/admin | Suspendre / bannir / réactiver (Fx21) : `{ status }` |
| `GET` | `/internal/:id/following-ids` | interne | (service-à-service) IDs suivis pour le flux |

---

## 📝 Posts — `/api/posts` (service Posts)

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/` | ✅ | Publier (Fx3) : `{ content, tags?, media? }` |
| `GET` | `/feed` | ✅ | Flux chronologique des suivis (Fx5). `?before=<date>` |
| `GET` | `/explore` | optionnel | Posts récents de la plateforme |
| `GET` | `/:id` | optionnel | Détail d'un post (Fx4) |
| `PATCH` | `/:id` | ✅ (auteur) | Modifier un post (Fx4) |
| `DELETE` | `/:id` | auteur/mod | Supprimer un post |
| `GET` | `/user/:userId` | optionnel | Posts d'un utilisateur (Fx11) |
| `GET` | `/tag/:tag` | optionnel | Recherche par tag (Fx13) |
| `GET` | `/tags/trending` | — | Tags tendances |
| `POST` | `/:id/like` | ✅ | Liker (Fx6) → notification Fx15 |
| `DELETE` | `/:id/like` | ✅ | Retirer le like |
| `GET` | `/:id/comments` | optionnel | Commentaires du post |
| `POST` | `/:id/comments` | ✅ | Répondre (Fx7) / `{ parentCommentId }` pour un thread (Fx8) |
| `DELETE` | `/:id/comments/:commentId` | auteur/mod | Supprimer un commentaire |
| `GET` | `/stories` | optionnel | Rail de stories (1 entrée/auteur, ≤ 24 h) |
| `GET` | `/stories/:authorId` | optionnel | Stories actives d'un auteur (lecteur) |
| `POST` | `/stories` | ✅ | Publier une story : `{ gradient?, text?, mediaUrl? }` |
| `POST` | `/upload` | ✅ | Upload média (Fx18/Fx19) — `multipart/form-data`, champ `file` |
| `POST` | `/reports` | ✅ | Signaler un contenu (Fx20) : `{ targetType, targetId, reason }` |
| `GET` | `/reports?status=open` | mod/admin | File de modération |
| `PATCH` | `/reports/:id` | mod/admin | Traiter un signalement (Fx21) : `{ status }` |

---

## 🔔 Notifications — `/api/notifications` (service Notifications)

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ✅ | Mes notifications (Fx14/15/16) |
| `GET` | `/unread-count` | ✅ | Nombre de non-lues (badge) |
| `PATCH` | `/:id/read` | ✅ | Marquer comme lue |
| `POST` | `/read-all` | ✅ | Tout marquer comme lu |
| `POST` | `/internal` | interne | (service-à-service) Création d'une notification |

---

## Exemple

```bash
# Inscription
curl -X POST http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","email":"alice@mail.com","password":"Secret123"}'

# Publier (avec le token reçu)
curl -X POST http://localhost:8080/api/posts \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"content":"Bonjour Breezy ! #hello"}'
```
