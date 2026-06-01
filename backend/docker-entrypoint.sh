#!/bin/sh
set -e

echo "Waiting for database..."
until pg_isready -h db -p 5432 -U "$DB_USER"; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Running Prisma db push..."
npx prisma db push

echo "Running Prisma seed (ignoré si données déjà présentes)..."
#
# Pour forcer l'exécution du seed à chaque deploy (reset complet),
# on active RESET_DB_ON_SEED par défaut.
# Tu peux désactiver en prod en mettant RESET_DB_ON_SEED=false dans les env.
export RESET_DB_ON_SEED="${RESET_DB_ON_SEED:-true}"
#
npx prisma db seed || true

echo "Starting application..."
npm run start
