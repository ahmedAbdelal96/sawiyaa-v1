# Sawiyaa Session Code Architecture and Operations

## Status

The cross-platform Session Code audit was performed against the local development workspace on 30 July 2026. No production environment, database record, migration, or lifecycle workflow was changed.

## Canonical identity

- `Session.id` is the internal UUID and remains the identity for relations, API paths, navigation parameters, mutations, React Query keys, cache invalidation, and deep links.
- `Session.sessionCode` is the public operational reference used for display, copying, support communication, reports, and server-side search.
- Canonical format: `S-YYMMDD-NNNN` using Latin digits.
- Example: `S-260729-0042`.

Session Code is not a secret and is not proof of ownership. It must never be used as authentication, authorization, a foreign key, or a replacement for `sessionId`.

## Generation and database invariants

The Backend `SessionCodeGeneratorService` resolves the date in `Africa/Cairo`, atomically increments `session_code_counters`, enforces the maximum sequence `9,999`, and throws typed errors for capacity or generation failures. `SessionRepository.createSession` is the production write boundary: it allocates the code inside the same transaction, writes the Session, and retries bounded unique collisions through savepoints.

The Prisma model keeps `Session.id` as a UUID primary key and `Session.sessionCode` as a required unique `VarChar(32)`. Session Code is immutable after creation. Rescheduling does not regenerate it. The accepted daily capacity is 9,999; overflow is explicit and must not roll over silently.

Typed operational errors:

- `SESSION_CODE_DAILY_CAPACITY_EXCEEDED`
- `SESSION_CODE_GENERATION_FAILED`

Expected handling is structured internal logging and alerting through existing infrastructure. User-facing responses must not expose SQL or internal implementation details, and a failed allocation must not create a partial Session.

## Session creation paths

Production Session creation is centralized through `SessionRepository.createSession`, which calls the generator. Scheduled, package, instant-booking, administrative, and support flows therefore preserve one generator boundary. Seed, QA, test, and backfill utilities are separate and were reviewed as non-production writers. Test fixtures may use simplified legacy-looking values in unit tests; they are not runtime production records.

Backfill is guarded by explicit confirmation and environment flags. It is not run during audit. Existing records were not mutated.

## API, UI, and search policy

Operational contracts expose `sessionCode` alongside the existing UUID where a Session exists. Nullable relations remain nullable; unrelated payments, notifications, and support records do not receive fabricated codes. Presenters map from the persisted Session relation, never from UUID text.

Search is server-side and remains permission-scoped. Exact and prefix searches use the existing Session Code search utility and do not introduce leading-wildcard queries or client-side code-to-UUID resolution. Pagination and ownership/data-scope rules remain unchanged.

Display and copy use Session Code. Routes and identifiers use UUID. Arabic UI renders the code left-to-right. Missing data is rendered explicitly as `Session Code Unavailable` / `كود الجلسة غير متاح`; UUID is never used as a fallback.

## Notifications, messaging, and care chat

Notification payloads keep `sessionId` and add `sessionCode` when a Session relation exists. Older payloads without `sessionCode` remain valid, and deep-link navigation continues to use `sessionId`. Conversation IDs and chat relationship IDs remain distinct from Session Code. No per-row Session lookup was introduced by the rollout.

## Financial safety

Payment, refund, earning-review, settlement, ledger, payout, and reconciliation relations continue to use Session UUIDs. Session Code is display/search/report metadata only. The audit found no Session Code use in amount, currency, exchange-rate, balance, debit/credit, settlement, payout, or reconciliation calculations.

## Support operations

Ask the user for the public code, for example `S-260729-0042`. Search by that code, confirm the caller's authorization, then open the existing UUID-backed route and review the linked records. Do not request an internal UUID during ordinary support. The public code must not bypass identity verification.

## Security and privacy

No public unauthenticated Session lookup was added. Existing patient ownership, practitioner assignment, Admin permissions, Support permissions, and Moderation permissions remain the authorization boundary. Predictability of the code is accepted because the code is not an authorization credential.

## Backfill and rollback

Backfill is an explicitly guarded operational utility and was not executed during this audit. If a confirmed data defect is found, use the reviewed backfill plan with a dry run, explicit environment guard, collision validation, and transaction. Never manually edit counters or change UUIDs/foreign keys. Existing codes are immutable after a successful allocation.

## Scalability

The current `S-YYMMDD-NNNN` format supports 9,999 Sessions per Cairo calendar day. Expansion requires a versioned format decision; old codes must remain immutable and must not be reinterpreted. The current format and timezone were not changed.

## QA status and known limitations

- Backend schema, generator, contracts, search, and targeted suites were audited.
- Admin Web and Patient Web implementation/baseline checks are green.
- Practitioner Web runtime QA is owner-managed because local development OTP delivery is unavailable.
- Mobile automated tests, lint, and Expo Doctor pass. Android/iOS device runtime QA is owner-managed because no emulator/ADB/iOS tooling is available.
- Mobile has 89 pre-existing global TypeScript errors outside the Session Code changes; they are documented separately and were not hidden or attributed to this initiative.

## Troubleshooting

1. If code allocation reaches the daily limit, handle `SESSION_CODE_DAILY_CAPACITY_EXCEEDED` and alert operations.
2. If generation fails, handle `SESSION_CODE_GENERATION_FAILED`; do not retry by inventing a client-side code.
3. If a persisted Session lacks a code, show the explicit missing state and investigate data integrity. Do not expose UUID as a substitute.
4. If a search returns no result, verify whitespace/case normalization and the caller's authorization scope before escalating.

