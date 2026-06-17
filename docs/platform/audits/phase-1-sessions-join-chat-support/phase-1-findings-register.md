# Phase 1 Findings Register — Sessions / Join / Chat / Support

**Phase:** 1
**Created:** 2026-06-16
**Total findings:** 2 | Open: 2 | Closed: 0

---

## Finding AUDIT-001

**Finding ID:** AUDIT-001
**Title:** Embedded session chat header shows raw `presentationStatus` text
**Severity:** P2
**Module:** Sessions / Session Chat
**Affected users:** Patients and practitioners using embedded session chat (messages shell)
**Affected surfaces:**
- `/patient/messages` (SessionLaneThread embedded chat)
- `/practitioner/messages` (SessionLaneThread embedded chat)

**Evidence:**
`fayed-frontend-v1/src/features/chat/components/SessionChatPanel.tsx` line 354–356:

```tsx
actions={
  <div className="flex items-center gap-2">
    <span className="rounded-full bg-teal-50/70 border border-teal-100/30 px-2.5 py-0.5 text-[10px] font-bold text-teal-700 dark:bg-teal-950/40 dark:text-teal-400">
      {session?.presentationStatus.replaceAll("_", " ")}
    </span>
  </div>
}
```

The raw `presentationStatus` string (e.g., `"IN_PROGRESS"`, `"NO_SHOW"`, `"UNDER_REVIEW"`) has underscores replaced but is still displayed directly as text content. This bypasses the i18n system entirely.

**Root cause hypothesis:** The embedded chat header was implemented as a quick debug/display mechanism and the `presentationStatus` was displayed raw because the `admin-session-runtime` i18n namespace was being used in the surrounding component for other fields, but the developer did not connect this particular field to i18n. The `t("statuses.${item.status}")` pattern used in the admin runtime inspector was not applied here.

**Risk:** When a session is in `NO_SHOW` or `UNDER_REVIEW` state, users see `"NO_SHOW"` or `"UNDER_REVIEW"` as a raw badge label in the embedded chat header instead of translated text. While this is a secondary UI element (not the primary status badge), it still represents enum leakage and breaks the Clinical Warmth i18n rule.

**Smallest safe next step:** Replace `{session?.presentationStatus.replaceAll("_", " ")}` with a call to `useTranslations("sessions")` and use the key `presentationStatus.${session?.presentationStatus}`. Since this is an embedded panel that uses `useTranslations("sessions")` already (line 71), the fix is:

```tsx
<span className="rounded-full ...">
  {t(`presentationStatus.${session?.presentationStatus}` as Parameters<typeof t>[0])}
</span>
```

Or alternatively, use the `presentationHints` key that already exists for secondary status descriptions: `t(\`list.presentationHints.${session?.presentationStatus}\` as Parameters<typeof t>[0])`.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-002

**Finding ID:** AUDIT-002
**Title:** Admin sessions list `SessionStatusBadge` missing `presentationStatus` prop
**Severity:** P2
**Module:** Sessions / Admin
**Affected users:** Admins viewing the sessions list table
**Affected surfaces:** `/admin/sessions` (AdminSessionsListScreen)

**Evidence:**
`fayed-frontend-v1/src/features/admin/sessions/components/AdminSessionsListScreen.tsx` line 747–748:

```tsx
<td className="px-4 py-4 sm:px-6">
  <div className="flex flex-wrap items-center gap-2">
    <SessionStatusBadge status={row.status} />
    {row.isDelayed ? (
      <AdminStatusBadge tone="danger">
        {locale === "ar" ? "متأخرة" : "Delayed"}
      </AdminStatusBadge>
    ) : null}
  </div>
</td>
```

`SessionStatusBadge` is called with only `status={row.status}` but not `presentationStatus={row.presentationStatus}`. The component's behavior when `presentationStatus` is omitted falls back to displaying the raw `status` enum through the `status.${displayStatus}` i18n path, which is less descriptive than the `presentationStatus` path.

**Root cause hypothesis:** The admin sessions list was built before `presentationStatus` was added as a field to the admin session list item type, or the developer added the `presentationStatus` field later but did not update this particular call site. The pattern used in the patient and practitioner list panels (which both pass both `status` and `presentationStatus` props) was not applied here.

**Risk:** The admin sessions list shows the raw session lifecycle status (e.g., `CONFIRMED`, `PENDING_PAYMENT`) rather than the presentation status (e.g., `JOINABLE`, `IN_PROGRESS`, `NO_SHOW`). For sessions that are `READY_TO_JOIN` or `IN_PROGRESS`, the admin would see `READY_TO_JOIN` or `IN_PROGRESS` as the badge label, which is correct — but for sessions in terminal states that have a different `presentationStatus` than their raw `status`, the badge is misleading. For example, a session with `status: CONFIRMED` but `presentationStatus: NO_SHOW` (after a no-show decision) would display as "Confirmed" rather than "No-show".

**Smallest safe next step:** Add `presentationStatus={row.presentationStatus}` to the `SessionStatusBadge` call on line 748:

```tsx
<SessionStatusBadge status={row.status} presentationStatus={row.presentationStatus} />
```

This is a single-prop addition with no side effects — the component already supports this prop.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Open Findings

| ID | Title | Severity | Module |
|----|-------|----------|--------|
| AUDIT-001 | Embedded session chat header shows raw `presentationStatus` text | P2 | Sessions / Session Chat |
| AUDIT-002 | Admin sessions list `SessionStatusBadge` missing `presentationStatus` prop | P2 | Sessions / Admin |

---

## Closed Findings

_No findings closed in Phase 1._

---

## Findings by Phase

| Phase | Open | Closed | Total |
|-------|------|--------|-------|
| Phase 0 | 0 | 0 | 0 |
| Phase 1 | 2 | 0 | 2 |
| Phase 2 | 0 | 0 | 0 |
| Phase 3 | 0 | 0 | 0 |
| Phase 4 | 0 | 0 | 0 |
| Phase 5 | 0 | 0 | 0 |
| Phase 6 | 0 | 0 | 0 |
| Phase 7 | 0 | 0 | 0 |
| Phase 8 | 0 | 0 | 0 |
| Phase 9 | 0 | 0 | 0 |
| **Total** | **2** | **0** | **2** |