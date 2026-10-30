# ---- Stage 1 : dépendances de production ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# ---- Stage 2 : image de production ----
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Dossier d'upload ; la propriété root→node se fait ici avant USER node
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

USER node
EXPOSE 4003
CMD ["node", "src/index.js"]
