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
npx prisma db seed || true

echo "Starting application..."
npm run start