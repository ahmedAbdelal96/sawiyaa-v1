-- Phase 1 patient home foundation: recently visited specialists tracking

CREATE TABLE "PatientPractitionerView" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "patientId" UUID NOT NULL,
  "practitionerId" UUID NOT NULL,
  "firstViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "viewCount" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PatientPractitionerView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientPractitionerView_patientId_practitionerId_key"
  ON "PatientPractitionerView"("patientId", "practitionerId");

CREATE INDEX "PatientPractitionerView_patientId_lastViewedAt_idx"
  ON "PatientPractitionerView"("patientId", "lastViewedAt");

CREATE INDEX "PatientPractitionerView_practitionerId_idx"
  ON "PatientPractitionerView"("practitionerId");

ALTER TABLE "PatientPractitionerView"
  ADD CONSTRAINT "PatientPractitionerView_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientPractitionerView"
  ADD CONSTRAINT "PatientPractitionerView_practitionerId_fkey"
  FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
