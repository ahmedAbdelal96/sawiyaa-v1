# Moderation Reports Rollout Depth Reference (Slice 1 Baseline)

This is the contract/ownership freeze reference for Moderation Reports rollout depth.

## Scope Boundaries
- This rollout owns moderation report operational read-contract clarity.
- This rollout does not redesign moderation architecture or enforcement engines.
- This slice is contract-first and read-first; deeper deterministic triage read behavior is deferred to slice 2.

## Route Family Ownership
- Reviewer/operator-readable routes:
  - `GET /api/v1/admin/moderation/reports`
  - `GET /api/v1/admin/moderation/reports/:id`
- Reviewer action route (owned by existing moderation foundations, not expanded in this slice):
  - `PATCH /api/v1/admin/moderation/reports/:id/actions`
- Public/authenticated intake route (outside this rollout depth slice):
  - `POST /api/v1/moderation/reports`

## Role Matrix
- Reviewer/admin moderation reads: `ADMIN`, `SUPPORT_AGENT`, `CONTENT_REVIEWER`
- Public/patient/practitioner users cannot access reviewer queue/detail surfaces.

## List Contract Baseline
- Endpoint: `GET /api/v1/admin/moderation/reports`
- Response baseline:
  - `items`
    - includes `lastActionAt` (nullable) when action history exists
  - `pagination`: `page`, `limit`, `totalItems`, `totalPages`
  - `filters`:
    - `status`
    - `targetType`
    - `reporterRole`
    - `reason`
    - `createdFrom`
    - `createdTo`
    - `sortBy`
    - `sortOrder`
    - `query`

## Filter/Sort/Pagination Semantics Baseline
- Pagination:
  - `page` default `1`
  - `limit` default `20`
- Filter baseline:
  - `status`
  - `targetType`
  - `reporterRole`
  - `reason`
  - `createdFrom`, `createdTo`
  - `query` (slice 2 semantics): exact match on report `id` or `targetId`
- Ordering baseline:
  - `sortBy=CREATED_AT`
  - `sortOrder=DESC`
  - deterministic tie-breaker: `id asc`
- Invalid filter behavior:
  - `createdFrom > createdTo` => machine-readable invalid-filter error

## Detail Contract Baseline
- Endpoint: `GET /api/v1/admin/moderation/reports/:id`
- Detail includes stable reviewer context:
  - report identity and target metadata
  - status/reason/reporter role
  - safe target snapshot block when available
  - reporter user id and report note where currently supported

## Machine-Readable Error Baseline
- `MODERATION_REPORTS_INVALID_FILTER`
- `MODERATION_REPORTS_FORBIDDEN_SCOPE`
- `MODERATION_REPORT_NOT_FOUND_IN_SCOPE`

## Out of Scope in Slice 1
- Full triage repository/read-model redesign
- Detail/context hardening expansion beyond baseline contract
- Action-readiness computed hints
- AI moderation
- Safety analytics/dashboard platform
