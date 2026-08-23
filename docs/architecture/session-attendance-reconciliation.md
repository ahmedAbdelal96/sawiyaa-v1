# Session Attendance Reconciliation

## Phase 2.5 boundary

Daily reconciliation is a read-only evidence foundation. It may normalize and
persist provider observations, but it never changes `Session.status`, creates a
financial record, consumes a package, or emits a payout/refund/earning effect.

The application depends on `SessionAttendanceReconciliationProvider`, not on a
Daily response shape. `DailySessionAttendanceReconciliationAdapter` is the only
provider-specific boundary. It maps booked user IDs, keeps unknown participant
counts, uses UTC instants, clamps/deduplicates normalized values, and never
returns raw payloads or tokens.

## Normalized and persisted evidence

`SessionAttendanceReconciliation` is an additive, versioned record keyed by
`sessionId + provider + observationVersion`. It stores room/meeting health,
booked participant identity/presence totals, observation cutoff, confidence,
reason codes, attempt/request status, and automatic-finalization eligibility.
Retries are idempotent for the same observation version; new observations add
history rather than silently replacing it.

`CONFIRMED` requires a complete provider observation. `PARTIAL`, `UNAVAILABLE`,
`FAILED`, and `NOT_FOUND` are never sufficient for automatic no-show decisions.
Provider configuration is not runtime health.

## Decision requirements

Both absent is auto-eligible only when scheduled end, finalization grace, and
late-evidence wait have elapsed, reconciliation is positive and complete, the
room was found, no unknown participant or identity conflict exists, and no
cancellation/reschedule/dispute race is present. Missing webhook events alone
are insufficient. One-party absence requires the same positive reconciliation
proof for the absent participant.

The Admin attendance endpoint exposes only sanitized reconciliation fields and
the canonical outcome evaluation. The raw Daily response is never serialized.

## Late evidence

A trusted attendance event after a reconciliation marks prior evidence
`evaluationStale = true` with reason
`LATE_TRUSTED_ATTENDANCE_EVENT`. History is retained and a new reconciliation
may be requested. Terminal reversal is intentionally deferred to Phase 3.

## Phase 2.6 PostgreSQL proof

The focused integration suite
`src/modules/sessions/integration/session-workflow.postgres.integration.spec.ts`
uses a disposable PostgreSQL database and the existing migration chain. It
proves that a real lifecycle transition to `UPCOMING` captures one immutable
policy snapshot, that an ended `IN_PROGRESS` session is moved only to
`AWAITING_COMPLETION_CONFIRMATION`, and that a fake-provider reconciliation is
persisted idempotently and read by the Admin attendance use case. The proof
also asserts the confirmed both-absent advisory classification does not write a
terminal status or payment row.

Run it only against an explicitly isolated database, for example:

```text
SAWIYAA_PHASE26_DATABASE_URL=<isolated-local-postgres-url> DATABASE_URL=<same-url> npx jest --runInBand src/modules/sessions/integration/session-workflow.postgres.integration.spec.ts
```

The suite is skipped when `SAWIYAA_PHASE26_DATABASE_URL` is absent. It does not
seed data or call Daily. The Phase 2.6 proof does not claim direct-payment,
package-activation, rescheduling, multi-worker concurrency, exact 30/60-minute
threshold, provider-failure/room-not-found, or late-event race coverage; those
remain controlled follow-up verification work.

## Phase 2.6B matrix status

The direct-payment application boundary now uses the locked
`transitionIfCurrentStatus` path. A replay that still carries a stale
`PENDING_PAYMENT` snapshot cannot append a second `PAYMENT_CONFIRMED` event,
recapture the policy, or resend the session-confirmed notification.

PostgreSQL-proven in the Phase 2.6B run:

- a new isolated database was used and the normal `fayed_db` database was not
  used;
- clean migration deployment and a second no-pending-migrations deployment;
- direct-payment activation and replay idempotency;
- policy snapshot persistence and non-terminal completion transition;
- fake-provider reconciliation persistence, retry idempotency, Admin read
  serialization, and no payment/terminal write for the tested scenario.

Still blocked and not to be described as PostgreSQL-proven: package activation,
rescheduling, the complete legacy matrix, provider failure/room-not-found
matrix, webhook conflicts, multi-device interval union, one-party no-show
cases, exact 30/60-minute threshold cases, real worker concurrency, late-event
race handling, and rollback injection. Real Daily/provider runtime remains
unproven by design.

## Retired automatic-completion boundary

The former automatic-completion boundary is historical only. Reconciliation
and evaluator output remain advisory evidence; they never write a terminal
session status. Completion is recorded by the Admin manual-decision command
after the session reaches `AWAITING_COMPLETION_CONFIRMATION`. Problem evidence
opens an Admin-owned resolution case in `AWAITING_ADMIN_RESOLUTION`.

## Phase 3B.2 controlled Daily runtime proof

The controlled run used synthetic rooms with the `sawiyaa-phase3b2-` prefix and
synthetic `user_id` values only. Provider calls were made to room creation,
meeting-token creation, room inspection, room presence, historical meetings,
and room deletion endpoints.

Historical reconciliation uses `GET /v1/meetings?room=:room&limit=100`, not
room presence. Presence is a current snapshot and returned `total_count: 0`
after a call ended. Historical meeting records returned `start_time`,
`duration`, `ongoing`, and participant rows containing `user_id`,
`participant_id`, `user_name`, `join_time`, and `duration`. The adapter maps
only `user_id` to booked users; display names are not authority.

Both-attended, practitioner-only, and patient-only rooms produced completed
historical meetings. A two-device run produced two rows with the same
`user_id`; the adapter unions overlapping intervals instead of double-counting
them. Reconnect produced two completed meetings for the same identity and both
intervals are preserved. An unknown identity remains unknown and blocks
automatic readiness.

A room with no participants produced neither a presence row nor a historical
meeting row. This is `MEETING_NOT_FOUND`, not positive proof of both no-show.
An ongoing meeting is `PARTIAL` with `MEETING_NOT_FINALIZED`.

Webhook parsing supports Daily's real `type`/`payload` envelope, epoch-second
`event_ts`, and `X-Webhook-Signature` plus `X-Webhook-Timestamp` HMAC contract.

## Phase 3B.2A local webhook and REST proof

A development-only run used a disposable PostgreSQL database, synthetic
practitioner-only and patient-only rooms named with the
`sawiyaa-phase3b2a-` prefix, and a temporary HTTPS ngrok callback. Daily was
registered for `participant.joined`, `participant.left`, `meeting.started`,
and `meeting.ended`. The registration verification probe and both real
participant join callbacks reached the local endpoint.

The persisted events were accepted only from the signed Daily source, carried
trusted booked-participant identity from `payload.user_id`, and did not use
`user_name` as authority. Replaying the same signed event returned the
duplicate result and did not create a second evidence row. Missing or invalid
signatures returned the standard 400 error. Header timestamps outside the
configured replay/future window are rejected before persistence. Raw bodies,
signatures, API keys, and tokens are not serialized in the response or
operational logs.

For both synthetic rooms, Daily historical meeting records and persisted
webhook identity/event types agreed for the one participant who joined. The
normalized adapter therefore classified each one-party observation using the
same UTC/user-id rules as the REST path. Empty-room evidence remains
`MEETING_NOT_FOUND`; it is not positive proof of both no-show. The temporary
rooms, webhook registration, tunnel, listener, and isolated database were
removed after verification. No session status or financial record was changed.
