#!/bin/sh
set -e

echo "Waiting for database..."
until pg_isready -h db -p 5432 -U "$DB_USER"; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Applying Prisma migrations..."
npx prisma migrate deploy

# Le seed décide lui-même de son comportement :
#   RESET_DB_ON_SEED=true  -> reset complet + données de démo (défaut)
#   RESET_DB_ON_SEED=false -> seed uniquement si la base est vide (idempotent)
export RESET_DB_ON_SEED="${RESET_DB_ON_SEED:-true}"
echo "Running Prisma seed (RESET_DB_ON_SEED=${RESET_DB_ON_SEED})..."
npx prisma db seed || true

echo "Starting application..."
npm run start
