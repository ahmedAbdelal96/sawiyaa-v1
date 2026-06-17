# Phase 7 Open Questions — Mobile Full Audit (Patient + Practitioner)

**Phase:** 7
**Created:** 2026-06-17
**Questions:** 12

Open questions discovered during Phase 7 mobile audit that warrant investigation in later phases or before fixes are applied.

---

## i18n / Translation

### Q-083: Does `patientSessionsFlow.statuses.PENDING_PAYMENT` actually exist in the translation files?
**Asked in:** Phase 7 (AUDIT-105 — Patient sessions/success.tsx)
**Question:** The `sessions/success.tsx` code uses `t("patientSessionsFlow.statuses.PENDING_PAYMENT")` and `t("patientSessionsFlow.statuses.CONFIRMED")` as i18n keys. Was the actual key existence verified in `en.json` and `ar.json`? If the key exists, the issue is a different code path or a missing fallback. If absent, the raw enum renders.
**Why it matters:** AUDIT-105 is marked P1. If the key actually exists, the finding severity changes. If it doesn't, it needs to be added.
**Phase:** Phase 7 evidence verification
**Status:** Not resolved — exhaustive key existence check not performed in Phase 7

---

### Q-084: Does the `support.categories` namespace cover all `SupportTicketType` enum values?
**Asked in:** Phase 7 (AUDIT-106 — Patient support/new.tsx)
**Question:** The `support/new.tsx` code uses `t(\`support.categories.${category}\`, category)` with `category` as fallback. Does the `support.categories` namespace in both locale files have entries for all values of `SupportTicketType` (GENERAL, BOOKING, PAYMENT, SESSION, TECHNICAL, ACCOUNT, CHAT, OTHER)?
**Why it matters:** If some keys are missing, the fallback is the raw enum string (e.g., "BOOKING"). A full key coverage check would determine whether AUDIT-106 is a missing key issue or a fallback misuse.
**Phase:** Phase 7 evidence verification
**Status:** Not resolved — support.categories namespace not exhaustively verified

---

### Q-085: What is the intended design for notification type display?
**Asked in:** Phase 7 (AUDIT-107 — formatNotificationType bypasses i18n)
**Question:** `formatNotificationType()` was implemented as a string humanization utility. Was a translation namespace for `typeSlug` values planned but not built? Or is the string manipulation approach the intended design (with the understanding that it produces English-only output)?
**Why it matters:** AUDIT-107 flags this as a P1 i18n breach. The fix depends on whether there should be a translation namespace for notification types or whether the function should accept locale and return appropriately translated output.
**Phase:** Phase 7 product/design review
**Status:** Not resolved — design intent not verified

---

## Auth / Token Storage

### Q-086: Is there a backend-supported HTTP-only cookie mechanism for mobile web?
**Asked in:** Phase 7 (AUDIT-108 — Web tokens in AsyncStorage)
**Question:** The mobile web auth layer falls back to AsyncStorage because `expo-secure-store` has no web backend. Is there a backend endpoint or mechanism to store auth tokens in HTTP-only cookies (same-origin, httpOnly, secure) that the mobile web client should use instead?
**Why it matters:** AUDIT-108 is a P1 security issue for web users. The fix path (backend HTTP-only cookie support) requires backend involvement and may not be achievable in the current release cycle.
**Phase:** Phase 8 backend API audit
**Status:** Not resolved — backend token storage mechanism not inspected

---

### Q-087: Is the device ID `Math.random()` used anywhere that could cause a security issue?
**Asked in:** Phase 7 (AUDIT-112 — Device ID uses Math.random())
**Question:** The device ID is generated using `Math.random()` and stored in AsyncStorage. While device IDs are not secrets, could this be used in a device fingerprinting or replay attack context? Is the device ID used in any auth or authorization decision?
**Why it matters:** `Math.random()` is predictable. If the device ID is used in any security-sensitive context (beyond just push token binding), this would be a security issue.
**Phase:** Phase 8 backend audit
**Status:** Not resolved — device ID usage scope not fully traced

---

## Notifications / Push

### Q-088: Does the backend validate that a device token's role matches the notification recipient?
**Asked in:** Phase 7 (Push registration — device token binding)
**Question:** The mobile app sends `role` (PATIENT/PRACTITIONER) and `userId` at push registration time. Does the backend enforce that a PATIENT device token cannot be used to deliver notifications to a PRACTITIONER (and vice versa)?
**Why it matters:** If the backend doesn't enforce role-token binding, a compromised device token could potentially receive notifications intended for a different role. This is a backend authorization concern.
**Phase:** Phase 8 backend API audit
**Status:** Not resolved — backend notification dispatch not inspectable from mobile source

---

### Q-089: What notification payload fields does the backend actually populate for each type?
**Asked in:** Phase 7 (Notification tap routing — extractNotificationHref)
**Question:** `extractNotificationHref` reads `routePath` → `href` → `action.href` in priority order. Which field does the backend actually populate for each notification type? Are there notification types that populate `routePath` vs `href` differently?
**Why it matters:** If the backend sends `routePath` for some types and `href` for others, the routing logic may behave inconsistently. A complete notification payload schema would clarify this.
**Phase:** Phase 8 backend API audit
**Status:** Not resolved — backend notification schema not inspectable from mobile source

---

### Q-090: Does the notification tap race condition cause incorrect routing in practice?
**Asked in:** Phase 7 (AUDIT-110 — Notification tap session race condition)
**Question:** `handleResponse` in `AuthProvider.tsx` reads `sessionRef.current` asynchronously after a notification tap. If the user logs out and logs back in as a different role between the tap and the route resolution, could the notification route to the wrong role's screen?
**Why it matters:** AUDIT-110 is marked INFORMATIONAL. The `effectiveRole` logic attempts to handle this via `rawTargetRole` from the payload, but if that field is absent, stale session data could cause incorrect routing.
**Phase:** Phase 8 runtime verification
**Status:** Not resolved — race condition not reproducibly verified

---

### Q-091: Should the practitioner notification screen have a push status card like the patient screen?
**Asked in:** Phase 7 (AUDIT-113 — Practitioner lacks push status UI)
**Question:** The patient notifications screen shows push registration status and a refresh/enable button. The practitioner screen has no equivalent. Is this intentional (practitioners don't need push self-service), or should it be added for consistency?
**Why it matters:** If a practitioner's push permissions are denied or registration fails, there is no in-app surface to diagnose or fix the issue.
**Phase:** Phase 7 product/design review
**Status:** Not resolved — design intent not verified

---

## Practitioner Onboarding

### Q-092: Is the credential `fileUrl` display intentional for practitioner self-service?
**Asked in:** Phase 7 (AUDIT-113 — Credential fileUrl displayed as raw text)
**Question:** The `onboarding.tsx` screen displays `item.fileUrl` directly as a text string. Is this intentional to allow practitioners to download their own credential documents? Or should this be a formatted link or shortened identifier?
**Why it matters:** If the URL reveals internal infrastructure (bucket names, internal paths), it should be replaced with a user-friendly link. If it's intentional for self-service, it should be formatted as a clickable link.
**Phase:** Phase 7 product/design review
**Status:** Not resolved — design intent not verified

---

### Q-093: What prefix formats does the backend send for practitioner rejection reasons?
**Asked in:** Phase 7 (AUDIT-112 — cleanReasonText regex only handles two variants)
**Question:** The `cleanReasonText` regex at `application-status.tsx:222` only strips `Reason:` and `سبب الرفض:` prefixes. What other prefix formats does the backend send? Is there a documented or agreed-upon rejection reason format?
**Why it matters:** If the backend sends other prefix formats, practitioners will see raw prefix artifacts in their rejection reason display.
**Phase:** Phase 8 backend API audit
**Status:** Not resolved — backend rejection reason format not inspectable from mobile source

---

### Q-094: Does the mobile app have an Expo Router middleware or per-route auth guard?
**Asked in:** Phase 7 (AUDIT-111 — hidden routes accessible via direct navigation)
**Question:** All route protection is centralized in `AuthProvider.tsx` via a `useEffect` on `segments`. Is there an Expo Router middleware (`app/_middleware.ts`) or per-route guard that could provide additional protection? Would adding a middleware be feasible given the current architecture?
**Why it matters:** The race condition window in the `useEffect` guard is a known limitation. A middleware-based approach would provide route-level protection without the race condition.
**Phase:** Phase 8 architectural review
**Status:** Not resolved — Expo Router middleware not found during inspection

---

## Cross-Phase Questions (Carried Forward)

| Question | Phase Assigned | Reason |
|----------|---------------|--------|
| Q-075: providerRoomRef — Daily room name vs join token | Phase 8 Backend | Token vs opaque identifier not determinable from mobile source |
| Q-079: bodySnapshot HTML content risk | Phase 8 Backend | Backend notification body content not inspectable |
| Q-074: FinancialReconciliation i18n key casing | Phase 8 Backend | Backend translation key casing not determinable from mobile source |
| Q-077: Toast dir animation vs positioning | Phase 8 RTL Review | Animation CSS not inspected in mobile context |
| Q-078: ChatKit incoming message direction | Phase 8 RTL Review | ChatKit direction already audited in Phase 6 web |

---

## Resolved Questions

*No questions resolved in Phase 7.*

---

*Open questions produced by Phase 7 read-only audit. No application code was modified.*
