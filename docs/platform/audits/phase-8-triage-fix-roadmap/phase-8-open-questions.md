# Phase 8 Open Questions

**Phase:** 8
**Created:** 2026-06-17
**Questions:** 20 (12 carried from Phase 7, 8 new from Phase 8 triage)

Questions are organized by priority. Each question states why it matters and which wave depends on the answer.

---

## Security / Auth Architecture

### Q-001: Does the global APP_GUARD exist and does it cover the academy enrollment endpoint?
**Finding(s):** AUDIT-031
**Question:** The Phase 4 audit found `POST /api/v1/academy/enrollments` with no `@UseGuards`. Does a global `APP_GUARD` (or similar) already protect this endpoint? If yes, the finding severity changes. If no, this is a confirmed P0 exploit path.
**Why it matters:** AUDIT-031 is a confirmed P0 release blocker. If a global guard exists and was overlooked, the finding closes. If no guard exists, the fix is urgent.
**Verification method:** Inspect `app.module.ts` or `main.ts` for `APP_GUARD` or global guard registration. Inspect academy controller source for explicit guard absence.
**Wave blocking:** Wave 0 (Security Core)

---

### Q-002: What is the sensitivity level of `providerRoomRef` in the runtime inspector?
**Finding(s):** AUDIT-095
**Question:** Is `providerRoomRef` a Daily room name (opaque identifier, e.g., "room-abc123"), a Daily room ID, or a secrets-bearing join token? The runtime inspector shows it in the session timeline visible to admins.
**Why it matters:** If it's a join token, it's a P1 exposure. If it's an opaque room name, it's P2 (information disclosure only).
**Verification method:** Inspect the Daily API response shape when a session is created. Check whether `providerRoomRef` grants join access or is purely an identifier.
**Wave blocking:** Wave 1 (pending confirmation, gates AUDIT-095 fix)

---

### Q-003: Is Expo web production-facing?
**Finding(s):** AUDIT-108
**Question:** Is the Expo web build deployed to end users in production? Or is it development-only (e.g., used only by developers for local testing)?
**Why it matters:** If Expo web is production-facing, AsyncStorage tokens are a confirmed P1 security issue. If dev-only, AsyncStorage is a P2 acceptable limitation.
**Verification method:** Check deployment pipeline for Expo web build. Interview product team. Check if there are analytics showing web user sessions from mobile web browsers.
**Wave blocking:** Wave 1 (gates AUDIT-108 fix — if dev-only, fix defers to Wave 5)

---

### Q-004: What is the backend's supported mechanism for HTTP-only auth cookies for web?
**Finding(s):** AUDIT-033, AUDIT-108
**Question:** Does the backend have endpoints that issue auth tokens via HTTP-only cookies (same-origin, httpOnly, secure)? If yes, the mobile web client should use that mechanism instead of AsyncStorage.
**Why it matters:** AUDIT-033 and AUDIT-108 are linked — the web refresh token fix depends on backend cookie-setting capability.
**Verification method:** Inspect backend auth controller for cookie-setting code. Look for `Set-Cookie` headers with `httpOnly` flag.
**Wave blocking:** Wave 0 (for AUDIT-033 httpOnly fix) and Wave 1 (for AUDIT-108)

---

### Q-005: What is the account lockout threshold?
**Finding(s):** AUDIT-039
**Question:** How many failed login attempts should trigger account lockout? Is there a backend-configured threshold, or should it default to 5?
**Why it matters:** AUDIT-039 requires implementing account lockout. Without a specified threshold, the implementation may be too aggressive or too lenient.
**Verification method:** Product/security team decision. Check if any existing auth documentation specifies a threshold.
**Wave blocking:** Wave 0

---

## i18n / Translation

### Q-006: Does `patientSessionsFlow.statuses.PENDING_PAYMENT` exist in both locale files?
**Finding(s):** AUDIT-105
**Question:** Phase 7 evidence index noted duplicate entries for `practitioner.presentationStatus` in en.json. Does `patientSessionsFlow.statuses.PENDING_PAYMENT` actually exist? The code uses it as a direct key without a fallback.
**Why it matters:** If the key exists and renders raw, a different code path is active. If absent, the key needs to be added. Either way, exhaustive key coverage check is needed.
**Verification method:** Python JSON parse of en.json and ar.json — search for `patientSessionsFlow.statuses.PENDING_PAYMENT` and `patientSessionsFlow.statuses.CONFIRMED`.
**Wave blocking:** Wave 1 (i18n fixes)

---

### Q-007: Does `support.categories` cover all SupportTicketType enum values?
**Finding(s):** AUDIT-106
**Question:** The `support/new.tsx` uses `t(\`support.categories.${category}\`, category)`. Does the `support.categories` namespace have entries for all values: GENERAL, BOOKING, PAYMENT, SESSION, TECHNICAL, ACCOUNT, CHAT, OTHER?
**Why it matters:** If some values lack keys, practitioners see raw enum strings. An exhaustive coverage check would determine whether AUDIT-106 is a missing keys issue or fallback misuse.
**Verification method:** Extract all SupportTicketType values from enum definition. Cross-reference with en.json/ar.json `support.categories` namespace.
**Wave blocking:** Wave 1

---

### Q-008: What is the intended design for `formatNotificationType()`?
**Finding(s):** AUDIT-107
**Question:** Was a translation namespace for `typeSlug` values planned but not built? Or is string humanization the intended design (English output only)?
**Why it matters:** AUDIT-107 is P1 because Arabic users see English notification type labels. The fix (add `typeSlug` namespace to i18n files) is simple if that was always the intent.
**Verification method:** Check git history for `formatNotificationType`. Interview original developer. Check if any translation files already have a `notification.typeSlug` namespace.
**Wave blocking:** Wave 1

---

### Q-009: Is there a `notification.typeSlug` translation namespace planned?
**Finding(s):** AUDIT-107, AUDIT-109
**Question:** Beyond the specific typeSlug values used in notifications, should a full namespace exist for all notification types? This would future-proof against new notification types rendering raw.
**Why it matters:** AUDIT-109 identifies a coverage gap for non-message notification types. A full namespace would prevent this class of issue.
**Verification method:** Check existing translation files for any `notification.types` or `notification.typeSlug` entries.
**Wave blocking:** Wave 1

---

## Backend / API Contracts

### Q-010: Does the backend enforce device-token role binding?
**Finding(s):** AUDIT-041
**Question:** When a PATIENT device token is used to register for push, does the backend verify that the token is used only for PATIENT notifications? Or can a PATIENT token receive PRACTITIONER notifications?
**Why it matters:** Token-role binding is a defense-in-depth measure. Without it, a compromised token could receive notifications intended for a different role.
**Verification method:** Inspect backend push notification dispatch code for role validation when sending.
**Wave blocking:** Wave 0 (if role binding is absent, add to Wave 0 notification security)

---

### Q-011: What notification payload fields does the backend actually populate?
**Finding(s):** AUDIT-057, AUDIT-058, AUDIT-065, AUDIT-089
**Question:** For each notification type, which field is populated: `routePath`, `href`, or `action.href`? This determines whether the routing logic prioritizes correctly and whether PHI fields are present.
**Why it matters:** The mobile routing logic has a priority order. If the backend populates `routePath` for some types and `href` for others differently than expected, routing will be wrong.
**Verification method:** Instrument backend to log notification payloads for all types, or inspect backend notification service source.
**Wave blocking:** Wave 0 (for PHI field removal) and Wave 1 (for routing fix)
**Resolution:** ✅ ANSWERED (source-level) — Phase 9b Sprint 3 backend inspection confirmed all populated payload fields. `threadId`, `relatedEntityType`, `category`, `relatedEntityId`, `scheduledStartAt`, `packagePlanTitle` removed from push payloads. `{{sessionAt}}` removed from push body via push-specific i18n keys. Remaining fields (`routePath`, `targetRole`) are non-PHI routing data. 🟡 IMPLEMENTED — VERIFICATION PENDING: runtime/device verification still required to confirm actual Expo payload on device.

---

### Q-012: What prefix formats does the backend send for practitioner rejection reasons?
**Finding(s):** AUDIT-112
**Question:** `cleanReasonText` handles `Reason:` and `سبب الرفض:` prefixes. What other formats does the backend send? Is there a documented rejection reason format?
**Why it matters:** If the backend adds new prefix formats, practitioners will see raw prefix artifacts. A definitive answer would confirm whether the two-variant regex is sufficient.
**Verification method:** Inspect backend practitioner rejection code for all rejection reason formatting.
**Wave blocking:** Wave 2

---

### Q-013: Does the backend have a settlement webhook or callback for external payment status?
**Finding(s):** AUDIT-004
**Question:** The settlement mark-paid/mark-failed confirmation dialog question. Does the backend support webhooks from payment providers that would make the manual "mark" action unnecessary or automate it?
**Why it matters:** If automatic settlement status exists, the manual mark actions (and their confirmation dialogs) may be lower priority.
**Verification method:** Inspect backend settlement service for webhook handlers from Paymob/Stripe.
**Wave blocking:** Wave 2

---

### Q-014: Does the backend have a concept of a "frozen price" for instant booking?
**Finding(s):** AUDIT-018
**Question:** The Phase 3 finding says the frozen price is stored but not retrieved. Does the backend actually store a separate frozen price record for instant booking requests? Or is the price simply the current practitioner rate at time of acceptance?
**Why it matters:** If no frozen price mechanism exists, AUDIT-018's premise is wrong and the finding should be closed.
**Verification method:** Inspect instant booking request creation and acceptance use cases for price storage/retrieval.
**Wave blocking:** Wave 0–1

---

## Presence / Availability

### Q-015: Is there a background sweeper for stale ONLINE presence records?
**Finding(s):** AUDIT-029
**Question:** Presence records with `status: ONLINE` but expired TTL are never corrected without a writer heartbeat. Does a sweeper/cron job exist to clean these up?
**Why it matters:** Without a sweeper, stale ONLINE records accumulate. The fix (add sweeper) depends on whether the sweeper already exists but is misconfigured.
**Verification method:** Search backend for cron jobs or scheduled tasks that clean presence records.
**Wave blocking:** Wave 2

---

### Q-016: What is the maximum SESSION_JOIN_LAG_MINUTES value that makes sense for the platform?
**Finding(s):** AUDIT-076
**Question:** `SESSION_JOIN_LAG_MINUTES = 0` was flagged as a gap. What is the intended value? 5 minutes? 10 minutes?
**Why it matters:** AUDIT-076 is P2. The fix is setting the value — but what should it be?
**Verification method:** Product/UX decision based on typical session start punctuality.
**Wave blocking:** Wave 2

---

## Notification Payload / Routing

### Q-017: Does the notification tap race condition cause incorrect routing in practice?
**Finding(s):** AUDIT-110
**Question:** `handleResponse` in AuthProvider.tsx reads `sessionRef.current` asynchronously. If the user logs out and back in as a different role between tap and resolution, could a notification route to the wrong surface?
**Why it matters:** AUDIT-110 is marked INFO, meaning the risk is considered low. Confirming this with the `effectiveRole` fallback logic would either close the finding or elevate it.
**Verification method:** Runtime test: open notification as PATIENT, switch to PRACTITIONER session mid-tap, observe routing.
**Wave blocking:** Wave 1 (if elevated to P1)

---

### Q-018: Should the practitioner notification screen have a push status card?
**Finding(s):** AUDIT-091 (Phase 7)
**Question:** The patient notification screen shows push registration status and a refresh/enable button. The practitioner screen has no equivalent. Is this intentional or should it be added?
**Why it matters:** If practitioners can't diagnose why push isn't working, support tickets will increase.
**Verification method:** Product/UX decision.
**Wave blocking:** Wave 3

---

### Q-019: Is displaying `fileUrl` in the onboarding workspace intentional?
**Finding(s):** AUDIT-113
**Question:** Is showing `item.fileUrl` as raw text intentional for credential download self-service? Or should this be a formatted link or shortened identifier?
**Why it matters:** If the URL reveals internal infrastructure, it should be a user-friendly link instead.
**Verification method:** Product/UX decision.
**Wave blocking:** Wave 2

---

### Q-020: Is there a TIMEZONE_CONFIG environment variable or database setting the backend should enforce?
**Finding(s):** AUDIT-077
**Question:** Is a timezone configuration mechanism planned but not built? Or is device/backend timezone acceptable for the current scope?
**Why it matters:** AUDIT-077 is P2 — timezone inconsistency across practitioners could cause booking conflicts in edge cases.
**Verification method:** Check if any timezone configuration exists in backend environment or database settings.
**Wave blocking:** Wave 3

---

## Carried Forward from Phase 7

These questions were documented in Phase 7 and remain unresolved:

| Question | Phase Assigned | Status |
|----------|---------------|--------|
| Q-075: providerRoomRef — Daily room name vs join token | Phase 8 Backend | → Q-002 above |
| Q-079: bodySnapshot HTML content risk | Phase 8 Backend | → Q-011 above |
| Q-074: FinancialReconciliation i18n key casing | Phase 8 Backend | → AUDIT-098 fix applies |
| Q-077: Toast dir animation vs positioning | Phase 8 RTL Review | → Wave 4 RTL work |
| Q-078: ChatKit incoming message direction | Phase 8 RTL Review | → AUDIT-089 fix applies |

---

## Questions Resolved During Phase 8 Triage

| Original Question | Resolution |
|-------------------|-----------|
| Phase 3 count discrepancy (21 vs 22) | Phase 3 header says "21" but IDs AUDIT-009–030 = 22. Count is 22. Header discrepancy noted. |
| AUDIT-063 XSS risk | React Native `<Text>` does not execute HTML — not XSS. Downgraded to P3. |
| AUDIT-059 P1 classification | Functional inconsistency (unread count), not security — downgraded to P2. |
| AUDIT-060 P1 classification | Not in current launch scope — downgraded to INFO. |
| AUDIT-070 HTML render | React string children are escaped by default — XSS not confirmed without `dangerouslySetInnerHTML`. Maintained P1 as defense-in-depth gap. |
| AUDIT-072 join token in URL | Confirmed — fix required. |
| Phase 6 reconfirms AUDIT-068/069 | These are Phase 5 findings, not new — noted in propagation matrix. |
| Phase 7 findings count | AUDIT-105–AUDIT-124 = 20 findings, confirmed correct. |

---

*Open questions produced by Phase 8 read-only triage. No application code was modified.*
