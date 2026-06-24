# Sawiyaa Full-Stack Integration Tracker

Updated: 2026-04-06

This tracker owns frontend-backend contract rollout alignment.

Current truth:

- No backend-ready/frontend-underexposed rollout item is currently active.
- Deferred domains remain deferred unless backend/product scope changes.
- Recent patient-facing Arabic wording corrections were frontend copy hardening only, with no new shared backend-frontend rollout dependency.

## Status Labels

- `aligned`: frontend consumes backend capability well
- `backend-ready/frontend-underexposed`: backend is live but frontend is not exposing it yet
- `frontend-ready/backend-limited`: frontend baseline exists but backend limits the flow
- `blocked`: cannot complete without cross-repo change

## Live Alignment Snapshot

### Aligned

- [x] Auth bootstrap and role-scoped route protection
- [x] Public practitioners/specialties/articles surfaces
- [x] Patient sessions runtime/join/payment flow baseline
- [x] Practitioner sessions runtime + closeout actions baseline
- [x] Support and care-chat operational flows
- [x] Admin notifications ops baseline
- [x] Admin settlements ops baseline
- [x] Admin moderation reports baseline
- [x] Admin training authoring and schedule management baseline
- [x] Practitioner wallet summary baseline
- [x] Practitioner ledger list baseline
- [x] Practitioner settlements visibility baseline
- [x] Admin articles ops baseline
- [x] Admin session runtime inspection exposure in ops UI

### Backend-ready / Frontend-underexposed

- [ ] None at this time

### Frontend-ready / Backend-limited

- [ ] Deferred domains intentionally still limited (`chat`, `settings`)

## Next Full-Stack Execution Order

1. Keep deferred domains deferred unless backend/product scope changes (shared governance).
2. Do not open a new shared rollout item unless a real backend-ready/frontend-underexposed gap appears again.

## Contract Safety Checks (mandatory per item)

- endpoint/path verified
- request DTO verified
- response DTO/statuses/actions verified
- machine-readable errors verified
- blocked-vs-ready declared before implementation

Use this checklist only when a new shared rollout item is actually opened.
