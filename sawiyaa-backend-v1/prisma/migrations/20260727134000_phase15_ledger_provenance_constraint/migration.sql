-- Enforce practitioner earning provenance at the database boundary.
ALTER TABLE "LedgerEntry"
  ADD CONSTRAINT "LedgerEntry_practitioner_earning_provenance_chk"
  CHECK (
    "entryType" <> 'PRACTITIONER_EARNING'
    OR (
      "settlementId" IS NOT NULL
      AND "actorUserId" IS NOT NULL
      AND "actorType" IS NOT NULL
      AND "effectiveAt" IS NOT NULL
    )
  );
