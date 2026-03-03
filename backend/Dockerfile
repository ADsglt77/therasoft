FROM node:20-alpine

WORKDIR /app

# Librairies nécessaires à Prisma et à l'attente de Postgres
RUN apk add --no-cache openssl libc6-compat postgresql-client

# Installer uniquement les dépendances nécessaires en prod (optionnel mais mieux)
COPY package*.json ./
RUN npm install --omit=dev

# Copier le code source
COPY . .

# Générer le client Prisma
RUN npx prisma generate

EXPOSE 3000

# Utiliser le script d'entrée via sh
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]