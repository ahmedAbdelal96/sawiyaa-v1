# Fayed Frontend Structure Plan

## Purpose

This file is the official frontend execution tracker for Fayed.

It is not a theoretical roadmap.
It is not a placeholder inventory.
It is not allowed to drift away from the codebase.

Use these truth labels strictly:

- `hardened`
  - real backend-backed implementation
  - correct role/route ownership
  - strong loading/empty/error behavior
  - good enough resilience and UX for the current phase
- `baseline implemented`
  - real route/screen/module exists
  - wired to real contracts enough to use
  - still needs hardening, polish, or surrounding UX completion
- `partially integrated`
  - some real backend integration exists
  - but the intended workflow is incomplete, read-only, weakly framed, or missing key UX/runtime pieces
- `placeholder only`
  - route exists
  - but it does not deliver the actual product workflow
- `deferred`
  - intentionally not part of the current frontend scope

If docs and code disagree, the codebase wins.

---

## Post-Closure Handoff (2026-04-01)

Frontend phase tracker closure remains valid for the executed scope in this file.

Next-phase planning now moves to split trackers for clearer ownership:

- Frontend next tracker:
  - `D:\Web\full-projects\fayed\fayed-frontend-v1\FRONTEND_NEXT_PHASE_TRACKER.md`
- Backend next tracker:
  - `D:\Web\full-projects\fayed\fayed-backend-v1\BACKEND_NEXT_PHASE_TRACKER.md`
- Shared integration tracker:
  - `D:\Web\full-projects\fayed\FULLSTACK_INTEGRATION_TRACKER.md`

Execution rule:

- do not reopen closed items here unless current code regresses
- log new frontend work in the frontend next tracker
- log backend-only work in the backend next tracker
- log contract-boundary and rollout dependencies in the shared integration tracker

---

## Current Frontend Execution State (2026-04-06+)

This file remains the active frontend truth reference, with the previous phase closed and preserved.

Current state:

- no active frontend rollout slice is open
- no active backend-ready/frontend-underexposed shared rollout slice is open
- remaining work is tiny hardening residue only, not a distinct execution queue

Backend-ready does not mean frontend-done. Every new frontend item must:

- run the Contract Audit Snapshot before implementation
- stop at the honest backend boundary
- keep deferred domains deferred

### Frontend-Ready Now (direct ownership)

No direct-ownership items remain in this phase queue.

### Shared Full-Stack Rollout Items (integration-owned)

- None at this time

### Backend-Ready but Frontend-Underexposed (do not ignore)

- None at this time

### Deferred Domains (must remain deferred)

- General chat domain
- General settings domain

---

## Current Execution Verdict

The frontend rollout/hardening queue for the current phase is effectively closed.

The codebase now has real backend-backed coverage across public, patient, practitioner, and admin core surfaces, and recent hardening waves have closed the meaningful open UX/copy convergence items.

What remains is small residue only:

- minor opportunistic mobile polish in older screens
- tiny wording touchups if a real product-language bug appears
- normal maintenance-level consistency cleanup

These do not currently justify opening a new execution slice.

---

## Product Direction Baseline

Fayed should now be treated in the frontend as a guided care experience, not just a booking platform.

This means the execution baseline must favor:

- guided entry over flat browsing
- guided matching as a core differentiator
- assessments as funnel + self-discovery + recommendation input
- patient home as a therapy journey, not a classic dashboard
- support as a product layer, not a secondary help page
- booking/payment as task-specific conversion flows
- language that reduces hesitation and cognitive load

This file should be updated against that product direction, not against older dashboard-era assumptions.

---

## Backend-Ready Reality

The backend is now broadly ready for serious frontend work across:

- auth / account bootstrap
- users / patients / practitioners
- public practitioner discovery / profile / specialties / availability / presence
- sessions booking / details / cancel / runtime prepare / runtime join
- payments / refunds / refund-aware statuses
- support flows
- care-chat approval-based flows
- guided matching / assessments / patient journey
- training V1 runtime
- articles baseline
- reviews baseline
- public trust / conversion content-review surfaces
- moderation / safety foundations
- notifications operational/runtime foundations
- admin / ops baseline surfaces
- admin payment / operational visibility baseline

Still intentionally deferred:

- general chat domain
- general settings domain

Do not plan as if deferred domains already exist.

---

## Contract-First Integration Rules

Every new frontend execution area in this file must follow these rules:

- inspect the real backend contract first
- do not invent request payloads
- do not invent response shapes
- do not invent enums, statuses, actions, transitions, or lifecycle assumptions
- treat backend route behavior as authoritative
- treat machine-readable backend error fields as the source of truth for failure handling
- prefer shared contract ownership over UI-side interpretation
- stop at the honest backend boundary when the contract is narrower than the desired UX

Execution consequence:

- backend-ready means eligible to build
- it does not mean frontend can improvise unsupported behavior

Mandatory start gate for every backend-driven slice:

- complete a short `Contract Audit Snapshot` before implementation
- verify: endpoints, request/response shapes, statuses/actions/transitions, machine-readable error fields
- record blocked-vs-ready and the honest frontend boundary
- if one required item is unknown, implementation does not start
- canonical checklist lives in `FRONTEND_MODULE_CREATION_PROMPT.md` (sections `3d` and `13`)

---

## Backend-Closed Priority Promotions

The following areas are no longer "later if backend allows".
They are now legitimate near-term frontend execution surfaces because backend closure is strong enough:

- session runtime prepare / join / live UX
- admin payments / operational finance visibility
- training runtime frontend
- care-chat approval frontend
- public trust / review / content trust surfaces

These should be prioritized ahead of weaker placeholder-era modules.

---

## Notifications Scope Guardrails

Notifications backend maturity does not automatically justify a full notification-center product.

Frontend notification scope should stay constrained to realistic surfaces such as:

- runtime badges or entry indicators where real backend signals are available
- task-relevant inline notification states
- lightweight dropdown or list surfaces only if backed by real contract consumption

Do not overbuild:

- a generic notification center
- speculative preference systems
- complex filtering/archive UX
- notification modules that assume broader product scope than the current backend/frontend contract supports

---

## Architecture / Structure Baseline

### Route Groups

The app is organized under `src/app/[locale]/`:

```text
[locale]/
  (public)/
  (auth)/
    signin/
    signup/
  (patient)/
    patient/
  (practitioner)/
    practitioner/
  (admin)/
    admin/
```

### URL Strategy

- public pages stay flat
  - `/`
  - `/practitioners`
  - `/specialties`
  - `/error-404`
- auth entry is role-explicit
  - `/signin`
  - `/signin/patient`
  - `/signin/practitioner`
  - `/signin/admin`
  - `/signup/patient`
  - `/signup/practitioner`
- protected areas are role-scoped
  - `/patient/*`
  - `/practitioner/*`
  - `/admin/*`

### Shell Ownership

- `src/app/[locale]/(public)/layout.tsx`
  - public shell
- `src/app/[locale]/(auth)/layout.tsx`
  - auth shell
- `src/app/[locale]/(patient)/layout.tsx`
  - patient shell via `PatientAppShell`
- `src/app/[locale]/(practitioner)/layout.tsx`
  - practitioner shell via `DashboardLayout`
- `src/app/[locale]/(admin)/layout.tsx`
  - admin shell via `DashboardLayout`

### Access Strategy

Frontend route access is currently enforced by:

- `src/config/route-access.ts`
- `src/proxy.ts`
- `src/lib/auth/access.ts`

Current truth:

- protected route areas are role-guarded
- root redirects are role-aware
- SUPER_ADMIN no longer has a separate frontend surface
- ADMIN and SUPER_ADMIN both use `/admin/*`

### Cross-Cutting Truth

- SSR-first is the default shape
- route pages are mostly thin
- feature ownership is meaningful in large parts of the codebase
- environment-aware app error handling now exists
- auth and API overlap is materially reduced, but older cleanup debt still exists in smaller pockets

---

## Current Reality Snapshot

### Public Surface

- `baseline implemented`
  - homepage
  - practitioners listing
  - practitioner detail
  - specialties listing
  - specialty detail
  - public articles list/detail baseline
- `partially integrated`
  - homepage trust/conversion framing
  - homepage real-data usage
  - public metadata / SEO system
  - public trust / review / content depth
- `deferred`
  - none beyond unbuilt content areas

Reality note:

- public practitioners and specialties are real
- homepage now leans more heavily on real public entry routes and backend-backed specialty/practitioner sections
- public trust/content depth is no longer homepage-only; public articles and practitioner trust blocks now exist as baseline surfaces
- public shell/navigation affordances no longer point users toward non-real public surfaces as if they were active modules

### Auth / Bootstrap

- `baseline implemented`
  - role-explicit sign-in
  - patient signup
  - practitioner signup
  - patient login/register/google
  - practitioner login + OTP verify
  - admin login
  - route protection and role redirects
- `partially integrated`
  - broader session/auth architecture cleanup
- `placeholder only`
  - none in primary auth entry
- `deferred`
  - none in current auth scope

### Patient Area

- `baseline implemented`
  - journey home at `/patient`
  - guided matching baseline
  - assessments baseline
  - support baseline
  - training runtime baseline
  - care-chat approval/request/conversation baseline
  - profile
  - practitioners discovery reuse
  - sessions
  - payments
- `partially integrated`
  - patient navigation and IA versus new care vision
  - embedded or provider-specific live controls beyond the current runtime baseline
  - payment conversion framing
  - profile and journey surrounding helper flows
- `placeholder only`
  - articles
  - chat
  - reviews
  - settings
- `deferred`
  - general chat
  - general settings as full domain

Reality note:

- patient area is the strongest alignment with the new product direction
- active patient IA now centers journey, matching, assessments, support, and sessions more honestly
- journey CTA sequencing and matching/assessments/support handoff are now materially stronger on the real patient flow
- patient-facing Arabic wording around assessments/check-ins is now materially clearer and more natural (shifted to `اختبارات مبدئية` across connected patient flow labels and CTA copy)
- runtime and payment-state guidance are now materially clearer on patient session surfaces
- patient live-session flow now includes truthful room preparation and clearer live context once runtime access exists

### Practitioner Area

- `baseline implemented`
  - dashboard/workspace
  - profile
  - application/readiness
  - availability/presence
  - wallet summary
  - ledger history
  - settlements visibility
  - care-chat requests and approved conversations
  - sessions list/detail
  - practitioner session actions: `mark-completed`, `mark-no-show`
  - support
- `partially integrated`
  - credentials
  - embedded or provider-specific live controls beyond the current runtime baseline
  - surrounding workspace completion
- `placeholder only`
  - patients
  - reviews
  - articles
  - settings
- `deferred`
  - general settings as full domain

Reality note:

- practitioner area is operationally useful today
- practitioner workspace now foregrounds active requests, runtime readiness, and real operational entry points more clearly
- practitioner live navigation no longer promotes placeholder patients/articles/reviews/settings routes as first-class workspace modules
- practitioner live-session flow now includes truthful room preparation and clearer active-room context without overbuilding provider controls
- specialties management is now real at the practitioner self-service boundary
- credentials upload and review-state visibility are now real at the practitioner self-service boundary
- practitioner runtime session handling now explains the active step, closeout availability, and post-live state more explicitly within the current contract

### Admin Area

- `baseline implemented`
  - admin dashboard/workspace
  - care-chat approval ops
  - admin specialties/catalog baseline
  - practitioner applications
  - support operations
  - reviews moderation
  - moderation reports baseline
  - admin articles ops baseline
  - admin session runtime inspection ops baseline
- `partially integrated`
  - admin payments / operational finance baseline
  - admin notifications diagnostics baseline
  - admin training management baseline
  - surrounding ops expansion
- `placeholder only`
  - chat
  - settings
  - admin-operations
- `deferred`
  - general chat
  - general settings as full domain

Reality note:

- admin is a real ops surface now
- admin live navigation no longer promotes placeholder settings/admin-operations routes as first-class workspace modules
- admin payments is no longer placeholder-only; it now provides a visibility-first lookup/detail baseline with limited refund actions
- admin settlements now provide a real batch list/detail baseline with admin-only generate and closeout actions
- admin notifications now provide a constrained operational diagnostics baseline in the workspace, header, and dedicated list/detail routes
- admin specialties is no longer placeholder-only; it now provides active-catalog create/edit/deactivate visibility within the current contract
- admin training is no longer placeholder-only; it now provides management baseline coverage with create/update, publish/archive, and schedule controls
- admin articles now provide a visibility-first list with limited publish/archive actions in the current contract
- admin session runtime inspection now provides a visibility-only ops tool for runtime readiness and provider linkage checks
- admin payment, notification, moderation-report, and training detail surfaces now explain operational posture more clearly without implying broader control scope
- and the workspace now separates live operational modules from limited and placeholder areas more honestly, with placeholder cards left as diagnostic framing instead of active CTA-style shortcuts

### Cross-Cutting Architecture

- `hardened`
  - role-aware route protection
  - SUPER_ADMIN frontend cleanup
  - legacy RBAC file removal
  - environment-aware app error baseline
- `baseline implemented`
  - i18n baseline
  - RTL/LTR shell behavior
  - feature ownership across major modules
- `partially integrated`
  - residual auth/API cleanup
  - metadata strategy
  - notification layer
  - broader placeholder-route cleanup beyond live nav and shell affordances
- `deferred`
  - none beyond deferred domains

---

## What Is Actually Implemented Today

### Hardened

- route-area protection and role redirects
- SUPER_ADMIN merged into ADMIN frontend surface
- app-wide normalized SSR/server failure UX
- public practitioners listing/detail
- public specialties listing/detail
- patient support
- practitioner support
- admin support
- admin reviews moderation
- patient care-chat approval/request/conversation baseline
- practitioner care-chat visibility/conversation baseline
- admin care-chat approval baseline

### Baseline Implemented

- homepage
- public articles list/detail baseline
- auth entry + role-specific sign-in/signup
- patient journey home
- guided matching
- assessments
- patient sessions
- patient payments
- patient training runtime baseline
- patient profile
- practitioner dashboard
- practitioner profile
- practitioner application/readiness
- practitioner availability/presence
- practitioner wallet summary baseline
- practitioner ledger history baseline
- practitioner settlements visibility baseline
- practitioner specialties management baseline
- practitioner credentials baseline
- practitioner sessions lifecycle baseline
- admin dashboard
- admin practitioner applications
- admin specialties/catalog baseline
- admin notifications runtime baseline
- admin training management baseline
- admin settlements baseline
- admin moderation reports baseline
- admin articles ops baseline
- admin session runtime inspection ops baseline

### Partially Integrated

- homepage trust/conversion and real-data composition
- homepage guided entry and CTA hierarchy are now materially clearer
- practitioner-profile trust block with public review snippets and related public content suggestions
- public metadata/SEO
- patient IA/navigation versus guided care
- session runtime/join/live UX, still bounded to the honest provider-room baseline rather than a custom conferencing suite
- admin payments / operational finance baseline
- broader cross-role notification runtime surfaces
- residual auth/store/API cleanup
- notification runtime surfaces

### Placeholder Only

- patient articles
- patient chat
- patient reviews
- patient settings
- practitioner patients
- practitioner reviews
- practitioner articles
- practitioner settings
- admin chat
- admin settings
- admin admin-operations

### Deferred

- general chat domain
- general settings domain

---

## Old Assumptions That Are No Longer True

- frontend is no longer waiting on backend for the core product
- patient area is no longer a dashboard-first surface
- matching and assessments are no longer future ideas; they are real modules
- support is no longer a secondary help page; it is a real product layer
- SUPER_ADMIN is no longer a separate frontend surface
- admin payments should no longer be treated as backend-blocked by default
- a route existing does not count as implementation if it is still placeholder-only

---

## Already-Built Areas That Need Improvement

This section is mandatory.
Do not skip these items just because the route/module already exists.

### Public Funnel Improvements

- [x] Replace static teaser-heavy homepage sections with more real backend-backed trust/content entry where feasible
- [x] Reframe homepage CTAs around guided care, not only browsing/book-now behavior
- [x] Strengthen public trust/conversion blocks using backend-composed trust summaries, trust blocks, and trust metadata instead of ad hoc frontend stitching
- [x] Tighten public metadata and SEO strategy across homepage, discovery, specialties, profiles
- [x] Remove any remaining public-shell links to not-yet-real public surfaces

### Patient Journey Improvements

- [x] Rework patient navigation so matching, assessments, and support are treated as core
- [x] Reduce leftover dashboard-era framing in patient IA and copy
- [x] Strengthen patient journey CTA sequencing around next-step clarity
- [x] Improve session/payment runtime framing so urgent actions are more obvious
- [~] Remaining mobile-first polish is now tiny residue in older screens; no distinct execution lane is currently open

### Matching / Assessments / Support Improvements

- [x] Center matching more clearly as a care-entry tool, not a side module
- [x] Center assessments more clearly as self-discovery + next-step support
- [x] Strengthen handoff between journey -> matching -> assessments -> booking/support
- [x] Tighten calm, non-clinical, non-diagnostic language in patient assessments/check-in and connected next-step flows
- [~] Any remaining wording debt is small residue only and should be handled as bug-fix level edits, not a new phase item

### Sessions / Payments Improvements

- [x] Implement runtime prepare/join/live experience where backend contract supports it
- [x] Harden payment conversion UX around pending payment, retry, and return flows
- [x] Make patient and practitioner session detail screens less thin where runtime context is missing
- [x] Ensure refund-aware/refund-status behavior is surfaced truthfully where needed

### Practitioner Improvements

- [x] Upgrade specialties from read-only current-state view to full enough management UX if backend supports it
- [x] Upgrade credentials from read-only list to upload/review-aware UX if backend supports it
- [x] Complete practitioner runtime session experience beyond lifecycle closing actions
- [x] Remove placeholder-heavy practitioner IA bias in nav where better sequencing is possible

### Admin Improvements

- [x] Make admin dashboard clearly distinguish live modules from placeholder modules
- [x] Ship the first admin payments / operational visibility baseline without inflating it into a finance suite
- [x] Expand admin from payments into adjacent ops / specialties / training areas in a controlled order
- [x] Keep admin as operational workspace, not a generic dashboard shell

### Architecture / Cleanup Improvements

- [x] Clean remaining auth/store/API overlap
- [x] Remove or quarantine legacy role/auth/RBAC remnants that are no longer active
- [x] Audit placeholder routes in live navigation and shell structures
- [x] Replace placeholder notification surface only with tightly scoped runtime notification UX that matches real backend contracts
- [~] Shared failure/loading/empty convergence now has only minor residue in older modules; continue opportunistically without opening a new rollout lane
- [x] Continue metadata, encoding, and i18n cleanup in older files
- [x] Add contract-first audit/check step to every new backend-driven frontend slice

---

## Backend-Ready Expansion Opportunities

These are valid execution areas now when frontend capacity reaches them.
Backend-ready does not mean frontend-done.

### High-Value Missing Frontend Areas

- [x] Care-chat approval frontend
- [x] Session live experience completion beyond current runtime/join hardening
- [x] Training runtime frontend
- [x] Public trust / content / reviews surfaces
- [x] Notifications runtime surfaces

### Surrounding Completion Areas

- [x] Practitioner specialties management completion
- [x] Practitioner credentials completion
- [x] Admin specialties / catalog management if surfaced in frontend scope
- [x] Public content/article baseline
- [x] Review consumption surfaces outside admin moderation

### Do Not Prematurely Build

- [ ] General chat domain
- [ ] General settings domain
- [ ] Full notification-center product without explicit product and contract scope

---

## Surface-by-Surface Tracking

### Public Surface

Status: `baseline implemented`, not hardened

Current truth:

- [x] Homepage exists and is localized
- [x] Practitioners listing is real and SSR-backed
- [x] Practitioner detail is real and SSR-backed
- [x] Specialties listing is real and SSR-backed
- [x] Specialty detail is real and SSR-backed
- [x] Public articles list/detail baseline is now real and SSR-backed
- [x] Homepage guided entry now points more directly to real product paths
- [x] Homepage now exposes real public content again through the backend-backed articles preview
- [~] Homepage still contains some static explanatory framing, but less teaser-only surface than before
- [x] Practitioner profiles now expose a backend-composed trust block with public review snippets and content suggestions
- [x] Public metadata, localized public 404s, and public unavailable states are materially stronger on core public pages
- [~] Public trust/review/content surfaces are now baseline real, but not yet broad or fully hardened

Complete enough when:

- homepage guided entry is mostly real-data-backed
- trust/conversion framing is no longer static-heavy
- metadata/error/empty behavior is consistent and production-safe

### Auth / Bootstrap

Status: `baseline implemented`, partially hardened

Current truth:

- [x] Role-explicit auth chooser at `/signin`
- [x] Dedicated sign-in flows for patient / practitioner / admin
- [x] Dedicated patient/practitioner signup flows
- [x] Practitioner OTP verification is real
- [x] Proxy/layout access enforcement is real
- [x] SSR cookie bootstrap now seeds one active client auth store path
- [x] Legacy AuthProvider/useAuth and unused legacy auth API/query layer have been removed from active code paths
- [~] Test credentials remain present for development convenience

Complete enough when:

- route/session behavior is stable
- legacy auth overlap is substantially reduced
- frontend has one clear source of truth for auth/session behavior

### Patient Area

Status: strong `baseline implemented`, needs IA and runtime hardening

Current truth:

- [x] Journey home is real
- [x] Matching is real
- [x] Assessments are real
- [x] Support is real
- [x] Care-chat approval/request/conversation baseline is real
- [x] Sessions are real
- [x] Payments are real
- [x] Training runtime baseline is real
- [x] Profile is real
- [x] Practitioner discovery reuse is real
- [x] Matching / assessments / support are now centered more clearly in active patient IA
- [x] Core session runtime/join UX is now real on patient and practitioner detail surfaces
- [x] Live-session flow now includes room preparation and clearer provider/room context where backend supports it
- [x] Payment flow framing is now materially clearer around pending, retry, success, and refund-aware states
- [~] Articles/chat/reviews/settings are still not real

Complete enough when:

- patient area reads as therapy journey first
- next-step sequencing is strong
- matching/assessments/support are first-class in IA
- session/payment runtime UX is complete enough for live operations

### Practitioner Area

Status: `baseline implemented`, operational but incomplete

Current truth:

- [x] Practitioner dashboard/workspace is real
- [x] Profile is real
- [x] Application/readiness is real
- [x] Availability/presence is real
- [x] Care-chat request visibility and approved conversation access are real
- [x] Sessions list/detail are real
- [x] `mark-completed` / `mark-no-show` are real
- [x] Support is real
- [x] Workspace runtime polish is real
- [x] Session live experience now includes room preparation and clearer active-room context where backend supports it
- [x] Specialties management is real within the current replace-all contract
- [x] Credentials upload and review-state visibility are real within the current metadata-only contract
- [x] Practitioner runtime session handling now makes current action, closeout availability, and post-live status clearer within the current contract
- [~] Patients/reviews/articles/settings are placeholders

Complete enough when:

- surrounding operational modules are no longer mostly placeholders
- specialties/credentials have meaningful practitioner workflow support
- runtime session handling is operationally complete

### Admin Area

Status: `baseline implemented`, ops-real but uneven

Current truth:

- [x] Admin dashboard/workspace is real
- [x] Admin care-chat approval flow is real
- [x] Support ops are real
- [x] Reviews moderation is real
- [x] Practitioner applications are real
- [x] Admin payments now has a real lookup/detail operational finance baseline with refund visibility and limited refund actions
- [x] Admin settlements now have a real batch list/detail baseline with admin-only generate and closeout actions
- [x] Admin moderation reports now have a real queue/detail baseline with limited action execution
- [x] Admin notifications now have a real limited diagnostics baseline with admin-only dropdown and list/detail surfaces
- [x] Admin specialties now have a real active-catalog management baseline with create, edit, and deactivate actions
- [x] Admin training now has a management baseline with create/update, publish/archive, and schedule controls
- [~] Chat/settings/admin-operations are still placeholders
- [x] Dashboard now separates live operational modules from limited and placeholder surfaces more clearly
- [x] Placeholder admin module cards remain visible only as non-clickable diagnostic honesty cues rather than active workspace shortcuts

Complete enough when:

- top-priority backend-ready admin ops areas are no longer placeholders
- dashboard clearly reflects actual module maturity
- admin remains operational, not decorative

### Cross-Cutting Platform Architecture

Status: mixed; strong baseline, cleanup still required

Current truth:

- [x] role model and route access are coherent enough for ongoing work
- [x] SUPER_ADMIN split was corrected
- [x] dead legacy RBAC config has been removed, and shared layout comments no longer imply a separate SUPER_ADMIN surface
- [x] environment-aware error UX baseline exists
- [x] i18n is built into new modules from the start
- [x] live navigation and user shell affordances no longer promote placeholder practitioner/admin/settings routes as first-class modules
- [~] some legacy role aliases and old backoffice API role types still exist, but they are now clearly separated from the active route-access model
- [~] notification runtime remains intentionally constrained to admin operational diagnostics rather than a broader notification center
- [~] metadata and older copy are still uneven in broader older surfaces, but shared fallback/loading/empty-state convergence is materially stronger across older real modules
- [x] contract-first start gate is formalized in project docs and checklist, not only team habit

Complete enough when:

- legacy inactive layers are reduced
- shared standards are adopted consistently
- placeholder infrastructure is no longer exposed as live product

---

## Historical Workstreams (Closed Phase Context)

### Workstream 1 - Public Guided Entry + Trust Funnel

Focus:

- homepage real-data composition
- guided entry framing
- trust / review / content surfaces driven by backend-composed trust layers
- SEO / metadata hardening

### Workstream 2 - Patient Therapy Journey Hardening

Focus:

- patient navigation and IA
- matching / assessments / support prominence
- journey CTA sequencing
- patient-first copy cleanup

### Workstream 3 - Sessions + Payments Runtime Hardening

Focus:

- runtime prepare / join / live flows
- payment conversion handling
- urgent-action visibility
- session detail completeness

### Workstream 4 - Admin Payments + Ops Visibility

Focus:

- admin payment visibility
- operational finance baseline
- near-term admin ops surfaces that backend already closes
- honest maturity separation from still-placeholder admin modules

### Workstream 5 - Support + Care Assistance Layer

Focus:

- keep support strong as product
- add care-chat approval frontend
- connect assistance flows without falling into fake general chat

### Workstream 6 - Training Runtime Frontend

Focus:

- training runtime baseline
- honest learner/runtime UX based on real backend contracts
- avoid treating training as a vague later concept

### Workstream 7 - Practitioner Workspace Completion

Focus:

- specialties management completion
- credentials completion
- runtime session completion
- reduce placeholder adjacency in practitioner IA

### Workstream 8 - Admin Ops Expansion

Focus:

- admin specialties / ops surfaces as appropriate
- clearer live vs placeholder maturity

### Workstream 9 - Architecture / Contract Cleanup

Focus:

- auth/api/store cleanup
- placeholder-route cleanup
- notification scope discipline
- contract/error/loading consistency

---

## Strict Start Order

- First harden the already-built core journey surfaces, especially patient IA, matching/assessments/support prominence, and session/payment runtime UX.
- Then ship the backend-strong operational gaps that directly affect live execution: admin payments / operational visibility, session runtime prepare/join/live UX, and care-chat approval frontend.
- Then rebuild the public funnel around real guided care entry, trust, and conversion using backend-composed trust/content/review layers instead of teaser-heavy framing.
- Then ship training runtime frontend and complete practitioner/admin surrounding modules that are currently read-only, weakly framed, or placeholder-adjacent.
- Finally clean the remaining legacy auth/API/RBAC/notification/placeholder debt so the codebase stops carrying old product assumptions.

---

## Phase-Based Execution Tracker

### Phase 1 - Tighten What Is Already Real

Objective:
Improve the quality and alignment of the real product baseline before opening many new surfaces.

- [x] Patient navigation realignment around journey / matching / assessments / support
- [x] Session runtime/join/live hardening
- [x] Payment conversion-state hardening
- [x] Stronger empty/error/loading consistency in already-built core modules
- [x] Admin dashboard live-vs-placeholder clarity
- [x] Practitioner workspace runtime polish
- [x] Enforce contract-first discovery/checklist before each new backend-driven module starts

### Phase 2 - Backend-Strong Operational Gaps

Objective:
Close the highest-value backend-closed operational gaps that directly affect live execution.

- [x] Admin payments / operational finance baseline
- [x] Session live experience completion beyond current runtime/join hardening
- [x] Care-chat approval frontend

### Phase 3 - Public Guided Entry And Trust

Objective:
Make the public funnel reflect the guided care vision and rely on backend trust layers instead of teaser-heavy framing.

- [x] Replace homepage static teaser dependence where feasible with real backend-backed entry content
- [x] Strengthen guided public CTA structure
- [x] Add real trust/content/review surfaces where backend trust/content layers are ready
- [x] Harden public metadata / SEO / public error states
- [x] Add patient-facing instant booking entry and request flow backed by live discovery/pricing

### Phase 4 - Training Runtime + Surrounding Product Expansion

Objective:
Ship backend-closed product areas that are now real execution surfaces, then complete adjacent modules carefully.

- [x] Training runtime baseline
- [x] Public article/content baseline
- [x] Notifications runtime baseline with constrained scope

### Phase 5 - Practitioner And Admin Surrounding Completion

Objective:
Complete surrounding operational areas that are still shallow or read-only.

- [x] Practitioner specialties management completion
- [x] Practitioner credentials completion
- [x] Practitioner runtime session handling completion beyond the current live baseline
- [x] Admin ops/module expansion beyond current live set

### Phase 6 - Architecture Cleanup And Surface Honesty

Objective:
Reduce legacy drift and stop exposing non-real product surfaces as if they are active modules.

- [x] Auth/store/API cleanup pass
- [x] Remove or quarantine dead legacy role/RBAC artifacts
- [x] Audit placeholder routes in live navigation and shell structures
- [x] Replace remaining misleading placeholder affordances
- [x] Continue metadata, encoding, and i18n cleanup

---

## Deferred Domains

These stay deferred until product and backend explicitly say otherwise.

- [ ] General chat domain
- [ ] General settings domain

Deferred-domain guard:

- placeholder routes for chat/settings do not promote these domains into active execution scope
- care-chat approval frontend is not "general chat"
- lightweight operational preferences inside a real module do not equal a full settings domain

Do not use existing placeholder routes as evidence that these domains are ready.

---

## Maintenance Rules

- Do not mark a route as done if it is still placeholder-only.
- Do not mark a module as hardened if it still lacks honest empty/error/loading behavior.
- Do not treat backend-ready as frontend-complete.
- Do not begin a backend-driven frontend slice without auditing the real contract first.
- Do not start backend-driven implementation before completing the Contract Audit Snapshot start gate.
- Do not invent statuses, actions, transitions, payloads, or result shapes in UI code.
- Do not ignore machine-readable backend error fields when shaping UX behavior.
- Do not add new broad surfaces while already-built critical flows are still weak.
- Do not let old booking-platform language survive where guided-care framing should take over.
- Do not overbuild notifications beyond realistic runtime/UI scope.
- Do not stitch trust/credibility sections ad hoc when backend-composed trust layers already exist.
- Do not let placeholder chat/settings routes pull the team into deferred domains.
- Update this file as work lands.
- If code and this file disagree, fix this file.
