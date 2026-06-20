# Fayed Audit Verification Index

**Date:** 2026-06-17  
**Scope:** Read-only verification pass against the current working tree  
**Projects checked:** backend, web frontend, mobile, platform audits/docs  
**Implementation changes:** none

---

## Verification Status Legend

- `Real issue`: still present in current code and backed by current file evidence.
- `Partially real`: the original finding is directionally correct, but part of it has already been mitigated or the current risk is narrower than the audit claimed.
- `Already fixed`: current code no longer matches the finding.
- `False positive`: the original finding no longer matches the current architecture or misunderstood the current implementation.
- `Needs product decision`: the code supports multiple valid behaviors; current risk cannot be closed by code inspection alone.
- `Needs runtime/device/provider verification`: code alone cannot prove correctness.
- `Not rechecked in depth`: lower-priority item not fully re-opened line-by-line in this pass.

---

## Audit Files Discovered

### Root audit docs

- `docs/platform/audits/audit-master-plan.md`
- `docs/platform/audits/audit-progress.md`
- `docs/platform/audits/findings-register-template.md`

### Phase 1

- `docs/platform/audits/phase-1-sessions-join-chat-support/phase-1-audit-report.md`
- `docs/platform/audits/phase-1-sessions-join-chat-support/phase-1-evidence-index.md`
- `docs/platform/audits/phase-1-sessions-join-chat-support/phase-1-findings-register.md`
- `docs/platform/audits/phase-1-sessions-join-chat-support/phase-1-open-questions.md`

### Phase 2

- `docs/platform/audits/phase-2-payments-wallet-refunds-finance/phase-2-audit-report.md`
- `docs/platform/audits/phase-2-payments-wallet-refunds-finance/phase-2-evidence-index.md`
- `docs/platform/audits/phase-2-payments-wallet-refunds-finance/phase-2-findings-register.md`
- `docs/platform/audits/phase-2-payments-wallet-refunds-finance/phase-2-open-questions.md`

### Phase 3

- `docs/platform/audits/phase-3-availability-booking-instant-presence/phase-3-audit-report.md`
- `docs/platform/audits/phase-3-availability-booking-instant-presence/phase-3-evidence-index.md`
- `docs/platform/audits/phase-3-availability-booking-instant-presence/phase-3-findings-register.md`
- `docs/platform/audits/phase-3-availability-booking-instant-presence/phase-3-open-questions.md`

### Phase 4

- `docs/platform/audits/phase-4-auth-roles-permissions-security/phase-4-audit-report.md`
- `docs/platform/audits/phase-4-auth-roles-permissions-security/phase-4-evidence-index.md`
- `docs/platform/audits/phase-4-auth-roles-permissions-security/phase-4-findings-register.md`
- `docs/platform/audits/phase-4-auth-roles-permissions-security/phase-4-open-questions.md`

### Phase 5

- `docs/platform/audits/phase-5-session-media-video-chat-notifications/phase-5-audit-report.md`
- `docs/platform/audits/phase-5-session-media-video-chat-notifications/phase-5-evidence-index.md`
- `docs/platform/audits/phase-5-session-media-video-chat-notifications/phase-5-findings-register.md`
- `docs/platform/audits/phase-5-session-media-video-chat-notifications/phase-5-open-questions.md`

### Phase 6 working notes

- `docs/platform/audits/phase-6-web-ux-notifications-i18n-leakage/agent-1-route-inventory.txt`
- `docs/platform/audits/phase-6-web-ux-notifications-i18n-leakage/agent-2-patient-ux.txt`
- `docs/platform/audits/phase-6-web-ux-notifications-i18n-leakage/agent-3-practitioner-ux.txt`
- `docs/platform/audits/phase-6-web-ux-notifications-i18n-leakage/agent-4-admin-ux.txt`
- `docs/platform/audits/phase-6-web-ux-notifications-i18n-leakage/agent-5-notifications-ux.txt`
- `docs/platform/audits/phase-6-web-ux-notifications-i18n-leakage/agent-6-i18n-leakage.txt`
- `docs/platform/audits/phase-6-web-ux-notifications-i18n-leakage/agent-7-rtl-ltr.txt`
- `docs/platform/audits/phase-6-web-ux-notifications-i18n-leakage/agent-8-states.txt`

### Phase summaries

- Phase 1: session status/presentation leakage in web surfaces.
- Phase 2: admin payment, settlement, payout guardrails, and mobile payment formatting/i18n.
- Phase 3: booking, availability, instant booking, presence, and session surface contract gaps.
- Phase 4: auth, RBAC, session security posture, token/session handling, and audit logging.
- Phase 5: session media, notifications, push/deeplinks, and admin runtime/privacy concerns.
- Phase 6: route inventory and UX/i18n working notes, not a finalized findings register.

---

## High-Level Audit Themes

1. Session presentation and enum leakage remain one of the most repeated real issues across web/mobile.
2. Several finance/admin guardrails are still missing in frontend or backend, especially payout/step-up consistency.
3. Instant Booking still has real backend operational gaps: race handling, expiry sweeping, notifications, and admin visibility.
4. A meaningful subset of older auth findings are outdated because web auth was hardened after the audit.
5. Notifications/push have a mix of real routing/privacy issues and items that need runtime verification rather than code-only claims.

---

## Verification Matrix

### Phase 1

| ID | Claimed issue | Area | Claimed severity | Current status | Current evidence | Recommended next action |
|---|---|---|---|---|---|---|
| AUDIT-001 | Embedded chat header shows raw `presentationStatus` | Web sessions/chat | P2 | Real issue | `fayed-frontend-v1/src/features/chat/components/SessionChatPanel.tsx` still renders `session?.presentationStatus.replaceAll("_", " ")` | Fix in web session/i18n phase |
| AUDIT-002 | Admin sessions list omits `presentationStatus` prop | Web admin sessions | P2 | Real issue | `fayed-frontend-v1/src/features/admin/sessions/components/AdminSessionsListScreen.tsx` still uses `<SessionStatusBadge status={row.status} />` | Fix with admin session surface hardening |

### Phase 2

| ID | Claimed issue | Area | Severity | Current status | Current evidence | Recommended next action |
|---|---|---|---|---|---|---|
| AUDIT-003 | Refund amount has no max cap | Web admin finance | P1 | Real issue | `AdminPaymentOpsScreen.tsx` still accepts free numeric input with no visible max/refundable cap | Add frontend cap/helper text |
| AUDIT-004 | Settlement mark-paid/failed has no confirmation | Web admin settlements | P1 | Partially real | Frontend still submits directly in `AdminSettlementDetailScreen.tsx`, but backend now enforces step-up in settlement controller | Add confirmation UX; backend security already improved |
| AUDIT-005 | Hardcoded EGP/USD currency logic | Web admin finance | P2 | Real issue | `AdminSettlementGenerateDrawer.tsx` and related payout/settlement drawers still hardcode `EGP` and `USD` | Consolidate supported currency contract |
| AUDIT-006 | Manual practitioner payout lacks MFA/step-up | Backend + web admin finance | P2 | Real issue | Active manual payout controller still lacks `@RequireStepUp`; drawer calls mutation directly | Fix backend + frontend together |
| AUDIT-007 | Mobile cancel preview shows raw money strings | Mobile patient payments | P2 | Real issue | `fayed-mobile/app/(patient)/sessions/[id]/cancel-preview.tsx` still renders raw values | Add formatter/currency contract |
| AUDIT-008 | Mobile `pendingStill` key missing | Mobile i18n | P2 | Already fixed | Payment return screen now uses real keys and locale entries exist | No action |

### Phase 3

| ID | Claimed issue | Area | Severity | Current status | Current evidence | Recommended next action |
|---|---|---|---|---|---|---|
| AUDIT-009 | Payment return route is public | Web payment return | P0 | Partially real | Route is still under `(public)`, but current payment return flow was hardened and backend remains authority | Re-check auth shell behavior in dedicated payment return phase if reopened |
| AUDIT-010 | Instant booking accept race -> unhandled DB conflict | Backend instant booking | P0 | Real issue | Accept flow still does read/check/create/update pattern without explicit race remap | High-priority backend fix |
| AUDIT-011 | `flowType` missing from admin session list type | Web admin sessions | P0 | Real issue | `AdminSessionListItem` still lacks `flowType` | Add admin session contract field |
| AUDIT-012 | Patient mobile list uses direct i18n interpolation | Mobile patient sessions | P0 | Real issue | `app/(patient)/sessions.tsx` still uses `t(\`patientSessionsFlow.presentationStatus.${session.presentationStatus}\`)` | Add safe mapping/fallback |
| AUDIT-013 | Practitioner mobile list uses direct i18n interpolation | Mobile practitioner sessions | P0 | Real issue | `app/(practitioner)/sessions/index.tsx` still interpolates `presentationStatus` directly | Add safe mapping/fallback |
| AUDIT-014 | Missing `UNDER_REVIEW` badge mapping | Mobile practitioner sessions | P0 | Already fixed | Current `mapSessionPresentationTone` covers `UNDER_REVIEW` | No action |
| AUDIT-015 | Practitioner timezone not shown in patient availability viewer | Web patient booking | P1 | Partially real | Viewer now has timezone note and viewer-local formatting helpers, but still groups/displays via viewer-local logic | Follow-up in availability UX/timezone phase only if needed |
| AUDIT-016 | Booking conflict discovered too late | Web patient booking | P1 | Real issue | UI still relies on backend conflict after submit | Consider pre-check or clearer earlier warning |
| AUDIT-017 | Web `presentationStatus` interpolation lacks unknown fallback | Web patient sessions | P1 | Real issue | `SessionStatusBadge.tsx` and `PatientSessionsPanel.tsx` still interpolate runtime values into i18n keys | Fix with shared formatter |
| AUDIT-018 | Practitioner instant queue lacks price visibility | Web practitioner instant booking | P1 | Real issue | `InstantBookingRequestCard.tsx` still shows no price or payout snapshot | Add pricing snapshot display |
| AUDIT-019 | Availability editor ignores existing bookings | Web practitioner availability | P1 | Real issue | Weekly editor still derives draft from weekly slots/exceptions only | Product-safe contract review before changing |
| AUDIT-020 | `instantBookingRequestId` absent in admin session surfaces | Web admin sessions | P1 | Real issue | Admin session list/drawer still lacks request traceability | Add field to admin session contract |
| AUDIT-021 | No payment data in admin session drawer | Web admin sessions | P1 | Real issue | Current drawer still lacks payment/refund context | Add payment summary |
| AUDIT-022 | `DRAFT` filter reachable but missing in UI tabs | Web admin sessions | P1 | Real issue | `STATUS_FILTERS` supports it while tab UI still normalizes it away | Align URL filter and UI |
| AUDIT-023 | Frozen instant pricing stored but not exposed | Backend instant booking | P1 | Not rechecked in depth | Original audit path not re-opened in this pass | Verify before fixing practitioner pricing view |
| AUDIT-024 | No patient notifications on instant accept/reject | Backend notifications | P1 | Real issue | Accept/reject flow still has no notification dispatch wired in current code audit | Bundle with instant booking operational fixes |
| AUDIT-025 | No admin read-only practitioner availability surface | Web admin | P1 | Not rechecked in depth | No direct admin availability surface was found during earlier scan | Confirm in admin phase before fixing |
| AUDIT-026 | No admin instant booking oversight surface | Web admin | P1 | Real issue | No admin instant booking request management surface exists in current admin tree | Product/admin ops phase |
| AUDIT-027 | Mobile detail `formatModeLabel` falls back to raw mode | Mobile patient sessions | P1 | Real issue | `app/(patient)/sessions/[id].tsx` still returns `mode` raw on unknown values | Add generic fallback |
| AUDIT-028 | Mobile detail `formatFlowTypeLabel` falls back to raw flow type | Mobile patient sessions | P1 | Real issue | Same file still returns raw `flowType` on unknown values | Add generic fallback |
| AUDIT-029 | Presence TTL only applied at read time | Backend presence | P1 | Real issue | `presence-liveness.ts` still demotes stale ONLINE in-memory only | Add sweeper if product accepts |
| AUDIT-030 | No background sweeper for instant request expiry | Backend instant booking | P1 | Real issue | `ExpireInstantBookingRequestUseCase` still has no scheduler driver | High-priority backend ops fix |

### Phase 4

| ID | Claimed issue | Area | Severity | Current status | Current evidence | Recommended next action |
|---|---|---|---|---|---|---|
| AUDIT-031 | Academy enrollment controller unprotected | Backend academy auth | P0 | Needs product decision | Public academy enrollment flow is now an intentional public/tokenized pattern, not a simple missing guard bug | Re-audit against current academy contract before any auth rewrite |
| AUDIT-032 | Public practitioner DTOs expose internal UUIDs | Backend public practitioners | P0 | Partially real | Public route is now slug-based, but DTO payloads still expose internal `id` fields | Remove `id` from public payloads if no client depends on it |
| AUDIT-033 | Refresh token cookie lacks httpOnly | Web auth | P0 | False positive | Current `SECURE_COOKIE_OPTIONS` set `httpOnly: true` for refresh token; only access token remains JS-readable | Close this finding; keep separate access-token risk discussion if needed |
| AUDIT-034 | Practitioner support bypasses OTP-verified requirement | Backend support auth | P1 | Real issue | `PractitionerSupportController` only requires `ACTIVE_ACCOUNT` | Add OTP/account-state requirement if policy still stands |
| AUDIT-035 | Practitioner finance bypasses OTP-verified requirement | Backend practitioner finance | P1 | Real issue | `PractitionerFinancialOperationsController` requires active + approved, but not OTP-verified | Add OTP requirement if policy still stands |
| AUDIT-036 | Login failures not security-audit logged | Backend auth | P1 | Real issue | Current login use cases still show no `SecurityAuditService.logAsync()` usage | Add auth failure audit trail |
| AUDIT-037 | Practitioner app approve/reject not security-audit logged | Backend admin auth | P1 | Real issue | Current approve/reject use cases still show no audit logging | Add security audit trail |
| AUDIT-038 | Manual practitioner payout not audit logged | Backend finance | P1 | Real issue | Manual payout use case still has no audit logging | Add finance audit trail |
| AUDIT-039 | No account lockout | Backend auth | P1 | Real issue | No lockout/failed-attempt account state was found in current auth layer | Product/security decision then backend implementation |
| AUDIT-040 | No global JWT auth guard | Backend auth architecture | P1 | Real issue | `AppModule` registers throttle/csrf/step-up guards but not global JWT auth | Architecture hardening phase |
| AUDIT-041 | Practitioner login missing `deviceId` | Mobile + backend auth | P1 | Real issue | Mobile `startPractitionerLogin` still calls `practitionerLogin(payload)` without deviceId; DTO also lacks `deviceId` | Fix in auth/device binding phase |
| AUDIT-042 | Android token storage is software-backed | Mobile auth | P1 | Partially real | SecureStore is still used; `app.json` exposes no backup-hardening override in this pass | Needs mobile security review, not urgent product bug |
| AUDIT-043 | Web access token lasts 7 days | Web auth | P1 | False positive | Current auth constants set access token max age to 15 minutes | Close as outdated |
| AUDIT-044 | `__DEV__` URL allowlist may leak into prod | Mobile external URL validation | P1 | Real issue | `external-url.ts` still allows `http:` when `__DEV__` is true | Small hardening follow-up |
| AUDIT-045 | `AdminPermissionGate` not auto-applied | Web admin auth UX | P1 | Partially real | Many admin pages are now gated, but the pattern is still manual and not enforced centrally | Keep as architecture/coverage follow-up |
| AUDIT-046 | Web patient/practitioner layouts ignore account state | Web auth UX | P1 | Real issue | `requireAuthenticatedArea` still checks area/role only | Add account-state gating |
| AUDIT-047 | General chat controller lacks `RolesGuard` | Backend chat auth | P1 | Partially real | Controller still only uses `JwtAccessAuthGuard`, but participant-scoped use cases reduce direct exploitability | Keep as defense-in-depth, lower urgency |
| AUDIT-048 | Duplicate of approval/rejection audit gap | Backend admin auth | P1 | Already covered by AUDIT-037 | Same root issue duplicated in register | Track under AUDIT-037 only |
| AUDIT-049 | OTP verification attempts not security-audit logged | Backend auth | P1 | Real issue | OTP verify use case still shows no security audit logging | Add audit trail |
| AUDIT-050 | Password reset flows not security-audit logged | Backend auth | P1 | Real issue | Reset request/complete use cases still show no security audit logging | Add audit trail |
| AUDIT-051 | No global throttle guard | Backend throttling | P1 | False positive | `AppModule` already registers `ThrottlePolicyGuard` as `APP_GUARD`; remaining concern is default no-op without metadata, which is a different finding | Close as stated; optionally open narrower architecture note |
| AUDIT-052 | Silent logout on refresh expiry | Web + mobile auth UX | P2 | Partially real | Web still hard-redirects silently; mobile now has session-expired copy in API error normalization but logout flow still does not guarantee user-facing explanation | Fix in UX/auth polish phase |

### Phase 5

| ID | Claimed issue | Area | Severity | Current status | Current evidence | Recommended next action |
|---|---|---|---|---|---|---|
| AUDIT-053 | Blocked join contract still exposes room fields | Backend sessions/video | P1 | Real issue | `resolve-session-join-contract.use-case.ts` still returns `roomName`/`roomUrl` in blocked branch | High-priority backend hardening |
| AUDIT-054 | Daily room expiry too generous | Backend video infra | P1 | Not rechecked in depth | Original file not reopened in this pass | Re-open only if session-media phase is chosen |
| AUDIT-055 | Webhook fallback matches by display name | Backend video/security | P1 | Not rechecked in depth | Original file not reopened in this pass | Re-open only if session-media phase is chosen |
| AUDIT-056 | No notifications on instant accept/reject/expire | Backend notifications | P1 | Real issue | Same gap still visible from current instant booking use cases | Fix with instant booking ops phase |
| AUDIT-057 | Push payload reveals metadata | Backend push privacy | P1 | 🟡 Implemented — Verification Pending (Phase 9b Sprint 3) | `threadId`, `relatedEntityType`, `category`, `relatedEntityId`, `scheduledStartAt`, `packagePlanTitle` removed from push payloads. `{{sessionAt}}` removed from push body via push-specific i18n keys. `relatedEntityType`/`relatedEntityId`/`category` removed from Expo `data` object. Business logic untouched. | Runtime/device verification still recommended as follow-up |
| AUDIT-058 | `routePath` bypasses Messages Shell | Cross-platform notifications | P1 | Partially real | Current mobile route resolvers reduce some direct-path risk, but legacy path construction still needs closer review | Re-open with notification routing phase |
| AUDIT-059 | Unread count ignores PUSH channel | Backend notifications | P1 | Real issue | `get-my-unread-notification-count.use-case.ts` still counts in-app only | Backend unread-count fix |
| AUDIT-060 | No admin broadcast permission | Admin notifications | P1 | Needs product decision | This is currently more feature-gap than regression | Decide if broadcast belongs in current product scope |
| AUDIT-061 | Instant expiry use case has no cron driver | Backend notifications/jobs | P1 | Real issue | No scheduler wiring found | Fix with AUDIT-030 together |
| AUDIT-062 | `APP_URL` localhost fallback | Cross-platform config | P1 | 🟡 Implemented — Verification Pending (Phase 9b Sprint 3) | `app.config.ts` removed localhost fallback; `SessionJoinAvailableNotificationSweeperService` uses proper `@Inject(appConfig.KEY)` ConfigService DI. `env.schema.ts` added `superRefine` rejecting localhost/loopback in production. Missing `APP_URL` throws at startup via `env.schema.ts`. | Runtime/production boot verification still recommended |
| AUDIT-063 | Mobile notification body rendered raw | Mobile notifications | P1 | Partially real | Content is still rendered directly, but React Native plain text reduces XSS class risk substantially | Optional Unicode sanitization follow-up |
| AUDIT-064 | Expo push token may be fetched without projectId | Mobile push | P1 | Partially real | Service now prefers EAS projectId and only falls back when absent | Keep only as production-guard improvement |
| AUDIT-065 | Notification routing falls back to current role | Mobile notifications | P1 | Real issue | `AuthProvider.tsx` still falls back to current session role when `targetRole` is missing | Fix in notification routing phase |
| AUDIT-066 | Inbox navigation trusts destinationRoute | Mobile messages | P1 | Not rechecked in depth | Not reopened in this pass | Re-check if mobile notifications/messages phase is chosen |
| AUDIT-067 | Care-chat notification lane mapping gap | Mobile notifications | P1 | Partially real | Current route helpers exist, but fallback/lane handling still appears incomplete | Re-open with notification routing phase |
| AUDIT-068 | Admin care-chat detail lacks gate | Web admin auth | P1 | Real issue | `src/app/[locale]/(admin)/admin/care-chat/[id]/page.tsx` still has no `AdminPermissionGate` | Fix in admin auth UX phase |
| AUDIT-069 | Runtime inspector lacks gate | Web admin auth | P1 | Already fixed | `runtime-inspector/page.tsx` is now wrapped in `AdminPermissionGate` | No action |
| AUDIT-070 | Admin notification body is HTML-equivalent/XSS sink | Web admin notifications | P1 | False positive | Current screen sanitizes display text and no longer matches the original claim | Close as outdated |
| AUDIT-071 | Admin JSON copy redacts URLs but not `userId` | Web admin notifications | P2 | Real issue | Details panel still exposes user IDs in technical JSON copy path | Fix when notification admin UX is reopened |
| AUDIT-072 | Join token appended in URL query | Mobile session join | P2 | Real issue | Patient mobile join path still appends token in room URL query | Review server/client token transport safely |
| AUDIT-073 | No notification content sanitization in RN text | Mobile notifications | P2 | False positive | React Native `<Text>` does not execute markup; remaining concern is only low-level Unicode spoofing | Close as stated; optional sanitization can be tracked separately |
| AUDIT-074 | Missing `targetRole` falls back to current role | Mobile notifications | P1 | Real issue | Same live behavior as AUDIT-065 | Fix with routing hardening |
| AUDIT-075 | Runtime inspector lacks audit logging | Web admin runtime | P1 | Not rechecked in depth | Not reopened in this pass | Re-open if runtime-inspector phase is selected |
| AUDIT-076 | Join lag = 0 minutes | Backend sessions/join | P2 | Needs product decision | Could be deliberate product choice rather than strict bug | Decide with product/clinical ops |
| AUDIT-077 | No explicit server timezone | Backend jobs/time | P2 | Not rechecked in depth | Broader timezone program already moved beyond this audit note | Reconcile with current timezone architecture docs before action |
| AUDIT-078 | Support status interpolation may leak raw enum | Mobile support i18n | P2 | Not rechecked in depth | Not reopened in this pass | Re-open in mobile copy/i18n phase if needed |
| AUDIT-079 | Mark-read mutation lacks debounce | Mobile notifications | P3 | Not rechecked in depth | Not reopened in this pass | Low priority |
| AUDIT-080 | Missing action href falls back to `/` | Mobile notifications | P2 | Not rechecked in depth | Not reopened in this pass | Re-check in routing phase |
| AUDIT-081 | `messages/[id]` lacks UUID validation | Mobile messages | P3 | Not rechecked in depth | Not reopened in this pass | Low priority |
| AUDIT-082 | Push registration storage lacks recorded-at timestamp | Mobile push | P2 | Not rechecked in depth | Not reopened in this pass | Low priority |
| AUDIT-083 | Notification dedupe is in-memory only | Mobile notifications | P2 | Real issue | `AuthProvider.tsx` still dedupes with in-memory ref only | Fix in push/notification reliability phase |
| AUDIT-084 | Cold-start notification handling can double-fire | Mobile notifications | P2 | Real issue | Cold-start path plus listener path still share only in-memory dedupe | Fix with AUDIT-083 |

---

## Cross-Platform Propagation Matrix for Confirmed Backend/Product Issues

| Issue theme | Backend | Patient mobile | Practitioner mobile | Patient web | Practitioner web | Admin | Copy/i18n | Tests/docs |
|---|---|---|---|---|---|---|---|---|
| Session presentation status leakage | Source enums stable | Affected in list/detail fallbacks | Affected in list | Affected in badges/hints | Lower direct impact | Affected in sessions list | Needs safer fallback keys | Add enum-coverage guards |
| Manual payout step-up/audit gaps | Real backend gap | No direct | No direct | Admin web drawer exposed | No direct | Affected | Finance copy/confirm states | Add backend + web validation |
| Instant booking race/expiry/notification gaps | Real backend gap | Affects patient request lifecycle | Affects practitioner queue | Affects payment return and request polling | Affects queue visibility | Missing admin oversight | Needs clearer status copy | Add job/race tests + QA notes |
| Join contract blocked-room exposure | Real backend gap | Session join surfaces affected | Session join surfaces affected | Session join pages affected | Session join pages affected | Runtime/support surfaces affected | No copy change required | Add contract tests |
| Notification role-routing/dedupe issues | Backend payload quality matters | Affected | Affected | Limited | Limited | Notification admin details affected | Needs safer fallback copy | Add mobile routing/replay guards |

---

## Findings Confirmed as Real

- AUDIT-001
- AUDIT-002
- AUDIT-003
- AUDIT-005
- AUDIT-006
- AUDIT-007
- AUDIT-010
- AUDIT-011
- AUDIT-012
- AUDIT-013
- AUDIT-016
- AUDIT-017
- AUDIT-018
- AUDIT-019
- AUDIT-020
- AUDIT-021
- AUDIT-022
- AUDIT-024
- AUDIT-026
- AUDIT-027
- AUDIT-028
- AUDIT-029
- AUDIT-030
- AUDIT-034
- AUDIT-035
- AUDIT-036
- AUDIT-037
- AUDIT-038
- AUDIT-039
- AUDIT-040
- AUDIT-041
- AUDIT-044
- AUDIT-046
- AUDIT-049
- AUDIT-050
- AUDIT-053
- AUDIT-056
- AUDIT-059
- AUDIT-061
- AUDIT-065
- AUDIT-068
- AUDIT-071
- AUDIT-072
- AUDIT-074
- AUDIT-083
- AUDIT-084

---

## Findings Already Fixed

- AUDIT-008
- AUDIT-014
- AUDIT-048
- AUDIT-069

---

## Findings Classified as False Positives / Outdated

- AUDIT-033
- AUDIT-043
- AUDIT-051
- AUDIT-070
- AUDIT-073

---

## Findings Needing Runtime / Device / Provider Verification

- AUDIT-057
- Push pipeline delivery in general remains runtime-unproven on a real device despite code implementation

---

## Findings Needing Product / Business Decision

- AUDIT-031
- AUDIT-060
- AUDIT-076

---

## Recommended Fix Phases in Order

### P0

1. Instant booking backend correctness
   - AUDIT-010, AUDIT-024, AUDIT-030, AUDIT-061
2. Finance/admin protection consistency
   - AUDIT-006, AUDIT-036, AUDIT-037, AUDIT-038, AUDIT-049, AUDIT-050
3. Join-contract exposure
   - AUDIT-053

### P1

1. Session status/i18n hardening across web/mobile
   - AUDIT-001, AUDIT-002, AUDIT-012, AUDIT-013, AUDIT-017, AUDIT-027, AUDIT-028
2. Web/mobile auth and routing hardening
   - AUDIT-034, AUDIT-035, AUDIT-040, AUDIT-041, AUDIT-044, AUDIT-046
3. Notification routing/reliability hardening
   - AUDIT-059, AUDIT-065, AUDIT-071, AUDIT-072, AUDIT-074, AUDIT-083, AUDIT-084

### P2

1. Admin session/availability visibility improvements
   - AUDIT-011, AUDIT-020, AUDIT-021, AUDIT-022, AUDIT-025, AUDIT-026
2. Finance UX guardrails
   - AUDIT-003, AUDIT-004, AUDIT-005, AUDIT-007

### P3

1. Lower-priority notification/message polish and low-risk defensive checks
   - AUDIT-066, AUDIT-078, AUDIT-079, AUDIT-080, AUDIT-081, AUDIT-082

---

## First Safe Fix Phase Prompt Suggestion

**Recommended first fix phase:** Instant Booking backend correctness only.

Suggested prompt:

> Act as a senior backend/fullstack engineer. Fix only the currently verified Instant Booking backend correctness gaps in Fayed. Scope strictly to: race-safe accept handling, automatic expiry sweeping, and patient notification dispatch on accept/reject/expire. Do not touch payments, auth, sessions join policy, or unrelated web/mobile UX. Verify with focused backend tests and a small propagation check for patient/practitioner/admin surfaces.

---

## Commands Run

- `Get-Content -LiteralPath 'C:\Users\IT\.codex\attachments\c3ed55a5-0701-48dc-8e03-d765121064f1\pasted-text.txt'`
- `Get-ChildItem -LiteralPath 'D:\Web\full-projects\fayed\docs\platform\audits' -Recurse`
- `rg -n "AUDIT-" ...` across findings registers
- Multiple targeted `rg` checks and `Get-Content` inspections across current backend/web/mobile files referenced in this report

---

## Verification Notes

- This pass was intentionally read-only.
- No implementation files, schema files, or migrations were changed.
- Phase 6 folder currently behaves as working-note inventory rather than a finalized findings register.
- A subset of lower-priority Phase 5 items remains `Not rechecked in depth`; those should not be fixed blindly before a targeted verification pass.

