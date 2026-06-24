#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${SAWIYAA_PROJECT_DIR:-/opt/sawiyaa}"
BACKUP_DIR="${SAWIYAA_BACKUP_DIR:-/opt/sawiyaa-backups}"
COMPOSE_FILE="docker-compose.prod.yml"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/sawiyaa-db-$TIMESTAMP.sql"

if [ ! -d "$PROJECT_DIR" ]; then
  echo "Project directory not found: $PROJECT_DIR" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
cd "$PROJECT_DIR"

echo "Creating PostgreSQL backup: $BACKUP_FILE"
docker compose -f "$COMPOSE_FILE" exec -T postgres sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$BACKUP_FILE"

echo "Backup completed: $BACKUP_FILE"
