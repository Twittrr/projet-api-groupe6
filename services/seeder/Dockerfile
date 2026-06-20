# Seeder — conteneur éphémère de génération de données de démonstration
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .
CMD ["node", "src/seed.js"]
