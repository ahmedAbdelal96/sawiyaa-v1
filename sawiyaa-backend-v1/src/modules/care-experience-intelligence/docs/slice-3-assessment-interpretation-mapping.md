# Care Experience Intelligence Slice 3: Assessment Interpretation Mapping

This slice introduces deterministic interpretation of assessment outputs into reusable care-intent signals.

## Interpretation output baseline

Each normalized context now includes `assessments.interpretation` with:

- `hasAssessmentSignal`
- `latestBand`
- `severityScore` (`0..4`)
- `careIntentLevel`
- `actionCategory`
- `reasonCodes`
- `isActionBlockedByPayment`

## Deterministic mapping rules

- Assessment band baseline:
  - `LOW` => `SELF_GUIDED` + `MONITOR_AND_SUPPORT`
  - `MILD` => `GUIDED_MATCHING` + `START_MATCHING`
  - `MODERATE` => `BOOK_SOON` + `BOOK_CONSULTATION`
  - `HIGH` => `BOOK_PRIORITY` + `BOOK_PRIORITY_CONSULTATION`
- Missing assessment => `NO_ASSESSMENT` + `TAKE_ASSESSMENT`.

## Conflict and precedence handling

Precedence is explicit and deterministic:

1. Start from assessment-band mapping.
2. If an upcoming session exists, action becomes `CONTINUE_CURRENT_PLAN`.
3. If pending payment exists, action becomes `COMPLETE_PAYMENT` (final override).

All applied decisions are reflected in stable `reasonCodes`.

## Out of scope

- Assessment-to-recommendation orchestration.
- Matching algorithm redesign.
- Patient journey contract expansion.
