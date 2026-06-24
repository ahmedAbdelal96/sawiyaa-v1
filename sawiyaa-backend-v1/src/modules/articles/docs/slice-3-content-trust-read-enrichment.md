# Content + Reviews Deeper Expansion — Slice 3

## Scope Delivered
- Public article list/details now include deterministic trust metadata.
- Trust enrichment uses only safe public signals:
  - `publishedAt`
  - `authorUser.displayName` (nullable)
- Public visibility rules stay strict (`PUBLISHED` + allowed visibility + `publishedAt <= now`).

## Trust Metadata Contract
- `trust.freshnessBand`: `NEW | RECENT | ESTABLISHED | UNPUBLISHED`
- `trust.isFreshContent`: boolean
- `trust.authorDisplayName`: string | null
- `trust.reasonCodes`:
  - `PUBLISHED_DATE_VERIFIED`
  - `RECENTLY_PUBLISHED` or `ESTABLISHED_CONTENT`
  - `AUTHOR_ATTRIBUTED` or `AUTHOR_UNATTRIBUTED`

## Determinism Rules
- Freshness band is derived from published age:
  - `NEW` <= 7 days
  - `RECENT` <= 30 days
  - otherwise `ESTABLISHED`
- List ordering is deterministic:
  - `publishedAt desc`
  - `createdAt desc`
  - `id asc`

## Safety Guarantees
- Public payloads do not expose moderation internals.
- Hidden/unpublished/private content remains excluded by repository visibility filters.
- Trust metadata is read-only enrichment and does not mutate content lifecycle.
