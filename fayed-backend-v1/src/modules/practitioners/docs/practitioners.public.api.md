# Practitioners Public Read API

## Purpose

Public read-only API for practitioner pages used by frontend public routes and SEO pages.

This scope includes:
- listing practitioners
- fetching one practitioner by public slug
- baseline filtering/search/sort

This scope excludes:
- booking
- payments
- chat
- admin moderation/review data
- private credentials data
- update/edit endpoints

## Endpoints

- `GET /public/practitioners`
- `GET /public/practitioners/:slug`

## Public Slug Contract

- Public details route is **slug-based**, not id-based.
- Frontend route contract: `/practitioners/[slug]`.
- Slug source: `PractitionerProfile.publicSlug`.
- `publicSlug` is unique in schema and treated as stable public identifier after creation.
- Current generation baseline uses draft-slug helper with normalized seed + short suffix to avoid collisions.

## Visibility Policy

Only practitioners matching public-visibility baseline are returned:
- `PractitionerProfile.status = APPROVED`
- `User.status = ACTIVE`
- `PractitionerProfile.isPublicProfilePublished = true`
- `PractitionerProfile.publicSlug` exists and is non-empty
- profile has display name
- profile has professional title
- profile has bio
- profile has at least one **active** specialty (`Specialty.isActive = true`)

Visibility decisions are centralized in:
- `PublicPractitionerVisibilityPolicy`

## Query Params (Listing)

- `search`: search in display name, professional title, bio, and specialty title
- `specialtySlug`: specialty slug filter (active specialties only)
- `language`: language code filter (`ar`, `en`, ...)
- `sort`: `recommended` | `experience` | `rating`
- `page`, `limit`: pagination baseline

Backward compatibility aliases accepted temporarily (not public contract):
- `q` -> `search`
- `specialty` -> `specialtySlug`
- `lang` -> `language`

## Public-Safe Response Notes

Included:
- slug
- display/professional profile basics
- specialties (active only)
- languages
- country code
- years of experience
- rating summary
- avatar
- public-safe credentials summary (counts only)

Excluded intentionally:
- email/phone
- application/review notes
- moderation/admin metadata
- OTP/session/token/auth internals
- private credential files
- speculative placeholders (for example therapeutic approach)
- session runtime-derived fields (for example session modes)

## Response Contract

Listing:
- `success: true`
- `data.items[]`
- `data.pagination.page`
- `data.pagination.limit`
- `data.pagination.totalItems`
- `data.pagination.totalPages`

Details:
- `success: true`
- `data.item`

No success `message` field is included in `data`.
