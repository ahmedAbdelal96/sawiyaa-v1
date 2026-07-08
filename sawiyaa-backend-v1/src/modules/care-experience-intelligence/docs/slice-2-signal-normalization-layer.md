# Care Experience Intelligence Slice 2: Signal Normalization Layer

This slice introduces a shared normalized signal context used by both Guided Matching and Patient Journey.

## Included signals

- Profile context: patient country code and user timezone.
- Assessments: latest completed assessment timestamp and result band.
- Sessions: upcoming-session signal and past-session history signal.
- Payments: pending payment signal.
- Matching: recent matching-session signal.
- academy: active enrollment signal.
- Support: open-ticket signal and latest open-ticket status.

## Deterministic precedence

Continuity stage is resolved in a strict order:

1. `PAYMENT_BLOCKED` when pending payment exists.
2. `UPCOMING_SESSION` when a qualifying upcoming session exists.
3. `ACTIVE_CARE` when active academy enrollment exists.
4. `RETURNING` when past-session or recent-matching history exists.
5. `NEW` when no continuity signals exist.

Applied precedence rules are captured in `continuity.rulesApplied` for explainability and debugging.

## Integration points in this slice

- Matching session creation now uses normalized profile signals as fallback for `countryCode` and `timezone` input normalization.
- Patient Journey next-step assembly now consumes normalized signal booleans for deterministic continuity decisions.

## Out of scope

- Assessment interpretation mapping and recommendation assembly.
- Matching algorithm redesign.
- Patient Journey aggregation redesign.
