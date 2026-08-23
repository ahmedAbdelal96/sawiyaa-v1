# Sawiyaa Docker Deployment

This stack is designed for a production VPS with:

- Nginx on ports 80 and 443
- Frontend on internal port 3000
- Backend on internal port 7000
- PostgreSQL with a persistent named volume
- Persistent backend volumes for `storage/` and `uploads/`
- Host-persistent backend logs at `/opt/sawiyaa/logs/backend`, bind-mounted to `/app/logs`

The VPS only needs Docker Engine and the Docker Compose plugin, Git, Bash,
core file utilities, `curl`, and `flock`. Node.js/npm, the Prisma CLI, and
PostgreSQL client tools do not need to be installed on the host. Environment
contract and migration-safety scripts use a compatible host Node.js when
available, otherwise they run in the read-only `node:20-bookworm-slim`
validator image. Database dump structure verification runs inside the
PostgreSQL container.

The backend runtime image runs as UID/GID `10001:10001` (`sawiyaa`) with no
shell. Deployment runs `prepare-runtime-directories.sh` before the image
build. That helper creates `/opt/sawiyaa/logs/backend`, uses a temporary
Docker helper container to assign ownership `10001:10001`, and applies mode
`0750` before startup. The
`backend_volume_init` one-shot Compose service runs as root, preserves all
existing named-volume data, and initializes `/app/storage` and `/app/uploads`
for the backend UID/GID before the backend starts. Logs remain the canonical
host bind mount.

Runtime preparation never deletes existing data and never uses world-writable
permissions. Do not manually create runtime directories with `deploy` or
`root` ownership without running the preparation helper afterward. A failed
preparation or preflight write test stops deployment before containers start.

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
- `deploy/scripts/prepare-runtime-directories.sh`
- `deploy/scripts/backup-db.sh`
- `.github/workflows/ci-development.yml`
- `.github/workflows/deploy-production.yml`
- `sawiyaa-backend-v1/Dockerfile`
- `sawiyaa-frontend-v1/Dockerfile`
- `sawiyaa-backend-v1/.env.example`
- `sawiyaa-backend-v1/.env.postgres.example`
- `sawiyaa-frontend-v1/.env.example`

## Environment files

The canonical application environment files are:

- `sawiyaa-backend-v1/.env`
- `sawiyaa-backend-v1/.env.postgres`
- `sawiyaa-frontend-v1/.env`

Create them from the tracked contracts:

```bash
cp sawiyaa-backend-v1/.env.example sawiyaa-backend-v1/.env
cp sawiyaa-backend-v1/.env.postgres.example sawiyaa-backend-v1/.env.postgres
cp sawiyaa-frontend-v1/.env.example sawiyaa-frontend-v1/.env
```

The real files are ignored, persistent, and are never replaced by Git
deployment. Frontend `NEXT_PUBLIC_*` values are read from
`sawiyaa-frontend-v1/.env` for Compose interpolation, Docker build arguments,
and frontend runtime configuration. PostgreSQL receives only
`sawiyaa-backend-v1/.env.postgres`; it never receives backend application
secrets.

The older root `.env.production.*` files are legacy migration inputs only and
are not required for normal deployment.

Production backend configuration must include `LOG_LEVEL` (`error`, `warn`,
`info`, `debug`, or `verbose`), `WEB_APP_URL` as the public HTTPS web origin,
and the Daily settings `DAILY_API_KEY`, `DAILY_API_BASE_URL`, and
`DAILY_WEBHOOK_SECRET`. The webhook secret must exactly match the secret
configured in the Daily dashboard; webhook signatures remain mandatory.

## First deploy SSL bootstrap

`deploy/nginx/sawiyaa.conf` references the final certificate paths directly, so Nginx will not start successfully until the certificate files already exist.

Use this safe first-deploy order:

1. Confirm the canonical env files exist in the backend and frontend directories.
2. Build the backend and frontend images.
3. Start `postgres`, `backend`, and `frontend` only.
4. Run the Prisma migration release step.
5. Obtain the TLS certificate with Certbot or your ACME tool so the files appear under `deploy/certs/live/sawiyaa.com/`.
6. Start or restart `nginx`.

Before running the server scripts, make them executable and ensure they use LF line endings:

```bash
chmod +x deploy/scripts/deploy-production.sh deploy/scripts/backup-db.sh \
  deploy/scripts/prepare-runtime-directories.sh
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

## Pricing-region proxy requirements

Pricing uses the current request region, not the stored account country. In
production, Cloudflare must be the only public path to Nginx: restrict the
origin firewall/security group to Cloudflare's published IPv4 and IPv6 ranges
and block direct access to ports 80/443 from the public internet.

Before enabling traffic, install a generated Nginx include containing the
current Cloudflare ranges, for example:

```nginx
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 131.0.72.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 2400:cb00::/32;
    set_real_ip_from 2606:4700::/32;
    set_real_ip_from 2803:f800::/32;
    set_real_ip_from 2405:b500::/32;
    set_real_ip_from 2405:8100::/32;
    set_real_ip_from 2a06:98c0::/29;
    set_real_ip_from 2c0f:f248::/32;
real_ip_header CF-Connecting-IP;
real_ip_recursive on;
```

The include must be maintained from Cloudflare's current published ranges;
never trust `CF-Connecting-IP` from arbitrary peers. With that include loaded,
`$remote_addr` is the real client address and the main Nginx config overwrites
forwarding headers before proxying. Cloudflare cache rules must bypass all
`/api/v1/*` responses, especially pricing and payment routes.

## Stop

```bash
docker compose -f docker-compose.prod.yml down
```

Do not use `docker compose down -v`. That would remove the persistent volumes.
Never delete `postgres_data`.

## One-off Prisma migrations

The normal production release command is:

```bash
SAWIYAA_PROJECT_DIR=/opt/sawiyaa bash /opt/sawiyaa/deploy/scripts/deploy-production.sh
```

It creates a lightweight Git rollback marker, fetches `origin/main`, validates
the target release in a temporary worktree against the server env files, then
builds `backend` and `frontend`, runs migrations, runs the idempotent Config
bootstrap, recreates the app services, and checks backend/frontend health.
Payment-route bootstrap remains manual and is never run by this command.

## Production baseline bootstrap

The production release runs the additive baseline bootstrap after migrations:

```bash
docker compose -f docker-compose.prod.yml run --rm \
  -e ALLOW_PRODUCTION_BASELINE_SEED=true \
  backend npm run db:seed:production
```

This creates missing required financial rules, catalogs, and Config defaults,
preserves existing Admin values, and deactivates only the legacy seeded
commission defaults so scheduled and instant sessions share the Platform
Settings rules.

## Production Config bootstrap

If the Config bootstrap ever needs to be run manually, initialize only the
canonical Config catalog and approved global initial values:

```bash
docker compose -f docker-compose.prod.yml run --rm \
  -e ALLOW_CONFIG_BOOTSTRAP=true \
  backend npm run db:bootstrap:config
```

The production Compose `env_file` supplies `APP_ENV` and `DATABASE_URL`; the
explicit flag is required by the bootstrap policy. The command does not run
`prisma:seed`, create demo users/fixtures, overwrite or deactivate existing
ConfigValue rows, or print configuration values. Expected output is a JSON
summary containing `catalog.created`, `catalog.preserved`,
`initialValues.created`, and `initialValues.preserved` counts.

The one-command release order is:

1. Acquire the deployment lock and run read-only host checks.
2. Create `backup-before-deploy-<timestamp>` at the active commit.
3. Fetch `origin/main` without changing the active checkout; the script prints
   the active SHA, approved target SHA, and any local/target-only commit counts.
   Local unpushed commits are intentionally not deployed.
4. Validate the target release from a temporary Git worktree.
5. Ensure `/opt/sawiyaa/logs/backend` is writable by the backend UID.
6. Build only `backend` and `frontend`.
7. Run migration safety checks, create a verified database backup, then apply migrations.
8. Run the idempotent production baseline bootstrap with
   `ALLOW_PRODUCTION_BASELINE_SEED=true`.
9. Recreate backend, frontend, and nginx, then verify health.

After successful health checks, the script writes `.sawiyaa-release` with the
target SHA, UTC deployment time, and `status=success`. It is a host runtime
marker and is not source-controlled.

Preflight reports the primary environment-contract blocker first. Compose and
PostgreSQL checks that depend on a failed contract are reported as skipped,
not as additional root causes. A missing `WEB_APP_URL`, invalid `LOG_LEVEL`,
or missing Daily setting therefore stops the release before build, migration,
or container replacement.

Never run the root `npm run prisma:seed` command in production.

Synchronize canonical permissions separately from the full development seed:

```bash
docker compose -f docker-compose.prod.yml run --rm backend npm run db:sync:permissions -- --dry-run
docker compose -f docker-compose.prod.yml run --rm backend npm run db:sync:permissions -- --apply
```

Synchronize canonical countries separately from the full development seed:

```bash
docker compose -f docker-compose.prod.yml run --rm backend npm run db:sync:countries -- --dry-run
docker compose -f docker-compose.prod.yml run --rm backend npm run db:sync:countries -- --apply
```

The apply command is idempotent, preserves existing permission rows and user
permission overrides, and never runs the full Prisma seed. If the canonical
production admin does not exist, set `PERMISSION_SYNC_ADMIN_PASSWORD` in the
backend environment before applying so the command can create the account
without placing a password in source control.

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

Back up the PostgreSQL database with the server script:

```bash
bash /opt/sawiyaa/deploy/scripts/backup-db.sh
```

Backups are stored on the server under:

```bash
/opt/sawiyaa-backups/db
```

Each run creates a PostgreSQL custom-format dump plus a SHA256 checksum file
and metadata marked `VERIFIED` only after checksum validation and
`pg_restore --list` verification inside the running PostgreSQL container.
Temporary or failed dumps are removed and are never finalized as valid
backups. Retention still keeps the newest configured dumps and leaves
unrelated files alone.

Copy backups off-server with your preferred secure transfer tool, for example `scp` or `rsync`:

```bash
scp /opt/sawiyaa-backups/db/sawiyaa-db-*.dump* user@backup-host:/safe/path/
```

To restore into a separate database only:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres createdb -U "$POSTGRES_USER" sawiyaa_restore
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U "$POSTGRES_USER" --no-owner --no-acl -d sawiyaa_restore \
  < /opt/sawiyaa-backups/db/sawiyaa-YYYYMMDD-HHMMSS-<sha>.dump
```

The restore tools run inside the PostgreSQL container; no PostgreSQL client
package is required on the VPS host.

Back up the `backend_storage` and `backend_uploads` named volumes separately if you need a full file-level restore of uploads or persisted app data.

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
2. Create `sawiyaa-backend-v1/.env`, `sawiyaa-backend-v1/.env.postgres`, and `sawiyaa-frontend-v1/.env` on the server.
3. Fill all secrets on the server only.
4. Obtain TLS certificates for `sawiyaa.com`.
5. Start `postgres`, `backend`, and `frontend`.
6. Run the Prisma migration command once.
7. Start Nginx only after the certificate files exist.
8. Verify `/api/v1/health` and the public homepage.

## GeoIP and payment routing

The production Compose file mounts the approved GeoLite country database at
`/opt/sawiyaa/geoip/GeoLite2-Country.mmdb`. The backend production environment
must use:

```dotenv
GEOIP_ENABLED=true
GEOIP_DATABASE_PATH=/opt/sawiyaa/geoip/GeoLite2-Country.mmdb
TRUSTED_PROXY_MODE=single
CLOUDFLARE_COUNTRY_HEADER_ENABLED=false
```

Payment currency/method routing is database-authoritative. Do not configure
`PAYMENT_PROVIDER_ROUTES_JSON`; manage route rows through the admin workflow or
the explicit operator bootstrap below. The provider remains independently
controlled by the database payment gateway control and its credential
environment values.

For an approved initial production/staging EGP route only, run the bootstrap
explicitly inside the backend container with
`ALLOW_PAYMENT_ROUTE_BOOTSTRAP=true` and
`npm run db:bootstrap:payment-routes`. The command is idempotent, refuses
conflicting active snapshots, never creates a USD route, and is not part of
backend startup. Obtain and install any approved USD integration separately;
never copy the EGP integration ID into the USD variable.

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

1. Confirm the three canonical env files remain present; deployment never replaces them.
2. Build images with `docker compose --env-file sawiyaa-frontend-v1/.env -f docker-compose.prod.yml build`.
3. Start only the database and app containers.
4. Run Prisma migrations manually.
5. Verify backend health.
6. Verify frontend health.
7. Issue or install TLS certificates.
8. Start or restart Nginx.
9. Recheck health through the public domain.

Do not run Prisma migrations automatically on every backend startup.
