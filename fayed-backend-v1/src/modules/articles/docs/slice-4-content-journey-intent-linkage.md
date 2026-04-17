# Content + Reviews Deeper Expansion — Slice 4

## Scope Delivered
- Added deterministic, read-only linkage from care-intent/journey context to public-safe content suggestions.
- Linked content is exposed through patient journey as `linkedContent`.
- Linkage reuses existing public article read logic (`ListPublicArticlesUseCase`) to preserve visibility safety.

## Rule-Based Linkage Inputs
- `suggestedNextAction` from patient journey orchestration
- continuity stage (`PAYMENT_BLOCKED`, `UPCOMING_SESSION`, `ACTIVE_CARE`, etc.)
- assessment interpretation action category (from normalized care-intelligence signals)

## Safety and Noise Controls
- Public-safe content only (already filtered by article public visibility rules).
- Deterministic rule order and capped output (`maxSuggestions = 3`).
- De-duplication by article id across rule passes.
- Explainability fields included per linked item:
  - `reasonCode`
  - `reasonText`

## Explicit Non-Goals in This Slice
- No CMS/editorial workflow redesign
- No ML personalization
- No search/discovery platform expansion
- No shared trust/conversion super-block composition (deferred to next slice)
