#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR=/opt/sawiyaa-dev
if [[ "${SAWIYAA_TEST_MODE:-false}" == "true" ]]; then
  PROJECT_DIR="${SAWIYAA_DEV_PROJECT_DIR:-}"
  [[ -n "$PROJECT_DIR" ]] || { echo "SAWIYAA_DEV_PROJECT_DIR is required in test mode." >&2; exit 2; }
fi
LOCK_PATH=/tmp/sawiyaa-dev-update.lock
BACKEND_ENV="$PROJECT_DIR/sawiyaa-backend-v1/.env"
FRONTEND_ENV="$PROJECT_DIR/sawiyaa-frontend-v1/.env"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.dev.yml"
COMPOSE_PROJECT="${SAWIYAA_DEV_COMPOSE_PROJECT_NAME:-sawiyaa-dev}"
DEV_HTTP_PORT="${SAWIYAA_DEV_HTTP_PORT:-8080}"
COMPOSE_ARGS=(--env-file "$BACKEND_ENV" --env-file "$FRONTEND_ENV" -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE")
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

run_environment_validator() {
  local image="${SAWIYAA_VALIDATOR_NODE_IMAGE:-node:20.19.1-bookworm-slim}"
  if [[ "${SAWIYAA_FORCE_DOCKER_VALIDATOR:-false}" != "true" ]] &&
    command -v node >/dev/null 2>&1 &&
    node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 20 ? 0 : 1)' >/dev/null 2>&1; then
    node "$PROJECT_DIR/deploy/scripts/validate-environment-contract.js" \
      --environment development --backend-env "$BACKEND_ENV" --frontend-env "$FRONTEND_ENV" \
      --require-public-url
    return $?
  fi

  command -v docker >/dev/null 2>&1 || {
    echo "Compatible host Node.js is unavailable and Docker is not installed; cannot validate the development environment." >&2
    return 127
  }
  docker run --rm --network none --read-only \
    --tmpfs /tmp:rw,nosuid,nodev,size=16m \
    -v "$PROJECT_DIR:/workspace:ro" \
    -v "$BACKEND_ENV:/inputs/backend.env:ro" \
    -v "$FRONTEND_ENV:/inputs/frontend.env:ro" \
    "$image" node /workspace/deploy/scripts/validate-environment-contract.js \
      --environment development \
      --backend-env /inputs/backend.env \
      --frontend-env /inputs/frontend.env --require-public-url
}

run_environment_validator
docker compose "${COMPOSE_ARGS[@]}" config --quiet

mkdir -p "$PROJECT_DIR/logs/backend"
docker run --rm --user 0:0 -v "$PROJECT_DIR/logs/backend:/logs" busybox:1.36.1 \
  sh -c 'chown 10001:10001 /logs && chmod 0750 /logs'

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
docker compose "${COMPOSE_ARGS[@]}" run --rm --no-deps \
  -e SEED_PROFILE=curated \
  -e SEED_SKIP_IF_BOOTSTRAPPED=true \
  backend npm run prisma:seed
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
docker compose "${COMPOSE_ARGS[@]}" exec -T frontend node -e "fetch('http://127.0.0.1:3000/ar/auth/signin/patient').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
curl -fsS "http://127.0.0.1:${DEV_HTTP_PORT}/api/v1/health" >/dev/null
docker compose "${COMPOSE_ARGS[@]}" ps
echo "Development update: COMPLETE"
