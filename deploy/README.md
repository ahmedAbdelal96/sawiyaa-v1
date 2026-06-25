# Sawiyaa Docker Deployment

This stack is designed for a production VPS with:

- Nginx on ports 80 and 443
- Frontend on internal port 3000
- Backend on internal port 7000
- PostgreSQL with a persistent named volume
- Persistent backend volumes for `storage/` and `uploads/`

## Branch workflow

- `development` is for daily work and validation only.
- `main` is production-ready and deployable after review.
- Production deployment must never run from `development`.
- Development CI validates the code and Docker compose configuration only.
- Production deployment is a separate manual action that targets `main`.

## Files

- `docker-compose.prod.yml`
- `deploy/nginx/sawiyaa.conf`
- `deploy/scripts/deploy-production.sh`
- `deploy/scripts/backup-db.sh`
- `.github/workflows/ci-development.yml`
- `.github/workflows/deploy-production.yml`
- `sawiyaa-backend-v1/Dockerfile`
- `sawiyaa-frontend-v1/Dockerfile`
- `sawiyaa-backend-v1/.env.production.backend.example`
- `sawiyaa-frontend-v1/.env.production.frontend.example`
- `.env.production.db.example`

## Environment files

Copy or populate the example files before deployment:

- `sawiyaa-backend-v1/.env.production.backend.example`
- `sawiyaa-frontend-v1/.env.production.frontend.example`
- `.env.production.db.example`

For the live deployment, duplicate them beside `docker-compose.prod.yml` as:

- `.env.production.backend`
- `.env.production.frontend`
- `.env.production.db`

Frontend `NEXT_PUBLIC_*` values are build-time inputs. If you change the public app URL, Google client ID, Stripe publishable key, or related frontend flags, pass the updated values as Docker build args when building the frontend image.

Real `.env.production.backend`, `.env.production.frontend`, and `.env.production.db` files must stay on the server only. Do not commit them.

## First deploy SSL bootstrap

`deploy/nginx/sawiyaa.conf` references the final certificate paths directly, so Nginx will not start successfully until the certificate files already exist.

Use this safe first-deploy order:

1. Copy the env files into their live names.
2. Build the backend and frontend images.
3. Start `postgres`, `backend`, and `frontend` only.
4. Run the Prisma migration release step.
5. Obtain the TLS certificate with Certbot or your ACME tool so the files appear under `deploy/certs/live/sawiyaa.com/`.
6. Start or restart `nginx`.

Before running the server scripts, make them executable and ensure they use LF line endings:

```bash
chmod +x deploy/scripts/deploy-production.sh deploy/scripts/backup-db.sh
```

If the scripts were transferred from Windows, verify they still have LF endings before execution.

## Build

```bash
docker compose -f docker-compose.prod.yml build
```

## Local validation before push

Run this on a Windows machine from the repo root before pushing or merging:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\scripts\local-validate.ps1
```

Optional Docker image build:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\scripts\local-validate.ps1 -BuildDocker
```

What it checks:

- repo folder presence for `sawiyaa-backend-v1` and `sawiyaa-frontend-v1`
- Docker availability
- backend `npm ci`, Prisma client generation, and build
- frontend `npm ci` and build
- `docker compose -f docker-compose.prod.yml config`

This is local validation only. It does not deploy, does not run production migrations, and does not replace GitHub Actions CI.

## Start

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Stop

```bash
docker compose -f docker-compose.prod.yml down
```

Do not use `docker compose down -v`. That would remove the persistent volumes.

## One-off Prisma migrations

Run migrations manually as a release step, before exposing new traffic:

```bash
docker compose -f docker-compose.prod.yml run --rm backend npm run prisma:migrate:deploy
```

Back up the database before running migrations.

The backend container must never auto-run migrations on startup.

## Health checks

Backend:

```bash
curl -fsS https://sawiyaa.com/api/v1/health
```

Frontend:

```bash
curl -fsS https://sawiyaa.com
```

## Logs

```bash
docker compose -f docker-compose.prod.yml logs -f nginx frontend backend postgres
```

The same log output is also printed automatically by the server deploy script when a deployment fails.

## Database backup

Back up the PostgreSQL volume from the host:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup.sql
```

You can also archive the named volume from the Docker host if you need a full physical backup.

Recommended local backup path on the server:

```bash
/opt/sawiyaa-backups
```

To restore a backup:

```bash
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Back up the `backend_storage` and `backend_uploads` named volumes separately if you need a full file-level restore of uploads or persisted app data.

Example backup command on the server:

```bash
SAWIYAA_PROJECT_DIR=/opt/sawiyaa SAWIYAA_BACKUP_DIR=/opt/sawiyaa-backups bash /opt/sawiyaa/deploy/scripts/backup-db.sh
```

## Volume checks

Confirm backend persistence mounts are present:

```bash
docker compose -f docker-compose.prod.yml exec backend sh -lc 'ls -la /app/storage && ls -la /app/uploads'
```

Confirm database persistence:

```bash
docker volume ls
```

## DNS and SSL

- Point `sawiyaa.com` and `www.sawiyaa.com` to the VPS public IP.
- Open inbound ports 80 and 443.
- Obtain certificates with Certbot or your preferred ACME client.
- Mount the resulting certificate files under `deploy/certs` so Nginx can read:
  - `/etc/letsencrypt/live/sawiyaa.com/fullchain.pem`
  - `/etc/letsencrypt/live/sawiyaa.com/privkey.pem`

The Nginx config references those paths directly, so SSL must exist before Nginx can start on a fresh server.

## Development CI

Workflow file: `.github/workflows/ci-development.yml`

Triggers:

- push to `development`
- pull requests targeting `main`

Checks performed:

- `npm ci` in `sawiyaa-backend-v1`
- `npm run build` in `sawiyaa-backend-v1`
- `npm ci` in `sawiyaa-frontend-v1`
- `npm run build` in `sawiyaa-frontend-v1`
- `docker compose -f docker-compose.prod.yml config` when Docker is available in the runner

This workflow does not deploy anything and does not require production secrets.

## Production deploy workflow

Workflow file: `.github/workflows/deploy-production.yml`

Trigger:

- manual `workflow_dispatch`

Guardrails:

- fails unless the selected ref is `main`
- uses only SSH secrets
- runs the server-side deploy script on the VPS
- keeps real production env files on the server only

Required GitHub secrets:

- `SERVER_HOST`
- `SERVER_USER`
- `SERVER_PORT`
- `SERVER_SSH_KEY`

## Manual server deploy

Run this on the server:

```bash
SAWIYAA_PROJECT_DIR=/opt/sawiyaa bash /opt/sawiyaa/deploy/scripts/deploy-production.sh
```

## Deploy from GitHub Actions

1. Merge the reviewed change into `main`.
2. Open GitHub Actions.
3. Run the `Deploy Production` workflow manually.
4. Confirm the workflow is using `main`.
5. The workflow SSHes to the VPS and runs `deploy/scripts/deploy-production.sh` through `bash`.
6. Keep production deploys manual from GitHub Actions for now.
7. Do not enable automatic deploys from `main` until several successful manual deploys have completed.

## First deploy checklist

1. Clone the repo to `/opt/sawiyaa` on the server.
2. Create `.env.production.backend`, `.env.production.frontend`, and `.env.production.db` on the server.
3. Fill all secrets on the server only.
4. Obtain TLS certificates for `sawiyaa.com`.
5. Start `postgres`, `backend`, and `frontend`.
6. Run the Prisma migration command once.
7. Start Nginx only after the certificate files exist.
8. Verify `/api/v1/health` and the public homepage.

## Repeat deploy checklist

1. Back up the database first.
2. Merge to `main`.
3. Run the production workflow or the server deploy script.
4. Watch logs.
5. Verify health after deploy.
6. Rebuild the frontend whenever `NEXT_PUBLIC_*` values change.

## Backup before migrations

Always create a database backup before applying `prisma:migrate:deploy`.
Also back up `backend_storage` and `backend_uploads` if the release touches uploaded files or persisted runtime data.

## Rollback notes

- If the backend release fails after migrations, restore the database backup first.
- Re-deploy the previous `main` commit if the code change itself needs rollback.
- Keep the named Docker volumes intact unless you have a deliberate data-loss recovery plan.
- Do not use `docker compose down -v` during rollback.

## Safe release flow

1. Copy the env files into `.env.production.backend`, `.env.production.frontend`, and `.env.production.db`.
2. Build images.
3. Start only the database and app containers.
4. Run Prisma migrations manually.
5. Verify backend health.
6. Verify frontend health.
7. Issue or install TLS certificates.
8. Start or restart Nginx.
9. Recheck health through the public domain.

Do not run Prisma migrations automatically on every backend startup.
