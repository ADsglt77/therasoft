#!/bin/sh
set -e

echo "Waiting for database..."
until pg_isready -h db -p 5432 -U "$DB_USER"; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Applying Prisma migrations..."
if ! npx prisma migrate deploy; then
  echo "Existing database (P3005): baseline + schema sync"
  npx prisma migrate resolve --applied 0_init
  npx prisma db push
fi

export RESET_DB_ON_SEED="${RESET_DB_ON_SEED:-true}"
echo "Running Prisma seed (RESET_DB_ON_SEED=${RESET_DB_ON_SEED})..."
npx prisma db seed || true

echo "Starting application..."
npm run start
