# Fayed Backend Next-Phase Tracker

Updated: 2026-04-01

This tracker captures backend work still partial/missing after full-stack audit.

## Status Labels

- `strong`: contract and module are broadly production-usable
- `partial`: real module exists but still operationally narrow
- `missing`: no real module/contract yet
- `deferred`: intentionally out of scope

## Current Priorities

### 1) Complete deferred core domains intentionally left as placeholders

Status: `missing`

- [ ] General chat module (beyond care-chat approval flow)
- [ ] General settings module

### 2) Clarify and publish backend execution truth docs to match current code

Status: `partial`

- [ ] Refresh `docs/backend-current-state-audit.md` to reflect current live modules
- [ ] Keep API freeze docs aligned with live controllers/DTOs

### 3) Decide scope depth for operational modules already live as APIs

Status: `partial`

- [ ] Confirm financial-operations rollout depth (admin settlements + practitioner wallet/ledger/settlements)
- [ ] Confirm moderation reports rollout depth for admin/support workflows
- [ ] Confirm training admin authoring boundaries for next release

## Guardrails

- Keep contract-first DTO/controller discipline.
- Keep machine-readable error semantics stable.
- If behavior changes, update contract docs in the same change window.
