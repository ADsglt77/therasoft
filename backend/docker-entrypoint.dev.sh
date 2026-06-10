#!/bin/sh
set -e

echo "Waiting for database..."
until pg_isready -h db -p 5432 -U "$DB_USER"; do
  sleep 2
done

export RESET_DB_ON_SEED="${RESET_DB_ON_SEED:-false}"
export BASELINE_EXISTING_DB="${BASELINE_EXISTING_DB:-false}"

echo "Generating Prisma client..."
npx prisma generate

if [ "$RESET_DB_ON_SEED" = "true" ]; then
  echo "Demo mode: reset schema, apply migrations and seed..."
  printf '%s\n' 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;' | npx prisma db execute --stdin
  npx prisma migrate deploy
  echo "Clearing uploaded files..."
  mkdir -p /app/uploads
  rm -rf /app/uploads/* 2>/dev/null || true
  echo "Seeding demo data..."
  npx prisma db seed
else
  echo "Applying migrations..."
  if [ "$(psql "$DATABASE_URL" -tAc "SELECT to_regclass('public.\"user\"') IS NOT NULL AND to_regclass('public._prisma_migrations') IS NULL" 2>/dev/null)" = "t" ]; then
    if [ "$BASELINE_EXISTING_DB" != "true" ]; then
      echo "Existing pre-migration schema detected."
      echo "Set BASELINE_EXISTING_DB=true once, only after verifying it matches migration 0_init."
      exit 1
    fi
    echo "Explicit baseline enabled; marking 0_init as applied..."
    npx prisma migrate resolve --applied 0_init
  fi
  npx prisma migrate deploy
fi

echo "Starting backend with hot-reload (tsx watch)..."
exec npm run dev
