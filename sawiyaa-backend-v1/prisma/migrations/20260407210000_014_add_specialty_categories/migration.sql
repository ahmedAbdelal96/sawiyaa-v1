-- Add practitioner specialty categories and link specialties to categories.

CREATE TABLE "SpecialtyCategory" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(191) NOT NULL,
    "name" VARCHAR(191) NOT NULL,
    "description" VARCHAR(1000),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SpecialtyCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SpecialtyCategory_slug_key" ON "SpecialtyCategory"("slug");
CREATE INDEX "SpecialtyCategory_isActive_sortOrder_idx" ON "SpecialtyCategory"("isActive", "sortOrder");

ALTER TABLE "Specialty"
ADD COLUMN "categoryId" UUID;

CREATE INDEX "Specialty_categoryId_isActive_sortOrder_idx" ON "Specialty"("categoryId", "isActive", "sortOrder");

ALTER TABLE "Specialty"
ADD CONSTRAINT "Specialty_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "SpecialtyCategory"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "SpecialtyCategory" (
    "id",
    "slug",
    "name",
    "description",
    "sortOrder",
    "isActive",
    "createdAt",
    "updatedAt"
) VALUES
    ('11111111-1111-4111-8111-111111111111', 'mental-health', 'Mental Health', 'Psychological and behavioral care specialties', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('22222222-2222-4222-8222-222222222222', 'nutrition', 'Nutrition', 'Nutrition and food-behavior specialties', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('33333333-3333-4333-8333-333333333333', 'sports-therapy', 'Sports Therapy', 'Movement, fitness, and performance-related specialties', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
