-- AlterTable
ALTER TABLE "AcademyLearner" ADD COLUMN "userId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "AcademyLearner_userId_key" ON "AcademyLearner"("userId");

-- AddForeignKey
ALTER TABLE "AcademyLearner"
ADD CONSTRAINT "AcademyLearner_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
