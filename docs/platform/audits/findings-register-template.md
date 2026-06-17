# Findings Register — Template

**Phase:** 0 — Audit Master Plan
**Created:** 2026-06-16

This document defines the standard format for every audit finding discovered in Phase 1 and beyond. All findings must be registered here before they are fixed. No fix is applied during audit phases unless separately approved.

---

## Finding format

Every audit finding must include all fields below. Findings that omit required fields are returned to the auditor for completion.

```
Finding ID:   [AUDIT-XX]        ← Sequential, assigned at registration
Title:        [Short descriptive title]
Severity:     [P0 | P1 | P2 | P3]  ← See severity rules below
Module:       [Module name from module inventory]
Affected users: [Who experiences this — patients, practitioners, admins, all]
Affected surfaces: [Specific web, mobile, or admin routes/screens]
Evidence:     [File path and line, or DOM selector, or API response excerpt]
Root cause hypothesis: [What the auditor believes is the cause]
Risk:         [One paragraph on what goes wrong if this is not fixed]
Smallest safe next step: [The minimal change that addresses the finding without side effects]
Do not fix yet: yes    ← Must be "yes" for all Phase 0 findings
Fixed in phase: [Phase number when this was resolved, e.g. Phase 1]
Resolution summary: [Brief note on how it was resolved]
```

---

## Severity rules

| Severity | When to use | Examples |
| -------- | ----------- | -------- |
| **P0** | Platform is unusable, login is broken, payment is wrong, session join is accessible before backend authorizes it, or a raw enum is visible as user-facing text in a critical path | Login returns 500 for all users; payment amount differs from backend; Join CTA visible before `canJoin=true`; `NO_SHOW` visible as raw text on session detail |
| **P1** | A core journey is broken or a user can be meaningfully misled | Status badge shows raw backend enum; Join CTA hidden when it should be visible; booking creates a session with wrong price; Arabic translation missing on a primary label |
| **P2** | Important UX degradation or data inconsistency that does not block the journey | Dashboard metric off by a small amount; list filter state unclear; timezone shown in fixed offset instead of IANA name; loading state shows raw loading indicator |
| **P3** | Polish, cleanup, or future improvement | Unused import in a feature file; inconsistent spacing in UI cards; a copy string that differs slightly from the approved platform tone |

---

## Example finding

```
Finding ID:   AUDIT-001
Title:        Session detail shows raw NO_SHOW enum in Arabic locale
Severity:     P1
Module:       Sessions / Join / Daily
Affected users: Patients viewing session detail in Arabic
Affected surfaces: /ar/patient/sessions/[id]
Evidence:     DOM inspection at http://localhost:3000/ar/patient/sessions/abc123
              shows text content "NO_SHOW" instead of "لم يحضر"
Root cause hypothesis: The i18n key sessions.practitioner.detail.presentation.NO_SHOW
                       was added to sessions.json but the practitioner detail screen
                       reads from a different namespace that was not updated.
Risk:         Arabic-speaking patients see a technical enum instead of a human-readable
              label, which breaks trust and may cause them to contact support.
Smallest safe next step: Add the missing translation key to
                         messages/ar/sessions.json under the correct namespace
                         used by the practitioner detail screen.
Do not fix yet: yes
Fixed in phase:
Resolution summary:
```

---

## Evidence requirements

A finding without evidence is not a finding — it is a guess. Evidence must be one of:

- **File path and line number** — for source code issues
- **DOM selector and visible text** — for UI rendering issues (attach screenshot or quote the page text)
- **API response excerpt** — for backend contract issues (attach JSON or quote the key field)
- **Route/URL and observed behavior** — for routing or navigation issues
- **Translation file key and locale** — for i18n gaps

Evidence must be specific enough that another team member can reproduce the finding without additional context.

---

## Do-not-fix-during-audit rule

**No finding is fixed during the audit phase in which it is discovered.** The audit registers the finding and continues. Fixes are approved separately through the change control process.

Exceptions:

- A P0 that is actively causing data loss, financial incorrectness, or a security breach may be escalated immediately for an emergency fix. This escalation must be documented in the findings register with a note explaining why the normal process was bypassed.
- Minor P3 findings that take less than five minutes to fix and have zero chance of side effects may be fixed inline with a note in the resolution summary. This is at auditor discretion and must be declared before fixing.

All other findings wait for the formal fix phase.

---

## Registration process

1. Auditor discovers a finding during a deep audit phase.
2. Auditor completes the full finding format, including evidence.
3. Auditor verifies the finding has not already been registered (check AUDIT-### sequence).
4. Auditor assigns the next sequential AUDIT-### number.
5. Auditor updates this file with the new finding.
6. Auditor updates `audit-progress.md` to reflect the new finding count and open items.
7. Auditor does not fix the finding during the current audit phase unless an exception applies.

---

## Open findings

_No findings registered yet. This register begins empty at Phase 0 and is populated as findings are discovered in Phase 1 and beyond._

---

## Closed findings

_No findings closed yet._

---

## Findings by phase

| Phase | Open | Closed | Total |
| ----- | ---- | ------ | ----- |
| Phase 0 | 0 | 0 | 0 |
| Phase 1 | 0 | 0 | 0 |
| Phase 2 | 0 | 0 | 0 |
| Phase 3 | 0 | 0 | 0 |
| Phase 4 | 0 | 0 | 0 |
| Phase 5 | 0 | 0 | 0 |
| Phase 6 | 0 | 0 | 0 |
| Phase 7 | 0 | 0 | 0 |
| Phase 8 | 0 | 0 | 0 |
| Phase 9 | 0 | 0 | 0 |
| **Total** | **0** | **0** | **0** |