#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="${SAWIYAA_PROJECT_DIR:-/opt/sawiyaa}"
COMPOSE_FILE="docker-compose.prod.yml"
LOCK_PATH="${SAWIYAA_DEPLOY_LOCK:-/tmp/sawiyaa-production-deploy.lock}"
TARGET_SHA="${SAWIYAA_TARGET_SHA:-}"
APPROVE_BLOCKING="${SAWIYAA_APPROVE_BLOCKING_MIGRATIONS:-false}"
VALIDATION_ROOT="${SAWIYAA_VALIDATION_ROOT:-${TMPDIR:-/tmp}/sawiyaa-release-validation}"
TARGET_SHA_ARG=""
VALIDATION_WORKTREE=""
WORKTREE_CREATED=0
ACTIVE_HEAD=""
BACKUP_STATUS="NOT_RUN"
MIGRATION_STATUS="NOT_RUN"
APPLIED_MIGRATIONS_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target-sha) TARGET_SHA_ARG="$2"; shift 2;;
    --approve-blocking-migrations) APPROVE_BLOCKING="true"; shift;;
    -h|--help)
      sed -n 's/^# //p' "$0"
      exit 0
      ;;
    *) printf 'Unknown argument: %s\n' "$1" >&2; exit 2;;
  esac
done

if [[ -n "$TARGET_SHA_ARG" && -n "$TARGET_SHA" && "$TARGET_SHA_ARG" != "$TARGET_SHA" ]]; then
  echo "Conflicting target SHA inputs." >&2
  exit 2
fi
TARGET_SHA="${TARGET_SHA_ARG:-$TARGET_SHA}"

if [[ ! -d "$PROJECT_DIR" ]]; then
  echo "Project directory not found: $PROJECT_DIR" >&2
  exit 1
fi

cd "$PROJECT_DIR"

if ! command -v flock >/dev/null 2>&1; then
  echo "flock is required for production deployment locking." >&2
  exit 1
fi
mkdir -p -- "$(dirname -- "$LOCK_PATH")"
exec 9>"$LOCK_PATH"
if ! flock -n 9; then
  echo "Another production deployment already holds $LOCK_PATH." >&2
  exit 1
fi
printf 'pid=%s\nstarted=%s\n' "$$" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >&9
ACTIVE_HEAD="$(git rev-parse HEAD)"

cleanup_validation_worktree() {
  if (( WORKTREE_CREATED )); then
    git -C "$PROJECT_DIR" worktree remove --force "$VALIDATION_WORKTREE" >/dev/null 2>&1 || true
    WORKTREE_CREATED=0
  fi
}
cleanup_phase_0b() {
  [[ -n "$APPLIED_MIGRATIONS_FILE" ]] && rm -f -- "$APPLIED_MIGRATIONS_FILE"
}
trap 'cleanup_phase_0b; cleanup_validation_worktree' EXIT INT TERM

print_logs() {
  local exit_code=$?
  echo "Deployment failed. Recent compose logs follow:" >&2
  docker compose -f "$COMPOSE_FILE" logs --tail=200 postgres backend frontend nginx >&2 || true
  exit "$exit_code"
}
trap print_logs ERR

echo "Running minimal host/bootstrap checks before acquiring any release..."
bash "$PROJECT_DIR/deploy/scripts/validate-production-preflight.sh" \
  --bootstrap-only --skip-lock \
  --project-dir "$PROJECT_DIR" \
  --environment production \
  --backend-env "$PROJECT_DIR/.env.production.backend" \
  --frontend-env "$PROJECT_DIR/.env.production.frontend" \
  --db-env "$PROJECT_DIR/.env.production.db"

echo "Fetching the approved target commit without changing the active checkout..."
if [[ -n "$TARGET_SHA" ]]; then
  [[ "$TARGET_SHA" =~ ^[0-9a-fA-F]{40}$ ]] || { echo "Target SHA must be a full 40-character commit SHA." >&2; exit 2; }
  git fetch --no-tags origin "$TARGET_SHA"
else
  git fetch --no-tags origin main
  TARGET_SHA="$(git rev-parse FETCH_HEAD)"
fi
TARGET_SHA="$(git rev-parse "$TARGET_SHA^{commit}")"

if [[ -z "$VALIDATION_ROOT" || "$VALIDATION_ROOT" == "/" || "$VALIDATION_ROOT" == "." ]]; then
  echo "Validation root is unsafe: $VALIDATION_ROOT" >&2
  exit 2
fi
mkdir -p -- "$VALIDATION_ROOT"
VALIDATION_WORKTREE="$VALIDATION_ROOT/sawiyaa-${TARGET_SHA}-$$"
case "$VALIDATION_WORKTREE" in
  "$VALIDATION_ROOT"/*) ;;
  *) echo "Validation worktree escaped its root." >&2; exit 2;;
esac

echo "Materializing target $TARGET_SHA in a temporary detached worktree..."
git worktree add --detach "$VALIDATION_WORKTREE" "$TARGET_SHA" >/dev/null
WORKTREE_CREATED=1

echo "Validating target-release environment contract and Compose model..."
if ! bash "$PROJECT_DIR/deploy/scripts/validate-production-preflight.sh" \
  --target-only --skip-lock \
  --project-dir "$VALIDATION_WORKTREE" \
  --environment production \
  --backend-env "$PROJECT_DIR/.env.production.backend" \
  --frontend-env "$PROJECT_DIR/.env.production.frontend" \
  --db-env "$PROJECT_DIR/.env.production.db"; then
  cleanup_validation_worktree
  [[ "$(git rev-parse HEAD)" == "$ACTIVE_HEAD" ]] || { echo "BLOCKING ACTIVE_RELEASE_CHANGED_ON_TARGET_FAILURE" >&2; exit 2; }
  echo "Target-release validation failed; active release was not changed." >&2
  exit 1
fi

cleanup_validation_worktree
echo "Target validation passed; materializing target in the active checkout."
git checkout -f main
git reset --hard "$TARGET_SHA"

echo "Validating compose configuration..."
docker compose -f "$COMPOSE_FILE" config >/dev/null

echo "Building images..."
docker compose -f "$COMPOSE_FILE" build

echo "Starting PostgreSQL..."
docker compose -f "$COMPOSE_FILE" up -d postgres

echo "Creating and verifying PostgreSQL backup before migrations..."
SAWIYAA_PROJECT_DIR="$PROJECT_DIR" \
SAWIYAA_COMPOSE_FILE="$COMPOSE_FILE" \
SAWIYAA_TARGET_SHA="$TARGET_SHA" \
  bash "$PROJECT_DIR/deploy/scripts/backup-db.sh"
BACKUP_STATUS="VERIFIED"

APPLIED_MIGRATIONS_FILE="$(mktemp "${TMPDIR:-/tmp}/sawiyaa-applied-migrations.XXXXXX")"
docker compose -f "$COMPOSE_FILE" exec -T postgres sh -lc \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "SELECT name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY name"' > "$APPLIED_MIGRATIONS_FILE" || {
    echo "Unable to read applied Prisma migrations; migration was not run." >&2
    exit 1
  }

scanner_args=(--migrations-dir "$PROJECT_DIR/sawiyaa-backend-v1/prisma/migrations" --applied-file "$APPLIED_MIGRATIONS_FILE")
if [[ "$APPROVE_BLOCKING" == "true" ]]; then
  scanner_args+=(--approve-blocking-migrations)
fi
set +e
scanner_output="$(node "$PROJECT_DIR/deploy/scripts/check-migration-safety.js" "${scanner_args[@]}" 2>&1)"
scanner_exit=$?
set -e
printf '%s\n' "$scanner_output"
if (( scanner_exit != 0 )); then
  MIGRATION_STATUS="BLOCKED"
  echo "Migration safety checks failed; migration was not run." >&2
  exit 1
fi
MIGRATION_STATUS="$(printf '%s\n' "$scanner_output" | sed -n 's/^MIGRATIONS: //p' | head -n 1)"

echo "Running Prisma migrations..."
docker compose -f "$COMPOSE_FILE" run --rm backend npm run prisma:migrate:deploy
echo "MIGRATE_DEPLOY: SUCCESS"

echo "Synchronizing production permissions..."
docker compose -f "$COMPOSE_FILE" run --rm -e PERMISSION_SYNC_ADMIN_PASSWORD backend npm run db:sync:permissions -- --apply

echo "Starting backend, frontend, and nginx..."
docker compose -f "$COMPOSE_FILE" up -d backend frontend nginx

echo "Waiting for backend health..."
for attempt in {1..30}; do
  if curl -fsS https://sawiyaa.com/api/v1/health >/dev/null; then break; fi
  sleep 5
done
curl -fsS https://sawiyaa.com/api/v1/health >/dev/null

echo "Waiting for frontend health..."
for attempt in {1..30}; do
  if curl -fsS https://sawiyaa.com >/dev/null; then break; fi
  sleep 5
done
curl -fsS https://sawiyaa.com >/dev/null

printf 'BACKUP: %s\nMIGRATIONS: %s\nMIGRATE_DEPLOY: SUCCESS\n' "$BACKUP_STATUS" "$MIGRATION_STATUS"
echo "Deployment completed successfully."
