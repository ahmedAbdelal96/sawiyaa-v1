# Moderation API (Slices 1-4)

## Moderation Reports Rollout Depth (Slice 1)
- Canonical rollout slice-1 reference: `moderation-reports-rollout-reference.md`.
- This slice freezes:
  - reviewer/admin ownership boundaries for moderation report reads
  - list/detail DTO semantics for rollout depth
  - baseline filter/sort/pagination semantics
  - machine-readable moderation reports error keys
- This slice does not redesign moderation foundations and does not add new enforcement engines.

## Moderation Reports Rollout Depth (Slice 2)
- Triage list reads are now repository-backed with deterministic semantics for:
  - `status`, `targetType`, `reporterRole`, `reason`, `createdFrom`, `createdTo`, `sortBy`, `sortOrder`, `query`
- `query` in V1 is explicit and narrow: exact match on moderation report `id` or `targetId` only.
- Deterministic list ordering uses:
  - `createdAt` by `sortOrder`
  - `id asc` tie-breaker
- List/read triage payload now includes `lastActionAt` when present from moderation action history.

## Purpose
Provide a normalized moderation/safety report intake endpoint across sensitive runtime targets.

## Scope Implemented
- Slice 1:
  - Report intake creation
  - Strict target existence/access validation
  - Base audit event creation per accepted report
- Slice 2:
  - Moderator/admin/support queue list
  - Case detail read surface
  - Reviewer-safe target snapshot context
- Slice 3:
  - Moderation action execution endpoint
  - Role/target/state transition validation
  - Action persistence + audit logging
- Slice 4:
  - Per-surface target enforcement integrations
  - Care chat revoke/message hide
  - Review hide/reject/restore
  - Article archive enforcement
  - Support escalation enforcement

## Supported Targets
- `CARE_CHAT_CONVERSATION`
- `CARE_CHAT_MESSAGE`
- `GENERAL_CHAT_CONVERSATION`
- `GENERAL_CHAT_MESSAGE`
- `REVIEW`
- `ARTICLE`
- `SUPPORT_TICKET`
- `SUPPORT_MESSAGE`

## Intake Rules
- Reporter must be authenticated with allowed role.
- Reporter must have legitimate access to the reported target (unless privileged admin/support scope).
- Unsupported/inaccessible targets are rejected.
- Duplicate recent reports for same reporter/target/reason are blocked for a short cooldown window.
- Every accepted report creates an audit event (`REPORT_CREATED`).

## Endpoint
- `POST /api/v1/moderation/reports`

## Reviewer/Admin Endpoints (Slice 2)
- `GET /api/v1/admin/moderation/reports`
  - Filters: `status`, `targetType`, `reporterRole`, `createdFrom`, `createdTo`
  - Pagination: `page`, `limit`
- `GET /api/v1/admin/moderation/reports/:id`
- `PATCH /api/v1/admin/moderation/reports/:id/actions`
  - Body:
    - `action`:
      - Workflow actions:
        - `REVIEW_CASE`
        - `PREPARE_ENFORCEMENT`
        - `MARK_RESOLVED`
        - `DISMISS_CASE`
      - Enforcement actions:
        - `ENFORCE_CARE_CHAT_REVOKE`
        - `ENFORCE_CARE_CHAT_MESSAGE_HIDE`
        - `ENFORCE_REVIEW_HIDE`
        - `ENFORCE_REVIEW_REJECT`
        - `ENFORCE_REVIEW_RESTORE`
        - `ENFORCE_ARTICLE_ARCHIVE`
        - `ENFORCE_SUPPORT_ESCALATE`
    - `reason?`
    - `note?`

## Slice 3 Transition Rules (Action Baseline)
- `REVIEW_CASE`: `OPEN -> UNDER_REVIEW`
- `PREPARE_ENFORCEMENT`: `UNDER_REVIEW -> READY_FOR_ENFORCEMENT`
- `MARK_RESOLVED`: `UNDER_REVIEW|READY_FOR_ENFORCEMENT -> RESOLVED`
- `DISMISS_CASE`: `OPEN|UNDER_REVIEW|READY_FOR_ENFORCEMENT -> DISMISSED`
- Enforcement actions:
  - `READY_FOR_ENFORCEMENT -> RESOLVED`

## Slice 3 Role Matrix
- `ADMIN`: all actions
- `SUPPORT_AGENT`: `REVIEW_CASE`, `MARK_RESOLVED`, `DISMISS_CASE`
- `CONTENT_REVIEWER`: `REVIEW_CASE`, `PREPARE_ENFORCEMENT`, `DISMISS_CASE`

## Slice 4 Enforcement Target Matrix
- `ENFORCE_CARE_CHAT_REVOKE`: `CARE_CHAT_CONVERSATION`, `CARE_CHAT_MESSAGE`
- `ENFORCE_CARE_CHAT_MESSAGE_HIDE`: `CARE_CHAT_MESSAGE`
- `ENFORCE_REVIEW_HIDE|REJECT|RESTORE`: `REVIEW`
- `ENFORCE_ARTICLE_ARCHIVE`: `ARTICLE`
- `ENFORCE_SUPPORT_ESCALATE`: `SUPPORT_TICKET`, `SUPPORT_MESSAGE`

## Reviewer Access Rules
- Queue/detail endpoints are restricted to: `ADMIN`, `SUPPORT_AGENT`, `CONTENT_REVIEWER`.
- Public/patient/practitioner actors cannot access reviewer queue/detail surfaces.
- Queue/detail payloads include normalized case metadata and safe target snapshots only.
- Queue/detail do not expose unrelated private user data.
- Every accepted moderation action is persisted and audit-logged.
- Enforcement actions trigger real target-module state/visibility mutations.

## Deferred to Next Slices
- Unified moderation timeline APIs
