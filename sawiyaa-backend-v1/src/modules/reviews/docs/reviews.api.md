# Reviews / Ratings Module API

## Scope
- Session-linked patient reviews only.
- One review per completed and paid session.
- Reviews are immutable after submission in V1.
- Moderation controls public text visibility.

## Eligibility Rules
- Only authenticated patient owners can submit.
- Session must belong to patient.
- Session status must be `COMPLETED`.
- Session must have captured payment (`PaymentStatus.CAPTURED`).
- One review per session enforced by business rule + unique session constraint.

## Moderation Policy (V1)
- Submitted review status starts at `PENDING_MODERATION`.
- Rating contributes to practitioner summary while review is in countable states:
  - `PENDING_MODERATION`
  - `PUBLISHED`
  - `REJECTED`
  - `HIDDEN`
- Text review is publicly visible only when review status is `PUBLISHED`.

## Endpoints

### Patient
- `POST /api/v1/patients/me/sessions/:id/review`
- `GET /api/v1/patients/me/reviews`
- `GET /api/v1/patients/me/reviews/:id`

### Public
- `GET /api/v1/public/practitioners/:slug/reviews`
- `GET /api/v1/public/practitioners/:slug/trust-summary`
- `GET /api/v1/public/practitioners/:slug/trust-block`

### Admin / Moderation
- `GET /api/v1/admin/reviews`
- `GET /api/v1/admin/reviews/:id`
- `PATCH /api/v1/admin/reviews/:id/moderation`

## Public Safety Rules
- No patient identity in public review payloads.
- No moderation note exposure in public/patient payloads.
- Public list only includes published text snippets.
- Trust summary uses moderation-safe public review signals only (`PUBLISHED`, not hidden/archived, and visible on public surface).
- Trust block composition reuses existing moderation-safe reads (trust summary + published review snippets + public-safe content suggestions).

## Future Additive Extensions (Non-breaking)
- Optional dimension ratings (communication, understanding, punctuality).
- Optional patient review prompt in patient journey read layer.
- Practitioner public profile enrichment with richer review snippets.
- Moderation queue UX improvements and analytics surfaces.
