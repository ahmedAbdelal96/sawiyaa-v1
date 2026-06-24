# Sawiyaa Frontend Next-Phase Tracker

Updated: 2026-04-06

This tracker starts after `FRONTEND_STRUCTURE_PLAN.md` closure.
Scope here is only remaining frontend work that is still real after code-level audit.

Current truth:

- No new backend-driven frontend rollout slice is currently active.
- The rollout queue in this file is closed for now.
- Any remaining frontend work is narrower hardening/consistency debt tracked in `FRONTEND_STRUCTURE_PLAN.md`, not a new surface-expansion queue.
- Recent patient-facing Arabic product-language correction wave is complete (`assessments/check-ins` wording tightened to clearer, calmer, non-diagnostic phrasing across connected patient flow labels).
- Remaining copy cleanup is tiny residue only and does not justify opening a new milestone queue.

## Status Labels

- `ready now`: frontend can execute immediately with current contracts
- `frontend-partial`: frontend exists but still shallow/limited
- `blocked-by-backend`: needs backend contract/module completion
- `deferred`: intentionally not in active scope

## Priority Queue

### 1) Expose backend-ready admin operational modules

Status: `ready now`

- [x] Admin settlements surface (`/admin/settlements` contracts exist in backend)
- [x] Admin moderation reports surface (`/admin/moderation/reports` contracts exist)
- [x] Admin trainings management beyond read-only overview (`create/update/publish/schedules`)

### 2) Expose backend-ready practitioner finance operations

Status: `ready now`

- [x] Practitioner wallet summary UI (`/practitioners/me/wallet`)
- [x] Practitioner ledger list UI (`/practitioners/me/ledger`)
- [x] Practitioner settlements visibility UI (`/practitioners/me/settlements`)

### 3) Replace remaining placeholder pages where backend is already live

Status: `frontend-partial`

- [x] Admin articles (`/admin/articles`) from placeholder to real admin article ops baseline

### 4) Keep placeholder/deferred boundaries honest

Status: `deferred`

- [ ] Patient/professional general chat domain remains deferred
- [ ] General settings domain remains deferred

## Guardrails

- Every new backend-driven item starts with a contract audit snapshot.
- No invented statuses/actions/payloads.
- If a backend contract is narrow, frontend must stop at honest baseline.
- Do not reopen this tracker queue unless a real new frontend gap or real regression appears.
