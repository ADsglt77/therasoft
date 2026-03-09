# Stage 1 : build Angular en production
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2 : servir les fichiers statiques avec nginx
FROM nginx:alpine

# Config nginx pour SPA (fallback index.html pour le routing Angular)
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

# Fichiers buildés (Angular 19 : dist/<project>/browser)
COPY --from=build /app/dist/portail-medecin-frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
