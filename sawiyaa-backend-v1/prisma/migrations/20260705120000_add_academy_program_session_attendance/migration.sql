CREATE TYPE "AcademyProgramSessionAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');

CREATE TABLE "AcademyProgramSessionAttendance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "academyProgramSessionId" UUID NOT NULL,
    "academyProgramEnrollmentId" UUID NOT NULL,
    "attendanceStatus" "AcademyProgramSessionAttendanceStatus" NOT NULL,
    "markedByUserId" UUID,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademyProgramSessionAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcademyProgramSessionAttendance_session_enrollment_key"
  ON "AcademyProgramSessionAttendance"("academyProgramSessionId", "academyProgramEnrollmentId");

CREATE INDEX "AcademyProgramSessionAttendance_session_status_idx"
  ON "AcademyProgramSessionAttendance"("academyProgramSessionId", "attendanceStatus");

CREATE INDEX "AcademyProgramSessionAttendance_enrollment_status_idx"
  ON "AcademyProgramSessionAttendance"("academyProgramEnrollmentId", "attendanceStatus");

CREATE INDEX "AcademyProgramSessionAttendance_markedByUserId_markedAt_idx"
  ON "AcademyProgramSessionAttendance"("markedByUserId", "markedAt");

ALTER TABLE "AcademyProgramSessionAttendance"
  ADD CONSTRAINT "AcademyProgramSessionAttendance_academyProgramSessionId_fkey"
  FOREIGN KEY ("academyProgramSessionId") REFERENCES "AcademyProgramSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AcademyProgramSessionAttendance"
  ADD CONSTRAINT "AcademyProgramSessionAttendance_academyProgramEnrollmentId_fkey"
  FOREIGN KEY ("academyProgramEnrollmentId") REFERENCES "AcademyProgramEnrollment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AcademyProgramSessionAttendance"
  ADD CONSTRAINT "AcademyProgramSessionAttendance_markedByUserId_fkey"
  FOREIGN KEY ("markedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
