-- Enforce one active earning-review candidate per economic entitlement.
-- Historical replacement rows are allowed only after the superseded review
-- leaves the active set.
CREATE UNIQUE INDEX "uq_session_earning_review_active_entitlement"
ON "SessionEarningReview" ("earningEntitlementId")
WHERE "reviewStatus" IN ('PENDING_REVIEW', 'DECISION_APPROVED', 'APPROVED');

-- A financial stage is one operation per entitlement.  Retries use the
-- idempotency key, but a new key must not create a second Stage A/B/C effect.
CREATE UNIQUE INDEX "uq_financial_operation_entitlement_type"
ON "FinancialOperationIdempotency" ("earningEntitlementId", "operationType");
