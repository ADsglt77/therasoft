#!/bin/sh
set -e

echo "Waiting for database..."
until pg_isready -h db -p 5432 -U "$DB_USER"; do
  sleep 2
done

printf '%s\n' 'ALTER TYPE "Role" RENAME VALUE '"'"'ADMIN'"'"' TO '"'"'SECRETAIRE'"'"';' \
  | npx prisma db execute --stdin 2>/dev/null || true

echo "Syncing database schema (prisma db push)..."
npx prisma generate
npx prisma db push --accept-data-loss

echo "Starting backend with hot-reload (tsx watch)..."
exec npm run dev
