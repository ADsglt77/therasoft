FROM node:20-alpine

WORKDIR /app

# Librairies nécessaires à Prisma et à l'attente de Postgres
RUN apk add --no-cache openssl libc6-compat postgresql-client

# Installer les dépendances (build + runtime)
COPY package*.json ./
RUN npm install

# Copier le code source
COPY . .

# Générer le client Prisma (avant le build TypeScript)
RUN npx prisma generate

# Construire le code TypeScript
RUN npm run build

EXPOSE 3000

# Utiliser le script d'entrée via sh
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]