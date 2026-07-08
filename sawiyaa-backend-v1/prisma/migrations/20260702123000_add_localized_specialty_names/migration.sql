ALTER TABLE "Specialty"
ADD COLUMN "nameAr" VARCHAR(191),
ADD COLUMN "nameEn" VARCHAR(191);

ALTER TABLE "SpecialtyCategory"
ADD COLUMN "nameAr" VARCHAR(191),
ADD COLUMN "nameEn" VARCHAR(191);

UPDATE "SpecialtyCategory"
SET
  "nameEn" = COALESCE(NULLIF("nameEn", ''), "name"),
  "nameAr" = COALESCE(NULLIF("nameAr", ''), "name")
WHERE "name" IS NOT NULL;

UPDATE "Specialty" AS s
SET "nameEn" = COALESCE(
  NULLIF(s."nameEn", ''),
  (
    SELECT st."title"
    FROM "SpecialtyTranslation" st
    WHERE st."specialtyId" = s."id" AND st."locale" = 'en'
    LIMIT 1
  ),
  (
    SELECT st."title"
    FROM "SpecialtyTranslation" st
    WHERE st."specialtyId" = s."id"
    ORDER BY st."createdAt" ASC
    LIMIT 1
  ),
  s."slug"
);

UPDATE "Specialty" AS s
SET "nameAr" = COALESCE(
  NULLIF(s."nameAr", ''),
  (
    SELECT st."title"
    FROM "SpecialtyTranslation" st
    WHERE st."specialtyId" = s."id" AND st."locale" = 'ar'
    LIMIT 1
  ),
  s."nameEn",
  s."slug"
);
