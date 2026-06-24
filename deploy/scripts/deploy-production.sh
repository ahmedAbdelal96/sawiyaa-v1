#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${SAWIYAA_PROJECT_DIR:-/opt/sawiyaa}"
COMPOSE_FILE="docker-compose.prod.yml"

if [ ! -d "$PROJECT_DIR" ]; then
  echo "Project directory not found: $PROJECT_DIR" >&2
  exit 1
fi

cd "$PROJECT_DIR"

print_logs() {
  local exit_code=$?
  echo "Deployment failed. Recent compose logs follow:" >&2
  docker compose -f "$COMPOSE_FILE" logs --tail=200 postgres backend frontend nginx >&2 || true
  exit "$exit_code"
}

trap print_logs ERR

echo "Fetching latest main from origin..."
git fetch origin main

echo "Resetting tracked files in $PROJECT_DIR to origin/main only."
git checkout -f main
git reset --hard origin/main

echo "Validating compose configuration..."
docker compose -f "$COMPOSE_FILE" config >/dev/null

echo "Building images..."
docker compose -f "$COMPOSE_FILE" build

echo "Starting PostgreSQL..."
docker compose -f "$COMPOSE_FILE" up -d postgres

echo "Running Prisma migrations..."
docker compose -f "$COMPOSE_FILE" run --rm backend npm run prisma:migrate:deploy

echo "Starting backend, frontend, and nginx..."
docker compose -f "$COMPOSE_FILE" up -d backend frontend nginx

echo "Waiting for backend health..."
for attempt in {1..30}; do
  if curl -fsS https://sawiyaa.com/api/v1/health >/dev/null; then
    break
  fi
  sleep 5
done
curl -fsS https://sawiyaa.com/api/v1/health >/dev/null

echo "Waiting for frontend health..."
for attempt in {1..30}; do
  if curl -fsS https://sawiyaa.com >/dev/null; then
    break
  fi
  sleep 5
done
curl -fsS https://sawiyaa.com >/dev/null

echo "Deployment completed successfully."
