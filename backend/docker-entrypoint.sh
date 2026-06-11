#!/bin/sh
set -e

echo "Waiting for database..."
until pg_isready -h db -p 5432 -U "$DB_USER"; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

# Schéma versionné : on applique uniquement les migrations en attente. Jamais de reset.
echo "Applying migrations..."
npx prisma migrate deploy

# Seed idempotent : ne crée les données de démo que si la base est vide (une seule fois).
echo "Seeding demo data (skipped if data already present)..."
npx prisma db seed

echo "Starting application..."
mkdir -p /app/uploads/dossiers
chown -R node:node /app/uploads
exec su-exec node:node npm run start
