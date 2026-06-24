-- CreateTable
CREATE TABLE "PasswordResetSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "UserRoleType" NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "invalidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetSession_tokenHash_key" ON "PasswordResetSession"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetSession_userId_role_idx" ON "PasswordResetSession"("userId", "role");

-- CreateIndex
CREATE INDEX "PasswordResetSession_expiresAt_idx" ON "PasswordResetSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "PasswordResetSession" ADD CONSTRAINT "PasswordResetSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "uq_practitioner_availability_week" RENAME TO "PractitionerAvailabilityWeek_practitionerId_weekStartDate_key";

-- RenameIndex
ALTER INDEX "uq_practitioner_availability_week_slot" RENAME TO "PractitionerAvailabilityWeekSlot_weekId_weekday_startMinute_key";
