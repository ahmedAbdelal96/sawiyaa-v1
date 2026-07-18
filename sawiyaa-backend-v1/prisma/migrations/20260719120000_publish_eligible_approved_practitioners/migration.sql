-- Repair approved practitioner profiles that were approved before the
-- approval flow published the canonical public profile flag.
-- Only rows satisfying the current public visibility prerequisites are changed.
UPDATE "PractitionerProfile" AS profile
SET "isPublicProfilePublished" = TRUE,
    "updatedAt" = NOW()
WHERE profile."status" = 'APPROVED'
  AND profile."isPublicProfilePublished" = FALSE
  AND NULLIF(BTRIM(profile."publicSlug"), '') IS NOT NULL
  AND NULLIF(BTRIM(profile."professionalTitle"), '') IS NOT NULL
  AND NULLIF(BTRIM(profile."bio"), '') IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "User" AS account
    WHERE account."id" = profile."userId"
      AND account."status" = 'ACTIVE'
      AND NULLIF(BTRIM(account."displayName"), '') IS NOT NULL
  )
  AND EXISTS (
    SELECT 1
    FROM "PractitionerSpecialty" AS practitioner_specialty
    INNER JOIN "Specialty" AS specialty
      ON specialty."id" = practitioner_specialty."specialtyId"
    WHERE practitioner_specialty."practitionerId" = profile."id"
      AND specialty."isActive" = TRUE
  );
