CREATE TYPE "PractitionerPayoutMethodType" AS ENUM (
  'BANK_ACCOUNT',
  'IBAN',
  'WALLET',
  'OTHER'
);

ALTER TABLE "PractitionerApplication"
  ADD COLUMN "reviewDecisionReason" VARCHAR(500),
  ADD COLUMN "reviewedByUserId" UUID,
  ADD COLUMN "submissionSnapshot" JSONB;

ALTER TABLE "PractitionerCredential"
  ADD COLUMN "reviewNotes" VARCHAR(1000),
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedByUserId" UUID;

ALTER TABLE "PractitionerProfile"
  ADD COLUMN "primarySpecialtyCategoryId" UUID;

CREATE TABLE "PractitionerPayoutDestination" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "practitionerId" UUID NOT NULL,
  "methodType" "PractitionerPayoutMethodType" NOT NULL,
  "accountHolderName" VARCHAR(191),
  "bankName" VARCHAR(191),
  "bankAccountNumber" VARCHAR(191),
  "iban" VARCHAR(191),
  "walletProvider" VARCHAR(191),
  "walletIdentifier" VARCHAR(191),
  "otherDetails" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PractitionerPayoutDestination_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PractitionerPayoutDestination_practitionerId_key"
  ON "PractitionerPayoutDestination"("practitionerId");

CREATE INDEX "PractitionerPayoutDestination_methodType_idx"
  ON "PractitionerPayoutDestination"("methodType");

CREATE INDEX "PractitionerApplication_reviewedByUserId_reviewedAt_idx"
  ON "PractitionerApplication"("reviewedByUserId", "reviewedAt");

CREATE INDEX "PractitionerCredential_reviewedByUserId_reviewedAt_idx"
  ON "PractitionerCredential"("reviewedByUserId", "reviewedAt");

CREATE INDEX "PractitionerProfile_primarySpecialtyCategoryId_status_idx"
  ON "PractitionerProfile"("primarySpecialtyCategoryId", "status");

ALTER TABLE "PractitionerProfile"
  ADD CONSTRAINT "PractitionerProfile_primarySpecialtyCategoryId_fkey"
  FOREIGN KEY ("primarySpecialtyCategoryId")
  REFERENCES "SpecialtyCategory"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "PractitionerPayoutDestination"
  ADD CONSTRAINT "PractitionerPayoutDestination_practitionerId_fkey"
  FOREIGN KEY ("practitionerId")
  REFERENCES "PractitionerProfile"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
