#!/usr/bin/env bash
set -Eeuo pipefail

export COMPOSE_PROJECT_NAME=sawiyaa
PROJECT_DIR="${SAWIYAA_PROJECT_DIR:-/opt/sawiyaa}"
RUNTIME_UID="${SAWIYAA_RUNTIME_UID:-10001}"
RUNTIME_GID="${SAWIYAA_RUNTIME_GID:-10001}"
COMPOSE_FILE="docker-compose.prod.yml"
BACKEND_ENV_FILE="${SAWIYAA_BACKEND_ENV_FILE:-$PROJECT_DIR/sawiyaa-backend-v1/.env.production}"
FRONTEND_ENV_FILE="${SAWIYAA_FRONTEND_ENV_FILE:-$PROJECT_DIR/sawiyaa-frontend-v1/.env.production}"
LOCK_PATH="${SAWIYAA_DEPLOY_LOCK:-/tmp/sawiyaa-production-deploy.lock}"
TARGET_SHA="${SAWIYAA_TARGET_SHA:-}"
APPROVE_BLOCKING="${SAWIYAA_APPROVE_BLOCKING_MIGRATIONS:-false}"
ALLOW_PAYMOB_CONTROL_BOOTSTRAP="${SAWIYAA_ALLOW_PAYMOB_CONTROL_BOOTSTRAP:-${ALLOW_PAYMOB_CONTROL_BOOTSTRAP:-false}}"
ALLOW_PAYMENT_ROUTE_BOOTSTRAP="${SAWIYAA_ALLOW_PAYMENT_ROUTE_BOOTSTRAP:-${ALLOW_PAYMENT_ROUTE_BOOTSTRAP:-false}}"
VALIDATION_ROOT="${SAWIYAA_VALIDATION_ROOT:-${TMPDIR:-/tmp}/sawiyaa-release-validation}"
TARGET_SHA_ARG=""
VALIDATION_WORKTREE=""
WORKTREE_CREATED=0
ACTIVE_HEAD=""
MIGRATION_STATUS="NOT_RUN"
APPLIED_MIGRATIONS_FILE=""
PROVIDER_STATE_FILE=""
LOG_MOUNT_CHECK_OUTPUT=""
RELEASE_STATE_DIR="${SAWIYAA_RELEASE_STATE_DIR:-/opt/sawiyaa-release-state}"
RELEASE_MARKER="${SAWIYAA_RELEASE_MARKER:-$RELEASE_STATE_DIR/.sawiyaa-release}"

read_env_value() {
  local key="$1"
  awk -F= -v key="$key" '$1 == key {sub(/^[^=]*=/, ""); print; exit}' "$BACKEND_ENV_FILE"
}

POSTGRES_DB="$(read_env_value POSTGRES_DB)"
POSTGRES_USER="$(read_env_value POSTGRES_USER)"
[[ -n "$POSTGRES_DB" && -n "$POSTGRES_USER" ]] || {
  echo "Production PostgreSQL database and user must be configured in $BACKEND_ENV_FILE." >&2
  exit 1
}

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

if [[ "$PROJECT_DIR" != "/opt/sawiyaa" && "${SAWIYAA_ALLOW_NONPRODUCTION_PATH:-false}" != "true" ]]; then
  echo "Refusing deployment outside /opt/sawiyaa." >&2
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
ACTIVE_BRANCH="$(git branch --show-current)"
if [[ "$ACTIVE_BRANCH" != "main" ]]; then
  echo "Refusing deployment from branch '$ACTIVE_BRANCH'; expected main." >&2
  exit 1
fi

BACKUP_BRANCH="backup-before-deploy-$(date -u +%Y%m%d%H%M%S)"
git branch "$BACKUP_BRANCH" "$ACTIVE_HEAD" >/dev/null

# Prepare the host bind mount through Docker so deployment works even when the
# deploy account cannot chown a directory from one numeric UID to another.
bash "$PROJECT_DIR/deploy/scripts/prepare-runtime-directories.sh" \
  --project-dir "$PROJECT_DIR" \
  --runtime-uid "$RUNTIME_UID" \
  --runtime-gid "$RUNTIME_GID"

cleanup_validation_worktree() {
  if (( WORKTREE_CREATED )); then
    git -C "$PROJECT_DIR" worktree remove --force "$VALIDATION_WORKTREE" >/dev/null 2>&1 || true
    WORKTREE_CREATED=0
  fi
}
cleanup_phase_0b() {
  [[ -n "$APPLIED_MIGRATIONS_FILE" ]] && rm -f -- "$APPLIED_MIGRATIONS_FILE"
  [[ -n "$PROVIDER_STATE_FILE" ]] && rm -f -- "$PROVIDER_STATE_FILE"
  [[ -n "$LOG_MOUNT_CHECK_OUTPUT" ]] && rm -f -- "$LOG_MOUNT_CHECK_OUTPUT"
}
trap 'cleanup_phase_0b; cleanup_validation_worktree' EXIT INT TERM

print_logs() {
  local exit_code=$?
  echo "Deployment failed. Service status and redacted recent logs follow:" >&2
  docker compose --env-file "$BACKEND_ENV_FILE" --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" ps >&2 || true
  docker compose --env-file "$BACKEND_ENV_FILE" --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" logs --tail=80 postgres backend frontend nginx 2>&1 |
    sed -E 's/([A-Za-z_]*(password|secret|token|api[_-]?key|authorization|database[_-]?url)[A-Za-z_]*[=:][[:space:]]*)[^[:space:],;]+/\1[REDACTED]/Ig' >&2 || true
  exit "$exit_code"
}
trap print_logs ERR

read_provider_state() {
  local require_config_catalog="${1:-false}"
  local catalog_exists
  catalog_exists="$(docker compose --env-file "$BACKEND_ENV_FILE" --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" exec -T \
    -e "POSTGRES_USER=$POSTGRES_USER" -e "POSTGRES_DB=$POSTGRES_DB" postgres sh -lc \
    'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "SELECT to_regclass('"'"'public.\"ConfigKeyCatalog\"'"'"') IS NOT NULL"' 2>/dev/null)" || {
      echo "Unable to check database payment provider schema; deployment stopped." >&2
      return 1
    }
  if [[ "$catalog_exists" != "t" ]]; then
    [[ "$require_config_catalog" == "true" ]] && {
      echo "Database payment provider schema is unavailable after bootstrap; deployment stopped." >&2
      return 1
    }
    printf 'stripe=false\npaymob=false\n' > "$PROVIDER_STATE_FILE"
    return 0
  fi

  docker compose --env-file "$BACKEND_ENV_FILE" --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" exec -T \
    -e "POSTGRES_USER=$POSTGRES_USER" -e "POSTGRES_DB=$POSTGRES_DB" postgres sh -lc \
    'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -AtF "=" -c "SELECT c.key, COALESCE((SELECT v.\"valueBoolean\"::text FROM \"ConfigValue\" v WHERE v.\"configKeyId\" = c.id AND v.\"scopeType\" = '\''GLOBAL'\'' AND v.\"scopeRefId\" IS NULL AND v.\"isActive\" = true ORDER BY v.priority DESC LIMIT 1), '\''false'\'') FROM \"ConfigKeyCatalog\" c WHERE c.key IN ('\''payment.provider.stripe.enabled'\'', '\''payment.provider.paymob.enabled'\'') ORDER BY c.key"' \
    | sed -n -E 's/^payment\.provider\.stripe\.enabled=(true|false)$/stripe=\1/p; s/^payment\.provider\.paymob\.enabled=(true|false)$/paymob=\1/p' \
    > "$PROVIDER_STATE_FILE" || {
      echo "Unable to read database payment provider state; deployment stopped." >&2
      return 1
    }
  if ! grep -Eq '^stripe=(true|false)$' "$PROVIDER_STATE_FILE" ||
    ! grep -Eq '^paymob=(true|false)$' "$PROVIDER_STATE_FILE"; then
    echo "Database payment provider state is incomplete; deployment stopped." >&2
    return 1
  fi
}

wait_for_postgres() {
  for attempt in {1..30}; do
    if docker compose --env-file "$BACKEND_ENV_FILE" --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  echo "PostgreSQL did not become ready before the deployment database check." >&2
  return 1
}

assert_active_checkout_safe() {
  local line code item
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    code="${line:0:2}"
    item="${line:3}"
    if [[ "$code" != "??" ]]; then
      echo "Unexpected tracked change before active checkout reset: $item" >&2
      return 1
    fi
    case "$item" in
      deploy/certs/*|deploy/certbot-logs/*|deploy-build.pid|*.before-*|.sawiyaa-release)
        ;;
      *)
        echo "Unexpected untracked runtime path before active checkout reset: $item" >&2
        return 1
        ;;
    esac
  done < <(git status --porcelain=v1 --untracked-files=all)
}

echo "Running minimal host/bootstrap checks before acquiring any release..."
bash "$PROJECT_DIR/deploy/scripts/validate-production-preflight.sh" \
  --bootstrap-only --skip-lock \
  --project-dir "$PROJECT_DIR" \
  --environment production \
  --backend-env "$BACKEND_ENV_FILE" \
  --frontend-env "$FRONTEND_ENV_FILE"

echo "Fetching the approved target commit without changing the active checkout..."
if [[ -n "$TARGET_SHA" ]]; then
  [[ "$TARGET_SHA" =~ ^[0-9a-fA-F]{40}$ ]] || { echo "Target SHA must be a full 40-character commit SHA." >&2; exit 2; }
  git fetch --no-tags origin "$TARGET_SHA"
else
  git fetch --no-tags origin main
  TARGET_SHA="$(git rev-parse FETCH_HEAD)"
fi
TARGET_SHA="$(git rev-parse "$TARGET_SHA^{commit}")"
export SAWIYAA_RELEASE_SHA="$TARGET_SHA"

echo "Deployment target resolved from approved remote commit."
echo "Active checkout commit: $ACTIVE_HEAD"
echo "Approved deployment target: $TARGET_SHA"
if [[ "$ACTIVE_HEAD" != "$TARGET_SHA" ]]; then
  local_only_commits="$(git rev-list --count "$TARGET_SHA..$ACTIVE_HEAD" 2>/dev/null || echo 0)"
  target_only_commits="$(git rev-list --count "$ACTIVE_HEAD..$TARGET_SHA" 2>/dev/null || echo 0)"
  echo "Local commits not included in target: $local_only_commits"
  echo "Target commits not in active checkout: $target_only_commits"
  echo "Deployment intentionally targets the approved remote commit; local commits are not deployed."
fi

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
bash "$VALIDATION_WORKTREE/deploy/scripts/stage-release-env.sh" \
  "$PROJECT_DIR" "$VALIDATION_WORKTREE"
TARGET_BACKEND_ENV_FILE="$VALIDATION_WORKTREE/sawiyaa-backend-v1/.env.production"
TARGET_FRONTEND_ENV_FILE="$VALIDATION_WORKTREE/sawiyaa-frontend-v1/.env.production"

echo "Validating target-release environment contract and Compose model..."
if ! bash "$VALIDATION_WORKTREE/deploy/scripts/validate-production-preflight.sh" \
  --target-only --skip-lock \
  --project-dir "$VALIDATION_WORKTREE" \
  --environment production \
  --backend-env "$TARGET_BACKEND_ENV_FILE" \
  --frontend-env "$TARGET_FRONTEND_ENV_FILE"; then
  cleanup_validation_worktree
  [[ "$(git rev-parse HEAD)" == "$ACTIVE_HEAD" ]] || { echo "BLOCKING ACTIVE_RELEASE_CHANGED_ON_TARGET_FAILURE" >&2; exit 2; }
  echo "Target-release validation failed; active release was not changed." >&2
  exit 1
fi

cleanup_validation_worktree
echo "Target validation passed; materializing target in the active checkout."
assert_active_checkout_safe || {
  echo "Active checkout is not safe to overwrite; deployment stopped before checkout/reset." >&2
  exit 1
}
git checkout -f main
git reset --hard "$TARGET_SHA"

echo "Validating compose configuration..."
docker compose --env-file "$BACKEND_ENV_FILE" --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" config >/dev/null

echo "Starting PostgreSQL for database-backed environment checks..."
docker compose --env-file "$BACKEND_ENV_FILE" --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" up -d postgres
wait_for_postgres || exit 1
PROVIDER_STATE_FILE="$(mktemp "${TMPDIR:-/tmp}/sawiyaa-provider-state.XXXXXX")"
read_provider_state false || exit 1
if ! bash "$PROJECT_DIR/deploy/scripts/validate-production-preflight.sh" \
  --target-only --skip-lock \
  --project-dir "$PROJECT_DIR" \
  --environment production \
  --backend-env "$BACKEND_ENV_FILE" \
  --frontend-env "$FRONTEND_ENV_FILE" \
  --provider-state-file "$PROVIDER_STATE_FILE"; then
  echo "Database-backed environment validation failed; deployment stopped before build." >&2
  exit 1
fi

echo "Building backend and frontend images..."
docker compose --env-file "$BACKEND_ENV_FILE" --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" build backend frontend

echo "Validating backend runtime configuration before backup and migrations..."
docker compose --env-file "$BACKEND_ENV_FILE" --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" run --rm --no-deps backend \
  npm run config:validate:production || {
    echo "Backend runtime environment validation failed; backup and migrations were not run." >&2
    exit 1
  }

echo "Checking backend log bind-mount write access..."
LOG_MOUNT_CHECK_OUTPUT="$(mktemp "${TMPDIR:-/tmp}/sawiyaa-log-mount-check.XXXXXX")"
printf 'LOG_MOUNT_HOST_CWD=%s LOG_MOUNT_PROJECT_DIR=%s LOG_MOUNT_COMPOSE_FILE=%s COMPOSE_PROJECT_NAME=%s\n' \
  "$PWD" "$PROJECT_DIR" "$COMPOSE_FILE" "${COMPOSE_PROJECT_NAME:-}" 
set +e
docker compose --env-file "$BACKEND_ENV_FILE" --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" run --rm --no-deps backend \
  sh -lc 'set -eu
    printf "LOG_MOUNT_UID=%s LOG_MOUNT_GID=%s LOG_MOUNT_CWD=%s\n" "$(id -u)" "$(id -g)" "$PWD"
    ls -ldn /app/logs
    touch /app/logs/.write-test
    echo LOG_MOUNT_TOUCH=OK
    rm -f /app/logs/.write-test
    echo LOG_MOUNT_REMOVE=OK' >"$LOG_MOUNT_CHECK_OUTPUT" 2>&1
log_mount_check_exit=$?
set -e
cat "$LOG_MOUNT_CHECK_OUTPUT"
echo "LOG_MOUNT_CHECK_EXIT=$log_mount_check_exit"
if (( log_mount_check_exit != 0 )); then
    echo "Backend container user cannot write to /app/logs (host path: $PROJECT_DIR/logs/backend)" >&2
    exit 1
fi
rm -f -- "$LOG_MOUNT_CHECK_OUTPUT"
LOG_MOUNT_CHECK_OUTPUT=""

APPLIED_MIGRATIONS_FILE="$(mktemp "${TMPDIR:-/tmp}/sawiyaa-applied-migrations.XXXXXX")"
migration_table_exists="$(docker compose --env-file "$BACKEND_ENV_FILE" --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" exec -T \
  -e "POSTGRES_USER=$POSTGRES_USER" -e "POSTGRES_DB=$POSTGRES_DB" postgres sh -lc \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "SELECT to_regclass('\''public._prisma_migrations'\'') IS NOT NULL"' 2>/dev/null)" || {
    echo "Unable to check for the Prisma migrations table; migration was not run." >&2
    exit 1
  }
if [[ "$migration_table_exists" == "t" ]]; then
  docker compose --env-file "$BACKEND_ENV_FILE" --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" exec -T \
    -e "POSTGRES_USER=$POSTGRES_USER" -e "POSTGRES_DB=$POSTGRES_DB" postgres sh -lc \
    'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name"' > "$APPLIED_MIGRATIONS_FILE" || {
      echo "Unable to read applied Prisma migrations; migration was not run." >&2
      exit 1
    }
else
  : > "$APPLIED_MIGRATIONS_FILE"
fi

scanner_args=(--migrations-dir "$PROJECT_DIR/sawiyaa-backend-v1/prisma/migrations" --applied-file "$APPLIED_MIGRATIONS_FILE")
if [[ "$APPROVE_BLOCKING" == "true" ]]; then
  scanner_args+=(--approve-blocking-migrations)
fi
run_migration_safety_check() {
  local image="${SAWIYAA_VALIDATOR_NODE_IMAGE:-node:20-bookworm-slim}"
  if [[ "${SAWIYAA_FORCE_DOCKER_VALIDATOR:-false}" != "true" ]] &&
    command -v node >/dev/null 2>&1 &&
    node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 20 ? 0 : 1)' >/dev/null 2>&1; then
    node "$PROJECT_DIR/deploy/scripts/check-migration-safety.js" "${scanner_args[@]}"
    return $?
  fi

  docker_args=(
    run --rm
    --network none
    --read-only
    --tmpfs /tmp:rw,nosuid,nodev,size=16m
    -v "$PROJECT_DIR:/workspace:ro"
    -v "$APPLIED_MIGRATIONS_FILE:/inputs/applied-migrations.txt:ro"
    "$image" node /workspace/deploy/scripts/check-migration-safety.js
    --migrations-dir /workspace/sawiyaa-backend-v1/prisma/migrations
    --applied-file /inputs/applied-migrations.txt
  )
  if [[ "$APPROVE_BLOCKING" == "true" ]]; then
    docker_args+=(--approve-blocking-migrations)
  fi
  docker "${docker_args[@]}"
}
set +e
scanner_output="$(run_migration_safety_check 2>&1)"
scanner_exit=$?
set -e
printf '%s\n' "$scanner_output"
if (( scanner_exit != 0 )); then
  MIGRATION_STATUS="BLOCKED"
  echo "Migration safety checks failed; migration was not run." >&2
  exit 1
fi
MIGRATION_STATUS="$(printf '%s\n' "$scanner_output" | sed -n 's/^MIGRATIONS: //p' | head -n 1)"

echo "Creating and verifying database backup before migrations..."
BACKUP_TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
SAWIYAA_PROJECT_DIR="$PROJECT_DIR" \
SAWIYAA_COMPOSE_FILE="$PROJECT_DIR/$COMPOSE_FILE" \
SAWIYAA_BACKEND_ENV_FILE="$BACKEND_ENV_FILE" \
SAWIYAA_FRONTEND_ENV_FILE="$FRONTEND_ENV_FILE" \
SAWIYAA_TARGET_SHA="$TARGET_SHA" \
SAWIYAA_BACKUP_TIMESTAMP="$BACKUP_TIMESTAMP" \
  bash "$PROJECT_DIR/deploy/scripts/backup-db.sh"

SHORT_TARGET_SHA="${TARGET_SHA:0:12}"
DB_BACKUP_DIR="${SAWIYAA_BACKUP_DIR:-/opt/sawiyaa-backups/db}"
DB_BACKUP_FILE="$DB_BACKUP_DIR/sawiyaa-${BACKUP_TIMESTAMP}-${SHORT_TARGET_SHA}.dump"
echo "Creating and verifying unified file-volume backup matched to the database backup..."
SAWIYAA_PROJECT_DIR="$PROJECT_DIR" \
SAWIYAA_COMPOSE_FILE="$PROJECT_DIR/$COMPOSE_FILE" \
SAWIYAA_BACKEND_ENV_FILE="$BACKEND_ENV_FILE" \
SAWIYAA_FRONTEND_ENV_FILE="$FRONTEND_ENV_FILE" \
SAWIYAA_TARGET_SHA="$TARGET_SHA" \
SAWIYAA_BACKUP_TIMESTAMP="$BACKUP_TIMESTAMP" \
SAWIYAA_DB_BACKUP_FILE="$DB_BACKUP_FILE" \
SAWIYAA_BACKUP_DIR="${SAWIYAA_FILE_BACKUP_DIR:-/opt/sawiyaa-backups}" \
  bash "$PROJECT_DIR/deploy/scripts/backup-files.sh"

echo "Running unified production bootstrap (migrations, baseline seeds, and readiness verification)..."
bootstrap_env_args=(-e ALLOW_PRODUCTION_BASELINE_SEED=true)
if [[ "$ALLOW_PAYMENT_ROUTE_BOOTSTRAP" == "true" ]]; then
  bootstrap_env_args+=(-e ALLOW_PAYMENT_ROUTE_BOOTSTRAP=true)
fi
if [[ "$ALLOW_PAYMOB_CONTROL_BOOTSTRAP" == "true" ]]; then
  bootstrap_env_args+=(-e ALLOW_PAYMOB_CONTROL_BOOTSTRAP=true)
fi
for initial_admin_var in PRODUCTION_INITIAL_ADMIN_EMAIL PRODUCTION_INITIAL_ADMIN_NAME PRODUCTION_INITIAL_ADMIN_PASSWORD; do
  if [[ -n "${!initial_admin_var:-}" ]]; then
    bootstrap_env_args+=(-e "$initial_admin_var=${!initial_admin_var}")
  fi
done
docker compose --env-file "$BACKEND_ENV_FILE" --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" run --rm \
  "${bootstrap_env_args[@]}" backend npm run db:bootstrap:production
echo "PRODUCTION_BOOTSTRAP: SUCCESS"
read_provider_state true || exit 1
if ! bash "$PROJECT_DIR/deploy/scripts/validate-production-preflight.sh" \
  --target-only --skip-lock \
  --project-dir "$PROJECT_DIR" \
  --environment production \
  --backend-env "$BACKEND_ENV_FILE" \
  --frontend-env "$FRONTEND_ENV_FILE" \
  --provider-state-file "$PROVIDER_STATE_FILE"; then
  echo "Database-backed environment validation failed after bootstrap; deployment stopped before service start." >&2
  exit 1
fi

echo "Starting backend, frontend, and nginx..."
notification_queue_enabled="$(awk -F= '$1 == "NOTIFICATION_QUEUE_ENABLED" {gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2; exit}' "$BACKEND_ENV_FILE" 2>/dev/null || true)"
daily_queue_enabled="$(awk -F= '$1 == "DAILY_ATTENDANCE_QUEUE_ENABLED" {gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2; exit}' "$BACKEND_ENV_FILE" 2>/dev/null || true)"
queue_worker_enabled=false
if [[ "$notification_queue_enabled" == "true" || "$daily_queue_enabled" == "true" ]]; then
  queue_worker_enabled=true
fi
docker compose --env-file "$BACKEND_ENV_FILE" --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" up -d backend frontend nginx
if [[ "$queue_worker_enabled" == "true" ]]; then
  docker compose --env-file "$BACKEND_ENV_FILE" --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" up -d worker
else
  docker compose --env-file "$BACKEND_ENV_FILE" --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" stop worker >/dev/null 2>&1 || true
fi

compose_running_services="$(docker compose --env-file "$BACKEND_ENV_FILE" --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" ps --status running --services)"
for required_service in postgres backend frontend nginx; do
  grep -Fxq "$required_service" <<<"$compose_running_services" || {
    echo "Required production service is not running: $required_service" >&2
    exit 1
  }
done
if [[ "$queue_worker_enabled" == "true" ]]; then
  grep -Fxq worker <<<"$compose_running_services" || {
    echo "Configured queue worker is not running: worker" >&2
    exit 1
  }
fi

for healthy_service in postgres backend frontend; do
  container_id="$(docker compose --env-file "$BACKEND_ENV_FILE" --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" ps -q "$healthy_service")"
  health_status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$container_id" 2>/dev/null || true)"
  [[ "$health_status" == "healthy" ]] || {
    echo "Required production service is not healthy: $healthy_service ($health_status)" >&2
    exit 1
  }
done
echo "PostgreSQL, backend, and frontend healthchecks are healthy; nginx is running."

run_public_health_check() {
  local check_name="$1"
  local check_url="$2"
  local check_args=(curl -fsS)
  if [[ "$check_name" == "frontend" ]]; then
    check_args+=(--location)
  fi
  check_args+=("$check_url")
  echo "PUBLIC_HEALTH_CHECK_BEGIN name=$check_name url=$check_url"
  set +e
  "${check_args[@]}" >/dev/null
  local check_exit=$?
  set -e
  echo "PUBLIC_HEALTH_CHECK_EXIT name=$check_name exit=$check_exit"
  (( check_exit == 0 ))
}

echo "Waiting for backend health..."
for attempt in {1..30}; do
  if run_public_health_check backend https://sawiyaa.com/api/v1/health; then break; fi
  sleep 5
done
run_public_health_check backend https://sawiyaa.com/api/v1/health

echo "Waiting for frontend health..."
for attempt in {1..30}; do
  if run_public_health_check frontend https://sawiyaa.com; then break; fi
  sleep 5
done
run_public_health_check frontend https://sawiyaa.com

payment_status="DISABLED"
if [[ -s "$PROVIDER_STATE_FILE" ]] && grep -Eq '^(stripe|paymob)=true$' "$PROVIDER_STATE_FILE"; then
  payment_status="READY"
fi
notification_queue_enabled="$(awk -F= '$1 == "NOTIFICATION_QUEUE_ENABLED" {gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2; exit}' "$BACKEND_ENV_FILE" 2>/dev/null || true)"
daily_queue_enabled="$(awk -F= '$1 == "DAILY_ATTENDANCE_QUEUE_ENABLED" {gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2; exit}' "$BACKEND_ENV_FILE" 2>/dev/null || true)"
redis_status="DISABLED"
if [[ "$queue_worker_enabled" == "true" ]]; then
  redis_status="READY"
fi

echo "Sawiyaa Production Deployment"
echo "Preflight: PASSED"
echo "PostgreSQL: HEALTHY"
echo "Migrations: PASSED"
echo "Production baseline: PASSED"
echo "Session policies: READY"
echo "Initial Super Admin: READY"
echo "Payment configuration: $payment_status"
echo "Redis queues: $redis_status"
echo "Production verification: PASSED"
echo "Backend: HEALTHY"
echo "Frontend: HEALTHY"
echo "Nginx: HEALTHY"
echo "DEPLOYMENT SUCCESSFUL"

echo "RELEASE_MARKER_BEGIN path=$RELEASE_MARKER"
mkdir -p -- "$(dirname -- "$RELEASE_MARKER")"
echo "RELEASE_MARKER_DIRECTORY=READY"
marker_tmp="$(mktemp "${RELEASE_MARKER}.XXXXXX")"
echo "RELEASE_MARKER_TEMP=READY"
printf 'targetSha=%s\ndeployedAt=%s\nstatus=success\n' \
  "$TARGET_SHA" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$marker_tmp"
echo "RELEASE_MARKER_WRITE=READY"
mv -- "$marker_tmp" "$RELEASE_MARKER"
echo "RELEASE_MARKER_MOVE=READY"

printf 'MIGRATIONS: %s\nMIGRATE_DEPLOY: SUCCESS\n' "$MIGRATION_STATUS"
echo "Deployment completed successfully."
