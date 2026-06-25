#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

PROJECT_DIR="${SAWIYAA_PROJECT_DIR:-/opt/sawiyaa}"
BACKUP_DIR="${SAWIYAA_BACKUP_DIR:-/opt/sawiyaa-backups/db}"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/sawiyaa-db-$TIMESTAMP.dump"
CHECKSUM_FILE="$BACKUP_FILE.sha256"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
cd "$PROJECT_DIR"

if ! docker compose -f "$COMPOSE_FILE" ps --status running --services | grep -Fxq postgres; then
  echo "Postgres service is not running" >&2
  exit 1
fi

docker compose -f "$COMPOSE_FILE" exec -T postgres sh -lc 'pg_dump -Fc --no-owner --no-acl -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$BACKUP_FILE"
sha256sum "$BACKUP_FILE" > "$CHECKSUM_FILE"

echo "Backup file: $BACKUP_FILE"
echo "Checksum file: $CHECKSUM_FILE"
printf 'Restore example: createdb -U "$POSTGRES_USER" sawiyaa_restore && pg_restore -U "$POSTGRES_USER" --no-owner --no-acl -d sawiyaa_restore "%s"\n' "$BACKUP_FILE"
