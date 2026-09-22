# Session module source-of-truth and duplication audit

**Date:** 2026-08-08  
**Scope:** backend Sessions module and integrations; web and focused mobile contract/client review.  
**Git inspected:** `main` at `7b87aab56e773ad051c09f913dfb4eedae558063`.

This is discovery only. No application, schema, migration, seed, generated client, frontend/mobile code, or database data was changed.

## Executive finding

The backend has one practical lifecycle mutation mechanism, `SessionLifecycleService.transition`, and production lifecycle-status writes found in this audit route through it. It is not yet a complete single source of truth for **what is happening now and what an actor may do**. That operational answer is assembled separately by the join policy, patient-actions service, cancellation policy, outcome evaluator, attendance/reconciliation readers, mapper, next-session query, summary queries, and frontend/mobile inline conditions.

There are **30 routes in the Sessions controllers**. The web client implements 17 of those directly; the mobile client implements 15 directly. Admin runtime/manual-decision APIs have separate web clients; several backend routes have no current web/mobile consumer. There are no discovered direct production `Session.status` Prisma/raw-SQL bypasses. The only non-lifecycle call to the misleadingly named `SessionRepository.updateStatus` is reschedule; it writes schedule fields only, not `status`.

## Backend API inventory (30)

| Route | Actor | Use case/service | Reads/writes/lifecycle | Web/mobile consumer |
|---|---|---|---|---|
| `POST /patients/me/sessions` | Patient | CreateScheduledSession | Session/payment setup; creates session | web + mobile booking |
| `GET /patients/me/sessions` | Patient | GetMyPatientSessions | Session list/mapper | web + mobile list/dashboard |
| `GET /patients/me/sessions/summary` | Patient | GetMyPatientSessionSummary | aggregation | web + mobile dashboard |
| `GET /patients/me/sessions/:id` | Patient | GetSessionDetails | details/mapper/actions | web + mobile details/pay/review |
| `POST /patients/me/sessions/:id/runtime/prepare` | Patient | PrepareSessionRuntime | provider runtime fields | web (mobile has no prepare call) |
| `GET /patients/me/sessions/:id/runtime/join` | Patient | ResolveSessionJoinContract | events, may `UPCOMING -> READY_TO_JOIN` | web + mobile |
| `POST /patients/me/sessions/:id/cancel` | Patient | CancelSession | cancellation/payment/refund facts; `-> CANCELLED` | web + mobile |
| `GET /patients/me/sessions/:id/cancel-preview` | Patient | PreviewSessionCancellation | policy/payment read | web + mobile |
| `GET /practitioners/me/sessions` | Practitioner | GetMyPractitionerSessions | list/mapper | web + mobile list/dashboard |
| `GET /practitioners/me/sessions/summary` | Practitioner | GetMyPractitionerSessionSummary | aggregation | web + mobile dashboard |
| `GET /practitioners/me/sessions/:id` | Practitioner | GetSessionDetails | detail/mapper | web + mobile detail |
| `POST /practitioners/me/sessions/:id/runtime/prepare` | Practitioner | PrepareSessionRuntime | runtime fields | web + mobile |
| `GET /practitioners/me/sessions/:id/runtime/join` | Practitioner | ResolveSessionJoinContract | events/may readiness transition | web + mobile |
| `POST /practitioners/me/sessions/:id/runtime/close` | Practitioner | CloseSessionVideoRoom | Daily close/evidence; active session -> admin resolution | web + mobile |
| `POST /practitioners/me/sessions/:id/complete` | Practitioner | MarkSessionCompleted | lifecycle completion | web + mobile |
| `POST /practitioners/me/sessions/:id/mark-no-show` | Practitioner | MarkSessionNoShow | Phase 1 boundary then no-show/admin resolution | web + mobile |
| `POST /sessions/:id/join-bootstrap` | Participant | ResolveSessionJoinContract | final credential authorisation | web only (`bootstrapSessionJoin`) |
| `GET /users/me/next-session` | Patient/practitioner | GetMyNextSession | bespoke next-session projection | web + mobile cards |
| `POST /sessions/webhooks/daily` | Daily | HandleDailyAttendanceWebhook | attendance facts, may `-> IN_PROGRESS` | provider only |
| `GET /admin/sessions` | Admin | GetAdminSessions | list/mapper | web admin list/dashboard |
| `GET /admin/sessions/:id/runtime-inspection` | Admin | InspectAdminSessionRuntime | forensic/runtime projection | web inspector |
| `GET /admin/sessions/:id/attendance` | Admin | GetAdminSessionAttendance | attendance/reconciliation/evaluator projection | web inspector |
| `GET /admin/sessions/:id/manual-decisions` | Admin | ListAdminSessionManualDecisions | decision history | web |
| `POST /admin/sessions/:id/manual-decision` | Admin | CreateAdminSessionManualDecision | decision + lifecycle/possible financial handoff | web |
| `GET /admin/sessions/resolution-cases` | Admin | AdminSessionResolutionService | case list | web resolution |
| `GET /admin/sessions/:id/resolution-case` | Admin | AdminSessionResolutionService | case | web resolution |
| `POST /admin/sessions/:id/resolution` | Admin | AdminSessionResolutionService | resolution/lifecycle/financial handoff | web resolution |
| `POST /admin/sessions/:id/package-entitlement-decision` | Admin | CreateAdminSessionPackageEntitlementDecision | entitlement/earning handoff | web runtime |
| `GET /admin/sessions/cancellation-policies` | Admin | GetSessionCancellationPolicies | policy read | web editor |
| `PATCH /admin/sessions/cancellation-policies/:bookingType` | Admin | UpdateSessionCancellationPolicy | policy write | web editor |

Additional session-adjacent APIs are owned by Payments, Reviews, Chat, Availability and Package modules (initiate/reconcile payment, financial breakdown, review, chat, availability). They consume Session facts but are not Sessions-controller routes.

### Internal backend inventory by responsibility

| Area | Active implementations inspected | Classification |
|---|---|---|
| Controllers and DTO boundary | patient, practitioner, admin, Daily webhook, join-bootstrap and next-session controllers; request DTOs for cancel, room close, completion, no-show and admin decisions | active entry points |
| Lifecycle and persistence | `SessionLifecycleService`, transition validator, `SessionRepository.updateStatus`, lifecycle events and transaction/row-lock helpers | canonical lifecycle mutation path |
| Read/presentation | `SessionMapper`, list/detail/summary use cases, next-session query, admin list and runtime/attendance presenters | active, but policy is split across projections |
| Runtime/join | `ResolveSessionJoinContractUseCase`, `ResolveSessionJoinReadinessService`, `session-join-policy.util`, provider runtime preparation and Daily credentials adapter | bootstrap is canonical final authorization; display projection is duplicated |
| Outcome/attendance | Daily webhook handler, attendance event normalization, attendance summary/reconciliation, `SessionOutcomeEvaluator`, automatic finalizer, practitioner completion/no-show/room-close commands | active; evidence and outcome policy overlap |
| Cancellation/payment/finance | cancel/preview policy and effects, payment/package purchase lifecycle handlers, refunds, earning/entitlement handoffs | separate domain facts; multiple outcome entry points |
| Admin resolution | `AdminSessionResolutionService`, manual-decision use case, attendance/inspection readers, package-entitlement decision | competing outcome orchestration; forensic readers should remain separate |
| Schedule/replacement/reminders | `RescheduleSessionService`, replacement query filters, notification sweeper and reminder queue repository | active; schedule update is misleadingly named `updateStatus` |

No additional production scheduler, worker, repository method, mapper, or raw-SQL status writer was found outside the paths classified in this document. The complete search included the backend source tree, rather than only controller references.

## Lifecycle writer inventory

### Canonical production writer: KEEP

`SessionLifecycleService.transition` validates the transition, writes `Session.status` and timestamps through `SessionRepository.updateStatus`, and appends `SessionEvent`. The following production paths call it:

**Count:** one direct lifecycle-writer mechanism, with 19 discovered production `transition(...)` call sites across 11 command/worker paths (some commands transition more than once). This is a count of code call sites, not of public endpoints.

| Writer/call path | Statuses/purpose | Classification |
|---|---|---|
| Create scheduled/payment/package payment success/failure/expiry flows | payment/confirmation lifecycle | CANONICAL |
| CancelSession | `CANCELLED` | CANONICAL |
| ResolveSessionJoinContract + join notification sweeper | `UPCOMING -> READY_TO_JOIN` | CANONICAL but duplicated trigger |
| Handle Daily webhook -> MarkSessionInProgressFromAttendance | readiness/in-progress | CANONICAL |
| Practitioner complete / CompleteSessionTransaction / automatic finalizer | completion path | CANONICAL but overlapping command/finalizer policies |
| Practitioner no-show | `PATIENT_NO_SHOW` or `AWAITING_ADMIN_RESOLUTION` after Phase 1 | CANONICAL writer, policy source now Phase 1 boundary |
| Practitioner room close | `AWAITING_ADMIN_RESOLUTION` after Phase 1 | CANONICAL writer, provider action remains distinct |
| CreateAdminSessionManualDecision / AdminSessionResolutionService | completion/no-show/resolution outcomes | CANONICAL writer, two admin outcome commands compete |
| Expiry/sweepers | `EXPIRED`/completion confirmation flows | CANONICAL |

**Direct bypass result:** no production `prisma.session.update`, `updateMany`, `upsert`, or raw SQL found that writes `Session.status` outside this mechanism. Test fixtures directly mutate status (acceptable test setup). `RescheduleSessionService` calls `updateStatus`, but its payload only changes schedule/join-window/revision fields; this is a naming/API encapsulation violation risk, not a lifecycle bypass. `SessionReminderQueueRepository.replaceSessionPlan` directly changes schedule snapshot/join times only.

**Required consolidation:** rename/restrict repository `updateStatus` to lifecycle-only API and add `updateScheduleFields`; make type-level status exclusion impossible for non-lifecycle callers.

## Backend dependency/call-flow map

```text
HTTP/worker/provider command
  -> ownership/access + command-specific policy
  -> row lock where mutating
  -> SessionLifecycleService.transition (only lifecycle writer)
  -> SessionEvent + independent facts (payment, room, attendance, resolution)

Daily webhook -> parse -> normalise trusted evidence -> AttendanceEvent
             -> MarkSessionInProgressFromAttendance -> lifecycle
             -> reconciliation/evaluator remain read/worker inputs

Participant no-show -> ParticipantSessionOutcomeBoundaryService
                    -> ALLOW / REJECT / AWAITING_ADMIN_RESOLUTION

Room close -> Daily adapter -> room-close fact/event -> boundary -> admin resolution state
Admin manual decision OR admin resolution -> separate admin command services -> lifecycle/finance handoff
```

## Source facts versus interpretation

| Fact/domain | Persisted authority | Current interpretation owners | Assessment |
|---|---|---|---|
| Lifecycle | `Session.status` + lifecycle events | mapper, summaries, next-session, frontend/mobile matrices | canonical fact; duplicated interpretation |
| Room/provider | provider fields and `videoRoomClosedAt` + events | join policy, close command, frontend checks | separate valid fact; join policy canonical for bootstrap |
| Attendance | `SessionAttendanceEvent`; reconciliation snapshot | attendance summary engine, admin attendance use case, outcome evaluator, Phase 1 boundary | competing levels of aggregation |
| Payment/cancellation | Payment/refund/cancellation record | cancellation policy/effects, finance modules | domain-specific, valid separation |
| Admin resolution | decisions, resolution cases/resolutions | two admin command services | CONFLICTING command ownership |
| Replacement/reschedule | original/replacement relation, schedule revision | RescheduleSessionService, next-session filters | schedule service is canonical writer but no public Sessions route found |
| Finance | earning review/entitlement/ledger/wallet records | cancellation/manual-no-show/admin-resolution services | valid fact, multiple outcome handoffs |
| Identity | User/profile fields | session mapper/admin identity/finance presenters | CONFLICTING projection policy |

There is **no single backend resolver** today for “what is happening now and what may this actor do?” `ResolveSessionJoinReadinessService` only answers runtime eligibility, `ResolvePatientSessionActionsService` answers patient actions, `SessionOutcomeEvaluator` answers post-end recommendation, and `SessionMapper` mixes lifecycle and join availability.

## Business-rule duplication inventory

| Rule/implementation | Classification | Required action |
|---|---|---|
| `SessionLifecycleService` + transition validator | CANONICAL | KEEP |
| `session-join-policy.util` / readiness service | CANONICAL for join-bootstrap | KEEP; migrate all join displays to returned contract |
| `SessionMapper.joinAvailability` | REDUNDANT read projection of join policy | MERGE into operational read model |
| web/mobile `hasSessionRuntimeAccess`, `isJoinWindowOpen`, status arrays | CONFLICTING | MIGRATE CONSUMERS THEN DELETE domain decisions |
| `buildSessionPresentationFilterWhere`, summary/next query status matrices | REDUNDANT/CONFLICTING | MERGE into operational interpretation query |
| `ResolvePatientSessionActionsService` | CANONICAL only for patient action policy | MERGE behind operational interpreter |
| cancellation policy/effects | CANONICAL domain-specific | KEEP AS DOMAIN-SPECIFIC |
| attendance-summary engine | CANONICAL forensic aggregation | KEEP AS DOMAIN-SPECIFIC |
| `SessionOutcomeEvaluator` | CANONICAL recommendation evaluator | KEEP; do not use as a second lifecycle writer |
| `ParticipantSessionOutcomeBoundaryService` | CANONICAL only for current participant no-show/room-close decision | MERGE/generalise into future outcome command policy; retain invariants |
| old direct no-show/room-close paths | DEAD/UNREACHABLE after Phase 1 | DELETE historical tests/comments once replacement contract tests exist |
| CreateAdminSessionManualDecision + AdminSessionResolutionService | CONFLICTING | MERGE command orchestration, preserve specialised financial policies |
| practitioner `mark-completed` + automatic completion + manual decision completion | REDUNDANT legitimate entrypoints | MERGE policy/transition eligibility, retain commands |
| reschedule `updateStatus` repository use | LEGACY API naming | MIGRATE THEN RENAME/RESTRICT |
| `presentationStatus` field equal to `status` | LEGACY compatibility | MIGRATE consumers THEN DELETE |
| frontend package/journey/dashboard status matrices | CONFLICTING | MIGRATE CONSUMERS THEN DELETE |

## API-to-client and consumer matrix

### Web

`features/sessions/api/sessions.api.ts` is the central patient/practitioner client. `use-sessions.ts` owns keys `patient-sessions`, `patient-session-summary`, `practitioner-sessions`, and `my-next-session`. Consumers include PatientSessionDetailPanel/List/Hub/Dashboard/UpcomingSessionCard, PractitionerSessionDetailPanel/List/Dashboard/UpcomingSessionCard, payment/review panels, and routes under patient/practitioner sessions.

Admin has independent clients/keys: `admin-sessions` (list/policies), `admin.session-runtime` (inspection/attendance/manual decisions/package entitlement), and `admin.session-resolution` (cases/resolution). Admin dashboard independently queries the admin list.

| API group | Components/pages | Fields locally interpreted |
|---|---|---|
| patient list/detail/summary | PatientSessionsPanel, PatientSessionDetailPanel, PatientHubPanel, PatientDashboard, payment/review | `status`, `presentationStatus`, `joinAvailability`, actions, payment state |
| practitioner list/detail/summary | PractitionerSessionsPanel/DetailPanel/Dashboard | status arrays, join room state, complete/no-show/close eligibility |
| next-session | UpcomingSessionCard, dashboards | `status`, `joinAvailable`, timestamps |
| admin list | AdminSessionsListScreen/Dashboard | status/delayed/filter state |
| admin runtime | inspection/inspector/evidence/manual decision screens | attendance, reconciliation, room close, evaluator recommendation |
| admin resolution | AdminSessionResolutionScreen | independently selected outcome/remedy |

### Mobile focused contract check

Mobile duplicates client/hook/type stacks under `features/patient/sessions`, `features/practitioner/sessions`, and `features/sessions/next-session`. It calls patient list/summary/detail/cancel/preview/join; practitioner list/summary/detail/prepare/join/close/complete/no-show; and next session. It contains repeated arrays for `UPCOMING`, `READY_TO_JOIN`, and `IN_PROGRESS` in patient/practitioner dashboards, lists, details and cards. It therefore can disagree with web and backend after a new lifecycle state/action rule.

## Query/cache matrix

| Mutation | Web invalidates | Gap |
|---|---|---|
| patient cancel | patient list/detail | not patient summary, next-session, dashboard-specific/admin/practitioner caches |
| patient prepare/join | patient list/detail | not next/dashboard/other actor |
| practitioner prepare/join/close | practitioner list/detail | not practitioner summary, next, patient/admin views |
| practitioner complete/no-show | practitioner list/detail | not summary, next, patient/admin views |
| create session | none in web hook | list/summary/next remain stale until natural refetch |
| admin manual decision | runtime detail/attendance/manual decisions | does not invalidate admin list, resolution cases, patient/practitioner/next |
| admin resolution | resolution key only | does not invalidate every affected projection |

Mobile improves patient cancel/create with journey invalidation, but still does not invalidate next-session or the other actor/admin projections. These are cache propagation defects distinct from the duplicated business-rule defects.

## Same-record contradictory display paths

1. A room-closed session previously displayed `READY_TO_JOIN` because mapper/status and room policy were separate; Phase 1 now resolves status to admin-resolution but older cached client cards can remain stale.
2. Detail/list mapper returns status plus `joinAvailability`; web/mobile title can use status while join CTA uses local status matrices and/or a join contract.
3. Next-session has bespoke status/window/replacement SQL predicates rather than consuming mapper/action resolution.
4. Admin list uses mapper status; runtime inspector separately exposes room close, evidence, reconciliation and evaluator result.
5. Finance can choose PatientProfile display name while session/admin mapping chooses User display name.

## Phase 1 boundary assessment

`ParticipantSessionOutcomeBoundaryService` is used only by practitioner no-show and practitioner room-close. It does not write lifecycle and does not duplicate `SessionLifecycleService`; it is a policy boundary. Its evidence selection partially overlaps admin attendance/outcome evaluation, but intentionally applies a narrower participant-authorisation rule. It should **not** become a parallel general lifecycle engine. In the target architecture, retain its invariants, rename/generalise it as the participant outcome policy inside one outcome command orchestrator, and reuse a shared typed attendance evidence snapshot produced by the canonical operational interpreter.

## Target architecture

1. **Canonical write architecture:** retain `SessionLifecycleService` as the only status writer. Introduce no new generic engine; consolidate command orchestration around existing lifecycle, outcome policy, attendance/reconciliation and financial-hand-off services. Every mutating command locks, evaluates one canonical policy, transitions, writes event/facts, then issues notifications.
2. **Canonical read architecture:** create one server-owned `SessionOperationalInterpretation` used by list/detail/next/dashboard/admin projections. It combines (without collapsing) lifecycle, room, attendance/reconciliation, resolution, replacement and actor permissions into `operationalState`, reason codes and allowed actions. Join bootstrap remains independent final credential authorisation.
3. **Domain-specific facts remain separate:** payment/refund, provider room, attendance/reconciliation, cancellation, resolution, replacement, finance and identity do not become status enums.

## Exact migration/deletion plan

| Item | Plan |
|---|---|
| lifecycle service/validator | KEEP |
| join policy/bootstrap | KEEP; use operational interpretation for display only |
| mapper joinAvailability/presentationStatus | MIGRATE CONSUMERS THEN DELETE `presentationStatus`; merge availability display into interpretation |
| web/mobile local status/window/action helpers | MIGRATE CONSUMERS THEN DELETE domain rules; retain formatting-only helpers |
| patient action service | MERGE behind interpretation/action policy |
| Phase 1 boundary | MERGE into participant outcome command policy; do not delete invariants |
| admin manual-decision and admin-resolution orchestration | MERGE, then DELETE one duplicated orchestration path after endpoint clients migrate |
| completion entrypoints | KEEP commands but MERGE eligibility/evidence policy |
| repository `updateStatus` schedule caller | MIGRATE THEN RENAME/RESTRICT |
| duplicated summary/next filters | MIGRATE to operational query, THEN DELETE status matrices |
| stale cache mutation handlers | MIGRATE to shared session invalidation coordinator; delete individual incomplete invalidations |

## Safest implementation order

1. Freeze new session policy helpers and add contract tests around current canonical lifecycle and Phase 1 outcomes.
2. Extract the typed backend operational interpretation from existing good services without changing public semantics; compare it against current mapper/next/admin outputs in tests.
3. Migrate patient/practitioner list/detail/summary/next APIs to the interpretation; then migrate admin list while retaining forensic endpoints.
4. Migrate web and mobile to render state/actions/reasons only; centralise cache invalidation for lifecycle-changing mutations.
5. Merge admin decision/resolution orchestration and completion eligibility around shared policy/evidence inputs.
6. Delete `presentationStatus`, client status matrices, redundant mapper policy, old admin orchestration and repository naming escape hatches only after all consumers and contract tests move.

## Test architecture plan

Create canonical contract fixtures for one Session record and assert parity across patient list/detail/summary, practitioner list/detail/summary, next-session, admin list and inspector operational state. Maintain separate forensic assertions for raw attendance/room/payment facts. Add negative bootstrap tests for every non-joinable operational state. Add race tests for webhook, close, cancellation, participant outcome and admin decision under row lock. Replace duplicated component status tests with a small presentation contract suite consuming server action/state fixtures. Keep provider adapter tests and finance idempotency tests domain-specific.
