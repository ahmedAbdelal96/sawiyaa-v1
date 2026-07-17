-- Canonical session lifecycle. This migration is intentionally not executed by
-- the application; deploy it before code that expects the new enum values.
ALTER TYPE "SessionEventType"
  ADD VALUE IF NOT EXISTS 'SESSION_AWAITING_COMPLETION_CONFIRMATION';

-- Refund state is orthogonal. An old refund lifecycle status may only become
-- CANCELLED when cancellation evidence exists; ambiguous rows must be resolved
-- before this destructive enum conversion is allowed to proceed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Session" s
    WHERE s."status" IN ('REFUND_PENDING', 'REFUNDED')
      AND s."cancelledAt" IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM "SessionCancellationRecord" c WHERE c."sessionId" = s."id"
      )
  ) THEN
    RAISE EXCEPTION
      'Canonical session lifecycle migration blocked: ambiguous REFUND_PENDING/REFUNDED sessions require a documented manual resolution before deployment.';
  END IF;
END $$;

ALTER TYPE "SessionStatus" RENAME TO "SessionStatus_legacy";

-- These exclusion predicates are enum-typed expressions. Drop them before
-- replacing the enum so PostgreSQL does not compare the old and new enum
-- types during the column conversion. They are recreated below with the
-- canonical lifecycle values.
ALTER TABLE "Session"
  DROP CONSTRAINT IF EXISTS "Session_patient_time_no_overlap_excl",
  DROP CONSTRAINT IF EXISTS "Session_practitioner_time_no_overlap_excl";

CREATE TYPE "SessionStatus" AS ENUM (
  'DRAFT',
  'PENDING_PAYMENT',
  'PENDING_PRACTITIONER_CONFIRMATION',
  'UPCOMING',
  'READY_TO_JOIN',
  'IN_PROGRESS',
  'AWAITING_COMPLETION_CONFIRMATION',
  'COMPLETED',
  'CANCELLED',
  'PATIENT_NO_SHOW',
  'PRACTITIONER_NO_SHOW',
  'BOTH_NO_SHOW',
  'EXPIRED'
);

ALTER TABLE "Session"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "SessionStatus"
  USING (
    CASE
      WHEN "status"::text = 'PENDING_PRACTITIONER_RESPONSE' THEN 'PENDING_PRACTITIONER_CONFIRMATION'
      WHEN "status"::text = 'CONFIRMED' THEN 'UPCOMING'
      WHEN "status"::text = 'NO_SHOW' THEN 'PATIENT_NO_SHOW'
      WHEN "status"::text IN ('REFUND_PENDING', 'REFUNDED') THEN 'CANCELLED'
      WHEN "status"::text IN ('UPCOMING', 'READY_TO_JOIN')
        AND "scheduledEndAt" IS NOT NULL AND "scheduledEndAt" < CURRENT_TIMESTAMP
        THEN 'AWAITING_COMPLETION_CONFIRMATION'
      ELSE "status"::text
    END::"SessionStatus"
  ),
  ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Final decisions are audit history, but they are the strongest available
-- evidence for distinguishing legacy no-show records. This happens after the
-- enum conversion because ALTER COLUMN ... USING cannot safely use subqueries.
UPDATE "Session" s
SET "status" = CASE d."decisionType"
  WHEN 'MARK_COMPLETED' THEN 'COMPLETED'::"SessionStatus"
  WHEN 'MARK_PATIENT_NO_SHOW' THEN 'PATIENT_NO_SHOW'::"SessionStatus"
  WHEN 'MARK_PRACTITIONER_NO_SHOW' THEN 'PRACTITIONER_NO_SHOW'::"SessionStatus"
  WHEN 'MARK_BOTH_NO_SHOW' THEN 'BOTH_NO_SHOW'::"SessionStatus"
  ELSE s."status"
END,
"completedAt" = CASE
  WHEN d."decisionType" = 'MARK_COMPLETED' AND s."completedAt" IS NULL THEN d."createdAt"
  ELSE s."completedAt"
END
FROM (
  SELECT DISTINCT ON ("sessionId") "sessionId", "decisionType", "createdAt"
  FROM "SessionAdminDecision"
  WHERE "isFinal" = true
    AND "decisionType" IN (
      'MARK_COMPLETED',
      'MARK_PATIENT_NO_SHOW',
      'MARK_PRACTITIONER_NO_SHOW',
      'MARK_BOTH_NO_SHOW'
    )
  ORDER BY "sessionId", "createdAt" DESC
) d
WHERE d."sessionId" = s."id";

-- Admin decisions retain their audit status snapshots, converted to canonical
-- values so historical reads stay type-safe after the enum replacement.
ALTER TABLE "SessionAdminDecision"
  ALTER COLUMN "previousSessionStatus" TYPE "SessionStatus"
  USING (
    CASE "previousSessionStatus"::text
      WHEN 'PENDING_PRACTITIONER_RESPONSE' THEN 'PENDING_PRACTITIONER_CONFIRMATION'
      WHEN 'CONFIRMED' THEN 'UPCOMING'
      WHEN 'NO_SHOW' THEN 'PATIENT_NO_SHOW'
      WHEN 'REFUND_PENDING' THEN 'CANCELLED'
      WHEN 'REFUNDED' THEN 'CANCELLED'
      ELSE "previousSessionStatus"::text
    END::"SessionStatus"
  ),
  ALTER COLUMN "nextSessionStatus" TYPE "SessionStatus"
  USING (
    CASE "nextSessionStatus"::text
      WHEN 'PENDING_PRACTITIONER_RESPONSE' THEN 'PENDING_PRACTITIONER_CONFIRMATION'
      WHEN 'CONFIRMED' THEN 'UPCOMING'
      WHEN 'NO_SHOW' THEN 'PATIENT_NO_SHOW'
      WHEN 'REFUND_PENDING' THEN 'CANCELLED'
      WHEN 'REFUNDED' THEN 'CANCELLED'
      ELSE "nextSessionStatus"::text
    END::"SessionStatus"
  );

ALTER TABLE "SessionPackageEntitlementDecision"
  ALTER COLUMN "sessionStatusSnapshot" TYPE "SessionStatus"
  USING (
    CASE "sessionStatusSnapshot"::text
      WHEN 'PENDING_PRACTITIONER_RESPONSE' THEN 'PENDING_PRACTITIONER_CONFIRMATION'
      WHEN 'CONFIRMED' THEN 'UPCOMING'
      WHEN 'NO_SHOW' THEN 'PATIENT_NO_SHOW'
      WHEN 'REFUND_PENDING' THEN 'CANCELLED'
      WHEN 'REFUNDED' THEN 'CANCELLED'
      ELSE "sessionStatusSnapshot"::text
    END::"SessionStatus"
  );

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_patient_time_no_overlap_excl"
  EXCLUDE USING gist (
    "patientId" WITH =,
    tsrange("scheduledStartAt", "scheduledEndAt", '[)') WITH &&
  )
  WHERE (
    "scheduledStartAt" IS NOT NULL
    AND "scheduledEndAt" IS NOT NULL
    AND "status" IN (
      'PENDING_PAYMENT'::"SessionStatus",
      'PENDING_PRACTITIONER_CONFIRMATION'::"SessionStatus",
      'UPCOMING'::"SessionStatus",
      'READY_TO_JOIN'::"SessionStatus",
      'IN_PROGRESS'::"SessionStatus"
    )
  );

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_practitioner_time_no_overlap_excl"
  EXCLUDE USING gist (
    "practitionerId" WITH =,
    tsrange("scheduledStartAt", "scheduledEndAt", '[)') WITH &&
  )
  WHERE (
    "scheduledStartAt" IS NOT NULL
    AND "scheduledEndAt" IS NOT NULL
    AND "status" IN (
      'PENDING_PAYMENT'::"SessionStatus",
      'PENDING_PRACTITIONER_CONFIRMATION'::"SessionStatus",
      'UPCOMING'::"SessionStatus",
      'READY_TO_JOIN'::"SessionStatus",
      'IN_PROGRESS'::"SessionStatus"
    )
  );

DROP TYPE "SessionStatus_legacy";
