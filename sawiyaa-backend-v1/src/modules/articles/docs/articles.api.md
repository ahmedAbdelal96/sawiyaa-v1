# Articles / Content API

## Purpose
Articles module provides public trust-building content with SEO-ready public reads, plus admin-only authoring in current phase.

## Scope (V1)
- Admin-only article authoring and lifecycle (draft/publish/archive)
- Admin-only article category management
- Public published article listing/details
- Public category browsing
- Public trust-read enrichment metadata on article list/details

## Explicit Domain Boundaries
- `ArticleCategory` is separate from specialties and academy/course categories.
- Module is separate from support/care-chat/reviews/matching/assessments domain logic.

## Authoring Policy (Current Phase)
- Only `ADMIN` can create/edit/publish/archive articles and manage categories.
- Practitioner authoring is intentionally deferred.

## Public Visibility Rules
- Public list/category endpoints return only `PUBLISHED` and `PUBLIC` articles.
- Public details endpoint resolves by slug for `PUBLISHED` + (`PUBLIC` or `UNLISTED`) articles.
- Draft/archived/private content is never returned by public endpoints.
- Public payloads never expose moderation internals.

## Public Trust Metadata Rules
- Public list/detail items include `trust` metadata with deterministic fields:
  - `freshnessBand`
  - `isFreshContent`
  - `authorDisplayName` (nullable)
  - `reasonCodes`

## Lifecycle Policy (V1)
- Active lifecycle for this phase is:
  - `DRAFT`
  - `PUBLISHED`
  - `ARCHIVED`
- Publish allowed from draft.
- Archive allowed from draft or published.
- Archive is status-based hiding (non-destructive), not deletion.

## Endpoints

### Public
- `GET /api/v1/articles`
- `GET /api/v1/articles/:slug`
- `GET /api/v1/article-categories`
- `GET /api/v1/article-categories/:slug/articles`

### Admin
- `POST /api/v1/admin/articles`
- `GET /api/v1/admin/articles`
- `GET /api/v1/admin/articles/:id`
- `PATCH /api/v1/admin/articles/:id`
- `PATCH /api/v1/admin/articles/:id/publish`
- `PATCH /api/v1/admin/articles/:id/archive`
- `POST /api/v1/admin/article-categories`
- `GET /api/v1/admin/article-categories`
- `GET /api/v1/admin/article-categories/:id`
- `PATCH /api/v1/admin/article-categories/:id`

## Deferred (Additive Later)
- Practitioner authoring/editorial workflow
- Tag browsing endpoints
- Content recommendation integration with assessments/patient-journey/matching
- Extended SEO/distribution analytics

## Locale-Safe Translation Update Rule
- `PATCH /api/v1/admin/articles/:id` supports metadata-only updates without locale (e.g. category/cover image).
- If any translation field is patched (`title`, `slug`, `excerpt`, `content`, `metaTitle`, `metaDescription`), `locale` is required.
- Translation updates are resolved strictly by `(articleId, locale)` and never by array-order fallback.
