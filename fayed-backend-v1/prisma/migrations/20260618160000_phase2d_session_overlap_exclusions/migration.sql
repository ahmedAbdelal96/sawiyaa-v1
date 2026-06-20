BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

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
    'PENDING_PAYMENT',
    'PENDING_PRACTITIONER_RESPONSE',
    'CONFIRMED',
    'UPCOMING',
    'READY_TO_JOIN',
    'IN_PROGRESS'
  )
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
    'PENDING_PAYMENT',
    'PENDING_PRACTITIONER_RESPONSE',
    'CONFIRMED',
    'UPCOMING',
    'READY_TO_JOIN',
    'IN_PROGRESS'
  )
);

COMMIT;
