# ---- Gateway / reverse proxy Nginx (image autonome pour le cloud) ----
# En LOCAL, docker-compose monte directement ./gateway/nginx.conf en volume
# (cf. docker-compose.yml) — cette image n'est donc utilisée qu'en déploiement
# (Azure Container Apps, autre hôte Docker…), où l'on ne peut pas monter de volume.
#
# Les upstreams sont paramétrés par variables d'environnement : l'entrypoint officiel
# de l'image nginx exécute `envsubst` sur /etc/nginx/templates/*.template au démarrage.
# Seules les variables RÉELLEMENT définies dans l'environnement sont substituées
# (les variables nginx comme $host, $remote_addr, $request_uri sont préservées).
FROM nginx:1.27-alpine

# Valeurs par défaut = noms de services docker-compose (surchargées sur ACA par les
# noms d'apps : AUTH_UPSTREAM=breezy-auth, etc. — résolution par nom dans l'environnement).
ENV AUTH_UPSTREAM=auth:4001 \
    USERS_UPSTREAM=users:4002 \
    POSTS_UPSTREAM=posts:4003 \
    NOTIFICATIONS_UPSTREAM=notifications:4004 \
    CONVERSATIONS_UPSTREAM=conversations:4005 \
    FRONTEND_UPSTREAM=frontend:3000 \
    NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx

COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template

EXPOSE 80
