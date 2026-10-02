# Sawiyaa Operations Guide

This guide is the short operator workflow for the two-server-environment
layout. Run commands as a deployment user with Docker access; use `sudo` only
where the host requires it.

## First installation

On a new server, verify requirements and create the deployment roots:

```bash
sudo bash /path/to/sawiyaa/deploy/server/bootstrap-server.sh
```

Clone the two branches into their fixed locations:

```bash
sudo git clone --branch main git@github.com:ahmedAbdelal96/sawiyaa-v1.git /opt/sawiyaa
sudo git clone --branch development git@github.com:ahmedAbdelal96/sawiyaa-v1.git /opt/sawiyaa-dev
```

Create runtime environment files from the committed examples, then replace
every placeholder using the operator secret store:

```bash
sudo cp /opt/sawiyaa/deploy/env/production.backend.example /opt/sawiyaa/sawiyaa-backend-v1/.env.production
sudo cp /opt/sawiyaa/deploy/env/production.frontend.example /opt/sawiyaa/sawiyaa-frontend-v1/.env.production
sudo cp /opt/sawiyaa-dev/deploy/env/development.backend.example /opt/sawiyaa-dev/sawiyaa-backend-v1/.env
sudo cp /opt/sawiyaa-dev/deploy/env/development.frontend.example /opt/sawiyaa-dev/sawiyaa-frontend-v1/.env
sudo chmod 600 /opt/sawiyaa/sawiyaa-backend-v1/.env.production /opt/sawiyaa/sawiyaa-frontend-v1/.env.production
sudo chmod 600 /opt/sawiyaa-dev/sawiyaa-backend-v1/.env /opt/sawiyaa-dev/sawiyaa-frontend-v1/.env
```

Install the GeoIP database from the approved provider into the production
checkout and verify that it is readable at:

```text
/opt/sawiyaa/geoip/GeoLite2-Country.mmdb
```

Do not commit the database or provider credentials. Configure DNS, TLS
certificates, firewall rules, and the production PostgreSQL bootstrap identity
before starting public traffic.

Start production through the controlled update command:

```bash
sudo /opt/sawiyaa/deploy/server/update-prod.sh
```

Start development independently:

```bash
sudo /opt/sawiyaa-dev/deploy/server/update-dev.sh
```

Development is initially reached through `http://<server>:8080`. Only Nginx
is published; PostgreSQL, backend, frontend, worker, and Mailpit are internal
services on the `sawiyaa-dev` network. No `dev.sawiyaa.com` DNS or TLS gateway
is configured by this repository.

## Daily usage

Production update:

```bash
sudo /opt/sawiyaa/deploy/server/update-prod.sh
```

Development update:

```bash
sudo /opt/sawiyaa-dev/deploy/server/update-dev.sh
```

Inspect isolated projects:

```bash
docker compose -p sawiyaa -f /opt/sawiyaa/docker-compose.prod.yml ps
docker compose -p sawiyaa-dev -f /opt/sawiyaa-dev/docker-compose.dev.yml ps
```

View logs without mixing environments:

```bash
docker compose -p sawiyaa -f /opt/sawiyaa/docker-compose.prod.yml logs --tail=100 backend frontend nginx postgres
docker compose -p sawiyaa-dev -f /opt/sawiyaa-dev/docker-compose.dev.yml logs --tail=100 backend frontend nginx postgres
```

## Safe stop and rollback

Stop only the selected Compose project. Never add `-v`:

```bash
docker compose -p sawiyaa-dev -f /opt/sawiyaa-dev/docker-compose.dev.yml down
```

For production rollback, stop writes, identify the approved previous commit,
confirm the matching database and file backup, restore the data if a migration
was involved, then rerun the production workflow at the approved commit. See
`SERVER_DEPLOYMENT_ARCHITECTURE.md` for the rollback boundaries.

## Operator rules

- Keep production and development env files separate.
- Do not copy production secrets into development.
- Do not run migrations manually outside the existing production workflow.
- Do not delete named volumes as a cleanup shortcut.
- Treat a failed health check as a failed update until logs and service state
  are understood.
