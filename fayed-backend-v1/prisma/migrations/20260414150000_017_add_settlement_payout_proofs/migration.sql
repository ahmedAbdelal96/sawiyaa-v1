CREATE TABLE "PractitionerSettlementPayoutProof" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payoutId" UUID NOT NULL,
  "storedFileName" VARCHAR(191) NOT NULL,
  "storagePath" VARCHAR(500) NOT NULL,
  "mimeType" VARCHAR(100) NOT NULL,
  "fileSizeBytes" INTEGER NOT NULL,
  "originalFileName" VARCHAR(255),
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PractitionerSettlementPayoutProof_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PractitionerSettlementPayoutProof_payoutId_key" ON "PractitionerSettlementPayoutProof"("payoutId");
CREATE INDEX "PractitionerSettlementPayoutProof_uploadedAt_idx" ON "PractitionerSettlementPayoutProof"("uploadedAt");

ALTER TABLE "PractitionerSettlementPayoutProof"
  ADD CONSTRAINT "PractitionerSettlementPayoutProof_payoutId_fkey"
  FOREIGN KEY ("payoutId") REFERENCES "PractitionerSettlementPayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
