FROM nginx:alpine

# Copier la configuration NGINX
COPY nginx.conf /etc/nginx/nginx.conf

# Le frontend sera monté en volume depuis docker-compose
# Pas besoin de copier les fichiers ici

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

