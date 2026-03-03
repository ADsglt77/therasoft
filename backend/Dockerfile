FROM node:20-alpine

WORKDIR /app

# Librairies nécessaires à Prisma
RUN apk add --no-cache openssl libc6-compat

# Installer uniquement les dépendances nécessaires en prod (optionnel mais mieux)
COPY package*.json ./
RUN npm install --omit=dev

# Copier le code source
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Copier le script d'entrée
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000

# Lancer les migrations + l'app
CMD ["./docker-entrypoint.sh"]