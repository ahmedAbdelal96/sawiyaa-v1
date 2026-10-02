ALTER TABLE "InstantBookingRequest"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS "InstantBookingRequest_patientId_idempotencyKey_key"
  ON "InstantBookingRequest" ("patientId", "idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "InstantBookingRequest_active_patient_practitioner_key"
  ON "InstantBookingRequest" ("patientId", "practitionerId")
  WHERE "status" = 'PENDING' AND "linkedSessionId" IS NULL;
