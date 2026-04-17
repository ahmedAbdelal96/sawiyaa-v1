# Content + Reviews Expansion Slice 1: Review Visibility and Moderation-Safe Surfacing

This slice hardens public review surfacing for trust-safe frontend consumption.

## Public visibility rules

Public review list inclusion now requires all of:

- `reviewStatus = PUBLISHED`
- `publishedAt != null`
- `hiddenAt = null`
- `archivedAt = null`
- `reviewText` present and non-empty

These rules are centralized in `public-review-visibility.policy.ts` and reused by repository public reads.

## Deterministic ordering

Public reviews are ordered by:

1. `publishedAt desc`
2. `submittedAt desc`
3. `id asc` (deterministic tie-breaker)

## Public contract safety

Public review payload remains limited to safe fields:

- `id`
- `overallRating`
- `textReview`
- `submittedAt`
- `publishedAt`

No moderation internals are exposed in public responses.

## Out of scope for this slice

- Practitioner credibility summary aggregation
- Article trust enrichment
- Care-intent linkage
- Shared trust/conversion blocks
