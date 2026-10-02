#!/usr/bin/env bash
set -Eeuo pipefail

# Prepare host-backed runtime paths without requiring root SSH access.
# Docker access is intentionally used as the privileged filesystem boundary.
PROJECT_DIR="${SAWIYAA_PROJECT_DIR:-/opt/sawiyaa}"
RUNTIME_UID="${SAWIYAA_RUNTIME_UID:-10001}"
RUNTIME_GID="${SAWIYAA_RUNTIME_GID:-10001}"
HELPER_IMAGE="${SAWIYAA_RUNTIME_INIT_IMAGE:-busybox:1.36.1}"
CHECK_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-dir) PROJECT_DIR="$2"; shift 2;;
    --runtime-uid) RUNTIME_UID="$2"; shift 2;;
    --runtime-gid) RUNTIME_GID="$2"; shift 2;;
    --helper-image) HELPER_IMAGE="$2"; shift 2;;
    --check-only) CHECK_ONLY=true; shift;;
    -h|--help) sed -n 's/^# //p' "$0"; exit 0;;
    *) printf 'Unknown argument: %s\n' "$1" >&2; exit 2;;
  esac
done

[[ "$RUNTIME_UID" =~ ^[0-9]+$ && "$RUNTIME_GID" =~ ^[0-9]+$ ]] || {
  echo "Runtime UID/GID must be numeric: $RUNTIME_UID:$RUNTIME_GID" >&2
  exit 2
}

LOG_DIR="$PROJECT_DIR/logs/backend"
mkdir -p -- "$LOG_DIR"

if [[ "$CHECK_ONLY" == true ]]; then
  docker run --rm --user "$RUNTIME_UID:$RUNTIME_GID" \
    --mount "type=bind,src=$LOG_DIR,dst=/target" \
    "$HELPER_IMAGE" sh -c \
    'touch /target/.sawiyaa-write-test && rm -f /target/.sawiyaa-write-test' || {
      echo "Runtime UID/GID $RUNTIME_UID:$RUNTIME_GID cannot write $LOG_DIR" >&2
      exit 1
    }
  exit 0
fi

# The temporary helper is the only process granted root inside the helper
# container. It changes only the explicitly mounted runtime directory.
docker run --rm --user 0:0 \
  --mount "type=bind,src=$LOG_DIR,dst=/target" \
  "$HELPER_IMAGE" sh -c \
  "chown $RUNTIME_UID:$RUNTIME_GID /target && chmod 0750 /target" || {
    echo "Unable to prepare runtime directory ownership for $LOG_DIR" >&2
    exit 1
  }

"$0" --project-dir "$PROJECT_DIR" \
  --runtime-uid "$RUNTIME_UID" \
  --runtime-gid "$RUNTIME_GID" \
  --helper-image "$HELPER_IMAGE" \
  --check-only
