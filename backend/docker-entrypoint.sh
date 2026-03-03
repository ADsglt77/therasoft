#!/bin/sh
set -e

echo "Waiting for database..."
until pg_isready -h db -p 5432 -U "$DB_USER"; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting application..."
npm run start