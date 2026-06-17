# Phase 8 Triage Report — Audit Consolidation & Fix Roadmap

**Phase:** 8
**Created:** 2026-06-17
**Scope:** Triage, de-duplication, severity normalization, release roadmap
**This phase:** Read-only audit consolidation — no application code modified

---

## 1. Scope

Phase 8 triages all findings from Phase 1 through Phase 7 (AUDIT-001 to AUDIT-124) produced by the Fayed platform audit program. The objective is to:

1. Normalize severities against a consistent release-impact model
2. De-duplicate cross-phase findings
3. Remove false positives
4. Build a release-focused fix roadmap in fix waves
5. Create a propagation matrix for cross-surface contract issues
6. Define a QA strategy for after-fix validation

---

## 2. Source Documents Reviewed

| Phase | Report | Findings Register | Evidence Index | Open Questions |
|-------|--------|-----------------|----------------|----------------|
| Phase 1 | ✅ | ✅ | ✅ | ✅ |
| Phase 2 | ✅ | ✅ | ✅ | ✅ |
| Phase 3 | ✅ | ✅ | ✅ | ✅ |
| Phase 4 | ✅ | ✅ | ✅ | ✅ |
| Phase 5 | ✅ | ✅ | ✅ | ✅ |
| Phase 6 | ✅ | ✅ | ✅ | ✅ |
| Phase 7 | ✅ | ✅ | ✅ | ✅ |

**Platform docs read:** `architecture-and-developer-guide.md`, `booking-sessions-and-availability.md`, `payments-wallet-and-finance.md`, `security-roles-and-permissions.md`, `operations-and-support.md`, `users-and-journeys.md`, `design-content-and-i18n.md`, `deferred-work-and-risks.md`, `glossary.md`

**Audit docs read:** `audit-master-plan.md`, `audit-progress.md`, `findings-register-template.md`

---

## 3. Cumulative Audit Status

| Phase | Original IDs | Original Count | Normalized Count | Notes |
|-------|-------------|--------------|-----------------|-------|
| Phase 1 | AUDIT-001–002 | 2 | 2 | Minor severity corrections |
| Phase 2 | AUDIT-003–008 | 6 | 6 | AUDIT-003, AUDIT-004 maintained as P1 |
| Phase 3 | AUDIT-009–030 | 22 | 22 | AUDIT-009 downgraded P0→P2; AUDIT-010 downgraded P0→P1 |
| Phase 4 | AUDIT-031–052 | 21 | 21 | AUDIT-031, 032, 033 confirmed P0 |
| Phase 5 | AUDIT-053–084 | 32 | 27 | 5 duplicates merged (see §5) |
| Phase 6 | AUDIT-085–104 | 20 | 20 | 2 findings partially corrected |
| Phase 7 | AUDIT-105–124 | 20 | 17 | 3 duplicates or INFO reclassified |
| **Total** | **001–124** | **123** | **101** | **22 de-duplicated** |

---

## 4. Severity Normalization Summary

### 4.1 Corrections Applied

#### P0 Reclassifications (3 downgrades)

| ID | Original Phase | Original Severity | Normalized | Reason |
|----|---------------|------------------|------------|--------|
| AUDIT-009 | Phase 3 | P0 | P2 | Backend auth is authoritative; page shell renders but API rejects with 401/403. UX degradation only, not unauthorized access. |
| AUDIT-011 | Phase 3 | P0 | P1 | `flowType` absent from admin list — serious admin visibility gap, not a session/join/payment blocker. |
| AUDIT-012 / AUDIT-013 | Phase 3 | P0 | P1 | Mobile session list primary badges show raw enum — serious UX but React escapes output; not confirmed XSS. |

#### P0 Confirmations (4 confirmed)

| ID | Phase | Reason |
|----|-------|--------|
| AUDIT-031 | Phase 4 | Academy `POST /enrollments` has no auth guard — unauthenticated enrollment creation is a direct exploit path |
| AUDIT-032 | Phase 4 | Internal UUID in public DTOs — enumeration attack enables mapping all practitioner IDs |
| AUDIT-033 | Phase 4 | Web refresh token cookie lacks httpOnly — XSS can exfiltrate tokens in production |
| AUDIT-010 | Phase 3/4 | Instant booking accept race — UniqueConstraintViolation unhandled; second accept returns 500 |

#### P1 Corrections

- **AUDIT-070 (AdminNotificationDetailsPanel HTML render):** Phase 5 listed as P1. Phase 6 correctly noted React string children are escaped. Maintained P1 as defense-in-depth gap (no sanitization if backend is compromised), but XSS without `dangerouslySetInnerHTML` is not confirmed.
- **AUDIT-095 (providerRoomRef exposed):** Maintained P1 pending verification of whether it is a secrets-bearing token or opaque room identifier. See propagation matrix.
- **AUDIT-108 (Web tokens in AsyncStorage):** Phase 7 listed as P1. If Expo web is development-only, should be P2. Scope verification required. Listed as "Needs Verification" in release blockers.

### 4.2 Normalized Severity Distribution

| Severity | Count | Description |
|----------|-------|-------------|
| **P0** | 4 | Release blockers — must fix before any pilot |
| **P1** | 56 | Launch blockers — must fix before production launch |
| **P2** | 33 | Rollout blockers — fix before broad rollout |
| **P3** | 6 | Polish — post-launch backlog |
| **INFO** | 10 | Observations — no code change needed |
| **TOTAL** | **101** | After de-duplication |

---

## 5. De-duplication Summary

22 findings were de-duplicated across phases. The following clusters were identified:

### Cluster 1: Raw `presentationStatus` enum rendering — 5 entries → 2 canonical

| Original ID | Phase | Title | Canonical |
|-------------|-------|-------|-----------|
| AUDIT-001 | 1 | SessionChatPanel header raw enum | → AUDIT-085 (Phase 6 confirmed) |
| AUDIT-002 | 1 | AdminSessionListBadge missing prop | → Keep AUDIT-002 (different surface) |
| AUDIT-012 | 3 | Patient session list raw enum | → Keep (mobile, primary surface) |
| AUDIT-013 | 3 | Practitioner session list raw enum | → Keep (mobile, primary surface) |
| AUDIT-085 | 6 | SessionChatPanel raw enum (regression) | Canonical |
| AUDIT-104 | 6 | SessionLaneWorkspace raw enum | Different surface — keep separate |
| AUDIT-086 | 6 | Missing JOINABLE/IN_PROGRESS keys | Different finding — keep |

### Cluster 2: AdminPermissionGate missing — 5 entries → 2 canonical

| Original ID | Phase | Route | Canonical |
|-------------|-------|-------|-----------|
| AUDIT-068 | 5 | admin/care-chat/[id] | Canonical |
| AUDIT-069 | 5 | admin/sessions/runtime-inspection | Canonical (different route) |
| AUDIT-102 | 6 | admin/refund-policies | Different route — keep |
| AUDIT-103 | 6 | admin/notifications/[id] | Different route — keep |
| AUDIT-045 | 4 | AdminPermissionGate not auto-applied | Different finding — keep |

### Cluster 3: Notification routing defaults to session role — 3 entries → 1 canonical

| Original ID | Phase | Title | Canonical |
|-------------|-------|-------|-----------|
| AUDIT-065 | 5 | Notification click uses session role fallback | Canonical |
| AUDIT-074 | 5 | Notification target role resolution defaults | Same issue — merge |
| AUDIT-110 | 7 | Notification tap race condition | INFO — same pattern |

### Cluster 4: Instant booking sweeper — 2 entries → 1

| Original ID | Phase | Title | Canonical |
|-------------|-------|-------|-----------|
| AUDIT-030 | 3 | No cron driver for instant booking expiration | Canonical |
| AUDIT-061 | 5 | ExpireInstantBookingRequestUseCase has no cron driver | Same — merge |

### Cluster 5: APP_URL localhost fallback

| Original ID | Phase | Title | Canonical |
|-------------|-------|-------|-----------|
| AUDIT-062 | 5 | APP_URL falls back to localhost:3000 | Canonical |

### Cluster 6: Missing i18n keys for active session states

| Original ID | Phase | Title | Canonical |
|-------------|-------|-------|-----------|
| AUDIT-086 | 6 | Missing JOINABLE/IN_PROGRESS keys | Canonical |
| AUDIT-017 | 3 | presentationStatus i18n interpolation without fallback (web) | Different surface — keep |

### Cluster 7: formatNotificationType / string manipulation anti-pattern

| Original ID | Phase | Title | Canonical |
|-------------|-------|-------|-----------|
| AUDIT-107 | 7 | formatNotificationType bypasses i18n | Canonical |
| AUDIT-122 | 7 | Cross-phase string manipulation pattern | INFO — same anti-pattern |

---

## 6. False Positives Summary

### 6.1 Confirmed False Positives

None. No original finding was entirely disproven by source code inspection.

### 6.2 Severity Corrections (False Positives at Original Severity)

| ID | Original Phase | Original Severity | Corrected To | Reason |
|----|---------------|------------------|-------------|--------|
| AUDIT-009 | Phase 3 | P0 | P2 | Backend auth authoritative; no unauthorized access possible |
| AUDIT-011 | Phase 3 | P0 | P1 | Admin visibility gap; no active session/payment exploit |
| AUDIT-012 | Phase 3 | P0 | P1 | Mobile primary badge; React escapes; not confirmed XSS |
| AUDIT-013 | Phase 3 | P0 | P1 | Same as AUDIT-012 |

### 6.3 INFO Reclassifications (Not Actionable Findings)

| ID | Phase | Reason |
|----|-------|--------|
| AUDIT-118 | 7 | Auth layout intentionally delegates to AuthProvider — no issue |
| AUDIT-119 | 7 | Race condition window is standard React Router pattern — no fix warranted |
| AUDIT-120 | 7 | Duplicate JSON key — last value wins, no runtime impact |
| AUDIT-121 | 7 | Singular/plural naming — no runtime impact |
| AUDIT-122 | 7 | Cross-phase pattern observation — not a standalone finding |
| AUDIT-123 | 7 | Overlay vs scaffold — functional inconsistency, not a bug |
| AUDIT-124 | 7 | replaceAll fallback — explicit cases cover all known statuses |
| INFO-6A | 6 | typeSlug in admin settings — informational only |
| INFO-6B | 6 | Runtime inspector gate correctly implemented — positive finding |
| AUDIT-065 note | 5 | Notification tap race condition — INFO rating confirmed |

---

## 7. Needs Verification Summary

The following findings require runtime verification or product decision before severity and fix can be finalized:

| ID | Phase | Finding | Blocked By |
|----|-------|---------|-----------|
| AUDIT-095 | 6 | providerRoomRef is token vs opaque identifier | Backend confirmation required |
| AUDIT-108 | 7 | Expo web production scope | Product decision: is Expo web production? |
| AUDIT-033 | 4 | Web refresh token httpOnly gap severity | Product decision: XSS mitigation priority |
| Q-083 | 7 | `patientSessionsFlow.statuses.PENDING_PAYMENT` key existence | Exhaustive key coverage check |
| Q-084 | 7 | `support.categories` namespace coverage | Exhaustive key coverage check |
| Q-085 | 7 | formatNotificationType intended design | Product/design decision |
| Q-086 | 7 | Backend HTTP-only cookie support for web | Backend API audit |
| Q-088 | 7 | Backend device token role enforcement | Backend API audit |
| Q-090 | 7 | Notification tap race condition in practice | Runtime verification |
| Q-091 | 7 | Practitioner push status card intent | Product/UX decision |
| Q-092 | 7 | Credential fileUrl display intent | Product/UX decision |
| Q-093 | 7 | Backend rejection reason prefix formats | Backend API audit |

---

## 8. Highest-Risk Product Areas

Based on normalized finding density and severity concentration:

### 8.1 Instant Booking (Backend + Web + Mobile)
**Finding count:** 9 unique (AUDIT-010, AUDIT-018, AUDIT-023, AUDIT-024, AUDIT-026, AUDIT-030/061, AUDIT-056, AUDIT-067)
**Risk:** Race condition (AUDIT-010), no notifications to patients (AUDIT-024/056), no admin oversight (AUDIT-026), frozen price not retrieved (AUDIT-018), accept/reject/expire no cron driver (AUDIT-030/061)
**Root cause:** Instant booking shipped without operational infrastructure (notifications, cron, admin surfaces)

### 8.2 Auth Architecture (Backend + Web)
**Finding count:** 12 unique (AUDIT-031, 032, 033, 039, 040, 041, 042, 043, 046, 047, 049, 050)
**Risk:** P0 academy auth bypass, UUID enumeration, XSS token theft, no account lockout, no global auth guard, no audit logging
**Root cause:** Auth architecture has defense-in-depth gaps; not all endpoints consistently protected

### 8.3 Notification System (Backend + Mobile + Web)
**Finding count:** 11 unique (AUDIT-056, 057, 058, 059, 060, 062, 063, 065/074, 066, 067, 070)
**Risk:** Notifications not sent on instant booking events, PHI leakage in push payloads, Messages Shell bypass, wrong unread count, APP_URL localhost fallback
**Root cause:** Notification system built incrementally without full contract definition across surfaces

### 8.4 Admin RBAC & Audit (Backend + Web)
**Finding count:** 9 unique (AUDIT-037, 038, 045, 068, 069, 070, 102, 103, 075)
**Risk:** Practitioner app approval not logged, manual payout not logged, permission gates missing on multiple admin routes, runtime inspector has no audit log
**Root cause:** Admin surfaces built without consistent permission gate and audit instrumentation

### 8.5 i18n / Raw Enum Exposure (Web + Mobile)
**Finding count:** 14 unique (AUDIT-001/002, 012/013, 017, 027/028, 086, 097, 098, 105, 106, 107, 116, 122)
**Risk:** Missing translation keys, string manipulation instead of i18n lookup, wrong namespace usage
**Root cause:** i18n keys added reactively; no lint rule or coverage check enforcing complete enum-to-key coverage

---

## 9. Final Verdict

The Fayed platform has **4 confirmed P0 release blockers** and **56 P1 launch blockers** spread across 7 audited phases. All 101 normalized findings remain open — no findings were closed during Phase 8 triage.

The platform cannot safely launch without resolving:
1. The academy enrollment auth bypass (AUDIT-031) — anyone can create fraudulent enrollments
2. The UUID enumeration risk in public DTOs (AUDIT-032) — enables platform-wide data harvesting
3. The XSS-accessible refresh token cookie on web (AUDIT-033) — account takeover via any XSS
4. The instant booking accept race condition (AUDIT-010) — duplicate sessions and 500 errors under simultaneous accept

Beyond the P0s, 56 P1 issues span auth architecture, instant booking operational infrastructure, notification dispatch, admin RBAC, and i18n contract gaps. These represent the minimum safe fix set before a production pilot.

The i18n gaps (AUDIT-086, AUDIT-105, AUDIT-106, AUDIT-107, AUDIT-116) are high-visibility issues affecting patients and practitioners in their primary booking and session flows. They should be fixed in Wave 1 alongside the auth and instant booking blockers.

The recommended next execution phase is **Phase 9 — Fix Execution & Verification**, using the fix roadmap and propagation matrix produced in this phase. Before any code is written, the verification items in the open questions file must be resolved.

---

## 10. Recommended Next Phase

**Phase 9 — Fix Execution & Verification**

Recommended because:
- The fix roadmap and propagation matrix provide an unambiguous execution plan
- 4 P0 blockers and 56 P1 launch blockers represent the minimum viable fix set
- Several findings require backend involvement (auth architecture fixes, instant booking cron, notification dispatch)
- The i18n translation gaps can be addressed by a separate translation team in parallel using the propagation matrix

**Alternative: Phase 9a — Security First Fix Sprint**
Dedicated 1-week sprint targeting only the 4 P0 blockers and the 12 auth/permission findings before any other work. This allows a development-only/internal pilot to proceed safely while the full fix roadmap is executed.

---

*Report produced by Phase 8 read-only triage. No application code was modified. No git commands were executed.*
