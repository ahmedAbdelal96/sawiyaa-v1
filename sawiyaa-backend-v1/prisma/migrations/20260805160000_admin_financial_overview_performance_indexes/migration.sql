-- Performance indexes for the canonical admin financial overview.
-- These are intentionally partial and cover only authoritative operational states.

CREATE INDEX IF NOT EXISTS "Payment_fin_overview_captured_idx"
  ON "Payment" ("currencyCode", "capturedAt")
  INCLUDE ("amountTotal", "patientId", "practitionerId", "sessionId")
  WHERE status = 'CAPTURED'::"PaymentStatus" AND "capturedAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "CustomerWalletEntry_fin_overview_credit_idx"
  ON "CustomerWalletEntry" ("currencyCode", "effectiveAt")
  INCLUDE (amount, "patientId", "entryType")
  WHERE direction = 'CREDIT'::"CustomerWalletEntryDirection"
    AND "entryType" IN ('REFUND_CREDIT'::"CustomerWalletEntryType", 'MANUAL_CREDIT'::"CustomerWalletEntryType", 'ADJUSTMENT'::"CustomerWalletEntryType");

CREATE INDEX IF NOT EXISTS "SessionEarningReview_fin_overview_candidate_idx"
  ON "SessionEarningReview" ("reviewStatus", "createdAt", "paymentCurrencyCode")
  INCLUDE ("paymentAmount", "suggestedPractitionerAmount", "practitionerId", "patientId", "sessionId", "earningEntitlementId");

CREATE INDEX IF NOT EXISTS "SessionEarningReview_fin_overview_decision_idx"
  ON "SessionEarningReview" ("reviewStatus", "reviewedAt", "paymentCurrencyCode")
  INCLUDE ("accountantApprovedSourceAmount", "paymentAmount", "practitionerId", "patientId", "sessionId", "earningEntitlementId")
  WHERE "reviewStatus" IN ('DECISION_APPROVED'::"SessionEarningReviewStatus", 'APPROVED'::"SessionEarningReviewStatus")
    AND "reviewedAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Session_fin_overview_completed_entitlement_idx"
  ON "Session" (status, "completedAt", "earningEntitlementId")
  INCLUDE ("fundingSource", "packagePurchaseId", "id")
  WHERE status = 'COMPLETED'::"SessionStatus" AND "completedAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "LedgerEntry_fin_overview_practitioner_earning_idx"
  ON "LedgerEntry" ("currencyCode", "effectiveAt")
  INCLUDE (amount, "practitionerId", "sessionId", "sessionEarningReviewId")
  WHERE "entryType" = 'PRACTITIONER_EARNING'::"LedgerEntryType"
    AND direction = 'CREDIT'::"LedgerDirection"
    AND "sessionEarningReviewId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "PractitionerWallet_fin_overview_active_currency_idx"
  ON "PractitionerWallet" ("currencyCode", "practitionerId")
  INCLUDE ("availableBalance", "pendingBalance", "reservedBalance")
  WHERE status = 'ACTIVE'::"PractitionerWalletStatus";

CREATE INDEX IF NOT EXISTS "PractitionerSettlement_fin_overview_pending_idx"
  ON "PractitionerSettlement" (status, "createdAt", "walletCurrencyCode")
  INCLUDE ("finalWalletCredit", "amountPaidTotal", "practitionerId");

CREATE INDEX IF NOT EXISTS "PractitionerSettlement_fin_overview_status_id_idx"
  ON "PractitionerSettlement" (status, id);

CREATE INDEX IF NOT EXISTS "PractitionerSettlementPayout_fin_overview_settlement_idx"
  ON "PractitionerSettlementPayout" ("settlementId", "effectiveAt", "payoutCurrencyCode")
  INCLUDE ("amountPaid", "currencyCode", "practitionerId");
