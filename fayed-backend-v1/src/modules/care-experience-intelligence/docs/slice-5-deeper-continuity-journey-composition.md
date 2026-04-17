# Care Experience Intelligence Slice 5: Deeper Continuity and Journey Composition

This slice strengthens journey composition by combining continuity stage, training/activity state, operational blockers, and assessment-derived recommendations into deterministic next-step output.

## Continuity scenarios covered

- New user with no activity (`NEW`)
- Payment-blocked continuity (`PAYMENT_BLOCKED`)
- Upcoming-session continuity (`UPCOMING_SESSION`)
- Returning continuity (`RETURNING`)
- Active care/training continuity (`ACTIVE_CARE`)

## Composition behavior

- Journey now composes recommendations from:
  - continuity stage
  - pending payment/upcoming session/support state
  - active training signal
  - assessment-derived recommendation items
- Ordering remains deterministic through shared precedence.
- Dedupe is applied after ordering so highest-priority same-type item is preserved.

## Conflict resolution

To prevent contradictory payloads:

- If `COMPLETE_PAYMENT` exists, conflicting progression actions are removed.
- If `JOIN_UPCOMING_SESSION` exists, future-booking/matching noise is removed.
- If `BOOK_NEXT_SESSION` exists, lower-value conflicting discovery actions are pruned.
- `VIEW_SUPPORT_TICKET` can coexist as an operationally valid secondary action.

## Explainability

Each surfaced action keeps explicit rationale (`reasonCode`, `reasonText`) derived from real state and/or assessment interpretation mappings.

## Out of scope

- Matching score algorithm redesign.
- ML/personalization infrastructure.
- Write-side effects from patient journey reads.
