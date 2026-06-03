#!/bin/sh
set -e

echo "Waiting for database..."
until pg_isready -h db -p 5432 -U "$DB_USER"; do
  sleep 2
done

echo "Syncing database schema (prisma db push)..."
npx prisma generate
npx prisma db push

echo "Starting backend with hot-reload (tsx watch)..."
exec npm run dev
