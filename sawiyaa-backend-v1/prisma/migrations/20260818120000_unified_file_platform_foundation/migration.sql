CREATE TYPE "StoredFileStatus" AS ENUM ('ACTIVE', 'DELETED');
CREATE TYPE "StoredFilePurpose" AS ENUM (
  'USER_AVATAR',
  'PATIENT_AVATAR',
  'PRACTITIONER_AVATAR',
  'PRACTITIONER_CREDENTIAL',
  'CHAT_ATTACHMENT',
  'PAYOUT_PROOF',
  'ARTICLE_COVER',
  'ACADEMY_PROGRAM_COVER',
  'ACADEMY_CERTIFICATE'
);

CREATE TABLE "StoredFile" (
  "id" UUID NOT NULL,
  "storageKey" VARCHAR(500) NOT NULL,
  "originalFileName" VARCHAR(255),
  "mimeType" VARCHAR(100) NOT NULL,
  "extension" VARCHAR(20) NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "sha256" CHAR(64) NOT NULL,
  "purpose" "StoredFilePurpose" NOT NULL,
  "status" "StoredFileStatus" NOT NULL DEFAULT 'ACTIVE',
  "uploadedByUserId" UUID,
  "chatConversationId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoredFile_storageKey_key" ON "StoredFile"("storageKey");
CREATE INDEX "StoredFile_purpose_status_idx" ON "StoredFile"("purpose", "status");
CREATE INDEX "StoredFile_uploadedByUserId_createdAt_idx" ON "StoredFile"("uploadedByUserId", "createdAt");
CREATE INDEX "StoredFile_chatConversationId_purpose_status_idx" ON "StoredFile"("chatConversationId", "purpose", "status");

ALTER TABLE "User" ADD COLUMN "avatarFileId" UUID;
ALTER TABLE "PatientProfile" ADD COLUMN "avatarFileId" UUID;
ALTER TABLE "PractitionerProfile" ADD COLUMN "avatarFileId" UUID;
ALTER TABLE "PractitionerCredential" ADD COLUMN "storedFileId" UUID;
ALTER TABLE "PractitionerSettlementPayoutProof" ADD COLUMN "storedFileId" UUID;
ALTER TABLE "Article" ADD COLUMN "coverStoredFileId" UUID;
ALTER TABLE "MessageAttachment" ADD COLUMN "storedFileId" UUID;
ALTER TABLE "AcademyProgram" ADD COLUMN "coverStoredFileId" UUID;
ALTER TABLE "AcademyProgramEnrollment" ADD COLUMN "certificateStoredFileId" UUID;

CREATE UNIQUE INDEX "User_avatarFileId_key" ON "User"("avatarFileId");
CREATE UNIQUE INDEX "PatientProfile_avatarFileId_key" ON "PatientProfile"("avatarFileId");
CREATE UNIQUE INDEX "PractitionerProfile_avatarFileId_key" ON "PractitionerProfile"("avatarFileId");
CREATE UNIQUE INDEX "PractitionerCredential_storedFileId_key" ON "PractitionerCredential"("storedFileId");
CREATE UNIQUE INDEX "PractitionerSettlementPayoutProof_storedFileId_key" ON "PractitionerSettlementPayoutProof"("storedFileId");
CREATE UNIQUE INDEX "Article_coverStoredFileId_key" ON "Article"("coverStoredFileId");
CREATE UNIQUE INDEX "MessageAttachment_storedFileId_key" ON "MessageAttachment"("storedFileId");
CREATE UNIQUE INDEX "AcademyProgram_coverStoredFileId_key" ON "AcademyProgram"("coverStoredFileId");
CREATE UNIQUE INDEX "AcademyProgramEnrollment_certificateStoredFileId_key" ON "AcademyProgramEnrollment"("certificateStoredFileId");

ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_chatConversationId_fkey" FOREIGN KEY ("chatConversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_avatarFileId_fkey" FOREIGN KEY ("avatarFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_avatarFileId_fkey" FOREIGN KEY ("avatarFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PractitionerProfile" ADD CONSTRAINT "PractitionerProfile_avatarFileId_fkey" FOREIGN KEY ("avatarFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PractitionerCredential" ADD CONSTRAINT "PractitionerCredential_storedFileId_fkey" FOREIGN KEY ("storedFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PractitionerSettlementPayoutProof" ADD CONSTRAINT "PractitionerSettlementPayoutProof_storedFileId_fkey" FOREIGN KEY ("storedFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Article" ADD CONSTRAINT "Article_coverStoredFileId_fkey" FOREIGN KEY ("coverStoredFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_storedFileId_fkey" FOREIGN KEY ("storedFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcademyProgram" ADD CONSTRAINT "AcademyProgram_coverStoredFileId_fkey" FOREIGN KEY ("coverStoredFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcademyProgramEnrollment" ADD CONSTRAINT "AcademyProgramEnrollment_certificateStoredFileId_fkey" FOREIGN KEY ("certificateStoredFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
