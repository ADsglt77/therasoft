#!/bin/sh
set -e

echo "Waiting for database..."
sleep 5

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting application..."
npm run start