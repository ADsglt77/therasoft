#!/bin/sh
set -e

echo "Waiting for database..."
until pg_isready -h db -p 5432 -U "$DB_USER"; do
  sleep 2
done

echo "Prisma generate + migrations (sans seed automatique)..."
npx prisma generate
npx prisma migrate deploy || echo "Migrate deploy skipped or failed — continuing in dev mode"

echo "Starting backend with hot-reload (tsx watch)..."
exec npm run dev
