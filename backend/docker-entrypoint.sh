#!/bin/sh
set -e

echo "Waiting for database..."
until pg_isready -h db -p 5432 -U "$DB_USER"; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

# Bases déjà déployées : renommer ADMIN → SECRETAIRE avant db push (évite l'échec enum)
echo "Preparing existing database (role enum)..."
printf '%s\n' 'ALTER TYPE "Role" RENAME VALUE '"'"'ADMIN'"'"' TO '"'"'SECRETAIRE'"'"';' \
  | npx prisma db execute --stdin 2>/dev/null || true

echo "Syncing database schema (prisma db push)..."
npx prisma db push --accept-data-loss

export RESET_DB_ON_SEED="${RESET_DB_ON_SEED:-true}"
echo "Running Prisma seed (RESET_DB_ON_SEED=${RESET_DB_ON_SEED})..."
npx prisma db seed || true

echo "Starting application..."
npm run start
