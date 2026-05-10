# Mobile Implementation Plan

This plan converts `mobile_execution_roadmap.md` into small, testable deliverables for a single developer.

Rules for execution:

- keep each task small enough for a focused PR
- prefer shared infrastructure before feature-specific work
- avoid combining unrelated domains in the same batch
- isolate risky changes behind reusable components or helpers
- verify every batch with a quick manual test path

---

## Phase 0. Foundation Stabilization

### Milestone 0.1: Route and auth stability

#### Batch 0.1.A - Confirm shell routing behavior

1. Task: verify root login-to-role routing and tab-stack mounting.
   - Goal: ensure patient and practitioner land in the correct stack consistently.
   - Expected files/areas:
     - `fayed-mobile/app/_layout.tsx`
     - `fayed-mobile/app/index.tsx`
     - `fayed-mobile/app/(patient)/_layout.tsx`
     - `fayed-mobile/app/(practitioner)/_layout.tsx`
     - `fayed-mobile/src/providers/AuthProvider.tsx`
   - Type: shared infrastructure
   - Dependencies: none
   - Risks:
     - accidental navigation regression
     - route loops during bootstrap
   - Definition of done:
     - fresh login routes to the right role
     - restart restores the same role correctly
     - logout clears session and returns to auth

2. Task: normalize loading and bootstrap states.
   - Goal: make auth bootstrap and first render predictable.
   - Expected files/areas:
     - `fayed-mobile/src/providers/AuthProvider.tsx`
     - shared loading/error UI components
   - Type: shared infrastructure
   - Dependencies: task 0.1.A.1
   - Risks:
     - duplicate loading states
     - flashing incorrect screens during restore
   - Definition of done:
     - no user sees the wrong role screen during startup
     - loading states are consistent across auth-sensitive screens

#### Batch 0.1.B - Session and cache safety review

3. Task: audit auth session persistence and logout cleanup.
   - Goal: keep auth storage explicit and safe.
   - Expected files/areas:
     - `fayed-mobile/src/features/auth/storage.ts`
     - `fayed-mobile/src/providers/AuthProvider.tsx`
     - `fayed-mobile/src/lib/api.ts`
   - Type: shared infrastructure
   - Dependencies: task 0.1.A.1
   - Risks:
     - stale token reuse
     - auth state desync
   - Definition of done:
     - auth session is saved and cleared reliably
     - logout leaves no valid session in memory or storage

4. Task: document current query cache boundaries.
   - Goal: decide which data is safe to persist later.
   - Expected files/areas:
     - query hooks across `src/features/*`
   - Type: shared infrastructure
   - Dependencies: none
   - Risks:
     - premature persistence design
   - Definition of done:
     - list of sensitive vs non-sensitive query groups is known
     - no implementation yet, only inventory

---

## Phase 1. Shared UI and Data Primitives

### Milestone 1.1: Reusable page scaffolding

#### Batch 1.1.A - Shared list/detail shells

1. Task: define reusable list page scaffold.
   - Goal: standardize search, filter, loading, empty, and error layouts.
   - Expected files/areas:
     - new shared UI area under `src/components` or equivalent
     - patient/practitioner list pages that can adopt it later
   - Type: shared infrastructure
   - Dependencies: Phase 0 complete
   - Risks:
     - overgeneralizing too early
     - making the scaffold rigid
   - Definition of done:
     - one shared list scaffold can support at least two domains
     - no feature logic is embedded in the scaffold

2. Task: define reusable detail page scaffold.
   - Goal: standardize hero, sections, metadata, and footer actions.
   - Expected files/areas:
     - shared detail shell component(s)
   - Type: shared infrastructure
   - Dependencies: Phase 0 complete
   - Risks:
     - mismatched layouts for patient vs practitioner
   - Definition of done:
     - one shell can render at least one patient detail and one practitioner detail pattern

#### Batch 1.1.B - Common status and metadata components

3. Task: build reusable status chip and summary row primitives.
   - Goal: avoid duplicating status rendering logic in future features.
   - Expected files/areas:
     - shared UI primitives
     - status mapping helpers
   - Type: shared infrastructure
   - Dependencies: none
   - Risks:
     - status naming drift
   - Definition of done:
     - status rendering is consistent across at least two domains

4. Task: build reusable date/time and section header helpers.
   - Goal: reduce repeated formatting and header markup.
   - Expected files/areas:
     - shared formatting utilities
     - shared section header components
   - Type: shared infrastructure
   - Dependencies: none
   - Risks:
     - locale-specific formatting bugs
   - Definition of done:
     - date/time formatting is reused in multiple screens
     - headers look consistent

### Milestone 1.2: Search/filter primitives

#### Batch 1.2.A - Shared search/filter bar

5. Task: create a reusable search/filter toolbar.
   - Goal: provide one consistent pattern for content and discovery lists.
   - Expected files/areas:
     - shared toolbar component
   - Type: shared infrastructure
   - Dependencies: Milestone 1.1
   - Risks:
     - component becomes too patient-specific
   - Definition of done:
     - toolbar supports search, filter badge, and secondary action

6. Task: add route-param helpers for list filters.
   - Goal: avoid repeated param parsing and serialization logic.
   - Expected files/areas:
     - shared helper utilities
   - Type: shared infrastructure
   - Dependencies: none
   - Risks:
     - inconsistent param naming
   - Definition of done:
     - at least one list screen can serialize/deserialize filters through the helper

---

## Phase 2. Patient Content Expansion

### Milestone 2.1: Articles browsing

#### Batch 2.1.A - Article list foundation

1. Task: add patient article data access and types.
   - Goal: connect mobile to the backend article list/detail contracts.
   - Expected files/areas:
     - `fayed-mobile/src/features/patient/...` or a new articles feature area
     - `fayed-mobile/src/lib/api.ts` if a helper is needed
   - Type: feature-specific, uses shared infrastructure
   - Dependencies: Phase 1 list/detail primitives
   - Risks:
     - mismatch with backend article envelope
     - wrong locale/filter behavior
   - Definition of done:
     - mobile can fetch article list data successfully

2. Task: build article list screen using shared list scaffold.
   - Goal: render article cards with search/filter capability.
   - Expected files/areas:
     - patient article list route/screen
     - reusable article card component
   - Type: feature-specific
   - Dependencies: task 2.1.A.1
   - Risks:
     - poor image sizing
     - noisy card hierarchy
   - Definition of done:
     - articles can be browsed and opened from mobile

#### Batch 2.1.B - Article detail

3. Task: add article detail screen.
   - Goal: show article content in a readable mobile layout.
   - Expected files/areas:
     - article detail route/screen
     - article detail section components
   - Type: feature-specific
   - Dependencies: task 2.1.A.1
   - Risks:
     - long content layout issues
     - image stretching/cropping
   - Definition of done:
     - article detail is readable, scrollable, and usable

4. Task: wire trust/metadata presentation for articles.
   - Goal: present category and trust context without clutter.
   - Expected files/areas:
     - article meta/trust UI
   - Type: feature-specific
   - Dependencies: task 2.1.B.3
   - Risks:
     - too much metadata on small screens
   - Definition of done:
     - key article metadata is visible and compact

### Milestone 2.2: Patient content polish

#### Batch 2.2.A - Discovery alignment

5. Task: reuse the search/filter scaffold in discovery if needed.
   - Goal: reduce duplication between content browsing and practitioner discovery.
   - Expected files/areas:
     - patient discovery screen
     - shared toolbar/helper components
   - Type: shared infrastructure adoption
   - Dependencies: Milestone 1.2
   - Risks:
     - breaking existing discovery behavior
   - Definition of done:
     - discovery still works and uses shared pieces where appropriate

6. Task: improve article empty/error states.
   - Goal: keep the content surface clear when data is missing or failing.
   - Expected files/areas:
     - article list/detail screens
     - shared empty/error components
   - Type: shared infrastructure adoption
   - Dependencies: tasks 2.1.A.2 and 2.1.B.3
   - Risks:
     - inconsistent messaging
   - Definition of done:
     - article screens have clear empty/error states

---

## Phase 3. Practitioner Onboarding and Profile Workspace

### Milestone 3.1: Application and readiness

#### Batch 3.1.A - Practitioner application state

1. Task: add practitioner application status-focused screen/data flow.
   - Goal: make application state visible and actionable.
   - Expected files/areas:
     - practitioner account/workspace screen(s)
     - practitioner profile/application hooks/types
   - Type: feature-specific
   - Dependencies: Phase 1 detail shell and status primitives
   - Risks:
     - account screen becoming overloaded
     - stale status display
   - Definition of done:
     - application status is visible and understandable

2. Task: add readiness blockers checklist UI.
   - Goal: make missing requirements easy to understand.
   - Expected files/areas:
     - practitioner profile/workspace
     - readiness checklist component
   - Type: feature-specific
   - Dependencies: task 3.1.A.1
   - Risks:
     - cluttered screen if not grouped well
   - Definition of done:
     - blockers are clear and mapped to next actions

#### Batch 3.1.B - Credentials and specialties

3. Task: introduce credential management entry points.
   - Goal: separate credentials from the general account form.
   - Expected files/areas:
     - practitioner profile workspace
     - credential list/status components
   - Type: feature-specific
   - Dependencies: Phase 1 reusable list/detail scaffolds
   - Risks:
     - UI duplication with application data
   - Definition of done:
     - credentials are visible in a dedicated structure

4. Task: introduce specialty management entry points.
   - Goal: let practitioners manage specialties in a dedicated section.
   - Expected files/areas:
     - practitioner profile workspace
     - specialty selector/list component
   - Type: feature-specific
   - Dependencies: task 3.1.B.3
   - Risks:
     - category/specialty relationship bugs
   - Definition of done:
     - specialties are no longer only read-only account data

### Milestone 3.2: Profile workspace split

#### Batch 3.2.A - Screen decomposition

5. Task: split account screen responsibilities.
   - Goal: reduce the size and fragility of the current account page.
   - Expected files/areas:
     - `app/(practitioner)/account.tsx`
     - practitioner profile workspace components
   - Type: feature-specific refactor
   - Dependencies: tasks 3.1.A.1 to 3.1.B.4
   - Risks:
     - regression in forms or status display
     - navigation churn
   - Definition of done:
     - the page is modular and easier to maintain

6. Task: keep payout and localization fields separate from core profile concerns.
   - Goal: reduce form complexity and future refactors.
   - Expected files/areas:
     - practitioner profile workspace
     - payout summary components
   - Type: feature-specific refactor
   - Dependencies: task 3.2.A.5
   - Risks:
     - forms becoming harder to save reliably
   - Definition of done:
     - profile concerns are grouped logically

---

## Phase 4. Practitioner Operational Polish

### Milestone 4.1: Availability and presence

#### Batch 4.1.A - Availability UX refinement

1. Task: improve availability editor structure.
   - Goal: make weekly slots and exceptions easier to understand.
   - Expected files/areas:
     - practitioner availability route/screen
     - availability components/hooks
   - Type: feature-specific
   - Dependencies: Phase 1 section/header/status primitives
   - Risks:
     - confusing slot/exception interactions
   - Definition of done:
     - availability can be edited without ambiguity

2. Task: review presence status visibility and heartbeat behavior.
   - Goal: ensure online/offline state is understandable and stable.
   - Expected files/areas:
     - practitioner presence hooks
     - practitioner dashboard/home
     - `app/(practitioner)/_layout.tsx`
   - Type: shared infrastructure plus feature-specific
   - Dependencies: Phase 0 auth stability
   - Risks:
     - heartbeat regressions
     - false offline/online states
   - Definition of done:
     - status updates are stable across app lifecycle changes

### Milestone 4.2: Sessions and communication

#### Batch 4.2.A - Session action clarity

3. Task: improve practitioner session detail actions.
   - Goal: make join/review/complete/no-show actions easy to find.
   - Expected files/areas:
     - practitioner sessions route/screen
     - session action bar component
   - Type: feature-specific
   - Dependencies: Phase 1 action/status primitives
   - Risks:
     - state transition mistakes
   - Definition of done:
     - operational next steps are obvious on session detail

4. Task: improve session list grouping and status explanations.
   - Goal: reduce cognitive load in the session inbox.
   - Expected files/areas:
     - practitioner sessions list screen
     - shared session badge components
   - Type: feature-specific
   - Dependencies: task 4.2.A.3
   - Risks:
     - too many status labels
   - Definition of done:
     - session states are readable at a glance

#### Batch 4.2.B - Support and care chat alignment

5. Task: refine practitioner support inbox and request detail.
   - Goal: separate support tickets clearly from care-chat requests.
   - Expected files/areas:
     - practitioner support screens
     - shared inbox/request card component
   - Type: feature-specific
   - Dependencies: Phase 1 list/detail patterns
   - Risks:
     - mixing ticket and care-chat language
   - Definition of done:
     - support surfaces are easy to distinguish

6. Task: refine practitioner care chat request flow.
   - Goal: make requests and conversations more legible.
   - Expected files/areas:
     - practitioner care-chat screens
   - Type: feature-specific
   - Dependencies: task 4.2.B.5
   - Risks:
     - unread and request states diverging
   - Definition of done:
     - requests and conversations are easy to review and act on

### Milestone 4.3: Finance polish

#### Batch 4.3.A - Wallet and settlement readability

7. Task: polish wallet summary cards.
   - Goal: make balances obvious and scannable.
   - Expected files/areas:
     - practitioner finance wallet screen
     - finance summary components
   - Type: feature-specific
   - Dependencies: Phase 1 summary card primitives
   - Risks:
     - cluttering the financial overview
   - Definition of done:
     - balances are readable in one glance

8. Task: polish ledger and settlement lists.
   - Goal: make financial history easier to inspect.
   - Expected files/areas:
     - practitioner finance ledger/settlements screens
     - ledger row / settlement row components
   - Type: feature-specific
   - Dependencies: task 4.3.A.7
   - Risks:
     - status and amount formatting inconsistencies
   - Definition of done:
     - rows are easy to scan and drill into

---

## Phase 5. Patient Journey and Post-Session Enhancements

### Milestone 5.1: Journey summary surfaces

#### Batch 5.1.A - Patient home actionability

1. Task: add a compact next-step/journey summary on patient home.
   - Goal: make the home screen more action-oriented.
   - Expected files/areas:
     - patient home/dashboard screen
     - journey summary components
   - Type: feature-specific
   - Dependencies: Phase 1 summary card primitives
   - Risks:
     - too many competing calls to action
   - Definition of done:
     - home shows the user what to do next

2. Task: surface recent history blocks more clearly.
   - Goal: make sessions, assessments, matching, and payments easier to revisit.
   - Expected files/areas:
     - patient home/dashboard screen
     - recent history row/tile components
   - Type: feature-specific
   - Dependencies: task 5.1.A.1
   - Risks:
     - information overload
   - Definition of done:
     - user can jump back into recent activity quickly

### Milestone 5.2: Post-session flow polish

#### Batch 5.2.A - Review and payment context

3. Task: improve payment status explanation in session/payment flows.
   - Goal: make session payment states easy to understand.
   - Expected files/areas:
     - patient session detail/payment screens
     - shared payment status components
   - Type: feature-specific
   - Dependencies: Phase 1 status helpers
   - Risks:
     - confusing pending vs paid states
   - Definition of done:
     - payment state and next step are obvious

4. Task: add review-related entry points where supported by the backend.
   - Goal: connect the session completion flow to feedback/review actions.
   - Expected files/areas:
     - patient session detail
     - reviews-related route/screen if used
   - Type: feature-specific
   - Dependencies: backend review contract review
   - Risks:
     - surfacing review action at the wrong time
   - Definition of done:
     - post-session review path is discoverable and safe

---

## Phase 6. Selective Cache and Persistence Improvements

### Milestone 6.1: Safe cache persistence

#### Batch 6.1.A - Non-sensitive data persistence review

1. Task: decide which query groups are safe to persist.
   - Goal: reduce refetch churn without risking sensitive data leakage.
   - Expected files/areas:
     - query hooks across `src/features/*`
   - Type: shared infrastructure
   - Dependencies: all prior phases
   - Risks:
     - stale or sensitive cached data
   - Definition of done:
     - a small, documented allowlist exists

2. Task: implement persistence only for approved non-sensitive groups.
   - Goal: improve relaunch performance and perceived stability.
   - Expected files/areas:
     - app bootstrap / query client setup
   - Type: shared infrastructure
   - Dependencies: task 6.1.A.1
   - Risks:
     - cache invalidation bugs
   - Definition of done:
     - persisted data is safe, intentional, and limited

---

## Execution Notes

- Do the tasks in order inside each batch.
- Do not start a feature batch until the shared infrastructure it depends on is finished.
- Keep PRs focused on one batch whenever possible.
- If a task touches navigation, storage, and UI together, split it.
- If a batch can be validated manually in under 10 minutes, keep it as its own PR.

## Best Fast-Validation Tasks

These are the quickest tasks to test and should be used to confirm the foundation is healthy:

- Phase 0 route/auth stability
- Phase 1 shared list/detail scaffolds
- Phase 2 article list/detail rendering
- Phase 4 session detail action clarity

## Deferred Until Foundations Are Stable

- advanced offline persistence
- deep personalization
- new recommendation logic beyond backend output
- major refactors of finance or support domain models
- any feature that duplicates an existing shared scaffold

