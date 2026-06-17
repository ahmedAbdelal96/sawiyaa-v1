# Phase 6 Open Questions — Web Patient / Practitioner / Admin UX + Notifications + i18n

**Phase:** 6
**Created:** 2026-06-17
**Questions:** 10

Open questions discovered during Phase 6 that warrant investigation in later phases or before fixes are applied.

---

## i18n / Enum Leakage

### Q-073: What other components render `presentationStatus` as raw text?
**Asked in:** Phase 6 (i18n Leakage — Agent 6)
**Question:** Two locations were confirmed (SessionChatPanel.tsx:355, SessionLaneWorkspace.tsx:134). A broader grep for `replaceAll("_", " ")` or `replace(/_/g,` across all TypeScript files in `fayed-frontend-v1/src` was not performed. How many other components render `presentationStatus` or other backend enums as raw text without `t()`?
**Why it matters:** AUDIT-085 and AUDIT-104 are two confirmed locations, but the codebase may have more. A comprehensive sweep before fixing would establish the full scope of enum leakage.
**Phase:** Phase 6 follow-up or Phase 7
**Status:** Not resolved — requires full-feature grep across all TSX files

---

### Q-074: Are the `FinancialReconciliationScreen` i18n keys actually lowercase in the translation files?
**Asked in:** Phase 6 (i18n Leakage — Agent 6)
**Question:** Agent 6 reported that `FinancialReconciliationScreen.tsx` uses `toLowerCase()` on backend enum values for i18n key lookups, and concluded "if the i18n files use uppercase keys, all these lookups will fail silently." Was the actual i18n key casing verified against the translation files? Are the finance-specific translation files using lowercase keys, making the `toLowerCase()` correct?
**Why it matters:** If the translation files use lowercase keys, AUDIT-098 is not a finding — the code is correct. If they use uppercase, the finding stands and ~20+ financial status labels are silently failing.
**Phase:** Phase 6 evidence review
**Status:** Not resolved — i18n file key casing not verified for finance namespace

---

### Q-082: Does `formatPermissionLabel()` fully translate all PermissionKey values?
**Asked in:** Phase 6 (i18n Leakage — Agent 6)
**Question:** `AdminUserPermissionsScreen.tsx:165-167` uses `formatPermissionLabel(t, row).toLowerCase()` and `row.key.toLowerCase().includes(normalizedSearch)` for search matching. Does `formatPermissionLabel()` return a fully translated string for all `PermissionKey` values? Or does it return the raw enum key for unmapped permissions, resulting in raw backend enum strings appearing in admin search results?
**Why it matters:** If `formatPermissionLabel()` has gaps, admins searching for permissions would see raw enum keys like `"PRACTITIONER_APPLICATIONS_APPROVE"` instead of translated labels. This is similar to AUDIT-097 but in the permissions management context.
**Phase:** Phase 6 evidence review or Phase 7
**Status:** Not resolved — `formatPermissionLabel` implementation not inspected in full

---

## RTL / LTR

### Q-077: Does the `dir="rtl"` hardcoding in toast provider affect animation direction?
**Asked in:** Phase 6 (RTL/LTR — Agent 7)
**Question:** AUDIT-088 found `toast-provider.tsx:9,15` hardcodes `dir="rtl"` regardless of locale. Does this affect only toast positioning (which side of the screen they appear on), or does it also affect the entry/exit animation direction (the slide direction of the toast)?
**Why it matters:** If animation direction is also affected, English users would see reverse-direction animations (e.g., toast slides in from the wrong side), not just wrong positioning. This changes the fix from a one-line `dir` conditional to potentially a more involved animation direction fix.
**Phase:** Phase 6 evidence review
**Status:** Not resolved — animation CSS not inspected for `dir`-dependency

---

### Q-078: Are incoming ChatKit message bubbles also affected by `dir="ltr"`?
**Asked in:** Phase 6 (RTL/LTR — Agent 7)
**Question:** AUDIT-089 found `ChatKit.tsx:262` uses `dir="ltr"` on the outgoing message container. Are incoming message bubbles (from other participants) also affected by the same issue? The finding only explicitly confirmed outgoing messages.
**Why it matters:** If incoming messages are also rendered in a `dir="ltr"` container, Arabic patients reading messages from practitioners (or vice versa) would see incorrect text direction for both incoming and outgoing messages. A more comprehensive ChatKit RTL audit is needed.
**Phase:** Phase 6 evidence review
**Status:** Not resolved — incoming message container direction not verified

---

## Admin / Permissions

### Q-075: Is `providerRoomRef` a secrets-bearing token or an opaque room identifier?
**Asked in:** Phase 6 (Admin UX — Agent 4)
**Question:** AUDIT-095 found `providerRoomRef` exposed in plain text in the admin runtime inspector attendance timeline. Is this field a Daily.co room name (public information), a join token (sensitive), or something else? The answer determines whether AUDIT-095 is a P1 secrets exposure or a P2 diagnostic leak.
**Why it matters:** If `providerRoomRef` is a room name, it may be acceptable to display in the admin timeline (room names are not secrets). If it is a join token or contains embedded credentials, it is a P1 session hijacking vector.
**Phase:** Phase 6 backend audit or Phase 7
**Status:** Not resolved — `providerRoomRef` origin and content not traced to backend

---

### Q-080: Is the absence of dedicated patient/practitioner notification pages intentional?
**Asked in:** Phase 6 (Notifications UX — Agent 5)
**Question:** No `patient/notifications` or `practitioner/notifications` page routes were found. Patients and practitioners access notifications exclusively via the `UserNotificationDropdown` bell icon component. Is this an intentional design decision (dropdown-only model), or are there pending designs/specs for a notification center?
**Why it matters:** If the dropdown-only model is intentional, there is no issue. If notification center pages were planned but not implemented, patients have no deep-linkable, shareable URL for a specific notification. This affects notification sharing and deep-linking workflows.
**Phase:** Phase 6 product/design review
**Status:** Not resolved — design intent not verified

---

## Session Chat / Messages

### Q-081: What is the origin of `sessionStatusLabel` in `SessionLaneThread.tsx`?
**Asked in:** Phase 6 (Practitioner UX — Agent 3)
**Question:** Agent 3 flagged `SessionLaneThread.tsx:165` as UNKNOWN — the `sessionStatusLabel` prop is passed from a parent component. If the caller passes a raw enum value (not passed through `t()`), that would be a third location for raw `presentationStatus` enum leakage in the session messaging lane.
**Why it matters:** If the caller passes a raw enum, AUDIT-085/104 has a third manifestation in the practitioner's session sidebar. If the caller already uses `t()`, there is no issue.
**Phase:** Phase 6 evidence review
**Status:** Not resolved — `sessionStatusLabel` prop origin not traced from caller chain

---

## Notifications

### Q-079: Does `bodySnapshot` ever contain user-supplied HTML?
**Asked in:** Phase 6 (Notifications UX — Agent 5)
**Question:** `sanitizeNotificationDisplayText()` strips/redacts full-URL text blocks but does not escape HTML entities. If `bodySnapshot` contains user-supplied content that includes HTML tags (e.g., from a support message body), those would be rendered by React as actual HTML (not escaped) unless `dangerouslySetInnerHTML` is used. The finding noted React escapes string children, but `sanitizeNotificationDisplayText` is a text transformation, not an HTML escape.
**Why it matters:** If `bodySnapshot` can contain HTML, the notification detail panel could be vulnerable to stored XSS. If it cannot (backend always sanitizes before storing), the finding is not a security issue.
**Phase:** Phase 6 backend audit
**Status:** Not resolved — backend notification body content construction not inspected

---

## Cross-Phase Questions (Deferred)

| Question | Phase assigned | Reason |
|----------|---------------|--------|
| Q-051: Daily.co join token server-side expiry | Phase 7 (Backend) | Token expiry configuration not inspected |
| Q-055: Care-chat API ownership validation | Phase 7 (Backend) | Requires endpoint behavior testing |
| Q-059: Practitioner unread count channel breakdown | Phase 7 (Mobile) | Practitioner notification query not inspected |
| Q-063: EAS projectId in production builds | Phase 7 (Mobile) | Expo build config not verified |
| Q-066: Practitioner notification count same IN_APP-only issue? | Phase 7 (Mobile) | Same pattern as AUDIT-059 on patient |
| Q-069: SecurityAuditLog retention period | Phase 7 (Backend) | GDPR/data retention policy not verified |

---

## Resolved Questions

*No questions resolved in Phase 6.*

---

*Open questions produced by Phase 6 read-only audit. No application code was modified.*
