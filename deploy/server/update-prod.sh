#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR=/opt/sawiyaa
LOCK_PATH=/tmp/sawiyaa-prod-update.lock
BACKEND_ENV="$PROJECT_DIR/sawiyaa-backend-v1/.env.production"
FRONTEND_ENV="$PROJECT_DIR/sawiyaa-frontend-v1/.env.production"

[[ -d "$PROJECT_DIR" ]] || { echo "Production directory missing: $PROJECT_DIR" >&2; exit 1; }
[[ -d "$PROJECT_DIR/.git" ]] || { echo "Production checkout missing: $PROJECT_DIR" >&2; exit 1; }
command -v flock >/dev/null 2>&1 || { echo "flock is required." >&2; exit 1; }
exec 9>"$LOCK_PATH"
flock -n 9 || { echo "Another production update is running." >&2; exit 1; }

cd "$PROJECT_DIR"
[[ "$(git branch --show-current)" == main ]] || { echo "Production checkout must be on main." >&2; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo "Production checkout is not clean." >&2; exit 1; }

# The existing production deploy workflow owns migration safety, the verified
# database/file backup, bootstrap, build, startup, and service health checks.
bash "$PROJECT_DIR/deploy/scripts/deploy-production.sh"

echo "Production update: COMPLETE"
