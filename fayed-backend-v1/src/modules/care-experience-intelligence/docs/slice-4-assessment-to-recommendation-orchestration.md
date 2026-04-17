# Care Experience Intelligence Slice 4: Assessment-to-Recommendation Orchestration

This slice converts interpreted assessment signals into shared recommendation items.

## Shared orchestration service

`BuildAssessmentDerivedRecommendationsService` maps interpreted assessment actions into the existing shared recommendation contract.

## Deterministic mapping baseline

- `COMPLETE_PAYMENT` -> `COMPLETE_PAYMENT`
- `CONTINUE_CURRENT_PLAN` -> `JOIN_UPCOMING_SESSION`
- `TAKE_ASSESSMENT` -> `TAKE_ASSESSMENT`
- `START_MATCHING` / `MONITOR_AND_SUPPORT` -> `START_GUIDED_MATCHING`
- `BOOK_CONSULTATION` / `BOOK_PRIORITY_CONSULTATION` -> `BOOK_NEXT_SESSION`

Only one assessment-derived recommendation is emitted per interpretation input to avoid contradictory assessment outputs.

## Explainability and reason propagation

- `reasonCode` is propagated from interpretation reasons with explicit override precedence:
  1. `PENDING_PAYMENT_ACTION_BLOCK`
  2. `UPCOMING_SESSION_CONTINUITY_OVERRIDE`
  3. first interpretation reason code
- `reasonText`, `action`, and `entityRefs` are explicitly set for frontend-safe consumption.

## Reuse integration in this slice

- Matching consumes assessment-derived recommendations and merges them with practitioner-match recommendations through shared precedence ordering.
- Patient Journey consumes the same assessment-derived recommendations and maps them into next-step items.

## Out of scope

- Matching scoring redesign.
- Broad patient journey composition redesign.
- ML/personalization infrastructure.
