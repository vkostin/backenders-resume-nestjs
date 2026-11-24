#!/bin/sh
set -eu

echo "Applying database schema"
attempt=0
until npx prisma migrate deploy; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "Database did not become ready"
    exit 1
  fi
  echo "Database is not ready (attempt ${attempt})"
  sleep 2
done

echo "Seeding portfolio"
node dist/seed/cli.js

echo "Starting API"
exec node dist/main.js
