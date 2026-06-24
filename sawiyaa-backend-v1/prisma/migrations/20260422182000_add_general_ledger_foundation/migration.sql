-- CreateEnum
CREATE TYPE "LedgerAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "LedgerAccountScope" AS ENUM ('PLATFORM', 'PRACTITIONER', 'PATIENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "JournalEntrySourceType" AS ENUM ('PAYMENT_CAPTURED', 'REFUND_SUCCEEDED', 'PRACTITIONER_PAYOUT');

-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('POSTED');

-- CreateTable
CREATE TABLE "LedgerAccount" (
    "id" UUID NOT NULL,
    "code" VARCHAR(128) NOT NULL,
    "name" VARCHAR(191) NOT NULL,
    "accountType" "LedgerAccountType" NOT NULL,
    "scope" "LedgerAccountScope" NOT NULL DEFAULT 'PLATFORM',
    "currencyCode" VARCHAR(3) NOT NULL,
    "practitionerId" UUID,
    "patientId" UUID,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" UUID NOT NULL,
    "sourceType" "JournalEntrySourceType" NOT NULL,
    "sourceId" VARCHAR(191) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'POSTED',
    "description" VARCHAR(500),
    "metadataJson" JSONB,
    "correlationId" VARCHAR(191),
    "requestId" VARCHAR(191),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalLine" (
    "id" UUID NOT NULL,
    "journalEntryId" UUID NOT NULL,
    "ledgerAccountId" UUID NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "memo" VARCHAR(500),
    "referenceType" VARCHAR(100),
    "referenceId" VARCHAR(191),
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_ledger_account_code_currency" ON "LedgerAccount"("code", "currencyCode");

-- CreateIndex
CREATE INDEX "LedgerAccount_scope_accountType_isActive_idx" ON "LedgerAccount"("scope", "accountType", "isActive");

-- CreateIndex
CREATE INDEX "LedgerAccount_practitionerId_currencyCode_isActive_idx" ON "LedgerAccount"("practitionerId", "currencyCode", "isActive");

-- CreateIndex
CREATE INDEX "LedgerAccount_patientId_currencyCode_isActive_idx" ON "LedgerAccount"("patientId", "currencyCode", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "uq_journal_entry_source" ON "JournalEntry"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "JournalEntry_occurredAt_idx" ON "JournalEntry"("occurredAt");

-- CreateIndex
CREATE INDEX "JournalEntry_currencyCode_occurredAt_idx" ON "JournalEntry"("currencyCode", "occurredAt");

-- CreateIndex
CREATE INDEX "JournalLine_journalEntryId_idx" ON "JournalLine"("journalEntryId");

-- CreateIndex
CREATE INDEX "JournalLine_ledgerAccountId_idx" ON "JournalLine"("ledgerAccountId");

-- CreateIndex
CREATE INDEX "JournalLine_referenceType_referenceId_idx" ON "JournalLine"("referenceType", "referenceId");

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_ledgerAccountId_fkey" FOREIGN KEY ("ledgerAccountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
