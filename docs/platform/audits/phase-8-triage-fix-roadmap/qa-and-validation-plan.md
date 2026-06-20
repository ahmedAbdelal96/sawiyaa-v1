# QA and Validation Plan — After-Fix Verification

**Phase:** 8
**Created:** 2026-06-17
**Purpose:** Comprehensive test and validation checklist for after fixes are applied, organized by finding cluster

---

## 1. Security & Auth Fixes

### 1.1 Auth Guard Fixes (Wave 0)

| Test | Method | Pass Criteria |
|------|--------|---------------|
| Academy enrollment without auth | `curl -X POST /api/v1/academy/enrollments -d {}` | HTTP 401 or 403 returned |
| Global JWT guard — new unprotected endpoint | Create test endpoint without guard annotation, call it | Returns 401 by default |
| Global JWT guard — annotated endpoint | Call annotated endpoint without token | HTTP 401 |
| Account lockout | Attempt 10 failed logins on test account | Account locked after N attempts (N=5-10) |
| Practitioner login includes deviceId | Inspect backend login DTO for deviceId field | deviceId logged/recorded |
| __DEV__ URL allowlist | Inspect production network for DEV-only URL access | DEV URLs rejected in production |
| RolesGuard on GeneralChatConversationsController | Call endpoint as wrong role | HTTP 403 |

### 1.2 Token Security (Wave 0)

| Test | Method | Pass Criteria |
|------|--------|---------------|
| Refresh token httpOnly | Browser DevTools → Application → Cookies → fayed.com | `HttpOnly`, `Secure`, `SameSite=Strict` checked |
| XSS cannot read refresh token | Injected XSS payload: `document.cookie` | Refresh token not in output |
| AsyncStorage tokens on Expo web | If Expo web is production: Inspect localStorage | No plaintext access/refresh tokens |

### 1.3 Audit Logging (Wave 0)

| Test | Method | Pass Criteria |
|------|--------|---------------|
| Login attempt logged | Attempt login success + failure, query audit log | Both events recorded with IP, timestamp, userId |
| Practitioner approval logged | Approve test practitioner, query audit log | Approval event recorded |
| Manual payout logged | Record test payout, query audit log | Payout event recorded |
| OTP verification logged | Attempt OTP flow, query audit log | OTP event recorded |
| Password reset logged | Attempt password reset, query audit log | Reset event recorded |

### 1.4 Admin Permission Gates (Wave 0)

| Test | Method | Pass Criteria |
|------|--------|---------------|
| admin/care-chat/[id] gate | Navigate without admin session | Redirect to login |
| admin/sessions/runtime-inspection gate | Navigate without admin session | Redirect to login |
| admin/refund-policies gate | Navigate without admin session | Redirect to login |
| admin/notifications/[id] gate | Navigate without admin session | Redirect to login |
| AdminPermissionGate shows i18n loading | Navigate to gated page mid-auth | Loading text in current locale, not raw "Loading..." |

---

## 2. i18n / Raw Enum Fixes

### 2.1 Session Status Rendering

| Test | Method | Pass Criteria |
|------|--------|---------------|
| Patient session list in Arabic | Open sessions list in Arabic locale | Status badges in Arabic, not raw enum |
| Practitioner session list in Arabic | Open practitioner sessions in Arabic locale | Status badges in Arabic |
| SessionChatPanel in Arabic | Open session with chat in Arabic locale | Chat header status in Arabic |
| SessionLaneWorkspace in Arabic | Open session lane in Arabic locale | Status in Arabic |
| mapSessionBadge UNDER_REVIEW | Create session in UNDER_REVIEW status | Badge shows correct label, not blank |
| Admin session list badge | View session in admin list | Correct status badge |

### 2.2 Payment Status Rendering

| Test | Method | Pass Criteria |
|------|--------|---------------|
| sessions/success.tsx in Arabic | Complete booking, view success screen in Arabic | Payment status in Arabic |
| Payment return in Arabic | Trigger payment return flow in Arabic locale | Status in Arabic with correct formatting |
| FinancialReconciliation in Arabic | Open reconciliation screen in Arabic | All status labels in Arabic, correct casing |

### 2.3 Notification Type Rendering

| Test | Method | Pass Criteria |
|------|--------|---------------|
| Notification type in Arabic | Open notifications in Arabic locale | Type labels in Arabic, not English strings |
| formatNotificationType in Arabic | Profile notifications screen in Arabic | Type labels in Arabic |
| Support category in Arabic | Open new support ticket in Arabic | Category options in Arabic |

### 2.4 Other i18n Fixes

| Test | Method | Pass Criteria |
|------|--------|---------------|
| formatModeLabel in Arabic | Session detail in Arabic locale | Mode label in Arabic |
| formatFlowTypeLabel in Arabic | Session detail in Arabic locale | Flow type label in Arabic |
| formatRequirementLabel in Arabic | Practitioner dashboard in Arabic | Requirement labels in Arabic |
| Missing JOINABLE/IN_PROGRESS keys | Check en.json and ar.json | Both keys present in both locales |
| cleanReasonText all prefixes | Submit rejection with various prefix formats | All prefixes stripped correctly |

---

## 3. Finance / Payment Fixes

### 3.1 Refund Panel

| Test | Method | Pass Criteria |
|------|--------|---------------|
| Refund amount max cap | Attempt to enter refund > session price | Amount field rejects or caps at session price |
| Refund confirmation dialog | Click "Process Refund" without dialog | Action blocked, confirmation dialog appears |
| Refund with MFA | Attempt large refund (above threshold) | MFA/step-up challenge triggered |

### 3.2 Settlement Management

| Test | Method | Pass Criteria |
|------|--------|---------------|
| Mark-paid confirmation | Click "Mark as Paid" without confirmation | Action blocked, confirmation dialog appears |
| Mark-failed confirmation | Click "Mark as Failed" without confirmation | Action blocked, confirmation dialog appears |

### 3.3 Currency

| Test | Method | Pass Criteria |
|------|--------|---------------|
| Cancel preview currency | View cancel preview for USD session | Amount formatted per currency, not hardcoded EGP |
| FinancialReconciliationScreen | View reconciliation for multi-currency | Correct currency symbols and formatting |

---

## 4. Instant Booking Fixes

### 4.1 Accept Race Condition

| Test | Method | Pass Criteria |
|------|--------|---------------|
| Concurrent accepts | 10 practitioners accept same request simultaneously | 1× HTTP 200, 9× HTTP 409 Conflict, 0× HTTP 500 |
| Race error message | Second accept returns user-friendly message | Not a raw Prisma exception |

### 4.2 Notifications on State Transitions

| Test | Method | Pass Criteria |
|------|--------|---------------|
| Accept → patient notified | Practitioner accepts request | Patient receives push notification |
| Reject → patient notified | Practitioner rejects request | Patient receives push notification |
| Expire → patient notified | Request expires via cron | Patient receives push notification |
| Notification payload PHI | Inspect push payload | No `threadId`, `userId`, `relatedEntityType` |

### 4.3 Cron / Expiration

| Test | Method | Pass Criteria |
|------|--------|---------------|
| Request auto-expires | Create PENDING request, wait past expiry | Status changes to EXPIRED automatically |
| Cron driver configured | Check cron logs or health endpoint | Expiration job fires on schedule |

### 4.4 Price / Booking Flow

| Test | Method | Pass Criteria |
|------|--------|---------------|
| Patient sees price before request | Open instant booking as patient | Price displayed before confirmation |
| Frozen price retrieved on confirm | Complete instant booking | Charged price matches requested price |
| Slot conflict pre-checked | Attempt overlapping availability | Conflict error before confirmation |
| Availability editor blocks conflict | Create overlapping slots in editor | Warning or rejection on save |

### 4.5 Daily Room

| Test | Method | Pass Criteria |
|------|--------|---------------|
| Room expiry matches duration | Create 30-min session, check room expiry | Room expires at session end, not endsAt+7200s |
| Blocked join contract | Attempt to join blocked session | Response contains no roomUrl, roomName, or token |

---

## 5. Notification Routing

### 5.1 Messages Shell Lane

| Test | Method | Pass Criteria |
|------|--------|---------------|
| Session message notification | Receive session message notification | Navigates to Messages Shell → sessions lane |
| Support message notification | Receive support message notification | Navigates to Messages Shell → support lane |
| Follow-up notification | Receive care-chat notification | Navigates to Messages Shell → followup lane |
| /messages/{threadId} via notification | Tap notification with threadId | Goes through Messages Shell, not direct thread |

### 5.2 Push Registration

| Test | Method | Pass Criteria |
|------|--------|---------------|
| Push token with EAS projectId | Check push registration payload | EAS projectId included |
| Logout revokes push token | Log out, check backend | Device token revoked server-side |
| Unread count accuracy | Mark messages read, check count | Count decreases correctly |

---

## 6. Browser / Mobile Smoke Tests

### 6.1 Web (Chrome, Firefox, Safari)

| Test | Method | Pass Criteria |
|------|--------|---------------|
| App loads without console errors | Load app, open DevTools | No red errors in console |
| Session list renders | Navigate to sessions | Sessions load, no blank badges |
| Booking flow completes | Complete full booking | Session created, payment processed |
| Join flow works | Join active session | Daily room opens correctly |
| Arabic locale works | Switch to Arabic, navigate app | RTL layout correct, all text in Arabic |
| Toast provider direction | Arabic mode | Toast appears with correct RTL direction |
| Chat direction | Send message in Arabic mode | Message bubbles aligned correctly RTL |

### 6.2 Mobile (iOS and Android)

| Test | Method | Pass Criteria |
|------|--------|---------------|
| App loads | Cold start | No crash, no blank screen |
| Patient booking flow | Complete session booking | Session created successfully |
| Practitioner instant booking | Accept pending request | Notification sent to patient |
| Notification routing | Tap notification | Navigates to correct screen via Messages Shell |
| Arabic mode | Switch device to Arabic | App direction RTL, text in Arabic |
| SecureStore token storage (iOS) | Inspect keychain | Tokens in Keychain, not NSFileProtection |
| SecureStore token storage (Android) | Inspect keystore | Tokens in hardware-backed keystore (if available) |
| Expo web tokens (if prod) | Inspect localStorage | No plaintext tokens or encrypted storage used |

---

## 7. Admin Surface Checks

| Test | Method | Pass Criteria |
|------|--------|---------------|
| Session list shows flowType | View admin session list | Instant vs scheduled visible in list |
| Instant booking admin panel | Navigate to admin instant booking | Requests visible with accept/reject controls |
| Runtime inspector loads | Open session in inspector | Session data visible, no room token exposed |
| Runtime inspector audit log | Perform action in inspector | Action logged in audit log |
| Notification details panel | Open notification detail | User IDs masked, no raw data |
| Financial reconciliation in Arabic | Open screen in Arabic | All labels in Arabic, correct casing |
| Admin back arrows RTL | Navigate admin in Arabic | Back arrows flip correctly |
| Refund policies route gated | Navigate without admin | Redirect to login |

---

## 8. Release Sign-Off Criteria

### Must Pass Before Any Pilot

- [ ] Academy enrollment requires auth (AUDIT-031)
- [ ] Public DTOs contain no internal UUIDs (AUDIT-032)
- [ ] Refresh token cookie is httpOnly (AUDIT-033)
- [ ] Instant booking accept returns 409, not 500 (AUDIT-010)
- [ ] APP_URL configured (no localhost in push) (AUDIT-062) — 🟡 Implemented — Verification Pending (Phase 9b Sprint 3) — code changes complete; runtime verification required
- [ ] All 5 missing admin permission gates are present (AUDIT-068, 069, 102, 103, 045)
- [ ] Push payloads contain no PHI (AUDIT-057) — 🟡 Implemented — Verification Pending (Phase 9b Sprint 3) — code changes complete; runtime verification required

### Must Pass Before Production Launch

- [ ] No raw `presentationStatus` enum visible in any locale (all AUDIT-085/104/002/012/013/014/017)
- [ ] No raw payment enums on confirmation screen (AUDIT-105)
- [ ] No raw support category enums (AUDIT-106)
- [ ] Notification types display in Arabic (AUDIT-107)
- [ ] Admin refund panel has amount cap and confirmation (AUDIT-003, AUDIT-004)
- [ ] Instant booking notifications sent on all state transitions (AUDIT-024/056)
- [ ] Instant booking cron driver active (AUDIT-030)
- [ ] Account lockout active (AUDIT-039)
- [ ] Audit logging active for all sensitive operations (AUDIT-036, 037, 038, 049, 050)

### Must Pass Before Broad Rollout

- [ ] All i18n keys verified present in both locales
- [ ] RTL layout verified across all screens
- [ ] Loading/error route files added (or deliberate decision documented)
- [ ] No remaining raw enum rendering in any user-facing surface
- [ ] All notification routing verified through Messages Shell
- [ ] Financial reconciliation correct in all locales

---

*QA and validation plan produced by Phase 8 read-only triage. No application code was modified.*
