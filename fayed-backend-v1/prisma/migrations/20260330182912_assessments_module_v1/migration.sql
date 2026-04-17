-- CreateEnum
CREATE TYPE "AssessmentDefinitionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AssessmentQuestionInputType" AS ENUM ('SINGLE_CHOICE');

-- CreateEnum
CREATE TYPE "AssessmentSubmissionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "AssessmentResultBand" AS ENUM ('LOW', 'MILD', 'MODERATE', 'HIGH');

-- CreateTable
CREATE TABLE "AssessmentDefinition" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(191) NOT NULL,
    "title" VARCHAR(191) NOT NULL,
    "description" VARCHAR(1000),
    "category" VARCHAR(100) NOT NULL,
    "status" "AssessmentDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "introText" VARCHAR(2000),
    "outroText" VARCHAR(2000),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "estimatedDurationMinutes" INTEGER,
    "scoringConfigJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentQuestion" (
    "id" UUID NOT NULL,
    "assessmentDefinitionId" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "prompt" VARCHAR(1000) NOT NULL,
    "description" VARCHAR(1000),
    "order" INTEGER NOT NULL,
    "inputType" "AssessmentQuestionInputType" NOT NULL DEFAULT 'SINGLE_CHOICE',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentOption" (
    "id" UUID NOT NULL,
    "assessmentQuestionId" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "label" VARCHAR(300) NOT NULL,
    "scoreValue" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentSubmission" (
    "id" UUID NOT NULL,
    "assessmentDefinitionId" UUID NOT NULL,
    "patientProfileId" UUID NOT NULL,
    "status" "AssessmentSubmissionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalScore" INTEGER,
    "resultBand" "AssessmentResultBand",
    "resultSummary" VARCHAR(1000),
    "definitionVersionSnapshot" INTEGER NOT NULL,
    "definitionSlugSnapshot" VARCHAR(191) NOT NULL,
    "definitionTitleSnapshot" VARCHAR(191) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentSubmissionAnswer" (
    "id" UUID NOT NULL,
    "assessmentSubmissionId" UUID NOT NULL,
    "assessmentQuestionId" UUID NOT NULL,
    "selectedOptionId" UUID NOT NULL,
    "questionKeySnapshot" VARCHAR(100) NOT NULL,
    "questionPromptSnapshot" VARCHAR(1000) NOT NULL,
    "selectedOptionKeySnapshot" VARCHAR(100) NOT NULL,
    "selectedOptionLabelSnapshot" VARCHAR(300) NOT NULL,
    "scoreValueSnapshot" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentSubmissionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentResultSnapshot" (
    "id" UUID NOT NULL,
    "assessmentSubmissionId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "resultBand" "AssessmentResultBand" NOT NULL,
    "summaryJson" JSONB NOT NULL,
    "nextStepJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentResultSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentDefinition_slug_key" ON "AssessmentDefinition"("slug");

-- CreateIndex
CREATE INDEX "AssessmentDefinition_status_isPublished_createdAt_idx" ON "AssessmentDefinition"("status", "isPublished", "createdAt");

-- CreateIndex
CREATE INDEX "AssessmentDefinition_category_status_idx" ON "AssessmentDefinition"("category", "status");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_assessmentDefinitionId_order_idx" ON "AssessmentQuestion"("assessmentDefinitionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentQuestion_assessmentDefinitionId_key_key" ON "AssessmentQuestion"("assessmentDefinitionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentQuestion_assessmentDefinitionId_order_key" ON "AssessmentQuestion"("assessmentDefinitionId", "order");

-- CreateIndex
CREATE INDEX "AssessmentOption_assessmentQuestionId_order_idx" ON "AssessmentOption"("assessmentQuestionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentOption_assessmentQuestionId_key_key" ON "AssessmentOption"("assessmentQuestionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentOption_assessmentQuestionId_order_key" ON "AssessmentOption"("assessmentQuestionId", "order");

-- CreateIndex
CREATE INDEX "AssessmentSubmission_patientProfileId_createdAt_idx" ON "AssessmentSubmission"("patientProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "AssessmentSubmission_assessmentDefinitionId_createdAt_idx" ON "AssessmentSubmission"("assessmentDefinitionId", "createdAt");

-- CreateIndex
CREATE INDEX "AssessmentSubmission_status_createdAt_idx" ON "AssessmentSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AssessmentSubmissionAnswer_assessmentSubmissionId_createdAt_idx" ON "AssessmentSubmissionAnswer"("assessmentSubmissionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentSubmissionAnswer_assessmentSubmissionId_assessmen_key" ON "AssessmentSubmissionAnswer"("assessmentSubmissionId", "assessmentQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentResultSnapshot_assessmentSubmissionId_key" ON "AssessmentResultSnapshot"("assessmentSubmissionId");

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_assessmentDefinitionId_fkey" FOREIGN KEY ("assessmentDefinitionId") REFERENCES "AssessmentDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentOption" ADD CONSTRAINT "AssessmentOption_assessmentQuestionId_fkey" FOREIGN KEY ("assessmentQuestionId") REFERENCES "AssessmentQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSubmission" ADD CONSTRAINT "AssessmentSubmission_assessmentDefinitionId_fkey" FOREIGN KEY ("assessmentDefinitionId") REFERENCES "AssessmentDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSubmission" ADD CONSTRAINT "AssessmentSubmission_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSubmissionAnswer" ADD CONSTRAINT "AssessmentSubmissionAnswer_assessmentSubmissionId_fkey" FOREIGN KEY ("assessmentSubmissionId") REFERENCES "AssessmentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSubmissionAnswer" ADD CONSTRAINT "AssessmentSubmissionAnswer_assessmentQuestionId_fkey" FOREIGN KEY ("assessmentQuestionId") REFERENCES "AssessmentQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSubmissionAnswer" ADD CONSTRAINT "AssessmentSubmissionAnswer_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "AssessmentOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResultSnapshot" ADD CONSTRAINT "AssessmentResultSnapshot_assessmentSubmissionId_fkey" FOREIGN KEY ("assessmentSubmissionId") REFERENCES "AssessmentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
