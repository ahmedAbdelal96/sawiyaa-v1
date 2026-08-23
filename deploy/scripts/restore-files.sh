#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

export COMPOSE_PROJECT_NAME=sawiyaa
PROJECT_DIR="${SAWIYAA_PROJECT_DIR:-/opt/sawiyaa}"
COMPOSE_FILE="${SAWIYAA_COMPOSE_FILE:-$PROJECT_DIR/docker-compose.prod.yml}"
COMPOSE_ENV_FILE="${SAWIYAA_COMPOSE_ENV_FILE:-$PROJECT_DIR/sawiyaa-frontend-v1/.env}"
BACKEND_SERVICE="${SAWIYAA_BACKEND_SERVICE:-backend}"
BUNDLE="${1:-}"

[[ -n "$BUNDLE" && -f "$BUNDLE" ]] || { printf 'Usage: restore-files.sh /path/to/sawiyaa-*.files.tar.gz\n' >&2; exit 2; }
[[ "$(basename "$BUNDLE")" =~ ^sawiyaa-[0-9]{8}-[0-9]{6}-[0-9a-fA-F]{7,12}\.files\.tar\.gz$ ]] || { printf 'Refusing an unrecognised bundle name\n' >&2; exit 2; }
[[ -f "$BUNDLE.sha256" ]] || { printf 'Missing checksum sidecar\n' >&2; exit 1; }
sha256sum --check "$BUNDLE.sha256" >/dev/null || { printf 'Checksum verification failed\n' >&2; exit 1; }
[[ "${SAWIYAA_CONFIRM_FILE_RESTORE:-}" == "YES" ]] || { printf 'Set SAWIYAA_CONFIRM_FILE_RESTORE=YES after stopping writes and verifying the matching database backup.\n' >&2; exit 2; }

cd "$PROJECT_DIR"
compose_args=(-f "$COMPOSE_FILE")
if [[ -n "$COMPOSE_ENV_FILE" ]]; then compose_args+=(--env-file "$COMPOSE_ENV_FILE"); fi
docker compose "${compose_args[@]}" exec -T "$BACKEND_SERVICE" sh -lc 'tar -C /app/storage -xzf - --no-same-owner --no-same-permissions' < "$BUNDLE"
printf 'FILE RESTORE: VERIFIED\n'
