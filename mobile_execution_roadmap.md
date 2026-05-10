# Mobile Execution Roadmap

This roadmap is based on:

- `patient_mobile_gaps_and_improvements.md`
- `practitioner_mobile_gaps_and_improvements.md`

It is optimized for a single developer, with minimal context switching, reusable foundations first, and feature work grouped by shared infrastructure.

## Guiding Principles

- Build shared primitives before adding domain-specific screens.
- Prefer reusable list/detail/form scaffolds over one-off screens.
- Keep patient and practitioner work in separate phases unless the infrastructure is shared.
- Defer polish until the underlying navigation, data, and cache patterns are stable.
- Avoid introducing persistence or state abstractions too early unless they are needed by multiple flows.

## Phase 0: Stabilize the Mobile Foundation

### Goal

Make the app shell, navigation, auth/session behavior, and data-fetching foundation reliable enough to support new work without rework.

### Why now

This is the highest-leverage phase. The current app already works, but new features will keep exposing the same underlying issues if we do not stabilize the base first.

### Features included

- Verify and standardize app shell routing for patient and practitioner stacks.
- Confirm auth restore/logout behavior across app restarts.
- Confirm role-based routing after login.
- Normalize loading, error, and empty-state patterns.
- Audit current React Query usage for consistency.

### Shared infrastructure needed

- Shared query key conventions.
- Shared API response/error handling helpers.
- Shared screen scaffolds for:
  - loading
  - error
  - empty
  - retry
- Shared form input and card primitives already present, but review for consistency.
- Optional: a safe app-level bootstrap state for auth + push + locale.

### Dependencies

- None. This is the starting phase.

### Risks

- Over-engineering the foundation.
- Spending too long refactoring before shipping visible value.
- Introducing new abstractions without proving they are reused.

### Exit criteria

- Login/logout/restart flows are stable for both roles.
- Routing reliably lands in the correct patient or practitioner stack.
- Common loading/error/empty states are standardized.
- No feature work depends on brittle ad hoc state logic.

---

## Phase 1: Shared Data and UI Infrastructure

### Goal

Create reusable mobile primitives that will be used by multiple upcoming features, especially content-heavy and list/detail-based screens.

### Why now

This phase prevents duplicate work in later phases. Articles, academy, reviews, package purchases, and practitioner application screens will all need the same structural patterns.

### Features included

- Reusable list/detail layout scaffolds.
- Reusable filter/search bar patterns.
- Reusable trust badge / summary chip patterns.
- Reusable timeline / metadata row patterns.
- Reusable section header and footer action patterns.
- Shared status badge mapping helpers.
- Shared date/time formatting helpers.
- Shared pagination-aware list patterns where needed.

### Shared infrastructure needed

- A small internal UI composition library for common page shells.
- Shared content card components.
- Shared response adapters for backend envelope parsing.
- Shared route-safe helpers for page params and query serialization.

### Dependencies

- Phase 0 should be complete first.

### Risks

- Building too many abstractions too soon.
- Overfitting to one feature and making the shared layer too rigid.

### Exit criteria

- At least two domains can reuse the same page scaffold without bespoke rewrites.
- Search/list/filter pages can be built faster with less duplication.
- Shared helpers cover formatting and status rendering consistently.

---

## Phase 2: Patient Content and Discovery Expansion

### Goal

Fill the biggest patient-side product gap first: content discovery and educational browsing.

### Why now

This is the largest missing user value on the patient side, and it benefits directly from the infrastructure built in Phases 0 and 1.

### Features included

- Patient articles listing.
- Patient article detail.
- Article cover image rendering.
- Article category filtering and search.
- Optional article trust badges / author metadata presentation.
- Improve discovery UX using the shared search/filter scaffolding.

### Shared infrastructure needed

- Article list card.
- Article detail shell.
- Image cover handling.
- Search/filter bar from Phase 1.
- Shared content metadata components.

### Dependencies

- Backend article APIs are already available.
- Phase 1 shared content scaffolding should be ready.

### Risks

- Building a second content model that diverges from the web article UX.
- Forgetting responsive typography and image sizing constraints.
- Overcomplicating filters before the mobile list experience is validated.

### Exit criteria

- Patients can browse, search, and open articles on mobile.
- Article detail renders correctly with image, summary, and metadata.
- Discovery/search/filter interactions are stable and intuitive.

### What to defer

- Advanced content recommendations.
- Rich personalization for articles.
- Offline article caching until the content surface proves valuable.

---

## Phase 3: Practitioner Onboarding and Profile Workspace

### Goal

Complete the missing practitioner management journey: application, readiness, credentials, specialties, and profile organization.

### Why now

This is the largest practitioner-side product gap. It should come after shared scaffolds so the eventual workspace is clean and maintainable.

### Features included

- Practitioner application workflow.
- Application status and review summary.
- Credential management.
- Specialty management.
- Split the current account screen into smaller, purpose-specific sections if needed.
- Readiness checklist / blocker visibility.

### Shared infrastructure needed

- Readiness checklist component.
- Status summary card.
- Form section scaffolding from Phase 1.
- Specialty selector / list item pattern.
- Credential list / upload status row pattern.

### Dependencies

- Phase 0 and Phase 1 should be complete.
- Backend practitioner profile/application/credential APIs already exist.

### Risks

- The current account screen may become harder to maintain if the split is not planned carefully.
- Too much refactoring in one pass can create regressions.
- Credentials/specialties/application state can become intertwined if the screen boundaries are unclear.

### Exit criteria

- Practitioners can understand and manage their application state on mobile.
- Credential and specialty management are accessible without overloading one screen.
- Readiness blockers are visible and actionable.
- The profile workspace feels modular rather than monolithic.

### What to defer

- Deep polish for reviews or trust analytics.
- Heavy dashboard personalization.
- Any new financial enhancements until the workspace is stable.

---

## Phase 4: Practitioner Operational Polish

### Goal

Improve the day-to-day operational screens for approved practitioners: availability, sessions, finance, support, and care chat.

### Why now

The core workflows already exist, so now the goal is to reduce friction and improve clarity without changing the architecture underneath them.

### Features included

- Availability editor UX refinement.
- Session detail and action clarity.
- Finance dashboard polish:
  - wallet
  - ledger
  - settlements
- Support inbox clarity.
- Care chat request/inbox clarity.
- Better presence state visibility and explanations.

### Shared infrastructure needed

- Session action bar.
- Financial summary cards.
- Ledger row component.
- Settlement row/detail component.
- Inbox/request card component.
- Shared status explanation chips.

### Dependencies

- Phase 3 should be stable enough that practitioner account/profile changes do not conflict with operational screens.
- Shared list/detail scaffolds from Phases 1 and 3 should already exist.

### Risks

- Tweaking several operational screens at once can create UX inconsistency.
- Session/payment/support states are easy to confuse if status language is not standardized.
- Presence heartbeat changes should be isolated and tested carefully.

### Exit criteria

- A practitioner can manage a normal workday entirely from mobile with minimal confusion.
- Availability, sessions, finance, support, and care chat use consistent UI patterns.
- Statuses and next actions are easy to understand.

### What to defer

- New financial business rules.
- Major backend changes.
- Deep analytics or export tooling on mobile.

---

## Phase 5: Patient Journey and Post-Session Expansion

### Goal

Expose the most useful patient-side orchestration data in a compact mobile-friendly way.

### Why now

Once the content and shared scaffolding exist, the patient journey layer becomes a high-value enhancement that ties together sessions, payments, matching, support, and assessments.

### Features included

- Patient journey summary / next step view.
- More actionable home screen cards.
- Review after session / review-related entry points.
- Better history entry points for sessions, assessments, and matching.
- Stronger payment status explanation.

### Shared infrastructure needed

- Journey summary card.
- Next-step call-to-action card.
- Recent history rows or tiles.
- Reusable status and recommendation components.

### Dependencies

- Phase 1 should be done.
- Patient content/discovery should already be present so journey entry points can point to real destinations.

### Risks

- Building journey UX without clear priority could make the home screen cluttered.
- Too many next-step cards can overwhelm the user.

### Exit criteria

- The patient home screen clearly tells the user what to do next.
- Journey summaries match the backend data model.
- The user can move from history to action quickly.

### What to defer

- Complex recommendation logic beyond the backend-provided next step model.
- Deep personalization experiments.

---

## Phase 6: Cross-Cutting State and Cache Improvements

### Goal

Improve perceived speed and reduce refetch churn without compromising sensitive auth behavior.

### Why now

This is best done after the major feature skeletons are in place so persistence choices are informed by real usage.

### Features included

- Evaluate query persistence for safe, non-sensitive data only.
- Add selective cache hydration if it clearly improves UX.
- Improve invalidation conventions.
- Reduce unnecessary refetching on navigation where practical.

### Shared infrastructure needed

- Safe persistence policy.
- Cache hydration strategy for non-sensitive lists.
- Query key normalization.

### Dependencies

- Phases 0 through 5 should reveal which data truly benefits from persistence.

### Risks

- Persisting sensitive or stale data by accident.
- Over-optimizing before the product flow is complete.

### Exit criteria

- The app feels faster on relaunch without compromising correctness.
- Sensitive auth logic remains clean and explicit.
- Cache persistence is used only where it is clearly safe and useful.

---

## Parallel Work Guidance

To minimize context switching for a single developer:

- Keep patient and practitioner feature work separated unless the work is explicitly shared infrastructure.
- Use the same UI primitives for both roles once Phase 1 is in place.
- Batch screens that use the same backend domain:
  - patient content together
  - practitioner onboarding/profile together
  - practitioner operations together
- Avoid switching between content work and operational finance work in the same day unless a shared primitive is being extracted.

## Suggested Practical Order

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6

This order is intentionally biased toward reducing future refactors rather than shipping the quickest visible feature first.

## Summary

If the goal is to keep a single developer productive, the right sequence is:

- stabilize the shell
- build reusable scaffolding
- add patient content
- complete practitioner onboarding/workspace
- polish operations
- expose patient journey intelligence
- only then consider persistence/caching refinements

That sequence minimizes duplication, reduces context switching, and keeps the mobile app aligned with the backend and web UX without forcing repeated rewrites.
