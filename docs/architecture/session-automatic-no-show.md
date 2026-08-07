# Session No-Show Policy

## Phase 3B.1 manual boundary

No-show outcomes remain manual Admin decisions. There is no automatic
finalizer, worker, feature flag, Daily call, or provider-runtime dependency in
this phase. `SessionLifecycleService` remains the only status writer.

| Outcome                | Meaning                               | Package                 | Direct payment                                     | Earning                     |
| ---------------------- | ------------------------------------- | ----------------------- | -------------------------------------------------- | --------------------------- |
| `PATIENT_NO_SHOW`      | Practitioner attended; patient absent | `COUNT_AS_USED`         | No refund or wallet credit                         | Normal earning review, once |
| `PRACTITIONER_NO_SHOW` | Patient attended; practitioner absent | `RESTORE_TO_PACKAGE`    | Paid value credited to patient Sawiyaa Wallet only | No earning review           |
| `BOTH_NO_SHOW`         | Neither participant attended          | Separate Admin decision | Separate Admin decision                            | No automatic earning        |

Patient no-show does not release payout or settlement immediately. Practitioner
no-show never refunds a bank, card, original payment method, or external
provider. The wallet credit uses the session payment currency and the existing
wallet/refund accounting boundary.

## Transaction and replay guarantees

The Admin manual decision locks and re-reads the session, transitions the
status through the lifecycle service, applies the exact package/wallet/earning
effect, and writes the audit event in one PostgreSQL transaction. A stable
session/outcome idempotency key prevents duplicate package decisions, wallet
credits, and earning reviews. Repeating the same terminal decision returns the
existing decision; a different terminal outcome is a typed conflict. Any
failure rolls back the status, financial effects, and audit records together.

The practitioner-owned `mark-no-show` endpoint means that the practitioner is
reporting the patient's absence, so it intentionally produces
`PATIENT_NO_SHOW`. The Admin `MARK_PRACTITIONER_NO_SHOW` decision is the
canonical practitioner-absence path and produces only `PRACTITIONER_NO_SHOW`.

## Phase 3B.2 boundary

Controlled Daily runtime evidence is proven for REST historical meeting
records: booked `user_id` mapping, practitioner-only, patient-only,
both-attended, multi-device interval union, reconnect records, and unknown
identity handling. The adapter reads historical meetings while room presence
remains a current snapshot. Phase 3B.2A additionally proved local delivery of
real signed Daily participant events for practitioner-only and patient-only
synthetic rooms, duplicate replay idempotency, and webhook/REST identity
agreement.

The provider can support `AUTO_PATIENT_NO_SHOW` and
`AUTO_PRACTITIONER_NO_SHOW` at the evidence level when a completed,
non-unknown, non-conflicting observation is supplied to the evaluator.
This phase did not write any no-show status, add a worker, or execute financial
behavior. `AUTO_BOTH_NO_SHOW` remains not proven because an empty room has no
positive historical meeting record. Webhook freshness, signature, source
identity, and duplicate handling are now enforced at the local endpoint, but
these proofs do not enable automation or change the manual financial boundary.
