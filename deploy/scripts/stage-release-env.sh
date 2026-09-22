#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE_ROOT="${1:?canonical environment root is required}"
RELEASE_ROOT="${2:?release worktree root is required}"

stage_env_file() {
  local relative_path="$1"
  local source="$SOURCE_ROOT/$relative_path"
  local target="$RELEASE_ROOT/$relative_path"

  [[ -r "$source" ]] || {
    echo "Canonical environment file is missing or unreadable: $source" >&2
    return 1
  }
  mkdir -p -- "$(dirname -- "$target")"
  if ! chmod 700 -- "$(dirname -- "$target")" 2>/dev/null; then
    case "${OSTYPE:-}" in
      msys*|cygwin*) ;;
      *) echo "Unable to secure release environment directory: $(dirname -- "$target")" >&2; return 1;;
    esac
  fi
  install -m 600 -- "$source" "$target"
}

stage_env_file "sawiyaa-backend-v1/.env"
stage_env_file "sawiyaa-backend-v1/.env.postgres"
stage_env_file "sawiyaa-frontend-v1/.env"
