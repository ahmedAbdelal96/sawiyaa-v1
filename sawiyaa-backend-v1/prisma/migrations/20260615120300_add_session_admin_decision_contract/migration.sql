-- Migration: add_session_admin_decision_contract
-- Adds SessionAdminDecision model with full contract fields, status tracking, and evidence snapshots.
-- Prisma migration timestamp: 2026-06-15

BEGIN;

-- Create enum value for SessionAdminDecisionType if not exists (handled by Prisma)

-- Create SessionAdminDecision table
CREATE TABLE "SessionAdminDecision" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId" UUID NOT NULL,
  "decisionType" TEXT NOT NULL,
  "decidedByUserId" UUID NOT NULL,
  "previousSessionStatus" TEXT NOT NULL,
  "nextSessionStatus" TEXT,
  "reasonCode" VARCHAR(100) NOT NULL,
  "adminNote" VARCHAR(2000),
  "recommendedOutcomeSnapshot" JSONB,
  "attendanceSummarySnapshot" JSONB,
  "evidenceTimelineSnapshot" JSONB,
  "isFinal" BOOLEAN NOT NULL DEFAULT true,
  "supersedesDecisionId" UUID UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),

  CONSTRAINT "fk_session" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_decided_by" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_supersedes" FOREIGN KEY ("supersedesDecisionId") REFERENCES "SessionAdminDecision"("id") ON DELETE SET NULL
);

-- Indexes
CREATE INDEX "idx_session_admin_decision_session_created" ON "SessionAdminDecision"("sessionId", "createdAt");
CREATE INDEX "idx_session_admin_decision_decided_by" ON "SessionAdminDecision"("decidedByUserId");
CREATE INDEX "idx_session_admin_decision_session_is_final" ON "SessionAdminDecision"("sessionId", "isFinal", "createdAt");

-- Add SessionEventType values for audit events (handled by Prisma via enum; raw SQL for completeness)
-- ADMIN_MANUAL_DECISION_CREATED and ADMIN_MANUAL_DECISION_SUPERSEDED are already in the enum

-- Add relation to User model (Prisma manages this via schema; foreign key already defined above)

COMMIT;
