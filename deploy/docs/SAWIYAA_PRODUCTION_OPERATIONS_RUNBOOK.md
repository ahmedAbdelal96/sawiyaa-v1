# SAWIYAA Production Operations Runbook

## Purpose

This document is the complete operational reference for Sawiyaa production deployment.

It is intended for:

- Future coding agents.
- Developers maintaining the project.
- Anyone responsible for deploying or troubleshooting production.

The goal is to understand:

- How deployment works.
- Why it was designed this way.
- How to release changes safely.
- How to diagnose failures.

---

# 1. Project Context

## Stack

Backend:

- NestJS
- Prisma ORM
- PostgreSQL

Frontend:

- Next.js

Infrastructure:

- Docker Compose
- Nginx reverse proxy
- Ubuntu VPS

Production directory:

```
/opt/sawiyaa
```

Repository:

```
https://github.com/ahmedAbdelal96/sawiyaa-v1
```

Production branch:

```
main
```

---

# 2. Deployment History

## Before Improvement

Deployment was manual:

```
git update
docker build
run migrations
run bootstrap commands
restart containers
```

Problems:

- Easy to forget steps.
- Server configuration could differ from local.
- Environment variables could be missing.
- Database safety depended on memory.
- Logs were not persistent.
- Troubleshooting was harder.

---

# 3. Current Deployment Philosophy

The current system intentionally avoids over-engineering.

Goals:

- One deployment command.
- Safe database changes.
- Clear validation.
- Persistent logs.
- Simple troubleshooting.

Not implemented intentionally:

- Kubernetes.
- GHCR release system.
- Complex CI/CD.
- Automatic database rollback.

---

# 4. Production Architecture

Services:

```
postgres
backend
frontend
nginx
```

Expected:

```
postgres  healthy
backend   healthy
frontend  healthy
nginx     running
```

Check:

```bash
docker compose -f docker-compose.prod.yml ps
```

---

# 5. Important Files

| File | Responsibility |
|---|---|
| docker-compose.prod.yml | Production containers and networking |
| deploy-production.sh | Main deployment workflow |
| validate-production-preflight.sh | Environment and server checks |
| check-migration-safety.js | Migration risk detection |
| backup-db.sh | Verified database backup |
| winston.config.ts | Backend logging configuration |
| deploy/README.md | Deployment documentation |

---

# 6. Development To Production Flow

Complete lifecycle:

```
Developer modifies code
        |
        v
Run tests locally
        |
        v
Commit selected files
        |
        v
Push to main
        |
        v
Server fetches main
        |
        v
Run deployment command
        |
        v
Production updated
```

---

# 7. Local Git Workflow

Navigate:

```bash
cd D:\Web\full-projects\sawiyaa
```

Check:

```bash
git status
```

Because the project may contain unrelated changes:

Do NOT blindly run:

```bash
git add .
```

Add only required files:

```bash
git add <files>
```

Commit:

```bash
git commit -m "describe change"
```

Push:

```bash
git push origin main
```

---

# 8. Production Deployment Command

Server:

```bash
cd /opt/sawiyaa
```

Run:

```bash
SAWIYAA_PROJECT_DIR=/opt/sawiyaa \
bash deploy/scripts/deploy-production.sh
```

This is the only normal deployment command.

---

# 9. Deployment Execution Flow

The deployment performs:

```
Acquire lock

↓

Validate server

↓

Fetch target release

↓

Create temporary target validation worktree

↓

Validate target environment

↓

Validate Docker Compose

↓

Check active git safety

↓

Update production checkout

↓

Build backend/frontend

↓

Start PostgreSQL

↓

Create verified database backup

↓

Run migration safety checks

↓

Run Prisma migrations

↓

Run config bootstrap

↓

Restart services

↓

Run health checks

↓

Write release marker
```

---

# 10. Environment Management

Canonical required files:

```
sawiyaa-backend-v1/.env
sawiyaa-backend-v1/.env.postgres
sawiyaa-frontend-v1/.env
```

Rules:

- Never commit them.
- Never print secrets.
- Missing required values must stop deployment.

Frontend note:

Next.js `NEXT_PUBLIC_*` values are build-time variables.

Therefore:

Docker build arguments must match the validated frontend environment.

The older `.env.production.backend`, `.env.production.frontend`, and
`.env.production.db` files are legacy migration inputs only. Git updates code;
deployment does not replace the canonical `.env` files.

---

# 11. Database Safety

Before migration:

The deployment creates a verified PostgreSQL backup.

Backup validation:

- Dump created.
- Minimum size checked.
- SHA256 generated.
- Checksum verified.
- Structure verified.

Never use:

```bash
prisma db push
```

in production.

Never use:

```bash
prisma migrate reset
```

in production.

---

# 12. Logging System

Backend logging uses Winston.

Container path:

```
/app/logs
```

Server path:

```
/opt/sawiyaa/logs/backend
```

Docker mount:

```
/opt/sawiyaa/logs/backend:/app/logs
```

Expected:

```
logs/backend/
    YYYY-MM-DD/
        app.log
        http.log
        slow-request.log
        error.log
        exceptions.log
```

The purpose is:

- Logs survive container rebuild.
- Logs survive restart.
- Production debugging is possible.

---

# 13. Real Problems Encountered

## 13.1 Notification type missing

Error:

```
NOTIFICATION_TYPE_MISSING
```

Cause:

Production database did not contain required notification configuration.

Solution:

Run the correct notification/config bootstrap.

---

## 13.2 Frontend Docker npm ci failure

Error:

```
package.json and package-lock.json are not in sync
```

Cause:

Dependency lock mismatch.

Solution:

Local:

```bash
npm install
```

Commit updated lock file.

---

## 13.3 Step up authentication during admin approval

Error:

```
STEP_UP_REQUIRED
```

Decision:

Administrative permissions already define authorization.

Additional password confirmation was removed to keep workflow simple.

---

## 13.4 Winston logs missing on server

Problem:

Local created:

```
logs/date/*.log
```

Production container created logs internally but they were not persistent.

Cause:

Missing host bind mount.

Solution:

```
/opt/sawiyaa/logs/backend
        |
        v
/app/logs
```

---

## 13.5 Payment route bootstrap failure

Cause:

Production execution exposed a TypeScript import/runtime mismatch.

Lesson:

Always verify bootstrap scripts before running production.

---

# 14. Failure Scenarios

## Validation failure

Examples:

- Missing env.
- Invalid configuration.
- Compose failure.

Result:

Deployment stops.

Old version remains running.

---

## Build failure

Result:

Old containers continue running.

No restart happens.

---

## Migration failure

Result:

Deployment stops.

Database backup exists.

Manual investigation required.

---

## Health check failure after restart

Result:

Deployment reports failure.

Manual recovery may be required.

Do not delete volumes.

---

# 15. Troubleshooting Commands

Containers:

```bash
docker compose -f docker-compose.prod.yml ps
```

Backend logs:

```bash
docker compose -f docker-compose.prod.yml logs --tail=200 backend
```

Frontend logs:

```bash
docker compose -f docker-compose.prod.yml logs --tail=200 frontend
```

Nginx:

```bash
docker compose -f docker-compose.prod.yml logs --tail=200 nginx
```

Health:

```bash
curl https://sawiyaa.com/api/v1/health
```

Release:

```bash
cat .sawiyaa-release
```

---

# 16. Forbidden Production Actions

Never:

- Commit production env files.
- Run database reset.
- Run prisma db push.
- Delete Docker volumes.
- Use force push.
- Modify production database without backup.
- Manually change server files without documenting it.

---

# 17. Agent Instructions

When modifying deployment:

- Keep the workflow simple.
- Do not introduce unnecessary enterprise complexity.
- Preserve existing safety rules.
- Analyze before changing.
- Test deployment scripts.
- Do not change application business logic.

---

# Final Goal

The desired workflow:

```
Developer changes code

↓

Push main

↓

Run one deployment command

↓

Safe production update
```

The deployment system should remain:

Simple.
Predictable.
Safe.
Maintainable.

---

# 18. Unified File Storage Backup and Restore

All new application file bytes live under the persistent `backend_storage`
volume at `/app/storage/files`. Database dumps and file bundles are separate
artifacts but must be kept together by the same UTC timestamp and release SHA.

Create the verified database backup first, then create the matching file bundle:

```bash
SAWIYAA_TARGET_SHA="$(git rev-parse HEAD)" \
  bash /opt/sawiyaa/deploy/scripts/backup-db.sh

SAWIYAA_TARGET_SHA="$(git rev-parse HEAD)" \
SAWIYAA_BACKUP_TIMESTAMP=YYYYMMDD-HHMMSS \
SAWIYAA_DB_BACKUP_FILE=/opt/sawiyaa-backups/db/sawiyaa-YYYYMMDD-HHMMSS-<sha>.dump \
  bash /opt/sawiyaa/deploy/scripts/backup-files.sh
```

The file bundle contains only `storage/files`, has a SHA-256 sidecar, and is
not considered verified until the archive command, non-empty check, and
checksum verification pass. Copy both artifacts and their sidecars to the
approved off-host backup location.

## Restore order

1. Stop application writes and identify the matching database dump and file
   bundle by UTC timestamp, release SHA, and metadata checksums.
2. Restore the database into an isolated database first, or restore the
   approved production database during the incident window using the existing
   PostgreSQL restore procedure.
3. Verify that `StoredFile.storageKey` rows with `ACTIVE` status map to files
   in the bundle under `/app/storage/files`; report missing or untracked files
   before enabling traffic.
4. Verify the backend container runs as UID/GID `10001:10001` and that the
   volume permissions remain `0750` for `/app/storage`.
5. Restore the bundle only with the explicit confirmation guard:

```bash
SAWIYAA_CONFIRM_FILE_RESTORE=YES \
  bash /opt/sawiyaa/deploy/scripts/restore-files.sh \
  /opt/sawiyaa-backups/sawiyaa-YYYYMMDD-HHMMSS-<sha>.files.tar.gz
```

6. Start the backend, run the file reconciliation check, verify private
   attachment authorization and public cover/avatar routes, then re-enable
   writes.

The restore script refuses unknown bundle names, missing checksums, failed
checksums, and runs without explicit confirmation. It does not delete the
volume; any cleanup or database cutover remains an approved operator action.
