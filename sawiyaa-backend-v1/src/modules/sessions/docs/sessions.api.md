# Sessions Module API

## Purpose

Sessions Module is the platform source of truth for scheduled consultation bookings.
It owns scheduled session creation, lifecycle persistence, patient/practitioner ownership reads, and cancellation baseline.

This module intentionally does **not** own:

- recurring weekly availability
- availability exceptions
- practitioner live presence
- instant booking request orchestration
- payment gateway logic

## Video Provider Architecture

### Provider Selection

Only **Daily** is supported as a video provider in Phase 1. The `VIDEO_PROVIDER_DEFAULT`
environment variable (defaults to `DAILY`) is validated at application startup — any other
value causes a fatal error.

Zoom configuration values exist in the environment but are not operational.

### Join Policy (Single Source of Truth)

The authoritative join policy lives in **backend only** — `session-join-policy.util.ts`:

| Constant | Value | Meaning |
|---|---|---|
| `SESSION_JOIN_LEAD_MINUTES` | `2` | Join window opens 2 minutes before scheduled start |
| `SESSION_JOIN_LAG_MINUTES` | `0` | Join window closes exactly at scheduled end |

The join contract response (`SessionJoinContractViewModel`) includes `availableAt` and
`expiresAt` so clients can display authoritative window times without duplicating constants.

Frontend and mobile clients use these fields for UI hints. All security decisions are
enforced server-side in `ResolveSessionJoinContractUseCase`.

### Token Safety

`ResolveSessionJoinContractUseCase` issues Daily meeting tokens on demand. Tokens are
valid for 1 hour (Daily enforced). For a given `room_name + user_id` pair, Daily returns
a valid token on every request — token reuse is handled server-side by Daily.

New audit event types track the token lifecycle:
- `JOIN_TOKEN_ISSUED` — logged with provider, room ID, expiry (never the token itself)
- `JOIN_TOKEN_FAILED` — logged with error detail on failure

### Runtime Preparation

`PrepareSessionRuntimeUseCase` creates the Daily room via `POST /v1/rooms`. Room expiry
is set to `endsAt + 7200 seconds`. A `PROVIDER_ROOM_CREATED` event is emitted on success.

The runtime is auto-prepared by `ResolveSessionJoinContractUseCase` when a user attempts
to join and the runtime is not yet prepared.

## Audit Events

Sessions uses the `SessionEvent` table for audit/evidence events. New Phase 1 event types:

| Event | When emitted |
|---|---|
| `JOIN_ATTEMPTED` | Every call to `ResolveSessionJoinContractUseCase.execute` |
| `JOIN_ALLOWED` | User is authorized and a join token was issued |
| `JOIN_BLOCKED` | User is not allowed to join (with `blockedReason` in metadata) |
| `JOIN_TOKEN_ISSUED` | Daily meeting token was successfully generated |
| `JOIN_TOKEN_FAILED` | Daily meeting token generation failed (with error) |
| `MEETING_STARTED` | Daily webhook `meeting.started` received (evidence only) |
| `MEETING_ENDED` | Daily webhook `meeting.ended` received (evidence only) |
| `ADMIN_MANUAL_DECISION_CREATED` | Admin created a manual session decision (Phase 4A) |
| `ADMIN_MANUAL_DECISION_SUPERSEDED` | A prior manual decision was superseded by a new one (Phase 4A) |

`PATIENT_JOINED` and `PRACTITIONER_JOINED` exist in the enum but are not currently emitted
by any use case — future Phase 2 work may emit them from the attendance webhook handler.

## Endpoints

### Patient self-service

- `POST /api/v1/patients/me/sessions`
- `GET /api/v1/patients/me/sessions`
- `GET /api/v1/patients/me/sessions/:id`
- `POST /api/v1/patients/me/sessions/:id/cancel`
- `POST /api/v1/patients/me/sessions/:id/runtime/prepare`
- `GET /api/v1/patients/me/sessions/:id/runtime/join`

### Practitioner self-service

- `GET /api/v1/practitioners/me/sessions`
- `GET /api/v1/practitioners/me/sessions/:id`
- `POST /api/v1/practitioners/me/sessions/:id/mark-completed`
- `POST /api/v1/practitioners/me/sessions/:id/mark-no-show`
- `POST /api/v1/practitioners/me/sessions/:id/runtime/prepare`
- `GET /api/v1/practitioners/me/sessions/:id/runtime/join`

### Admin / Support operations

- `GET /api/v1/admin/sessions`
- `GET /api/v1/admin/sessions/:id/runtime-inspection`
- `GET /api/v1/admin/sessions/:id/attendance`
- `GET /api/v1/admin/sessions/:id/manual-decisions`
- `POST /api/v1/admin/sessions/:id/manual-decisions`

Admin sessions list returns visibility-first operational list data:

- optional status filter (`status`)
- optional delayed-only filter (`late=true`)
- optional ownership filters (`practitionerId`, `patientId`)
- optional scheduled range (`scheduledFrom`, `scheduledTo`)
- optional attendance gap filter (`missingAttendance=true`)
- stable pagination (`page`, `limit`)
- session item includes `isDelayed` computed from scheduled start + lifecycle status

Runtime inspection returns operational join-readiness context:

- current session lifecycle and mode
- current provider linkage (`provider`, `providerRoomId`, `providerSessionRef`)
- computed readiness flags (`canPrepareRuntime`, `canJoin`, `blockedReason`)
- **Phase 3 — `participants`**: identity summary for both the patient and the practitioner, each containing `userId`, `displayName`, primary `email` (verified only), primary `phone` (verified only). All four fields are nullable.
- **Phase 3 — `presentationStatus`**: lifecycle presentation status, one of `UPCOMING | JOINABLE | IN_PROGRESS | COMPLETED | CANCELLED | ENDED | UNAVAILABLE`. Computed by the existing presentation-status resolver — no business decision is executed from this value.

Attendance read returns persisted telemetry context:

- ordered attendance timeline (`JOINED` / `LEFT`) with participant role context
- participant identity summary (`userId`) when safely resolved during ingestion
- deterministic summary block:
  - `patientHasJoined`
  - `practitionerHasJoined`
  - `patientJoinedAt`
  - `practitionerJoinedAt`
  - `patientLeftAt`
  - `practitionerLeftAt`
  - `firstJoinedAt`
  - `lastLeftAt`
- **Phase 3 — `platformTimeline`**: platform-side evidence events emitted by the resolve-session-join-contract use case and the daily attendance webhook. Each item carries `kind: "PLATFORM"`, `eventType`, `actorRole`, `actorUserId`, `actorDisplayName`, `occurredAt`, `recordedAt`, `source` (`PLATFORM | DAILY_WEBHOOK | SYSTEM`), `severity` (`INFO | SUCCESS | WARNING | ERROR | NEUTRAL`), `titleKey`, and a sanitized `safeMetadataSummary`. Sorted ascending by `occurredAt`.
- **Phase 3 — `evidenceTimeline`**: a unified chronological merge of `timeline` (attendance) and `platformTimeline` (platform events). Sort order is `occurredAt` ascending; ties are broken deterministically — `JOIN_ATTEMPTED → JOIN_ALLOWED / JOIN_BLOCKED → JOIN_TOKEN_ISSUED / JOIN_TOKEN_FAILED → MEETING_STARTED → JOINED → LEFT → MEETING_ENDED`. Each item carries the same fields as `platformTimeline` with `kind: "ATTENDANCE" | "PLATFORM"`.
- **Phase 3 — `participants`**: same identity summary as runtime inspection.
- **Phase 3 — `presentationStatus`**: same as runtime inspection.
- **Phase 2 — `extendedSummary`**: a full structured attendance summary from the `AttendanceSummaryEngine`, appended under `extendedSummary` in the response (see Phase 2 section below)

#### Safe metadata rules (Phase 3)

Both `platformTimeline` and `evidenceTimeline` items expose a `safeMetadataSummary` object. The server-side sanitizer (`safe-metadata.util.ts`) redacts any of the following keys (case-insensitive, top-level only) to the literal string `[REDACTED]`:

- `token`, `accessToken`, `refreshToken`, `joinToken` (and all plurals: `tokens`, `accessTokens`, `refreshTokens`, `joinTokens`, `sessionTokens`, `roomTokens`, `meetingTokens`, `providerTokens`, `dailyTokens`); any top-level key ending with `Token` or `Tokens` is also redacted
- `authorization`, `auth`, `bearer`
- `secret`, `apiKey`, `api_key`, `webhookSecret`, `clientSecret`, `providerSecret`
- `signature`, `hmac`, `privateKey`
- `rawBody`, `rawHeaders`, `payload`, `body`
- `password`, `passwordHash`, `checkoutUrl`

Only the following primitive leaves are returned: `string | number | boolean | null`. Arrays are coerced to comma-joined strings. Nested objects are coerced to `"[object]"`. `Date` instances are emitted as ISO strings.

#### No-secrets confirmation (Phase 3)

- `DAILY_API_KEY` is never read by these endpoints and is not present in any response field.
- Daily join tokens are not present in any response field. `joinToken`, `accessToken`, and `token` metadata are always redacted.
- Daily webhook signatures, raw headers, and the original payload body are never returned.
- The `providerRoomId` and `providerSessionRef` fields in runtime inspection are the only stable provider-side identifiers exposed — these are non-secret room identifiers already shared with the patient and practitioner in their join URLs.

#### Recommendations remain advisory

- The `extendedSummary.recommendation.recommendedOutcome` and `riskFlags` arrays returned by these endpoints are advisory only.
- These endpoints never mutate `Session.status`, never trigger a refund, never mark a no-show, and never complete a session. They are read-only by design.
- `presentationStatus` is a derived label of the current state; it has no side effects.

### Provider webhook ingestion

- `POST /api/v1/sessions/webhooks/daily`

Daily attendance webhook ingestion is visibility-first and append-safe:

- supports attendance event mapping for `participant.joined` and `participant.left`
- supports `meeting.started` and `meeting.ended` as evidence-only events stored in `SessionEvent`
- links provider room context to an existing session (`providerRoomId` / `providerSessionRef`)
- resolves participant role (`PATIENT` / `PRACTITIONER`) when identity is safely mappable via `userId` match or `displayName` match
- persists structured attendance telemetry with idempotent ingestion key (SHA-256)
- ignores unsupported provider event types explicitly without failing lifecycle ownership
- **signature verification**: when `DAILY_WEBHOOK_SECRET` is configured, unsigned requests are rejected; when not configured (dev/preview only), requests are accepted without signature verification

### Phase 4A — Admin Manual Session Decisions

Admin manual decisions allow authorized admin users to formally record an outcome for a completed session. This is the only mechanism that marks sessions with no-show or technical-review outcomes — no automatic business logic (no refunds, no wallet operations, no automatic status changes beyond the explicit mapping below).

#### Authorization

| Endpoint | Permission | Role |
|---|---|---|
| `GET /api/v1/admin/sessions/:id/manual-decisions` | `SESSIONS_READ_ADMIN` | `ADMIN`, `SUPPORT_AGENT` |
| `POST /api/v1/admin/sessions/:id/manual-decision` | `SESSIONS_MANUAL_DECISIONS_WRITE` | `ADMIN` only (SUPPORT_AGENT blocked) |

#### Decision Types

| Decision Type | Description | Status Mutation |
|---|---|---|
| `MARK_COMPLETED` | Session completed normally with meaningful overlap | → `COMPLETED` |
| `MARK_PATIENT_NO_SHOW` | Patient did not join; practitioner was present | → `NO_SHOW` |
| `MARK_PRACTITIONER_NO_SHOW` | Practitioner did not join; patient was present | None |
| `MARK_BOTH_NO_SHOW` | Neither party joined | None |
| `MARK_TECHNICAL_REVIEW` | Technical issue prevented the session; flagged for review | None |
| `MARK_INSUFFICIENT_EVIDENCE` | Attendance data is inconclusive; needs manual resolution | None |

#### Endpoints

- `GET /api/v1/admin/sessions/:id/manual-decisions` — list all decisions for a session (most recent first)
- `POST /api/v1/admin/sessions/:id/manual-decision` — create a new decision

#### Eligibility Rules

A decision can only be created when:

1. The session exists and `scheduledEndAt` is in the past
2. Session status is not one of: `PENDING_PAYMENT`, `CANCELLED`, `REFUNDED`, `REFUND_PENDING`, `EXPIRED`, `READY_TO_JOIN`, `IN_PROGRESS`
3. No active final decision already exists, **or** `supersedePrevious: true` is provided

#### Supersession

Supersession is **not automatic** — the caller must explicitly pass `supersedePrevious: true` to replace an existing active final decision. The new record links to the prior decision via `supersedesDecisionId` (one-to-one, unique index). Only one *active* (`isFinal: true`) decision exists per session at any time.

#### Required Confirmation Flags

All three must be `true` in the request body:

- `confirmEvidenceReviewed` — admin has reviewed the attendance evidence
- `confirmNoAutomaticRefund` — no automatic refund will be triggered
- `confirmNoAutomaticPayout` — no automatic payout will be triggered

#### Required Fields

- `decisionType` — one of the six decision types
- `reasonCode` — short i18n key string (max 100 chars)
- `adminNote` — optional free-text note (max 2000 chars)

#### Server-Side Evidence Snapshot

Evidence is **always built server-side** from `GetAdminSessionAttendanceUseCase`. The client **must not and cannot** provide `evidenceSnapshot`. The snapshot comprises:

- `recommendedOutcomeSnapshot` — from `extendedSummary.recommendation` (sanitized via `sanitizeSafeMetadata`)
- `attendanceSummarySnapshot` — patient + practitioner attendance summary (sanitized)
- `evidenceTimelineSnapshot` — the raw evidence timeline array (sanitized)

#### Audit Events

On every decision creation:

1. `ADMIN_MANUAL_DECISION_CREATED` — written for the new decision; metadata includes `decisionId`, `decisionType`, `previousSessionStatus`, `nextSessionStatus`, `reasonCode`
2. `ADMIN_MANUAL_DECISION_SUPERSEDED` — written for the prior decision when a supersession occurs; metadata includes `supersededDecisionId`, `newDecisionId`

#### Transaction

Decision creation, optional status mutation, and audit event writes are wrapped in a single `Prisma.$transaction` for atomicity.

#### No Automatic Side Effects

- No automatic refund or payout is triggered by any decision type
- No wallet operations are initiated
- Only `MARK_COMPLETED` → `COMPLETED` and `MARK_PATIENT_NO_SHOW` → `NO_SHOW` mutate session status; all other types leave `nextSessionStatus` as `null`

## Guards Used

### Patient routes

- `JwtAccessAuthGuard`
- `RolesGuard`
- `@Roles(AppRole.PATIENT)`
- `@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)`

### Practitioner routes

- `JwtAccessAuthGuard`
- `RolesGuard`
- `@Roles(AppRole.PRACTITIONER)`
- `@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT, AccountStateRequirement.PRACTITIONER_OTP_VERIFIED)`

## Main DTOs

- `CreateScheduledSessionDto`
- `CancelSessionDto`
- `ListSessionsDto`
- `SessionItemResponseDto`
- `SessionDetailsResponseDto`
- `SessionsListSuccessResponseDto`
- `SessionRuntimeItemSuccessResponseDto`
- `SessionJoinItemSuccessResponseDto`
- `AdminSessionAttendanceSuccessResponseDto`
- `CreateAdminSessionManualDecisionDto`
- `AdminSessionManualDecisionSuccessResponseDto`
- `AdminSessionManualDecisionListSuccessResponseDto`

## Main Use Cases

- `CreateScheduledSessionUseCase`
- `GetMyPatientSessionsUseCase`
- `GetMyPractitionerSessionsUseCase`
- `GetAdminSessionAttendanceUseCase`
- `GetSessionDetailsUseCase`
- `MarkSessionCompletedByPractitionerUseCase`
- `MarkSessionNoShowByPractitionerUseCase`
- `PrepareSessionRuntimeUseCase`
- `ResolveSessionJoinContractUseCase`
- `CancelSessionUseCase`
- `ExpireUnpaidSessionUseCase`
- `CreateAdminSessionManualDecisionUseCase`
- `ListAdminSessionManualDecisionsUseCase`
- `HandleDailyAttendanceWebhookUseCase`

## Lifecycle Notes

- V1 scheduled bookings are created in `PENDING_PAYMENT`
- Payments module will later own payment confirmation and unpaid expiry orchestration
- Sessions module already enforces transition rules and keeps them explicit in `ValidateSessionStatusTransitionService`
- `meeting.started` and `meeting.ended` webhook events do NOT auto-complete the session, do NOT mark no-show, and do NOT trigger refunds

## Availability Relationship

- Sessions consume Availability-derived windows
- Sessions do not store weekly schedule data
- Requested scheduled windows must fit a derived public/bookable availability window
- Conflict detection is still baseline only and does not implement distributed reservation locking yet

## Response Shape Notes

### Create/details

`data.item` returns a stable session object with:

- session identity
- lifecycle status
- scheduled start/end times in UTC
- duration
- session mode
- patient/practitioner ownership summaries
- baseline cancellation/expiry/completion metadata

### List

`data.items` returns stable list items with:

- session identity
- lifecycle status
- scheduled timing
- duration
- patient/practitioner summaries

`data.pagination` returns:

- `page`
- `limit`
- `totalItems`
- `totalPages`

### Join contract

`SessionJoinItem` includes:

- `sessionId`, `status`, `provider`, `canJoin`, `blockedReason`
- `availableAt` — authoritative join window open time (ISO 8601, from backend join policy)
- `expiresAt` — authoritative join window close time (ISO 8601, from backend join policy)
- `roomName`, `roomUrl`, `joinToken`
- `providerRuntime` — extended runtime view with token and expiry

## Out of Scope

- instant booking request flow
- payment capture / refund implementation
- practitioner-initiated cancellation and refund-policy orchestration
- recording/transcription and advanced telehealth controls
- multi-provider video parity beyond Daily baseline
- presence orchestration
- admin attendance timeline read surface (delivered in next slice)
- automated status jobs beyond baseline domain helpers
- Daily Prebuilt / daily-js embedded web video
- Daily React Native SDK

---

## Phase 2 — Attendance Summary Engine

The Attendance Summary Engine (`src/modules/sessions/utils/attendance-summary.engine.ts`) is a **pure calculation** service that reads raw session evidence and produces a structured `SessionAttendanceSummary`. It has **no database access** — all input is passed as arguments.

### Design Principles

- **Pure calculation**: no side effects, no database queries
- **Handles bad data**: out-of-order events, missing joins/leaves, duplicate events, UNKNOWN participants
- **Recommendation flags only**: outcomes are `*_CANDIDATE` suggestions — no automatic business decisions (no auto-complete, no refunds, no no-show marking)
- **No schema changes**: reads from existing `SessionAttendanceEvent` and `SessionEvent` tables via repository methods already in place

### Entry Point

```typescript
import { summarizeSessionAttendance } from '../utils/attendance-summary.engine';

const summary = summarizeSessionAttendance({
  timing: { scheduledStartAt, scheduledEndAt, durationMinutes, joinWindowOpenedAt, joinWindowClosedAt },
  attendanceEvents: AttendanceEvent[],   // from SessionAttendanceEvent table
  platformEvents: PlatformEvent[],       // from SessionEvent table
});
```

### Output Shape

```typescript
interface SessionAttendanceSummary {
  session: {                    // Session timing from database
    scheduledStartAt: Date | null;
    scheduledEndAt: Date | null;
    durationMinutes: number | null;
    joinWindowOpenedAt: Date | null;
    joinWindowClosedAt: Date | null;
  };
  patient: RoleAttendanceSummary;      // Per-role presence summary
  practitioner: RoleAttendanceSummary;
  meeting: MeetingBounds;             // Actual meeting start/end (from webhooks or events)
  overlap: OverlapSummary;            // Simultaneous presence overlap
  evidence: EvidenceFlags;             // Quality signals about the event stream
  recommendation: Recommendation;      // Outcome flag + reason + risk flags
}
```

### Presence Intervals

The engine builds **per-role presence intervals** from `JOINED`/`LEFT` event pairs:

- Events sorted by `occurredAt` before processing
- A **duplicate JOINED** (JOINED while already joined) is **ignored** — it does NOT create a new interval, does NOT close the current interval, and does NOT count toward `joinCount` or `reconnectCount`
- A **real reconnect** (JOINED → LEFT → JOINED) creates two distinct intervals and increments `reconnectCount`
- A `LEFT` without a matching `JOINED` is recorded but creates no negative interval
- An open interval (JOINED with no following LEFT) is closed at `meetingEndedAt` → `scheduledEndAt` → `now`
- `joinCount` = number of **real intervals** (duplicates excluded), not raw JOINED events
- `reconnectCount` = `Math.max(0, intervals.length - 1)`
- **UNKNOWN** participant events are counted in evidence but excluded from overlap

### Meeting Bounds

Meeting start/end are extracted from `SessionEvent` platform events:

- **Preferred**: `MEETING_STARTED`/`MEETING_ENDED` with valid `metadataJson.occurredAt` (provider-reported timestamp)
- **Fallback**: `createdAt` (backend ingestion time) — downgrades `sourceConfidence` to `MEDIUM`
- `sourceConfidence = 'HIGH'` when provider `occurredAt` is used for both bounds
- `sourceConfidence = 'MEDIUM'` when using `createdAt` fallback or only participant events
- `sourceConfidence = 'LOW'` when timing evidence is incomplete

### Platform Event Role Mapping

Platform events (`JOIN_ATTEMPTED`, `JOIN_BLOCKED`, `JOIN_TOKEN_ISSUED`, `MEETING_STARTED`, `MEETING_ENDED`) are mapped to patient/practitioner roles using **explicit user IDs** from the session record — `patientUserId` and `practitionerUserId` are passed to the engine and used for all role mapping. This works even when a participant never joined the video call.

### Overlap Calculation

Intersection of patient and practitioner presence intervals, computed via interval overlap algorithm. Produces:

- `overlapSeconds` / `overlapMinutes` — total simultaneous presence
- `overlapPercentOfScheduledDuration` — overlap as % of scheduled duration
- `firstOverlapAt` / `lastOverlapAt` — temporal bounds of simultaneous presence
- `hasMeaningfulOverlap` — true if **both** `overlapPercent >= 70%` **and** `overlapMinutes >= 20`; if `scheduledDuration` is missing, uses minutes-only threshold with `LOW_CONFIDENCE_DURATION_MISSING` flag in `confidenceFlags`

### Recommendation Outcomes

| Outcome | Trigger |
|---|---|
| `COMPLETION_CANDIDATE` | Both joined with meaningful overlap (AND logic) |
| `PATIENT_NO_SHOW_CANDIDATE` | Practitioner joined, patient did not join within threshold |
| `PRACTITIONER_NO_SHOW_CANDIDATE` | Patient joined, practitioner did not join within threshold |
| `BOTH_NO_SHOW_CANDIDATE` | Neither joined within threshold (but join attempts exist) |
| `TECHNICAL_REVIEW_CANDIDATE` | Both joined but overlap is insufficient |
| `INSUFFICIENT_EVIDENCE` | No attendance events and no platform join attempts |
| `MANUAL_REVIEW_REQUIRED` | Join attempts exist but no attendance events, or premature decision risk |

All outcomes include `isFinalDecision: false` and `requiresAdminReview: true`. The `riskFlags` array carries quality signals (`DUPLICATE_LIKE_JOIN_EVENTS`, `PREMATURE_DECISION_RISK`, `UNKNOWN_PARTICIPANT_EVENTS`, etc.).

### No-Show Time-Gating

No-show recommendations are **time-gated** — the `PATIENT_NO_SHOW_AFTER_MINUTES` (15 min) and `PRACTITIONER_NO_SHOW_AFTER_MINUTES` (10 min) thresholds are evaluated relative to `scheduledStartAt`. If the threshold has not yet passed at the evaluation time (`now` or `meetingEndedAt`/`scheduledEndAt`), the engine returns `MANUAL_REVIEW_REQUIRED` with `hasPrematureDecisionRisk: true` and `PREMATURE_DECISION_RISK` in `riskFlags`.

### Evidence Fields

The `evidence` block includes:
- `hasDuplicateLikeJoinEvents` / `duplicateLikeJoinEventCount` — duplicate JOINED events detected
- `hasPrematureDecisionRisk` — no-show threshold not yet passed
- `hasReconnects` — any participant reconnected (JOINED → LEFT → JOINED)
- `hasOutOfOrderEvents` / `hasMissingJoinEvent` / `hasMissingLeaveEvent` — data quality signals
- `hasOnlyPatientJoined` / `hasOnlyPractitionerJoined` — single-party presence signals
- `hasOpenIntervalsWithoutCloseBoundary` / `openIntervalCount` — open intervals lacking a safe close boundary
- `missingJoinEventCount` / `missingLeaveEventCount` — counts of events that could not be matched to a real interval

### Pure Engine Contract

The engine is a **pure function** with no runtime clock calls:

- **No `Date.now()`** — the engine never calls the system clock
- **No `new Date()`** for current-time fallback — all time references come from input
- `input.now` is the only time reference for time-gated decisions (no-show thresholds, premature risk)
- Deterministic: same input always produces identical output

### Close Boundary Priority

Open intervals (JOINED with no following LEFT) are closed using this priority:

1. `meetingEndedAt` — from `MEETING_ENDED` platform event
2. `scheduledEndAt` — from the session record
3. `input.now` — explicit evaluation time passed by the caller
4. **null** — interval stays open (`leftAt = null`, `durationSeconds = 0`)

When an interval stays open (no safe close boundary), it is flagged as `hasOpenIntervalsWithoutCloseBoundary: true` and excluded from overlap calculation. This prevents `Infinity`/`NaN` overlap values and forces `MANUAL_REVIEW_REQUIRED` for completion decisions.

### Overlap Safety

Overlap is computed only from **closed intervals** (both sides have `leftAt ≠ null`):

- If either interval is open without a safe close boundary, that pair is excluded from overlap
- `overlapSeconds` and `overlapMinutes` are always finite numbers (never `Infinity` or `NaN`)
- Open intervals without close boundary add `UNRELIABLE_OVERLAP_OPEN_INTERVAL` to `confidenceFlags`
- When `hasOpenIntervalsWithoutCloseBoundary = true`, completion cannot be recommended regardless of overlap

### Missing Leave/Join Diagnostics

The interval builder produces diagnostic counts used in evidence flags:

- `missingJoinEventCount` — LEFT events with no preceding real JOINED (excludes duplicate JOINED)
- `missingLeaveEventCount` — real JOINED events with no following LEFT and no close boundary applied
- `hasMissingLeaveEvent` / `hasMissingJoinEvent` are derived from these counts, not raw event counts
- Duplicate JOINED does **not** create a missing leave flag

### Policy Thresholds

All thresholds are centralized in `src/modules/sessions/config/attendance-summary.config.ts`:

| Threshold | Value | Used for |
|---|---|---|
| `PATIENT_LATE_AFTER_MINUTES` | 5 min | `joinedOnTime` flag |
| `PRACTITIONER_LATE_AFTER_MINUTES` | 5 min | `joinedOnTime` flag |
| `PATIENT_NO_SHOW_AFTER_MINUTES` | 15 min | `noShowCandidate` flag |
| `PRACTITIONER_NO_SHOW_AFTER_MINUTES` | 10 min | `noShowCandidate` flag |
| `MIN_OVERLAP_FOR_COMPLETION_PERCENT` | 70% | `hasMeaningfulOverlap` |
| `MIN_OVERLAP_FOR_COMPLETION_MINUTES` | 20 min | `hasMeaningfulOverlap` |
| `MAX_RECONNECT_COUNT_BEFORE_TECHNICAL_FLAG` | 3 | `EXCESSIVE_*_RECONNECTS` risk flag |

### Integration

`GetAdminSessionAttendanceUseCase` calls `summarizeSessionAttendance` with:

- `attendanceEvents` from `sessionRepository.listAttendanceEventsBySessionId`
- `platformEvents` from `sessionRepository.listSessionEventsBySessionId`
- `timing` built from the session record

The result is appended as `extendedSummary` in the API response. The legacy `summary` block (patient/practitioner joined at times) is preserved for backward compatibility.

## Operational Notifications Baseline

- session confirmation emits operational notifications to patient and practitioner
- patient-initiated cancellation emits operational notifications to patient and practitioner
- notifications are best-effort and do not block lifecycle transitions

---

## Phase 3 — Evidence Timeline Final Guard

Added in the Phase 3 Final Guard hardening pass. These guarantees apply to all timeline
items returned in `platformTimeline` and `evidenceTimeline` on the attendance endpoint.

### titleKey safety

Every `SessionEvent` record carries an `eventType` string (the Prisma enum value). The
`evidence-timeline.util.ts` mapper translates `eventType → titleKey` using the
`TITLE_KEY_BY_EVENT_TYPE` map. The full enum has 26 values:

**Join lifecycle** (6): `JOIN_ATTEMPTED`, `JOIN_ALLOWED`, `JOIN_BLOCKED`,
`JOIN_TOKEN_ISSUED`, `JOIN_TOKEN_FAILED`, `RUNTIME_PREPARE_ATTEMPTED`

**Meeting lifecycle** (2): `MEETING_STARTED`, `MEETING_ENDED`

**Session lifecycle** (18): `SESSION_CREATED`, `PAYMENT_PENDING`, `PAYMENT_CONFIRMED`,
`PRACTITIONER_ACCEPTED`, `PRACTITIONER_REJECTED`, `SESSION_CONFIRMED`,
`SESSION_READY_TO_JOIN`, `PATIENT_JOINED`, `PRACTITIONER_JOINED`, `SESSION_STARTED`,
`SESSION_COMPLETED`, `CANCELLED_BY_PATIENT`, `CANCELLED_BY_PRACTITIONER`,
`EXPIRED_UNPAID`, `NO_SHOW_PATIENT`, `NO_SHOW_PRACTITIONER`, `PROVIDER_ROOM_CREATED`,
`PROVIDER_ROOM_ENDED`

All 26 values are present in `TITLE_KEY_BY_EVENT_TYPE`. Any **future or unknown**
`eventType` value that may be added to the database schema **never** falls back to the
raw enum string. The mapper uses `TITLE_KEY_BY_EVENT_TYPE[eventType] ?? 'UNKNOWN_PLATFORM_EVENT'`
— the safe i18n key is always returned.

Frontend `AdminSessionInspectorTimeline.tsx` uses:
```typescript
const eventLabel =
  eventLabels[item.titleKey] ??
  t('inspector.evidenceTimeline.eventTypes.UNKNOWN_PLATFORM_EVENT');
```
This means unknown future event types always render as the localized
"Unknown platform event" label — never a raw English enum identifier.

### Secret redaction (safeMetadataSummary sanitizer)

`safe-metadata.util.ts` `sanitizeSafeMetadata()` enforces these rules on every
metadata object before it enters the timeline response:

**Redacted key patterns** (case-insensitive, top-level keys only, replaced with `[REDACTED]`):

| Category | Patterns |
|---|---|
| Tokens | `token`, `accessToken`, `refreshToken`, `joinToken`, `sessionToken`, `roomToken`, `meetingToken`, `providerToken`, `dailyToken`, `idToken`, `apiToken` |
| Auth headers | `authorization`, `auth`, `bearer`, `authHeader`, `authorizationHeader`, `header`, `headers` |
| Signatures | `signature`, `hmac`, `xDailySignature`, `x-daily-signature`, `dailySignature`, `daily-signature`, `dailySignatureHeader`, `webhookSignature`, `webhook-signature`, `signatureHeader`, `sig` |
| API keys / secrets | `apiKey`, `api_key`, `apiSecret`, `secret`, `clientSecret`, `providerSecret`, `webhookSecret`, `dailyApiKey`, `DAILY_API_KEY`, `webhook` (prefix) |
| JWT | `jwt` |
| Cookies | `cookie`, `cookies`, `setCookie`, `set-cookie` |
| Raw bodies | `rawBody`, `rawHeaders`, `payload`, `body`, `checkoutUrl` |
| Passwords | `password`, `passwordHash` |

**Safe fields returned as-is**: `provider`, `occurredAt`, `errorCode`, `status`,
`reasonCode`, `blockedReason`, `roomName`, `source`, `providerEventType`,
`ingestedAt`, `participantRole`, `participantUserId`.

**Object coercion**:
- Nested `object` values → `"[object]"` (prevents nested token leakage)
- Arrays → comma-joined string (values are not individually redacted, but the
  identifying key itself is redacted when it matches a sensitive pattern)
- `Date` instances → ISO 8601 string
- `null` / `undefined` → `null`
- Primitives (string, number, boolean) → returned as-is

**No-secrets guarantee**: `JSON.stringify(sanitizeSafeMetadata(input))` never contains
any secret token value, authorization header, signature, API key, cookie, or raw body
content for any input matching the redaction patterns above.

### Unknown event type guarantees

`buildPlatformTimeline()` and `buildEvidenceTimeline()` provide these guarantees
for any unknown or future `eventType`:

1. **Never throws** — unknown types pass through without raising an error
2. **`titleKey` is always `'UNKNOWN_PLATFORM_EVENT'`** — never the raw enum string
3. **`safeMetadataSummary` is always preserved** — sanitizer runs on metadata regardless
   of event type
4. **`eventType` field retains the original string** — available for technical debugging
   without surfacing in the localized UI label
5. **`actorRole` defaults to `'UNKNOWN'`** when `actorUserId` does not match the
   session's patient or practitioner user IDs