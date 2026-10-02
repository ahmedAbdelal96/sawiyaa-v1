#!/usr/bin/env bash
set -Eeuo pipefail

# Server bootstrap is intentionally non-installing: it verifies prerequisites
# and creates only the three deployment roots owned by this architecture.
for command in git docker curl; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "Required command is missing: $command" >&2
    exit 1
  }
done
docker compose version >/dev/null 2>&1 || {
  echo "Docker Compose v2 is required." >&2
  exit 1
}

for directory in /opt/sawiyaa /opt/sawiyaa-dev /opt/sawiyaa-backups; do
  mkdir -p -- "$directory"
done

echo "Server prerequisites: READY"
echo "Deployment roots: /opt/sawiyaa /opt/sawiyaa-dev /opt/sawiyaa-backups"
echo "No packages were installed."
