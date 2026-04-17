# Patient Journey Read Layer API

## Purpose

Patient Journey is a patient-facing read/orchestration layer.
It aggregates facts from existing domains into one coherent "My Journey" payload.

It does **not** replace sessions, payments, matching, assessments, or support business logic.
It is not a source of truth; source-of-truth ownership remains in the underlying domain modules.

## Endpoint

- `GET /api/v1/patients/me/journey`

## Included Sections

- `summary`
- `upcoming`
- `recentHistory`
- `support`
- `linkedContent`
- `nextSteps`

## Read Sources

- Sessions (upcoming + recent past)
- Payments (pending + recent summaries)
- Instant booking requests (pending snapshot)
- Assessments (latest + recent completed)
- Matching sessions (latest + recent context)
- Support tickets (latest open ticket snapshot)

## Explicit Exclusions

- No mutation/write actions for sessions/payments/matching/assessments/support
- No internal support notes
- No admin-only fields
- No clinical diagnosis output
- No care-chat orchestration

## Next-step Guidance

Next-step items are deterministic and rule-based.
They are practical continuity prompts (e.g., complete payment, join session, start matching), not clinical advice.

## Linked Content Guidance

`linkedContent` is a deterministic, read-only article suggestion block.
It is assembled from public-safe published content using explicit journey/care-intent rules.
Each linked item includes rationale fields (`reasonCode`, `reasonText`) and never exposes moderation internals.

## Forward Compatibility

Future journey enhancements (timeline depth, content hooks, rebooking prompts, mobile-specific shaping) are additive on top of this endpoint contract.
