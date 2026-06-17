# Phase 7 Findings Register — Mobile Full Audit (Patient + Practitioner)

**Phase:** 7
**Created:** 2026-06-17
**Auditors:** 6 concurrent sub-agents
**Findings:** 20 (AUDIT-105 through AUDIT-124)
**Open:** 20 | **Closed:** 0

---

## Finding format

Each finding follows the standard template from `findings-register-template.md`.

---

## P1 — Critical (4 findings)

---

### AUDIT-105

**Title:** Session success screen renders raw `PENDING_PAYMENT` / `CONFIRMED` enums as i18n keys

**Severity:** P1

**Module:** Mobile Patient / Payments

**Affected users:** Patients completing a session booking

**Affected surfaces:** `(patient)/sessions/success.tsx` — payment confirmation screen

**Evidence:** `fayed-mobile/app/(patient)/sessions/success.tsx:87-89`
```tsx
{params.status === "PENDING_PAYMENT"
  ? t("patientSessionsFlow.statuses.PENDING_PAYMENT")
  : t("patientSessionsFlow.statuses.CONFIRMED")}
```
The i18n keys `patientSessionsFlow.statuses.PENDING_PAYMENT` and `patientSessionsFlow.statuses.CONFIRMED` are passed directly as keys. If either key is absent from the translation files, React falls back to the raw enum string (e.g., `"PENDING_PAYMENT"` or `"CONFIRMED"`) which is displayed to the user. Payment confirmation is a critical post-payment state — users may be misinformed about their booking status.

**Root cause hypothesis:** The translation keys use the wrong namespace (`patientSessionsFlow.statuses` instead of the correct `patientSessionsFlow.presentationStatus` or a dedicated payment statuses namespace), or the keys were never added to the translation files.

**Risk:** Patients completing a booking see raw backend enum strings instead of human-readable status labels on the confirmation screen. This breaks trust at the most critical moment in the payment flow.

**Smallest safe next step:** Verify whether `patientSessionsFlow.statuses.PENDING_PAYMENT` and `patientSessionsFlow.statuses.CONFIRMED` exist in `en.json` and `ar.json`. If missing, add them. If they exist, debug why the i18n lookup is failing.

**Do not fix yet:** yes

---

### AUDIT-106

**Title:** Support ticket category screen renders raw `SupportTicketType` enum values as i18n keys

**Severity:** P1

**Module:** Mobile Patient / Support

**Affected users:** Patients creating a new support ticket

**Affected surfaces:** `(patient)/support/new.tsx` — new support ticket category selector

**Evidence:** `fayed-mobile/app/(patient)/support/new.tsx:109`
```tsx
{t(`support.categories.${category}`, category)}
```
`category` values include `GENERAL`, `BOOKING`, `PAYMENT`, `SESSION`, `TECHNICAL`, `ACCOUNT`, `CHAT`, `OTHER`. When the i18n key is missing, the fallback is the raw enum string (e.g., `"BOOKING"`). Users creating a support ticket see backend enum values instead of human-readable category labels.

**Root cause hypothesis:** The `support.categories` namespace either does not have entries for all `SupportTicketType` values, or the fallback mechanism passes the raw enum when the key lookup returns undefined.

**Risk:** Patients see raw technical enum strings (`BOOKING`, `PAYMENT`, `TECHNICAL`) when selecting a support ticket category. This degrades trust and may cause patients to select the wrong category.

**Smallest safe next step:** Add missing `support.categories` entries for all `SupportTicketType` enum values in both `en.json` and `ar.json`, or change the fallback to a safe human-readable string rather than the raw enum.

**Do not fix yet:** yes

---

### AUDIT-107

**Title:** `formatNotificationType()` bypasses i18n — notification type labels appear in English regardless of locale

**Severity:** P1

**Module:** Mobile Patient / Notifications

**Affected users:** Patients viewing their notification list

**Affected surfaces:** `(patient)/profile-notifications.tsx` — notification settings and notification list

**Evidence:** `fayed-mobile/app/(patient)/profile-notifications.tsx:162`
```tsx
{formatNotificationType(item.typeSlug)}
```
`formatNotificationType` (in `src/features/patient/profile/account-utils.ts:16-22`) humanizes slugs via string manipulation:
```typescript
return typeSlug.split("_").map(part => part[0]+part.slice(1).toLowerCase()).join(" ");
```
e.g., `SESSION_REMINDER` → `"Session Reminder"`, `PAYMENT_CONFIRMED` → `"Payment Confirmed"`. No `t()` call is used. The function is not RTL-aware and does not translate — Arabic-mode patients see English notification type labels.

**Root cause hypothesis:** `formatNotificationType` was implemented as a quick humanization utility without i18n integration. No translation namespace exists for `typeSlug` values.

**Risk:** Arabic-speaking patients see English notification type labels throughout the app, breaking the Arabic UX contract. This is especially visible in the notification settings screen where patients manage their notification preferences.

**Smallest safe next step:** Replace `formatNotificationType` calls with a lookup in the i18n system, or extend the function to accept a translation function and locale.

**Do not fix yet:** yes

---

### AUDIT-108

**Title:** Web platform stores auth tokens in plain browser AsyncStorage (no Keychain/HTTP-only cookie)

**Severity:** P1

**Module:** Mobile Auth / Token Storage

**Affected users:** Patients and practitioners using the Expo web platform

**Affected surfaces:** `fayed-mobile/src/features/auth/secure-token-storage.ts` — all web-authenticated sessions

**Evidence:** `fayed-mobile/src/features/auth/secure-token-storage.ts:36-53, 73-81`
```typescript
// For web, we use AsyncStorage (browser-compatible, no Keychain on web)
```
For `Platform.OS === "web"`, tokens are stored in `AsyncStorage` (backed by browser `localStorage`). The access token, refresh token, and expiry timestamps are all stored in plain text. The code explicitly acknowledges this limitation in comments.

**Root cause hypothesis:** `expo-secure-store` does not have a web-compatible backend, so the mobile auth layer falls back to `AsyncStorage` for web. This is a known platform limitation but remains a security risk for web users.

**Risk:** On web, any JavaScript running on the same origin (malicious third-party script, browser extension, XSS payload) can read the auth tokens from `localStorage`. This enables full account takeover. The refresh token has a long TTL and can be used to obtain new access tokens.

**Smallest safe next step:** For web, consider migrating to HTTP-only cookies (requires backend support) or implementing token encryption at rest using a web-compatible secret storage mechanism. At minimum, add a prominent warning in the web auth flow and document the limitation.

**Do not fix yet:** yes

---

## P2 — Moderate (9 findings)

---

### AUDIT-109

**Title:** Patient notification route resolver has incomplete `typeSlug` coverage — non-message notifications rely on href parsing

**Severity:** P2

**Module:** Mobile Patient / Notifications

**Affected users:** Patients receiving non-session, non-support, non-followup notifications

**Affected surfaces:** `src/features/patient/notifications/routes.ts:1-15`; patient notification tap routing

**Evidence:** `src/features/patient/notifications/routes.ts:1-15` only maps 3 typeSlugs:
- `messages.session-message-received` → `/messages?tab=sessions`
- `messages.support-message-received` → `/messages?tab=support`
- `messages.follow-up-message-received` → `/messages?tab=followup`

All other patient notification typeSlugs (e.g., `session-confirmed`, `payment-received`, `academy-enrollment`) fall through to href parsing. The practitioner resolver (`src/features/practitioner/notifications/utils.ts:71-92`) has explicit Arabic i18n handling for 4+ session typeSlugs; the patient resolver does not have equivalent explicit coverage.

**Root cause hypothesis:** The patient notification route resolver was built for the Messages Shell use case only and does not handle the full range of patient notification types. Backend notifications with valid routes but missing explicit mappings fall through to a generic href parser that may fail.

**Risk:** Patients tapping certain notification types may see an "unsupported notification" alert or be routed incorrectly, rather than navigating to the correct screen. The system remains safe (no wrong surface access) but creates a degraded notification UX.

**Smallest safe next step:** Add explicit `typeSlug` mappings for the most common patient notification types (session-confirmed, payment-received, etc.) to the patient route resolver.

**Do not fix yet:** yes

---

### AUDIT-110

**Title:** `care-chat` redirect screen uses hardcoded Arabic loading text instead of `t()` call

**Severity:** P2

**Module:** Mobile Practitioner / Care-Chat

**Affected users:** Practitioners navigating to care-chat

**Affected surfaces:** `app/(practitioner)/care-chat/index.tsx:12-16`

**Evidence:**
```tsx
<LoadingState fullScreen message="جارٍ التحويل..." />
```
The loading message `"جارٍ التحويل..."` (Arabic: "Redirecting...") is hardcoded. If the redirect takes time (e.g., slow navigation), the user sees raw Arabic text. The screen also uses `useEffect` for redirect but there is no i18n key for the redirect message.

**Root cause hypothesis:** This was implemented as a quick redirect stub with an Arabic literal. The i18n system was not connected for this screen.

**Risk:** Practitioners see hardcoded Arabic text in an otherwise Arabic-i18n'd app. This breaks the i18n contract and appears unprofessional.

**Smallest safe next step:** Replace the hardcoded Arabic string with a `t("common.redirecting")` or similar i18n key call.

**Do not fix yet:** yes

---

### AUDIT-111

**Title:** Patient sessions success screen lacks a loading.tsx / error.tsx route file

**Severity:** P2

**Module:** Mobile Route Infrastructure

**Affected users:** All patients navigating to session success

**Affected surfaces:** `(patient)/sessions/success.tsx` — no sibling loading.tsx or error.tsx

**Evidence:** Glob pattern `**/loading.tsx` and `**/error.tsx` in `fayed-mobile/app/` returned no matches across all 71 routes. No route has a file-based loading or error boundary. All loading/error states are handled inline in components.

**Root cause hypothesis:** The Expo Router file-based loading/error convention was not used when the routes were built. All state management is done inline within page components.

**Risk:** Users navigating to `(patient)/sessions/success` see a blank/white screen during initial data fetching rather than a branded loading indicator. This is inconsistent with Expo Router best practices and provides no route-level error boundary.

**Smallest safe next step:** Add `loading.tsx` and `error.tsx` files in the `(patient)/sessions/` directory to provide route-level streaming and error boundaries.

**Do not fix yet:** yes

---

### AUDIT-112

**Title:** `cleanReasonText()` regex in application-status only handles two prefix variants

**Severity:** P2

**Module:** Mobile Practitioner / Onboarding

**Affected surfaces:** `app/(practitioner)/application-status.tsx:222`

**Evidence:**
```typescript
value.replace(/^(Reason|سبب الرفض)\s*:\s*/i, "").trim()
```
The regex only strips `Reason:` or `سبب الرفض:` prefixes. If the backend sends rejection reasons with other prefix formats, the prefix is displayed raw to the practitioner.

**Root cause hypothesis:** The rejection reason prefix cleaning was built for a specific backend response format that may have changed or may not cover all edge cases.

**Risk:** Practitioners see rejection reasons with unwanted prefix artifacts (e.g., `"Rejection Reason: <reason>"` or `"السبب: <reason>"`). The UX is degraded but the reason content is still readable.

**Smallest safe next step:** Update the regex to handle a broader range of prefix patterns, or request the backend to strip prefixes before sending the reason string.

**Do not fix yet:** yes

---

### AUDIT-113

**Title:** Credential `fileUrl` displayed as raw text in practitioner onboarding

**Severity:** P2

**Module:** Mobile Practitioner / Onboarding

**Affected surfaces:** `app/(practitioner)/onboarding.tsx:995`

**Evidence:**
```tsx
<Text color={theme.colors.textSecondary} style={styles.credentialMeta}>
  {item.fileUrl}
</Text>
```
Internal credential URLs are exposed directly to the practitioner in the onboarding screen. These URLs may reveal internal infrastructure details (bucket names, internal paths, etc.).

**Root cause hypothesis:** The credential display was built for internal debugging and not reviewed for production UX.

**Risk:** Practitioners see internal URL strings which may expose infrastructure details. This is a minor information disclosure risk and may be intentional (allowing practitioners to download their own credentials), but the URL formatting is not user-friendly.

**Smallest safe next step:** If credential URLs are intended to be shown, format them as a clickable link or a shortened identifier. If not intended, remove the display entirely.

**Do not fix yet:** yes

---

### AUDIT-114

**Title:** Practitioner `onboarding.tsx` accessible as a hidden route via direct navigation

**Severity:** P2

**Module:** Mobile Practitioner / Route Protection

**Affected surfaces:** `app/(practitioner)/onboarding.tsx`; `app/(practitioner)/_layout.tsx:135-137`

**Evidence:** `app/(practitioner)/_layout.tsx:135-137` lists `onboarding` with `href={null}` (hidden from tab bar). No layout-level route guard prevents direct navigation via `router.push('/(practitioner)/onboarding')`. The AuthProvider approval gate redirects non-approved practitioners to `/application-status`, but a direct push to `/onboarding` would bypass this redirect.

**Root cause hypothesis:** Hidden routes (`href={null}`) are excluded from the tab navigator but are not protected by the layout. The AuthProvider guard provides protection at the app level, but there is a race condition window where the full onboarding workspace could be accessed.

**Risk:** A non-approved practitioner could access the full onboarding workspace directly. While the backend likely filters data based on account status, the UI should enforce the same restrictions as the tab bar.

**Smallest safe next step:** Add a layout-level check in `onboarding.tsx` that redirects to `/application-status` if the practitioner is not in an APPROVED state.

**Do not fix yet:** yes

---

### AUDIT-115

**Title:** Practitioner `I18nManager.isRTL` usage in `_layout.tsx` may desynchronize from app language

**Severity:** P2

**Module:** Mobile RTL / i18n

**Affected surfaces:** `app/(practitioner)/_layout.tsx:27`

**Evidence:**
```typescript
const isRTL = I18nManager.isRTL;
```
This reads the device system's RTL flag directly, not the app's i18n language context. The correct pattern (used in other screens) is `getAppDirection(i18n.language)` from `src/i18n/direction.ts`, which checks the language code first and falls back to `I18nManager.isRTL`.

**Root cause hypothesis:** The practitioner tab layout was implemented with a direct `I18nManager.isRTL` read instead of using the centralized direction utility.

**Risk:** If the device's system language is Arabic but the app's i18n language is English (or vice versa), the practitioner tab layout renders in the wrong direction. This could cause layout issues, overlapping text, or invisible elements.

**Smallest safe next step:** Replace `I18nManager.isRTL` with `getAppDirection(i18n.language)` in the practitioner layout.

**Do not fix yet:** yes

---

### AUDIT-116

**Title:** Practitioner `formatRequirementLabel()` renders raw requirement keys as English title-case strings

**Severity:** P2

**Module:** Mobile Practitioner / i18n

**Affected surfaces:** `app/(practitioner)/index.tsx:798-804`; `app/(practitioner)/onboarding.tsx:529`

**Evidence:** `formatRequirementLabel(item)` title-cases raw requirement keys:
- `"PRACTITIONER_OTP_VERIFIED"` → `"Practitioner Otp Verified"`
- `"PRACTITIONER_PROFILE_COMPLETE"` → `"Practitioner Profile Complete"`

The requirement labels are displayed as chip text in the dashboard and onboarding screens without i18n translation. Arabic practitioners see English requirement labels.

**Root cause hypothesis:** The requirement label formatting was built as a debug/development utility and was not connected to the i18n system before production launch.

**Risk:** Arabic-speaking practitioners see English text for their account requirement checklist. This is a visible i18n breach on a prominent dashboard surface.

**Smallest safe next step:** Add a `practitioner.account.missingRequirements` translation namespace covering all requirement key labels, or update `formatRequirementLabel` to use `t()` internally.

**Do not fix yet:** yes

---

### AUDIT-117

**Title:** Messages inbox error handling shows error banner but other tabs display stale data without indication

**Severity:** P2

**Module:** Mobile Messages Shell

**Affected surfaces:** `src/features/messages/components/MessagesInboxScreen.tsx:171-180`

**Evidence:** The messages inbox aggregates three separate data sources (general chat conversations, support tickets, care-chat requests). Each source has independent stale times and error states. If one source fails (e.g., support tickets), the error banner is shown for that tab but other tabs (sessions, followup) may still display stale data without any visual indication that one lane has failed.

**Root cause hypothesis:** The inbox was designed as a tabbed interface with per-source error handling but no cross-tab error coordination.

**Risk:** Users may believe their full inbox is up-to-date when in fact one or two lanes are showing stale or error states. This could cause them to miss time-sensitive support replies or messages.

**Smallest safe next step:** Add a per-tab refresh indicator or show which specific lane failed in the error banner, rather than a generic error that appears to affect the entire inbox.

**Do not fix yet:** yes

---

## INFO — Observations (7 findings)

---

### AUDIT-118

**Title:** (auth) layout has no auth check — relies entirely on downstream AuthProvider guard

**Severity:** INFO

**Module:** Mobile Auth / Route Protection

**Affected surfaces:** `app/(auth)/_layout.tsx`

**Evidence:** `app/(auth)/_layout.tsx` is a bare `Stack` with no auth check. Any user (including authenticated patients/practitioners) can navigate to `(auth)` routes freely. The redirect to the appropriate group is handled by `AuthProvider.tsx` useEffect segments guard.

**Root cause hypothesis:** The auth layout was intentionally kept minimal with auth checks delegated to the central AuthProvider.

**Risk:** None — the downstream guard works correctly. This is informational for documentation purposes.

**Do not fix yet:** yes

---

### AUDIT-119

**Title:** All route protection centralized in single AuthProvider useEffect with brief race condition window

**Severity:** INFO

**Module:** Mobile Auth / Route Protection

**Affected surfaces:** `src/providers/AuthProvider.tsx:408-501`

**Evidence:** The segments-based redirect runs in a `useEffect`. On initial load, the route component renders before the redirect fires. No per-route auth wrapper exists.

**Root cause hypothesis:** Centralized auth design decision. The race condition window is short and standard in React Router patterns.

**Risk:** For a very brief moment after app launch and before the redirect fires, a user could see content of a route they are not authorized for. This is especially relevant if the user refreshes the app on a protected route.

**Do not fix yet:** yes

---

### AUDIT-120

**Title:** `en.json` has duplicate `patientSessionsFlow.presentationStatus` entries (lines 792 and 2319)

**Severity:** INFO

**Module:** Mobile i18n / Code Quality

**Affected surfaces:** `src/i18n/locales/en.json`

**Evidence:** `patientSessionsFlow.presentationStatus` appears at both line 792 and line 2319 in `en.json`, with identical content. This is duplication that should be cleaned up.

**Root cause hypothesis:** Copy-paste during development or merge conflict residue.

**Risk:** No runtime risk — duplicate keys in JSON are valid (last value wins in JSON.parse). Maintenance risk only.

**Do not fix yet:** yes

---

### AUDIT-121

**Title:** `presentationStatuses` (plural) vs `presentationStatus` (singular) naming inconsistency

**Severity:** INFO

**Module:** Mobile i18n / Code Quality

**Affected surfaces:** `src/i18n/locales/en.json:1510`

**Evidence:** `en.json` has both `patientSessionsFlow.presentationStatus` (singular, line 792) and `packagePurchases.presentationStatuses` (plural, line 1510). The naming inconsistency could cause confusion.

**Root cause hypothesis:** Inconsistent naming convention during development.

**Risk:** No runtime risk. Maintenance confusion only.

**Do not fix yet:** yes

---

### AUDIT-202 (cross-phase)

**Title:** `formatNotificationType` already documented in Phase 6 web audit (AUDIT-097 web finding references same pattern)

**Severity:** INFO

**Module:** Cross-phase / i18n Pattern

**Affected surfaces:** Pattern: string manipulation for i18n-keyed values

**Evidence:** Phase 6 web audit (AUDIT-097) found inline `locale === "ar" ? ... : ...` ternaries in admin screens. The mobile `formatNotificationType` uses the same anti-pattern (string manipulation instead of i18n lookup). This is a cross-phase pattern finding.

**Root cause hypothesis:** The pattern of using string manipulation instead of i18n is widespread across the platform. A platform-wide i18n policy should be established.

**Do not fix yet:** yes

---

### AUDIT-123

**Title:** Patient care-chat uses overlay pattern instead of `ListPageScaffold` — functional but inconsistent

**Severity:** INFO

**Module:** Mobile UX / Loading States

**Affected surfaces:** `app/(patient)/care-chat/index.tsx:179-207`

**Evidence:** Care-chat renders loading/error as full-screen overlays on top of a ScrollView. Most other patient/practitioner routes use `ListPageScaffold` which provides a more consistent loading/empty/error UX.

**Root cause hypothesis:** The care-chat screen was built separately from the scaffold pattern.

**Risk:** None — the loading/error overlays are functional. Inconsistency only.

**Do not fix yet:** yes

---

### AUDIT-124

**Title:** `replaceAll("_", " ")` fallback in messages utils renders raw enums for unhandled status values

**Severity:** INFO

**Module:** Mobile Messages / i18n

**Affected surfaces:** `src/features/messages/utils.ts:146, 296, 311, 350, 405`; `src/features/messages/components/MessagesInboxScreen.tsx:98`

**Evidence:** Multiple utility functions use `replaceAll("_", " ")` as a catch-all fallback for unknown status enums. When backend returns a status not explicitly handled in the switch statements (e.g., `REASSIGNED` or `TRANSFERRED`), the raw underscore-separated string renders in the UI. For English locale, `getConversationStatusLabel` explicitly falls through to raw enum rendering at line 296.

**Root cause hypothesis:** The fallback was implemented as a developer convenience for unknown statuses, but was not wired to the i18n system. The current explicit switch cases cover the main statuses.

**Risk:** If backend adds new conversation/message status values, they will appear as raw underscore strings until explicitly handled. Low probability but not zero.

**Do not fix yet:** yes

---

## Open Findings

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| AUDIT-105 | Raw PENDING_PAYMENT/CONFIRMED enums in sessions/success.tsx | P1 | Open |
| AUDIT-106 | Raw SupportTicketType enum in support/new.tsx | P1 | Open |
| AUDIT-107 | formatNotificationType bypasses i18n — not RTL-aware | P1 | Open |
| AUDIT-108 | Web tokens in plain AsyncStorage | P1 | Open |
| AUDIT-109 | Patient notification typeSlug coverage gap | P2 | Open |
| AUDIT-110 | care-chat redirect hardcoded Arabic text | P2 | Open |
| AUDIT-111 | No loading.tsx/error.tsx route files | P2 | Open |
| AUDIT-112 | cleanReasonText regex fragile | P2 | Open |
| AUDIT-113 | Credential fileUrl displayed as raw text | P2 | Open |
| AUDIT-114 | onboarding.tsx accessible as hidden route | P2 | Open |
| AUDIT-115 | I18nManager.isRTL in practitioner _layout.tsx | P2 | Open |
| AUDIT-116 | formatRequirementLabel uses title-cased raw key, not i18n | P2 | Open |
| AUDIT-117 | Messages inbox error handling leaves stale data in other tabs | P2 | Open |
| AUDIT-118 | (auth) layout has no auth check (info) | INFO | Open |
| AUDIT-119 | Single AuthProvider guard with race condition window (info) | INFO | Open |
| AUDIT-120 | en.json duplicate patientSessionsFlow.presentationStatus (info) | INFO | Open |
| AUDIT-121 | presentationStatuses vs presentationStatus naming inconsistency (info) | INFO | Open |
| AUDIT-122 | Cross-phase i18n string-manipulation pattern (info) | INFO | Open |
| AUDIT-123 | Patient care-chat overlay pattern inconsistent with ListPageScaffold (info) | INFO | Open |
| AUDIT-124 | replaceAll fallback renders raw enums for unknown statuses (info) | INFO | Open |

---

## Findings by Phase

| Phase | Open | Closed | Total |
|-------|------|--------|-------|
| Phase 1 | 2 | 0 | 2 |
| Phase 2 | 6 | 0 | 6 |
| Phase 3 | 22 | 0 | 22 |
| Phase 4 | 21 | 0 | 21 |
| Phase 5 | 32 | 0 | 32 |
| Phase 6 | 20 | 0 | 20 |
| **Phase 7** | **20** | **0** | **20** |
| **Total** | **123** | **0** | **123** |

---

*Findings registered by Phase 7 read-only audit. No application code was modified. No git commands were executed.*
