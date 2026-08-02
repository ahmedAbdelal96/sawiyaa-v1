# Backup and Migration Safety

Phase 0B adds a small safety gate before production Prisma migrations.

## Backup location and files

Backups default to `/opt/sawiyaa-backups/db` and can be changed with
`SAWIYAA_BACKUP_DIR`. Each verified backup has:

- `sawiyaa-<UTC timestamp>-<short Git SHA>.dump`
- the matching `.dump.sha256` checksum
- the matching `.dump.metadata.json` metadata record

The metadata contains only the timestamp, target SHA, database service,
PostgreSQL version, dump filename and size, checksum, and verification status.

## Manual backup

From the deployment host, after PostgreSQL is running:

```bash
SAWIYAA_TARGET_SHA="$(git rev-parse HEAD)" bash deploy/scripts/backup-db.sh
```

The script uses PostgreSQL custom format, checks the minimum free-space and
dump-size thresholds, verifies `sha256sum`, verifies `pg_restore --list`, and
then renames temporary files atomically. It keeps the newest 20 verified
backups by default. Configure this with `SAWIYAA_BACKUP_RETENTION_COUNT`.

Verification can be repeated without a database connection:

```bash
sha256sum --check /opt/sawiyaa-backups/db/<backup>.dump.sha256
pg_restore --list /opt/sawiyaa-backups/db/<backup>.dump
```

## Migration classifications

```bash
node deploy/scripts/check-migration-safety.js \
  --migrations-dir sawiyaa-backend-v1/prisma/migrations \
  --applied-file /tmp/sawiyaa-applied-migrations.txt
```

The scanner reports `SAFE`, `REVIEW_REQUIRED`, or `BLOCKED`. It examines only
directories not present in the supplied applied-migration list. Blocking
patterns include table/column/type removal, truncation, unsafe deletes,
unclear renames, column type changes, unsafe `NOT NULL`, and removal of
financial structures. Unique indexes, data updates, backfills, enum changes,
and non-concurrent indexes require review.

Blocking migrations require one explicit approval for that deployment:

```bash
bash deploy/scripts/deploy-production.sh --target-sha <full-sha> \
  --approve-blocking-migrations
```

The equivalent environment variable is
`SAWIYAA_APPROVE_BLOCKING_MIGRATIONS=true`. Do not persist this approval in a
committed environment file.

## Production order

The deployment sequence is: lock, Phase 0A bootstrap checks, immutable target
validation, target materialization, PostgreSQL readiness, verified backup,
read-only applied-migration lookup, migration scan, explicit approval when
needed, `prisma migrate deploy`, then the existing permission sync, service
recreation, and health checks.

If backup verification or scanning fails, migration is not run. Application
rollback is not database rollback: a forward migration can remove data or add
constraints, and restoring a backup can lose later writes. Restore remains a
manual, approved recovery operation. Do not delete unrelated files when
handling a failed backup.

Phase 0C remains deferred.
