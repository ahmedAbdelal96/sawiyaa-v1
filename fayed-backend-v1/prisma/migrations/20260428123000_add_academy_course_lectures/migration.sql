-- CreateTable
CREATE TABLE "AcademyCourseLecture" (
    "id" UUID NOT NULL,
    "academyCourseId" UUID NOT NULL,
    "lectureOrder" INTEGER NOT NULL,
    "lectureTitle" VARCHAR(191),
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyCourseLecture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcademyCourseLecture_academyCourseId_startsAt_idx" ON "AcademyCourseLecture"("academyCourseId", "startsAt");

-- CreateIndex
CREATE INDEX "AcademyCourseLecture_createdByUserId_createdAt_idx" ON "AcademyCourseLecture"("createdByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AcademyCourseLecture_startsAt_endsAt_idx" ON "AcademyCourseLecture"("startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyCourseLecture_academyCourseId_lectureOrder_key" ON "AcademyCourseLecture"("academyCourseId", "lectureOrder");

-- AddForeignKey
ALTER TABLE "AcademyCourseLecture" ADD CONSTRAINT "AcademyCourseLecture_academyCourseId_fkey" FOREIGN KEY ("academyCourseId") REFERENCES "AcademyCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyCourseLecture" ADD CONSTRAINT "AcademyCourseLecture_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
