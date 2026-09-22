# Session financial lifecycle audit — 2026-09-08

Status: implementation and isolated verification complete. Scope: backend and web; mobile excluded. Existing working-tree edits are not the audit's changes.

## A. Actual architecture and call paths

All backend paths below are relative to `sawiyaa-backend-v1/src/modules/`. PostgreSQL schema: `sawiyaa-backend-v1/prisma/schema.prisma`. Authoritative money uses Prisma.Decimal (decimal.js), PostgreSQL numeric(18,2), and gateway integer minor units.

| Stage | Actual implementation and persistence |
|---|---|
| Scheduled booking | `sessions/use-cases/create-scheduled-session.use-case.ts` validates visibility, duration, availability, collisions; `sessions/repositories/session.repository.ts#createSession` allocates unique codes and creates Session BEFORE payment. Reservation expires after configured period. |
| Instant booking | `instant-booking/use-cases/create-instant-booking-request.use-case.ts`, `accept-instant-booking-request.use-case.ts`, `services/create-session-from-instant-booking.service.ts`; InstantBookingRequest metadata contains duration/currency quote snapshots. |
| Quote and coupons | `financial-rules/services/calculate-session-financial-breakdown.service.ts`, `resolve-commission-rule.service.ts`, `calculate-coupon-discount.service.ts`, `validate-coupon-eligibility.service.ts`; CommissionRule, Coupon, CouponRedemption. Net is gross less discount; commission applies to net, regardless of funding. |
| Checkout | `payments/use-cases/initiate-session-payment.use-case.ts`, PaymentSessionRepository, PaymentRepository; Payment decimal snapshots, VAT/fee snapshots, financialBreakdown JSON, RefundPolicyAcceptance. Corporate sponsorship can replace customer payable amount. |
| Wallet funding | `customer-wallets/services/customer-wallet-accounting.service.ts`; CustomerWallet (patient/currency unique), CustomerWalletReservation (payment unique), CustomerWalletEntry. Reserve moves available to reserved, capture consumes reserved, release restores available. No expiring credit lots exist; reservation expiration is distinct. |
| Providers | PaymentProviderRegistryService/ResolverService and Paymob/Stripe adapters; gateway request receives only amountFromGateway in minor units. Webhooks authenticate through adapter parsing and compare provider amount/currency. PaymentWebhookReceipt uniquely identifies provider/event. |
| Payment confirmation | `payments/use-cases/mark-payment-succeeded.use-case.ts`, `services/orchestrate-session-payment-status.service.ts`; CAPTURED, reservation capture, coupon redemption, conditional PENDING_PAYMENT→UPCOMING, notifications. Return reconciliation consumes server Payment state. |
| Runtime | `sessions/services/resolve-session-join-readiness.service.ts`, `utils/session-join-policy.util.ts`, provider adapters, join bootstrap use cases, trusted attendance normalization, `mark-session-in-progress-from-attendance.service.ts`. Trusted participant evidence and current session status control progress. Room ending is separate from financial approval. |
| Completion | `sessions/services/complete-session-transaction.service.ts` locks Session; transition, package allocation and earning review sync share caller transaction. Completion retry sees COMPLETED and does not create another earning. Outcome/completion/reconciliation sweepers and admin resolution are other callers. |
| Earning decision | `financial-operations/services/session-earning-review.service.ts`: eligible outcome creates PENDING_REVIEW; accountant Stage A creates DECISION_APPROVED; separate Stage B calls ApprovePractitionerSettlementService and credits AVAILABLE LedgerEntry. FinancialOperationIdempotency is unique by economic entitlement/operation. Replacement sessions share entitlement. |
| Refund | `payments/use-cases/request-payment-refund.use-case.ts`, retry use case and eligibility service. Default destination CUSTOMER_WALLET. Mixed funding explicitly forbids ORIGINAL_METHOD: full mixed refund is ONE wallet credit for total paid. Original-method provider request is outside DB transaction. RefundEvent and PaymentEvent retain audit history. |
| Cancellation/no-show | `sessions/services/apply-session-cancellation-financial-effects.service.ts`, `apply-manual-no-show-financial-effects.service.ts`, admin resolution and CancelSessionUseCase. Policy percentages apply to immutable payment total; caller transactions handle session/refund/wallet changes. |
| Reversal/recovery | `financial-operations/use-cases/post-refund-ledger-entries.use-case.ts`, PractitionerRecoveryService, reversal LedgerEntry and PractitionerRecovery/Action. Recovery represents approved earnings already paid or unavailable. |
| Settlement/payout | ApprovePractitionerSettlementService, RecordSettlementPayoutService and PractitionerManualPayoutService; PractitionerSettlement, monthly SettlementBatch, PractitionerSettlementPayout, PractitionerManualPayout, proof files. External transfer is recorded by an authorized operator; these are not automatic bank-transfer integrations. |
| Projection/journals | RefreshPractitionerWalletService rebuilds balance from LedgerEntry. AccountingJournalPostingService uses LedgerAccount/JournalEntry/JournalLine and source uniqueness. PostPaymentLedgerEntriesUseCase exists but has no live production caller. Reconciliation services/read screens exist. |
| Authorization | JWT, account states, RolesGuard, PermissionsGuard; separate refund approve/retry, accountant decision, wallet credit, payout, recovery and read permissions. Ownership is checked in patient/practitioner use cases. Webhooks use provider signatures. |
| Web | `sawiyaa-frontend-v1/src/features/payments` checkout, history, return, wallet; `features/sessions` and shared messages workspace consume server session actions/runtime; financial operations screens consume earning review, settlements, payout APIs. Detailed web findings follow implementation review. |

### Independent state machines already present

Session: DRAFT → PENDING_PAYMENT (scheduled/accepted instant) or PENDING_PRACTITIONER_CONFIRMATION → UPCOMING → READY_TO_JOIN → IN_PROGRESS → AWAITING_COMPLETION_CONFIRMATION → COMPLETED / AWAITING_ADMIN_RESOLUTION. Cancellation, expiry and PATIENT_NO_SHOW/PRACTITIONER_NO_SHOW/BOTH_NO_SHOW are terminal alternatives. COMPLETED/CANCELLED/no-show/EXPIRED have no outgoing state transitions. Some direct transitions skip readiness or await-completion by explicit policy. Same-state calls are allowed for idempotency.

Payment: CREATED/PENDING/REQUIRES_ACTION/AUTHORIZED → CAPTURED or FAILED/CANCELLED/EXPIRED; CAPTURED → REFUND_PENDING → PARTIALLY_REFUNDED/REFUNDED or back to captured/partial on failed refund. Authorization is not capture.

Refund: REQUESTED → PROCESSING → SUCCEEDED/FAILED; failed/cancelled retries use the same Refund. Destination is separate from status.

Review: PENDING_REVIEW → DECISION_APPROVED → APPROVED; REJECTED/EXCLUDED_FROM_PAYOUT are noncredit decisions. Completion alone does not credit money.

Settlement: UNDER_REVIEW → APPROVED → CREDITED → PAID_OUT; legacy DRAFT/READY/PROCESSING/PAID/FAILED/CANCELLED coexist in the enum. PackageSettlement independently holds HELD/READY_TO_RELEASE/PARTIALLY_RELEASED/RELEASED/NEEDS_REVIEW/REFUNDED_OR_ADJUSTED.

Payout records represent recorded transfers, not pending automated bank operations. Settlement status tracks remaining due; no separate payout execution state machine exists.

### Findings from actual source, before changes

| ID | Severity | Root cause / financial consequence |
|---|---|---|
| F01 | CRITICAL | Both provider webhooks compare charged amount with amountTotal instead of amountFromGateway. Valid wallet+gateway success rejected after external funds collected. |
| F02 | CRITICAL | Capture and receipt commit before wallet/coupon/session effects. Handler treats receipt as complete; crash permanently suppresses recovery. Status checks occur before locking. |
| F03 | CRITICAL | Checkout reuses active Payment but calculates provider amount from today's wallet availability/pricing. Reserved wallet balance changes subsequent quote; concurrent initiation can overwrite CAPTURED with PENDING/FAILED. |
| F04 | HIGH | Scheduled creation writes no price snapshot. Pricing snapshot reads preserve totals but recalculate commission and drop coupon identity; retry can change historical allocations/redemption. |
| F05 | CRITICAL | Refund posts practitioner reversal even with no approved earning (ternary falls back to full amount when balance is null). It can debit unearned money, require a nonexistent wallet, or create negative balances. |
| F06 | CRITICAL | Refund invalidates only PENDING_REVIEW, leaving DECISION_APPROVED creditable. Review sync/approval reads are stale relative to refund locks. |
| F07 | CRITICAL | Refund reversal uses checkout share, not actual accountant-approved/credited share or FX snapshot; a converted earning may reverse into the wrong currency. Repeated partial allocation rounding can accumulate. |
| F08 | CRITICAL | Payout services use different lock keys; settlement payout reads before acquiring lock. Global reversal entries are not included in settlement-specific available aggregation, permitting payout of reversed funds. |
| F09 | HIGH | One monthly settlement per practitioner conflicts with one sourceReviewId. Candidate creation overwrites an earlier pending candidate; paid-out monthly settlement blocks new earnings. |
| F10 | HIGH | Original-method successful refund commits refund status before payment/reversal/review effects. Provider exceptions are treated as definite failure, although external outcome may be unknown. Retry can issue another refund. |
| F11 | HIGH | Coupon eligibility checks paid usage only. Concurrent valid checkout attempts can exceed coupon limits; redemption silently returns null after discounted funds already collected. |
| F12 | HIGH | Return reconciliation treats AUTHORIZED as sufficient to confirm a session. Backend join eligibility can then follow confirmed status without captured funds. |
| F13 | HIGH | Checkout CommissionRule and review country-percentage snapshots compete. Normal booking code never writes country-percentage snapshots, so direct review suggestion defaults to zero despite valid payment commission snapshots. |
| F14 | HIGH | Payment capture journal helper has no live caller. Refund/payout journals can be posted without original receipt journals. Ledger and journal do not currently provide a complete reconciled accounting history. |
| F15 | HIGH | Approval writes platform amount (source currency) with practitioner wallet currency. USD source → EGP wallet labels USD commission as EGP. |
| F16 | HIGH | Late successful payment after expiry is recorded as an unhandled event and permanently receipted; no automatic compensation exists. Cancellation and manual refunds do not share consistent payment locks. |
| F17 | MEDIUM | Wallet capture/release read reservation without locking it; concurrent different events can consume reserved funds belonging to another reservation. Currency input is not validated against reservation. |
| F18 | MEDIUM | Mutable practitioner wallet projection refresh is not consistently serialized with writers. Missing journals, mismatched financial snapshots, and incomplete historical sources need explicit reconciliation, not invented backfills. |

## B. Smallest coherent target

1. Preserve models, routes, authorization and three accounting approval steps. Use canonical Decimal payment snapshots for quote, collection, default earning and refund source basis. Keep accountant adjustments explicit and auditable. Do not introduce a second wallet/commission/payout domain.
2. Booking freezes available currency/duration prices; checkout freezes gross/discount/net, commission, coupon and wallet/gateway split. Payment retries reuse the persisted collection intent. Provider requests and remote outcomes remain outside long DB transactions; conditional updates prevent stale responses overwriting terminal state.
3. Capture holds session/payment locks and atomically commits receipt, payment, wallet capture, coupon redemption and session confirmation for direct sessions. Notifications happen after commit. Duplicate events are no-ops only after financial effects commit. Late external success cannot reopen a terminal session; retain explicit reconciliation evidence where automatic compensation policy is unresolved.
4. Completion creates review only. Stage A records amount; Stage B credits wallet exactly once per entitlement after rechecking payment/refund eligibility. Payment receipt is pending entitlement; wallet credit is the availability boundary. Platform allocation stays in source currency. Existing approved amounts are not rewritten by current configuration.
5. Refund totals are serialized by payment. Requested/processing amounts reserve refundable capacity. Wallet credit, refund/payment status, reversal and review exclusion commit together. Reverse only recognized earnings, in their credited currency, with actual credited snapshots; paid shortfalls use existing recovery records. Cumulative allocation rounding must make full reversal exact. Gateway timeout is uncertain, never an automatic permission to send the same money again.
6. Payout implementations share practitioner/currency and settlement locks, reread under lock, use both settlement due and total available balance, and record transfer/ledger/journal/settlement atomically. No transfers are initiated by this audit.
7. Preserve historical records and append compensating events. New constraints use historical preflight/NOT VALID where appropriate. Never backfill from current practitioner price. Missing historical snapshots are reconciliation issues.
8. Verification: targeted regression tests and real PostgreSQL concurrency tests on a new disposable local database; backend/web lint, typecheck, relevant suites/builds. Report skipped/unavailable checks precisely.

The implemented default uses the captured payment commission snapshot as the earning suggestion while retaining the existing accountant decision and credit stages. No hidden percentage was introduced.

## C. Implemented corrections

| Finding | Result |
|---|---|
| F01 | Paymob and Stripe compare the webhook amount with `amountFromGateway`, including mixed wallet/gateway payments. |
| F02 | Direct-session capture now locks and rereads the payment, then commits receipt, events, CAPTURED status, customer-wallet consumption, coupon redemption, session confirmation, review synchronization and the receipt journal in one transaction. Notifications run after commit. A repeated success for an already-CAPTURED payment re-enters this idempotent orchestrator so package/academy post-commit projections can recover after a historical crash. |
| F03 | An active Payment is an immutable collection intent. Repeated Pay clicks reuse its saved wallet/gateway split and provider data; an uncertain provider-initiation result remains retryable and cannot overwrite a terminal status. |
| F04 | New scheduled sessions persist the booking price matrix in `pricingPolicySnapshotJson`. Instant bookings use their request quote. Existing Payment snapshots take precedence. An old unpaid session with no trustworthy snapshot now fails with `FINANCIAL_RULE_PRICING_UNAVAILABLE` instead of using today's profile price. |
| F05–F07 | Refund posting derives reversals from approved earning reviews and credited LedgerEntries. It reverses nothing when no earning was recognized, uses cumulative proportional rounding, preserves source/wallet currencies, and creates PractitionerRecovery only for an unavailable or already-paid practitioner amount. |
| F06 | Refund processing locks the payment/review scope and invalidates both `PENDING_REVIEW` and `DECISION_APPROVED`. Credit rechecks for CAPTURED payment and absence of an active/succeeded refund. |
| F08 | Wallet refresh, settlement approval, settlement payout, manual payout and refund use a shared practitioner-finance advisory lock. Payout also locks/rereads the settlement and is bounded by both settlement due and global available balance after recoveries. |
| F09 | A monthly batch can contain one immutable settlement per source review. The old `(batchId, practitionerId)` unique index became a normal lookup index; existing settlement and payout rows are preserved. Seed upserts now use stable IDs or resolve the existing row first. |
| F10 | Successful wallet and provider refunds finalize status, payment state, wallet credit, review invalidation, ledger reversal, journal and metadata atomically. A provider exception is `PROCESSING`/unknown, not a definite failure and not permission to send a second refund. |
| F11 | Checkout locks the Coupon and includes active Payment reservations when enforcing total and per-patient limits. Redemption and its security-audit record share the capture transaction. |
| F12 | Only CAPTURED confirms a session or fulfills a package. `AUTHORIZED` remains an uncaptured payment state in backend reconciliation and both web return screens. |
| F13/F15 | The captured commission snapshot supplies the default direct-session earning split. Platform allocation remains in payment source currency; any practitioner wallet conversion is an explicit two-currency posting. Accountant overrides remain explicit and require a reason. |
| F14 | Payment capture writes a balanced receipt journal in the capture transaction. Session funds are deferred until the earning is approved. Approval writes `SESSION_EARNING_RECOGNIZED`; refund and payout append compensating journals. Historical approved reviews missing this journal are repaired from persisted payment/review/ledger facts within refund posting. |
| F16 | Late success after EXPIRED is retained as `PAYMENT_SUCCESS_RECEIVED_AFTER_EXPIRY` for Paymob and Stripe and cannot reopen the session. Automatic refund is intentionally not guessed. |
| F17/F18 | Customer-wallet operations lock by payment and reservation, require the reservation to exist for capture, validate currency and serialize the mutable projection. PostgreSQL checks reject negative wallet balances and broken money conservation on new writes. |

## D. Canonical lifecycle after implementation

1. Session or instant request stores a price/quote snapshot. Checkout resolves gross, discount, net and commission with Decimal arithmetic on the backend.
2. Payment stores the immutable coupon, commission, tax/fee and funding snapshots. `amountFromWallet + amountFromGateway = amountTotal`; only the gateway share is sent to the provider.
3. CAPTURED means the platform received the money. The receipt journal debits gateway clearing/customer-wallet liability and credits deferred session funds. Gateway fees and VAT stay separate from commission.
4. Completion creates or synchronizes one earning review. It does not credit the practitioner.
5. The accountant decision records the approved source amount. The separate credit step releases deferred funds into platform revenue and practitioner payable and creates one available earning LedgerEntry. `FinancialOperationIdempotency`, review/source uniqueness and locks make retries safe.
6. Refunds append customer-wallet/provider-return, platform reversal, practitioner reversal and recovery records as required. They do not delete history.
7. Each credited review produces a traceable settlement candidate. Payout consumes only still-available, same-currency money and links payout → settlement → review/ledger → payment/session.

## E. Schema and migrations

- `20260908120000_session_financial_lifecycle`: replaces the monthly settlement uniqueness constraint with a normal index and adds `NOT VALID` checks for Payment conservation, nonnegative CustomerWallet balances and settlement paid bounds. PostgreSQL enforces these checks for new/updated rows immediately; production should preflight historical violations and then `VALIDATE CONSTRAINT` online.
- `20260908160000_session_earning_journals`: adds `JournalEntrySourceType.SESSION_EARNING_RECOGNIZED` for the accounting boundary between received/deferred money and approved earnings.
- No destructive backfill is included. Existing financial history is retained. Missing historical price/allocation facts are reconciliation exceptions; current practitioner prices are not used to invent them.

The three checks were validated successfully against the disposable PostgreSQL 17 database at `127.0.0.1:55438/sawiyaa_lifecycle_test`. Prisma reported all 149 migrations applied and the schema valid.

## F. Invariants now enforced or tested

- `subtotal - discount = total` and `wallet + gateway = total` at the database boundary.
- Customer-wallet available and reserved balances cannot be negative; reservations are single-payment, same-currency and captured/released once.
- Provider success amount/currency must equal the saved gateway share/currency.
- AUTHORIZED cannot confirm/fulfill; only CAPTURED can.
- One provider event, coupon redemption, session entitlement, review credit, refund posting and payout reference can produce financial side effects once.
- Completion and accountant credit are separate; credit rechecks payment/refund eligibility under lock.
- Platform commission plus practitioner source earning equals the approved allocation; funding source never changes entitlement.
- Refund amount cannot exceed remaining captured money. Cumulative partial-refund rounding converges to the exact full reversal.
- Settlement paid total remains between zero and net; payout cannot exceed settlement remainder or global available balance.
- Journal debits equal credits per currency. Cross-currency entitlement/reversal uses paired foreign-exchange-clearing journals.

## G. Verification record

Commands were executed from the relevant repository directory unless shown otherwise.

| Command | Result |
|---|---|
| `npx prisma migrate status` with the isolated `DATABASE_URL` | PASS — 149 migrations; schema up to date. |
| `npx prisma validate` with the isolated `DATABASE_URL` | PASS. |
| `psql ... ALTER TABLE ... VALIDATE CONSTRAINT` for the three new checks | PASS — all three `convalidated = true` in the disposable database. |
| `npx jest --runInBand --testPathPatterns='(payments\|financial-rules\|customer-wallets\|financial-operations\|sessions\|package-plans)' --testPathIgnorePatterns='integration'` | PASS — 186 suites, 1047 tests. |
| `npx jest --runInBand src/modules/customer-wallets/lifecycle-wallet.postgres.integration.spec.ts src/modules/financial-operations/integration/financial-boundary-scenarios.postgres.integration.spec.ts` with isolated `DATABASE_URL` | PASS — 2 suites, 9 real-PostgreSQL tests. |
| `npm run build` in backend | PASS (`nest build`). |
| Targeted backend ESLint over changed production lifecycle files | PASS. |
| `npm run typecheck` in frontend | PASS. |
| `npx vitest run src/features/payments/lib/checkout-funding.test.tsx src/features/payments/unified-checkout.test.tsx src/features/sessions/components/PractitionerSessionDetailPanel.test.tsx` | PASS — 3 files, 15 tests. |
| Targeted frontend ESLint over payment/session files | PASS. |
| `npm run build` in frontend | PASS — i18n, TypeScript, 243 static pages and production webpack build. |
| `git diff --check` over lifecycle scope | PASS; only Git's configured LF→CRLF notices. |

The backend repository-wide `npx tsc --noEmit` is not a clean project gate: it reports 467 existing errors across seeds, old specs and unrelated modules. None of the errors in the final log points to the changed lifecycle production files or the three adjusted settlement seed files, and the production Nest build passes. The repository-wide lint commands also contain unrelated pre-existing failures; scoped lint is clean. The Browser plugin was unavailable, and a destructive authenticated E2E seed was not run against any existing application database. Component tests plus the production web build cover the changed UI contract.

Machine-readable Jest results and the full TypeScript log are under `qa-artifacts/session-financial-lifecycle-20260908/`.

## H. Worked reconciliation: 600 EGP, coupon, mixed funding, partial refund, payout

Assume the configured captured commission snapshot is 10%; gateway fee/VAT are zero only to keep this example focused.

| Step | Customer/payment | Platform | Practitioner |
|---|---:|---:|---:|
| Booking price | 600 | — | — |
| Coupon | -100 | — | — |
| Net Payment | 500 | — | — |
| Funding | wallet 200 + Paymob 300 | deferred 500 received | not earned |
| Completion | unchanged | deferred 500 | review pending, available 0 |
| Accountant approval/credit | unchanged | revenue 50 | payable/available 450 |
| Partial refund to customer wallet | +100 wallet | reverse 10; retained 40 | reverse 90; available 360 |
| Settlement/payout | net customer cost 400 | retained revenue 40 | pay 360; available 0; settlement paid 360 |

Journal view, omitting gateway fee/VAT:

- Capture: Dr gateway clearing 300 + Dr customer-wallet liability 200 = Cr deferred session funds 500.
- Approval: Dr deferred 500 = Cr platform revenue 50 + Cr practitioner payable 450.
- Refund 100: Dr platform revenue 10 + Dr practitioner payable 90 = Cr customer-wallet liability 100.
- Payout 360: Dr practitioner payable 360 = Cr platform cash 360.

After the refund, `40 platform + 360 practitioner = 400 retained customer cost`. No amount depends on whether the original 500 came from wallet or Paymob. If the 90 practitioner portion had already been paid, the refund would still complete and a 90 EGP `PractitionerRecovery` receivable would replace the unavailable payable debit.

## I. Remaining operational/business decisions

1. **Late provider success after expiry:** the system now blocks fulfillment and leaves explicit evidence. Operations still needs a documented compensate/refund policy and a reconciliation worker/runbook for this state.
2. **Uncertain original-method refund:** provider exceptions remain `PROCESSING` to prevent duplicate money movement. A provider-specific refund-status webhook/poller and alert SLA remain operational work.
3. **Historical rows:** payments with valid persisted totals remain usable. An unpaid historical session with no immutable quote is intentionally blocked for manual reconciliation; no current-price backfill is safe.
4. **Commission governance:** checkout CommissionRule is now the default earning suggestion and the accountant can explicitly adjust it. Product/finance should document whether corporate sponsorship changes the commission base; the existing behavior continues to use the saved session financial allocation.
5. **Payout execution:** Sawiyaa records operator-confirmed transfers; it does not initiate bank payouts. The existing permission and audit model was preserved.

## J. Material files changed by this audit

Schema and rollout:

- `sawiyaa-backend-v1/prisma/schema.prisma`
- `sawiyaa-backend-v1/prisma/migrations/20260908120000_session_financial_lifecycle/migration.sql`
- `sawiyaa-backend-v1/prisma/migrations/20260908160000_session_earning_journals/migration.sql`
- generated Prisma client files under `sawiyaa-backend-v1/src/generated/prisma/`
- settlement seed compatibility in `prisma/seed/modules/{practitioner-finance,regional-bulk,settlements-lab}.seed.ts`

Backend lifecycle:

- customer wallet: `customer-wallet-accounting.service.ts` and its PostgreSQL integration proof
- pricing/coupon: `financial-session.repository.ts`, `calculate-session-financial-breakdown.service.ts`, its use case/types, and `redeem-coupon.service.ts`
- payments: Payment/PaymentSession repositories; initiate, succeed, fail, expire, return reconciliation, refund, Paymob webhook and Stripe webhook use cases; transition/refund validators
- sessions: `session.repository.ts` for booking-time price snapshots and payment-status orchestration used by capture
- earning/accounting: `session-earning-review.service.ts`, settlement approval, wallet refresh, manual/settlement payouts, journal/account services, payment/refund posting use cases, accounting types, shared practitioner lock and module exports
- package reconciliation: `reconcile-package-purchase-payment.use-case.ts`

Web contract and display:

- `sawiyaa-frontend-v1/src/features/payments/components/PaySessionPanel.tsx`
- `sawiyaa-frontend-v1/src/features/payments/components/PaymentReturnPanel.tsx`
- `sawiyaa-frontend-v1/src/features/payments/lib/checkout-funding.ts`
- `sawiyaa-frontend-v1/src/features/sessions/types/financial.types.ts`
- related Vitest files and the missing English package-purchase translation

The complete source-level architecture, findings, changed behavior, migrations, tests and residual decisions are contained in this report. The mobile repository was outside scope and was not changed by this audit; it already had unrelated working-tree modifications before this work.
