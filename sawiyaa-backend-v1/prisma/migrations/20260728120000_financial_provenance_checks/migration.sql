-- Preserve historical rows while preventing new practitioner financial records
-- from bypassing settlement/audit provenance.
ALTER TABLE "LedgerEntry"
  ADD CONSTRAINT "LedgerEntry_practitioner_earning_provenance_check"
  CHECK (
    "entryType" <> 'PRACTITIONER_EARNING'
    OR (
      "settlementId" IS NOT NULL
      AND "actorUserId" IS NOT NULL
      AND "actorType" IS NOT NULL
      AND "effectiveAt" IS NOT NULL
    )
  );

ALTER TABLE "LedgerEntry"
  ADD CONSTRAINT "LedgerEntry_settlement_payout_provenance_check"
  CHECK (
    "entryType" <> 'SETTLEMENT_PAYOUT'
    OR (
      "settlementId" IS NOT NULL
      AND "actorUserId" IS NOT NULL
      AND "actorType" IS NOT NULL
      AND "currencyCode" IS NOT NULL
      AND "amount" IS NOT NULL
      AND "effectiveAt" IS NOT NULL
    )
  );

ALTER TABLE "PractitionerSettlementPayout"
  ADD CONSTRAINT "PractitionerSettlementPayout_actor_provenance_check"
  CHECK (
    "actorUserId" IS NOT NULL
    AND "actorType" IS NOT NULL
    AND "currencyCode" IS NOT NULL
    AND "amountPaid" IS NOT NULL
    AND "effectiveAt" IS NOT NULL
  );
