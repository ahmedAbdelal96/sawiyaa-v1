#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR=/opt/sawiyaa-dev
LOCK_PATH=/tmp/sawiyaa-dev-update.lock
BACKEND_ENV="$PROJECT_DIR/sawiyaa-backend-v1/.env"
FRONTEND_ENV="$PROJECT_DIR/sawiyaa-frontend-v1/.env"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.dev.yml"
COMPOSE_ARGS=(--env-file "$BACKEND_ENV" --env-file "$FRONTEND_ENV" -p sawiyaa-dev -f "$COMPOSE_FILE")
GEOIP_HOST_FILE="$PROJECT_DIR/geoip/GeoLite2-Country.mmdb"

[[ -d "$PROJECT_DIR/.git" ]] || { echo "Development checkout missing: $PROJECT_DIR" >&2; exit 1; }
[[ -r "$BACKEND_ENV" && -r "$FRONTEND_ENV" ]] || { echo "Development env files are missing or unreadable." >&2; exit 1; }
command -v flock >/dev/null 2>&1 || { echo "flock is required." >&2; exit 1; }
exec 9>"$LOCK_PATH"
flock -n 9 || { echo "Another development update is running." >&2; exit 1; }

cd "$PROJECT_DIR"
[[ "$(git branch --show-current)" == development ]] || { echo "Development checkout must be on development." >&2; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo "Development checkout is not clean." >&2; exit 1; }
git fetch --no-tags origin development
git pull --ff-only origin development

node "$PROJECT_DIR/deploy/scripts/validate-environment-contract.js" \
  --environment development --backend-env "$BACKEND_ENV" --frontend-env "$FRONTEND_ENV"
docker compose "${COMPOSE_ARGS[@]}" config --quiet

geoip_enabled="$(awk -F= '$1 == "GEOIP_ENABLED" {gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2; exit}' "$BACKEND_ENV" 2>/dev/null || true)"
if [[ "$geoip_enabled" == "true" ]]; then
  [[ -r "$GEOIP_HOST_FILE" && -s "$GEOIP_HOST_FILE" ]] || {
    echo "GEOIP_ENABLED=true but the development GeoIP database is missing or unreadable: $GEOIP_HOST_FILE" >&2
    exit 1
  }
fi

docker compose "${COMPOSE_ARGS[@]}" build backend frontend
docker compose "${COMPOSE_ARGS[@]}" up -d postgres
for attempt in {1..30}; do
  if docker compose "${COMPOSE_ARGS[@]}" exec -T postgres pg_isready >/dev/null 2>&1; then break; fi
  sleep 2
done
docker compose "${COMPOSE_ARGS[@]}" exec -T postgres pg_isready >/dev/null 2>&1 || {
  echo "Development PostgreSQL did not become ready." >&2
  exit 1
}

# This command runs only through the development Compose project and the
# development backend env file; it never targets production services.
docker compose "${COMPOSE_ARGS[@]}" run --rm --no-deps backend npx prisma migrate deploy
docker compose "${COMPOSE_ARGS[@]}" up -d --force-recreate backend frontend nginx

notification_queue_enabled="$(awk -F= '$1 == "NOTIFICATION_QUEUE_ENABLED" {gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2; exit}' "$BACKEND_ENV" 2>/dev/null || true)"
daily_queue_enabled="$(awk -F= '$1 == "DAILY_ATTENDANCE_QUEUE_ENABLED" {gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2; exit}' "$BACKEND_ENV" 2>/dev/null || true)"
if [[ "$notification_queue_enabled" == "true" || "$daily_queue_enabled" == "true" ]]; then
  docker compose "${COMPOSE_ARGS[@]}" up -d --force-recreate worker
else
  docker compose "${COMPOSE_ARGS[@]}" stop worker >/dev/null 2>&1 || true
fi

for service in postgres backend frontend nginx; do
  docker compose "${COMPOSE_ARGS[@]}" ps --status running --services | grep -Fxq "$service" || {
    echo "Development service is not running: $service" >&2
    exit 1
  }
done
docker compose "${COMPOSE_ARGS[@]}" exec -T backend node -e "fetch('http://127.0.0.1:7000/api/v1/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
docker compose "${COMPOSE_ARGS[@]}" exec -T frontend node -e "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
curl -fsS http://127.0.0.1:8080/api/v1/health >/dev/null
docker compose "${COMPOSE_ARGS[@]}" ps
echo "Development update: COMPLETE"
