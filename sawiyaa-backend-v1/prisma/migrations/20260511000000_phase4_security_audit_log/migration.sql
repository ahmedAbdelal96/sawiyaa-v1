-- Phase 4: Security Audit Log
-- Creates SecurityAuditOutcome enum and SecurityAuditLog table.
-- Applied manually via migrate resolve (DB already has this table from db push during development).

CREATE TYPE "SecurityAuditOutcome" AS ENUM ('SUCCESS', 'FAILURE', 'DENIED');

CREATE TABLE "SecurityAuditLog" (
    "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
    "action"        VARCHAR(120) NOT NULL,
    "outcome"       "SecurityAuditOutcome" NOT NULL,
    "actorUserId"   UUID,
    "actorRolesJson" JSONB,
    "resourceType"  VARCHAR(100),
    "resourceId"    VARCHAR(191),
    "targetUserId"  UUID,
    "ipAddress"     VARCHAR(64),
    "userAgent"     VARCHAR(500),
    "correlationId" VARCHAR(191),
    "reason"        VARCHAR(500),
    "metadataJson"  JSONB,
    "occurredAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecurityAuditLog_action_occurredAt_idx" ON "SecurityAuditLog"("action", "occurredAt");
CREATE INDEX "SecurityAuditLog_actorUserId_occurredAt_idx" ON "SecurityAuditLog"("actorUserId", "occurredAt");
CREATE INDEX "SecurityAuditLog_outcome_occurredAt_idx" ON "SecurityAuditLog"("outcome", "occurredAt");
CREATE INDEX "SecurityAuditLog_resourceType_resourceId_idx" ON "SecurityAuditLog"("resourceType", "resourceId");
CREATE INDEX "SecurityAuditLog_occurredAt_idx" ON "SecurityAuditLog"("occurredAt");
