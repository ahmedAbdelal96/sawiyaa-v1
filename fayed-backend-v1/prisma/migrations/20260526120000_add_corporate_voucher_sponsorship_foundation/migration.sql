-- AddCorporateVoucherSponsorshipFoundation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Corporate Voucher Sponsorship System — Phase 1 Schema

-- Enums
CREATE TYPE "CorporateOrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');
CREATE TYPE "CorporateContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');
CREATE TYPE "CorporateBillingMode" AS ENUM ('PREPAID', 'POSTPAID', 'HYBRID');
CREATE TYPE "CorporateMarket" AS ENUM ('EGYPT', 'INTERNATIONAL');
CREATE TYPE "CorporateCoverageType" AS ENUM ('FREE_SESSION', 'DISCOUNT_PERCENT', 'FIXED_AMOUNT');
CREATE TYPE "CorporateBenefitPlanStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'EXPIRED');
CREATE TYPE "CorporateBatchStatus" AS ENUM ('GENERATING', 'ACTIVE', 'EXPIRED', 'REVOKED', 'FAILED');
CREATE TYPE "CorporateCodeStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'USED', 'REVOKED', 'EXPIRED');
CREATE TYPE "CorporateSponsorshipStatus" AS ENUM ('RESERVED', 'CONSUMED', 'RELEASED', 'REFUNDED');
CREATE TYPE "CorporateLedgerEventType" AS ENUM ('CODE_GENERATED', 'CODE_RESERVED', 'CODE_CONSUMED', 'CODE_RELEASED', 'CODE_EXPIRED', 'CODE_REVOKED', 'CODE_EXPORTED', 'POSTPAID_SESSION_CHARGE', 'PREPAID_CONSUMPTION', 'MANUAL_ADJUSTMENT');

-- CorporateOrganization
CREATE TABLE "CorporateOrganization" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "companyCode" VARCHAR(50) NOT NULL,
    "countryIsoCode" VARCHAR(3),
    "status" "CorporateOrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "billingEmail" VARCHAR(255) NOT NULL,
    "contactName" VARCHAR(255),
    "contactPhone" VARCHAR(50),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT "CorporateOrganization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CorporateOrganization_companyCode_key" ON "CorporateOrganization"("companyCode");
CREATE UNIQUE INDEX "CorporateOrganization_companyCode_upper_key" ON "CorporateOrganization" (UPPER("companyCode"));
CREATE INDEX "CorporateOrganization_status_idx" ON "CorporateOrganization"("status");

-- CorporateContract
CREATE TABLE "CorporateContract" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "startDate" TIMESTAMPTZ(6) NOT NULL,
    "endDate" TIMESTAMPTZ(6) NOT NULL,
    "status" "CorporateContractStatus" NOT NULL DEFAULT 'DRAFT',
    "billingMode" "CorporateBillingMode" NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "market" "CorporateMarket" NOT NULL,
    "notes" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT "CorporateContract_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CorporateContract_endDate_check" CHECK ("endDate" > "startDate"),
    CONSTRAINT "CorporateContract_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$')
);

CREATE INDEX "CorporateContract_organizationId_status_idx" ON "CorporateContract"("organizationId", "status");
CREATE INDEX "CorporateContract_status_endDate_idx" ON "CorporateContract"("status", "endDate");
ALTER TABLE "CorporateContract" ADD CONSTRAINT "CorporateContract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "CorporateOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CorporateBenefitPlan
CREATE TABLE "CorporateBenefitPlan" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "contractId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "coverageType" "CorporateCoverageType" NOT NULL,
    "coveragePercent" INT,
    "maxCoverageAmount" DECIMAL(12,2),
    "maxTotalCoverage" DECIMAL(14,2),
    "currency" VARCHAR(3) NOT NULL,
    "codeUsageLimit" INT NOT NULL DEFAULT 1,
    "codeReservationTtlMinutes" INT NOT NULL DEFAULT 15,
    "status" "CorporateBenefitPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT "CorporateBenefitPlan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CorporateBenefitPlan_codeUsageLimit_check" CHECK ("codeUsageLimit" = 1),
    CONSTRAINT "CorporateBenefitPlan_ttl_check" CHECK ("codeReservationTtlMinutes" BETWEEN 5 AND 60),
    CONSTRAINT "CorporateBenefitPlan_coveragePercent_check" CHECK ("coveragePercent" IS NULL OR ("coveragePercent" >= 1 AND "coveragePercent" <= 100)),
    CONSTRAINT "CorporateBenefitPlan_maxCoverageAmount_check" CHECK ("maxCoverageAmount" IS NULL OR "maxCoverageAmount" >= 0),
    CONSTRAINT "CorporateBenefitPlan_maxTotalCoverage_check" CHECK ("maxTotalCoverage" IS NULL OR "maxTotalCoverage" >= 0),
    CONSTRAINT "CorporateBenefitPlan_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$')
);

CREATE INDEX "CorporateBenefitPlan_contractId_status_idx" ON "CorporateBenefitPlan"("contractId", "status");
ALTER TABLE "CorporateBenefitPlan" ADD CONSTRAINT "CorporateBenefitPlan_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "CorporateContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CorporateBenefitPlanSpecialty
CREATE TABLE "CorporateBenefitPlanSpecialty" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "planId" UUID NOT NULL,
    "specialtyId" UUID NOT NULL,
    CONSTRAINT "CorporateBenefitPlanSpecialty_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CorporateBenefitPlanSpecialty_planId_specialtyId_idx" ON "CorporateBenefitPlanSpecialty"("planId", "specialtyId");
CREATE INDEX "CorporateBenefitPlanSpecialty_specialtyId_idx" ON "CorporateBenefitPlanSpecialty"("specialtyId");
ALTER TABLE "CorporateBenefitPlanSpecialty" ADD CONSTRAINT "CorporateBenefitPlanSpecialty_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CorporateBenefitPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CorporateBenefitPlanSpecialty" ADD CONSTRAINT "CorporateBenefitPlanSpecialty_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CorporateBenefitPlanPractitioner
CREATE TABLE "CorporateBenefitPlanPractitioner" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "planId" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    CONSTRAINT "CorporateBenefitPlanPractitioner_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CorporateBenefitPlanPractitioner_planId_practitionerId_idx" ON "CorporateBenefitPlanPractitioner"("planId", "practitionerId");
CREATE INDEX "CorporateBenefitPlanPractitioner_practitionerId_idx" ON "CorporateBenefitPlanPractitioner"("practitionerId");
ALTER TABLE "CorporateBenefitPlanPractitioner" ADD CONSTRAINT "CorporateBenefitPlanPractitioner_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CorporateBenefitPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CorporateBenefitPlanPractitioner" ADD CONSTRAINT "CorporateBenefitPlanPractitioner_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CorporateCodeBatch
CREATE TABLE "CorporateCodeBatch" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "benefitPlanId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "totalCodes" INT NOT NULL,
    "generatedCount" INT NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ(6),
    "status" "CorporateBatchStatus" NOT NULL DEFAULT 'GENERATING',
    "createdByAdminId" UUID NOT NULL,
    "exportedAt" TIMESTAMPTZ(6),
    "exportedByAdminId" UUID,
    "revokedAt" TIMESTAMPTZ(6),
    "revokedByAdminId" UUID,
    "revokeReason" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT "CorporateCodeBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CorporateCodeBatch_organizationId_status_idx" ON "CorporateCodeBatch"("organizationId", "status");
CREATE INDEX "CorporateCodeBatch_contractId_status_idx" ON "CorporateCodeBatch"("contractId", "status");
CREATE INDEX "CorporateCodeBatch_benefitPlanId_status_idx" ON "CorporateCodeBatch"("benefitPlanId", "status");
ALTER TABLE "CorporateCodeBatch" ADD CONSTRAINT "CorporateCodeBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "CorporateOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorporateCodeBatch" ADD CONSTRAINT "CorporateCodeBatch_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "CorporateContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorporateCodeBatch" ADD CONSTRAINT "CorporateCodeBatch_benefitPlanId_fkey" FOREIGN KEY ("benefitPlanId") REFERENCES "CorporateBenefitPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CorporateBenefitCode
CREATE TABLE "CorporateBenefitCode" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "benefitPlanId" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "codeHash" VARCHAR(64) NOT NULL,
    "codePrefix" VARCHAR(8) NOT NULL,
    "codeLast4" VARCHAR(4) NOT NULL,
    "pepperVersion" INT NOT NULL DEFAULT 1,
    "status" "CorporateCodeStatus" NOT NULL DEFAULT 'AVAILABLE',
    "usageLimit" INT NOT NULL DEFAULT 1,
    "usedCount" INT NOT NULL DEFAULT 0,
    "reservedByUserId" UUID,
    "reservedSessionId" UUID,
    "reservedUntil" TIMESTAMPTZ(6),
    "usedByUserId" UUID,
    "usedSessionId" UUID,
    "usedAt" TIMESTAMPTZ(6),
    "expiresAt" TIMESTAMPTZ(6),
    "revokedAt" TIMESTAMPTZ(6),
    "revokedByAdminId" UUID,
    "revokeReason" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT "CorporateBenefitCode_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CorporateBenefitCode_usageLimit_check" CHECK ("usageLimit" = 1),
    CONSTRAINT "CorporateBenefitCode_usedCount_check" CHECK ("usedCount" >= 0 AND "usedCount" <= "usageLimit")
);

CREATE UNIQUE INDEX "CorporateBenefitCode_codeHash_key" ON "CorporateBenefitCode"("codeHash");
CREATE INDEX "CorporateBenefitCode_organizationId_status_idx" ON "CorporateBenefitCode"("organizationId", "status");
CREATE INDEX "CorporateBenefitCode_batchId_status_idx" ON "CorporateBenefitCode"("batchId", "status");
CREATE INDEX "CorporateBenefitCode_status_expiresAt_idx" ON "CorporateBenefitCode"("status", "expiresAt");
CREATE INDEX "CorporateBenefitCode_status_reservedUntil_idx" ON "CorporateBenefitCode"("status", "reservedUntil");
CREATE INDEX "CorporateBenefitCode_reservedUntil_idx" ON "CorporateBenefitCode"("reservedUntil");
CREATE INDEX "CorporateBenefitCode_usedByUserId_idx" ON "CorporateBenefitCode"("usedByUserId");
CREATE INDEX "CorporateBenefitCode_usedSessionId_idx" ON "CorporateBenefitCode"("usedSessionId");
CREATE INDEX "CorporateBenefitCode_reservedSessionId_idx" ON "CorporateBenefitCode"("reservedSessionId");
CREATE INDEX "CorporateBenefitCode_organizationId_createdAt_idx" ON "CorporateBenefitCode"("organizationId", "createdAt");
CREATE INDEX "CorporateBenefitCode_benefitPlanId_status_idx" ON "CorporateBenefitCode"("benefitPlanId", "status");
ALTER TABLE "CorporateBenefitCode" ADD CONSTRAINT "CorporateBenefitCode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "CorporateOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorporateBenefitCode" ADD CONSTRAINT "CorporateBenefitCode_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "CorporateContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorporateBenefitCode" ADD CONSTRAINT "CorporateBenefitCode_benefitPlanId_fkey" FOREIGN KEY ("benefitPlanId") REFERENCES "CorporateBenefitPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorporateBenefitCode" ADD CONSTRAINT "CorporateBenefitCode_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "CorporateCodeBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CorporateSessionSponsorship
CREATE TABLE "CorporateSessionSponsorship" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "sessionId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "benefitPlanId" UUID NOT NULL,
    "codeId" UUID NOT NULL,
    "coverageType" "CorporateCoverageType" NOT NULL,
    "billingMode" "CorporateBillingMode" NOT NULL,
    "market" "CorporateMarket",
    "originalAmount" DECIMAL(12,2) NOT NULL,
    "coveredAmount" DECIMAL(12,2) NOT NULL,
    "patientPayAmount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "status" "CorporateSponsorshipStatus" NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT "CorporateSessionSponsorship_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CorporateSessionSponsorship_originalAmount_check" CHECK ("originalAmount" >= 0),
    CONSTRAINT "CorporateSessionSponsorship_coveredAmount_check" CHECK ("coveredAmount" >= 0),
    CONSTRAINT "CorporateSessionSponsorship_patientPayAmount_check" CHECK ("patientPayAmount" >= 0),
    CONSTRAINT "CorporateSessionSponsorship_coveredAmount_lte_check" CHECK ("coveredAmount" <= "originalAmount"),
    CONSTRAINT "CorporateSessionSponsorship_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$')
);

CREATE UNIQUE INDEX "CorporateSessionSponsorship_sessionId_key" ON "CorporateSessionSponsorship"("sessionId");
CREATE INDEX "CorporateSessionSponsorship_organizationId_createdAt_idx" ON "CorporateSessionSponsorship"("organizationId", "createdAt");
CREATE INDEX "CorporateSessionSponsorship_contractId_createdAt_idx" ON "CorporateSessionSponsorship"("contractId", "createdAt");
CREATE INDEX "CorporateSessionSponsorship_benefitPlanId_status_idx" ON "CorporateSessionSponsorship"("benefitPlanId", "status");
CREATE INDEX "CorporateSessionSponsorship_status_createdAt_idx" ON "CorporateSessionSponsorship"("status", "createdAt");
CREATE INDEX "CorporateSessionSponsorship_codeId_idx" ON "CorporateSessionSponsorship"("codeId");
ALTER TABLE "CorporateSessionSponsorship" ADD CONSTRAINT "CorporateSessionSponsorship_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "CorporateOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorporateSessionSponsorship" ADD CONSTRAINT "CorporateSessionSponsorship_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "CorporateContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorporateSessionSponsorship" ADD CONSTRAINT "CorporateSessionSponsorship_benefitPlanId_fkey" FOREIGN KEY ("benefitPlanId") REFERENCES "CorporateBenefitPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorporateSessionSponsorship" ADD CONSTRAINT "CorporateSessionSponsorship_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "CorporateBenefitCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorporateSessionSponsorship" ADD CONSTRAINT "CorporateSessionSponsorship_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CorporateLedger
CREATE TABLE "CorporateLedger" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "contractId" UUID,
    "sessionId" UUID,
    "codeId" UUID,
    "sponsorshipId" UUID,
    "eventType" "CorporateLedgerEventType" NOT NULL,
    "amount" DECIMAL(14,2),
    "currency" VARCHAR(3),
    "quantity" INT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT "CorporateLedger_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CorporateLedger_amount_check" CHECK ("amount" IS NULL OR "amount" >= 0),
    CONSTRAINT "CorporateLedger_quantity_check" CHECK ("quantity" IS NULL OR "quantity" >= 0)
);

CREATE INDEX "CorporateLedger_organizationId_createdAt_idx" ON "CorporateLedger"("organizationId", "createdAt");
CREATE INDEX "CorporateLedger_contractId_createdAt_idx" ON "CorporateLedger"("contractId", "createdAt");
CREATE INDEX "CorporateLedger_sessionId_idx" ON "CorporateLedger"("sessionId");
CREATE INDEX "CorporateLedger_codeId_idx" ON "CorporateLedger"("codeId");
CREATE INDEX "CorporateLedger_sponsorshipId_idx" ON "CorporateLedger"("sponsorshipId");
CREATE INDEX "CorporateLedger_organizationId_eventType_createdAt_idx" ON "CorporateLedger"("organizationId", "eventType", "createdAt");
ALTER TABLE "CorporateLedger" ADD CONSTRAINT "CorporateLedger_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "CorporateOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorporateLedger" ADD CONSTRAINT "CorporateLedger_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "CorporateContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CorporateLedger" ADD CONSTRAINT "CorporateLedger_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CorporateLedger" ADD CONSTRAINT "CorporateLedger_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "CorporateBenefitCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CorporateLedger" ADD CONSTRAINT "CorporateLedger_sponsorshipId_fkey" FOREIGN KEY ("sponsorshipId") REFERENCES "CorporateSessionSponsorship"("id") ON DELETE SET NULL ON UPDATE CASCADE;
