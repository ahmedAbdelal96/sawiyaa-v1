-- BLOC-2B: additive practitioner professional-content localization foundation.
-- Legacy PractitionerProfile.professionalTitle/bio remain untouched and are
-- still the compatibility/live fallback source.
CREATE TABLE "PractitionerProfileTranslation" (
    "id" UUID NOT NULL,
    "practitionerProfileId" UUID NOT NULL,
    "locale" "ContentLocale" NOT NULL,
    "professionalTitle" VARCHAR(191),
    "bio" VARCHAR(4000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerProfileTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PractitionerProfileTranslation_practitionerProfileId_locale_key"
    ON "PractitionerProfileTranslation"("practitionerProfileId", "locale");

CREATE INDEX "PractitionerProfileTranslation_locale_practitionerProfileId_idx"
    ON "PractitionerProfileTranslation"("locale", "practitionerProfileId");

ALTER TABLE "PractitionerProfileTranslation"
    ADD CONSTRAINT "PractitionerProfileTranslation_practitionerProfileId_fkey"
    FOREIGN KEY ("practitionerProfileId") REFERENCES "PractitionerProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PractitionerProfile"
    ADD COLUMN "primaryContentLocale" "ContentLocale";
