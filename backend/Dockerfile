FROM node:20-alpine

WORKDIR /app

# Librairies nécessaires à Prisma et à l'attente de Postgres
RUN apk add --no-cache openssl libc6-compat postgresql-client

# Valeur par défaut uniquement pour la phase de build (prisma generate).
# En runtime, DATABASE_URL est fournie par docker-compose.
ARG DATABASE_URL=postgresql://postgres:postgres@db:5432/portail_medecin?schema=public
ENV DATABASE_URL=${DATABASE_URL}

# Installer les dépendances (build + runtime)
COPY package*.json ./
RUN npm install

# Copier le code source
COPY . .

# Windows peut enregistrer docker-entrypoint.sh en CRLF : normaliser pour Linux
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh

# Générer le client Prisma (avant le build TypeScript)
RUN npx prisma generate

# Construire le code TypeScript
RUN npm run build

EXPOSE 3000

# Utiliser le script d'entrée via sh
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]