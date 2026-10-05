# Sawiyaa DevOps Rebaseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the current `origin/development` history, reset `development` safely to the verified Production baseline `6452c312a19e24eadb9b10f89de5cac15cdd63e7`, align Development/Staging operations, and establish the documented promotion workflow without changing business behavior.

**Architecture:** The existing development history is first preserved in a permanent remote archive branch. The remote `development` branch is then force-updated with `--force-with-lease` to the exact verified Production baseline. Development uses its own Compose project, volumes, network, images, logs, env files, and localhost-only ingress `127.0.0.1:8080`; Production remains on `main`, `/opt/sawiyaa`, and `127.0.0.1:8081`.

**Tech Stack:** Git/GitHub branches, Bash deployment scripts, Docker Compose, PostgreSQL/Prisma, GitHub Actions, host Nginx, Markdown documentation.

**Spec:** `C:\Users\IT\.codex\attachments\1f7e9a40-af0f-4243-bb24-a0335b4e69ed\Pasted text.txt`

## Global Constraints

- `origin/main` must remain `6452c312a19e24eadb9b10f89de5cac15cdd63e7` until any explicitly authorized future Production change.
- The previous `origin/development` commit must be preserved remotely as `archive/development-before-prod-rebaseline-20261005` before rewriting `development`.
- Rewrite `development` only with `--force-with-lease`; never use unrestricted `--force`.
- Never reset, delete, migrate destructively, or otherwise modify Production data, volumes, or runtime services.
- Never delete or overwrite the existing local uncommitted work; preserve it in a recoverable stash before branch operations.
- Never copy, print, inspect, expose, or commit secret values.
- Development canonical env files are `.env.development`; Production canonical env files are `.env.production`; local files are `.env.local`.
- Development ingress is `127.0.0.1:8080:80`; Production ingress is `127.0.0.1:8081:80`; backend `7000` and frontend `3000` remain internal only.
- Business/application behavior, Prisma schema, migrations, and database truth are out of scope.
- If VPS SSH access or branch-protection permissions are unavailable, report the exact remaining operator action instead of claiming completion.

## Review Focus

- A dirty local checkout must survive branch operations: prove the stash exists and can be restored without applying it.
- The archive branch must point byte-for-byte to the pre-rebaseline `origin/development` SHA before `development` is rewritten.
- The rewritten `development` ref must equal `origin/main` exactly, while the archive retains the old development-only commits.
- Compose must not leak either environment's backend/frontend ports or share project names, volumes, networks, images, logs, or env files.
- `update-dev.sh` must be the only normal staging entrypoint and must use idempotent migration/seed/deploy behavior.

### Task 1: Preserve local work and establish verified refs

**Files:** No source files; Git refs/stash only.

- [ ] Record `origin/main`, `origin/development`, branch divergence, local branch state, and dirty paths.
- [ ] Create a named recovery stash for all tracked and untracked local work; verify the stash exists and record its object ID.
- [ ] Re-fetch `origin` and verify `origin/main` is exactly `6452c312a19e24eadb9b10f89de5cac15cdd63e7`.

### Task 2: Archive old development history

**Files:** No source files; remote archive ref only.

- [ ] Create `archive/development-before-prod-rebaseline-20261005` from the exact pre-rebaseline `origin/development` SHA.
- [ ] Push the archive branch to `origin`.
- [ ] Verify the remote archive SHA equals the recorded old development SHA before continuing.

### Task 3: Rebaseline development safely

**Files:** No source files; `origin/development` ref only.

- [ ] Verify the current remote `development` tip still equals the recorded old SHA (lease check).
- [ ] Update `development` to `6452c312a19e24eadb9b10f89de5cac15cdd63e7` with `git push --force-with-lease`.
- [ ] Verify `origin/main` and `origin/development` resolve to the same baseline and the archive still resolves to the old SHA.

### Task 4: Restore and commit the latest local work

**Files:** The 11 pre-existing local paths recorded during the audit; no other local or runtime files.

- [ ] Keep the named recovery stash intact; do not drop it during this task.
- [ ] Create `recovery/latest-local-work-20261005` from the new `development` baseline.
- [ ] Apply the preserved stash to the recovery branch. If conflicts occur, stop and report every conflicted path without choosing a side automatically.
- [ ] Inspect the restored diff and verify all 11 intended local paths are present; reject `.env*`, secrets, build artifacts, runtime files, and unrelated files.
- [ ] Run the appropriate focused tests/builds against the restored code.
- [ ] Commit the verified restored local work on the recovery branch with a clear commit message and push the recovery branch.

### Task 5: Promote the verified recovery work into development

**Files:** Git refs/PR only; no direct application edits.

- [ ] Prefer a Pull Request from `recovery/latest-local-work-20261005` into `development`.
- [ ] Run required Development CI and merge only after it passes; if PR/API permissions are unavailable, use the safest equivalent integration and report it explicitly.
- [ ] Verify `origin/development` contains the Production baseline plus the verified local work and any required DevOps-only commits.
- [ ] Keep the original recovery stash until the restored work is committed, exists remotely, Development CI passes, and staging deployment passes.

### Task 6: Audit and align Development operations

**Files:** Inspect/modify only if required: `docker-compose.dev.yml`, `deploy/server/update-dev.sh`, development deployment tests/workflows, `deploy/nginx/sawiyaa-dev.conf`, and directly related docs.

- [ ] Inspect the baseline’s Compose project name, volumes, network, image names, log mounts, env-file paths, health checks, and ingress.
- [ ] Add only minimal infrastructure changes required to enforce `COMPOSE_PROJECT_NAME=sawiyaa-dev`, `127.0.0.1:8080:80`, internal backend/frontend ports, and `.env.development` selection.
- [ ] Ensure `update-dev.sh` fetches/validates `origin/development`, validates the environment, builds production-like Docker images, migrates, seeds idempotently, starts isolated services, and verifies health/ingress.
- [ ] Add or update focused tests for env isolation, Compose isolation, port binding, idempotent repeat deployment, and secret-safe diagnostics.

### Task 7: Document the professional workflow

**Files:** Modify/create only directly related deployment documentation and CI workflow files.

- [ ] Document local/development/production env contracts, paths, ingress, deployment commands, isolation, rollback, and promotion flow.
- [ ] Configure or update Development CI and automatic staging deployment without adding a second competing deployment path.
- [ ] Configure Production promotion as development-to-main PR plus full regression and explicit approval; never auto-deploy arbitrary commits to Production.

### Task 8: Verify CI and optional VPS operations

**Files:** Existing workflows/tests only, unless a minimal harness fix is required.

- [ ] Run focused local static/config tests available without Docker.
- [ ] Run the existing Linux Docker Development acceptance workflow and verify migration, curated seed, health, isolation, `127.0.0.1:8080`, and staging HTTPS.
- [ ] If SSH access is available, run only `cd /opt/sawiyaa-dev && bash deploy/server/update-dev.sh`; preserve `.env.development`, DB, and volumes; verify staging and the independent Production health endpoint.
- [ ] If SSH is unavailable, record VPS staging deployment as `NOT RUN` with the exact command remaining.
- [ ] Verify the existing Production regression/CI status without changing or restarting Production.

### Task 9: Branch-protection verification and closure

**Files:** Directly related docs only if API permissions prevent application.

- [ ] Inspect GitHub branch-protection permissions for `main` and `development`.
- [ ] Apply the requested protections only if authorized; otherwise report `RECOMMENDED ONLY` with exact settings.
- [ ] Confirm the rebaseline checkpoint `origin/main == origin/development` passed before local-work restoration; at final completion report `Development ahead of main intentionally: YES` when the verified recovery work is integrated.
- [ ] Confirm `origin/main` is unchanged, `origin/development` contains the Production baseline, the archive exists, no secret files were changed, and the working tree is clean except for the intentionally preserved stash until all required remote/staging gates pass.
- [ ] Run final focused verification and return the exact requested status fields, file list, commit list, branch SHAs, and remaining operator actions.
