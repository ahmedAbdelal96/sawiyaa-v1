# Phase 6 Evidence Index — Web Patient / Practitioner / Admin UX + Notifications + i18n

**Phase:** 6
**Created:** 2026-06-17
**Auditors:** 8 concurrent sub-agents
**Evidence type:** Source code inspection, route inventory, pattern analysis, glob searches

---

## 1. Agent Output Files

All 8 agent output files were written to the Phase 6 audit directory:

| File | Size | Agent | Area |
|-------|------|-------|------|
| `agent-1-route-inventory.txt` | 28,162 bytes | Agent 1 | Route inventory |
| `agent-2-patient-ux.txt` | 13,846 bytes | Agent 2 | Patient UX |
| `agent-3-practitioner-ux.txt` | 20,331 bytes | Agent 3 | Practitioner UX |
| `agent-4-admin-ux.txt` | 17,276 bytes | Agent 4 | Admin UX |
| `agent-5-notifications-ux.txt` | 19,392 bytes | Agent 5 | Notifications UX |
| `agent-6-i18n-leakage.txt` | 18,147 bytes | Agent 6 | i18n leakage |
| `agent-7-rtl-ltr.txt` | 24,375 bytes | Agent 7 | RTL/LTR integrity |
| `agent-8-states.txt` | 20,306 bytes | Agent 8 | Loading/error/empty states |

---

## 2. Inspected Files by Area

### 2.1 Route Inventory (Agent 1)

| File | Purpose | Key Lines |
|------|---------|-----------|
| `[locale]/layout.tsx` | Root locale layout | 37 (`dir` attribute), 13 (auth seeding) |
| `[locale]/error.tsx` | Global error boundary | — |
| `[locale]/(public)/layout.tsx` | Public route group layout | — |
| `[locale]/(public)/not-found.tsx` | Public 404 handler | — |
| `[locale]/(public)/practitioners/error.tsx` | Practitioners error boundary | — |
| `[locale]/(auth)/layout.tsx` | Auth route group layout | — |
| `[locale]/(patient)/layout.tsx` | Patient layout wrapper | `requireAuthenticatedArea("patient")` |
| `[locale]/(practitioner)/layout.tsx` | Practitioner layout | `requireAuthenticatedArea("practitioner")` |
| `[locale]/(admin)/layout.tsx` | Admin layout | `getServerCurrentUserPermissions()` |
| `admin.ts` (navigation config) | Admin nav permission specs | 1-223 |
| `filter.ts` | Nav permission filtering | 1-81 |

**Route count confirmed:** 161 page.tsx, 6 layout.tsx, 3 error.tsx, 1 not-found.tsx, **0 loading.tsx**

---

### 2.2 Patient Web UX (Agent 2)

| File | Purpose | Key Lines |
|------|---------|-----------|
| `SessionChatPanel.tsx:354-356` | Raw presentationStatus badge | AUDIT-085 |
| `PatientSessionDetailPanel.tsx:198` | Loading skeleton gap | AUDIT-087 |
| `PatientSessionDetailPanel.tsx:229-244` | paymentStateKey derivation | PASS |
| `PatientSessionDetailPanel.tsx:251` | joinAvailability.canJoin gate | PASS |
| `PatientSessionDetailPanel.tsx:267-275` | detail.presentation t() calls | AUDIT-086 |
| `PatientSessionDetailPanel.tsx:324-330` | Cancellation refund destination | PASS |
| `PatientSessionDetailPanel.tsx:556-561` | Runtime blocked reason i18n | PASS |
| `PatientSessionDetailPanel.tsx:619-633` | Disabled chat button UX | P3 |
| `PaymentReturnPanel.tsx` | All 7 payment states | PASS |
| `SessionStatusBadge.tsx:41-45` | t() pattern for presentationStatus | PASS |
| `PatientSessionsPanel.tsx:686-689` | presentationHints i18n | PASS |

**i18n files inspected:**
- `messages/en/sessions.json:66-76` — presentationStatus namespace (JOINABLE, IN_PROGRESS missing)
- `messages/ar/sessions.json:66-76` — Arabic equivalents

---

### 2.3 Practitioner Web UX (Agent 3)

| File | Purpose | Key Lines |
|------|---------|-----------|
| `SessionChatPanel.tsx:355` | Raw presentationStatus badge | AUDIT-085 |
| `PractitionerSessionDetailPanel.tsx:141` | joinAvailability.canJoin gate | PASS |
| `PractitionerSessionDetailPanel.tsx:344` | Join CTA with canJoinNow | PASS |
| `InstantBookingRequestCard.tsx:111` | queue.statuses i18n | PASS |
| `PractitionerInstantBookingRequestsScreen.tsx:200-216` | Loading skeleton | P3 |
| `PractitionerPendingRequestsPanel.tsx:114-118` | Bare pulsing div | AUDIT-101 |
| `SessionStatusBadge.tsx:41-45` | t() pattern | PASS |
| `PractitionerLedgerListScreen.tsx:32-44` | LedgerEntryType filters | PASS |
| `PractitionerLedgerListScreen.tsx:310` | t() for entry type labels | PASS |
| `PractitionerWalletSummaryScreen.tsx:36-44` | SettlementStatus filters | PASS |
| `PractitionerWalletSummaryScreen.tsx:46` | Intl.NumberFormat currency | PASS |
| `WeeklyScheduleEditor.tsx:387-395` | Timezone display | PASS |
| `CareChatConversationPanel.tsx:193,304` | conversationStatuses i18n | PASS |
| `PractitionerSupportHomeScreen.tsx:25-56` | Support ticket filters | PASS |
| `SessionLaneThread.tsx:165` | sessionStatusLabel prop origin | UNKNOWN |

---

### 2.4 Admin Web UX (Agent 4)

| File | Purpose | Key Lines |
|------|---------|-----------|
| `admin/care-chat/[id]/page.tsx:18-22` | No AdminPermissionGate | AUDIT-068 |
| `admin/sessions/runtime-inspection/page.tsx:19-32` | No AdminPermissionGate | AUDIT-069 |
| `admin/sessions/runtime-inspector/page.tsx:34` | SESSIONS_READ_ADMIN gate | PASS (positive) |
| `admin/notifications/[id]/page.tsx:19-24` | No AdminPermissionGate | AUDIT-103 |
| `admin/refund-policies/page.tsx:19-24` | No AdminPermissionGate | AUDIT-102 |
| `AdminSessionAttendanceSection.tsx:119-124` | providerRoomRef exposure | AUDIT-095 |
| `AdminSessionInspectorTimeline.tsx:106-114` | providerRoomRef in timeline | AUDIT-095 |
| `AdminNotificationDetailsPanel.tsx:259-262` | maskUserId() in summary | PASS |
| `AdminNotificationDetailsPanel.tsx:484-486` | Full userId in technical panel | AUDIT-096 |
| `AdminNotificationDetailsPanel.tsx:439-522` | Technical details accordion | AUDIT-096 |
| `AdminChatConversationDetailScreen.tsx:849-935` | Destructive action dialogs | PASS |
| `AdminSettlementDetailScreen.tsx:577-685` | Mark-paid/failed actions | PASS |
| `AdminForbiddenView.tsx:17-54` | Permission-denied design | PASS (gold standard) |
| `layout.tsx:23` | Nav permission filtering | PASS |
| `admin-permission-catalog.ts:18-345` | PermissionKey catalog | INFO |

---

### 2.5 Notifications UX (Agent 5)

| File | Purpose | Key Lines |
|------|---------|-----------|
| `user-notifications.api.ts:20-25` | /notifications/me/unread-count | AUDIT-059 |
| `use-user-notifications.ts:24` | Unread count hook | AUDIT-059 |
| `UserNotificationDropdown.tsx:47-48` | Bell badge count | AUDIT-059 |
| `AdminNotificationDetailsPanel.tsx:418-426` | bodySnapshot rendering | AUDIT-059 (XSS note) |
| `AdminNotificationDetailsPanel.tsx:398-406` | titleSnapshot rendering | AUDIT-059 (XSS note) |
| `AdminNotificationDetailsPanel.tsx:32-67` | sanitizeNotificationDisplayText | AUDIT-059 (XSS note) |
| `AdminNotificationDetailsPanel.tsx:120-129` | JSON copy redaction | AUDIT-059 |
| `resolve-notification-click-target.ts:47-76` | Lane routing by typeSlug | PASS |
| `resolve-notification-click-target.ts:138-144` | Fallback routing | PASS |
| `UserNotificationDropdown.tsx:207-227` | messages-shell dispatch | PASS |
| `notification-visual-mapper.tsx:79-100` | Fallback title/subtitle | PASS |
| `notification-visual-mapper.tsx:184-194` | Action label fallback | PASS |
| `AdminSettingsProfileScreen.tsx:567,684` | typeSlug as text | INFO-6A |
| `AdminProfileWorkspace.tsx:585,708` | typeSlug as text | INFO-6A |

---

### 2.6 i18n Leakage (Agent 6)

| File | Purpose | Key Lines |
|------|---------|-----------|
| `messages/en/sessions.json:66-76` | presentationStatus namespace | AUDIT-086 (missing keys) |
| `messages/ar/sessions.json:66-76` | Arabic presentationStatus | AUDIT-086 |
| `SessionChatPanel.tsx:355` | replaceAll("_", " ") on enum | AUDIT-085 |
| `SessionLaneWorkspace.tsx:134` | replaceAll("_", " ") on enum | AUDIT-104 |
| `AdminSessionsListScreen.tsx:115-121` | Inline Arabic ternaries | AUDIT-097 |
| `FinancialReconciliationScreen.tsx` | 20+ toLowerCase() on enums | AUDIT-098 |
| `AdminUserPermissionsScreen.tsx:228-253` | PermissionKey in search | INFO |
| `AdminUserPermissionsScreen.tsx:667` | toLowerCase() on effect | AUDIT-098 |
| `PatientPaymentsHistoryPanel.tsx:381` | toLowerCase() on currencyCode | AUDIT-098 |
| `AdminPractitionerStatementScreen.tsx:143` | toLowerCase() on rowType | AUDIT-098 |
| `PractitionersSection.tsx:209` | src={undefined} | P3 |
| `CareChatConversationPanel.tsx:187` | avatarUrl={null} | P3 |
| `PractitionerPromoCodesScreen.tsx:1436` | coupon={null} | P3 |

---

### 2.7 RTL/LTR (Agent 7)

| File | Purpose | Key Lines |
|------|---------|-----------|
| `toast-provider.tsx:9,15` | dir="rtl" hardcoded | AUDIT-088 |
| `ChatKit.tsx:262` | dir="ltr" on outgoing messages | AUDIT-089 |
| `DynamicSidebar.tsx:233` | isRTL = locale === "ar" | PASS |
| `AppHeader.tsx:23-28` | RTL offset classes | PASS |
| `DashboardLayout.tsx:35-36` | RTL margin handling | PASS |
| `locale/layout.tsx:37-40` | Root dir and font | PASS |
| `PatientAppShell.tsx:230-232` | Drawer side flip | PASS |
| `LanguageSwitcher.tsx:52` | ltr:right-0 rtl:left-0 | PASS |
| `DirectionalArrowIcon.tsx:16-26` | RTL arrow flipping | PASS |
| `DataTable.tsx:139-388` | RTL column alignment | PASS |
| `AdminUserPermissionsScreen.tsx:338` | ArrowLeft without rtl:flip | AUDIT-090 |
| `AdminUserDetailScreen.tsx:400,419` | ArrowLeft without rtl:flip | AUDIT-090 |
| `AdminSupportTicketScreen.tsx:338` | ArrowLeft without rtl:flip | AUDIT-090 |
| `AdminChatConversationDetailScreen.tsx:798` | dir="ltr" on container | P3 |
| `PaymentReturnPanel.tsx:47` | Locale-aware number formatting | PASS |
| `PublicArticleDetailScreen.tsx:44-146` | rtl:text-right on content | PASS |

---

### 2.8 Loading/Error/Empty States (Agent 8)

| File | Purpose | Key Lines |
|------|---------|-----------|
| *(no file)* | **Zero loading.tsx files** | AUDIT-087 |
| `AppErrorFallback.tsx:14-21` | console.error with stack trace | AUDIT-091 |
| `AppErrorFallback.tsx:57-73` | Identical copy for all errors | AUDIT-092 |
| `AppErrorFallback.tsx:31-39` | ERROR_TYPE_STYLES | AUDIT-092 |
| `AdminPermissionGate.tsx:59-65` | "Loading..." during auth | AUDIT-093 |
| `AppErrorFallback.tsx` | Clinical Warmth copy | PASS |
| `AdminForbiddenView.tsx:17-54` | Gold-standard permission denied | PASS |
| `not-found.tsx:6-34` | English-only hardcoded 404 | AUDIT-099 |
| `PatientSessionDetailPanel.tsx:198` | Loading skeleton missing panels | AUDIT-087 |
| `PractitionerLedgerListScreen.tsx:100-160` | No page-level loading skeleton | AUDIT-087 |
| `PatientSupportHomeScreen.tsx:377-380` | Empty state no icon/CTA | P3 |
| `PatientPaymentsHistoryPanel.tsx:616-633` | Empty copy not context-specific | P3 |
| `PatientWalletScreen.tsx:477-494` | Empty action vague | P3 |
| `PractitionerInstantBookingRequestsScreen.tsx:292-307` | No guidance in empty state | P3 |
| `DataTable.tsx:83-93` | Built-in loading/empty/error states | PASS |
| `DataTableEmpty.tsx:32-65` | Well-designed empty state | PASS |

---

## 3. Route Map — Admin Permission Gates

### 3.1 Routes WITH AdminPermissionGate (confirmed)

| Route | Permission | Source |
|-------|-----------|--------|
| `admin/sessions/runtime-inspector` | `SESSIONS_READ_ADMIN` | page.tsx:34 |
| `admin/notifications` | `NOTIFICATION_OPS_READ` | page.tsx:26 |
| `admin/care-chat` (list) | `CARE_CHAT_REQUEST_READ_ADMIN` + others | page.tsx:24 |

### 3.2 Routes WITHOUT AdminPermissionGate (AUDIT findings)

| Route | Risk | Finding |
|-------|------|---------|
| `admin/care-chat/[id]` | High — any admin can view any conversation | AUDIT-068 |
| `admin/sessions/runtime-inspection` | High — session surveillance without auth | AUDIT-069 |
| `admin/notifications/[id]` | Medium — notification detail without gate | AUDIT-103 |
| `admin/refund-policies` | Medium — financial surface without gate | AUDIT-102 |

---

## 4. Duplicate Routes Detected

| Route Variant A | Route Variant B | Risk |
|----------------|-----------------|------|
| `admin/sessions/runtime-inspection/` | `admin/sessions/runtime-inspector/` | Variant A lacks gate; variant B has SESSIONS_READ_ADMIN |
| `admin/finance/reconciliation/` | `admin/finance/accounting/reconciliation/` | Both lack explicit gate |

---

## 5. i18n Key Coverage Gaps

### 5.1 presentationStatus namespace (sessions.json)

| Key | EN | AR | Used By |
|-----|----|----|---------|
| `UPCOMING` | ✓ "Upcoming" | ✓ | SessionStatusBadge, PatientSessionDetailPanel |
| `JOINABLE` | ✗ MISSING | ✗ MISSING | t() call in PatientSessionDetailPanel fails |
| `IN_PROGRESS` | ✗ MISSING | ✗ MISSING | t() call in PatientSessionDetailPanel fails |
| `COMPLETED` | ✓ | ✓ | — |
| `CANCELLED` | ✓ | ✓ | — |
| `ENDED` | ✓ | ✓ | — |
| `UNAVAILABLE` | ✓ | ✓ | — |
| `NO_SHOW` | ✓ "No-show" | ✓ | — |
| `UNDER_REVIEW` | ✓ "Under review" | ✓ | — |

### 5.2 Inline Hardcoded Translations (not in i18n files)

| File | Key | Issue |
|------|-----|-------|
| `AdminSessionsListScreen.tsx:115-121` | NO_SHOW, READY_TO_JOIN, REFUND_PENDING | Inline `locale === "ar" ? ... : ...` ternaries |

### 5.3 toLowerCase() Mismatch

| File | Pattern | i18n key casing |
|------|---------|----------------|
| `FinancialReconciliationScreen.tsx` | `row.status.toLowerCase()` | Translation files use uppercase |
| `AdminUserPermissionsScreen.tsx:667` | `item.effect.toLowerCase()` | Translation files use uppercase |
| `PatientPaymentsHistoryPanel.tsx:381` | `item.currencyCode.toLowerCase()` | Unverified |

---

## 6. RTL Hardcoding Issues

| File | Line | Pattern | Issue |
|------|------|---------|-------|
| `toast-provider.tsx` | 9, 15 | `dir="rtl"`, `classNames: { toast: "rtl" }` | Always RTL regardless of locale |
| `ChatKit.tsx` | 262 | `dir="ltr"` on outgoing container | Arabic messages flow LTR |
| `AdminUserPermissionsScreen.tsx` | 338 | `<ArrowLeft>` without rtl:flip | Points wrong direction in Arabic |
| `AdminUserDetailScreen.tsx` | 400, 419 | `<ArrowLeft>` without rtl:flip | Points wrong direction in Arabic |
| `AdminSupportTicketScreen.tsx` | 338 | `<ArrowLeft>` without rtl:flip | Points wrong direction in Arabic |

---

## 7. Positive Findings by Surface

### Web Patient
- ✅ `joinAvailability.canJoin` gates Join CTA
- ✅ `chatAvailability.canSend` gates composer
- ✅ `PaymentReturnPanel` handles all 7 states with i18n
- ✅ `presentationHints` i18n complete for all statuses
- ✅ Messages Shell lane routing correct

### Web Practitioner
- ✅ `joinAvailability.canJoin` gates Join CTA
- ✅ Instant booking statuses fully i18n'd via `queue.statuses`
- ✅ `Intl.NumberFormat` for all monetary values
- ✅ Support ticket statuses i18n'd
- ✅ Clinical Warmth upheld in session detail and application status

### Web Admin
- ✅ Nav permission filtering using real server-side permissions
- ✅ `AdminForbiddenView` well-designed (no permission details leaked)
- ✅ Destructive actions have confirmation dialogs
- ✅ `providerRoomId`/`providerSessionRef` sanitized in JSON export (not in UI)
- ✅ `AdminSessionRuntimeInspectorScreen` no join tokens in DTOs

### Notifications (Web)
- ✅ Lane routing by `typeSlug` correctly implemented
- ✅ No direct `/messages/{threadId}` bypass in user notification flows
- ✅ Fallback for unknown `typeSlug` — "System notification" / "إشعار نظام"
- ✅ Notification action label has 3-level fallback chain
- ✅ Bell badge unread count from dedicated endpoint

### RTL/LTR
- ✅ Root layout sets `dir` dynamically from locale
- ✅ `DynamicSidebar`, `AppHeader`, `DashboardLayout` all use `isRTL` checks
- ✅ `DirectionalArrowIcon` flips for Arabic
- ✅ `DataTable` comprehensive RTL column alignment
- ✅ 70+ instances of `rtl:rotate-180` across codebase
- ✅ Article detail pages use `rtl:text-right` and `rtl:flex-row-reverse`
- ✅ PaymentReturnPanel uses locale-aware `ar-SA`/`en-US` formatting

### Loading/Error/Empty States
- ✅ `DataTable` has built-in loading/empty/error states
- ✅ `DataTableEmpty` is well-designed with icon, title, description, action
- ✅ Error copy throughout uses calm, non-blaming Clinical Warmth language
- ✅ `AdminForbiddenView` is gold-standard permission-denied UX

---

## 8. Commands and Tools Used

No runtime commands were executed (servers not running). All evidence was gathered through static analysis:

- **File reads:** Source code inspection across all frontend feature directories
- **Glob searches:** Locating `loading.tsx`, `error.tsx`, `not-found.tsx` across route tree
- **Pattern analysis:** Identifying `replaceAll("_", " ")`, `toLowerCase()`, `locale === "ar"` patterns
- **Route inventory:** Full enumeration of all 161 page.tsx files

---

## 9. Limitations

1. **Runtime verification not performed:** No live API probes, no browser testing. All findings are based on static code analysis.

2. **`SessionLaneThread.tsx:165` origin not traced:** The `sessionStatusLabel` prop could originate from a caller that passes a raw enum. Full call chain not verified.

3. **`providerRoomRef` risk level unconfirmed:** Whether this is a secrets-bearing token or merely an opaque room identifier requires backend confirmation.

4. **i18n key casing not fully verified:** The `FinancialReconciliationScreen.tsx` `toLowerCase()` pattern may be correct if the translation files actually use lowercase keys. Not verified against the finance-specific translation files.

5. **`bodySnapshot` content not traced:** Whether `bodySnapshot` ever contains user-supplied HTML depends on backend notification construction. Not verified.

6. **Route-level `loading.tsx` impact not measured:** The absence of route-level loading files doesn't confirm that Suspense boundaries are absent at component level — only that Next.js App Router streaming is disabled at the route segment level.

7. **Cross-phase coordination required:** Several Phase 6 findings (AUDIT-085/104 raw enum, AUDIT-068/069 admin gates) trace to patterns also present in mobile code not audited in Phase 6.

---

*Evidence index produced by Phase 6 read-only audit. No application code was modified. No git commands were executed.*
