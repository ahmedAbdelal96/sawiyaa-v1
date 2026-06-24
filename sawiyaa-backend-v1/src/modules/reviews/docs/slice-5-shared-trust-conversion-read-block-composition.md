# Content + Reviews Deeper Expansion — Final Slice

## Scope Delivered
- Added a shared, frontend-ready trust/conversion read block endpoint:
  - `GET /api/v1/public/practitioners/:slug/trust-block`
- Composes safe existing read layers:
  - practitioner trust summary
  - moderation-safe public review snippets
  - public-safe article content suggestions

## Composition Principles
- Deterministic and read-only.
- No moderation internals in payload.
- Stable capped blocks:
  - review snippets capped by `reviewLimit`
  - content suggestions capped by `contentLimit`
- Content deduplication and fallback query handling are explicit.

## Contract Sections
- `practitioner`
- `summary`
- `highlightedReviews`
- `contentSuggestions`
- `compositionMeta`

## Safety
- Practitioner visibility uses existing public practitioner constraints.
- Review snippets use existing published-only public review surfacing rules.
- Content suggestions use existing published public article read layer and trust-safe article presenter.
