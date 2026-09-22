# Sawiyaa Content Localization Tracker

This tracker records backend-owned localization work. Frontend system UI
copy remains owned by the Web/Mobile i18n layers.

## Phases

- [x] BLOC-0 — Contract discovery
- [x] BLOC-1 — Specialty / Discovery localization contract consolidation
- [x] BLOC-2 — Practitioner professional content
- [ ] BLOC-3 — Editorial completeness
- [ ] BLOC-4 — Locale-resolution consolidation
- [ ] BLOC-5 — Cross-client validation

- [x] BLOC-2A - Practitioner professional-content contract analysis
- [x] BLOC-2B - Practitioner professional-content schema and resolver foundation
- [x] BLOC-2F1 - Localized practitioner search
- [x] BLOC-2F1B2 - Localized EXISTS search activation
- [x] BLOC-2F2 - Deterministic bilingual practitioner professional-content
  development fixtures

## BLOC-1 decision record

- Canonical specialty localized source: `SpecialtyTranslation`.
- Compatibility fields retained: `Specialty.nameAr`, `Specialty.nameEn`.
- Category model unchanged: `SpecialtyCategory.nameAr` and `nameEn` are used;
  no translation child table was introduced.
- Specialty fallback: requested translation → requested compatibility field →
  English/default translation → other compatibility field → stored legacy
  slug/value.
- Category fallback: requested bilingual field → other bilingual field →
  stored legacy `name`.
- Admin specialty create/update keeps direct compatibility fields and AR/EN
  translation rows synchronized. Admin updates load both translation rows so
  editing one locale cannot overwrite the other with an incorrect fallback.
- Discovery specialty search continues to use stable slugs/IDs for filters and
  searches stored localized titles.
- Web and Mobile consume the backend-resolved `name`/`title` projection rather
  than selecting `nameAr`/`nameEn` locally.
- Locale-sensitive Mobile query identities now include the active locale for
  discovery, specialty filters, instant-booking practitioners, and Patient
  Home.
- Visual acceptance: AR and EN Discovery fixtures now return the same stable
  entities with locale-resolved `name`/`title` values; Web and Mobile rendered
  states show the expected language without frontend field selection.
- BLOC-1 acceptance is fully closed. BLOC-2 remains intentionally unopened.
- Practitioner `displayName` and `professionalTitle`/`bio` remain outside this
  phase. Professional-content localization remains BLOC-2.

## BLOC-2A decision record — Practitioner professional content contract

**Status: ANALYSIS COMPLETE.** This closes BLOC-2A only. Parent BLOC-2 remains
open and no production implementation, Prisma migration, seed change, or API
contract change was made in this phase.

### 1. Scope and identity boundary

- In scope: practitioner-authored `professionalTitle` and `bio`, their
  authoring, review snapshot, publication, locale resolution, fallback,
  search/read projections, and client cache identity.
- `User.displayName` remains the canonical practitioner identity field. It is
  not a translation field and must not be localized or copied into the
  professional-content model.
- `PractitionerProfile.professionalTitle` and `PractitionerProfile.bio` are
  the current legacy/live compatibility fields. They remain readable and
  writable during transition.
- Existing `ContentLocale` / `SupportedLocale` (`ar`, `en`) and the request
  locale boundary (`x-lang` / `Accept-Language` → `@CurrentLocale`) are the
  locale authority. No screen or client should choose a language by selecting
  `nameAr`/`nameEn`-style fields locally.

### 2. Current write-path inventory

- Practitioner registration: `POST` practitioner registration DTO →
  `StartPractitionerRegistrationUseCase` →
  `RegisterPractitionerAccountUseCase` → `tx.practitionerProfile.update`.
- Practitioner self-service: `PATCH /practitioners/me` →
  `UpdatePractitionerProfileUseCase` → direct update while not approved;
  approved changes are removed from the live update and staged through
  `PractitionerChangeReviewService`.
- Practitioner application submission: `POST` application submission merges
  the current single title/bio into `PractitionerApplicationSnapshotService`
  and creates/resubmits the existing application/review workflow.
- Admin direct creation: admin practitioner create accepts the current title
  and bio and writes the profile/application path.
- Admin draft editing: admin application draft update normalizes the current
  title/bio, updates the profile draft, rebuilds `submissionSnapshot`, and
  preserves the existing audit/review path.
- Admin approval: `ApprovePractitionerApplicationUseCase` reads the approved
  snapshot and applies the requested single title/bio to the live profile.
- Publication: `ManagePractitionerPublicationUseCase` and
  `PublicPractitionerVisibilityPolicy` currently require one nonblank legacy
  title and bio before publication. This gate is preserved during transition.

### 3. Current read-consumer inventory

- Public practitioner list/detail (`GET /public/practitioners` and
  `GET /public/practitioners/:slug`) expose title plus a bio snippet/full bio.
- Patient instant booking (`GET /patients/me/instant-booking/practitioners`)
  exposes title and `shortBio`; public instant-booking availability also
  depends on the same publication/readiness fields.
- Patient Home (`GET /patients/me/home`) and matching (`/matching/sessions`)
  expose title and/or use title/bio as eligibility filters.
- Patient and practitioner session responses (`/patients/me/sessions`,
  `/practitioners/me/sessions`, next-session and detail projections) expose
  practitioner title; the session mapper must consume the shared resolver in
  a later implementation phase.
- Messaging participant projections use practitioner title for contextual
  display; this must not become a display-name replacement or identity
  localization path.
- Featured practitioners, package/booking projections, notifications/context
  enrichment, and admin practitioner/application/directory views read the
  same fields. Admin may see both locale values and readiness metadata in a
  later phase; patient-facing payload keys remain compatible.
- Web consumers include public discovery/profile, featured practitioners,
  instant booking, practitioner profile/settings, sessions, matching, package
  and admin application/directory views. Mobile consumers include public and
  patient discovery/profile, matching results, booking/select-time, Patient
  Home/instant booking, sessions, practitioner onboarding, and practitioner
  account/profile settings.

### 4. Recommended authoring policy

- Adopt policy **C: one complete required content set plus one optional
  locale with explicit fallback** for the first rollout.
- A complete content set means both `professionalTitle` and `bio` are present
  and nonblank in the selected/default authoring locale. This preserves the
  current single-pair readiness requirement instead of unexpectedly blocking
  existing practitioners.
- The second locale is optional at first. A partial second-locale draft may be
  saved for authoring, but it is not complete, does not satisfy publication
  readiness, and must not replace a complete live value.
- Do not hardcode Arabic as the only valid authoring language: the platform
  default is configurable and current practitioner data is not sufficient
  evidence that every account's source language is Arabic. The authoring
  locale/default-locale decision must be explicit in the future API/UI.
- A future product decision may raise the publication requirement to both
  locales, but only after authoring, admin review, migration, and client
  fallback support are available. That is not part of BLOC-2A.

### 5. Recommended storage shape

- Add an additive `PractitionerProfileTranslation` table in a later schema
  phase, with `practitionerId`, `locale ContentLocale`, nullable
  `professionalTitle` (`VarChar(191)`), nullable `bio` (`VarChar(4000)`),
  timestamps, a unique `(practitionerId, locale)` constraint, and indexes
  appropriate for locale-scoped title search.
- Keep nullable fields so a draft can be incomplete without pretending it is
  publishable. Completeness is a derived policy (`title && bio` after trim),
  not a second business state.
- Relate rows to `PractitionerProfile` with cascade behavior consistent with
  existing translation tables such as `SpecialtyTranslation`.
- Do not place translations on `User`; do not add translated display names.
- Do not alter `PractitionerProfile.professionalTitle`/`bio` or remove them in
  the first storage phase. They remain the compatibility/live fallback source.

### 6. Review and approval policy

- Preserve the existing profile-wide `PROFILE` review section and backend
  approval authority. Do not invent locale-specific approval states in this
  phase.
- Editing either locale on an approved profile should create/update the same
  active practitioner-change case, keep the currently approved live
  projection unchanged, and place the locale-aware proposed content in the
  review snapshot.
- Approval applies the accepted proposed content atomically; rejection or
  changes-requested leaves the last approved content available. A new locale
  must not become publicly visible merely because a draft row exists.
- Review snapshots need a versioned/additive professional-content shape before
  localized writes begin. Existing snapshots must remain readable and map to
  the legacy/default content pair.
- Requirements/audit paths should identify locale and field (`ar.title`,
  `ar.bio`, `en.title`, `en.bio`) when implementation begins, while the
  existing review case/section remains the authority.

### 7. Backward-compatible API transition

- Preferred new request shape: additive `professionalContent` keyed by locale,
  for example `{ ar: { professionalTitle, bio }, en: { professionalTitle,
  bio } }`. Object keys are preferable to an array for deterministic partial
  updates and clear validation.
- Preserve current top-level `professionalTitle` and `bio` request fields for
  existing clients. During transition they target the explicit request/
  authoring locale and must not silently overwrite a different locale.
- If both legacy fields and `professionalContent` address the same locale,
  the API should reject contradictory values (or define one documented
  precedence before implementation); it must never merge field values
  implicitly.
- Preserve current response keys (`professionalTitle`, `bio`, `bioSnippet`,
  `fullBio`) as locale-resolved values for the request locale. Additive
  locale-completeness metadata should be admin/authoring-only unless a client
  requirement proves otherwise.
- Preserve endpoint paths, authentication, request semantics, status codes,
  mutation behavior, and existing query/mutation contracts until each client
  has migrated.

### 8. Read resolution and legacy fallback

- Resolve each display field independently: requested-locale translation →
  configured/default-locale translation → other supported-locale translation →
  legacy `PractitionerProfile` field.
- With two locales this gives AR → EN → legacy for an Arabic request and EN →
  AR → legacy for an English request, without exposing a raw IANA/enum value.
- A missing/blank bio must not suppress a valid title (and vice versa); field
  fallback is independent, while readiness still requires a complete pair.
- The resolver must be one reusable backend service used by public discovery,
  Patient Home, instant booking, matching, featured, booking/session
  projections, and any other user-facing practitioner-content response.
- Legacy fallback is a compatibility path, not permission to infer the
  source language or to machine-translate content.

### 9. Migration and backfill safety

- No migration or backfill is part of BLOC-2A.
- Do not auto-translate. Existing data is primarily Arabic in some seeds but
  source language cannot safely be inferred for every record from account
  locale alone.
- A later backfill should create a locale row only where source locale is
  trusted and auditable; otherwise retain legacy fallback and produce a report
  for manual classification. Do not fabricate an English translation.
- Existing deterministic seed fixtures should remain unchanged until the
  schema/authoring contract is implemented. Future bilingual fixtures should
  seed explicit AR and EN rows and test missing/partial/fallback cases.

### 10. Search, cache, and projection requirements

- Localized discovery/matching search should search requested-locale content,
  fallback-locale content, and legacy content with practitioner-level
  de-duplication. Use locale-aware `EXISTS`/distinct semantics rather than a
  translation join that duplicates a practitioner.
- Add locale-scoped title indexes with the future schema; do not claim a
  translation search implementation until query plans and pagination are
  validated.
- Every locale-sensitive backend cache key, Web SSR cache identity, and Mobile
  React Query key must include the active locale. BLOC-1 already established
  this pattern for discovery, instant booking, filters, and Patient Home;
  BLOC-2 must extend it to profile, matching, booking/session projections, and
  any new authoring/readiness queries.
- Session, booking, Patient Home, featured, and messaging projections should
  call the shared resolver, not duplicate fallback or date/time/business
  logic. Pricing, eligibility, availability, and lifecycle remain untouched.

### 11. Admin readiness and review UX contract

- Later admin views should show AR complete, EN complete, bilingual complete,
  fallback active, and source-locale-unresolved as derived indicators.
- Admin review should show the requested locale and both before/proposed values
  for title and bio, with field-level paths in audit/review metadata. These
  are operational review aids, not patient-facing vocabulary.
- The current admin create/draft/approve flow remains the authority until the
  bilingual contract is implemented; BLOC-2A does not alter admin screens or
  approval transitions.

### 12. Exact implementation subphases

- **BLOC-2B — Schema and resolver:** additive translation storage, shared
  read resolver, repository projections, indexes, and legacy fallback tests.
- **BLOC-2C — Authoring and compatibility writes:** practitioner onboarding,
  self-edit, application snapshots, approved-change staging, dual-read/
  backward-compatible request handling, and no auto-translation.
- **BLOC-2D — Admin review/readiness:** locale-aware draft/review display,
  derived completeness indicators, audit field paths, and approval application
  while retaining the existing profile-wide review authority.
- **BLOC-2E — Client consumption:** Web/Mobile profile, discovery, matching,
  booking, Patient Home, instant booking, sessions, featured, and messaging
  projections; locale-aware cache identities and focused AR/EN tests.
- **BLOC-2F — Search and migration operations:** localized search query plans,
  deterministic bilingual seed fixtures, audited backfill, and rollout
  monitoring. No record is machine-translated.

### 13. Risks, blockers, and non-goals

- Requiring both locales immediately would block current single-locale
  practitioners and is rejected for the first rollout.
- Current JSON snapshots and review requirements are locale-agnostic; they
  require an additive/versioned shape before localized writes.
- Admin currently authors one title/bio pair, so bilingual review is blocked
  until BLOC-2D.
- Search joins can duplicate results and degrade pagination unless deduplication
  and indexes are designed together.
- Legacy content may have unknown source language; fallback must remain
  observable to admin without asserting an unproven locale.
- `displayName`, patient wallet vocabulary, API contracts, route/module names,
  pricing/payment authority, session lifecycle, and approval rules are outside
  this contract.

### 14. BLOC-2A acceptance boundary

- This analysis traces every current title/bio write and read family,
  identifies the identity boundary, selects the required/optional policy,
  defines storage, review, API transition, fallback, backfill, search, cache,
  projection, admin readiness, and implementation subphases.
- No production code, Prisma schema, migration, seed, API response, route,
  approval rule, or business behavior changed.
- BLOC-2A is ready for an explicitly authorized BLOC-2B implementation; it
  must not start automatically.

## BLOC-2B decision record - Schema and resolver foundation

**Status: DONE.** This phase implements backend foundation only. Parent BLOC-2
remains OPEN; BLOC-2C is the next phase and was not started.

### Frozen primary-content-locale decision

- `PractitionerProfile.primaryContentLocale ContentLocale?` is the explicit
  primary authored-content locale.
- `ar` and `en` mean that the practitioner's primary authored professional
  content is Arabic or English. `null` means the legacy/source locale is
  unresolved.
- The field is nullable and no existing rows were populated. It is never
  inferred from country, timezone, account/request/browser locale, or
  display-name script.

### Additive schema

- Added `PractitionerProfileTranslation` with UUID id, profile FK, canonical
  `ContentLocale`, nullable `professionalTitle` (`VarChar(191)`), nullable
  `bio` (`VarChar(4000)`), and timestamps.
- Added unique `(practitionerProfileId, locale)` and lookup index
  `(locale, practitionerProfileId)`.
- Added a cascading `PractitionerProfile` relation. `User.displayName` is not
  duplicated or translated.
- Existing `PractitionerProfile.professionalTitle` and `bio` remain unchanged
  as compatibility/live fallback fields.

### Resolver contract

- Added one injectable `PractitionerProfessionalContentResolver`.
- Title and bio resolve independently and trim blank values as missing.
- Exact precedence per field: requested locale -> explicit primary content
  locale -> safely supplied configured default locale -> other supported
  locale -> legacy profile field.
- Empty translation rows and partial rows are valid storage states. Completeness
  is derived by `isProfessionalContentLocaleComplete`; it is not persisted.
- The resolver is presentation/content infrastructure only. It does not decide
  approval, publication, verification, booking, matching, session, payment, or
  any other domain eligibility.

### Repository foundation

- Added `PractitionerProfessionalContentRepository` with single-profile and
  batch loading methods. Each query selects legacy fields, primary locale, and
  all translation rows; batch loading prevents N+1 access.
- The repository and resolver are registered and exported from
  `PractitionersModule` for later endpoint activation. Existing user-facing
  endpoints were not switched to locale-sensitive output in BLOC-2B.

### BLOC-2E cache migration list

The following read families will become locale-sensitive when the resolver is
activated. No client cache was mass-changed in BLOC-2B.

| Read family | Backend cache identity | Web identity | Mobile identity |
| --- | --- | --- | --- |
| Public practitioner list/filters/detail | Include locale in any gateway/repository cache | SSR URL/locale plus query/filter inputs | discovery/filter/profile query keys plus locale |
| Patient Home / featured practitioners | Include locale if cached | page/route locale plus request inputs | Patient Home/featured query keys plus locale |
| Instant booking and public availability | Include locale | route/request locale plus practitioner/availability inputs | instant-booking query keys plus locale |
| Matching results | Include locale with matching inputs | matching route locale plus session id | matching result query key plus locale |
| Booking/select-time and availability | Include locale if practitioner content is projected | booking route locale plus practitioner/time inputs | booking/availability query keys plus locale |
| Patient/practitioner sessions and next session | Include locale with session identity | sessions route locale plus list/detail inputs | session list/detail/next-session keys plus locale |
| Messaging participant summaries | Include locale if participant projection is cached | messages route locale plus conversation identity | inbox/thread query keys plus locale |
| Practitioner profile/readiness authoring reads | Include selected authoring locale | workspace locale plus authoring locale | profile/onboarding/readiness keys plus locale |

Exact BLOC-2E endpoint activation list: `GET /public/practitioners`,
`GET /public/practitioners/filters`, `GET /public/practitioners/:slug`,
`GET /public/featured-practitioners`, `GET /patients/me/home`,
`GET /patients/me/instant-booking/practitioners`,
`GET /public/practitioners/:slug/instant-booking-availability`,
`POST|GET /matching/sessions`, `GET /matching/sessions/:id`,
`GET /patients/me/sessions`, `GET /patients/me/sessions/:id`,
`GET /practitioners/me/sessions`, `GET /practitioners/me/sessions/:id`,
`GET /users/me/next-session`, and messaging participant/inbox projections.

No dedicated backend cache requiring a code change was identified in this
foundation pass. The cache requirement is recorded before BLOC-2E activation;
existing BLOC-1 locale-aware Mobile identities remain unchanged.

### BLOC-2B acceptance checklist

- [x] Additive schema implemented
- [x] Migration reviewed
- [x] Primary locale decision frozen
- [x] Translation relation implemented
- [x] Shared resolver implemented
- [x] Field-level fallback tested
- [x] Legacy-only profile tested
- [x] Partial translation tested
- [x] No automatic backfill or machine translation
- [x] Mutations unchanged
- [x] Review/approval unchanged
- [x] Prisma format and validation passed
- [x] Focused resolver/repository tests passed

## BLOC-2C - Practitioner professional-content authoring and compatibility writes

**Status: DONE.** Parent BLOC-2 remains OPEN; BLOC-2D is the only next phase.

### Authoring contract and compatibility policy

- Added the additive `professionalContent.ar|en` authoring payload and nullable
  `primaryContentLocale` to practitioner registration, self-edit, application
  submit/resubmit, and admin create/draft contracts. Existing top-level
  `professionalTitle` and `bio` remain supported.
- `primaryContentLocale` is explicit authored-content metadata only. It is never
  inferred from request/account locale, country, timezone, browser, or name.
- Legacy-only writes preserve the existing legacy fields. If an existing trusted
  primary locale exists, the legacy fields also update that locale's translation
  row; unresolved legacy profiles do not receive a guessed translation row.
- Mixed legacy + localized payloads require an explicit or existing effective
  primary locale. Conflicting normalized values fail with typed errors; equal
  values are accepted.

### Centralized writes, snapshots, and review authority

- Added `PractitionerProfessionalContentAuthoringService` as the single
  normalization, conflict, compatibility-projection, translation-upsert,
  primary-locale, snapshot, and approved-snapshot application authority.
- Direct/unapproved writes apply profile + translation changes in the existing
  transaction. Approved self-edits remain staged through the existing PROFILE
  review case and record locale-aware field paths; live content is not changed.
- New application/review snapshots contain version 1 localized professional
  content. Legacy snapshots without that object remain readable and continue
  through the old approval path.
- Approval applies accepted translation rows, primary locale, and legacy
  projection atomically. Rejection/changes-requested paths do not publish
  proposed content.
- `User.displayName`, public resolver activation, public read migrations,
  search/cache migrations, auto-translation, and backfill were not changed.

### BLOC-2C acceptance checklist

- [x] Additive request contract implemented
- [x] Legacy write contract preserved
- [x] primaryContentLocale semantics enforced safely
- [x] Localized write service centralized
- [x] Registration compatible
- [x] Practitioner direct edit compatible
- [x] Approved changes staged
- [x] Versioned snapshot implemented
- [x] Old snapshots readable
- [x] Admin create/draft compatibility preserved
- [x] Approval atomically applies accepted localized content
- [x] Rejection leaves live content unchanged
- [x] Locale-specific edits preserve the other locale
- [x] Mixed-payload conflicts rejected
- [x] No displayName localization
- [x] No public read migration
- [x] Focused tests pass


## BLOC-2D - Practitioner professional-content Admin review and localization readiness

**Status: DONE.** Parent BLOC-2 remains OPEN; BLOC-2E is the only next phase.

### BLOC-2D acceptance checklist

- [x] Existing Admin application review and practitioner details surfaces expose an additive professional-content readiness/read model
- [x] Readiness is derived from current content; no readiness flags were persisted
- [x] Arabic and English completeness are independently visible
- [x] Bilingual completeness, fallback-required, and unresolved-source states are visible
- [x] Primary content locale is shown as Arabic, English, or not specified / unresolved
- [x] Current approved versus proposed content is available for the existing PROFILE review case
- [x] Legacy snapshots render as legacy/default content without assigning a source locale
- [x] Versioned localized snapshots render by locale without exposing raw JSON
- [x] Changed fields are presented through human labels and added/removed/modified statuses
- [x] Existing approval, rejection, and changes-requested authority remains unchanged
- [x] Existing Admin authorization boundary remains the only access path for proposed/readiness data
- [x] Focused backend readiness, resolver, authoring, practitioner, and Admin tests pass
- [x] Focused Web Admin component coverage, AR/EN i18n parity, and typecheck pass
- [x] Visual QA captured EN desktop, AR desktop, and narrow responsive review states

### 2026-08-17 - BLOC-2D Admin review/readiness

- Added an additive Admin-only readiness/read model to the existing application
  review and practitioner details contracts. It derives locale completeness,
  bilingual readiness, fallback usage, unresolved legacy source, primary locale,
  and current/proposed field differences from existing profile data and BLOC-2C
  snapshots.
- Extended the existing professional review surface with Arabic/English content
  blocks, current approved/proposed values, legacy/default content handling, and
  human-readable field-change labels. Existing approval/rejection/changes-
  requested controls and PROFILE review authority were preserved.
- Added AR/EN Admin copy and locale-specific `dir` handling for content values.
  No public resolver, Patient client, search, profile publication, translation,
  displayName, or business-rule behavior was changed.
- Validation: backend typecheck and focused Jest suites passed (4 suites, 25
  tests); Web typecheck, i18n parity, and focused Vitest passed; focused lint on
  new readiness code passed. Targeted Web lint reports only the existing
  `react-hooks/set-state-in-effect` baseline finding in
  `AdminApplicationDetails.tsx`.
- Visual validation: rendered the legacy/source-unresolved state in the existing
  application review surface in EN at 1440px, AR at 1440px, and EN at 390px;
  also rendered the existing practitioner-details Professional Profile surface
  in EN at 1440px. Screenshots are stored under
  `sawiyaa-frontend-v1/test-artifacts/BLOC-2D/`.
- Remaining: BLOC-2E public/client localized consumption only. Do not start it
  automatically.


## BLOC-2E1 — Safe localized practitioner read activation

**Status: DONE — documented repository baseline debt remains.** Parent BLOC-2 remains OPEN. BLOC-2E2A is complete; BLOC-2E2B has not started.

### BLOC-2E1 scope and acceptance

- [x] Public practitioner discovery list resolves `professionalTitle` and `bioSnippet` through `PractitionerProfessionalContentResolver`
- [x] Public practitioner profile/detail resolves `professionalTitle` and `fullBio` through the shared resolver
- [x] Featured practitioner projection resolves `professionalTitle` through the shared resolver
- [x] Patient Home practitioner cards resolve `professionalTitle` through the shared resolver
- [x] Patient instant-booking practitioner cards resolve `title` and `shortBio` through the shared resolver
- [x] Existing response keys and route contracts remain unchanged
- [x] Legacy-only profiles retain legacy title/bio output
- [x] Partial locale content falls back independently per field
- [x] Public reads continue to use existing live approved/public visibility predicates; no Admin readiness data is exposed
- [x] No backend cache layer was introduced; Web SSR remains `no-store`, and affected Mobile/Web query identities include locale
- [x] AR → EN and EN → AR isolation covered by focused projection/mapping tests and deterministic visual fixtures
- [x] Web AR/EN mapping, typecheck, and i18n parity checks pass
- [x] Mobile AR/EN discovery/profile visual fixture checks pass; focused discovery/Home tests and changed-code type gate pass
- [x] Web and Mobile visual QA captured AR and EN discovery/profile states at compact widths; Web desktop states also captured
- [x] IDs, slugs, visibility, publication, specialty, pricing, currency, availability, ordering, pagination, booking, payment, and lifecycle behavior remain unchanged
- [x] Full focused backend group is clean after classifying and updating the stale Patient Home test expectation; the unchanged implementation still uses the existing duplicate `UPCOMING` status list
- [ ] Repository-wide Mobile i18n validator is clean: the existing AR/EN drift reports approximately 2,000 missing-key issues unrelated to BLOC-2E1

### 2026-08-17 — BLOC-2E1 implementation

- Activated the existing `PractitionerProfessionalContentResolver` in public discovery list/detail, featured, Patient Home, and patient instant-booking projections. Existing presentation keys remain stable; only their resolved values are locale-sensitive.
- Kept the existing public visibility/publication predicates and legacy profile fields in place for compatibility and eligibility. No search SQL, search behavior, approval/review rule, Admin metadata, displayName, pricing, availability, booking, payment, session, or lifecycle logic changed.
- Changed Web public discovery/profile/Home consumers to trust backend-resolved `professionalTitle`, `bioSnippet`, and `fullBio` instead of selecting or translating AR/EN title/bio fields locally. Added the locale to the Web instant-booking React Query identity.
- Preserved Mobile’s existing locale-aware discovery/Home identities and confirmed the instant-booking identity includes the active i18n language. Mobile public discovery/profile/Home consumers render the backend-resolved professional title directly.
- Validation: backend typecheck passed; focused public list/detail/featured/instant-booking suites passed (22 tests); resolver regression suite passed; Web typecheck, i18n parity, and focused Vitest mapping test passed; Mobile focused discovery/Home tests and `validate:changed-types` passed. The Patient Home suite retains the pre-existing status-list expectation mismatch; Mobile `validate:i18n` retains the pre-existing repository-wide AR/EN drift.
- Visual validation: passed with deterministic manual bilingual content. Web screenshots: `sawiyaa-frontend-v1/test-artifacts/BLOC-2E1/web-ar-390-discovery.png`, `web-ar-390-profile.png`, `web-en-390-discovery.png`, `web-en-390-profile.png`, plus AR/EN 1440px discovery/profile captures. Mobile screenshots: `sawiyaa-mobile/test/ux/BLOC-2E1/mobile-ar-360-discovery.png`, `mobile-ar-360-profile.png`, `mobile-en-390-discovery.png`, and `mobile-en-390-profile.png`.
- Remaining: repository-wide Mobile i18n baseline debt remains. Next phase is BLOC-2E2B only; do not start it automatically.

## BLOC-2E2A — Safe localized practitioner content activation: Sessions + Next Session only

**Status: DONE — focused implementation complete; unrelated repository lint/fixture baseline findings remain.** Parent BLOC-2 remains OPEN. BLOC-2E2B has not started.

### BLOC-2E2A scope and acceptance

- [x] Patient session detail resolves the existing `practitionerDetails.professionalTitle` through `PractitionerProfessionalContentResolver`
- [x] Patient session list was assessed and intentionally unchanged because its established response contains no professional-content field
- [x] Practitioner session detail resolves the same existing professional-title field safely
- [x] Practitioner session list was assessed and intentionally unchanged because it contains no practitioner professional-content field
- [x] `/users/me/next-session` was assessed and intentionally unchanged because its established projection contains no professional-content field
- [x] Session response keys and route contracts remain unchanged; no `professionalTitleAr`, `professionalTitleEn`, or content bundle was exposed
- [x] Display names remain canonical `User.displayName` values
- [x] Live professional-content repository/resolver path is used; no staged, rejected, changes-requested, or readiness snapshot data is selected
- [x] Legacy-only profiles retain the legacy professional title
- [x] Partial locale fallback remains field-independent through the shared resolver; sessions only request title
- [x] No list-endpoint N+1 was introduced; no per-session content repository call exists because list DTOs do not expose professional content; detail reads perform one shared content read
- [x] Backend cache layer: none exists for these session reads
- [x] Web detail query identities include locale; list and next-session identities remain unchanged
- [x] Mobile patient/practitioner detail query identities include locale; broad session-root invalidation prefixes remain intact for mutations
- [x] AR → EN and EN → AR detail isolation regression coverage passes; operational data is equal except for the resolved title
- [x] Session ID, status, operational contract, capabilities, timestamps, duration, payment coverage, and ordering inputs remain unchanged
- [x] Web and Mobile query-key regression tests pass
- [x] Required session visual QA is not applicable: current Web/Mobile session list/detail UIs do not render `professionalTitle`; no UI redesign or evidence-only UI change was introduced
- [x] No lifecycle/business behavior moved from backend authority to clients

### 2026-08-17 — BLOC-2E2A implementation

- Activated the existing shared professional-content resolver for the already-defined `practitionerDetails.professionalTitle` field on patient and practitioner session detail reads. Both participant paths now use the established rich detail projection, while ownership checks and session operational interpretation remain unchanged.
- Preserved patient/practitioner session list contracts and `/users/me/next-session` because those response projections do not expose professional content. No list query, sorting, pagination, selection, next-session candidate predicate, or action computation changed.
- Added locale to Web and Mobile session-detail React Query identities only. Existing session-root invalidation continues to cover every locale-specific detail key, preserving payment, join, cancel, review, and lifecycle refresh behavior.
- Added focused AR/EN operational-invariance, legacy fallback, Web cache-identity, and Mobile cache-identity coverage. The preflight Patient Home mismatch was classified as a stale test expectation and updated to the unchanged duplicate-`UPCOMING` implementation.
- Validation: focused backend session/detail and Patient Home suites passed (26 tests); backend typecheck passed; Web typecheck passed; Web query-key Vitest passed; Mobile changed-code type validation passed; Mobile query-key Jest passed. Targeted Web lint passed. Backend touched-file lint remains affected by pre-existing unsafe `any`/unused-parameter findings in the legacy mapper/specs; repository-wide Mobile i18n debt remains unchanged.
- Visual validation: not applicable for this phase because the affected professional-title field is not rendered by the current Session list/detail UIs. No visual fixture or production UI was changed.
- Remaining: BLOC-2E2B only. Do not start it automatically.

## BLOC-2E2B1 - Safe localized practitioner content activation: Matching only

**Status: DONE.** Parent BLOC-2 remains OPEN. Messaging was not started.

### BLOC-2E2B1 scope and acceptance

- [x] Current matching contract traced: `POST /matching/sessions` and `GET /matching/sessions/:id`; no separate `GET /matching/sessions` endpoint exists
- [x] Existing `professionalTitle` is localized; `bio`/`shortBio` is not exposed by the matching DTO and was not added
- [x] Existing response keys and route contracts remain unchanged
- [x] Shared `PractitionerProfessionalContentResolver` is the only localization authority
- [x] Live repository content only; review proposals/readiness data are not selected
- [x] Legacy-only practitioners remain matchable and retain the legacy title fallback
- [x] One batch content read resolves returned practitioner titles; no per-card N+1
- [x] Matching answers, scoring, ranking, eligibility, ordering, IDs, scores, prices, currencies, availability, and persisted recommendations remain unchanged
- [x] AR/EN presenter deep comparison changes only the existing professional-title presentation field; display name remains canonical
- [x] Backend has no matching cache layer; no backend invalidation behavior changed
- [x] Web matching detail identity includes locale and preserves the existing root key/invalidation behavior
- [x] Mobile matching detail identity includes locale and preserves the existing request/mutation behavior
- [x] Focused BLOC-2B resolver, BLOC-2C authoring, BLOC-2E1 projections, BLOC-2E2A sessions, matching, Web, and Mobile validations pass
- [x] Visual QA: isolated authenticated Web/Mobile fixtures render the same matching result in AR/EN with locale-correct `professionalTitle`, direction, CTA, reasons, and stable result identity
- [x] No matching, booking, payment, lifecycle, or other business rule moved to clients

### 2026-08-17 - BLOC-2E2B1 matching activation

- Traced the live matching flow from controller through candidate selection, scoring,
  ranking, persistence, session read, presenter, Web consumer, and Mobile consumer.
  The matching contract already exposed `professionalTitle`; it did not expose
  professional bio content.
- Added a matching-only batch presentation resolver that reads the existing live
  professional-content repository and delegates every fallback decision to the
  shared `PractitionerProfessionalContentResolver`. Create and read responses
  preserve the existing `professionalTitle` key and return locale-appropriate
  content without storing language-dependent matching decisions.
- Added locale to the protected matching GET read and to Web/Mobile result query
  identities. Existing create payloads, matching persistence, scoring/ranking,
  eligibility, result ordering, and refresh behavior remain unchanged.
- Validation: focused backend matching/content suites passed (14 suites, 58 tests);
  backend typecheck passed; targeted backend production/new-service lint passed.
  The pre-existing matching presenter spec retains four unsafe-`any` lint
  findings. Web typecheck, focused query-key Vitest, and targeted lint passed;
  Mobile changed-code type validation,
  focused Jest query-key test, and targeted lint passed. Focused `git diff --check`
  passed for the changed tracked paths (line-ending warnings only). The full dirty
  worktree still contains unrelated pre-existing generated-file whitespace and
  repository i18n debt.
- Visual validation: PASS. Test-only authenticated fixtures captured Web AR/EN at
  390px and representative desktop width, plus Mobile AR RTL at 360px and EN LTR
  at 390px. Web screenshots: `sawiyaa-frontend-v1/test-artifacts/BLOC-2E2B1/`
  (`matching-web-ar-390-mobile.png`, `matching-web-en-390-mobile.png`,
  `matching-web-ar-1440-desktop.png`, `matching-web-en-1440-desktop.png`).
  Mobile screenshots: `sawiyaa-mobile/test/ux/BLOC-2E2B1/`
  (`matching-mobile-ar-360-rtl.png`, `matching-mobile-en-390-ltr.png`).
  AR -> EN -> AR locale isolation passed; production auth and Matching UI were unchanged.
  The existing Mobile result card does not render rank or prices; those stable
  fields were equality-checked from the test fixture without adding UI.
- Remaining: BLOC-2E2B2 Messaging ONLY. Do not start it automatically.

## Execution Log

### 2026-08-17 - BLOC-2C authoring and compatibility writes

- Implemented additive localized professional-content request handling across
  registration, practitioner profile PATCH, application submit/resubmit, admin
  direct create, and admin draft update.
- Centralized normalization, length limits, whitespace handling, mixed-payload
  conflict detection, legacy compatibility mapping, primary locale semantics,
  translation upsert planning, live legacy projection, localized snapshot
  serialization/deserialization, and approved snapshot application in one
  authoring service.
- Preserved the existing profile-wide PROFILE review authority. Approved
  localized edits are staged in the existing change case with paths such as
  `professionalContent.en.bio`; rejected proposals do not alter live content.
- Added additive practitioner authoring response data for the authenticated
  practitioner profile only. Public resolver/read migration remains deferred.
- Added focused authoring tests covering one-locale validity, secondary-locale
  preservation, normalization, conflict rejection, unresolved mixed payloads,
  snapshot compatibility, and transactional snapshot application. Re-ran the
  BLOC-2B resolver/storage tests and relevant practitioner/admin regression
  suites.
- Validation: `npx prisma validate` passed; `npm run typecheck` passed; focused
  Jest suites passed (BLOC-2B plus BLOC-2C and practitioner/admin regression
  coverage); focused authoring ESLint passed. Broader touched-file ESLint still
  reports pre-existing legacy review/audit lint findings and was not hidden.
  `git diff --check` reports pre-existing generated Prisma trailing whitespace.
- Visual validation: NOT APPLICABLE; backend-only task, no UI changed.
- Remaining: BLOC-2D readiness/review presentation only. No BLOC-2D work was
  started automatically.

### 2026-08-16 — BLOC-1 implemented

- Implemented a shared backend specialty-title precedence helper.
- Corrected public discovery filters, practitioner lists/details, instant
  booking, featured practitioners, and Patient Home specialty projections.
- Removed order-dependent `translations[0]` projections.
- Added category bilingual-field projection to discovery filters.
- Preserved API response keys, filtering identifiers, ordering, pagination,
  pricing, availability, verification, and booking behavior.
- Updated Web/Mobile specialty presentation helpers to trust backend-resolved
  labels and fixed locale-sensitive Mobile cache identities.
- Added focused backend, Web, and Mobile regression coverage.
- Validation: focused backend Jest suites passed; backend typecheck passed;
  Web focused Vitest and typecheck passed; Mobile focused Jest and
  `validate:changed-types` passed.
- `validate:i18n` remains blocked by the pre-existing repository-wide AR/EN
  drift (2,000 reported missing-key issues); no unrelated translations were
  changed.
- Visual QA was completed after correcting the test-only fixtures/harnesses.
  Arabic and English labels are valid UTF-8 and are resolved from the mocked
  backend `x-lang`/`Accept-Language` contract. Screenshot evidence:
  - Web AR 390: `D:\Web\full-projects\sawiyaa\sawiyaa-frontend-v1\test-artifacts\BLOC-1\web-discovery-ar-390-initial.png`, `web-discovery-ar-390-filtered.png`
  - Web EN 390: `D:\Web\full-projects\sawiyaa\sawiyaa-frontend-v1\test-artifacts\BLOC-1\web-discovery-en-390-initial.png`, `web-discovery-en-390-filtered.png`
  - Web AR desktop: `D:\Web\full-projects\sawiyaa\sawiyaa-frontend-v1\test-artifacts\BLOC-1\web-discovery-ar-1440-desktop-filtered.png`
  - Web EN desktop: `D:\Web\full-projects\sawiyaa\sawiyaa-frontend-v1\test-artifacts\BLOC-1\web-discovery-en-1440-desktop-filtered.png`
  - Mobile AR 360: `D:\Web\full-projects\sawiyaa\sawiyaa-mobile\test\ux\UX-5B\patient-discovery-ar-360-initial.png`, `patient-discovery-ar-360-specialty-selected.png`, `patient-discovery-ar-360-filtered.png`
  - Mobile EN 390: `D:\Web\full-projects\sawiyaa\sawiyaa-mobile\test\ux\UX-5B\patient-discovery-en-390-initial.png`, `patient-discovery-en-390-specialty-selected.png`, `patient-discovery-en-390-filtered.png`
  - Mobile EN 430: `D:\Web\full-projects\sawiyaa\sawiyaa-mobile\test\ux\UX-5B\patient-discovery-en-430-initial.png`
- Cache isolation: AR and EN runs returned different backend-resolved labels;
  the focused Mobile contract test verifies locale-aware query identities.
- Remaining: BLOC-2 practitioner professional-title/bio localization and the
  planned platform-wide BLOC-4 locale-resolution consolidation.
- Next step: BLOC-2 discovery/authoring contract for practitioner professional
  content. Do not begin it automatically.

### 2026-08-17 — BLOC-2A contract analysis

- Traced practitioner professional-content writes across registration,
  self-service profile updates, application submission, admin creation/draft
  editing, approval, publication readiness, and approved-change review staging.
- Traced public discovery/profile, instant booking, Patient Home, matching,
  featured, booking/session, messaging, Web, Mobile, and admin read consumers.
- Decision: use an additive locale-keyed professional-content model with one
  complete required locale plus one optional locale and explicit field-level
  fallback; preserve legacy top-level API fields and live profile fields during
  transition; keep displayName identity separate.
- Preserved the existing profile-wide review/approval authority. No
  locale-specific business state, auto-translation, backfill, migration, seed,
  or production implementation was performed.
- Validation: focused source/schema/tracker inspection and `git diff --check`;
  no production code or schema files changed. Full implementation tests are
  intentionally deferred to BLOC-2B–BLOC-2F.
- Visual validation: NOT APPLICABLE for this backend contract-analysis-only
  phase; no UI was changed or rendered.
- Remaining: authorize BLOC-2B before any schema or resolver implementation.

### 2026-08-17 - BLOC-2B schema and resolver foundation

- Added the nullable primary authored-content locale, additive translation
  table, relation, unique constraint, and locale lookup index.
- Added the shared field-level professional-content resolver, completeness
  helper, efficient single/batch repository foundation, and focused tests.
- Preserved legacy title/bio fields, all existing request/mutation contracts,
  review snapshots, approval behavior, publication readiness, and all domain
  eligibility rules. No endpoint was activated and no Web/Mobile/Admin code
  changed.
- No backfill, source-language inference, machine translation, or seed change
  was performed.
- Validation: `prisma format` passed; `prisma validate` passed; backend
  typecheck passed; focused resolver/repository tests passed (14/14); focused
  ESLint passed; migration SQL manually reviewed as additive with proper FK,
  cascade, unique constraint, nullability, and no legacy-column rewrite.
- Prisma client artifacts were regenerated with the new model/types. The
  repository wrapper's final Windows query-engine DLL rename remained blocked
  by an existing file lock after retries; no production runtime behavior was
  changed by that tooling limitation.
- Visual validation: NOT APPLICABLE; this backend-only foundation changed no
  UI.
- Next step: explicitly authorize BLOC-2C authoring/write and review-contract
  work. Do not start it automatically.

### 2026-08-17 - BLOC-2E2B2A Messaging professional-content audit only

**Status: AUDIT COMPLETE - OUTCOME B. Parent BLOC-2 remains OPEN. No BLOC-2F work started.**

- Endpoints/use-cases inspected: legacy Messaging `GET /messages/conversations`, `GET /messages/conversations/:conversationId`, `GET /messages/conversations/:conversationId/messages`, `POST /messages/conversations/:conversationId/messages`, and `POST /messages/conversations/:conversationId/read`; General Chat `GET /chat/conversations`, `GET /chat/conversations/:id`, `GET /chat/conversations/:id/messages`, `POST /chat/conversations`, `POST /chat/conversations/:id/messages`, `POST /chat/conversations/:id/read`; session context `GET /chat/sessions/:sessionId/conversation` and `POST /chat/sessions/:sessionId/open`; plus the corresponding list/detail/message/create/read use-cases.
- Legacy Messaging participant DTOs expose only `userId`, canonical `displayName`, `avatarUrl`, and `publicRoleLabel`; message sender identity uses the same projection. No separate `professionalTitle`, `bio`, or `shortBio` is exposed there.
- General Chat exposes `GeneralChatParticipantIdentityDto.subtitle` alongside `participantId`, `userId`, `displayName`, `avatarUrl`, `role`, `status`, and `verificationStatus`. For practitioners, `subtitle` is populated from the legacy `User.practitionerProfile.professionalTitle`, falling back to the specialty-category name. The repository explicitly selects `professionalTitle`; no `bio` or `shortBio` is selected. This is a user-visible professional-content projection even though the DTO key is `subtitle`, so the result is Outcome B.
- Backend source and mapping: `User.practitionerProfile.professionalTitle` -> `general-chat-identity.mapper.resolveSubtitle` -> `GeneralChatParticipantIdentityDto.subtitle`. `displayName` remains the canonical identity field. The legacy Messaging mapper may use `professionalTitle` only as a last-resort display-name fallback when no display name exists; it does not expose it as a separate field.
- Web audit: the session lane list renders session API `displayName` and session context only. The Web `SessionChatPanel` thread header consumes `/chat/sessions/:sessionId/conversation` and visibly renders `identity.subtitle`, so a practitioner professional title can appear there. Its message-list sender projection is returned by legacy Messaging and has no separate professional title; the thread’s message body/content is not transformed.
- Mobile audit: the inbox normalizer uses canonical `displayName` plus localized session/follow-up/support context text. The active `MessageThreadScreen` uses `/messages/conversations*` canonical data, derives the header subtitle from session/care/support context, and derives sender subtitles from public role labels. It does not currently render the General Chat `identity.subtitle` professional title.
- Realtime audit: `/chat` `chat:newMessage` and `/messages` `messages:new` carry the server-produced message item; socket auth, room membership, send/read/typing events, and payloads do not accept or inject locale or translated professional content. The legacy realtime sender identity remains the displayName/avatar/publicRoleLabel projection.
- Cache/query audit: Web General Chat keys are `['general-chat','session-conversation',sessionId]` and `['general-chat','messages',conversationId,params]`, with broad General Chat invalidation after send/close; locale is not part of these keys. Mobile canonical keys are `canonical-conversations`, `canonical-conversation/:conversationId`, and `canonical-messages/:conversationId`, also without locale. No cache keys, invalidation, or query behavior were changed in this audit. If localized professional content is activated later, the exact title-rendering query identities must be made locale-safe without changing mutation semantics.
- Message content was not translated, normalized, or modified. `displayName` was not localized, transliterated, or replaced. No production Messaging/Web/Mobile file, endpoint, DTO contract, query key, realtime event, or UI behavior was changed; this tracker entry is the only current-task update.
- APIs/hooks and mutations preserved: all listed REST endpoints, React Query hooks/query identities, legacy/general-chat send/read/create behavior, authentication/session behavior, cache invalidation, deep-link identifiers, and realtime join/send/read/typing behavior remain unchanged. Backend-authoritative capabilities remain authoritative; only the existing presentation mapping to `identity.subtitle` was documented. No business rule moved from backend to mobile.
- Exact next step: explicitly authorize BLOC-2E2B2B for a smallest-scoped Messaging activation. First decide whether the shared professional-content resolver should replace the legacy title source in the Web General Chat participant projection, then add locale-safe query identity only for the actually rendered participant projection and focused AR/EN coverage. Do not add bio/shortBio, translate message bodies, change displayName, alter realtime payloads, or redesign Messaging.

### 2026-08-17 - BLOC-2E2B2B Minimal Web General Chat professional-title localization

**Status: DONE. Parent BLOC-2 remains OPEN. BLOC-2F was not started.**

- Activated the existing practitioner professional-content resolver for the already-defined General Chat `identity.subtitle` projection. The live batch directory now loads `primaryContentLocale` and approved professional-content translation rows together with the existing practitioner profile fields; no per-participant translation query was introduced.
- Applied the locale-aware projection to the existing General Chat participant responses returned by `GET /chat/conversations`, `GET /chat/conversations/:id`, `GET /chat/sessions/:sessionId/conversation`, and `POST /chat/sessions/:sessionId/open`. Response keys, participant identity fields, conversation identifiers, session context, status, verification, and capabilities remain unchanged.
- Preserved the resolver precedence: requested locale -> primary content locale -> configured/default resolver fallback -> other supported locale -> legacy `professionalTitle`. If no title resolves, the existing specialty/category fallback remains in place. `displayName` remains the canonical `User.displayName`.
- Pending PROFILE proposals, application drafts, rejected/changes-requested content, and Admin readiness values are not selected by the General Chat directory projection; only live practitioner profile content and its approved translation rows are used.
- Web changed only the session-conversation query identity from `['general-chat','session-conversation',sessionId]` to `['general-chat','session-conversation',sessionId,locale]`. The existing `general-chat` root is preserved, so broad send/close invalidation still reaches every locale variant. Message-body keys, mutations, realtime events, `/messages` keys, and Mobile keys were not changed.
- Realtime `chat:newMessage` and `messages:new` payloads remain untouched. Message bodies, attachments, send/read/unread behavior, conversation creation, room membership, typing, authentication, and persistence remain unchanged.
- Validation: focused backend General Chat suite passed (6 suites, 21 tests); backend typecheck passed; focused Web component/query-key suite passed (2 files, 5 tests); Web typecheck passed; Web targeted lint passed. Backend targeted lint retains pre-existing legacy findings in the existing chat module/specs (unsafe `any`, enum comparison, and unnecessary assertions); no new lint issue remains in the added mapper coverage.
- Visual validation: PASS using the test-only authenticated Web fixture `scripts/visual-qa-b2e2b2b-messaging.mjs`. AR and EN SessionChatPanel screenshots were captured at 1440px; directions were RTL/LTR, the subtitle resolved to the locale-specific title, the same English message body remained untouched, and AR -> EN -> AR cache isolation passed. Evidence: `sawiyaa-frontend-v1/test-artifacts/BLOC-2E2B2B/messaging-web-ar-1440-desktop.png` and `messaging-web-en-1440-desktop.png`.
- Mobile production changes: NONE. No BLOC-2F work started. Exact next step after acceptance: separately authorize BLOC-2F for the next approved messaging scope; do not expand this Web-only subtitle activation.

### 2026-08-17 - BLOC-2E final closure audit

**Status: BLOCKED - USER-VISIBLE READ GAPS FOUND.** BLOC-2E remains OPEN. No
production code, API contract, migration, backfill, search behavior, or client
business logic was changed in this audit. BLOC-2F was not started.

#### Final read-consumer matrix

| Read family | Result | Evidence / boundary |
| --- | --- | --- |
| Public Discovery list/detail | LOCALIZED | Existing public list/detail projections use `PractitionerProfessionalContentResolver`; `professionalTitle`, `bioSnippet`, and `fullBio` keys remain unchanged. |
| Featured practitioners | LOCALIZED | Existing featured repository projection resolves title through the shared resolver in one batch read. |
| Patient Home | LOCALIZED | Existing home practitioner projections resolve title through the shared resolver; public predicates remain unchanged. |
| Instant Booking | LOCALIZED | Patient instant-booking practitioner cards resolve title and `shortBio`; availability responses do not expose professional content and retain business-only readiness checks. |
| Session detail | LOCALIZED | Patient and practitioner detail resolve the existing `practitionerDetails.professionalTitle`; session lists and next-session projections expose no professional field. |
| Matching | LOCALIZED | Existing matching title presentation uses the shared resolver; matching selection, scoring, ranking, persistence, and eligibility remain legacy/business-only. |
| General Chat | LOCALIZED | Web-rendered `identity.subtitle` uses the shared resolver; response shape, message bodies, realtime payloads, and Mobile legacy Messaging remain unchanged. |
| Legacy Messaging | NO PROFESSIONAL FIELD | Participant/sender projections expose canonical `displayName`, avatar, and public-role data only. |
| Booking/select-time | LOCALIZED / NO NEW FIELD | Current profile/detail source is already backend-resolved; package-plan quote responses do not expose practitioner professional content. |
| Package/session package projections | GAP | `GET /public/package-offers` returns legacy `practitioner.professionalTitle` directly and Web `PackageOfferCard` renders it. Patient package purchase list/detail also return and render the legacy title directly. Search predicates remain intentionally deferred. |
| Notification/context enrichment | GAP | `GET /notifications/me` enrichment populates user-visible `context.practitionerName` from legacy `professionalTitle`; Web and Mobile notification presentation consume that context. Enrichment has no locale input. |
| Practitioner self-profile/read-only | ADMIN/AUTHORING ONLY | Authenticated profile/onboarding views intentionally expose authoring fields and locale content data; they are not public presentation projections. |
| Admin/readiness and financial operations | ADMIN/AUTHORING ONLY | Readiness, review, settlement, recovery, and statement fields intentionally use operational/snapshot/legacy compatibility data. |
| Publication, matching, booking, availability, and package eligibility | BUSINESS-ONLY | Legacy `professionalTitle`/`bio` checks remain authoritative eligibility/readiness rules and were not replaced by the display resolver. |

#### Closure blockers and smallest safe follow-up

1. **Package projections:** endpoint `GET /public/package-offers`, fields
   `practitioner.professionalTitle`, source
   `ListPublicPackageOffersUseCase`/`PackageOfferCard`, Web client plus the
   patient package purchase list/detail projections. The package-offer query
   key and patient purchase list/detail keys do not include locale. The safe
   fix is presentation-only resolver activation with a batched live-content
   read, locale-safe client identities, and preserved legacy search predicates;
   do not change package eligibility or pricing.
2. **Notifications:** endpoint `GET /notifications/me`, field
   `context.practitionerName`, source `NotificationContextEnrichmentService`,
   Web/Mobile notification presentation. The safe fix requires propagating
   requested locale into enrichment, resolving live approved content in batch,
   and making notification query identities locale-safe while preserving
   notification actions and read mutations.

#### Boundary and performance audit

- All activated public/patient families use live `PractitionerProfile` content
  plus the approved translation relation; pending proposals, application
  drafts, rejected/changes-requested content, and Admin readiness snapshots
  are not selected by those resolver-backed reads.
- No BLOC-2 implementation introduced translated display names,
  `displayNameAr`/`displayNameEn`, or transliteration. `User.displayName`
  remains canonical identity.
- Resolver-backed list flows use existing relation/batch strategies; no
  per-practitioner or per-card content query was introduced. The two blocked
  package/notification families require the same batch discipline when fixed.
- Backend APIs, hooks, mutations, authentication/session behavior, cache
  invalidation, deep-link identifiers, realtime behavior, pricing/payment
  authority, and lifecycle authority were not changed in this audit.

#### Validation

- Backend focused BLOC-2 regression: 23 suites, 103 tests passed.
- Backend typecheck passed.
- Web focused BLOC-2 tests: 6 files, 14 tests passed; Web typecheck passed.
- Web targeted lint has no errors; existing `<img>` warnings remain.
- Mobile focused BLOC-2 tests: 7 suites, 17 tests passed; changed-code type
  validation passed with 96 pre-existing repository errors outside this phase.
- Backend targeted lint remains affected by existing dirty-worktree
  formatting/legacy findings; no lint remediation was made in this audit.
- Visual validation: existing accepted BLOC-2E1/BLOC-2E2B1/BLOC-2E2B2B
  evidence remains the source of truth; no new production UI was changed or
  rendered in this audit.

#### Next step

Do not start BLOC-2F1 yet. First authorize a narrowly scoped read-consumer
completion for the two blockers above. Once BLOC-2E has no unresolved
user-visible read gap, the exact next phase is **BLOC-2F1 - Localized Search
ONLY**; do not combine it with backfill or migration.

### 2026-08-17 - BLOC-2E3A — Safe Practitioner Professional-Title Localization: Package projections

**Status: DONE. Parent BLOC-2E remains OPEN because Notifications are still pending. BLOC-2F was not started.**

- [x] `GET /public/package-offers` resolves the existing `practitioner.professionalTitle` through `PractitionerProfessionalContentResolver`.
- [x] Patient package purchase list and detail resolve the same existing response key through the shared resolver.
- [x] Response shapes, package/practitioner IDs, canonical `displayName`, package availability, pricing, currency, progress, expiry, status, and lifecycle capabilities remain unchanged.
- [x] Legacy fallback remains intact when no live professional-content record or translation is present.
- [x] Only live practitioner profile content and approved translation rows are selected; pending/application/admin readiness data is not exposed.
- [x] Package eligibility, publication predicates, search predicates, quote inputs, payment, purchase mutations, session generation, replacement behavior, and package lifecycle authority remain unchanged.
- [x] Public-offer and purchase lists batch unique practitioner profile IDs; no per-offer/per-purchase translation query was introduced. Purchase detail uses one content read.
- [x] No package-specific backend response cache layer was found. Web offer/list/detail query identities now include locale beneath the existing `package-offers` / `package-purchases` roots; root-prefix invalidation remains preserved for purchase mutations.
- [x] AR → EN → AR isolation is covered by the locale-aware Web identity design and deterministic bilingual visual fixture; AR/EN offer invariance tests keep all non-title values equal.
- [x] Backend focused tests: 5 suites, 20 tests passed; backend typecheck passed. Web package query-key tests: 2 tests passed; Web typecheck passed; focused Web lint passed. Mobile discovery regression: 1 suite, 3 tests passed; no affected Mobile package projection exists, so Mobile production code was not changed.
- Backend targeted lint reports only pre-existing findings in the touched legacy presenter/use-case files (formatting plus the existing unsafe quote cast/unused catch variable); the new package resolver helper and focused package-offer spec are clean. No unrelated lint debt was changed.
- [x] Visual QA passed with the test-only fixture `sawiyaa-frontend-v1/scripts/visual-qa-b2e3a-package.mjs`: AR/EN offer card, purchase list, and purchase detail captures are in `sawiyaa-frontend-v1/test-artifacts/BLOC-2E3A/`.
- APIs/hooks and mutations preserved: package-offer and patient package-purchase endpoints remain unchanged; Web fetchers, purchase/payment mutation behavior, root invalidation, authentication, and route identifiers remain intact. No business rule moved from backend to mobile.

### 2026-08-17 - BLOC-2E3B — Safe Practitioner Professional-Title Localization: Notifications

**Status: DONE. BLOC-2E is DONE. Parent BLOC-2 remains OPEN because BLOC-2F is pending.**

- [x] `GET /notifications/me` now resolves the existing `context.practitionerName` key through `PractitionerProfessionalContentResolver`; the key remains a professional-title projection and was not renamed to `displayName`.
- [x] The read projection is dynamic/read-time only. Notification rows contain no persisted professional-content snapshot, so no historical rewrite, migration, backfill, or notification-delivery change was introduced.
- [x] Live practitioner profiles and approved translation rows are loaded through `PractitionerProfessionalContentRepository` in one unique-profile batch per localized user read; pending/application/admin content is not selected.
- [x] Requested locale is propagated through list and idempotent mark-read responses. The existing unread-count endpoint remains locale-independent because it returns no professional content.
- [x] Web and Mobile notification list query identities include the active AR/EN locale beneath their existing roots. Existing root invalidation remains unchanged for mark-read and mark-all-read mutations.
- [x] AR → EN → AR isolation, legacy fallback, approved-content-only behavior, unrelated contexts, multi-practitioner batching, and invariance of notification IDs/actions/context fields other than `context.practitionerName` are covered by focused backend tests and bilingual fixtures.
- [x] Backend focused notification tests: 3 suites, 5 tests passed; backend typecheck passed; focused backend lint passed.
- [x] Web notification query-key tests passed (2 tests); Web typecheck passed; focused Web lint passed. Mobile notification query-key tests passed (2 tests); focused Mobile lint passed. The repository-wide Mobile i18n validator remains a pre-existing dirty-baseline failure with approximately 2,000 missing-key reports outside this phase.
- [x] Visual QA passed and was inspected: Web AR/RTL and EN/LTR `sawiyaa-frontend-v1/test-artifacts/BLOC-2E3B/notifications-ar-1280.png` and `notifications-en-1280.png`; Mobile compact AR/RTL and EN/LTR `sawiyaa-mobile/test/ux/BLOC-2E3B/notifications-ar-360.png` and `notifications-en-390.png`. Locale-specific professional titles rendered in notification context lines; raw notification enums did not leak; no redesign was made.
- APIs/hooks preserved: `GET /notifications/me`, unread-count, mark-read, mark-all-read, authentication/session behavior, notification IDs/types/title/body/read timestamps, deep links/actions, Web/Mobile fetchers, and existing invalidation roots remain intact. No notification lifecycle, realtime, delivery, payment, session, or business rule moved to mobile.

#### Final BLOC-2 read-consumer closure matrix

| Read family | Result | Boundary |
| --- | --- | --- |
| Public Discovery / Featured / Patient Home | LOCALIZED | Shared resolver-backed live profile presentation. |
| Instant Booking / Session detail / Matching | LOCALIZED | Presentation-only localized title/bio fields; eligibility, ranking, and lifecycle authority unchanged. |
| General Chat | LOCALIZED | Web `identity.subtitle` uses the shared resolver; message bodies, realtime payloads, and legacy Mobile participant identity remain unchanged. |
| Legacy Messaging | NO PROFESSIONAL FIELD | Canonical display name/avatar/public-role projection only. |
| Booking/select-time | LOCALIZED / NO NEW FIELD | Existing resolved profile source or no professional-content field. |
| Package/session package projections | LOCALIZED | BLOC-2E3A completed resolver-backed offer and purchase projections with locale-safe Web identities. |
| Notification/context enrichment | LOCALIZED | BLOC-2E3B completed resolver-backed `context.practitionerName` with locale-safe Web/Mobile list identities. |
| Practitioner self-profile, Admin/readiness, financial operations | ADMIN/AUTHORING ONLY | Legacy/authoring/snapshot values remain intentionally operational and are not public presentation gaps. |
| Publication, matching, booking, availability, package eligibility | BUSINESS-ONLY | Existing backend predicates remain authoritative; no display resolver was substituted into business rules. |

**Closure audit result:** zero unresolved user-visible professional-content read gaps remain in the approved BLOC-2 scope. No BLOC-2F work was started.

#### Exact next phase

**BLOC-2F1 — Localized Search ONLY.** Do not start it automatically or combine it with backfill, migration, or unrelated search redesign.
### 2026-08-17 - BLOC-2F1A - Practitioner Localized Search Contract + Query-Plan Audit

**Status: AUDIT COMPLETE. No production search behavior was changed. BLOC-2 remains OPEN; BLOC-2F1B implementation was not started.**

This is the implementation contract for the next narrowly scoped phase. It is
an audit/design record only: no SQL or Prisma predicate, migration, index,
backfill, seed, ranking, pagination, eligibility rule, API contract, Web UI,
or Mobile UI was changed.

#### Global search-family inventory

| Surface / endpoint | Current search/use-case behavior | Classification | BLOC-2F1B disposition |
| --- | --- | --- | --- |
| `GET /public/practitioners` / `ListPublicPractitionersUseCase` / `PublicPractitionerReadRepository` | Searches `User.displayName`, legacy `PractitionerProfile.professionalTitle`, legacy `bio`, and active specialty translation `title`. Specialty slug/category/language filters remain separate. | A identity; B professional content; C localized taxonomy; D publication/readiness filters are separate. | **In scope.** |
| `GET /public/package-offers` / `ListPublicPackageOffersUseCase` | Searches display name plus legacy professional title/bio. `specialtyId` is an independent filter; package plan metadata is not free-text searched. BLOC-2E3A already localizes the presented title, but not this predicate. | A + B; package metadata is not a search field. | **In scope.** |
| `GET /public/featured-practitioners` | No user-provided search term; active placement, surface, time, and status filters only. | D placement/eligibility, with localized presentation. | Excluded; no search predicate. |
| `GET /patients/me/package-purchases` / `ListMyPackagePurchasesUseCase` / `PatientPackagePurchaseRepository` | Searches immutable `titleSnapshot` and `planCodeSnapshot`, practitioner display name, and current legacy professional title. It is authenticated patient history search, not public practitioner discovery. Result and count use the same `where`, with database `skip`/`take` and `count`. | A/B plus F non-user snapshot search. | Audit only; defer from BLOC-2F1B unless a separate product decision makes historical purchase search locale-aware. |
| `GET /patients/me/instant-booking/practitioners` | No free-text search. Candidate query applies online/instant-booking, publication, active-user, active-specialty, pricing, and availability conditions. | D business eligibility/availability. | Excluded. Do not localize predicates. |
| `POST /matching/sessions`, `GET /matching/sessions/:id` | No free-text search. Professional title/bio presence and specialty data participate in candidate readiness/scoring; localized title presentation is separate. | D business matching/scoring, not B search. | Excluded. Do not turn presentation text into score input. |
| `GET /admin/practitioners` / `ListAdminPractitionersDirectoryUseCase` | Searches display name, email, legacy title/bio, and public slug. Uses admin operational filters and deterministic database ordering before rating decoration/pagination. | A/B/E admin/internal search. | Excluded. |
| `GET /admin/practitioner-applications` | Searches practitioner `User.displayName` only, with application/status/view filters. | A/E admin review search. | Excluded. |
| `GET /admin/featured-practitioners` | `practitionerSearch` searches public slug, legacy title, and display name through the placement-management repository. | A/B/E admin placement search. | Excluded. |
| Admin finance/operations practitioner lookup surfaces (`/admin/practitioner-wallets`, `/admin/practitioner-payouts/practitioners`, settlement-dues/payout-summary/recovery and related finance review lists) | Internal searches use practitioner id/public slug/display name/email and, where present, legacy professional fields. They are operational directories, not patient/public discovery. | A/B/E, plus F identifiers and finance references. | Excluded; no automatic localization of Admin search. |
| Admin general-chat conversation search | Internal conversation search includes practitioner/patient identity and operational references; it is not a public practitioner directory. | A/E/F internal search. | Excluded. |
| Specialty and category repositories | Taxonomy search independently covers slug, canonical names, localized names, translation title/slug, and category fields. | C localized taxonomy. | Preserve BLOC-1 behavior; no rewrite in BLOC-2F1A. |

No other patient-facing free-text practitioner selector was found. Discovery,
package-offer search, and specialty taxonomy are the only public/patient
search paths requiring a localized professional-content search decision.

#### Current professional-content predicates and business boundary

The two proposed public consumers currently use only:

```text
User.displayName contains search (case-insensitive)
OR PractitionerProfile.professionalTitle contains search (case-insensitive)
OR PractitionerProfile.bio contains search (case-insensitive)
```

Public practitioner discovery additionally searches an active specialty's
translation title. Public publication and readiness predicates remain outside
that OR: approved practitioner status, published public profile, active user,
non-empty public identity/slug, and the current legacy title/bio requirements,
plus the existing type, country, specialty, language, availability, price,
coupon, package, and rating filters. The visibility policy also uses legacy
title/bio presence. These are D business/public-readiness rules, not localized
presentation fields, and must remain unchanged in BLOC-2F1B.

Instant-booking and matching title/bio checks are likewise D rules. They must
not be replaced by translation completeness or by the presentation resolver.
`User.displayName` is A identity and remains the canonical locale-independent
name. No displayNameAr/displayNameEn, transliteration, or query translation is
allowed.

#### Proposed BLOC-2F1B search contract (not implemented here)

For the two in-scope endpoints only, preserve the existing `search=query`
input and add a boolean text-match branch for current live
`PractitionerProfileTranslation` rows:

```text
existing displayName OR legacy title OR legacy bio
OR EXISTS translation
  WHERE locale is in the requested-locale/fallback policy set
  AND (translated professionalTitle contains query
       OR translated bio contains query)
```

The locale boundary is the existing `x-lang` / `Accept-Language` to
`CurrentLocale` path. No country, currency, timezone, browser, or client-side
locale source is introduced. Search reads authored/indexed stored content only;
it never translates or transliterates the query.

Search fallback is boolean inclusion, not relevance ranking: requested locale,
the configured valid fallback locale(s), and legacy fields are all eligible
matches. Locale precedence must not change result order. Field matching is
independent, so an Arabic title can match an Arabic query while a valid
fallback bio or legacy field also matches when the requested-locale field is
missing. Locale completeness is not a new eligibility rule.

The safest current Prisma/PostgreSQL shape is a relation `some`/correlated
`EXISTS` predicate, not a raw translation JOIN. It keeps the root
`PractitionerProfile` relation one-to-one, avoids duplicate practitioners when
AR, EN, and legacy content all match, and requires no `DISTINCT`. A JOIN plus
`DISTINCT` is less safe for preserving count, offset behavior, and query shape;
the implementation should not use it unless a measured future search design
requires a different boundary.

#### Pagination, count, and ordering invariants

- Public practitioner discovery currently loads database candidates without
  database `skip`/`take`/`count`, then applies visibility, rating aggregation,
  `minRating`, in-memory sort, and array slicing. `totalItems` is the final
  practitioner-level filtered array length; there is no separate SQL count
  predicate to update. BLOC-2F1B must retain this behavior.
- Public package offers load practitioners, generate valid plan/duration offer
  combinations, sort the offer items in memory, and slice the generated offer
  array. `totalItems` is offer-item count, not translation-row count. The
  localized branch must only change text inclusion before generation.
- Patient package purchase history is not in the next implementation scope;
  if it is later included, its `findMany` and `count` must receive the exact
  same translation-aware `where` so totals and pages cannot diverge.
- Public discovery ordering remains rating/recommended: rating descending,
  experience descending, createdAt descending; experience sort is experience
  descending, createdAt descending, rating descending. There is no text
  relevance or locale-match ranking. Package ordering remains its existing
  discount/price sort. Admin and history orders remain outside this phase.
- No duplicate practitioner rows, skipped entities, duplicate entities across
  pages, page-size change, count semantic change, cursor/offset change, or
  locale-dependent ordering may be introduced.

#### Legacy, partial translation, and specialty safety

Legacy-only practitioners with no translation rows and populated legacy title/
bio remain searchable through the existing OR exactly as today. Existing
publication/readiness predicates still apply; localized search must not make a
translation-only profile public or eligible. AR/EN partial translations are
field-level text matches, not completeness gates. Specialty translation-title
search, specialty slug/category filters, and the BLOC-1 localized taxonomy
repositories remain independent and unchanged.

#### PostgreSQL/Prisma index audit

Observed schema/index coverage:

- `User`: primary key and `(status, createdAt)`; no `displayName` index.
- `PractitionerProfile`: primary key, unique `userId`/`publicSlug`, and
  status/type, gender/status, country/status, and primary-category/status
  indexes; no `professionalTitle` or `bio` index.
- `PractitionerProfileTranslation`: primary key, unique
  `(practitionerProfileId, locale)`, and `(locale, practitionerProfileId)`;
  no title/bio text index.
- `PractitionerSpecialty`: unique `(practitionerId, specialtyId)` and
  `(specialtyId, practitionerId)`.
- `SpecialtyTranslation`: unique `(specialtyId, locale)`, unique
  `(locale, slug)`, and `(locale, title)`; the latter does not make a leading
  wildcard substring search indexable.

The current Prisma `contains` with case-insensitive matching is effectively
`ILIKE '%term%'` for PostgreSQL. Ordinary B-tree indexes cannot accelerate
that leading-wildcard predicate, so the current identity/title/bio search
already scans. The locale/profile relation index can help locate translation
rows by locale/profile correlation, but does not solve the translated title/bio
substring predicate. No index was added.

#### Representative development query-plan audit

Against the local development database (60 users, 25 practitioner profiles,
no translation rows in the measured fixture), representative `EXPLAIN
(ANALYZE, BUFFERS, FORMAT JSON)` queries were run without writes:

- Current core identity/legacy-title/bio predicate: hash join with sequential
  scans of `User` and `PractitionerProfile`; 3 rows, 2 shared-hit buffers,
  0.203 ms execution.
- Proposed core predicate plus correlated translation `EXISTS`: hash join
  plus a sequential scan of `PractitionerProfileTranslation` for the
  correlated branch; 3 rows, 2 shared-hit buffers, 0.527 ms execution.
- The `EXISTS` shape has no row multiplication risk. The tiny fixture is not a
  production capacity benchmark; at scale, leading-wildcard scans across the
  existing OR plus translated fields require a broader search strategy.

**INDEX OUTCOME C:** Current substring search design itself needs a broader
search-strategy decision. Do not add a migration in BLOC-2F1A. The smallest
next step is to choose and measure a common strategy for all current searchable
text fields (for example, a PostgreSQL trigram/full-text design or a dedicated
search projection) before enabling localized search at production scale. The
first implementation can still use the audited `EXISTS` contract only if that
known scan tradeoff is explicitly accepted.

#### Exact BLOC-2F1B endpoint scope and client impact

Recommended exact implementation scope:

1. `GET /public/practitioners`.
2. `GET /public/package-offers`.

Use the existing request locale and `search` parameter. Web and Mobile keep
the same request, response shape, query identity, pagination, and UI. **Client
impact: NONE.** Patient package purchase history, Admin directories, finance
operations, featured-placement management, instant booking, matching,
publication, availability, pricing, and specialty taxonomy are explicitly
outside BLOC-2F1B.

#### Future BLOC-2F1B regression matrix

| Case | Required assertion |
| --- | --- |
| A | AR query matches authored AR professional title. |
| B | EN query matches authored EN professional title. |
| C | Requested-locale query matches valid fallback content according to the configured policy. |
| D | Legacy-only practitioner remains searchable. |
| E | AR + EN + legacy match returns one practitioner/offer owner. |
| F | Public practitioner total remains practitioner-level; package total remains offer-item-level. |
| G | Pagination has no duplicates/skips and result/count predicates stay aligned where a count exists. |
| H | Existing specialty translation/title, slug, and category search still works. |
| I | Display-name search remains canonical and locale-independent. |
| J | Publication, readiness, availability, pricing, package eligibility, and booking capabilities are unchanged. |
| K | Existing ordering and tie behavior are stable; no locale relevance ranking is introduced. |
| L | Public package-offer search covers display name and localized professional content without searching package metadata unless explicitly added later. |
| M | Translation lookup is batched/relational; no N+1 query is introduced. |
| N | AR -> EN -> AR isolation holds; only authored content for the selected policy set can match. |

#### Audit closure and next step

- APIs, hooks, mutations, authentication/session behavior, cache invalidation,
  deep-link identifiers, response contracts, pricing/payment authority,
  lifecycle authority, matching authority, and backend business rules were
  not changed.
- Presentation-only future mapping: localized professional title/bio text is
  added to the public search boolean predicate; it must not affect readiness,
  eligibility, availability, pricing, booking, featured position, matching
  score, or response keys.
- Files changed in this audit: this tracker entry only. No production backend,
  Web, or Mobile file was changed.
- Tracker status: **BLOC-2F1A audit complete; BLOC-2 remains OPEN; BLOC-2F1B
  is not started; BLOC-2 is not marked complete.**
- Exact next step: decide/measure the broader substring-search strategy, then
  separately authorize and implement BLOC-2F1B for the two public endpoints
  above. Do not auto-start it from this audit.

### 2026-08-17 - BLOC-2F1A2 - Practitioner Search Strategy Benchmark & Final Decision

**Status: BENCHMARK COMPLETE. No production search behavior, migration, Web UI,
Mobile UI, backfill, seed, or BLOC-2F1B implementation was started. BLOC-2
remains OPEN.**

This follow-up benchmark used only a disposable local PostgreSQL database
(`sawiyaa_bloc2f1a_bench`) and synthetic rows. The database was dropped with
`WITH (FORCE)` after collection. The canonical `fayed_db` data and schema were
not populated, rewritten, or changed.

#### Reconfirmed query contract

The future public consumers remain exactly:

- `GET /public/practitioners`.
- `GET /public/package-offers`.

The current text contract remains case-insensitive substring matching over
canonical `User.displayName`, legacy `PractitionerProfile.professionalTitle`,
legacy `bio`, and the existing independent specialty translation search where
applicable. The localized branch is still designed as a practitioner-level
relation `some`/PostgreSQL `EXISTS` over current AR/EN translation title/bio.

Existing approved/published/active/readiness, specialty, language,
availability, price, coupon, package, rating, and other eligibility predicates
are unchanged. Public practitioner ordering remains the existing rating /
recommended or experience ordering with the current createdAt tie behavior.
Public discovery still filters, sorts, and slices in memory at practitioner
level. Package offers still generate offer items, sort them by the existing
discount/price behavior, and slice at offer-item level. No relevance ranking,
database count rewrite, or pagination change is part of this decision.

#### Isolated benchmark environment and dataset

- PostgreSQL `17.0` on the local development host; disposable database only.
- `User`, `PractitionerProfile`, and `PractitionerProfileTranslation` tables
  modeled the production searchable columns and publication predicates.
- Fixture sizes: **1,000**, **10,000**, and **25,000** practitioner profiles.
- Every profile had an active user and published/approved profile.
- Approximately 80% had both AR and EN translation rows; 20% were legacy-only.
- Partial translation rows included missing AR titles and missing EN bios.
- Fixtures used authored English terms (`neurotherapy`, `therapist`) and
  authored Arabic text including `العلاج الأسري`; no machine translation,
  transliteration, or normalization rule was added.

#### Baseline versus pg_trgm results

Query A was the current root join plus the localized `EXISTS` predicate with
no trigram indexes. Query B used the same SQL semantics plus the measured
translation-only GIN trigram pair. Times below are representative local
`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` execution times in milliseconds;
they are not a production capacity SLO.

| Dataset | Term | Current scans | Query B with translation GIN | Improvement |
| ---: | --- | ---: | ---: | ---: |
| 1,000 | selective English | 11.280 | 9.453 | 1.19x |
| 1,000 | selective Arabic | 15.379 | 13.716 | 1.12x |
| 1,000 | common `therapist` | 10.695 | 8.840 | 1.21x |
| 1,000 | no result | 10.007 | 9.960 | 1.00x |
| 10,000 | selective English | 100.061 | 44.419 | 2.25x |
| 10,000 | selective Arabic | 141.501 | 71.898 | 1.97x |
| 10,000 | common `therapist` | 91.741 | 44.099 | 2.08x |
| 10,000 | no result | 98.706 | 47.138 | 2.09x |
| 25,000 | selective English | 247.797 | 123.431 | 2.01x |
| 25,000 | selective Arabic | 367.384 | 179.618 | 2.05x |
| 25,000 | common `therapist` | 241.907 | 99.530 | 2.43x |
| 25,000 | no result | 267.673 | 121.208 | 2.21x |

At 10,000 and 25,000 rows, Query B used bitmap scans on the translation
title/bio GIN indexes while the root `User` and legacy profile branches still
used sequential scans under the existing OR-plus-join shape. At 1,000 rows,
the planner correctly preferred sequential scans. The result row counts were
identical between Query A and Query B for every tested term.

Testing all five candidate trigram indexes showed that the root
`User.displayName`, legacy title, and legacy bio indexes were not selected by
this current query shape. Repeating the query with only the two translation
indexes was within benchmark noise of all five indexes. The minimum useful
set for the current localized `EXISTS` activation is therefore the translation
title/bio pair, not five automatic production indexes.

#### Arabic, English, and short-term behavior

- Authored English `neurotherapy` and authored Arabic `العلاج الأسري` matched
  correctly at all relevant dataset sizes; UTF-8 content was preserved.
- Common English matching remained substring/boolean inclusion and did not
  introduce relevance ranking.
- No-result terms returned zero rows in both strategies.
- One-character `a` matched the same broad dataset as the current behavior;
  neither strategy used trigram indexes.
- Two-character `ps` preserved the current no-result behavior in the fixture;
  neither strategy used trigram indexes. There is no existing minimum search
  length in this contract, and none was introduced.
- No query translation, transliteration, Arabic normalization, or fuzzy
  similarity matching was introduced.

#### Deduplication, pagination, and ordering

The localized branch remained a correlated `EXISTS`; AR + EN + legacy matches
returned one root practitioner profile. No raw translation JOIN or `DISTINCT`
was used. Therefore the established practitioner-level total/slice semantics
and package offer-item total/generation/sort/slice semantics remain unchanged.
Locale match did not affect rating, recommended, experience, createdAt, or
package discount/price ordering.

#### Storage and write-cost tradeoff

Measured translation-only GIN index storage was approximately:

- 1,000 rows: 196,608 bytes.
- 10,000 rows: 1,966,080 bytes.
- 25,000 rows: 3,858,432 bytes.

That was approximately 47%, 48%, and 38% of the three searchable table heap
sizes in the disposable fixture. Creating all five candidate indexes measured
approximately 0.50 MB, 4.32 MB, and 8.89 MB respectively, confirming the
storage benefit of excluding unused root-column indexes.

At 25,000 rows, an update touching 1,000 legacy profile titles measured
7.848 ms without trigram indexes versus 41.606 ms with all five indexes. An
update touching translation titles measured 19.338 ms versus 61.377 ms. The
translation update includes maintenance for the two required GIN indexes;
the root indexes are on different tables. These are local synthetic write
measurements, but they confirm that professional-content edits incur real GIN
write cost and must be included in deployment capacity review.

#### Extension and deployment safety

`pg_trgm` is available on the current local PostgreSQL 17 installation but was
not installed in the canonical development database. It was installed only in
the disposable benchmark database and removed with that database.

The future deployment plan is intentionally not executed here:

1. Verify `pg_trgm` availability and extension permission in every target
   environment.
2. Add `CREATE EXTENSION IF NOT EXISTS pg_trgm` through the approved database
   migration/deployment path.
3. Create these two indexes with a separately controlled, non-blocking
   deployment step where supported:

   ```sql
   CREATE INDEX CONCURRENTLY practitioner_profile_translation_professional_title_trgm_idx
   ON "PractitionerProfileTranslation" USING GIN ("professionalTitle" gin_trgm_ops);

   CREATE INDEX CONCURRENTLY practitioner_profile_translation_bio_trgm_idx
   ON "PractitionerProfileTranslation" USING GIN (bio gin_trgm_ops);
   ```

4. Validate index existence, query plans, read latency, write latency, and
   rollback readiness before localized search activation. Rollback is
   `DROP INDEX CONCURRENTLY` for the two indexes; do not drop a shared
   extension while other database objects depend on it.

#### Final decision

**SEARCH STRATEGY B:** Use the existing relation `some`/`EXISTS` localized
predicate with the two translation-column GIN trigram indexes before localized
search activation. This preserves current case-insensitive substring semantics,
authored AR/EN content, legacy fallback, canonical display-name search, and
boolean inclusion behavior. Full-text/search-projection redesign is not
warranted by this benchmark and remains outside BLOC-2F1.

#### Exact next phases

1. **BLOC-2F1B1 - pg_trgm/index migration + deployment validation ONLY:**
   extension/index deployment, plan verification, write-cost checks, and
   rollback readiness. Do not activate localized predicates in this phase.
2. **BLOC-2F1B2 - localized EXISTS search activation ONLY:** add the already
   audited translation predicate to `GET /public/practitioners` and
   `GET /public/package-offers`, with focused regression coverage. Do not
   change client requests, response contracts, eligibility, pagination,
   ordering, ranking, or business authority.

#### Validation and tracker state

- Existing focused public practitioner/package search tests remain the required
  regression baseline; no production behavior was changed by this benchmark.
- Backend typecheck and focused tests are to be rerun after tracker cleanup;
  benchmark SQL itself executed successfully against the disposable database.
- Temporary benchmark script was removed after use; benchmark JSON remains in
  the OS temp directory only and is not project data.
- Files changed for this phase: this tracker entry only; no production backend,
  Web, or Mobile file was changed.
- BLOC-2F1A2 is complete as a decision record. BLOC-2F1 is not complete,
  BLOC-2F1B1 has not started, and BLOC-2 remains OPEN.

### 2026-08-17 - BLOC-2F1B1 - pg_trgm / Translation Search Index Foundation

**Status: DONE. Migration/deployment validation only. BLOC-2F1B2 localized
search activation was not started. Parent BLOC-2 remains OPEN.**

#### Deployment architecture decision

The repository uses Prisma `6.19.2`, `prisma migrate deploy`, and 143 ordered
PostgreSQL migrations. `schema.prisma` explicitly permits advanced raw SQL
migrations where Prisma metadata cannot represent the database feature. No
migration safety scanner or existing concurrent-DDL utility was found.

Selected **PATH B**:

- A normal, repeat-safe Prisma migration provisions `CREATE EXTENSION IF NOT
  EXISTS pg_trgm`.
- A dedicated Node deployment utility executes the two `CREATE INDEX
  CONCURRENTLY` statements outside Prisma's migration transaction boundary.
- The utility creates the indexes sequentially, validates exact catalog shape
  and readiness after each build, supports idempotent retries, exposes a
  PostgreSQL-native status mode, and supports concurrent rollback.

No `CREATE INDEX CONCURRENTLY` was placed in a Prisma migration. No blocking
`CREATE INDEX` fallback was used.

#### Exact deployment artifacts

- Prisma extension migration:
  `prisma/migrations/20260817110000_enable_pg_trgm_extension/migration.sql`
- Deployment utility:
  `scripts/deploy-practitioner-translation-search-indexes.js`
- Package commands:
  `db:deploy:practitioner-translation-search-indexes`,
  `db:rollback:practitioner-translation-search-indexes`, and
  `db:status:practitioner-translation-search-indexes`.

The only approved indexes are:

1. `practitioner_profile_translation_professional_title_trgm_idx` on
   `"PractitionerProfileTranslation"("professionalTitle") USING GIN`
   with `gin_trgm_ops`.
2. `practitioner_profile_translation_bio_trgm_idx` on
   `"PractitionerProfileTranslation"(bio) USING GIN` with `gin_trgm_ops`.

The three benchmarked-but-unused indexes on `User.displayName`, legacy
`PractitionerProfile.professionalTitle`, and legacy `PractitionerProfile.bio`
were **not** added.

#### Fresh and existing-schema validation

- A fresh disposable PostgreSQL 17 database received all 143 repository
  migrations in order, including the translation table migration followed by
  the `pg_trgm` extension migration. `prisma migrate deploy` completed
  successfully.
- A 5,000-profile disposable translation fixture was added only after the
  migration chain completed; no canonical project data was seeded or rewritten.
- The deployment utility created the title index first, validated it, then
  created the bio index. Both were catalog-verified as GIN, exact target column,
  `gin_trgm_ops`, `indisvalid=true`, and `indisready=true`.
- Re-running deployment detected both indexes as ready and created nothing.
- The existing-schema upgrade path was validated against the translation table
  already created by the prior BLOC-2 migration, followed by extension/index
  foundation deployment. No data rewrite occurred.

#### Planner and result validation

The approved localized `EXISTS` SQL was used only in disposable test queries;
no application predicate was changed.

| Query | Rows | Execution | Translation indexes used |
| --- | ---: | ---: | --- |
| English selective (`neurotherapy`) | 263 | 19.203 ms | title + bio GIN bitmap scans |
| Arabic selective (`العلاج الأسري`) | 294 | 30.028 ms | title + bio GIN bitmap scans |
| Common term (`therapist`) | 5,000 | 13.933 ms | title + bio GIN bitmap scans |
| No result | 0 | 20.257 ms | title + bio GIN bitmap scans |
| One character (`a`) | 5,000 | 8.859 ms | sequential scans; unchanged semantics |
| Two characters (`ps`) | 0 | 42.372 ms | sequential scans; unchanged semantics |

Indexes changed plan/performance only. Indexes-on versus indexes-absent root
result counts and SHA-256 ID-set hashes were identical:

- English: 263
- Arabic: 294
- Common: 5,000
- No result: 0
- One character: 5,000
- Two characters: 0

No duplicates, ordering, eligibility, pagination, count, or application query
behavior was changed. No minimum search length was introduced.

#### Final two-index write cost

On the disposable 5,000-profile / 10,000-translation-row fixture, with only
the final two GIN indexes present:

- Translation `professionalTitle` update touching 1,000 profiles: **86.298 ms**.
- Translation `bio` update touching 1,000 profiles: **99.445 ms**.

These are local capacity measurements, not product behavior. They document the
write cost that must be included in deployment review.

#### Invalid-index recovery, observability, and rollback

- The utility inspects `pg_index.indisvalid` and `indisready` after every build.
- A disposable-only catalog-state simulation forced the title index to invalid
  and not-ready. The utility detected it, removed it with `DROP INDEX
  CONCURRENTLY`, recreated it, and revalidated both indexes. The canonical
  database was not touched. A direct cancellation attempt completed too early
  to leave an invalid relation, so the deterministic disposable catalog
  simulation was used for the recovery proof.
- `--status` reports extension state, exact index definitions/validity,
  `pg_stat_progress_create_index`, and waiting PostgreSQL activity.
- Rollback drops bio first, then title, both with `DROP INDEX CONCURRENTLY`,
  verifies absence, and deliberately leaves `pg_trgm` installed. Re-running
  deployment is the documented retry path.

#### Application and scope invariance

- `GET /public/practitioners` was not modified.
- `GET /public/package-offers` was not modified.
- No Prisma application query, response contract, ranking, pagination,
  eligibility, publication, pricing, package logic, Web code, Mobile code,
  backfill, seed, full-text search, fuzzy search, or BLOC-2F1B2 work was added.
- The three unused trigram indexes were not added.

#### Acceptance checklist

- [x] Deployment architecture audited; PATH B selected.
- [x] `pg_trgm` availability and extension path validated.
- [x] Exact two-index scope preserved.
- [x] No unused three-index expansion.
- [x] Concurrent/non-transactional deployment path validated.
- [x] Sequential index creation enforced.
- [x] Fresh database migration path passed.
- [x] Existing translation-schema upgrade path passed.
- [x] Both indexes valid and ready.
- [x] Invalid-index recovery documented and tested in disposable state.
- [x] Query planner evidence captured for AR, EN, common, no-result, and short terms.
- [x] Result-set invariance passed.
- [x] Final two-index write cost measured.
- [x] Rollback path passed; extension retained.
- [x] Application search unchanged.
- [x] Web/Mobile unchanged.
- [x] BLOC-2F1B2 predicate activation not started.
- [x] Focused practitioner/package regressions passed.

#### Validation and exact next phase

- `npx prisma validate` passed.
- Fresh `npx prisma migrate deploy` passed across all 143 migrations.
- Deployment utility syntax check, standalone scoped ESLint, and Prettier
  check passed; the repository's project-service ESLint config intentionally
  excludes JavaScript under `scripts/` from its TypeScript project.
- Focused practitioner/package search tests: 2 suites, 8 tests passed.
- Backend typecheck passed.
- On the untouched canonical database, `prisma migrate status` reports only the
  expected new extension migration as pending; the extension/index deployment
  utility correctly refuses to proceed until that migration is applied.
- Read-only `prisma migrate diff` surfaced pre-existing canonical schema drift
  outside this task (including existing index/constraint/default differences);
  no drift repair or canonical database mutation was attempted.
- Scoped git/diff checks completed; unrelated dirty-worktree findings were
  preserved.
- Visual validation: **NOT APPLICABLE**; no UI changed.

Exact next phase: **BLOC-2F1B2 - Localized EXISTS Search Activation ONLY** for
`GET /public/practitioners` and `GET /public/package-offers`. Do not start it
automatically from this foundation phase.

### 2026-08-17 - BLOC-2F1B2 - Localized Practitioner Professional-Content Search Activation

**Status: IMPLEMENTED. Backend acceptance and the real Web/Mobile visual search
gate passed against a disposable API runtime, but closure remains blocked by the
normal backend typecheck defect recorded below. BLOC-2F1 remains OPEN.**

#### Exact production scope

Only the existing practitioner search `where.OR` branches were extended for:

- `GET /public/practitioners` through
  `PublicPractitionerReadRepository.buildPublicWhere`.
- `GET /public/package-offers` through
  `ListPublicPackageOffersUseCase` practitioner selection.

The new branch is the Prisma relation predicate:

```text
professionalContentTranslations: {
  some: {
    locale: { in: requestedLocaleThenSupportedFallbackLocales },
    OR: [
      { professionalTitle: { contains: search, mode: insensitive } },
      { bio: { contains: search, mode: insensitive } },
    ],
  },
}
```

No raw translation join, `DISTINCT`, resolver-in-memory filtering, API
contract change, migration, index, seed, backfill, Web change, or Mobile
change was added.

#### Locale and business policy

`getProfessionalContentSearchLocales` derives the search set from the existing
`SUPPORTED_LOCALES` authority and orders the requested locale first, followed
by the other supported locale. Because the predicate is boolean inclusion,
this order does not affect ranking. Search remains authored substring matching;
the query is not translated or transliterated.

The existing approved/public/active-user, identity, legacy title/bio,
specialty, language, availability, pricing, coupon, package, rating, and
offer-generation predicates remain in place. Translation matches cannot make a
non-public practitioner visible or bypass package eligibility. Presentation
continues through the existing batch/relation selection and professional
content resolver.

#### Deterministic disposable validation

Against a disposable database with all 143 migrations plus the BLOC-2F1B1
extension and two valid/ready GIN indexes:

- AR title-only match returned the authored AR practitioner.
- AR bio-only match returned the authored AR practitioner.
- EN title-only match returned the authored EN practitioner.
- EN bio matching was field-level and did not require title completeness.
- An AR request matched valid EN fallback content.
- A legacy-only practitioner with no translations remained searchable.
- Display-name matching remained unchanged.
- AR + EN + legacy matches returned unique practitioner owners; no root-row
  multiplication occurred.
- A non-public practitioner with a matching translation remained excluded.
- One-character search remained accepted; no minimum length was introduced.
- Package-offer practitioner candidates remained unique before existing offer
  generation, preserving offer-item pagination semantics.

Prisma emitted a correlated `EXISTS` relation predicate over
`PractitionerProfileTranslation`. No per-result translation query was added.
The root plan used the existing locale/profile correlation index for the
per-practitioner probe; direct translation-term `EXPLAIN ANALYZE` confirmed
both approved trigram indexes remain eligible when the planner favors the
term indexes. No materially different query shape or unsafe raw SQL was
introduced.

#### Validation

- Focused backend tests: 5 suites, 30 tests passed, including repository
  predicate shape, public practitioner discovery, package offers, specialty
  filters, and professional-content resolver regression.
- Backend normal typecheck is blocked by the existing BLOC-2F1B2 typing defect:
  `public-practitioner-read.repository.ts:171` reads `input.locale` although
  that helper input type does not declare `locale`. QA did not repair production
  code; the API/client gate used transpile-only runtime solely for evidence.
- `npx prisma validate` passed.
- Disposable full migration/deployment path passed; temporary fixture and
  database were removed afterward.
- Scoped API/client source inspection confirmed existing Web and Mobile clients
  continue sending the same `search` parameter and consuming the same response
  contract.
- The repository-wide ESLint command reports pre-existing dirty-worktree
  diagnostics in these files (line-ending/prettier drift, unsafe mock access,
  an existing unused catch variable); typecheck and focused tests remain clean.
- `git diff --check` reports pre-existing generated-Prisma trailing whitespace;
  unrelated dirty-worktree findings were preserved.
- Real Web AR/EN discovery and package-offer searches passed at 390px and
  desktop widths against the disposable backend; screenshots are recorded in
  `D:/Web/full-projects/sawiyaa/qa-artifacts/BLOC-2F1B2`.
- Real Mobile AR RTL 360px and EN LTR 390px discovery searches passed against
  the disposable backend; screenshots are recorded in the same artifact folder.
- QA-only runners/fixture files were added in the backend, Web, and Mobile
  repositories. No production application/API/database contract was changed.

#### Acceptance state and next step

- [x] Public practitioner localized search predicate implemented.
- [x] Public package-offer localized search predicate implemented.
- [x] AR/EN title and bio matching.
- [x] Fallback, legacy-only, display-name, partial-field, and dedup behavior.
- [x] Publication, eligibility, pricing, currency, ordering, and pagination
  code paths preserved.
- [x] Prisma `EXISTS` shape and no-N+1 behavior verified.
- [x] BLOC-2F1B1 extension/index foundation used; no application index check
  was added.
- [x] Web Arabic/English discovery visual search QA.
- [x] Web Arabic/English package-offer visual search QA.
- [x] Mobile Arabic/English discovery visual search QA.

Exact next step: resolve the existing BLOC-2F1B2 backend typecheck defect and
rerun the acceptance gate; only after BLOC-2F1 closure may the next phase be
**BLOC-2F2 - Deterministic Bilingual Seed Fixtures**. Do not start seed/backfill
work or another backend search phase automatically.

### 2026-08-17 - BLOC-2F1B2 - Final Visual / End-to-End Search Acceptance Gate

**Status: QA EVIDENCE COMPLETE; BLOC-2F1B2 and BLOC-2F1 remain OPEN pending
normal backend typecheck repair.**

- Disposable database `sawiyaa_bloc2f1b2_qa_20260817` used; canonical
  `fayed_db` was not mutated. All 143 migrations, `pg_trgm`, and both target
  GIN indexes were applied and verified `indisvalid=true`, `indisready=true`.
- Deterministic A/B/C/D fixture covered localized title/bio-only inclusion,
  legacy-only fallback, hidden/non-public exclusion, specialty regression,
  deduplication, locale isolation, stable display name, and package price/
  duration/count/discount/CTA invariants.
- Real API checks passed for both public practitioners and package offers.
- Real Web client passed AR/EN discovery and package searches at 390px and
  desktop widths. Real Mobile Expo-web client passed AR RTL 360px and EN LTR
  390px discovery searches. Target public search responses were not mocked.
- Focused backend tests passed: 2 suites, 10 tests. QA runner syntax/lint checks
  passed. Normal `npm run typecheck` remains blocked at
  `src/modules/practitioners/repositories/public-practitioner-read.repository.ts:171`
  because `input.locale` is absent from the helper input type.
- Expected production changes: none. Test-only files and this tracker entry
  were the only task-scoped repository changes. No seed, backfill, BLOC-2F2, or
  BLOC-2F3 work was started.

### 2026-08-17 - BLOC-2F1B2 - Final Typecheck Repair + Closure

**Status: DONE. BLOC-2F1B2 and BLOC-2F1 are DONE. Parent BLOC-2 remains OPEN.**

- Root cause: `buildPublicWhere` read `input.locale` without declaring the
  existing `SupportedLocale` contract. The helper is also reused by valid
  non-search reads that do not carry locale, so the helper input now declares
  `locale?: SupportedLocale`; professional-content search locales are derived
  only when a search and a resolved locale are present. No default locale,
  cast, or runtime search-policy change was introduced.
- Exact production repair: `src/modules/practitioners/repositories/
  public-practitioner-read.repository.ts` only.
- `npm run typecheck` passed. Focused Jest passed: 5 suites, 30 tests.
  `npx prisma validate` passed. Direct production-file diff check passed.
- Focused ESLint still reports the pre-existing dirty-file Prettier/line-ending
  drift (81 diagnostics in the already-dirty repository file); unrelated
  formatting was deliberately not rewritten.
- Direct normal-runtime AR/EN API acceptance passed again against a new
  disposable BLOC-2F1B2 database, including localized title/bio, fallback,
  legacy-only, exclusion, deduplication, specialty, locale isolation, and
  package invariants. The disposable database was removed afterward.
- Existing Web AR/EN and Mobile AR/EN visual evidence was reused because this
  was a type-contract-only repair with no search or client-runtime change.
- No API, controller, Web, Mobile, migration, index, seed, backfill, ranking,
  pagination, eligibility, publication, pricing, or package behavior changed.

Exact next phase: **BLOC-2F2 - Deterministic Bilingual Seed Fixtures ONLY**.
Do not start it automatically; do not start backfill.

### 2026-08-17 - BLOC-2F2 - Deterministic bilingual development seed fixtures

**Status: IMPLEMENTED; CLOSURE BLOCKED by a pre-existing full-seed
repeatability failure.** Parent BLOC-2 remains OPEN. BLOC-2F3A was not started.

#### Scope implemented

- Added the dedicated `professionalContentFixturesSeedModule` to the existing
  modular development seed sequence after package plans.
- Added isolated deterministic fixture identities under
  `seedIds.professionalContentFixtures`; existing practitioner seed ID
  collections were not expanded, so unrelated availability seeding remains
  unchanged.
- Added six development-only fixtures: S1 AR-primary complete bilingual, S2
  EN-primary complete bilingual, S3 partial EN secondary with field-level
  fallback, S4 legacy-only with no translation rows, S5 translated but
  non-public, and S6 public deduplication with one owner across legacy/AR/EN
  marker matches.
- Fixture users, profiles, translation rows, specialty/language relations,
  and package eligibility are convergent and use stable IDs/slugs. Stale
  cleanup is scoped to the six owned profiles and supported locales.
- The module skips `production` and `staging`; no schema, migration,
  backfill, application resolver, search query, API contract, or business rule
  was changed.

#### Validation

- Fresh disposable database with all 143 migrations deployed successfully.
- First full development seed completed successfully and converged all six
  fixtures.
- The dedicated fixture module was run again independently and converged all
  six fixtures; the run-1/run-2 verification artifacts both report six
  profiles and exactly 10 translation rows:
  `D:/Web/full-projects/sawiyaa/qa-artifacts/BLOC-2F2/`.
- Resolver assertions passed for complete bilingual, partial secondary,
  field-level fallback, and legacy-only scenarios. S5 remains unpublished;
  S6 has exactly one profile owner despite matching all three content sources.
- Real development API acceptance passed for AR/EN practitioner title and bio
  search, detail projections, fallback, non-public exclusion, public
  deduplication, package-offer owner deduplication, and locale-invariant
  package durations/prices.
- Focused Jest passed: 3 suites, 19 tests. `npm run typecheck`, `npx prisma
  validate`, focused ESLint for new TypeScript files, and `node --check` for
  the API runner passed.
- Visual validation: NOT APPLICABLE; this is backend seed/test-fixture work
  with no UI change.

#### Closure blocker and boundary

- Historical blocker resolved by the final session-seed repeatability repair
  recorded below; no session/business logic or unrelated seed module was
  modified.

### 2026-08-17 - FINAL BLOC-2 closure audit

**Status: DONE / CLOSED.** BLOC-2F2 and the parent BLOC-2 are complete.

- Root cause: `session-access.seed.ts` refreshed its dynamic
  `rescheduled-active-revision` session at `now + 4h`, while the separately
  owned `curated-dev` patient-B ready-to-join fixture occupied `now + 5h`.
  On a later run, the old curated interval remained while the new rescheduled
  interval drifted into it. Namespace cleanup was correctly scoped and could
  not delete the curated fixture.
- Exact fix: moved only the session-access rescheduled fixture to `now + 3h`,
  keeping it dynamically relative, preserving the same patient/accounts and
  scenario semantics, and leaving a full session interval before the curated
  patient-B fixture. The existing namespace-owned cleanup remains scoped to
  `sawiyaa.dev.session-access.v1` sessions.
- The `Session_patient_time_no_overlap_excl` database constraint was not
  changed, disabled, or bypassed. The seed now conforms to it.
- On disposable database `sawiyaa_bloc2_closure_20260817`, all 143 migrations
  applied, full development seed #1 passed, full development seed #2 passed,
  and both BLOC-2F2 verification passes reported 6 profiles and exactly 10
  translation rows. The disposable database was removed afterward.
- Focused session verification passed: 9 owned scenarios, 9 unique markers,
  no overlap among active database-participating intervals, and both primary
  demo accounts present. Existing dynamic session-access scenarios remain
  relative to execution time.
- Focused Jest passed: 4 suites, 21 tests. `npm run typecheck`, `npx prisma
  validate`, focused QA-script ESLint, and `git diff --check` passed. The
  existing session seed file still reports repository baseline Prettier drift
  when linted directly; unrelated formatting was not rewritten.
- Final BLOC-2 audit found no production legacy practitioner dataset in the
  current development-only project requiring migration. Unknown-source legacy
  values remain supported by the existing fallback contract.
- **BLOC-2F3 backfill execution: NOT REQUIRED AT THIS STAGE.** No backfill,
  source-locale inference, translation, schema change, API change, or client
  change was performed.
- BLOC-3, BLOC-4, and BLOC-5 remain NOT STARTED. No new localization phase was
  opened. Localization work stops here.
