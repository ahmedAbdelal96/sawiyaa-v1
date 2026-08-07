# Sawiyaa Production Deployment Guide

## Purpose

Operational reference for safely deploying Sawiyaa to production.

Covers:
- Architecture
- Git release process
- Deployment workflow
- Database safety
- Logging
- Troubleshooting

---

## Production Overview

Stack:
- Backend: NestJS + Prisma
- Frontend: Next.js
- Database: PostgreSQL
- Infrastructure: Docker Compose + Nginx

Production directory:

```
/opt/sawiyaa
```

Repository:

```
https://github.com/ahmedAbdelal96/sawiyaa-v1
```

Branch:

```
main
```

---

## Services

Docker services:

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

## Release Process

Local:

```bash
cd D:\Web\full-projects\sawiyaa
git status
git diff --stat
```

Do not blindly use:

```bash
git add .
```

Add only required files.

Commit:

```bash
git commit -m "change description"
```

Push:

```bash
git push origin main
```

---

## Production Deploy

Server:

```bash
cd /opt/sawiyaa
git fetch origin
git log -1 --oneline origin/main
```

Deploy:

```bash
SAWIYAA_PROJECT_DIR=/opt/sawiyaa \
bash deploy/scripts/deploy-production.sh
```

---

## Deployment Flow

```
Lock
 ↓
Server validation
 ↓
Target release validation
 ↓
Environment validation
 ↓
Compose validation
 ↓
Git safety check
 ↓
Checkout release
 ↓
Build images
 ↓
Database backup
 ↓
Migration safety scan
 ↓
Prisma migration
 ↓
Config bootstrap
 ↓
Restart services
 ↓
Health checks
 ↓
Release marker
```

---

## Database Safety

Before migration:

- Verified PostgreSQL backup is created.
- Checksum validation is performed.

Never run:

```
prisma db push
```

or database reset in production.

---

## Logging

Backend logs:

Container:

```
/app/logs
```

Server:

```
/opt/sawiyaa/logs/backend
```

Expected:

```
app.log
http.log
slow-request.log
error.log
exceptions.log
```

Daily folders:

```
logs/backend/YYYY-MM-DD/
```

---

## Common Problems

### Backend unhealthy

Check:

```bash
docker compose -f docker-compose.prod.yml logs --tail=100 backend
```

Possible causes:
- Missing env variable
- Database connection
- Migration issue


### Docker npm ci failure

Example:

```
package.json and package-lock.json are not in sync
```

Fix locally:

```bash
npm install
```

Commit lock file changes.


### Logs missing

Verify:

```bash
docker inspect sawiyaa-backend-1
```

Expected mount:

```
/opt/sawiyaa/logs/backend -> /app/logs
```

---

## Failure Rules

Never:

- Commit production env files
- Delete Docker volumes
- Run docker compose down -v
- Force push main
- Modify production DB without backup

---

## Verification After Deployment

Containers:

```bash
docker compose ps
```

Release:

```bash
cat .sawiyaa-release
```

Health:

```bash
curl https://sawiyaa.com/api/v1/health
```

---

## Philosophy

Keep deployment:

Simple + Safe.

The goal is:

Developer changes
→ GitHub main
→ One deployment command
→ Safe production update
