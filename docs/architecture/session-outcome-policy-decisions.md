# Session Outcome Policy Decisions

## Current implementation

`SessionOutcomeEvaluator` is a pure, read-only classifier. It consumes the
normalized attendance summary and a resolved policy snapshot. It does not read
raw Daily payloads, call a repository, write a status, create a lifecycle event,
or perform payment, package, earning, refund, settlement, or payout work.

The Admin attendance orchestration currently resolves:

- completion overlap: 70 percent;
- minimum overlap: 20 minutes;
- patient no-show grace: 15 minutes;
- practitioner no-show grace: 10 minutes;
- finalization grace: `SESSION_COMPLETION_CONFIRMATION_SWEEPER_GRACE_MINUTES`,
  default 15 minutes.

Completion and no-show thresholds are code-owned today. Finalization grace is
an operational ENV override inherited from the existing confirmation sweeper.
No policy is persisted on the Session row.

## Runtime proof status

The existing persisted model proves Daily room identifiers, signed attendance
metadata, trusted participant identity resolution, ingestion keys, provider
event references, participant intervals, meeting started/ended evidence,
platform join attempts, token issuance, room-close state, and runtime prepare
failures. It does not persist a provider health ledger, webhook accepted/rejected
counters, outage marker, reconciliation completion, or a late-event watermark.

Therefore:

- one-party no-show can remain an advisory candidate when trusted positive
  evidence exists, but `eligibleForAutomaticFinalization` is false until
  reconciliation is confirmed;
- both-no-show is not reachable from the real Admin orchestration because it
  deliberately supplies `reconciliationCompleted: false`;
- provider health is not strong enough for financial automation;
- no Daily REST reconciliation or external provider call is part of this phase.

## One-party trust matrix

| Available evidence                                  | Candidate classification                        | Auto-finalize later now | Reconciliation | Admin                           |
| --------------------------------------------------- | ----------------------------------------------- | ----------------------- | -------------- | ------------------------------- |
| One trusted party joined; other has no events       | Advisory one-party no-show                      | No                      | Required       | Required before terminal action |
| Trusted party joined; unknown identity also present | Admin review                                    | No                      | Required       | Yes                             |
| Trusted party joined; provider outage known         | Admin review                                    | No                      | Required       | Yes                             |
| Trusted party joined; room creation failed          | Admin review                                    | No                      | Required       | Yes                             |
| Trusted party joined; meeting ended received        | Advisory candidate only                         | No                      | Required       | Yes before action               |
| Trusted party joined; meeting ended missing         | Admin review unless bounds are otherwise proven | No                      | Required       | Yes                             |
| Trusted party joined; webhook delay suspected       | Admin review                                    | No                      | Required       | Yes                             |
| Trusted party joined; late event arrives later      | Admin review / late-event risk                  | No                      | Required       | Yes                             |
| Other has display-name-only event                   | Admin review                                    | No                      | Required       | Yes                             |

Missing events are never treated as proof of absence. Signed HMAC proves
message authenticity, not complete provider delivery.

## Both-no-show decision

`AUTO_BOTH_NO_SHOW` remains a supported pure-evaluator classification for a
future caller with positive provider health, authenticated evidence, known
meeting bounds, successful room creation, and completed reconciliation. The
current Admin caller cannot supply that proof and returns `NEEDS_ADMIN_REVIEW`
for both-absent sessions.

## Duration inventory and policy

The booking DTO, session duration validator, availability types, availability
validator, and Prisma check constraint support only 30 and 60 minutes. There is
no supported 15, 20, 45, or custom booking duration in the current runtime.

| Duration | 70 percent requirement | 20-minute minimum | Effective overlap | Can complete?                                                  |
| -------: | ---------------------: | ----------------: | ----------------: | -------------------------------------------------------------- |
|       15 |               10.5 min |            20 min |            20 min | Not a supported duration; mathematically impossible if enabled |
|       20 |                 14 min |            20 min |            20 min | Not a supported duration                                       |
|       30 |                 21 min |            20 min |            21 min | Yes                                                            |
|       45 |               31.5 min |            20 min |          31.5 min | Not a supported duration                                       |
|       60 |                 42 min |            20 min |            42 min | Yes                                                            |
|   custom |             70 percent |            20 min |       max of both | Not supported                                                  |

The current rule is inclusive and compares integer seconds for the minimum and
unrounded percentage for the percentage test.

### Options requiring owner approval

| Option                        | Benefit                               | Risk                                                          | Decision               |
| ----------------------------- | ------------------------------------- | ------------------------------------------------------------- | ---------------------- |
| Current dual threshold        | Simple, protects long-session quality | No short-session support; false negatives for short sessions  | Current implementation |
| Percentage only               | Uniform relative rule                 | Very short sessions can complete with little absolute contact | Not approved           |
| Duration-aware capped minimum | Handles short sessions consistently   | Introduces a new policy formula and audit surface             | Not approved           |
| Per-duration rules            | Most flexible                         | Unnecessary complexity and policy drift                       | Not recommended        |

Recommendation: keep the current dual rule for the currently supported 30/60
durations. The owner must approve any new duration or threshold change before
Phase 3.

## Policy ownership

| Policy                      | Value                            | Current source                    | Duplicate sources                 | Recommended owner                                                     |
| --------------------------- | -------------------------------- | --------------------------------- | --------------------------------- | --------------------------------------------------------------------- |
| Completion percentage       | 70%                              | `attendance-summary.config.ts`    | Legacy engine reads same constant | Code invariant until approved Config DB migration                     |
| Minimum overlap             | 20 min                           | `attendance-summary.config.ts`    | Legacy engine reads same constant | Code invariant until approved Config DB migration                     |
| Patient no-show grace       | 15 min                           | `attendance-summary.config.ts`    | Legacy engine reads same constant | Code invariant until approved Config DB migration                     |
| Practitioner no-show grace  | 10 min                           | `attendance-summary.config.ts`    | Legacy engine reads same constant | Code invariant until approved Config DB migration                     |
| Finalization grace          | 15 min default plus ENV override | Existing confirmation sweeper ENV | Evaluator resolver and sweeper    | Config DB business policy; ENV only for scheduler/provider operations |
| Replay age                  | 24 hours                         | Daily trust config                | Normalizer only                   | ENV/security policy or code invariant                                 |
| Future timestamp tolerance  | 5 minutes                        | Daily trust config                | Normalizer only                   | ENV/security policy or code invariant                                 |
| Runtime join window         | 2-minute lead, 0-minute lag      | Session join policy utility       | Normalizer uses canonical utility | Code invariant                                                        |
| Technical reconnect gap     | 3 minutes                        | `attendance-summary.config.ts`    | Attendance engine only            | Code invariant                                                        |
| Reconnect warning threshold | 3 reconnects                     | `attendance-summary.config.ts`    | Attendance engine only            | Code invariant                                                        |

The evaluator receives one policy object and does not search multiple sources.

## Snapshot strategy

The current implementation uses the live resolved policy at evaluation time and
returns it in a transient `policySnapshot`; it is not persisted. For fairness,
auditability, package consistency, and rescheduling safety, Phase 3 should
introduce a versioned policy snapshot at the point the session becomes
`UPCOMING` (after payment/booking confirmation), not at read time. The minimal
future fields are a policy version and the five resolved threshold values on
the Session record or an immutable policy snapshot relation. Existing sessions
would require a documented backfill version and no silent historical rewrite.

No schema change is made in this phase.

## Finalization grace and late events

Finalization delay, provider late-event tolerance, and scheduler polling are
different concepts. The existing 15-minute ENV is currently reused for the
confirmation sweeper and evaluator readiness; it should become a business
Config DB policy in a future phase, while polling remains operational code and
provider security tolerances remain ENV/code.

Recommended Phase 3 late-event policy:

- re-read the latest evidence under the session row lock before any terminal
  write;
- keep the session non-terminal through the approved provider late-event
  window;
- accept idempotent duplicates without reopening anything;
- route new conflicting or late evidence to Admin review;
- never auto-reopen a terminal outcome without an explicit manual policy;
- hold any downstream earning or payout eligibility until the late-event and
  dispute windows are closed.

No correction, reversal, reopening, or financial hold is implemented here.

## Phase 3 readiness contract

| Prerequisite                            | Status                                           |
| --------------------------------------- | ------------------------------------------------ |
| Completion policy approved              | BUSINESS_APPROVAL_REQUIRED                       |
| Supported durations approved            | BUSINESS_APPROVAL_REQUIRED                       |
| One-party no-show policy approved       | BUSINESS_APPROVAL_REQUIRED                       |
| Both-no-show automation decision        | PROVIDER_RUNTIME_PROOF_REQUIRED                  |
| Policy owner and versioning             | BUSINESS_APPROVAL_REQUIRED                       |
| Session policy snapshot                 | TECHNICAL_IMPLEMENTATION_REQUIRED                |
| Finalization grace separation           | BUSINESS_APPROVAL_REQUIRED                       |
| Late-event policy                       | BUSINESS_APPROVAL_REQUIRED                       |
| Row lock/idempotency finalizer          | CODE_READY in principle; implementation deferred |
| Provider-health/reconciliation evidence | PROVIDER_RUNTIME_PROOF_REQUIRED                  |
| Financial/package effect matrix         | BUSINESS_APPROVAL_REQUIRED                       |
| Admin override and audit snapshot       | TECHNICAL_IMPLEMENTATION_REQUIRED                |

## Phase 2.5 persisted policy

Policy is captured at the first `PENDING_* -> UPCOMING` lifecycle transition.
The snapshot is typed, versioned, transactionally coupled to that transition,
and immutable after capture. `finalizationGraceMinutes` remains the existing
15-minute sweeper policy by default; `lateEvidenceWaitingMinutes` is explicit
and currently zero to avoid double-counting the same hold. Evaluation due time
is `scheduledEndAt + finalizationGrace + lateEvidenceWait`.

The additive migration adds one policy snapshot and versioned reconciliation
records with uniqueness and non-negative constraints. A legacy backfill is
deferred and must not run against the normal development database. The Admin
response exposes sanitized snapshot and reconciliation metadata only.

## Database proof

`DB_INTEGRATION_PROVEN = NOT_PROVEN`.

No isolated PostgreSQL database was available and no database was created or
mutated. Unit and mocked orchestration tests prove shape and no-write behavior
only; they are not a substitute for PostgreSQL integration proof.
