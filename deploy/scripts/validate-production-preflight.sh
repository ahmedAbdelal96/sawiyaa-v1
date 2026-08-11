#!/usr/bin/env bash
set -Eeuo pipefail

export COMPOSE_PROJECT_NAME=sawiyaa
# Phase 0A read-only preflight. It never fetches, resets, builds, starts,
# recreates, migrates, seeds, backs up, or modifies environment files.
PROJECT_DIR="${SAWIYAA_PROJECT_DIR:-$(pwd)}"
ENVIRONMENT=production
BACKEND_ENV=""; FRONTEND_ENV=""; DB_ENV=""; COMPOSE_FILE=""
MIN_FREE_MB="${SAWIYAA_MIN_FREE_MB:-2048}"
LOCK_PATH="${SAWIYAA_DEPLOY_LOCK:-/tmp/sawiyaa-production-deploy.lock}"
MOCK=0; CHECK_LOCK_ONLY=0; SKIP_LOCK=0; BOOTSTRAP_ONLY=0; TARGET_ONLY=0; BLOCKERS=0; WARNINGS=0; TEMP_DIR=""; COMPOSE_MODEL_OK=0
BACKEND_IMAGE=""; FRONTEND_IMAGE=""; PROVIDER_STATE_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-dir) PROJECT_DIR="$2"; shift 2;;
    --environment) ENVIRONMENT="$2"; shift 2;;
    --backend-env) BACKEND_ENV="$2"; shift 2;;
    --frontend-env) FRONTEND_ENV="$2"; shift 2;;
    --db-env) DB_ENV="$2"; shift 2;;
    --compose-file) COMPOSE_FILE="$2"; shift 2;;
    --min-free-mb) MIN_FREE_MB="$2"; shift 2;;
    --lock-path) LOCK_PATH="$2"; shift 2;;
    --check-lock-only) CHECK_LOCK_ONLY=1; shift;;
    --skip-lock) SKIP_LOCK=1; shift;;
    --bootstrap-only) BOOTSTRAP_ONLY=1; shift;;
    --target-only) TARGET_ONLY=1; shift;;
    --backend-image) BACKEND_IMAGE="$2"; shift 2;;
    --frontend-image) FRONTEND_IMAGE="$2"; shift 2;;
    --provider-state-file) PROVIDER_STATE_FILE="$2"; shift 2;;
    --mock) MOCK=1; shift;;
    -h|--help) sed -n 's/^# //p' "$0"; exit 0;;
    *) printf 'BLOCKING UNKNOWN_ARGUMENT\n'; exit 2;;
  esac
done

block() { printf 'BLOCKING %s\n' "$1"; BLOCKERS=$((BLOCKERS + 1)); }
warn() { printf 'WARNING %s\n' "$1"; WARNINGS=$((WARNINGS + 1)); }
pass() { printf 'PASS %s\n' "$1"; }
skip() { printf 'SKIPPED %s\n' "$1"; }
cleanup() {
  if [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" ]]; then
    rm -rf -- "$TEMP_DIR" || true
  fi
  return 0
}
trap cleanup EXIT

if (( ! SKIP_LOCK )); then
  # 1. Lock availability/acquisition.
  if ! command -v flock >/dev/null 2>&1; then
    block LOCK_FLOCK_UNAVAILABLE
  else
    mkdir -p -- "$(dirname -- "$LOCK_PATH")"
    exec 9>"$LOCK_PATH"
    if flock -n 9; then
      printf 'pid=%s\nstarted=%s\n' "$$" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >&9
      pass LOCK_ACQUIRED
    else
      block LOCK_ALREADY_HELD
      owner_pid="$(awk -F= '$1 == "pid" {print $2; exit}' "$LOCK_PATH" 2>/dev/null || true)"
      [[ "$owner_pid" =~ ^[0-9]+$ ]] && printf 'LOCK_OWNER_PID %s\n' "$owner_pid"
    fi
  fi
fi
if [[ "$CHECK_LOCK_ONLY" == 1 ]]; then (( BLOCKERS == 0 )); exit; fi

# 2-5. Project, repository, branch/commit and Git cleanliness.
if [[ -d "$PROJECT_DIR" ]]; then pass PROJECT_DIRECTORY; else block PROJECT_DIRECTORY; fi
if git -C "$PROJECT_DIR" rev-parse --git-dir >/dev/null 2>&1; then
  pass GIT_REPOSITORY
  if (( ! TARGET_ONLY )); then
    branch="$(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null || true)"
    head="$(git -C "$PROJECT_DIR" rev-parse --short=12 HEAD 2>/dev/null || true)"
    [[ -n "$branch" ]] && pass "GIT_BRANCH $branch" || block GIT_BRANCH
    [[ -n "$head" ]] && pass "GIT_HEAD $head" || block GIT_HEAD
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      code="${line:0:2}"; item="${line:3}"
      if [[ "$code" != "??" ]]; then
        block "GIT_TRACKED_DIRTY $item"
      else
        case "$item" in
          deploy/certs/*|deploy/certbot-logs/*|deploy-build.pid|*.before-*) pass "GIT_ALLOWED_UNTRACKED $item";;
          *) block "GIT_UNEXPECTED_UNTRACKED $item";;
        esac
      fi
    done < <(git -C "$PROJECT_DIR" status --porcelain=v1 --untracked-files=all 2>/dev/null || true)
  else
    pass TARGET_WORKTREE
  fi
else
  block GIT_REPOSITORY
fi

# 7-8. Docker/Compose availability.
if (( MOCK )); then
  warn DOCKER_MOCKED
else
  command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 && pass DOCKER_AVAILABLE || block DOCKER_UNAVAILABLE_OR_UNHEALTHY
  docker compose version >/dev/null 2>&1 && pass DOCKER_COMPOSE_AVAILABLE || block DOCKER_COMPOSE_UNAVAILABLE
fi

# 9-10. Environment files and status-only validator.
BACKEND_ENV="${BACKEND_ENV:-$PROJECT_DIR/sawiyaa-backend-v1/.env}"
FRONTEND_ENV="${FRONTEND_ENV:-$PROJECT_DIR/sawiyaa-frontend-v1/.env}"
DB_ENV="${DB_ENV:-$PROJECT_DIR/sawiyaa-backend-v1/.env.postgres}"
for file in "$BACKEND_ENV" "$FRONTEND_ENV" "$DB_ENV"; do
  [[ -r "$file" ]] && pass "ENV_FILE_PRESENT $(basename -- "$file")" || block "ENV_FILE_MISSING $(basename -- "$file")"
done

if (( BOOTSTRAP_ONLY )); then
  if [[ -d "$PROJECT_DIR" ]]; then
    free_kb="$(df -Pk "$PROJECT_DIR" | awk 'NR == 2 {print $4}')"
    [[ "$free_kb" =~ ^[0-9]+$ ]] && (( free_kb >= MIN_FREE_MB * 1024 )) && pass DISK_SPACE || block DISK_SPACE_BELOW_THRESHOLD
  else
    block DISK_SPACE_PROJECT_UNAVAILABLE
  fi
  printf 'PREFLIGHT_SUMMARY blockers=%s warnings=%s\n' "$BLOCKERS" "$WARNINGS"
  (( BLOCKERS == 0 ))
  exit
fi

VALIDATOR="$PROJECT_DIR/deploy/scripts/validate-environment-contract.js"
contract_exit=1

run_environment_validator() {
  local validator="$1"
  local project_root="$2"
  local backend_env="$3"
  local frontend_env="$4"
  local db_env="$5"
  local image="${SAWIYAA_VALIDATOR_NODE_IMAGE:-node:20-bookworm-slim}"
  local provider_args=()
  if [[ -n "$PROVIDER_STATE_FILE" ]]; then
    provider_args+=(--provider-state-file "$PROVIDER_STATE_FILE")
  fi

  if [[ "${SAWIYAA_FORCE_DOCKER_VALIDATOR:-false}" != "true" ]] &&
    command -v node >/dev/null 2>&1 &&
    node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 20 ? 0 : 1)' >/dev/null 2>&1; then
    node "$validator" \
      --backend-env "$backend_env" \
      --frontend-env "$frontend_env" \
      --db-env "$db_env" \
      --environment "$ENVIRONMENT" \
      "${provider_args[@]}"
    return $?
  fi

  if ! command -v docker >/dev/null 2>&1; then
    echo "ENVIRONMENT_VALIDATOR_RUNTIME_UNAVAILABLE: compatible host Node.js and Docker are unavailable" >&2
    return 127
  fi

  local docker_mount_args=()
  local docker_provider_args=()
  if [[ -n "$PROVIDER_STATE_FILE" ]]; then
    docker_mount_args+=( -v "$PROVIDER_STATE_FILE:/inputs/provider-state.txt:ro" )
    docker_provider_args+=( --provider-state-file /inputs/provider-state.txt )
  fi
  docker run --rm \
    --network none \
    --read-only \
    --tmpfs /tmp:rw,nosuid,nodev,size=16m \
    -v "$project_root:/workspace:ro" \
    -v "$backend_env:/inputs/backend.env:ro" \
    -v "$frontend_env:/inputs/frontend.env:ro" \
    -v "$db_env:/inputs/db.env:ro" \
    "${docker_mount_args[@]}" \
    "$image" node /workspace/deploy/scripts/validate-environment-contract.js \
    --backend-env /inputs/backend.env \
    --frontend-env /inputs/frontend.env \
    --db-env /inputs/db.env \
    --environment "$ENVIRONMENT" \
    "${docker_provider_args[@]}"
}

if [[ -f "$VALIDATOR" ]]; then
  TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/sawiyaa-preflight.XXXXXX")"
  set +e
  run_environment_validator "$VALIDATOR" "$PROJECT_DIR" "$BACKEND_ENV" "$FRONTEND_ENV" "$DB_ENV" >"$TEMP_DIR/contract.txt"
  contract_exit=$?
  set -e
  cat "$TEMP_DIR/contract.txt"
  (( contract_exit == 0 )) && pass ENVIRONMENT_CONTRACT || block ENVIRONMENT_CONTRACT
else
  block ENVIRONMENT_VALIDATOR_MISSING
fi

# 11. GeoIP file check without printing its value.
geoip_enabled=""; geoip_path=""
if [[ -r "$BACKEND_ENV" ]]; then
  geoip_enabled="$(awk -F= '$1 == "GEOIP_ENABLED" {gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2; exit}' "$BACKEND_ENV")"
  geoip_path="$(awk -F= '$1 == "GEOIP_DATABASE_PATH" {sub(/^[ \t]+/, "", $2); print $2; exit}' "$BACKEND_ENV")"
fi
if [[ "$geoip_enabled" == true ]]; then
  [[ -n "$geoip_path" ]] && [[ -r "$geoip_path" && -s "$geoip_path" ]] && pass GEOIP_FILE_READABLE || block GEOIP_FILE_MISSING_OR_UNREADABLE
else
  pass GEOIP_NOT_REQUIRED
fi

# 12. Disk threshold.
if [[ -d "$PROJECT_DIR" ]]; then
  free_kb="$(df -Pk "$PROJECT_DIR" | awk 'NR == 2 {print $4}')"
  [[ "$free_kb" =~ ^[0-9]+$ ]] && (( free_kb >= MIN_FREE_MB * 1024 )) && pass DISK_SPACE || block DISK_SPACE_BELOW_THRESHOLD
else
  block DISK_SPACE_PROJECT_UNAVAILABLE
fi

# 13-14. Compose model validation against the release's canonical env files.
COMPOSE_FILE="${COMPOSE_FILE:-$PROJECT_DIR/docker-compose.prod.yml}"
if [[ ! -f "$COMPOSE_FILE" ]]; then
  block COMPOSE_FILE_MISSING
elif (( MOCK )); then
  warn COMPOSE_VALIDATION_MOCKED
elif (( contract_exit != 0 )) || [[ ! -r "$BACKEND_ENV" || ! -r "$FRONTEND_ENV" || ! -r "$DB_ENV" ]]; then
  skip COMPOSE_VALIDATION_DEPENDENCY_ENVIRONMENT_CONTRACT
else
  if [[ -z "$TEMP_DIR" ]]; then TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/sawiyaa-preflight.XXXXXX")"; fi
  compose_error="$TEMP_DIR/compose-config.err"
  if docker compose --env-file "$FRONTEND_ENV" -f "$COMPOSE_FILE" config --quiet > /dev/null 2>"$compose_error"; then
    COMPOSE_MODEL_OK=1
    pass COMPOSE_MODEL
  else
    echo "SANITIZED_COMPOSE_CONFIG_ERROR_BEGIN"
    sed -E 's/([A-Za-z_]*(password|secret|token|api[_-]?key|authorization|database[_-]?url)[A-Za-z_]*[=:][[:space:]]*)[^[:space:],;]+/\1[REDACTED]/Ig' "$compose_error" | head -n 80
    echo "SANITIZED_COMPOSE_CONFIG_ERROR_END"
    block COMPOSE_MODEL_INVALID
  fi
fi

# 15-16. PostgreSQL running and non-mutating readiness/connectivity.
if (( MOCK )); then
  warn POSTGRES_CHECK_MOCKED
elif (( COMPOSE_MODEL_OK == 0 )); then
  skip POSTGRES_CHECK_COMPOSE_MODEL_INVALID
elif (( contract_exit == 0 )) && [[ -f "$COMPOSE_FILE" ]]; then
  docker compose --env-file "$FRONTEND_ENV" -f "$COMPOSE_FILE" ps --status running --services 2>/dev/null | grep -Fxq postgres && pass POSTGRES_CONTAINER_RUNNING || block POSTGRES_CONTAINER_UNAVAILABLE
  docker compose --env-file "$FRONTEND_ENV" -f "$COMPOSE_FILE" exec -T postgres pg_isready >/dev/null 2>&1 && pass POSTGRES_CONNECTIVITY || block POSTGRES_UNHEALTHY
else
  skip POSTGRES_CHECK_DEPENDENCY_ENVIRONMENT_CONTRACT
fi

# 17-18. Presence-only operational inputs.
[[ -f "$PROJECT_DIR/deploy/scripts/backup-db.sh" ]] && pass BACKUP_SCRIPT_PRESENT || block BACKUP_SCRIPT_MISSING
if [[ -n "$BACKEND_IMAGE$FRONTEND_IMAGE" ]]; then
  [[ -n "$BACKEND_IMAGE" && -n "$FRONTEND_IMAGE" ]] && pass TARGET_IMAGES_SUPPLIED || block TARGET_IMAGES_INCOMPLETE
else
  pass TARGET_IMAGES_NOT_REQUIRED_PHASE_0A
fi

# 19. Final summary.
printf 'PREFLIGHT_SUMMARY blockers=%s warnings=%s\n' "$BLOCKERS" "$WARNINGS"
(( BLOCKERS == 0 ))
