# Session Join policy consolidation — Phase 2G

**Status: COMPLETE**

## Canonical policy graph

`resolveSessionJoinPolicy` is the single pure rules engine. The injected
`ResolveSessionJoinReadinessService` is its canonical application boundary: it
supplies the configured prepare lead and returns the complete resolution,
including join and prepare permissions, reason code, and all window timestamps.

`SessionOperationalInterpreterService` consumes that boundary to build
`operational.join`. Patient action projection, runtime preparation, Admin
inspection, notification sweep, and join bootstrap also consume it.

## Read versus command responsibilities

Read-time policy is deterministic and side-effect free: Session facts, persisted
window timestamps, policy snapshot settings, room-closed facts, and explicit
`now` produce eligibility, reason, and windows. It does not call providers or
mutate data.

The bootstrap and runtime commands reload Session facts, assert participant
ownership, invoke the same policy, and only then perform command-only work:
event writing, room provisioning, provider selection, credential issuance,
transactions, idempotency behavior, and provider-failure handling. A previous
`operational.join.allowed` value is never trusted for issuance.

## Consolidation result

- Added persisted `joinOpenAt`/`joinCloseAt` to every affected injected-policy
  call, eliminating fallback window arithmetic where authoritative timestamps
  are already loaded.
- `operational.join.opensAt` and `closesAt` now come from the same policy
  resolution as `allowed` and `reasonCode`.
- Bootstrap no longer directly invokes the pure policy for window output or
  token expiry; it consumes its fresh injected-policy resolution.
- Patient action projection now consumes the same injected policy boundary.
- Removed stale Package and next-session imports of retired availability
  adapters. The next-session projection no longer depends on its previous
  schedule-policy dependency.

## Safety and reasons

The policy denies non-video, terminal/non-joinable, missing-window, closed-room,
too-early, post-window, and unprepared-runtime states with the existing shared
reason codes. `AWAITING_ADMIN_RESOLUTION` is non-joinable because it is outside
the canonical allowed status set. Room closure is evaluated before temporal
join allowance.

Post-end reconnect grace remains a command-only exception: it still requires
fresh facts, a prepared/open room, and prior participant evidence. It does not
change read-time eligibility or cause provider work during ordinary reads.

## Verification

- Backend typecheck passed.
- Join readiness, join bootstrap, and runtime-prepare suites passed: 32 tests.
- Web typecheck and Session contract guard passed unchanged.
- No provider call was added to operational reads.

## Remaining technical debt

The pure utility retains an obsolete availability-view-model builder only for
its focused historical utility tests; it has no production consumer. It can be
deleted when that test suite is reduced to policy-resolution assertions. Admin
forensic and Chat-domain policies remain intentionally separate.
