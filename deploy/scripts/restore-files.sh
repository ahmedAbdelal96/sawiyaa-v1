#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

export COMPOSE_PROJECT_NAME=sawiyaa
PROJECT_DIR="${SAWIYAA_PROJECT_DIR:-/opt/sawiyaa}"
COMPOSE_FILE="${SAWIYAA_COMPOSE_FILE:-$PROJECT_DIR/docker-compose.prod.yml}"
BACKEND_ENV_FILE="${SAWIYAA_BACKEND_ENV_FILE:-$PROJECT_DIR/sawiyaa-backend-v1/.env.production}"
FRONTEND_ENV_FILE="${SAWIYAA_FRONTEND_ENV_FILE:-$PROJECT_DIR/sawiyaa-frontend-v1/.env.production}"
BACKEND_SERVICE="${SAWIYAA_BACKEND_SERVICE:-backend}"
BUNDLE="${1:-}"

[[ -n "$BUNDLE" && -f "$BUNDLE" ]] || { printf 'Usage: restore-files.sh /path/to/sawiyaa-*.files.tar.gz\n' >&2; exit 2; }
[[ "$(basename "$BUNDLE")" =~ ^sawiyaa-[0-9]{8}-[0-9]{6}-[0-9a-fA-F]{7,12}\.files\.tar\.gz$ ]] || { printf 'Refusing an unrecognised bundle name\n' >&2; exit 2; }
[[ -f "$BUNDLE.sha256" ]] || { printf 'Missing checksum sidecar\n' >&2; exit 1; }
sha256sum --check "$BUNDLE.sha256" >/dev/null || { printf 'Checksum verification failed\n' >&2; exit 1; }
[[ "${SAWIYAA_CONFIRM_FILE_RESTORE:-}" == "YES" ]] || { printf 'Set SAWIYAA_CONFIRM_FILE_RESTORE=YES after stopping writes and verifying the matching database backup.\n' >&2; exit 2; }

cd "$PROJECT_DIR"
[[ -r "$BACKEND_ENV_FILE" && -r "$FRONTEND_ENV_FILE" ]] || { printf 'Canonical Compose environment files are not readable\n' >&2; exit 1; }
compose_args=(--env-file "$BACKEND_ENV_FILE" --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE")
docker compose "${compose_args[@]}" exec -T "$BACKEND_SERVICE" sh -lc 'tar -C /app/storage -xzf - --no-same-owner --no-same-permissions' < "$BUNDLE"
printf 'FILE RESTORE: VERIFIED\n'
