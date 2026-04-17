ALTER TABLE "PractitionerPresence" RENAME COLUMN "presenceStatus" TO "status";
ALTER TABLE "PractitionerPresence" RENAME COLUMN "instantBookingLiveEnabled" TO "isInstantBookingEnabled";
ALTER TABLE "PractitionerPresence" RENAME COLUMN "lastSeenAt" TO "lastSeenAtUtc";
ALTER TABLE "PractitionerPresence" RENAME COLUMN "heartbeatAt" TO "lastHeartbeatAtUtc";

ALTER TABLE "PractitionerPresence" DROP COLUMN "manualStatusEnabled";
ALTER TABLE "PractitionerPresence" ADD COLUMN "manuallySetAtUtc" TIMESTAMP(3);

DROP INDEX IF EXISTS "PractitionerPresence_presenceStatus_idx";
DROP INDEX IF EXISTS "PractitionerPresence_instantBookingLiveEnabled_idx";

CREATE INDEX "PractitionerPresence_status_idx" ON "PractitionerPresence"("status");
CREATE INDEX "PractitionerPresence_isInstantBookingEnabled_idx" ON "PractitionerPresence"("isInstantBookingEnabled");
CREATE INDEX "PractitionerPresence_lastSeenAtUtc_idx" ON "PractitionerPresence"("lastSeenAtUtc");
