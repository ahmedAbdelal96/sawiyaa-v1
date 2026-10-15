# Automatic Session Completion Fix

## Goal

Restore the normal session lifecycle from elapsed active sessions to `COMPLETED` when trusted attendance evidence satisfies the existing outcome policy, while preserving `AWAITING_COMPLETION_CONFIRMATION` as an exception/review state.

## Constraints

- Reuse `CompleteSessionTransactionService` for every completion.
- Do not complete from `meeting.ended` alone.
- Do not change Prisma schema, migrations, financial rules, package behavior, no-show rules, or provider attendance semantics.
- Do not require the optional queue worker for the core lifecycle.
- Preserve unrelated working-tree changes and do not commit, push, or deploy in this task.

## Implementation steps

1. Add failing focused tests for an automatic completion attempt: complete only when the existing attendance evaluator exposes a normal completion candidate; retain awaiting for missing evidence, one participant, early closure, no-show candidates, and review blockers; use the canonical transaction service and tolerate completion races idempotently.
2. Implement a reusable automatic completion attempt service that claims eligible active sessions into awaiting confirmation, evaluates trusted attendance, and invokes `CompleteSessionTransactionService` only for a safe completed outcome.
3. Wire the existing mandatory API sweeper to run the attempt after its claim and wire `meeting.ended` as an immediate evaluation trigger without treating the provider event as completion evidence by itself.
4. Keep the optional reconciliation queue as evidence backfill only; the lifecycle remains recoverable through the API sweeper when the queue is disabled or unavailable.
5. Run focused backend tests, typecheck, targeted lint, i18n/UX-copy checks where applicable, `git diff --check`, and the disposable PostgreSQL integration if a real test database is available.
6. Write the required closure artifact with the verified root cause, lifecycle rule, evidence policy, configuration audit, test results, and remaining conditions.

## Verification

- Confirm no Prisma schema or migration changes.
- Confirm only Platform Settings pre-existing changes remain outside this task and are not staged.
- Confirm the authenticated visual QA artifact remains present.
- Do not claim readiness until fresh command output supports it.
