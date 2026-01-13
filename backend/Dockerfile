FROM node:20-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
RUN npm install

COPY . .

# Générer le client Prisma
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "dev"]
