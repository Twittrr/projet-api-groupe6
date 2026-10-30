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

USER node
EXPOSE 4005
CMD ["node", "src/index.js"]
