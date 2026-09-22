# Superseded: Session automatic completion

This document describes the retired automatic-completion design and is kept
only as historical context. Session completion authority is now Admin-only.

The supported lifecycle is:

`active session -> expiry sweeper -> AWAITING_COMPLETION_CONFIRMATION -> Admin manual decision -> COMPLETED`

Attendance reconciliation, evaluator output, provider evidence, and audit
timelines remain advisory inputs. They do not transition a session to a final
outcome. For current behavior, see the Admin session operations contract and
the session resolution-case runbook.
