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

EXPOSE 3000

# Rendre le script d'entrée exécutable et l'utiliser comme entrypoint
RUN chmod +x /app/docker-entrypoint.sh
ENTRYPOINT ["/app/docker-entrypoint.sh"]