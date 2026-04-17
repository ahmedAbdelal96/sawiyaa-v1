# Fayed Master System Gap Plan

Updated: 2026-04-16 (practitioner onboarding backend refinement + operational list truth)

## 1) Executive Truth

This file is the single primary execution reference.

Re-audit verdict from current codebase:

- Core guided-care rollout is closed.
- Frontend is still correctly in maintenance/bug-driven mode.
- No active backend-ready/frontend-underexposed rollout slice is open for non-deferred domains.
- Real remaining gaps are mostly:
  - bounded polish/bug residue,
  - explicit product-scope decision points (not auto-rollout).

No new broad execution phase is reopened by default.

## 2) Audit Evidence Baseline

Primary evidence sources:

- Frontend routes under `src/app/[locale]` across `(public)`, `(patient)`, `(practitioner)`, `(admin)`.
- Frontend domain features under `src/features/*`.
- Backend active module wiring in `fayed-backend-v1/src/app.module.ts`.
- Backend controller contracts under `fayed-backend-v1/src/modules/**/controllers/*.controller.ts`.
- Supporting trackers:
  - `FRONTEND_STRUCTURE_PLAN.md`
  - `FRONTEND_NEXT_PHASE_TRACKER.md`
  - `FULLSTACK_INTEGRATION_TRACKER.md`
  - `BACKEND_NEXT_PHASE_TRACKER.md`

Code is authoritative when docs conflict.

## 3) Backend Completeness Map

### 3.1 Strong and production-meaningful

- Auth/bootstrap/users/patients/practitioners/public discovery/presence/availability.
- Sessions lifecycle (patient/practitioner/admin ops) + runtime inspection support.
- Payments + financial operations (wallet/ledger/settlements/admin ops) with real controllers.
- Matching + assessments + patient-journey.
- Support (patient/practitioner/admin).
- Care-chat approval domain (patient/practitioner/admin).
- Reviews moderation/public trust block.
- Articles public + admin ops.
- Training (public + patient enrollments + admin authoring/scheduling).
- Moderation reports + admin notification diagnostics.

### 3.2 Partial or intentionally narrow

- Notifications are operations diagnostics focused, not a full end-user notification center.
- Settings module exists but includes slice-1 behavior where parts are validate/normalize-oriented and intentionally bounded.
- Financial-rules admin operations (commission/coupon) are backend-real but not surfaced as first-class frontend ops.
- Care-experience-intelligence has internal service/docs depth, but not exposed as an explicit standalone product surface.

### 3.3 Deferred-by-choice but technically present

- General chat controllers are implemented in backend (`/chat/conversations/*`) but still deferred in frontend product scope.
- General settings domain remains intentionally deferred as a full product lane despite backend contracts.

### 3.4 Underdocumented vs overestimated

- Backend top-level docs (`docs/backend-current-state-audit.md`, `README.md`) were truth-synced to current module/controller reality.
- Ongoing backend documentation work is now maintenance-level residue only (keep docs aligned when contracts change).

## 4) Frontend Completeness Map

### 4.1 Complete enough for this phase

- Public funnel baseline: home, practitioners, specialties, articles, trust framing.
- Patient real flow: journey, matching, initial check-ins/assessments, support, sessions, payments, training baseline, care-chat baseline, profile.
- Practitioner real ops: workspace, availability/presence, sessions/runtime closeout, wallet/ledger/settlements, specialties/credentials, support, care-chat, own public trust visibility reviews.
- Admin real ops: applications, support, moderation reports, notifications diagnostics, payments, settlements, finance operations diagnostics events, specialties, training management, articles ops, runtime inspection.

### 4.2 Partial but acceptable now

- Public trust/conversion depth is strong enough but intentionally bounded (not a broad content/trust platform).
- Some operational surfaces are baseline by design (not full suites): admin payments, notifications diagnostics, training/admin ops depth.
- Residual consistency/copy/mobile polish exists as maintenance-level residue only.

### 4.3 Placeholder only

- Patient: `chat`, `settings`.
- Practitioner: `patients`, `articles`, `settings`.
- Admin: `chat`, `settings`.

These are visible as placeholders/guided stubs and must not be counted as product-complete surfaces.

### 4.4 Deferred

- General chat domain.
- General settings domain.

## 5) Frontend vs Backend Alignment Map

### 5.1 Aligned

- Public discovery/trust/article baseline.
- Auth and role-scoped shells.
- Patient journey/matching/assessments/support/sessions/payments/training/care-chat baseline.
- Practitioner runtime + financial operations baseline.
- Admin operational baseline (payments/settlements/moderation/notifications/training/articles/runtime inspection).

### 5.2 Backend-ready but frontend-underexposed (non-deferred)

- No high-value non-deferred rollout gap currently proven.
- Exception handled and closed (2026-04-07): admin session attendance visibility baseline inside runtime inspection was reopened after attendance telemetry read contract became real, then implemented as a narrow summary + timeline visibility slice (no alerts/realtime/inference).
- Exception handled and closed (2026-04-07): admin sessions operational list baseline was reopened after `GET /api/v1/admin/sessions` contract became real, then implemented as a visibility-first table with status + delayed filter and runtime-inspection handoff (no alerting/realtime/control actions).

### 5.3 Frontend-ready but backend-limited

- Not a major active blocker in core guided-care lanes.
- Some advanced operational depth remains intentionally narrow by backend/product design (notifications center depth, broader settings persistence semantics).

### 5.4 Deferred mismatch (intentional)

- Backend has real general chat/settings contracts while frontend keeps these domains deferred by product boundary.
- This is a deliberate scope choice, not an accidental integration miss.

## 6) Real Remaining Gaps That Matter

### 6.1 Worth tracking now (maintenance scope)

- Real bugs/regressions in live lanes.
- High-visibility UX/copy/i18n defects when they are product-truth issues (especially patient-facing language).
- Local consistency residue in older screens if user-facing impact is clear.
- 2026-04-08 closure note: admin finance surfaces (`/admin/payments`, `/admin/payments/:id`, `/admin/settlements`) received a bounded data-first simplification pass that reduced helper/explanatory density and promoted operational data earlier without changing backend behavior.
- 2026-04-08 closure note (phase 2): admin diagnostics surfaces (`/admin/notifications`, `/admin/moderation/reports`, `/admin/sessions/runtime-inspection`) received a bounded simplification pass that removed explanation-heavy blocks and kept operator-facing data/actions first, without any contract or workflow expansion.
- 2026-04-08 closure note (maintenance UX convergence): filter controls were standardized across active admin/patient/practitioner operational list screens to a compact select-first pattern with reusable clear action and calendar inputs matched to real filter granularity (day/month/datetime), without introducing new backend behavior.
- 2026-04-08 closure note (table usability): paginated DataTable surfaces now expose a consistent rows-per-page selector (up to 50) tied to backend list limits or local pagination state, with no change to workflow contracts.
- 2026-04-08 closure note (session reference clarity): sessions now carry a backend-generated human-readable code (`SES-YYYY-######`) exposed across admin/patient/practitioner session surfaces, with admin list filtering by session code for operational follow-up.
- 2026-04-10 maintenance note (patient specialty hierarchy UX): patient matching and patient practitioner discovery now support a main-specialty-first then sub-specialty selection flow in frontend filtering/selection UX, while keeping backend contract usage unchanged (`specialtySlug` remains the applied query field).
- 2026-04-12 maintenance note (practitioner onboarding contract hardening): practitioner self-registration and admin direct practitioner creation now both require selecting a primary specialty category first, then at least one sub-specialty from real DB-backed options; backend enforces category-specialty integrity and frontend submission paths were aligned to the same required contract.
- 2026-04-11 maintenance note (patient profile quality): `/patient/profile` was simplified to a task-first layout, heavy top guidance was removed/demoted to bottom collapsible help, and patient avatar management became real (upload/replace/remove) via new backend contracts without reopening any deferred domain.
- 2026-04-11 maintenance note (patient avatar rendering stability): patient profile read contract now includes inline `avatarDataUrl` in `/patients/me` so frontend renders avatar from the same profile payload without an extra protected image-fetch request.
- 2026-04-11 maintenance note (guided matching quality pass): `/patient/matching` was rebuilt as a stronger step-by-step journey (main specialty area → sub-specialty → care preferences), with cleaner question cards, clearer progress, and tighter answer capture aligned to real matching contract inputs for more trustworthy recommendation ranking.
- 2026-04-12 maintenance note (guided matching readability uplift): question steps now use clearer colored icon cards plus simpler colloquial Arabic phrasing for faster scanning and reduced cognitive load, with no contract or scoring logic change.
- 2026-04-13 maintenance note (guided matching transition stability): budget/details step finalization no longer relies on implicit form submit; transition to result is now explicit button-driven only, preventing unintended auto-navigation during step change.
- 2026-04-14 maintenance note (admin finance ops clarification): `/admin/payments` now presents an operational review table driven by finance operation events with searchable/filterable investigation fields and detail handoff, while settlements work is being re-centered around practitioner payout recording and proof-backed history.
- 2026-04-14 execution truth change (settlements model redesign): the settlements backend is now practitioner-centric for product work. The supported operator flow is practitioner lookup, due review, payout recording, proof upload, and payout history/detail. Batch settlement data remains only as historical/compatibility truth and should not be treated as the normal product model.
- 2026-04-15 execution truth change (finance rules + payouts): revenue share is now explicitly managed as default local vs cross-border commission rules, and practitioner payouts now support partial payout recording against a due row (with remaining due tracked on the settlement row). Historical payment allocation remains snapshot-based and is not recomputed retroactively.
- 2026-04-15 maintenance note (operational list truth fix): `/admin/settlements/dues` no longer applies finance filters or summary metrics client-side on a paginated practitioner slice. A dedicated backend directory contract now returns filtered items + pagination + truthful stats for the full filtered dataset, preventing stale-page “empty” bugs and pagination-driven stat drift.
- 2026-04-14 follow-up note (frontend alignment needed): `/admin/settlements` and `/admin/settlements/:id` still need to be aligned to the new practitioner-centric backend contract surface so the UI no longer frames settlements as a batch-first product model.

### 6.2 Worth tracking as backend/system debt (not frontend rollout)

- 2026-04-16 backend refinement note (practitioner onboarding truth): practitioner onboarding contracts are no longer just profile-readiness toggles. Backend now models practitioner payout receiving data, persists primary specialty category on the practitioner profile, snapshots submitted practitioner application data for admin review truth, and stores richer review audit fields (`reviewedByUserId`, `reviewDecisionReason`) on practitioner applications. Admin direct-create and practitioner self-submission now align around the same category -> sub-specialty integrity and payout destination validation rules.
- Keep backend docs and contract references aligned with controller/DTO updates as routine maintenance.

### 6.3 Decision-gate frontiers (not auto-open)

These require explicit reopen decision, not passive rollout:

- General chat product activation in frontend (currently deferred).
- General settings product activation in frontend (currently deferred).
- Admin financial-rules frontend ops exposure (commission/coupon control UI) only if operations scope explicitly expands.

## 7) What Must NOT Be Worked On Now

- Reopening broad rollout queues without a proven gap.
- Treating placeholder routes as implemented product.
- Expanding deferred domains by momentum.
- Building full-suite variants (finance suite, notification center, CMS/LMS-like expansions) without explicit scope reopen.
- Cosmetic refactors disconnected from real user-facing or contract-truth issues.

## 8) Execution Mode and Triggers

Default execution mode remains:

- Maintenance / bug-driven.

Allowed work types:

1. Real bug/regression fix.
2. Bounded finishing wave from a proven issue cluster.
3. Explicitly reopened frontier backed by:
  - real contract evidence,
  - clear product intent,
  - explicit scope decision.

If none applies, no new execution lane opens.

## 9) Relationship to Supporting Trackers

This file remains the primary execution reference.

Supporting trackers are consistency checks, not day-to-day drivers:

- `D:\Web\full-projects\fayed\fayed-frontend-v1\FRONTEND_STRUCTURE_PLAN.md`
- `D:\Web\full-projects\fayed\fayed-frontend-v1\FRONTEND_NEXT_PHASE_TRACKER.md`
- `D:\Web\full-projects\fayed\FULLSTACK_INTEGRATION_TRACKER.md`

Current relation after re-audit:

- Frontend/shared trackers remain directionally consistent with maintenance-mode truth.
- Backend documentation drift identified in re-audit has been addressed; no frontend rollout implication follows from that closure.

## 10) Placeholder Activation Reopening Audit (2026-04-06)

This audit explicitly classifies current placeholder/stub pages and does not auto-activate all of them.

### 10.1 Route-by-route decisions

- `/admin/admin-operations`
  - Backend reality: real admin finance operations contracts exist at `/admin/finance/operations/events` and `/admin/finance/operations/events/:id`.
  - Frontend reality: activated as a diagnostics-first visibility baseline (events list + event detail).
  - Decision: `completed activation`.
  - Honest boundary kept: visibility-only; no finance control actions or suite expansion.

- `/admin/settings`
  - Backend reality: `/settings/me/*` exists as user-level settings baseline, not full admin system-settings suite.
  - Frontend reality: placeholder.
  - Decision: `deferred by choice` (general settings domain remains deferred).

- `/practitioner/articles`
  - Backend reality: public article read + admin article ops exist; no practitioner-owned article ops contract.
  - Frontend reality: placeholder.
  - Decision: `blocked` for practitioner-owned module activation.

- `/practitioner/patients`
  - Backend reality: no dedicated practitioner-owned patients module route for this page shape.
  - Frontend reality: placeholder.
  - Decision: `blocked`.

- `/practitioner/reviews`
  - Backend reality: public practitioner review snippets + trust summary exist; patient submit and admin moderation exist.
  - Frontend reality: activated as read-only own-public-trust visibility (summary + published snippets).
  - Decision: `completed activation` (no moderation/actions/replies/editing workflows).

- `/practitioner/settings`
  - Backend reality: `/settings/me/*` exists as generic user baseline.
  - Frontend reality: placeholder.
  - Decision: `deferred by choice` (general settings domain remains deferred).

- `/patient/articles`
  - Backend reality: public article list/detail/category contracts are real.
  - Frontend reality: activated to patient-shell read-only article list + detail using existing public contracts.
  - Decision: `completed activation` (read-only consumption only; no personalization/saved-content workflows).

- `/patient/reviews`
  - Backend reality: patient-owned review submit/list/detail contracts are real (`/patients/me/sessions/:id/review`, `/patients/me/reviews`, `/patients/me/reviews/:id`).
  - Frontend reality: activated to a real patient-owned list + detail visibility baseline.
  - Decision: `completed activation` (submission remains session-scoped; no edit/delete/moderation workflows added).

- `/patient/settings`
  - Backend reality: `/settings/me/*` exists as generic user baseline with slice-1 limits.
  - Frontend reality: guided stub.
  - Decision: `deferred by choice` (general settings domain remains deferred).

### 10.2 Chat alias clarification

- `/admin/chat` is a redirect alias to `/admin/care-chat`.
- `/patient/chat` is a redirect alias to `/patient/care-chat`.
- This is not general chat domain activation.
- General chat remains deferred unless explicitly reopened by product decision.

### 10.3 Explicit reopen status after this audit

Reopened for execution consideration (bounded only):

- None currently active.

Already activated from reopened set:

- `/admin/admin-operations` (finance operations diagnostics events list + detail baseline)
- `/admin/sessions` (admin operational sessions list with delayed filter + runtime inspection handoff)
- `/admin/settings` (admin account profile baseline on top of existing `/users/me` + `/settings/me/*` contracts)
- `/patient/reviews` (patient-owned review history + detail baseline)
- `/patient/articles` (patient-shell read-only article list + detail baseline)
- `/practitioner/reviews` (read-only own-public-trust visibility baseline)

Not reopened:

- `/practitioner/settings`
- `/patient/settings`
- `/practitioner/articles`
- `/practitioner/patients`

### 10.4 Recommended activation order (if execution starts)

1. No currently active reopened placeholder route.

## 11) Contract-Backed Reopen Log (Narrow Slices)

- 2026-04-07: Reopened and completed: `admin session attendance visibility baseline` inside existing runtime inspection flow.
- Trigger: newly proven backend contract `GET /api/v1/admin/sessions/:id/attendance`.
- Delivered scope: attendance summary + timeline with null-safe empty/loading/error handling.
- Explicitly not delivered: alerting, realtime, late/no-show inference, dashboard redesign.
- 2026-04-08: Reopened and completed: `session human-readable reference code baseline`.
- Trigger: operational need for a shared patient/practitioner/admin session reference for support escalation.
- Delivered scope: backend auto-generation (`SES-YYYY-######`) + API exposure on session reads + admin search by session code + frontend visibility on core session surfaces.
- Explicitly not delivered: replacing UUID as internal key, analytics semantics, or alerting logic.
- 2026-04-12: Maintenance hardening completed: `guided matching scoring quality calibration`.
- Trigger: repeated tie-heavy outputs and weak confidence signal in recommendation percentages.
- Delivered scope: deterministic 100-point weighted model with stronger preference sensitivity, near-budget tolerance, readiness/experience tie-break factors, and persisted score breakdown in rationale payload for explainability.
- Explicitly not delivered: ML ranking, clinical diagnosis logic, or unsupported schema inference (for example practitioner gender matching beyond current V1 limits).
- 2026-04-13: Reopened and completed: `admin assessment authoring backend contracts (backend-first, no UI)`.
- Trigger: contract audit confirmed patient usage is ready while admin authoring was seed/DB-internal only.
- Delivered scope: admin-protected contracts for assessment draft authoring lifecycle (list/details/create/update metadata/fork draft/question+option CRUD and reorder/scoring config update/preview-score/publish/unpublish) with draft-only mutation guards and publish safety validation.
- Lifecycle guardrails: published active versions are not directly editable; structural/scoring changes require fork-draft flow; publish enforces single active canonical slug lineage while preserving historical submission snapshots.
- Explicitly not delivered: admin frontend authoring UI, analytics/reporting, archive workflow extension, or schema-level lineage redesign.
- 2026-04-13: Architecture correction completed: `assessment authoring ownership moved from admin domain root to assessments domain`.
- Trigger: boundary review confirmed authoring lifecycle is assessments domain logic exposed through admin-protected surface, not an admin-owned business domain.
- Delivered scope: module relocation to `src/modules/assessments/admin-authoring` while preserving admin-only routes/guards/contracts and behavior.
- Explicitly not delivered: any route shape change, any guard relaxation, or any admin frontend work.
- 2026-04-13: Reopened and completed: `admin assessments authoring frontend (contract-backed, bounded)`.
- Trigger: backend authoring contracts are now available and the remaining highest-value gap was admin web authoring UX.
- Delivered scope: `/admin/assessments` list + `/admin/assessments/:id` editor using real backend contracts (metadata edit, question/option create-update-delete-reorder, scoring threshold update, preview-score, publish/unpublish, fork-draft) with lifecycle-aware UI states and admin navigation exposure.
- Explicitly not delivered: analytics/reporting dashboards, archive/audit-trail UI, patient assessment redesign, or any behavior outside current backend contracts.
- 2026-04-13: Bounded finishing wave completed: `admin assessments UX/editor refactor`.
- Trigger: functional authoring flow was live but editor/list presentation remained crowded and low-clarity for operational admin usage.
- Delivered scope: frontend-only IA/layout refactor for `/admin/assessments` and `/admin/assessments/:id` (stronger hierarchy, labeled fields, cleaner sectioning, improved question/option authoring cards, clearer scoring threshold editing, clearer lifecycle action placement, and sidebar preview structure) without contract changes.
- Explicitly not delivered: any backend endpoint change, new lifecycle behavior, analytics/audit expansions, or patient-side assessment changes.
- 2026-04-13: Bounded finishing wave completed: `admin assessments authoring workflow simplification`.
- Trigger: editor remained cognitively heavy for real authoring despite prior visual cleanup.
- Delivered scope: staged authoring flow (setup/questions/scoring/preview), progressive disclosure for advanced setup fields, lower manual input burden via safe auto-generation fallback for slug/question key/option key, and clearer previous/next authoring progression while preserving existing backend contracts and lifecycle behavior.
- Explicitly not delivered: backend contract expansion, analytics/reporting UI, patient-side assessment changes, or speculative authoring templates.
- 2026-04-14: Bounded capability expansion completed: `admin primary specialty category creation`.
- Trigger: operational blocker in `/admin/specialties` where admin could create sub-specialties only and could not add new primary categories.
- Delivered scope: backend admin contract `POST /api/v1/admin/specialties/categories` (server-side slug generation + uniqueness handling) and frontend authoring flow update so specialty creation can inline-create a new primary category from the same modal.
- Explicitly not delivered: full specialty-category management suite (edit/deactivate/reorder/list inactive categories).
- 2026-04-14: Bounded maintenance refinement completed: `single-page specialties hierarchy management`.
- Trigger: operational scan friction from splitting primary/secondary specialty management and forcing extra navigation.
- Delivered scope: `/admin/specialties` refactored into one hierarchy-first screen with primary/secondary filter, expandable primary rows to reveal sub-specialties inline, dedicated modal for primary specialty create/edit, and dedicated modal for sub-specialty create/edit while preserving current active-only read boundary.
- Backend alignment: consumed existing category create contract and added category update contract `PATCH /api/v1/admin/specialties/categories/:id` to support in-place primary edits from the same screen.
- Explicitly not delivered: inactive category listing/reactivation, category deactivation workflow, or taxonomy domain expansion beyond current specialties scope.
- 2026-04-14: Bounded maintenance refinement completed: `specialty reactivation visibility`.
- Trigger: operational need to keep deactivated specialties visible in admin list with direct reactivation control.
- Delivered scope: admin specialties read contract now returns active and inactive specialties for management (`GET /api/v1/admin/specialties`), admin specialties screen shows inactive badge state inline, and supports direct reactivation action without leaving the page.
- Explicitly not delivered: inactive category list/reactivation, category deactivation flow, or broader taxonomy workflow expansion.
- 2026-04-14: Bounded maintenance refinement completed: `primary specialty activation lifecycle visibility`.
- Trigger: operational need to manage primary specialty activation state from the same hierarchy screen.
- Delivered scope: admin specialty-categories read contract now returns active and inactive categories for management (`GET /api/v1/admin/specialties/categories`), and admin specialties hierarchy now shows state badges and direct activate/deactivate controls for both primary and secondary specialties.
- Explicitly not delivered: category archive workflow, soft-delete lifecycle, or inactive-only reporting surfaces.
- 2026-04-14: Bounded activation completed: `admin profile/settings baseline`.
- Trigger: admin users had no real profile/settings surface (`/admin/settings` was placeholder), creating an operational UX gap versus other personas.
- Delivered scope: `/admin/settings` now renders a contract-backed admin profile screen using existing contracts only (`GET /api/v1/users/me`, `GET/PATCH /api/v1/settings/me/preferences`, `GET/PUT /api/v1/settings/me/notification-preferences`) with modal-based preference editing and clear read-only account snapshot.
- Navigation alignment: user dropdown profile action now routes admin/support/content-reviewer roles to `/admin/settings`.
- Explicitly not delivered: user identity editing contracts (name/email/phone), avatar upload for admin, permission management, or broader settings domain expansion.
- 2026-04-14: Bounded capability expansion completed: `settlements practitioner payout operations`.
- Trigger: the product model was reopened to replace batch-first settlements with a practitioner-centric payout flow.
- Delivered scope: backend now supports practitioner payout dues/history/detail reads, practitioner payout recording, proof upload and proof retrieval, and wallet/ledger-consistent payout recording with historical batch data preserved for compatibility only.
- Explicitly not delivered: full accounting suite, reconciliation dashboards, bank integration layer, multi-step payout approval workflows, or a broad finance-domain redesign outside settlements.
- 2026-04-15: Bounded frontend alignment completed: `settlements practitioner-centric frontend`.
- Trigger: backend truth had moved to practitioner-centric payout operations, while the settlements frontend still leaned on the old batch-first mental model.
- Delivered scope: `/admin/settlements/dues` now centers practitioner lookup, due review, payout recording, proof upload, and payout history, while legacy batch surfaces remain secondary and historical only.
- Explicitly not delivered: backend changes, new accounting flows, or any return to batch-first product framing.
- 2026-04-15: Settlements UX streamlined to `list + modal`.
- Trigger: the operator surface needed a lighter daily workflow after the practitioner-centric model was in place.
- Delivered scope: `/admin/settlements/dues` now presents a practitioner table with a quick payout modal, keeping the flow fast for repeated daily use.
- Explicitly not delivered: deep workflow branching, new finance primitives, or reintroducing batch as the main product model.
- 2026-04-15: Practitioner payout persistence confirmed locally after applying backend migrations `016` and `017`.
- Trigger: the practitioner payout history endpoint was failing against `fayed_db` because the new payout tables had not been applied to the local database.
- Delivered scope: `PractitionerSettlementPayout` and `PractitionerSettlementPayoutProof` now exist in the local database, so practitioner payout history/detail reads can resolve against the current backend model.
- Explicitly not delivered: any additional backend redesign beyond aligning the local database state with the already-defined practitioner payout contract.
- 2026-04-15: Deterministic settlements lab seed added for payment and payout testing.
- Trigger: the new practitioner-centric settlements flow needed reliable test data with completed sessions, real wallet balances, and payout history.
- Delivered scope: approved practitioners `B/E/F` now have completed sessions, captured payments, USD wallet balances, current due settlements, and one payout history record for end-to-end operator testing.
- Explicitly not delivered: any production logic change, new finance contract, or replacement of the existing regional bulk seed.
- 2026-04-15: Settlements list gained account balance visibility and operator filters.
  - Trigger: daily operator workflow needed each practitioner row to expose current account balance and easier filtering for due/balanced/verified accounts.
  - Delivered scope: `/admin/settlements/dues` now shows practitioner account and due amounts in the list, plus currency, finance-state, verification, and sort filters for faster payout operations.
  - Explicitly not delivered: any backend contract change or return to batch-first product framing.

- 2026-04-15: Settlements navigation split into parent/children.
  - Delivered scope: admin sidebar now groups settlement routes under "Settlements": batches (`/admin/settlements`), practitioner dues (`/admin/settlements/dues`), and payout operations (`/admin/settlements/payouts`), keeping each screen independent and maintainable.
- 2026-04-15: Practitioner statement capability added for settlements.
  - Trigger: admin operators needed a truthful account statement from first activity onward, not just payout history.
  - Delivered scope: `/admin/settlements/statement/[practitionerId]` now shows a practitioner financial timeline built from ledger earnings and payout records, plus printable PDF export via the browser print flow.
  - Explicitly not delivered: a full accounting suite, invented running balances across mixed currencies, or backend PDF generation.
- 2026-04-15: Operational list truth cleanup: removed per-page-only assessment chips.
  - Trigger: `/admin/assessments` showed draft/published counts derived from the current paginated slice, which changed when paging and could be misread as global totals.
  - Delivered scope: removed the misleading chips so the list only shows the backend-provided `totalItems` until a backend stats contract is added.
  - Explicitly not delivered: backend contract expansion to return global draft/published counts under the active filters.
- 2026-04-16: Practitioner onboarding frontend alignment (contract-first) advanced.
  - Trigger: practitioner onboarding/admin-create/frontend contracts drifted from the refined backend DTOs and admin direct-create was still modal-based.
  - Delivered scope: frontend practitioner/admin contracts were updated to match backend shapes (specialty selection object, payout destination, review audit fields), admin practitioner applications list now routes to a dedicated page-based create flow (`/admin/practitioner-applications/create`), and practitioner/admin review screens were aligned to show payout and review audit truth.
  - Explicitly not delivered: new backend logic, payment/payout processor integrations, or replacing the practitioner onboarding flow with unsupported speculative UI states.
- 2026-04-16: Practitioner onboarding flow redesign (frontend-first) implemented with explicit backend-truth boundary.
  - Trigger: product direction required two-phase onboarding UX (minimal signup, then post-login guided completion workspace) instead of a giant upfront registration form.
  - Delivered scope: practitioner signup UI was reduced to account-baseline inputs plus the currently backend-required specialty minimums, practitioner protected shell now gates non-approved accounts to onboarding-only navigation (`/practitioner/application`), and application page was refactored into a single onboarding workspace that supports gradual save across profile/specialties/credentials with state-aware edit locking during submitted/under-review statuses.
  - Explicitly not delivered: backend auth lifecycle changes. Current backend still blocks practitioner login before approval and still requires specialty selection during registration, which prevents full realization of the intended "pure minimal signup then complete after first login" model without a backend auth/registration contract update.
- 2026-04-17: Admin practitioner application details gained pre-decision full edit capability.
  - Trigger: operations required admin reviewers to correct/normalize practitioner data from one review screen before approval.
  - Delivered scope: new backend contract `PATCH /api/v1/admin/practitioner-applications/:id` updates applicant/profile/specialty/payout onboarding fields and refreshes `submissionSnapshot`; frontend admin application details now exposes an editable form block (display name, practitioner type/gender, profile fields, country/languages, specialty category/sub-specialties, payout destination) with save-before-approve workflow.
  - Explicitly not delivered: credential file replacement/edit flows from admin details screen; credential review visibility remains intact and decision actions remain approve/reject.
