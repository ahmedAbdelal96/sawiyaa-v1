# Sawiyaa Backend Current State Audit

Updated: 2026-04-06

## 1) Executive Summary

Backend is in a strong production-meaningful baseline for the current guided-care scope.

Current truth from code:

- Core domains are implemented with real controllers/use-cases and contract-oriented DTOs.
- Training, settings, and general chat are implemented as backend modules (not `.gitkeep`-only).
- Payment providers include Stripe and Paymob adapters with webhook handling; parity still depends on environment enablement and operational hardening.
- Main remaining debt is documentation alignment and additive depth decisions, not missing core modules.

## 2) Audited Scope

Primary code evidence:

- `src/app.module.ts` module wiring.
- `src/modules/**/controllers/*.controller.ts`.
- `src/modules/**/dto/*.ts`.
- Module-local docs where present under `src/modules/**/docs/*.md`.

## 3) Implemented Backend Surface (Controller-Level)

### 3.1 Foundation / Platform

- Health: `/health`
- Config resolver: `/config/*`
- Users bootstrap: `/users/*`
- Global i18n/logging/error-response baseline wired in app setup.

### 3.2 Auth and Account Access

- Patient auth: `/auth/patient/*`
- Practitioner auth: `/auth/practitioner/*`
- Admin auth: `/auth/admin/*`
- Current auth user: `/auth/me`

### 3.3 Public Discovery / Trust / Content

- Public practitioners: `/public/practitioners`, `/public/practitioners/:slug`
- Public availability/presence: `/public/practitioners/:slug/availability`, `/public/practitioners/:slug/presence`
- Public reviews/trust: `/public/practitioners/:slug/reviews`, `/trust-summary`, `/trust-block`
- Public specialties routes and public articles routes
- Public trainings: `/trainings`, `/trainings/:slug`

### 3.4 Patient / Practitioner / Admin Operational Domains

- Patient journey: `/patients/me/journey`
- Matching: `/matching/sessions/*`
- Assessments: public + patient-owned submission/history routes
- Sessions: patient/practitioner/admin session controllers
- Instant booking: patient/practitioner request lifecycle
- Support: patient/practitioner/admin ticket ops
- Care-chat approval flows: patient/practitioner/admin
- Reviews: patient submit/list + admin moderation
- Practitioner profile/readiness self-service
- Admin practitioner applications

### 3.5 Payments and Financial Operations

- Patient payments: initiate/list/detail under patient scope
- Payment webhooks: `/payments/webhooks/stripe`, `/payments/webhooks/paymob`
- Admin payment ops + refunds: `/admin/payments/:id`, `/:id/refunds`, retry endpoint
- Financial rules:
  - `/admin/commission-rules`
  - `/admin/coupons`
  - `/patients/me/sessions/:id/coupons/validate`
  - `/patients/me/sessions/:id/financial-breakdown`
- Financial operations:
  - Admin finance ops list/detail: `/admin/finance/operations`
  - Admin settlements: `/admin/settlements`
  - Practitioner wallet/ledger/settlements under `/practitioners/me/*`

### 3.6 Admin Ops Expansion

- Moderation reports: `/admin/moderation/reports` (+ intake route family in moderation module)
- Notifications diagnostics: `/admin/notifications`, `/admin/notifications/:id`
- Admin specialties: `/admin/specialties/*`
- Admin articles + article categories
- Admin session runtime operations routes
- Admin trainings management: `/admin/trainings/*` (+ schedules/enrollments attendance operations)

### 3.7 Settings and General Chat (Backend-Real, Product-Deferred in Frontend)

- Settings baseline: `/settings/me`, `/settings/me/preferences`, `/settings/me/notification-preferences`
- General chat conversations: `/chat/conversations/*`

These are real backend contracts and should not be documented as "missing".
They remain deferred in frontend product scope by explicit choice.

## 4) Strong Areas

- Contract-first modular architecture with thin controllers and use-case boundaries.
- Broad controller coverage across public/patient/practitioner/admin operational lanes.
- Real machine-readable error strategy and normalized success/error envelopes.
- Training and financial operations are no longer conceptual; both have active API surfaces.

## 5) Partial / Intentionally Narrow Areas

- Notifications currently emphasize admin/support diagnostics, not a full end-user notification center.
- Settings includes slice-1 semantics in some operations (validation/normalization boundaries are explicit in controller descriptions).
- Some operational suites are baseline-first by design (additive depth possible later).

## 6) Deferred-by-Product (Not Backend-Missing)

- General chat as a full product domain in frontend.
- General settings as a full frontend domain.

Backend has contracts; frontend deferral is a product-scope decision.

## 7) Documentation Drift Fixed by This Audit

No longer accurate and now corrected:

- "training module not started / `.gitkeep` only"
- "settings module not started"
- "chat module not started"
- "Paymob webhook/use-case not implemented"

## 8) Remaining Backend Documentation Debt

- Keep root `README.md` strictly aligned with current module truth and remove template residue.
- Keep docs synchronized whenever controller/DTO contracts change.
- Keep additive scope decisions explicit (what is baseline vs intentionally deferred vs expanded).
