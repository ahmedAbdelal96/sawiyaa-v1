# Sawiyaa Frontend Structure

## Primary route groups

- `src/app/[locale]/(public)` for the public website shell
- `src/app/[locale]/(auth)` for sign-in and sign-up entry points
- `src/app/[locale]/(patient)` for patient-area routes under `/patient/*`
- `src/app/[locale]/(practitioner)` for practitioner routes under `/practitioner/*`
- `src/app/[locale]/(admin)` for admin routes under `/admin/*`
- `src/app/[locale]/(admin)/super-admin` for platform-level routes under `/super-admin/*`

## Source boundaries

- `src/components/ui` for generic reusable primitives
- `src/components/shared` for app-wide shared components
- `src/components/auth` for authentication-specific UI
- `src/components/public`, `src/components/patient`, `src/components/practitioner`, `src/components/admin` for area-specific UI
- `src/config/navigation` for area-based navigation definitions
- `src/features` for future domain modules
- `src/lib/auth` and `src/lib/api` for authentication and data foundations

## Notes

- This repository intentionally removes template-only pages, charts, promo widgets, and sample media assets.
- Business features should be implemented inside `src/features/*` and then composed into the correct area route group.
- The detailed structure plan is documented in `FRONTEND_STRUCTURE_PLAN.md`.
