ALTER TABLE "Session"
  ALTER COLUMN "earningEntitlementId" SET DEFAULT gen_random_uuid();
