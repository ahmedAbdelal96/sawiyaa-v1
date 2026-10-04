# Sawiyaa Server Deployment Architecture

This is the permanent single-server layout for two isolated Sawiyaa
environments. It changes deployment and operations only; application behavior,
Prisma schema, and feature configuration remain owned by the repository.

## Environment layout

| Environment | Branch | Checkout | Compose project | Public entry point |
|---|---|---|---|---|
| Production | `main` | `/opt/sawiyaa` | `sawiyaa` | ports 80/443 |
| Development | `development` | `/opt/sawiyaa-dev` | `sawiyaa-dev` | port 8080 |

Each checkout has its own backend/frontend runtime environment files. Secrets
are created on the server or copied from the secret store; only redacted
templates under `deploy/env/` are committed.

## Compose isolation

Production uses `docker-compose.prod.yml` and the `sawiyaa` project. Development
uses `docker-compose.dev.yml` and the `sawiyaa-dev` project. Only the
development Nginx ingress is published on host port `8080` (`8080:80`).
PostgreSQL, backend, frontend, worker, and Mailpit remain internal Docker
services on a separate bridge network with explicit `sawiyaa_dev_*` volumes. It
cannot reuse production containers, networks, or data volumes.

Both environments use the same service shape: PostgreSQL, backend, worker,
frontend, and Nginx. The worker remains controlled by the existing backend
feature flags; adding the service does not enable queues.

## Ownership

- Git owns source, Compose files, deployment scripts, and documentation.
- The deployment operator owns `.env.development`, `.env.production`, and the
  production database env file, plus their permissions. They are ignored by
  Git and must never be copied into commits.
- Docker owns named database, storage, and upload volumes.
- The operator owns `/opt/sawiyaa-backups` and its off-server replication.
- The GeoIP database is an operator-managed runtime input mounted read-only by
  production.
- The production checkout is the only checkout allowed to use ports 80/443.

## Backup strategy

Production updates call the existing deployment workflow. That workflow runs
the migration safety scanner, creates and verifies a PostgreSQL custom-format
dump before migrations, and creates the matching file-volume backup. Backups
are stored below `/opt/sawiyaa-backups` with checksums and metadata.

Keep the newest configured backups locally and copy verified backups to a
separate host or object-storage target. Never use `docker compose down -v`:
that removes the database and application data volumes. Test restoration on an
isolated database before treating a backup as recoverable.

## Update workflow

Production:

1. `update-prod.sh` takes an update lock and requires a clean `main` checkout.
2. It fast-forward pulls `origin/main`, validates the environment and Compose
   model, then delegates to the existing production deploy workflow.
3. The existing workflow owns preflight, migration safety, backup, bootstrap,
   image build, service startup, and health checks.

Development:

1. `update-dev.sh` takes a separate lock and requires a clean `development`
   checkout.
2. It fast-forward pulls `origin/development`, validates the development env
   contract and Compose model, then runs `up -d --build` for `sawiyaa-dev`.
3. It verifies PostgreSQL, backend, frontend, Nginx, and the HTTP health paths.

`git pull --ff-only` deliberately stops on divergent history. Resolve branch
history manually rather than allowing a server-side merge.

## Rollback

If a release fails, first inspect `docker compose -p sawiyaa ps` and logs. The
production deploy workflow records a pre-deploy Git reference and verified
backups. Roll back code by checking out the previously approved `main` commit
and rerunning the normal production update workflow. If a migration was
applied, restore the matching verified database backup before rolling back
application code. Restore application files only from the matching verified
file-volume bundle.

Do not force-push, reset a shared remote branch, delete volumes, or attempt an
automatic database rollback. Stop writes, confirm the target backup and code
version, then perform the rollback with the operator approval required by the
existing scripts.
