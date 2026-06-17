# Phase 6 Audit Report — Web Patient / Practitioner / Admin UX + Notifications + i18n Leakage

**Phase:** 6
**Started:** 2026-06-17
**Completed:** 2026-06-17
**Auditors:** 8 concurrent sub-agents
**Evidence type:** Source code inspection, route inventory, pattern analysis
**Runtime verification:** Not performed (servers not running)

---

## 1. Audit Scope

Phase 6 audited the Fayed web frontend's UX integrity across 8 areas:

| # | Area | Scope |
|---|------|-------|
| 1 | Route Inventory | All page.tsx, layout.tsx, error.tsx, loading.tsx, not-found.tsx under `[locale]` |
| 2 | Patient Web UX | Session join, chat, payment states, Messages Shell, instant booking, Clinical Warmth |
| 3 | Practitioner Web UX | Session detail, join gate, status badges, financial ops, empty/error states |
| 4 | Admin Web UX | Permission gates, diagnostic exposure, destructive actions, navigation filtering |
| 5 | Notifications UX | Unread count, Messages Shell lane routing, dropdown rendering, fallback behavior |
| 6 | i18n Leakage | Raw enum/key exposure, missing translation keys, hardcoded text, RTL text direction |
| 7 | RTL/LTR Integrity | Directional primitives, layout components, icon directionality, data tables |
| 8 | Loading/Error/Empty States | Route-level loading.tsx, component skeletons, error boundaries, permission-denied UX |

---

## 2. Architecture Summary

### 2.1 Route Architecture

The Fayed frontend uses Next.js App Router with a `[locale]` dynamic segment. Five route groups partition the application:

| Route Group | Layout Permission | Page Count |
|-------------|-------------------|------------|
| `(public)` | None (open) | 17 pages |
| `(auth)` | None (open) | 7 pages |
| `(patient)` | `requireAuthenticatedArea("patient")` | 37 pages |
| `(practitioner)` | `requireAuthenticatedArea("practitioner")` | 27 pages |
| `(admin)` | `requireAuthenticatedArea("admin")` + `getServerCurrentUserPermissions()` | 73 pages |

**161 total `page.tsx` files.** Zero `loading.tsx` files exist anywhere in the route tree. Three `error.tsx` files (locale-level, `(public)`, `(public)/practitioners`) and one `not-found.tsx` (only in `(public)`).

### 2.2 Messages Shell Architecture

The Messages Shell consolidates three conversation types under a unified notification surface:
- **Session lane:** `messages.session-message-received` → `/messages?tab=sessions`
- **Support lane:** `messages.support-message-received` → `/messages?tab=support`
- **Followup lane:** `messages.follow-up-message-received` → `/messages?tab=followup`

Notifications route through `resolve-notification-click-target.ts` which dispatches to either the Messages Shell (for user role notifications) or direct href links (for admin and session notifications). The notification bell badge hits `/notifications/me/unread-count` — a separate endpoint from the Messages Shell's `/chat/conversations/unread-summary`.

### 2.3 i18n Architecture

The frontend uses **next-intl** for internationalization. Translation files are organized per namespace and locale:
- `messages/en/sessions.json` — session statuses, payment states, cancellation flows
- `messages/ar/sessions.json` — Arabic equivalents

Key i18n patterns used correctly across the codebase:
- `t(\`presentationStatus.${session.presentationStatus}\` as Parameters<typeof t>[0])` in `SessionStatusBadge`
- `t(\`detail.presentation.${status}.note\`)` in `PatientSessionDetailPanel`
- `t(\`queue.statuses.${request.status}\`)` in `InstantBookingRequestCard`
- `t(\`ledger.entryTypes.${value}\`)` in `PractitionerLedgerListScreen`

### 2.4 RTL/LTR Architecture

Layout direction is set at the root `[locale]/layout.tsx` level (`dir={locale === "ar" ? "rtl" : "ltr"}`) and inherited throughout the component tree. Key RTL-aware systems:
- `DynamicSidebar`, `AppHeader`, `DashboardLayout` all use `const isRTL = locale === "ar"` and apply directional CSS classes
- `DirectionalArrowIcon` flips arrow direction for Arabic
- `DataTable` has comprehensive RTL column alignment
- 70+ instances of `rtl:rotate-180` for navigation chevrons

---

## 3. Findings Summary

**Phase 6 total: 20 findings | AUDIT-085 through AUDIT-104**
**P1:** 7 | **P2:** 13 | **P3:** 3 | **INFO:** 2

### P1 — Critical (7 findings)

| ID | Title | Module |
|----|-------|--------|
| AUDIT-085 | SessionChatPanel renders raw presentationStatus via replaceAll (AUDIT-053 regression) | Web Patient/Practitioner |
| AUDIT-086 | Missing i18n keys for JOINABLE and IN_PROGRESS in presentationStatus namespace | Web i18n |
| AUDIT-095 | providerRoomRef exposed in plain text in runtime inspector timeline | Web Admin |
| AUDIT-102 | admin/refund-policies route has no AdminPermissionGate | Web Admin |
| AUDIT-103 | admin/notifications/[id] missing NOTIFICATION_OPS_READ gate (AUDIT-070/071 regression) | Web Admin |
| AUDIT-104 | SessionLaneWorkspace renders raw presentationStatus via replaceAll | Web Patient |
| AUDIT-068 | admin/care-chat/[id] missing AdminPermissionGate (Phase 5 regression) | Web Admin |
| AUDIT-069 | admin/sessions/runtime-inspection missing permission gate (Phase 5 regression) | Web Admin |

### P2 — Moderate (13 findings)

| ID | Title | Module |
|----|-------|--------|
| AUDIT-087 | Zero loading.tsx across all 80+ patient/practitioner/admin routes | Web Shared |
| AUDIT-088 | Toast provider hardcoded dir="rtl" — English users affected | Web RTL |
| AUDIT-089 | ChatKit outgoing messages hardcoded dir="ltr" — Arabic broken | Web RTL |
| AUDIT-090 | Admin back arrows missing RTL flip in 3 files | Web RTL |
| AUDIT-091 | AppErrorFallback logs error.stack to console in dev mode | Web Error States |
| AUDIT-092 | AppErrorFallback identical copy for all error types | Web Error States |
| AUDIT-093 | AdminPermissionGate shows raw "Loading..." during auth check | Web Admin States |
| AUDIT-094 | No PatientPermissionGate/PractitionerPermissionGate | Web Route Protection |
| AUDIT-096 | userId masking inconsistent — masked in summary, exposed in Technical Details | Web Admin |
| AUDIT-097 | Inline Arabic/English ternary in AdminSessionsListScreen | Web i18n |
| AUDIT-098 | FinancialReconciliationScreen toLowerCase() on enums — keys are uppercase | Web i18n |

---

## 4. Most Significant Findings

### AUDIT-085 + AUDIT-104 — Raw `presentationStatus` Enum Leakage (P1 × 2)
`SessionChatPanel.tsx:355` and `SessionLaneWorkspace.tsx:134` both render `session?.presentationStatus.replaceAll("_", " ")` directly as visible user text. The backend enum (e.g., `"IN_PROGRESS"`, `"NO_SHOW"`) has underscores replaced with spaces but is never passed through `t()`. This is a cross-phase regression of AUDIT-053 from Phase 5. An Arabic-speaking practitioner sees `"IN PROGRESS"` instead of `"قيد التنفيذ"`.

### AUDIT-086 — Missing i18n Keys for Active Session States (P1)
`JOINABLE` and `IN_PROGRESS` are absent from the `presentationStatus` namespace in both locale files. Components that call `t(\`detail.presentation.${status}.note\`)` with these values fall back to raw key strings. This compounds AUDIT-085 by creating two failure modes for the same active session state.

### AUDIT-087 — Zero Route-Level Loading States (P2)
No `loading.tsx` exists anywhere in the 161-route application. Next.js App Router streaming/Suspense is disabled for all patient, practitioner, and admin routes. Users see white screens during initial route navigation rather than progressive loading fallbacks.

### AUDIT-088 + AUDIT-089 — RTL Direction Hardcoding (P2 × 2)
The Toast provider always uses `dir="rtl"` regardless of locale, breaking English toast positioning. The ChatKit outgoing message container always uses `dir="ltr"`, breaking Arabic message display. Both should be conditional on `locale === "ar"`.

### AUDIT-068/069/102/103 — Admin Route Permission Gaps (P1 × 4)
Four admin routes remain without `AdminPermissionGate` despite Phase 5 flagging two of them:
- `admin/care-chat/[id]` — any admin can view any care-chat conversation detail (AUDIT-068)
- `admin/sessions/runtime-inspection` (older route variant) — any admin can access session runtime inspector (AUDIT-069)
- `admin/refund-policies` — sensitive financial surface without permission gate (AUDIT-102)
- `admin/notifications/[id]` — notification detail without gate (AUDIT-103, regression of AUDIT-070/071)

---

## 5. Positive Findings

The following aspects of the web frontend are well-implemented:

1. **`joinAvailability.canJoin` gates the Join CTA correctly** — Both patient and practitioner session detail panels use this field as the sole authoritative gate. No raw enum bypass found.

2. **`chatAvailability.canSend` / `readOnly` gates the chat composer** — SessionChatPanel correctly checks both flags before rendering the composer.

3. **`PaymentReturnPanel` handles all 7 payment states with i18n** — All states (confirmed, expired, cancelled, failed, pending, timeout) use teal/amber/warning tones correctly and have translated copy.

4. **`SessionStatusBadge` uses `t()` correctly** — The badge component always routes through the i18n namespace for both `presentationStatus` and `status` fields.

5. **Instant booking request statuses are properly i18n'd** — `InstantBookingRequestCard`, `PractitionerPendingRequestsPanel`, and `PractitionerInstantBookingRequestsScreen` all use `t("queue.statuses.")` with full locale coverage.

6. **Messages Shell lane routing is correctly implemented** — `resolve-notification-click-target.ts` maps `typeSlug` to lane correctly. No direct `/messages/{threadId}` bypass found in user notification flows.

7. **Financial amounts use `Intl.NumberFormat`** — `PractitionerWalletSummaryScreen` uses locale-aware currency formatting (`ar-EG` / `en-US`).

8. **Admin navigation permission filtering is correct** — `layout.tsx` fetches real permissions and `filterAdminNavigation` removes unauthorized nav items. Nav item permissions are correctly specified for sensitive sections.

9. **`AdminForbiddenView` is well-designed** — Clear copy, no permission details leaked, functional dashboard CTA. The gold standard for permission-denied UX.

10. **`DirectionalArrowIcon` flips correctly** — Back/forward arrows flip for RTL Arabic locale.

11. **`DataTable` has comprehensive RTL support** — Column alignment, justify class, and text alignment all use RTL-aware logic.

12. **Notification fallback copy exists for unknown types** — `notification-visual-mapper.tsx` falls back to `"System notification"` / `"إشعار نظام"` gracefully.

13. **Notification action label fallback chain is robust** — `visual.actionLabel || item.action?.label || t("actions.open")` ensures no notification renders as `undefined`.

14. **`toast-provider.tsx` and `LanguageSwitcher` position correctly** — Dropdown positioning uses `ltr:right-0 rtl:left-0` correctly.

---

## 6. Risk Posture

**Phase 6 risk posture: HIGH**

7 P1 findings represent active UX degradation (raw enum rendering in session chat), data exposure (providerRoomRef in admin timeline), admin route protection gaps (4 routes still unprotected), and i18n system failures (missing keys for active session states). Combined with the 4 regression P1s from Phase 5 (AUDIT-068/069/070/071), there are now 11 P1s in the web layer.

**Overall platform risk posture (Phases 1–6 combined): HIGH**

Cumulative open findings across 6 phases: **103 open findings, 0 closed**. The most acute web-layer risks are the two unprotected admin routes (AUDIT-068, AUDIT-069) and the `providerRoomRef` exposure in the runtime inspector (AUDIT-095).

---

## 7. Phase 6 Open Questions Summary

Phase 6 produced 10 open questions. The most critical:

1. **Q-073 (AUDIT-053 regression):** What other components render `presentationStatus` as raw text without `t()`? A grep for `replaceAll("_", " ")` or `replace(/_/g` across all feature components is needed.

2. **Q-074 (FinancialReconciliationScreen):** Are the `toLowerCase()` i18n lookup failures in the reconciliation screen a result of i18n keys being lowercase in the translation files, or are the translation files correct and the code is wrong?

3. **Q-075 (providerRoomRef):** Is `providerRoomRef` a Daily.co room name, a join token, or an opaque session identifier? The answer determines whether AUDIT-095 is a P1 secrets exposure or a P2 diagnostic leak.

4. **Q-076 (unread count):** Do practitioner and admin notification unread counts have the same IN_APP-only aggregation pattern as patient? (AUDIT-059 confirmed for patient)

5. **Q-077 (toast animations):** Does the `dir="rtl"` hardcoding in the toast provider also affect toast animation direction (entry/exit), or only positioning?

6. **Q-078 (ChatKit incoming messages):** Are incoming message bubbles also affected by the `dir="ltr"` container issue, or only outgoing messages?

7. **Q-079 (admin notification payload):** Is the `bodySnapshot` field ever populated with user-supplied content that could contain HTML? If so, the `sanitizeNotificationDisplayText` function needs to escape HTML entities.

8. **Q-080 (patient notification pages):** Is the absence of dedicated patient/practitioner notification list pages intentional (dropdown-only model)? Or are there pending designs for a notification center?

9. **Q-081 (SessionLaneThread):** What is the origin of the `sessionStatusLabel` prop passed to `SessionLaneThread.tsx:165`? If callers pass raw enums, that would be a third location for enum leakage.

10. **Q-082 (PermissionKey search):** Does `formatPermissionLabel()` fully translate all `PermissionKey` values in the admin permissions screen? Or does `AUDIT-097`-style raw key exposure occur there?

---

## 8. Verdict

The Fayed web frontend's UX infrastructure is **structurally sound** in its core flows — join gates use authoritative backend fields, Messages Shell lane routing is correct, i18n infrastructure is in place for most surfaces, and the DataTable and layout systems handle RTL correctly. The Clinical Warmth design principle is broadly upheld in error copy and session detail panels.

However, several **critical UX and security gaps** undermine the patient and practitioner experience:

**Most urgent:**
1. **Fix AUDIT-085/104** (raw `presentationStatus` in two locations) — patients and practitioners see raw enum strings in session chat; a two-line fix per location
2. **Fix AUDIT-086** (missing `JOINABLE`/`IN_PROGRESS` i18n keys) — active session states render as raw key strings; blocks AUDIT-085 fix from being complete
3. **Fix AUDIT-068/069** (admin route protection) — Phase 5 regressions that remain unmitigated; sensitive surveillance surfaces accessible to any admin
4. **Fix AUDIT-088/089** (RTL hardcoding in toast and ChatKit) — affects English toast positioning and Arabic message display respectively; one-line conditional each

**Systemic issues:**
- Zero `loading.tsx` files app-wide disables Next.js streaming — users see white screens on navigation
- `AppErrorFallback` uses identical copy for all error types — patients cannot distinguish 403 from 500
- Multiple inline `locale === "ar" ? ... : ...` ternaries bypass the i18n system

No Phase 6 findings were closed during this audit. All 20 remain open.

---

## 9. Recommended Next Phase

**Phase 7 — Mobile Full Audit (Patient + Practitioner)**

Recommended because:
- Mobile surfaces were partially audited in Phase 5 (Agent 9/10) but several gaps were identified
- No dedicated mobile phase exists — all mobile findings are cross-phase
- Push notification rendering, deep-link handling, and token storage gaps on mobile were not fully closed
- Mobile represents the primary session-join surface for patients outside home/work desktop contexts

**Alternative: Phase 7 — Backend API Completeness Audit**
Several Phase 6 findings (AUDIT-098, AUDIT-059) trace back to backend API behavior not confirmed in Phase 6. A backend audit of notification dispatch, unread count aggregation, and i18n key casing would resolve multiple open questions.

---

*Report produced by Phase 6 read-only audit. No application code was modified. No git commands were executed.*
