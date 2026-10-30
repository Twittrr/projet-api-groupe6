# Scalabilité — état des lieux & recommandations

Ce document recense les limites de montée en charge de Breezy, ce qui a été **corrigé**,
et les chantiers recommandés pour aller plus loin.

---
  
## 1. ✅ Corrigé — load balancing nginx des répliques (local)

**Problème.** Le README affirmait que `docker compose up --scale posts=3` était
load-balancé par nginx. C'était **faux** : un bloc `upstream { server posts:4003; }`
fait résoudre le nom **une seule fois au démarrage** de nginx → tout le trafic partait
vers une seule réplique.

**Correctif** (`gateway/nginx.conf`) : resolver DNS de Docker + variable dans `proxy_pass`,
ce qui force la ré-résolution à chaque requête (round-robin du DNS Docker entre répliques) :

```nginx
resolver 127.0.0.11 valid=10s ipv6=off;
# ...
location /api/posts {
  set $up_posts posts:4003;
  proxy_pass http://$up_posts$request_uri;
}
```

**Vérification :**
```bash
docker compose up -d --scale posts=3
# générer du trafic, puis observer $upstream_addr varier (3 IP différentes) :
docker compose logs gateway | grep '/api/posts'
```

> En cloud (Azure Container Apps), ce correctif n'est pas nécessaire : ACA assure
> lui-même le DNS et le load balancing entre répliques (cf. `docs/DEPLOIEMENT-AZURE.md`).

---

## 2. Atouts existants

- **Services sans état** : authentification par **JWT** (pas de session serveur en
  mémoire) → n'importe quelle réplique peut traiter n'importe quelle requête. C'est la
  condition clé d'un scaling horizontal sain. ✅
- **Pools de connexions** DB déjà configurés (Sequelize `pool.max=10`).
- **Healthchecks** et **limites de ressources** par service (docker-compose).

---

## 3. Chantiers recommandés (par priorité)

### 3.1 Médias (uploads) — stockage partagé — bloquant pour scaler `posts`
Aujourd'hui `posts` écrit les fichiers sur un **disque local** (`multer.diskStorage` →
`/app/uploads`). Avec plusieurs répliques (ou sur un FS éphémère comme ACA), un fichier
écrit par une réplique est **invisible** des autres.
- **Court terme** : volume partagé (Azure Files monté sur toutes les répliques `posts`).
- **Cible** : stockage **objet** (Azure Blob Storage / S3), URLs servies par le store ou
  un CDN. Remplacer `diskStorage` par un upload SDK dans
  `services/posts/src/controllers/upload.controller.js`.

### 3.2 Bases de données — point de défaillance unique
PostgreSQL et MongoDB tournent en **instance unique** (SPOF, scaling vertical seulement).
- Passer à des bases **managées avec réplicas** : Azure Database for PostgreSQL
  (réplicas en lecture), Cosmos DB / Atlas (réplication multi-nœuds).
- Diriger les lectures lourdes (fil, recherche) vers des réplicas en lecture.

### 3.3 WebSockets / temps réel — backplane
Les notifications et conversations utilisent du temps réel. À plusieurs répliques, deux
clients connectés à des répliques différentes ne se voient pas.
- Ajouter un **backplane Redis** (pub/sub) entre les répliques (ex. adapter Socket.IO
  Redis), + sticky sessions au niveau de l'ingress si nécessaire.

### 3.4 Cache
Aucun cache applicatif. À l'échelle, mettre en cache (Redis) : fils chronologiques,
compteurs (likes, non-lus), résultats de recherche. Réduit fortement la charge DB.

### 3.5 Rate limiting derrière un proxy / CDN
Le rate limiting nginx est **par IP** (`$binary_remote_addr`). Derrière un CDN ou un
load balancer, toutes les requêtes peuvent partager une même IP → faux positifs.
- Se baser sur `X-Forwarded-For` (déjà transmis) pour l'IP réelle, ou déléguer le
  rate limiting à l'ingress (ACA / API Management).

### 3.6 Autoscaling cloud (ACA)
Définir des règles **KEDA** (ex. concurrence HTTP, CPU) avec `min/maxReplicas` adaptés.
Attention au **scale-to-zero** (cold start) sur les services à faible trafic.

---

## 4. Synthèse

| Sujet | État | Action |
|---|---|---|
| LB répliques (nginx local) | ✅ corrigé | — |
| Services stateless (JWT) | ✅ ok | — |
| Uploads médias | ⚠️ disque local | Azure Files puis Blob |
| Bases mono-instance | ⚠️ SPOF | Managé + réplicas |
| Temps réel multi-réplique | ⚠️ | Backplane Redis |
| Cache | ❌ absent | Redis |
| Rate limit derrière proxy | ⚠️ | X-Forwarded-For / ingress |
