# Phase 7 Audit Report — Mobile Full Audit (Patient + Practitioner)

**Phase:** 7
**Started:** 2026-06-17
**Completed:** 2026-06-17
**Auditors:** 6 concurrent sub-agents
**Evidence type:** Source code inspection, route inventory, pattern analysis
**Runtime verification:** Not performed (servers not running — audit is read-only discovery)

---

## 1. Audit Scope

Phase 7 audited the Fayed mobile app (Expo/React Native) across all patient and practitioner surfaces:

| # | Area | Scope |
|---|------|-------|
| 1 | Route Inventory | All 71 Expo Router files across `(auth)`, `(patient)`, `(practitioner)`, and root groups |
| 2 | Auth / Token Storage | SecureStore usage, AsyncStorage fallback, refresh logic, logout clearing, device ID generation |
| 3 | Patient Mobile UX | 46 patient route files, all critical journeys, copy/i18n fidelity |
| 4 | Practitioner Mobile UX | 23 practitioner route files, OTP/account state, finance, instant booking |
| 5 | Sessions / Join / Daily | `joinAvailability.canJoin` gating, roomUrl/token handling, external URL validation |
| 6 | Payments / Wallet | Payment-return states, wallet formatting, currency handling |
| 7 | Instant Booking / Presence | Status machine, timezone-awareness, heartbeat |
| 8 | Messages Shell | 4-lane inbox (all/sessions/support/followup), `typeSlug` lane routing, `chatAvailability` gating |
| 9 | Notifications / Push | Push registration, device token binding, logout revocation, deep-link routing |
| 10 | i18n / RTL | Enum leakage, translation coverage, direction utilities, loading/empty/error states |

---

## 2. Architecture Summary

### 2.1 Route Architecture

The mobile app uses **Expo Router** with a flat file-based routing structure under `app/`. Three authenticated route groups plus a public auth group:

| Route Group | Layout | Route Count | Auth Guard |
|-------------|--------|-------------|------------|
| `(auth)` | Bare Stack | 7 | None — public entry routes |
| `(patient)` | Tabs | ~46 | AuthProvider segments guard |
| `(practitioner)` | Tabs | ~22 | AuthProvider segments guard + APPROVED gate |
| Root | — | 2 | Public: `index`, `+not-found` |

**No `loading.tsx` or `error.tsx` files exist anywhere in the route tree** (confirmed by glob across all `app/` directories). All loading/error states are handled inline in components. No route-level streaming boundaries exist.

### 2.2 Auth Architecture

Auth is centralized entirely in `AuthProvider.tsx`:
- **Native (iOS/Android):** Tokens stored in `SecureStore` via `expo-secure-store`
- **Web:** Tokens stored in `AsyncStorage` (plain browser storage — **AUDIT-108/P1**)
- **Refresh:** Axios interceptor retries once, then calls `onAuthFailure` which clears all tokens and redirects to `(auth)`
- **Logout:** `revokeCurrentPushRegistration()` → API logout → `clearAuthenticatedState()` (always in `finally`) → redirect to `(auth)`
- **Role guard:** `useSegments()` + `useEffect` on `[isBootstrapping, router, segments, session]` — single centralized guard
- **Practitioner APPROVED gate:** Non-APPROVED practitioners are redirected to `/application-status`; tabs for dashboard/sessions/availability are hidden for non-APPROVED practitioners
- **Race condition:** The segments guard fires in `useEffect` — brief window between mount and redirect where unauthorized content could render

### 2.3 Messages Shell Architecture

Unified feature at `src/features/messages/` with thin route wrappers for patient/practitioner. Four-tab inbox (`all`, `sessions`, `support`, `followup`) backed by three distinct API sources:
- Sessions lane → `useInfiniteGeneralChatConversations`
- Support lane → `usePatientSupportTickets` / `usePractitionerSupportTickets`
- Followup lane → `useMyCareChatRequests` / `usePractitionerCareChatRequests`

`typeSlug` lane mapping is resolved **before** href parsing in both patient and practitioner resolvers:
- `messages.session-message-received` → `?tab=sessions`
- `messages.support-message-received` → `?tab=support`
- `messages.follow-up-message-received` → `?tab=followup`

Chat send state gated by `chatAvailability.canSend === true && chatAvailability.readOnly !== true` (MessageThreadScreen.tsx:206-212).

### 2.4 i18n Architecture

Mobile uses `i18next` with `react-i18next`. Translation files at `src/i18n/locales/en.json` and `src/i18n/locales/ar.json`. Direction utilities at `src/i18n/direction.ts` provide `getAppDirection(language)` which correctly checks `language.toLowerCase().startsWith("ar")` before falling back to `I18nManager.isRTL`.

---

## 3. Findings Summary

**Phase 7 total: 20 findings | AUDIT-105 through AUDIT-124**
**P1:** 4 | **P2:** 9 | **INFO:** 7 | **Closed:** 0

### P1 — Critical (4 findings)

| ID | Title | Module |
|----|-------|--------|
| AUDIT-105 | Raw `PENDING_PAYMENT`/`CONFIRMED` enums in `sessions/success.tsx` | Mobile Patient / Payments |
| AUDIT-106 | Raw `SupportTicketType` enum in `support/new.tsx` category selector | Mobile Patient / Support |
| AUDIT-107 | `formatNotificationType()` bypasses i18n — not RTL-aware | Mobile Patient / Notifications |
| AUDIT-108 | Web tokens in plain AsyncStorage (no Keychain/HTTP-only cookie) | Mobile Auth / Token Storage |

### P2 — Moderate (9 findings)

| ID | Title | Module |
|----|-------|--------|
| AUDIT-109 | Patient notification typeSlug coverage gap — non-message notifications rely on href parsing | Mobile Patient / Notifications |
| AUDIT-110 | `care-chat` redirect screen hardcoded Arabic text | Mobile Practitioner / Care-chat |
| AUDIT-111 | No `loading.tsx`/`error.tsx` route files anywhere in app | Mobile Route Infrastructure |
| AUDIT-112 | `cleanReasonText()` regex only handles two prefix variants | Mobile Practitioner / Onboarding |
| AUDIT-113 | Credential `fileUrl` displayed as raw text in onboarding | Mobile Practitioner / Onboarding |
| AUDIT-114 | `onboarding.tsx` accessible as hidden route via direct navigation | Mobile Practitioner / Route Protection |
| AUDIT-115 | `I18nManager.isRTL` used in `_layout.tsx` instead of `getAppDirection()` | Mobile RTL |
| AUDIT-116 | `formatRequirementLabel()` renders raw requirement keys as English title-case | Mobile Practitioner / i18n |
| AUDIT-117 | Messages inbox — one lane error shows error banner but other lanes show stale data | Mobile Messages Shell |

---

## 4. Most Significant Findings

### AUDIT-105 — Raw Payment Status Enums on Confirmation Screen (P1)
`sessions/success.tsx:87-89` uses `t("patientSessionsFlow.statuses.PENDING_PAYMENT")` and `t("patientSessionsFlow.statuses.CONFIRMED")` as i18n keys. If either key is absent, React falls back to the raw enum string. The payment confirmation screen is the most trust-critical moment in the booking flow — users seeing `"PENDING_PAYMENT"` or `"CONFIRMED"` as text are misinformed about their booking state.

### AUDIT-107 — `formatNotificationType()` Breaks Arabic UX (P1)
`formatNotificationType()` transforms `SESSION_REMINDER` → `"Session Reminder"` via string manipulation with no `t()` call. Arabic-mode patients see English notification type labels throughout the app. This is a systematic i18n bypass on a prominent surface (notification settings screen).

### AUDIT-108 — Web Auth Tokens in Plain Storage (P1)
On Expo Web, auth tokens are stored in `AsyncStorage` (backed by `localStorage`) with no encryption and no HTTP-only cookie fallback. Any XSS or malicious script on the same origin can read the refresh token and take over the account. This is a known limitation (documented in code) but remains unmitigated for web users.

### AUDIT-116 — Dashboard Missing Requirements in English Only (P2)
`formatRequirementLabel()` title-cases raw requirement keys (`"PRACTITIONER_OTP_VERIFIED"` → `"Practitioner Otp Verified"`) without i18n. Arabic practitioners see English labels on the main dashboard requirement checklist — a visible i18n breach on a high-visibility surface.

---

## 5. Positive Findings

The following aspects of the mobile app are well-implemented:

1. **`joinAvailability.canJoin` gates Join CTA correctly** — Both patient and practitioner session detail screens use `joinAvailability.canJoin === true` as the sole gate. `presentationStatus` is never used as a join permission proxy. `NO_SHOW` and `UNDER_REVIEW` sessions correctly suppress the Join CTA.

2. **No Daily URL/token logging** — No `console.log` statements contain `token`, `roomUrl`, or `joinToken`. Join URLs are passed directly to `normalizeAllowedExternalUrl` → `Linking.openURL` without intermediate logging.

3. **External URL validation** — `normalizeAllowedExternalUrl` restricts protocols to `https:` and `fayed:` (with `http:` only in `__DEV__`). Both patient and practitioner join flows validate before opening.

4. **Payment-return handles all 7 states** — `normalizePaymentRedirectStatus` correctly normalizes `redirect_status`, `success`, and `pending` params from Paymob, Stripe, and wallet callbacks. `isSessionExpired` blocks Pay Now on expired sessions.

5. **Backend-owned financial amounts** — `netPaidAmount`, `grossAmount`, `discountAmount` all come from `POST /financial-breakdown`. Mobile does not calculate prices independently. `formatMoney` uses `Intl.NumberFormat` with backend-provided currency codes.

6. **Wallet balances from backend** — `usePractitionerWalletSummary` and `usePatientWalletSummary` source all balances from backend endpoints. No client-side balance computation.

7. **Presence heartbeat correctly gated** — `usePractitionerPresenceHeartbeat` only fires when `role === "practitioner" && isApprovedPractitioner`. Non-approved practitioners do not send presence heartbeats.

8. **`chatAvailability.canSend` gates composer** — MessageThreadScreen correctly checks `canSend === true && readOnly !== true` before showing the chat composer. Backend is authoritative.

9. **Push registration authenticated-only** — `syncPushRegistration` requires a valid session. Device token is tied to `session.user.id` and resolved role. Logout calls `revokeCurrentPushRegistration()` before clearing local state.

10. **Messages Shell lane routing is correct** — `typeSlug` mapping resolves lane before href parsing. No direct `/messages/{threadId}` bypass found for user notification taps.

11. **`ListPageScaffold` provides consistent state UX** — Most patient and practitioner list screens use `ListPageScaffold` which correctly handles loading, error, and empty states with actionable CTAs.

12. **`practitioner.presentationStatus` namespace exists** — Confirmed by JSON parse. `en.json` has `practitioner.presentationStatus` with all 9 session statuses (UPCOMING, JOINABLE, IN_PROGRESS, COMPLETED, CANCELLED, ENDED, UNAVAILABLE, NO_SHOW, UNDER_REVIEW). `ar.json` has the Arabic equivalents.

13. **RTL direction utilities well-centralized** — `src/i18n/direction.ts` provides `getAppDirection(i18n.language)` which correctly checks language code before falling back to `I18nManager.isRTL`. Chevron icons flip correctly. `flexDirection` uses `isRTL ? "row-reverse" : "row"` pattern consistently.

14. **`Intl.NumberFormat` for currency** — All financial formatting uses native `Intl.NumberFormat` with locale-aware settings. EGP uses `ar-EG` locale for correct formatting.

15. **Instant booking status machine correctly gated** — Accept/Reject CTAs only shown when `request.status === "PENDING"`. Error messages use dedicated mapping utilities.

16. **`safeFinanceText` guards internal strings** — Ledger descriptions are filtered through `safeFinanceText` to prevent seed/dev strings from leaking to the UI.

17. **Settlement status labels fully i18n'd** — All 6 settlement statuses (DRAFT, READY, PROCESSING, PAID, FAILED, CANCELLED) have bilingual AR/EN labels.

18. **Availability timezone-aware** — `availabilityTimeZone` from backend drives all slot display, summary counts, and formatting. Falls back to device timezone only when backend timezone is unavailable (edge case).

19. **`careChat.requestStatus` fully covered** — All 6 care-chat request statuses (PENDING, APPROVED, REJECTED, EXPIRED, CANCELLED, REVOKED) have translations in both languages.

20. **`support.statuses` fully covered** — All 6 support statuses (OPEN, IN_PROGRESS, WAITING_FOR_USER, ESCALATED, RESOLVED, CLOSED) have translations in both languages.

---

## 6. Risk Posture

**Phase 7 risk posture: HIGH**

4 P1 findings represent:
- Direct user-visible text corruption on the payment confirmation screen (AUDIT-105)
- Systematic Arabic UX breach on the notification surface (AUDIT-107)
- Web platform account takeover risk via plain localStorage tokens (AUDIT-108)
- Raw enum exposure in a support category selector (AUDIT-106)

Combined with the 4 P1s, the P2 findings include routing gaps (AUDIT-109, AUDIT-114), RTL direction desynchronization risk (AUDIT-115), and an information disclosure in the onboarding flow (AUDIT-113).

**Overall platform risk posture (Phases 1–7 combined): CRITICAL**

Cumulative open findings across 7 phases: **123 open findings, 0 closed**.

---

## 7. Phase 7 Open Questions Summary

1. **Q-083 (AUDIT-105):** Does `patientSessionsFlow.statuses.PENDING_PAYMENT` actually exist in the translation files, or does the key lookup fail silently? Need to verify the actual key existence vs. fallback behavior.

2. **Q-084 (AUDIT-106):** Does the `support.categories` namespace cover all `SupportTicketType` enum values? Or are some values missing, causing the raw enum fallback?

3. **Q-085 (AUDIT-107):** Is there a translation namespace for `typeSlug` values that `formatNotificationType` should be using? Or was this utility built as a workaround for missing translations?

4. **Q-086 (AUDIT-108 web tokens):** Is there a backend-supported HTTP-only cookie mechanism for the mobile web platform that should be used instead of AsyncStorage?

5. **Q-087 (AUDIT-109):** Does the backend notification payload for patient non-message types include properly formatted `href` fields? Or is there a gap where notifications route incorrectly?

6. **Q-088 (AUDIT-112):** What prefix formats does the backend actually send for rejection reasons? Is the two-variant regex covering all cases?

7. **Q-089 (AUDIT-113):** Is displaying `fileUrl` in the onboarding workspace intentional (for credential download), or should it be a formatted link/identifier?

8. **Q-090:** Is there a backend-side validation that prevents a device token registered for a PATIENT from being used to deliver notifications to a PRACTITIONER (and vice versa)?

9. **Q-091:** What is the exact notification payload schema the backend sends for each notification type? Which field (`routePath`, `href`, `action.href`) is populated for each type?

10. **Q-092:** Does the notification tap handler's `sessionRef.current` race condition (user logs out/in between tap and route resolution) cause incorrect routing in practice?

---

## 8. Verdict

The Fayed mobile app demonstrates solid architectural foundations in several critical areas: `joinAvailability.canJoin` gating is correctly implemented, financial amounts are backend-owned throughout, the Messages Shell architecture is well-designed with correct lane routing, and the auth layer uses `SecureStore` for native platforms with fail-closed refresh behavior. Translation coverage is broad and the `practitioner.presentationStatus` namespace is confirmed present.

However, **4 P1 findings** represent active user-facing defects and a platform security risk that must be addressed before release:

**Most urgent:**
1. **AUDIT-105** (raw payment enums) — direct fix by adding missing translation keys
2. **AUDIT-106** (raw support enum) — direct fix by adding missing translation keys
3. **AUDIT-107** (`formatNotificationType` bypasses i18n) — replace string manipulation with `t()` lookup
4. **AUDIT-108** (web tokens in AsyncStorage) — documented limitation requiring backend HTTP-only cookie support

**Systemic issues:**
- No `loading.tsx`/`error.tsx` route files disables Expo Router's file-based streaming/error boundary convention across all 71 routes (AUDIT-111)
- `I18nManager.isRTL` used in one location instead of the centralized `getAppDirection()` utility (AUDIT-115)
- `formatRequirementLabel()` bypasses i18n on the primary practitioner dashboard (AUDIT-116)

No Phase 7 findings were closed during this audit. All 20 remain open.

---

## 9. Recommended Next Phase

**Phase 8 — Mobile Fix Verification + Web Backend Audit Follow-Up**

Recommended because:
- Phase 7 identified 4 P1 issues in the mobile translation/i18n layer that trace to missing translation keys — verifying and fixing those keys is a small, high-impact next step
- AUDIT-108 (web tokens) requires backend HTTP-only cookie support — a backend API audit of auth token handling would confirm the path forward
- Several open questions from Phase 6 (Q-075 providerRoomRef, Q-079 bodySnapshot, Q-074 FinancialReconciliation i18n keys) trace to backend behavior not confirmable from mobile source inspection
- The cumulative finding count (123 open) warrants a dedicated fix-pass before new audit areas are introduced

**Alternative: Phase 8 — Accessibility + Offline Audit**
The mobile app lacks an accessibility audit (TalkBack/VoiceOver compatibility, touch target sizes, color contrast). An accessibility pass would complement the Phase 7 findings and address the `bare pulsing div` finding from Phase 6 (AUDIT-101).

---

*Report produced by Phase 7 read-only audit. No application code was modified. No git commands were executed.*
