-- CreateEnum
CREATE TYPE "MatchingSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "MatchingAnswerKey" AS ENUM ('PRIMARY_CONCERN', 'PREFERRED_SPECIALTY', 'PREFERRED_LANGUAGE', 'PREFERRED_PRACTITIONER_GENDER', 'SESSION_MODE', 'URGENCY', 'BUDGET_RANGE', 'FIRST_TIME_IN_THERAPY', 'PREFERRED_PROVIDER_TYPE', 'PREFER_INSTANT_BOOKING', 'COUNTRY_CODE', 'TIMEZONE');

-- CreateTable
CREATE TABLE "MatchingSession" (
    "id" UUID NOT NULL,
    "patientProfileId" UUID,
    "anonymousSessionId" VARCHAR(191),
    "status" "MatchingSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchingAnswer" (
    "id" UUID NOT NULL,
    "matchingSessionId" UUID NOT NULL,
    "key" "MatchingAnswerKey" NOT NULL,
    "valueJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchingAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchingRecommendation" (
    "id" UUID NOT NULL,
    "matchingSessionId" UUID NOT NULL,
    "practitionerProfileId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "rationaleJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchingRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchingSession_patientProfileId_createdAt_idx" ON "MatchingSession"("patientProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "MatchingSession_anonymousSessionId_createdAt_idx" ON "MatchingSession"("anonymousSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "MatchingSession_status_createdAt_idx" ON "MatchingSession"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MatchingAnswer_key_createdAt_idx" ON "MatchingAnswer"("key", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MatchingAnswer_matchingSessionId_key_key" ON "MatchingAnswer"("matchingSessionId", "key");

-- CreateIndex
CREATE INDEX "MatchingRecommendation_practitionerProfileId_createdAt_idx" ON "MatchingRecommendation"("practitionerProfileId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MatchingRecommendation_matchingSessionId_practitionerProfil_key" ON "MatchingRecommendation"("matchingSessionId", "practitionerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchingRecommendation_matchingSessionId_rank_key" ON "MatchingRecommendation"("matchingSessionId", "rank");

-- AddForeignKey
ALTER TABLE "MatchingSession" ADD CONSTRAINT "MatchingSession_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchingAnswer" ADD CONSTRAINT "MatchingAnswer_matchingSessionId_fkey" FOREIGN KEY ("matchingSessionId") REFERENCES "MatchingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchingRecommendation" ADD CONSTRAINT "MatchingRecommendation_matchingSessionId_fkey" FOREIGN KEY ("matchingSessionId") REFERENCES "MatchingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchingRecommendation" ADD CONSTRAINT "MatchingRecommendation_practitionerProfileId_fkey" FOREIGN KEY ("practitionerProfileId") REFERENCES "PractitionerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
