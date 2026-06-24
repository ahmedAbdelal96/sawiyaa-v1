CREATE TABLE "PractitionerManualPayout" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "practitionerId" UUID NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "amountPaid" DECIMAL(18,2) NOT NULL,
  "normalSessionAppliedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "packageReleasedAppliedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "packageHeldAmountSnapshot" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "totalPayableSnapshot" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "payoutMethod" "SettlementPayoutMethod" NOT NULL,
  "transferReference" VARCHAR(191),
  "paidAt" TIMESTAMP(3) NOT NULL,
  "notes" VARCHAR(500),
  "recordedByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PractitionerManualPayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PractitionerManualPayout_transferReference_key" ON "PractitionerManualPayout"("transferReference");
CREATE INDEX "PractitionerManualPayout_practitionerId_currencyCode_paidAt_idx" ON "PractitionerManualPayout"("practitionerId", "currencyCode", "paidAt");

ALTER TABLE "PractitionerManualPayout"
  ADD CONSTRAINT "PractitionerManualPayout_practitionerId_fkey"
  FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PractitionerManualPayout"
  ADD CONSTRAINT "PractitionerManualPayout_recordedByUserId_fkey"
  FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
