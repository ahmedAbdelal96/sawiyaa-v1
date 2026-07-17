# Security Auditability Phase 3A

## Scope

Phase 3A standardizes security audit attribution and makes critical privileged-account decisions transactionally auditable. It does not alter session lifecycle, payments, refunds, wallet/ledger, settlements, Academy, chat, booking, or availability behavior.

## Actor convention

Every new audit record should identify an `actorType` and a `source`:

- `USER`: authenticated operator; `actorUserId` is required.
- `SYSTEM`: application-owned action without a user actor.
- `SCHEDULED_JOB`: scheduled worker action.
- `PAYMENT_WEBHOOK`: provider webhook action.
- `MIGRATION`: migration/backfill action.
- `SEED_QA`: explicitly local QA data action.

HTTP actions use `source=HTTP_REQUEST`; request and correlation identifiers are optional and must never contain secrets. Existing records remain readable with nullable new fields.

## Reliability rules

- `recordRequired(tx, entry)` is awaited inside the caller's Prisma transaction. A failed audit write aborts the business transaction.
- `logAsync(entry)` remains best-effort for non-critical observational events.
- Audit persistence is append-only through `SecurityAuditRepository.create`; the application exposes no update, delete, or upsert method.
- Metadata is recursively sanitized, capped at 32 KiB, and excludes credentials, tokens, OTPs, cookies, provider secrets, request bodies, and checkout URLs.

## Covered privileged paths

The following critical operations use required transactional audit writes:

- admin user status changes, with a reason for every disabling status;
- admin internal-role changes, with a reason when an existing role is removed;
- admin session revocation;
- admin token-version invalidation;
- practitioner application approval;
- practitioner application rejection.

Existing self-service and non-critical paths continue to use the best-effort facade until they are explicitly classified for transactional coupling.

## Schema and deployment

Migration: `20260717110000_add_security_audit_actor_context`

It adds nullable actor/source/request fields, the `SecurityAuditActorType` enum, a nullable-safe `SecurityAuditLog.actorUserId` foreign key with `ON DELETE SET NULL`, and a request-time index. The migration is additive and does not rewrite historical audit records.

Before deployment, run the migration status check and a read-only orphan preflight. Apply it only after a verified database backup and disposable clone rehearsal. The local preflight found 393 existing actor references and zero orphan actor IDs, but no migration was applied during this phase because `pg_dump` was not available to create the required backup/clone.

## Out of scope

`IN_PROGRESS` remains excluded from any unrelated lifecycle discussion. This phase makes no session state or sweeper changes and introduces no payment, finance, Academy, chat, booking, availability, or client behavior changes beyond the minimal admin reason fields required by the new backend contract.
