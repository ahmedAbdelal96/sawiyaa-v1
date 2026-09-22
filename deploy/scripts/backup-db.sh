#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

export COMPOSE_PROJECT_NAME=sawiyaa
PROJECT_DIR="${SAWIYAA_PROJECT_DIR:-/opt/sawiyaa}"
BACKUP_DIR="${SAWIYAA_BACKUP_DIR:-/opt/sawiyaa-backups/db}"
COMPOSE_FILE="${SAWIYAA_COMPOSE_FILE:-$PROJECT_DIR/docker-compose.prod.yml}"
COMPOSE_ENV_FILE="${SAWIYAA_COMPOSE_ENV_FILE:-$PROJECT_DIR/sawiyaa-frontend-v1/.env}"
DB_SERVICE="${SAWIYAA_DB_SERVICE:-postgres}"
TARGET_SHA="${SAWIYAA_TARGET_SHA:-unknown}"
RETENTION_COUNT="${SAWIYAA_BACKUP_RETENTION_COUNT:-20}"
MIN_BACKUP_BYTES="${SAWIYAA_BACKUP_MIN_BYTES:-1024}"
TIMESTAMP="${SAWIYAA_BACKUP_TIMESTAMP:-$(date -u +%Y%m%d-%H%M%S)}"
SHORT_SHA="${TARGET_SHA:0:12}"
[[ "$SHORT_SHA" =~ ^[0-9a-fA-F]{7,12}$ ]] || SHORT_SHA="unknown"
BASE_NAME="sawiyaa-${TIMESTAMP}-${SHORT_SHA}"

fail() { printf 'BACKUP: FAILED: %s\n' "$1" >&2; exit 1; }

[[ -f "$COMPOSE_FILE" ]] || fail "Compose file not found"
[[ "$RETENTION_COUNT" =~ ^[0-9]+$ ]] || fail "SAWIYAA_BACKUP_RETENTION_COUNT must be an integer"
[[ "$MIN_BACKUP_BYTES" =~ ^[0-9]+$ ]] || fail "SAWIYAA_BACKUP_MIN_BYTES must be an integer"
mkdir -p -- "$BACKUP_DIR" || fail "Backup directory is unavailable"
[[ -d "$BACKUP_DIR" && -w "$BACKUP_DIR" ]] || fail "Backup directory is not writable"

cd "$PROJECT_DIR"
compose_args=(-f "$COMPOSE_FILE")
if [[ -n "$COMPOSE_ENV_FILE" ]]; then
  [[ -r "$COMPOSE_ENV_FILE" ]] || fail "Compose environment file is not readable"
  compose_args+=(--env-file "$COMPOSE_ENV_FILE")
fi
docker compose "${compose_args[@]}" ps --status running --services | grep -Fxq "$DB_SERVICE" || fail "Database service is not running"

dump_file="$BACKUP_DIR/${BASE_NAME}.dump"
checksum_file="$dump_file.sha256"
metadata_file="$dump_file.metadata.json"
tmp_dump="$(mktemp "$BACKUP_DIR/.${BASE_NAME}.dump.XXXXXX")"
tmp_checksum="$(mktemp "$BACKUP_DIR/.${BASE_NAME}.sha256.XXXXXX")"
tmp_final_checksum="$(mktemp "$BACKUP_DIR/.${BASE_NAME}.sha256.final.XXXXXX")"
tmp_metadata="$(mktemp "$BACKUP_DIR/.${BASE_NAME}.metadata.json.XXXXXX")"
cleanup() {
  rm -f -- "$tmp_dump" "$tmp_checksum" "$tmp_final_checksum" "$tmp_metadata" || true
  return 0
}
trap cleanup EXIT

free_kb="$(df -Pk "$BACKUP_DIR" | awk 'NR == 2 {print $4}')"
min_free_mb="${SAWIYAA_BACKUP_MIN_FREE_MB:-2048}"
[[ "$free_kb" =~ ^[0-9]+$ && "$min_free_mb" =~ ^[0-9]+$ ]] || fail "Unable to determine backup disk space"
(( free_kb >= min_free_mb * 1024 )) || fail "Backup disk space is below threshold"

docker compose "${compose_args[@]}" exec -T "$DB_SERVICE" sh -lc \
  'pg_dump -Fc --no-owner --no-acl -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$tmp_dump" || fail "pg_dump failed"

dump_size="$(wc -c < "$tmp_dump")"
(( dump_size >= MIN_BACKUP_BYTES )) || fail "Backup dump is empty or below minimum size"
sha256sum "$tmp_dump" > "$tmp_checksum" || fail "Checksum generation failed"
sha256sum --check "$tmp_checksum" >/dev/null || fail "Checksum verification failed"
docker compose "${compose_args[@]}" exec -T "$DB_SERVICE" pg_restore --list < "$tmp_dump" >/dev/null ||
  fail "pg_restore structure verification failed in the PostgreSQL container"

checksum="$(awk '{print $1}' "$tmp_checksum")"
sed "s#$(basename "$tmp_dump")#$(basename "$dump_file")#" "$tmp_checksum" > "$tmp_final_checksum"
postgres_version="$(docker compose "${compose_args[@]}" exec -T "$DB_SERVICE" sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "SELECT version()"' 2>/dev/null | head -n 1 || true)"
postgres_version="${postgres_version//\\/\\\\}"
postgres_version="${postgres_version//\"/\\\"}"
cat > "$tmp_metadata" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "targetGitSha": "$TARGET_SHA",
  "databaseService": "$DB_SERVICE",
  "postgresVersion": "$postgres_version",
  "dumpFilename": "$(basename "$dump_file")",
  "dumpSize": $dump_size,
  "checksum": "$checksum",
  "verificationStatus": "VERIFIED"
}
EOF

mv -- "$tmp_dump" "$dump_file"
mv -- "$tmp_final_checksum" "$checksum_file"
mv -- "$tmp_metadata" "$metadata_file"
trap - EXIT

mapfile -t verified_dumps < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'sawiyaa-*.dump' -printf '%T@ %p\n' | sort -nr | awk '{print $2}')
if (( ${#verified_dumps[@]} > RETENTION_COUNT )); then
  for old_dump in "${verified_dumps[@]:RETENTION_COUNT}"; do
    [[ "$old_dump" == "$dump_file" ]] && continue
    old_base="${old_dump%.dump}"
    [[ "$old_base" =~ /sawiyaa-[0-9]{8}-[0-9]{6}-[0-9a-fA-F]{7,12}$ ]] || continue
    rm -f -- "$old_dump" "$old_dump.sha256" "$old_dump.metadata.json" || printf 'WARNING retention cleanup failed\n' >&2
  done
fi

printf 'BACKUP: VERIFIED\n'
printf 'Backup file: %s\nChecksum file: %s\nMetadata file: %s\n' "$dump_file" "$checksum_file" "$metadata_file"
