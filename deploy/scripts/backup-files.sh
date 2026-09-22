#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

export COMPOSE_PROJECT_NAME=sawiyaa
PROJECT_DIR="${SAWIYAA_PROJECT_DIR:-/opt/sawiyaa}"
BACKUP_DIR="${SAWIYAA_BACKUP_DIR:-/opt/sawiyaa-backups}"
COMPOSE_FILE="${SAWIYAA_COMPOSE_FILE:-$PROJECT_DIR/docker-compose.prod.yml}"
COMPOSE_ENV_FILE="${SAWIYAA_COMPOSE_ENV_FILE:-$PROJECT_DIR/sawiyaa-frontend-v1/.env}"
BACKEND_SERVICE="${SAWIYAA_BACKEND_SERVICE:-backend}"
TARGET_SHA="${SAWIYAA_TARGET_SHA:-unknown}"
RETENTION_COUNT="${SAWIYAA_BACKUP_RETENTION_COUNT:-20}"
TIMESTAMP="${SAWIYAA_BACKUP_TIMESTAMP:-$(date -u +%Y%m%d-%H%M%S)}"
DB_BACKUP="${SAWIYAA_DB_BACKUP_FILE:-}"

fail() { printf 'FILE BACKUP: FAILED: %s\n' "$1" >&2; exit 1; }
[[ -f "$COMPOSE_FILE" ]] || fail "Compose file not found"
[[ "$TIMESTAMP" =~ ^[0-9]{8}-[0-9]{6}$ ]] || fail "SAWIYAA_BACKUP_TIMESTAMP has an invalid format"
[[ "$RETENTION_COUNT" =~ ^[0-9]+$ ]] || fail "SAWIYAA_BACKUP_RETENTION_COUNT must be an integer"
mkdir -p -- "$BACKUP_DIR" || fail "Backup directory is unavailable"
[[ -w "$BACKUP_DIR" ]] || fail "Backup directory is not writable"

cd "$PROJECT_DIR"
compose_args=(-f "$COMPOSE_FILE")
if [[ -n "$COMPOSE_ENV_FILE" ]]; then
  [[ -r "$COMPOSE_ENV_FILE" ]] || fail "Compose environment file is not readable"
  compose_args+=(--env-file "$COMPOSE_ENV_FILE")
fi
docker compose "${compose_args[@]}" ps --status running --services | grep -Fxq "$BACKEND_SERVICE" || fail "Backend service is not running"

short_sha="${TARGET_SHA:0:12}"
[[ "$short_sha" =~ ^[0-9a-fA-F]{7,12}$ ]] || short_sha="unknown"
base="sawiyaa-${TIMESTAMP}-${short_sha}"
bundle="$BACKUP_DIR/${base}.files.tar.gz"
checksum_file="$bundle.sha256"
metadata_file="$bundle.metadata.json"
tmp_bundle="$(mktemp "$BACKUP_DIR/.${base}.files.XXXXXX")"
tmp_checksum="$(mktemp "$BACKUP_DIR/.${base}.sha256.XXXXXX")"
tmp_metadata="$(mktemp "$BACKUP_DIR/.${base}.metadata.XXXXXX")"
cleanup() { rm -f -- "$tmp_bundle" "$tmp_checksum" "$tmp_metadata" || true; }
trap cleanup EXIT

docker compose "${compose_args[@]}" exec -T "$BACKEND_SERVICE" sh -lc \
  'tar -C /app/storage -czf - files' > "$tmp_bundle" || fail "Unified file volume archive failed"
size="$(wc -c < "$tmp_bundle")"
(( size > 0 )) || fail "Unified file volume archive is empty"
sha256sum "$tmp_bundle" > "$tmp_checksum" || fail "File archive checksum generation failed"
sha256sum --check "$tmp_checksum" >/dev/null || fail "File archive checksum verification failed"
checksum="$(awk '{print $1}' "$tmp_checksum")"
sed "s#$(basename "$tmp_bundle")#$(basename "$bundle")#" "$tmp_checksum" > "$tmp_checksum.final"
mv -- "$tmp_checksum.final" "$tmp_checksum"

db_name=""
if [[ -n "$DB_BACKUP" ]]; then db_name="$(basename "$DB_BACKUP")"; fi
cat > "$tmp_metadata" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "targetGitSha": "$TARGET_SHA",
  "storageRoot": "/app/storage/files",
  "bundleFilename": "$(basename "$bundle")",
  "bundleSize": $size,
  "checksum": "$checksum",
  "databaseBackupFilename": "$db_name",
  "verificationStatus": "VERIFIED"
}
EOF

mv -- "$tmp_bundle" "$bundle"
mv -- "$tmp_checksum" "$checksum_file"
mv -- "$tmp_metadata" "$metadata_file"
trap - EXIT

mapfile -t bundles < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'sawiyaa-*.files.tar.gz' -printf '%T@ %p\n' | sort -nr | awk '{print $2}')
if (( ${#bundles[@]} > RETENTION_COUNT )); then
  for old_bundle in "${bundles[@]:RETENTION_COUNT}"; do
    old_base="${old_bundle%.files.tar.gz}"
    rm -f -- "$old_bundle" "$old_bundle.sha256" "$old_bundle.metadata.json" || printf 'WARNING file retention cleanup failed\n' >&2
  done
fi

printf 'FILE BACKUP: VERIFIED\nBundle: %s\nChecksum: %s\nMetadata: %s\n' "$bundle" "$checksum_file" "$metadata_file"
