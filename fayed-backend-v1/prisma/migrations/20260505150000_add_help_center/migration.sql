-- CreateTable
CREATE TABLE "HelpCategory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(191) NOT NULL,
    "titleAr" VARCHAR(191) NOT NULL,
    "titleEn" VARCHAR(191) NOT NULL,
    "descriptionAr" VARCHAR(500),
    "descriptionEn" VARCHAR(500),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpQuestion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "categoryId" UUID,
    "questionAr" VARCHAR(500) NOT NULL,
    "questionEn" VARCHAR(500) NOT NULL,
    "answerAr" TEXT NOT NULL,
    "answerEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HelpCategory_slug_key" ON "HelpCategory"("slug");

-- CreateIndex
CREATE INDEX "HelpCategory_isActive_sortOrder_idx" ON "HelpCategory"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "HelpQuestion_categoryId_sortOrder_idx" ON "HelpQuestion"("categoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "HelpQuestion_categoryId_isActive_sortOrder_idx" ON "HelpQuestion"("categoryId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "HelpQuestion_isActive_sortOrder_idx" ON "HelpQuestion"("isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "HelpQuestion" ADD CONSTRAINT "HelpQuestion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "HelpCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
