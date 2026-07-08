# Specialties Localization

This document defines the localized name contract for specialties and specialty categories.

## Entity model

- `SpecialtyCategory` is the primary care path or primary category.
- `Specialty` is the secondary specialty.
- Both entities now carry:
  - `nameAr`
  - `nameEn`
- Legacy `name` remains for compatibility.
- `SpecialtyTranslation` also remains for compatibility and fallback use.

## Display fallback

- Arabic UI: `nameAr -> nameEn -> legacy name/title -> slug`
- English UI: `nameEn -> nameAr -> legacy name/title -> slug`
- The fallback is for display only.
- The fallback must not initialize admin edit forms.

## Admin rules

- Admin create and edit forms must use raw fields.
- Arabic inputs bind to `nameAr`.
- English inputs bind to `nameEn`.
- If `nameEn` is missing, the English field should remain empty unless a deliberate product rule says otherwise.
- Do not copy the localized display label back into the raw edit fields.

## Public rules

- Public specialty and category pages use the locale-aware display helper.
- Arabic public pages should prefer Arabic names.
- English public pages should prefer English names.
- No screen should show a blank specialty or category name when a fallback value exists.
- No raw translation key should appear in visible UI.

## Backend rules

- Normal reads should use Prisma ORM.
- Do not add raw SQL fallbacks for missing localized columns.
- Search should use Prisma `OR` filters across the localized fields and legacy compatibility fields.
- The backend should return both `nameAr` and `nameEn` so the frontend can render safely.

## Migration rule

- If the deployed code expects `nameAr` and `nameEn`, the database migration must be applied first.
- A missing column is a rollout problem, not a reason to hide the issue with raw SQL.

## Related docs

- [Booking, sessions, and availability](booking-sessions-and-availability.md)
- [Platform overview](platform-overview.md)
- [Production rollout](production-rollout.md)
