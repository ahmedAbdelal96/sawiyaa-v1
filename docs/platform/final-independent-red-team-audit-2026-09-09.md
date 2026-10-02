# 1. Executive Verdict

**NOT READY**

The system has substantially stronger database, accounting, idempotency, and client-authority controls than the starting revision. It is still not financially production-ready because an external provider response can be lost after the provider creates a payment or refund. Stripe calls now have deterministic idempotency keys, but the application has no complete lookup/resume path for a locally `CREATED` payment without a stored provider reference. Paymob refund dispatch has neither a proven provider idempotency contract nor an automated provider-status lookup. Refunds are safely held in `PROCESSING` and diagnosed as critical instead of being retried blindly, but an operator still cannot prove and finalize the provider outcome inside Sawiyaa.

The release gates are also not green: Web component tests have 4 failures; Mobile project type/i18n validation has pre-existing failures; and the PostgreSQL financial-overview suite has one fixture-dependent failure on a new empty database. Real PostgreSQL proofs exist for the most important wallet, resolution, earning, payout, rollback, and replacement paths, but not yet for every mandatory refund-versus-payout, final coupon-use, and webhook race.

# 2. Architecture Verified

**Backend:** `PatientProfile → Session → financial breakdown → Payment → CustomerWallet reservation → provider → webhook/canonical capture → Session lifecycle → SessionEarningReview → accountant decision → LedgerEntry/PractitionerWallet → PractitionerSettlement → payout`, with Refund, PractitionerRecovery, JournalEntry/JournalLine, and reconciliation branches.

**Web:** payment panels consume the backend financial breakdown and `fundingPreview`; payment return reconciles through the backend and treats `AUTHORIZED` as pending.

**Mobile:** the session checkout previously duplicated the wallet split and treated `AUTHORIZED` as paid. It now consumes `fundingPreview` and recognizes only `CAPTURED` as collected.

**Database:** Prisma schema plus 149 migrations were applied from scratch to `sawiyaa_redteam_20260908` and `sawiyaa_redteam_overview_20260909`, both disposable local PostgreSQL databases on `127.0.0.1:55438`. Domain rows, immutable snapshots, wallet ledgers, practitioner ledgers, settlements, journals, webhook receipts, idempotency rows, and reconciliation issues are separately persisted.

**External integrations:** Stripe and Paymob adapters sign/verify webhooks and preserve canonical amount/currency checks. Stripe payment/refund creation now uses deterministic idempotency keys. Daily supplies room and attendance evidence; backend session state and financial services remain authoritative.

# 3. Bugs Found

| Severity | Finding | Disposition |
|---|---|---|
| CRITICAL | Provider refund could succeed externally, throw locally, remain `REQUESTED`, escape reconciliation, and be retried. | Partially fixed: it now becomes `PROCESSING`, is reconciled as an uncertain critical outcome, and cannot enter the ordinary failed retry path. Provider lookup/finalization remains a release blocker. |
| CRITICAL | Lost provider response during payment initiation can leave a local `CREATED` payment without a recoverable provider reference. | Stripe duplicate creation risk reduced with idempotency. Complete lookup/resume remains unresolved; Paymob remains unproven. |
| HIGH | Refund journals reversed platform/practitioner economics but omitted proportional VAT reversal. | Fixed with cumulative allocation. |
| HIGH | Mobile treated `AUTHORIZED` as successful collection and could navigate through the paid return flow before capture. | Fixed. |
| HIGH | Mobile locally recomputed wallet/gateway funding with JavaScript values and ignored the backend quote. | Fixed. |
| MEDIUM | PostgreSQL concurrency test depended on seeded `admin@hesba.local`. | Fixed with a self-contained fixture. |
| MEDIUM | Replacement earning proof expected a mutable 30% session hint instead of the captured payment's immutable 20/80 commission snapshot. | Fixed test expectation; production authority remains the payment snapshot. |
| MEDIUM | Financial-overview PostgreSQL tests are mostly vacuous on an empty database and one assertion assumes non-empty unequal arrays. | Open test-quality blocker: 30/31 pass on a fresh database. |
| MEDIUM | Web component suite has four unrelated failures. | Open release-gate blocker. |
| MEDIUM | Mobile full type and i18n gates fail in existing unrelated modules. | Open release-gate blocker. |

# 4. Bugs Fixed

- Refund dispatch now commits `REQUESTED → PROCESSING` and a `PROVIDER_PENDING / PROVIDER_REFUND_DISPATCH_STARTED` event before the network call. An exception returns an explicit unknown-outcome error; it does not mark the refund safely retryable.
- Reconciliation scans `REQUESTED`, `PROCESSING`, and `SUCCEEDED` refunds and emits `REFUND_PROVIDER_OUTCOME_UNCERTAIN` with `CRITICAL` severity for uncertain provider work.
- Stripe sends `Idempotency-Key: payment:{paymentId}` and `Idempotency-Key: refund:{refundId}`.
- Refund journals allocate VAT using cumulative targets: each partial amount equals `VAT × cumulativeRefund / paymentTotal` minus the previously allocated target. This makes all partials sum to the original VAT exactly.
- Mobile derives display and submission funding from the backend `fundingPreview`. A locked attempt keeps its persisted split. Missing preview fails closed to gateway-only display rather than spending wallet locally.
- Mobile paid navigation requires canonical `CAPTURED`; `AUTHORIZED`, `PENDING`, and `REQUIRES_ACTION` remain unresolved.
- PostgreSQL tests create their own admin, and replacement-chain assertions now follow the immutable payment commission snapshot.

# 5. Remaining Business Decisions

- Confirm whether mixed wallet + gateway refunds must always credit the Sawiyaa customer wallet or may return the gateway-funded portion to the original method. Current tested policy uses customer-wallet credit for the whole recognized refund.
- Confirm whether VAT snapshot `14.00` in the worked fixture represents VAT included in the platform share or another taxable basis. The code preserves and proportionally reverses the stored snapshot; it does not recompute historical tax policy.
- Confirm the authorized operational provider evidence that permits an uncertain Paymob refund to be finalized as succeeded or failed. This decision must define evidence and roles; the technical provider lookup and append-only finalization still need implementation.

# 6. State Machines

**Session:** `PENDING_PAYMENT → UPCOMING → READY_TO_JOIN → IN_PROGRESS → AWAITING_COMPLETION_CONFIRMATION → COMPLETED`. Cancellation, expiry, no-show findings, and `AWAITING_ADMIN_RESOLUTION` are controlled branches. Terminal states do not have ordinary transitions back to payable/joinable/running states. Daily attendance only advances eligible non-terminal operational states and cannot create financial entitlement.

**Payment:** `CREATED → PENDING/REQUIRES_ACTION/AUTHORIZED → CAPTURED`, with `FAILED` and `EXPIRED` terminal failure branches. Only `CAPTURED` creates collection truth. Success callbacks verify provider reference, amount, currency, current state, and economic-effect idempotency.

**Refund:** `REQUESTED → PROCESSING → SUCCEEDED|FAILED`. Dispatch exceptions remain `PROCESSING` because the provider outcome is unknown. Successful rows drive reimbursement, reversals/recovery, and an append-only balanced journal.

**Earning:** completion creates one `PENDING_REVIEW` entitlement review; accountant decision freezes the source amount; wallet credit is a separate approved step. Replacement sessions share one `earningEntitlementId`.

**Settlement/Payout:** approved wallet value creates a settlement; payout records move through pending/completed/failed states and atomically debit legitimate available value. Partial payout is bounded by `amountPaidTotal <= amountNet`.

# 7. Financial Invariants

| Invariant | Proof |
|---|---|
| `gross - discount = net` | Decimal snapshots plus `Payment_money_conservation_ck`; an invalid write was rejected. |
| `walletUsed + gatewayAmount = net` | Backend quote/reservation plus the same DB constraint; Mobile now consumes the quote. |
| wallet available/reserved are non-negative | Row locking plus `CustomerWallet_nonnegative_ck`; a negative update was rejected. |
| captured event occurs once | webhook receipt uniqueness and capture idempotency tests; real PostgreSQL reservation capture race passes. |
| coupon redemption occurs once per coupon/session | row lock plus `uq_coupon_redemption_coupon_session`; unit concurrent webhook/replay coverage passes. Final-use real PostgreSQL race is still missing. |
| historical commission is immutable | replacement proof resolves 20% platform / 80% practitioner from the captured payment despite a 30% session hint. |
| one earning per entitlement | unique entitlement controls and real overlapping Admin/accountant tests pass. |
| payout cannot exceed settlement | service locks/bounds plus validated `PractitionerSettlement_paid_bounds_ck`; overpayment update was rejected. |
| refund total cannot exceed captured recognized amount | payment/refund locks, eligibility checks, active-refund protection, and cumulative allocation tests. |
| every posted journal balances per currency | posting service asserts balance before insert; real 650 EGP refund proof measured debit `650.00` and credit `650.00`; VAT partial proof balances cumulatively. |
| append-only journal | service test confirms create-only JournalEntry/JournalLine behavior and source uniqueness. |

# 8. Concurrency Results

On PostgreSQL `sawiyaa_redteam_20260908`, 6 integration suites and 30 tests passed. Proven races include two reservations against one wallet, duplicate reservation capture, overlapping Admin resolutions, duplicate wallet refund credit, overlapping earning decisions, Admin resolution versus accountant decision, replacement uniqueness, rollback after injected failures, and payout boundaries.

The observed overlapping wallet-resolution result was exactly one fulfillment and one `SESSION_RESOLUTION_CASE_NOT_OPEN`; one refund and one wallet credit survived. A complete 650 EGP refund produced one customer credit and a balanced journal.

Coverage still required before production: a purpose-built simultaneous refund-versus-payout test, final global/per-patient coupon-use race on real PostgreSQL, duplicate provider webhook race through real repositories and downstream effects, and manual-payout versus settlement-payout race.

# 9. Idempotency Matrix

| Economic event | Key/lock | Replay outcome | Status |
|---|---|---|---|
| payment initiation | active payment + session/payment locks; Stripe `payment:{id}` | returns existing attempt | Conditional: lost-response lookup incomplete |
| wallet reservation/capture/release | payment reference + row lock + unique entries | one effect | Proven on PostgreSQL |
| Stripe/Paymob webhook | provider event receipt + payment locks + downstream idempotency | duplicate no-op/re-entry | Unit proven; real-repository race incomplete |
| coupon redemption | coupon row lock + coupon/session unique key | existing redemption | Design proven; final-use PostgreSQL race incomplete |
| session completion/review | session/entitlement locks and uniqueness | one review | Proven on PostgreSQL |
| accountant decision/credit | operation idempotency + review/wallet locks | one approved credit | Proven on PostgreSQL |
| refund request | payment/refund advisory locks + active refund check | duplicate rejected/returned | Local effects proven; provider uncertainty unresolved |
| Stripe refund | `refund:{refundId}` | same provider operation | Adapter proven |
| Paymob refund | local refund lock only | retry forbidden while uncertain | NOT READY |
| payout | settlement/wallet locks, operation key, provider reference uniqueness | bounded one debit | Core tests pass; all-path race incomplete |
| journal posting | unique `(sourceType, sourceId)` | existing journal | Proven by service and PostgreSQL paths |

# 10. Backend ↔ Web ↔ Mobile Contract Matrix

| Backend authority | Web | Mobile | Result |
|---|---|---|---|
| `grossAmount/netPaidAmount/currency` | consumed | consumed | OK |
| `couponDiscount` and coupon snapshots | consumed | consumed | OK |
| `fundingPreview.walletUsed` | consumed | now consumed | FIXED |
| `fundingPreview.gatewayAmount` | consumed | now consumed | FIXED |
| locked existing attempt split | respected | now respected | FIXED |
| `Payment.status = CAPTURED` | paid | now paid | OK |
| `AUTHORIZED/PENDING/REQUIRES_ACTION` | pending | now pending | FIXED |
| canonical session actions/status | consumed | consumed | OK in reviewed flows |
| commission/earning/refund/settlement values | display-only clients | display-only clients | Backend authoritative |
| payment return | backend reconciliation | backend reconciliation | OK after Mobile fix |

# 11. Security / Authorization Findings

Financial mutations are server-side and role-scoped; clients cannot submit authoritative totals, commission, settlement amount, or session transitions. Provider webhooks verify signatures and then verify reference, amount, and currency. Admin resolution and accountant decision are separate controlled workflows with audit context. Daily join/runtime authorization is separate from financial completion.

The open security/operational risk is uncertain external effects: a manual operator process without a provider-backed lookup and explicit evidence contract could mark the wrong outcome or leave money unresolved. Do not add a generic retry button for `PROCESSING` refunds.

# 12. Database / Migration Review

All 149 migrations applied successfully from scratch twice. Three lifecycle constraints were created `NOT VALID`, meaning new writes were protected while historical validation was deferred. On the disposable audit database, all three were explicitly validated and `pg_constraint.convalidated` became true:

- `Payment_money_conservation_ck`
- `CustomerWallet_nonnegative_ck`
- `PractitionerSettlement_paid_bounds_ck`

Intentional invalid writes for split mismatch, negative wallet, and settlement overpayment were each rejected with `check_violation`. The executable proof is `qa-artifacts/final-red-team-20260909/database-constraint-proof.sql`.

Production must pre-scan historical rows before `VALIDATE CONSTRAINT`; validation can scan/lock large tables. The migration intentionally avoids guessing or rewriting historical money. Index replacement and enum changes in the reviewed lifecycle migrations are non-destructive, but production lock duration must be measured on a restored production-sized snapshot.

# 13. Journal / Ledger Reconciliation

Capture of a practitioner session first records the source of `500`: debit gateway clearing `300`, debit customer-wallet liability `200`, credit deferred session funds `500`. The VAT snapshot adds a balanced reclassification pair.

Accountant-approved earning recognition releases deferred funds: debit deferred `500`, credit practitioner payable `400`, credit platform revenue `100`. With VAT `14`, the combined platform revenue is `86` credit and VAT payable is `14` credit.

Refund posting reverses the recognized split and destination liability. Partial VAT reversals `2.80 + 4.20 + 7.00 = 14.00`. The real 650 EGP Admin refund had domain Refund, one CustomerWalletEntry, and one `REFUND_SUCCEEDED` journal whose debit and credit totals both equaled `650.00`.

Reconciliation now flags uncertain refund provider state. A full database-wide orphan/domain/ledger/journal comparison against production historical data was not possible from the disposable fixture and remains a rollout requirement.

# 14. Automated Test Results

| Command | Suites | Passed | Failed | Skipped |
|---|---:|---:|---:|---:|
| Backend targeted refund/journal/reconciliation/Stripe Jest | 4 | 22 tests | 0 | 0 |
| Backend expanded payment/coupon/webhook/Daily/payout Jest | 10 | 88 tests | 0 | 0 |
| Backend PostgreSQL wallet/financial/resolution suites | 6 | 30 tests | 0 | 0 |
| Backend Admin concurrency PostgreSQL rerun | 1 | 9 tests | 0 | 0 |
| Backend fresh-DB financial overview | 1 | 30 tests | 1 test | 0 |
| Mobile checkout/coupon/session Jest | 3 | 12 tests | 0 | 0 |
| Mobile release-gate Jest | 5 | 20 tests | 0 | 0 |
| Web Vitest component suite | 52 files | 182 tests / 48 files | 4 tests / 4 files | 0 |

Web failures: missing intl provider in `AdminApplicationStepProfessional`, stale Pending Payment CTA expectation, and two 5-second platform-settings timeouts. The fresh financial-overview failure compares two empty aggregates and assumes they differ, demonstrating a non-self-contained proof fixture.

# 15. Build Results

| Application | Result |
|---|---|
| Backend `npm run build` | PASS |
| Web `npm run typecheck` | PASS |
| Web `npm run build` | PASS; i18n validation, compilation, TypeScript, and 243-page generation completed |
| Mobile targeted ESLint | PASS |
| Mobile `test:release-gate` | PASS |
| Mobile `validate:mobile-runtime` | PASS |
| Mobile `npx tsc --noEmit` / `validate:changed-types` | FAIL in pre-existing unrelated practitioner/assessment/chat/discovery code |
| Mobile `validate:i18n` | FAIL with pre-existing missing-key inventory |
| Mobile native Android/iOS release artifact | Not produced; the validation chain is already red |

# 16. Files Changed

Changes attributable to this independent pass:

- Backend provider contract and Stripe/Paymob adapters; refund use case and tests.
- Accounting journal posting, reconciliation operations/diagnostics/types, and tests.
- PostgreSQL test safety guards plus self-contained Admin concurrency and immutable replacement-snapshot assertions.
- Mobile payment types, `checkout-funding.ts`, session pay screen, and checkout funding tests.
- Database constraint proof and this audit report.

The working tree already contained extensive user/previous-audit work (over 200 files). No reset, checkout, clean, or unrelated rollback was performed.

# 17. Migrations Added/Changed

No migration was added or rewritten by this pass. Existing migrations `20260908120000_session_financial_lifecycle` and `20260908160000_session_earning_journals` were inspected and applied from scratch. Production historical constraints still require an explicit validation run after a pre-scan.

# 18. Production Rollout Risks

1. Implement provider-status lookup/resume for lost payment creation responses and uncertain refunds, especially Paymob; add append-only operator finalization tied to provider evidence.
2. Add real PostgreSQL races for refund versus payout, final coupon use, webhook economic effects, and payout-path collision.
3. Repair the fresh-database financial-overview fixture and the four Web component tests.
4. Clear Mobile type/i18n gates and produce signed release artifacts.
5. Run reconciliation on a masked production snapshot: missing snapshots, orphan journals, domain-without-journal, duplicate source IDs, currency mismatches, and ledger/projection differences.
6. Validate constraints in production during a measured maintenance window; retain rollback/runbook steps that never rewrite historical financial facts.
7. Configure and test provider secrets, webhook routing, clock skew, retries, reconciliation schedules, and critical alerts in staging with provider sandbox callbacks.

# 19. Manual Production Smoke Checklist

- Create EGP and USD bookings; record immutable price, coupon, commission, VAT, fee, country, and FX snapshots.
- Run no coupon, 100% coupon, wallet-only, gateway-only, and mixed funding; confirm the backend quote on Web and Mobile.
- Confirm `AUTHORIZED` and redirect success remain pending until backend `CAPTURED`.
- Deliver duplicate, concurrent, wrong-reference, wrong-amount, wrong-currency, late, and out-of-order Stripe/Paymob callbacks.
- Cancel before start and resolve patient/practitioner/both no-show cases; confirm terminal sessions never reopen from Daily events.
- Complete once through each authorized caller; confirm one entitlement/review/journal.
- Approve, credit, partially pay, fully pay, refund before/after each stage, and reconcile practitioner balance from ledger.
- Execute `100 + 150 + 250` mixed refund and direct full refund; confirm cumulative totals and VAT.
- Simulate provider timeout after external success; prove lookup and finalization before enabling production.
- Run accounting reconciliation and verify every critical issue alerts an operator with source IDs and currencies.

# 20. Final Worked Financial Example

Fixture: session gross `600 EGP`, coupon `100`, net `500`, wallet `200`, Paymob `300`. Captured commission snapshot is platform `20% = 100`, practitioner `80% = 400`. VAT snapshot is `14`; gateway fee fixture is `0`.

| Step | Customer / Wallet / Gateway | Platform / Practitioner | Ledger / Journal | Settlement / Recovery |
|---|---|---|---|---|
| 1. Booking | Obligation `600` | no recognized share | immutable session/price snapshot | none |
| 2. Coupon | discount `100`; payable `500` | basis becomes `500` | coupon snapshot and reserved use | none |
| 3. Wallet reserve | wallet available `-200`, reserved `+200` | none | one reservation | none |
| 4. Paymob capture | gateway `300`; wallet reservation captured `200`; customer paid `500` | funds deferred | Dr gateway clearing `300`; Dr customer-wallet liability `200`; Cr deferred `500`; VAT reclassification Dr platform revenue `14` / Cr VAT payable `14` | none |
| 5. Completion | no money movement | suggested platform `100`, practitioner `400` | one earning review, no withdrawable credit | pending review |
| 6. Accountant decision | unchanged | approves `400` practitioner / `100` platform | decision snapshot only | approved source amount `400` |
| 7. Practitioner credit | unchanged | practitioner payable `400` | Dr deferred `500`; Cr practitioner payable `400`; Cr platform revenue `100` | settlement/wallet eligibility `400` |
| 8. Partial refund `100` | customer wallet `+100`; cumulative refund `100` | reverse practitioner `80`, platform gross `20`, VAT `2.80` | Dr practitioner `80` + Dr platform `20` + Dr VAT `2.80`; Cr platform `2.80` + Cr wallet liability `100`; balanced `102.80` | remaining legitimate practitioner value `320`; recovery only if value was already unavailable |
| 9. Remaining payout | customer reimbursement remains `100` | pay practitioner remaining `320` | Dr practitioner payable `320`; Cr payout/bank clearing `320` | paid `320`; no recovery for the already reversed `80` |
| 10. Full-refund alternative | from the pre-payout state, one customer-wallet credit `500`; no gateway over-refund | reverse `400/100`, VAT `14` | Dr practitioner `400` + Dr platform `100` + Dr VAT `14`; Cr platform `14` + Cr wallet liability `500`; debits=credits=`514` | no payout remains |
| 11. Payout-before-refund alternative | customer still receives `500` | practitioner has already received `400` | refund journal still reverses the economics | explicit practitioner recovery `400`; platform/VAT reversal remains `100/14` |

The mandatory cumulative partial-refund route allocates exactly as follows:

| Refund | Cumulative | Practitioner reversal | Platform gross reversal | VAT reversal | Practitioner value left |
|---:|---:|---:|---:|---:|---:|
| `100` | `100` | `80` | `20` | `2.80` | `320` |
| `150` | `250` | `120` | `30` | `4.20` | `200` |
| `250` | `500` | `200` | `50` | `7.00` | `0` |

At every partial step, `wallet reimbursement + any original-method reimbursement = cumulative refund <= 500`. At the end, customer reimbursement is `500`, practitioner reversal/recovery is `400`, platform gross reversal is `100`, VAT reversal is `14`, and the VAT reclassification credit prevents double-counting. No amount is inferred from current pricing, commission, coupon, or tax configuration.

# Production Readiness Closure

**Closure run:** 2026-09-09  
**Final verdict:** **NOT READY**

This closure preserved the previous audit and addressed the confirmed blockers without resetting any of the existing working tree. The financial provider recovery design is materially stronger, the Web component suite is green, Mobile i18n and changed-code gates are green, and the fresh-database overview fixture is deterministic. The release cannot be called READY because four required purpose-built PostgreSQL races, evidence-required manual Paymob refund finalization, Web full lint, and Mobile full TypeScript remain unresolved.

## Previous blockers and closure status

| Blocker | Root cause | Closure work | Status |
|---|---|---|---|
| Paymob uncertain payment/refund outcome | A lost HTTP response was treated only as a local exception; no provider inquiry closed the operation | Added official transaction inquiry by order/merchant reference and transaction ID. Unknown refunds remain `PROCESSING`; HTTP failure no longer proves failure. Amount, currency, parent transaction and cumulative refunded amount are checked before finalization. | Partially closed; provider-backed reconciliation exists, but an evidence-required manual finalization command for permanently unknowable refunds is still absent. |
| Stripe `CREATED` without provider reference | Same-key creation was idempotent, but retry returned the stale local row | Active checkout now reconciles by persisted `paymentId`; if Stripe search has no result, the backend replays the creation POST with `payment:<paymentId>` only inside a 23-hour key-retention safety window, then persists the recovered intent/client secret. | Closed in code and adapter/use-case tests. |
| Stripe uncertain refund | Refund POST had a stable key but no lookup/finalization path | Refund metadata includes `refundId`; reconciliation retrieves a known refund or lists PaymentIntent refunds and matches the exact local refund identity, then uses the existing locked/idempotent finalizer. | Closed in code and adapter tests. |
| Missing PostgreSQL races | Existing integration coverage proved related boundaries but not all four named collisions | A new database was migrated from zero; existing financial boundary and wallet concurrency suites passed. | Open: the four exact purpose-built races remain missing. |
| Web component failures | Missing intl test context, an expired fixture, two slow interaction tests, and an uncleared reason input | Fixed the test layer; full component suite passes. | Closed. |
| Mobile TypeScript/i18n gates | Two changed-file type defects plus a validator that incorrectly required full bilingual dictionary parity; 44 Arabic fallback keys used at runtime were actually missing | Fixed the callback type and Button prop. Validator now traverses arrays and enforces the configured Arabic fallback for used keys while reporting English coverage. Added the real 44 Arabic keys. | i18n and changed-code gates closed; full TypeScript still has 80 errors elsewhere. |
| Fresh-db overview test | Wallet/cash separation assertion compared two empty arrays | Added an explicit isolated patient-wallet `MANUAL_CREDIT` fixture and cleanup, and asserted its visible EGP bucket. | Closed; 31/31 passed alone on a newly migrated database. |

## Provider recovery behavior

Every newly dispatched external payment now stores a stable economic ID, provider reference/idempotency reference, first/last dispatch timestamps, requested minor amount, currency, state, and reconciliation count before the network call. No card data or secrets are stored. Stripe uses `payment:<paymentId>` and `refund:<refundId>`. Paymob uses the local payment ID as merchant order identity and never blindly re-dispatches an uncertain refund.

`PaymentProviderRecoveryService` scans only unresolved external payments and `PROCESSING` refunds. It queries the provider, validates amount/currency and provider identifiers, records sanitized evidence/attempt metadata, and invokes the existing locked finalizers. It is called from the existing accounting reconciliation scheduler, so no competing scheduler was introduced. Repeated reconciliation is protected by payment/refund advisory locks and the existing unique webhook/journal/ledger identities.

The client retry path continues to ask the backend for canonical state. Redirect URLs, Web query parameters, and Mobile WebView/navigation state do not mark financial success.

## Files changed for this closure

Backend provider recovery:

- `sawiyaa-backend-v1/src/modules/payments/providers/payment-provider-adapter.interface.ts`
- `sawiyaa-backend-v1/src/modules/payments/providers/stripe-payment-provider.adapter.ts`
- `sawiyaa-backend-v1/src/modules/payments/providers/paymob-payment-provider.adapter.ts`
- `sawiyaa-backend-v1/src/modules/payments/services/payment-provider-recovery.service.ts`
- `sawiyaa-backend-v1/src/modules/payments/use-cases/initiate-session-payment.use-case.ts`
- `sawiyaa-backend-v1/src/modules/payments/use-cases/request-payment-refund.use-case.ts`
- `sawiyaa-backend-v1/src/modules/payments/payments.module.ts`
- `sawiyaa-backend-v1/src/modules/financial-operations/services/accounting-reconciliation-scheduler.service.ts`
- provider/use-case tests beside those files

Fresh database proof:

- `sawiyaa-backend-v1/src/modules/financial-operations/integration/admin-financial-overview.postgres.integration.spec.ts`
- local isolated-database guards in the financial-boundary and wallet integration specs
- `qa-artifacts/financial-production-closure-20260909/run-fresh-postgres-gates.cjs`

Web/Mobile gates:

- four Web test files covering professional content, patient journey and platform settings
- `sawiyaa-mobile/app/(practitioner)/index.tsx`
- `sawiyaa-mobile/scripts/validate-mobile-i18n.mjs`
- `sawiyaa-mobile/src/i18n/locales/ar.json`

## Commands and results

Backend:

- `npm run build` — PASS.
- targeted provider/initiation/refund/scheduler Jest command — PASS, 5 suites / 49 tests.
- relevant-file ESLint was run; formatting issues were corrected and a final focused recheck followed.

Database (new `sawiyaa_redteam_closure_20260909`, PostgreSQL localhost only):

- `npx prisma migrate deploy` — PASS, 149 migrations from zero.
- `npx prisma validate` — PASS.
- admin financial overview alone — PASS, 31/31.
- financial boundary plus wallet concurrency — PASS, 2 suites / 9 tests.
- Exact log: `qa-artifacts/financial-production-closure-20260909/fresh-postgres-gates.log`.

Web:

- `npm run typecheck` — PASS.
- `npm run test:component -- --reporter=dot` — PASS, 52 files / 186 tests.
- `npm run build` — PASS.
- `npm run lint` — FAIL, 58 errors / 55 warnings across pre-existing application code. This is disclosed as a release blocker.

Mobile:

- `npm run validate:changed-types` — PASS; the two closure-scope type errors are fixed.
- `npx tsc --noEmit --pretty false` — FAIL, 80 repository-wide errors.
- `npm run validate:i18n` — PASS: 3,805 Arabic fallback keys, 1,748 used/dynamic keys, English coverage 77%.
- `npm run lint` — PASS with 100 warnings and zero errors.
- `npm run test:release-gate -- --silent` — PASS, 5 suites / 20 tests.
- `npm run validate:mobile-runtime` — PASS.
- `npx expo config --type public` — PASS.
- No native APK/AAB/IPA was produced, so native release success is not claimed.

## PostgreSQL concurrency proof status

The existing real-repository suites prove concurrent wallet reservation/capture and financial posting/idempotency boundaries. They do not constitute the four exact requested proofs. The following remain release blockers:

1. refund versus payout with both valid economic outcomes and conservation assertion;
2. final global and per-customer coupon use under two simultaneous checkouts;
3. two concurrent provider webhook handlers with every downstream economic effect asserted once;
4. manual payout versus settlement payout against the same practitioner/currency/funds.

## Remaining risks and verdict

Provider lookup failures are safely retained as unknown/processing, but Paymob needs an authorized manual evidence finalization workflow for the case where its API cannot resolve the result. The operator reconciliation views can display issues, but they do not yet provide that evidence-bound finalization action.

The canonical accounting and existing refund/payout boundaries remain covered by the prior audit plus the passing fresh database suites. No new evidence invalidated those results. However, the explicit release conditions require all four named races, green Web lint, green Mobile full TypeScript, and a complete resolution path for every provider success. Those conditions are not all met.

**Final verdict: NOT READY**

Machine-readable result: `qa-artifacts/financial-production-closure-20260909/closure-summary.json`.

# Final Production Blocker Elimination

**Status update:** 2026-09-13  
**Current verdict:** **NOT READY**

## Previous blockers

| Blocker | Status | Current evidence |
|---|---|---|
| Paymob unresolved external refund | Partially fixed | An evidence-only manual finalization endpoint is restricted by `refunds.approve`. It accepts only `PROCESSING` Paymob refunds whose latest automatic inquiry is `UNKNOWN`, persists an append-only refund event and security audit record, and calls the existing locked finalizer. Unit coverage is 6/6; end-to-end concurrency coverage is still required. |
| Four required PostgreSQL races | Remains | No purpose-built refund/payout, coupon final-use, duplicate-webhook, or payout-path collision proof has been run in this update. |
| Web lint | Remains | 58 errors before; 57 errors after correcting the payment-admin screen's conditional Hook call. |
| Mobile full TypeScript | Closed | `npx tsc --noEmit --pretty false` now passes with zero errors after contracts were restored across assessment, care-chat, matching, discovery, availability, finance, notification, support, and remaining consumer screens. No suppression or `any` escape was added. |
| Native release artifact | Remains | The local Android Gradle release workflow is running but has not yet updated an artifact in this run. The existing APK is from 2026-08-23, and release signing uses the debug keystore, so it cannot be described as a production-signed artifact. |

## Paymob manual evidence finalization

The backend operation is `POST /admin/payments/:paymentId/refunds/:refundId/manual-finalization`. It requires the centralized `refunds.approve` permission and authenticated operator identity. The request contains only an outcome (`SUCCEEDED` or `FAILED`), provider evidence reference, reason, and optional evidence metadata. The server reloads the payment and refund under both advisory financial locks, validates the unresolved Paymob state, appends the evidence to `RefundEvent`, writes the security audit record, and delegates to the same canonical refund finalizer used by provider reconciliation. The admin payment screen renders the form only when the backend explicitly marks the refund eligible; it exposes the refund, provider reference, amount/currency, inquiry timestamp, inquiry result, and provider evidence without offering a retry.

## Commands

| Command | Result |
|---|---|
| Backend `npm run build` | PASS |
| Backend `npx jest src/modules/payments/use-cases/request-payment-refund.use-case.spec.ts --runInBand` | PASS, 6/6 |
| Web `npm run typecheck` after admin UI change | PASS |
| Web full ESLint count | 57 errors |
| Mobile `npx tsc --noEmit --pretty false` | PASS, 0 errors |

## Final verification table

| Area | Result |
|---|---|
| Backend manual-finalization implementation | PASS at build/unit scope |
| Database races | NOT RUN / not proven |
| Web | Typecheck PASS; lint red |
| Mobile | Full TypeScript PASS; release gate 5 suites / 20 tests and runtime safety gate PASS |
| Providers | Paymob manual evidence path needs integration/race proof |
| Accounting | canonical refund finalizer reused; full end-to-end proof pending |

## Final verdict

**NOT READY**

# Final Race & Release Gate

**In progress — 2026-09-13.** A fresh database, `sawiyaa_redteam_final_races_20260913`, was created and migrated from zero with all 149 Prisma migrations. The current evidence is deliberately partial and does not change the verdict.

## Race 4 — Payout Collision

Ten isolated real-PostgreSQL fixtures ran `PractitionerManualPayoutService.record` and `RecordSettlementPayoutService.execute` concurrently for the same practitioner, settlement, currency, and 400 EGP balance. Each final fixture has `amountPaidTotal = 400.00` and exactly one `SETTLEMENT_PAYOUT` debit of 400 EGP; the aggregate query returned ten fixtures and `4000.00` total. The 250/300 collision is still absent, so Race 4 is not complete.

## Web Lint

`npm run lint` completed with **57 errors and 55 warnings**. The error count is unchanged. No ESLint configuration or suppression was changed. The remaining error groups include direct state synchronization inside effects, conditional Hooks, and one component created during render.

## Fresh PostgreSQL

Migration deploy completed successfully on the disposable database. The four exact race proofs and Paymob scheduler-versus-manual proof have not all run; they remain release blockers.

# Production Closure Execution — 2026-09-14

**Current verdict: NOT READY.** This execution preserved the existing working tree and created a new disposable PostgreSQL database, `sawiyaa_redteam_closure_20260914` on local PostgreSQL. All 149 migrations applied from zero and `prisma validate` passed.

| Gate | Final Result | Iterations |
| --- | --- | ---: |
| Race 1 refund wins | PASS (existing boundary proof) | 10 |
| Race 1 payout wins | PASS (existing boundary proof) | 10 |
| Race 2 global coupon | NOT RUN / no purpose-built proof | 0 |
| Race 2 per-patient coupon | NOT RUN / no purpose-built proof | 0 |
| Race 3 duplicate webhook | NOT RUN / no purpose-built proof | 0 |
| Race 4 400/400 | PASS (existing boundary proof) | 10 |
| Race 4 250/300 | NOT RUN / no purpose-built proof | 0 |
| Paymob manual vs scheduler | NOT RUN / no integration proof | 0 |
| Dual manual finalization | NOT RUN / no integration proof | 0 |
| Manual failed path | PASS at unit scope only | — |
| Fresh DB migrations / Prisma validation | PASS (149 migrations) | — |
| Backend targeted finance tests | PASS (31 tests) | — |
| Backend financial boundary suite | PASS (9 tests) | — |
| Web lint errors | 0 | — |
| Web component tests | PASS (186 tests / 52 files) | — |
| Mobile TypeScript errors | 0 | — |
| Android compilation | IN PROGRESS | — |

The full fresh-database proof is not green: the required Race 2, Race 3, both Paymob concurrency proofs, Race 4 250/300, and the final database conservation checks have not been implemented/executed. An admin-financial-overview test run after other suites also demonstrated shared-fixture contamination (2 failures); that test must run on an isolated fresh fixture or scope its assertions before it can be release evidence. The web component suite originally failed only when its jsdom files were run in parallel; the test configuration now uses one fork, after which all 186 tests pass. Mobile release gates are green with 100 permitted lint warnings. Android release compilation was started with the project workflow; the release build is configured with the debug keystore, so production signing remains unconfigured even if compilation succeeds.

# Authoritative Final Readiness State

This table supersedes all interim status tables above. It reflects the current source and commands actually executed on 2026-09-14.

| Gate | Final |
| --- | --- |
| Race 1 refund wins | PASS — 10 real PostgreSQL iterations |
| Race 1 payout wins | PASS — 10 real PostgreSQL iterations |
| Race 2 global coupon | NOT RUN — no purpose-built integration proof exists |
| Race 2 patient coupon | NOT RUN — no purpose-built integration proof exists |
| Race 3 webhook | NOT RUN — no purpose-built integration proof exists |
| Race 4 400/400 | PASS — 10 real PostgreSQL iterations |
| Race 4 250/300 | PASS — 10 real PostgreSQL iterations |
| Paymob auto/manual | NOT RUN — no integration proof exists |
| Dual manual | NOT RUN — no integration proof exists |
| Manual FAILED | PASS at unit scope only; no integration proof |
| Fresh DB migrations / Prisma validation | PASS — 149 migrations |
| Conservation | NOT RUN |
| Web | PASS — lint 0 errors, typecheck, build, 186 component tests |
| Mobile | PASS — TypeScript 0 errors; i18n/runtime/config; 20 release tests; lint 0 errors |
| Android compilation | PASS — `:app:assembleRelease`, fresh APK |
| Production signing | NOT CONFIGURED — debug-signed release APK |

The Android artifact is `D:\Web\full-projects\sawiyaa\sawiyaa-mobile\android\app\build\outputs\apk\release\app-release.apk`, generated by `:app:assembleRelease`, 72,099,720 bytes, SHA-256 `F2A07C557B0C8C9DFF4A74859E059D6CD9B3DDDFF311B9835A55AAF660185A34`, application ID `com.sawiyaa.mobile`, version `1.0.0` / code `1`. It is debug-signed because the Gradle release configuration points to the Android debug keystore.

# Authoritative Final Production Readiness

This section is the final authoritative production-readiness record and supersedes all previous interim readiness tables above. Final regression gates were executed on 2026-09-14 against the current working tree.

| Gate | Final Result |
| --- | --- |
| Race 1 refund wins | PASS ×10 |
| Race 1 payout wins | PASS ×10 |
| Race 2 global coupon | PASS ×10 |
| Race 2 per-patient coupon | PASS ×10 |
| Race 3 duplicate webhook | PASS ×10 |
| Race 4 400/400 | PASS ×10 |
| Race 4 250/300 | PASS ×10 |
| Paymob automatic/manual | PASS ×10 |
| Paymob dual-manual | PASS ×10 |
| Automatic wins first | PASS |
| Manual FAILED | PASS |
| Fresh DB migrations | PASS — 149 |
| Prisma validate | PASS |
| Combined PostgreSQL | PASS — 7 suites / 51 tests |
| Conservation proof | PASS — 14/14 zero violations |
| Backend final regression | PASS — 100 suites / 483 tests; build PASS |
| Web lint | PASS — 0 errors / 0 warnings |
| Web typecheck | PASS |
| Web components | PASS — 186/186 tests |
| Web build | PASS |
| Mobile TypeScript | PASS — 0 errors |
| Mobile i18n | PASS |
| Mobile release tests | PASS — 20/20 |
| Mobile runtime | PASS |
| Mobile Expo config | PASS |
| Mobile lint | PASS — 0 errors / 100 warnings |
| Android native artifact | PASS — expected SHA-256, applicationId, version and versionCode verified |
| Android production signing | NOT CONFIGURED — artifact is debug-signed |

Final verdict: READY WITH CONDITIONS. Configure production Android signing before Play Store release.
