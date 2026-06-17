# Phase 6 Findings Register — Web UX / Notifications / i18n / RTL

**Phase:** 6
**Started:** 2026-06-17
**Completed:** 2026-06-17
**Auditors:** 8 concurrent sub-agents
**Findings:** AUDIT-085 through AUDIT-104 (20 findings)
**Severity normalization:** Per Phase 6 brief — React string children are escaped (NOT XSS without `dangerouslySetInnerHTML`); raw enum in secondary badge = P2; missing AdminPermissionGate = P1 if backend authorization is presumed to block unauthorized access; do not duplicate prior findings unless Phase 6 confirms new surface or broader pattern

---

## Finding Template Reference

Each finding is tagged:
- **Cross-phase:** References prior AUDIT-Numbers from Phases 1–5
- **Module:** Web Patient | Web Practitioner | Web Admin | Web Shared | i18n/RTL
- **Severity:** P1 (Critical) | P2 (Moderate) | P3 (Minor) | INFO (Informational)
- **Status:** OPEN | REGRESSION | NEW | OBSERVATION | PASS

---

## P1 — Critical (5 findings)

---

### AUDIT-085
**Title:** `SessionChatPanel.tsx` renders raw `presentationStatus` via `replaceAll("_", " ")` — AUDIT-053 regression

**Severity:** P1
**Module:** Web Patient / Web Practitioner (shared component)
**Status:** REGRESSION (cross-phase AUDIT-053)

**File:** `fayed-frontend-v1/src/features/chat/components/SessionChatPanel.tsx:355`

**Evidence:**
```tsx
<span className="rounded-full bg-teal-50/70 border border-teal-100/30 px-2.5 py-0.5 text-[10px] font-bold text-teal-700 ...">
  {session?.presentationStatus.replaceAll("_", " ")}
</span>
```

**Description:** The raw backend enum value (e.g., `"IN_PROGRESS"`, `"JOINABLE"`, `"NO_SHOW"`) has its underscores replaced with spaces and is rendered directly as visible badge text. This bypasses the i18n layer entirely. A practitioner with Arabic locale still sees `"IN PROGRESS"` instead of `"قيد التنفيذ"`. A patient sees `"UNDER REVIEW"` which carries a clinical/stigmatizing connotation when not properly localized.

**Impact:** Patient and practitioner both see raw SCREAMING_SNAKE_CASE in the session chat header. The session's actual clinical state is displayed without translation.

**Recommendation:** Replace with `t(\`sessions.presentationStatus.${session.presentationStatus}\` as Parameters<typeof t>[0])`. Add missing `JOINABLE` and `IN_PROGRESS` entries to the `presentationStatus` namespace in both locale files (see AUDIT-086).

---

### AUDIT-086
**Title:** Missing i18n keys for `JOINABLE` and `IN_PROGRESS` in `presentationStatus` namespace

**Severity:** P1
**Module:** Web i18n
**Status:** NEW

**Files:**
- `fayed-frontend-v1/messages/en/sessions.json:66-76`
- `fayed-frontend-v1/messages/ar/sessions.json:66-76`

**Evidence — EN `presentationStatus` namespace:**
```json
"presentationStatus": {
  "UPCOMING": "Upcoming",
  "COMPLETED": "Completed",
  "CANCELLED": "Cancelled",
  "ENDED": "Ended",
  "UNAVAILABLE": "Unavailable",
  "NO_SHOW": "No-show",
  "UNDER_REVIEW": "Under review"
  /* JOINABLE      — MISSING */
  /* IN_PROGRESS   — MISSING */
}
```

**Description:** The two active/live session statuses (`JOINABLE`, `IN_PROGRESS`) have no entries in the `presentationStatus` i18n namespace. Components that call `t(\`detail.presentation.${session.presentationStatus}.note\`)` will fall back to the raw key string or return `undefined` for sessions in these states. This is confirmed in `PatientSessionDetailPanel.tsx:267-275` which calls these keys.

**Impact:** If a session is `JOINABLE` or `IN_PROGRESS`, the session detail page renders raw i18n key strings (e.g., `"[detail.presentation.JOINABLE.note]"`) rather than human-readable labels. This compounds AUDIT-085 (raw enum rendering) by making the missing i18n keys directly visible.

**Recommendation:** Add to both `sessions.json` locale files:
```json
"JOINABLE":    { "title": "Ready to Join",    "note": "You can enter this session now." },
"IN_PROGRESS": { "title": "In Progress",     "note": "This session is currently live." }
```
And Arabic equivalents.

---

### AUDIT-095
**Title:** `providerRoomRef` exposed in plain text in runtime inspector attendance timeline

**Severity:** P1
**Module:** Web Admin
**Status:** NEW

**Files:**
- `fayed-frontend-v1/src/features/admin/session-runtime/components/AdminSessionAttendanceSection.tsx:119-124`
- `fayed-frontend-v1/src/features/admin/session-runtime/components/AdminSessionInspectorTimeline.tsx:106-114`

**Evidence (AdminSessionAttendanceSection.tsx):**
```tsx
<p className="break-all">
  <span className="font-semibold text-text-primary ...">
    {t("attendance.timeline.fields.providerRoomRef")}
  </span>
  {item.providerRoomRef ?? "-"}
</p>
```

**Evidence (AdminSessionInspectorTimeline.tsx):**
```tsx
<span className="font-mono text-[11px] text-text-secondary break-all">
  {event.providerRoomRef}
</span>
```

**Description:** The `providerRoomRef` field is rendered in full in the expandable "providerDetails" section of each timeline event. This is a provider-specific room identifier that, depending on the provider implementation, could function as a join token, room URL component, or session credential. `AdminSessionInspectorRawEvidence.tsx:21` confirms this field is considered sensitive by including it in the sanitized payload for JSON export.

**Impact:** Admins viewing session attendance timeline events can see raw provider room references. If these are session join tokens or contain embedded secrets, this could enable unauthorized session access.

**Recommendation:**
1. Mask the value (show only last 4 characters) in the timeline UI
2. Require an elevated permission (e.g., `SESSIONS_MANUAL_DECISIONS_WRITE`) to reveal the full value
3. Confirm with backend whether `providerRoomRef` is a secrets-bearing token or merely an opaque room identifier

---

### AUDIT-102
**Title:** `admin/refund-policies` route has no `AdminPermissionGate`

**Severity:** P1
**Module:** Web Admin
**Status:** NEW

**File:** `fayed-frontend-v1/src/app/[locale]/(admin)/admin/refund-policies/page.tsx:19-24`

**Evidence:**
```tsx
export default async function AdminRefundPoliciesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminRefundPoliciesScreen />;
}
```

**Description:** The `/admin/refund-policies` list page renders `AdminRefundPoliciesScreen` directly without any `AdminPermissionGate`. Refund policy management is a sensitive financial surface. The `REFUNDS_APPROVE` and `REFUNDS_RETRY` permissions exist and are used on `/admin/payments`, but the refund-policies pages lack explicit gatekeeping.

**Impact:** Any authenticated admin user can view and manage refund policies without an explicit permission check. Users with limited admin roles could access or modify refund policy configurations.

**Recommendation:** Add `AdminPermissionGate` with appropriate `requiredPermissions` (e.g., `REFUNDS_APPROVE` or a new `REFUND_POLICIES_READ` permission).

---

### AUDIT-103
**Title:** `admin/notifications/[id]` missing `NOTIFICATION_OPS_READ` gate — AUDIT-070/071 regression

**Severity:** P1
**Module:** Web Admin
**Status:** REGRESSION (cross-phase AUDIT-070, AUDIT-071)

**File:** `fayed-frontend-v1/src/app/[locale]/(admin)/admin/notifications/[id]/page.tsx:19-24`

**Evidence:**
```tsx
export default async function AdminNotificationDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <AdminNotificationDetailScreen notificationId={id} />;
}
```

**Compare with list route (`notifications/page.tsx:26`):**
```tsx
<AdminPermissionGate requiredPermissions={[PermissionKey.NOTIFICATION_OPS_READ]}>
```

**Description:** The list route `/admin/notifications` correctly gates access with `NOTIFICATION_OPS_READ`. The detail route `/admin/notifications/[id]` passes through directly with no permission check. Any admin who can guess or navigate to a notification ID can view its full detail panel, including raw notification payloads, recipient IDs, and delivery attempt history.

**Impact:** Unauthorized admin access to notification detail pages. Combined with AUDIT-096 (userId masking inconsistent) and AUDIT-097 (XSS risk from `bodySnapshot`), this creates a compounded authorization gap.

**Recommendation:** Wrap `AdminNotificationDetailScreen` with `AdminPermissionGate` using `NOTIFICATION_OPS_READ`.

---

### AUDIT-104
**Title:** `SessionLaneWorkspace.tsx` renders raw `presentationStatus` via `replaceAll("_", " ")` — second location

**Severity:** P1
**Module:** Web Patient
**Status:** REGRESSION (cross-phase AUDIT-053)

**File:** `fayed-frontend-v1/src/components/shared/chat/messages-workspace/SessionLaneWorkspace.tsx:134`

**Evidence:**
```tsx
statusLabel: item.presentationStatus.replaceAll("_", " "),
```

**Description:** Same pattern as AUDIT-085 but in a second location. The `statusLabel` is passed to a list item component and rendered as a visible label in the practitioner's session sidebar within the Messages Shell workspace.

**Impact:** Practitioner sees raw SCREAMING_SNAKE_CASE session status labels (e.g., "IN PROGRESS") in the session lane sidebar, bypassing i18n.

**Recommendation:** Replace with a proper i18n lookup: `t(\`sessions.presentationStatus.${item.presentationStatus}\` as Parameters<typeof t>[0])`.

---

## P2 — Moderate (13 findings)

---

### AUDIT-087
**Title:** ZERO `loading.tsx` files across all 80+ patient/practitioner/admin routes

**Severity:** P2
**Module:** Web Shared (Loading States)
**Status:** NEW

**Description:** A glob search confirmed zero `loading.tsx` files exist anywhere in the application under `(patient)`, `(practitioner)`, or `(admin)` route groups. Only two `error.tsx` files exist (locale-level and `(public)/practitioners`). The application relies entirely on component-level `isLoading` checks. Next.js App Router streaming/Suspense is effectively disabled for all 161 route segments. No route-level fallback UI is shown during initial navigation — users see a white screen or browser default loading indicator.

**Additional specifics:**
- `PatientSessionDetailPanel.tsx:198` — 3-item `ListStateSkeleton` has no placeholder for Join CTA panel, payment card, or chat card; layout jumps on load
- `PractitionerLedgerListScreen.tsx:100` — No loading skeleton for surrounding page layout (stats grid + filters above table)

**Impact:** UX degradation on route transitions. No streaming progressive loading — users wait for full data before seeing any content.

**Recommendation:** Add `loading.tsx` at route segment levels, particularly for data-heavy routes (sessions, ledger, payments).

---

### AUDIT-088
**Title:** Toast provider hardcoded `dir="rtl"` — English users affected

**Severity:** P2
**Module:** Web RTL
**Status:** NEW

**File:** `fayed-frontend-v1/src/providers/toast-provider.tsx:9,15`

**Evidence:**
```tsx
// Line 9
<Toaster dir="rtl" ... />
// Line 15
classNames: { toast: "rtl" }
```

**Description:** The `Toaster` component is rendered with `dir="rtl"` hardcoded regardless of locale. Toast options also hardcode `"rtl"` in `classNames`. This means toast positioning and animations will be incorrect for English locale users.

**Impact:** English users see reversed toast positioning and entry/exit animations.

**Recommendation:** Make `dir` conditional: `dir={locale === "ar" ? "rtl" : "ltr"}`.

---

### AUDIT-089
**Title:** ChatKit outgoing messages hardcoded `dir="ltr"` — Arabic message flow broken

**Severity:** P2
**Module:** Web RTL
**Status:** NEW

**File:** `fayed-frontend-v1/src/components/shared/chat/ChatKit.tsx:262`

**Evidence:**
```tsx
<div dir="ltr" className="flex flex-col gap-2 ...">
  {message.content}
</div>
```

**Description:** Outgoing message containers use `dir="ltr"` hardcoded. While message text alignment uses `rtl:text-right` correctly (ChatKit.tsx:237), the container direction affects text flow for mixed-direction content. Arabic text in outgoing message bubbles may not display correctly within the LTR container.

**Impact:** Arabic-speaking users see incorrect text directionality in their own outgoing messages.

**Recommendation:** Make direction conditional: `dir={locale === "ar" ? "rtl" : "ltr"}` or use a CSS class `rtl:dir-rtl` pattern.

---

### AUDIT-090
**Title:** Admin back navigation arrows missing RTL flip in 3 files

**Severity:** P2
**Module:** Web RTL
**Status:** NEW

**Files:**
- `fayed-frontend-v1/src/features/admin/users/components/AdminUserPermissionsScreen.tsx:338`
- `fayed-frontend-v1/src/features/admin/users/components/AdminUserDetailScreen.tsx:400,419`
- `fayed-frontend-v1/src/features/support/components/AdminSupportTicketScreen.tsx:338`

**Evidence:**
```tsx
<ArrowLeft className="h-4 w-4" />
```

**Description:** Back navigation arrows use `<ArrowLeft>` without `rtl:rotate-180`. In RTL mode, "back" should point right (forward direction), but these always point left.

**Impact:** Arabic admin users see back arrows pointing the wrong direction, disorienting navigation.

**Recommendation:** Add `className="rtl:rotate-180"` to all back-arrow instances in these files, consistent with the pattern used in 70+ other locations in the codebase.

---

### AUDIT-091
**Title:** `AppErrorFallback` logs `error.stack` to console in development mode

**Severity:** P2
**Module:** Web Error States
**Status:** NEW

**File:** `fayed-frontend-v1/src/components/shared/AppErrorFallback.tsx:14-21`

**Evidence:**
```tsx
if (process.env.NODE_ENV === "development") {
  console.error("[app] route error boundary:", {
    name: error.name,
    message: error.message,
    stack: error.stack, // FULL STACK TRACE
  });
}
```

**Description:** Full stack traces are written to the browser console for any error caught by the route error boundary, including auth failures, validation errors, and network errors.

**Impact:** On staging environments where `NODE_ENV !== "production"`, patient-facing errors expose implementation details (file paths, function names, library internals) via browser DevTools. While behind a development guard, misconfigured deployments could activate this in production-adjacent environments.

**Recommendation:** Remove `stack: error.stack` from the development logging, or log only a correlation ID for traceability.

---

### AUDIT-092
**Title:** `AppErrorFallback` shows identical copy for all error types (403/404/500)

**Severity:** P2
**Module:** Web Error States
**Status:** NEW

**File:** `fayed-frontend-v1/src/components/shared/AppErrorFallback.tsx:57-73`

**Evidence:**
```tsx
// All error types render:
title: t("errors.fallback.title"),       // "Something went wrong" for ALL types
description: t("errors.fallback.description"), // identical for all types
```

**Description:** A 403 Forbidden, 404 Not Found, and 500 Server Error all render the same generic title and description. The `ERROR_TYPE_STYLES` at lines 31–39 color-code the error type badge, but the main heading and description are identical across all types.

**Impact:** Users cannot distinguish permission denials from server crashes or missing pages. Patients navigating to a forbidden route see the same "Something went wrong" as a network failure, reducing trust in the error communication.

**Recommendation:** Add type-specific copy for common error codes. 403 should say "You don't have access to this page." 404 should say "This page could not be found." 500 should say "Something went wrong on our end."

---

### AUDIT-093
**Title:** `AdminPermissionGate` shows raw `"Loading..."` text instead of skeleton

**Severity:** P2
**Module:** Web Admin States
**Status:** NEW

**File:** `fayed-frontend-v1/src/components/admin/AdminPermissionGate.tsx:59-65`

**Evidence:**
```tsx
if (isLoading) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 text-sm text-text-muted">
      Loading...
    </div>
  );
}
```

**Description:** During the permission check, the gate shows plain untranslated text "Loading..." with no skeleton, spinner, or accessible label.

**Impact:** Polish gap — visible text-only loading state for an authorization check, which should be more explicit and branded.

**Recommendation:** Replace with a skeleton or branded spinner component with translated "Checking permissions..." label.

---

### AUDIT-094
**Title:** No `PatientPermissionGate` or `PractitionerPermissionGate` — forbidden routes show generic error

**Severity:** P2
**Module:** Web Route Protection
**Status:** NEW

**Description:** No `PatientPermissionGate` or `PractitionerPermissionGate` components exist in the codebase. If a patient navigates to a route they don't have access to, the error propagates to `AppErrorFallback`, which shows the generic "Something went wrong" page — visually indistinguishable from a 500 server error.

**Impact:** Patients and practitioners cannot distinguish permission denials (403) from application errors (500). This creates confusion and reduces trust in error messaging for non-admin roles.

**Recommendation:** Consider adding role-specific permission gate components that render `AdminForbiddenView`-equivalent copy for forbidden access scenarios. Alternatively, ensure the Next.js `error.tsx` boundaries distinguish error types via `error.digest` or error type checks.

---

### AUDIT-096
**Title:** `AdminNotificationDetailsPanel` userId masking inconsistent — masked in summary, exposed in Technical Details

**Severity:** P2
**Module:** Web Admin
**Status:** PARTIAL REGRESSION (cross-phase AUDIT-071)

**File:** `fayed-frontend-v1/src/features/admin/notifications/components/AdminNotificationDetailsPanel.tsx:259-262,484-486`

**Evidence (summary card — masked):**
```tsx
{item.context?.recipientName
  ? `${item.context.recipientName} (${item.context.recipientRole || "USER"})`
  : maskUserId(item.userId, locale)}
```

**Evidence (technical panel — NOT masked):**
```tsx
<DetailField
  label={t("notifications.technical.recipientId")}
  value={<span className="font-mono text-xs" dir="ltr">{item.userId}</span>}
/>
```

**Description:** The `maskUserId()` function exists at line 27–30 and is correctly applied in the summary card area. However, the Technical Details panel (an expandable accordion) shows the full `item.userId` without masking. The raw item JSON is also dumped in the technical panel with only URL redaction — `userId` fields in nested objects are not masked.

**Impact:** Any admin who expands the Technical Details panel sees full recipient userIds. This is a PII exposure within the admin surface. While the panel is behind a collapsed accordion, it is accessible to any admin viewing a notification detail.

**Recommendation:** Apply `maskUserId()` consistently in the Technical Details panel and all JSON dumps.

---

### AUDIT-097
**Title:** Inline Arabic/English ternary in `AdminSessionsListScreen` — hardcoded i18n bypass

**Severity:** P2
**Module:** Web i18n
**Status:** NEW

**File:** `fayed-frontend-v1/src/features/admin/sessions/components/AdminSessionsListScreen.tsx:115-121`

**Evidence:**
```tsx
const SESSION_STATUS_LABEL: Record<string, string> = {
  NO_SHOW: locale === "ar" ? "فاتت" : "Missed",
  READY_TO_JOIN: locale === "ar" ? "جاهزة للانضمام" : "Ready to Join",
  REFUND_PENDING: locale === "ar" ? "استرداد قيد المعالجة" : "Refund Pending",
};
```

**Description:** Three session status labels use inline Arabic/English ternary expressions instead of the `t()` function with centralized i18n keys. This bypasses the translation infrastructure and creates a maintenance burden — if the Arabic copy changes, it must be updated inline in the component.

**Impact:** Arabic translation is embedded in JavaScript rather than managed in `messages/ar/sessions.json`. Inconsistent with the rest of the codebase which uses `t()` for all user-facing text.

**Recommendation:** Replace with `t("sessionStatuses.NO_SHOW")` style keys in the sessions.json namespace and update all translation files accordingly.

---

### AUDIT-098
**Title:** `FinancialReconciliationScreen` `toLowerCase()` on enums for i18n lookup — keys in files are uppercase

**Severity:** P2
**Module:** Web i18n
**Status:** NEW

**File:** `fayed-frontend-v1/src/features/admin/accounting-reconciliation/components/FinancialReconciliationScreen.tsx`

**Evidence (20+ instances, e.g., line 539):**
```tsx
{t(`runs.status.${row.status.toLowerCase()}`)}
```

**Description:** Extensive use of `toLowerCase()` on backend enum values (`run.status`, `run.scope`, `run.trigger`, `issue.severity`, `issue.status`) to construct i18n keys. However, i18n files use uppercase or camelCase keys (e.g., `"APPROVED"`, `"PENDING_REVIEW"`). All these lookups silently fail, falling back to raw key strings or returning `undefined`.

**Impact:** ~20+ financial status labels in the reconciliation screen fail to resolve translations, resulting in missing or raw key labels in Arabic and English. This is a silent data quality issue affecting admin-facing financial operations.

**Recommendation:** Remove `toLowerCase()` calls and ensure i18n keys in `sessions.json`/`finance.json` match the backend enum casing exactly.

---

### AUDIT-068 (Phase 5 — Reconfirmed)
**Title:** `admin/care-chat/[id]` missing `AdminPermissionGate` — AUDIT-068 regression

**Severity:** P1 (from Phase 5)
**Reconfirmed in Phase 6:** YES — route still unprotected; same issue

**File:** `fayed-frontend-v1/src/app/[locale]/(admin)/admin/care-chat/[id]/page.tsx:18-22`

**Note:** This was AUDIT-068 in Phase 5. Phase 6 confirms the gap persists unchanged.

---

### AUDIT-069 (Phase 5 — Reconfirmed)
**Title:** `admin/sessions/runtime-inspection` (older route) missing permission gate — AUDIT-069 regression

**Severity:** P1 (from Phase 5)
**Reconfirmed in Phase 6:** YES — route still unprotected; same issue

**File:** `fayed-frontend-v1/src/app/[locale]/(admin)/admin/sessions/runtime-inspection/page.tsx:19-32`

**Note:** This was AUDIT-069 in Phase 5. Phase 6 confirms the gap persists unchanged. The sibling `/runtime-inspector` route IS gated with `SESSIONS_READ_ADMIN`.

---

## P3 — Minor (5 findings)

---

### AUDIT-099
**Title:** Root `not-found.tsx` English-only hardcoded copy

**Severity:** P3
**Module:** Web i18n
**Status:** NEW

**File:** `fayed-frontend-v1/src/app/not-found.tsx:6-34`

**Evidence:**
```tsx
"The page you requested is not available right now."  // hardcoded EN
"Return home"  // hardcoded EN
```

**Description:** The 404 page shows hardcoded English text. This page is used by the root app layout for any locale, including Arabic. The page should use `useTranslations()` for i18n copy.

**Impact:** Arabic users see an English 404 page.

**Recommendation:** Use `t("notFound.title")` and `t("notFound.action")` from the messages namespace.

---

### AUDIT-100
**Title:** Payment `EXPIRED` state lacks retry-payment CTA

**Severity:** P3
**Module:** Web Patient UX
**Status:** NEW

**File:** `fayed-frontend-v1/src/features/sessions/components/PatientSessionDetailPanel.tsx:639-738`

**Evidence:** `paymentStateKey === "EXPIRED"` (line 646) shows amber/warning styling but only renders "View Payment History" and "View Wallet" links. No "Retry Payment" button is shown for expired payments.

**Impact:** A patient whose payment expired has no direct path to retry payment from the session detail page — they must navigate through the payments history to re-initiate.

**Recommendation:** Add a "Retry Payment" CTA for `paymentStateKey === "EXPIRED"` that routes to the session payment flow.

---

### AUDIT-101
**Title:** `PractitionerPendingRequestsPanel` bare pulsing `div` without accessible label

**Severity:** P3
**Module:** Web Accessibility
**Status:** NEW

**File:** `fayed-frontend-v1/src/features/instant-booking/components/PractitionerPendingRequestsPanel.tsx:114-118`

**Evidence:**
```tsx
<div className="h-24 animate-pulse rounded-[28px] border border-border-light bg-surface-secondary ..." />
```

**Description:** The loading state renders a bare pulsing `div` with no label, icon, or accessible text. No `role="status"` or `aria-label` is present.

**Impact:** Screen reader users cannot determine what is loading when this skeleton appears.

**Recommendation:** Wrap in a `role="status"` container with an `aria-label="Loading requests..."` or use a skeleton component with a visible label.

---

### AUDIT-065 (Phase 5 — Reconfirmed)
**Title:** `admin/chat-conversations/[conversationId]` chat detail screen `dir="ltr"` hardcoded

**Severity:** P3 (informational)
**Reconfirmed in Phase 6:** OBSERVED — container direction affects Arabic message display

**File:** `fayed-frontend-v1/src/features/admin/chat-conversations/components/AdminChatConversationDetailScreen.tsx:798`

**Note:** The chat conversation detail screen container is set to `dir="ltr"` which affects the entire conversation layout for Arabic users viewing chat conversations.

---

## INFO — Observations (2 findings)

---

### INFO-6A
**Title:** `typeSlug` raw values displayed in admin settings/profile screens

**Severity:** INFO
**Module:** Web Admin
**Status:** OBSERVATION

**Files:**
- `fayed-frontend-v1/src/features/settings/components/AdminSettingsProfileScreen.tsx:567,684`
- `fayed-frontend-v1/src/features/settings/components/AdminProfileWorkspace.tsx:585,708`

**Description:** In admin notification channel preference cards, `typeSlug` values (e.g., `"sessions.session-reminder"`) are rendered directly as user-facing text in `<p className="text-sm font-semibold">` tags. This exposes internal slug nomenclature to admin users but is not a security issue.

**Impact:** Admins configuring notification preferences see raw typeSlug strings instead of human-readable labels.

---

### INFO-6B
**Title:** `AdminPermissionGate` on `admin/sessions/runtime-inspector` (newer route) correctly implemented

**Severity:** INFO
**Module:** Web Admin
**Status:** PASS

**File:** `fayed-frontend-v1/src/app/[locale]/(admin)/admin/sessions/runtime-inspector/page.tsx:34`

**Description:** The newer `/admin/sessions/runtime-inspector` route correctly uses `AdminPermissionGate[PermissionKey.SESSIONS_READ_ADMIN]`. Only the older `/admin/sessions/runtime-inspection` variant lacks the gate.

**Impact:** No issue — this is a positive finding confirming the newer route is properly protected.

---

## Summary Table

| ID | Title | Severity | Module | Status | Cross-phase |
|----|-------|----------|--------|--------|-------------|
| AUDIT-085 | SessionChatPanel raw presentationStatus (AUDIT-053 regression) | P1 | Web Patient/Practitioner | REGRESSION | AUDIT-053 |
| AUDIT-086 | Missing i18n keys JOINABLE/IN_PROGRESS | P1 | Web i18n | NEW | — |
| AUDIT-095 | providerRoomRef exposed in runtime inspector | P1 | Web Admin | NEW | — |
| AUDIT-102 | admin/refund-policies no AdminPermissionGate | P1 | Web Admin | NEW | — |
| AUDIT-103 | admin/notifications/[id] missing gate (AUDIT-070/071 regression) | P1 | Web Admin | REGRESSION | AUDIT-070,071 |
| AUDIT-104 | SessionLaneWorkspace raw presentationStatus | P1 | Web Patient | REGRESSION | AUDIT-053 |
| AUDIT-087 | Zero loading.tsx across 80+ routes | P2 | Web Shared | NEW | — |
| AUDIT-088 | Toast provider hardcoded dir="rtl" | P2 | Web RTL | NEW | — |
| AUDIT-089 | ChatKit messages hardcoded dir="ltr" | P2 | Web RTL | NEW | — |
| AUDIT-090 | Admin back arrows missing RTL flip (3 files) | P2 | Web RTL | NEW | — |
| AUDIT-091 | AppErrorFallback logs error.stack in dev | P2 | Web Error States | NEW | — |
| AUDIT-092 | AppErrorFallback identical copy for all error types | P2 | Web Error States | NEW | — |
| AUDIT-093 | AdminPermissionGate raw "Loading..." | P2 | Web Admin States | NEW | — |
| AUDIT-094 | No PatientPermissionGate/PractitionerPermissionGate | P2 | Web Route Protection | NEW | — |
| AUDIT-096 | userId masking inconsistent — summary vs Technical Details | P2 | Web Admin | PARTIAL REGRESSION | AUDIT-071 |
| AUDIT-097 | Inline Arabic/English ternary in AdminSessionsListScreen | P2 | Web i18n | NEW | — |
| AUDIT-098 | FinancialReconciliationScreen toLowerCase() on enums | P2 | Web i18n | NEW | — |
| AUDIT-099 | Root not-found.tsx English-only hardcoded copy | P3 | Web i18n | NEW | — |
| AUDIT-100 | Payment EXPIRED state lacks retry CTA | P3 | Web Patient UX | NEW | — |
| AUDIT-101 | PractitionerPendingRequestsPanel bare pulsing div, no a11y label | P3 | Web Accessibility | NEW | — |
| AUDIT-068 | admin/care-chat/[id] missing AdminPermissionGate | P1 | Web Admin | REGRESSION | AUDIT-068 (Phase 5) |
| AUDIT-069 | admin/sessions/runtime-inspection missing gate | P1 | Web Admin | REGRESSION | AUDIT-069 (Phase 5) |

**Phase 6 totals:** 20 findings | **P1:** 7 | **P2:** 13 | **P3:** 3 | **INFO:** 2

---

*Cumulative open findings (Phases 1–6): 103*
