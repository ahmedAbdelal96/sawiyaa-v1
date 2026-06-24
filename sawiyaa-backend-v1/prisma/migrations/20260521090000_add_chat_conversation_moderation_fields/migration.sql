ALTER TABLE "Conversation"
ADD COLUMN "adminSendingDisabledAt" TIMESTAMP(3),
ADD COLUMN "adminSendingDisabledByUserId" UUID,
ADD COLUMN "adminSendingDisabledReason" VARCHAR(500),
ADD COLUMN "adminSendingEnabledAt" TIMESTAMP(3),
ADD COLUMN "adminSendingEnabledByUserId" UUID,
ADD COLUMN "practitionerSendingDisabledAt" TIMESTAMP(3),
ADD COLUMN "practitionerSendingDisabledByUserId" UUID,
ADD COLUMN "practitionerSendingDisabledReason" VARCHAR(500),
ADD COLUMN "practitionerSendingEnabledAt" TIMESTAMP(3),
ADD COLUMN "practitionerSendingEnabledByUserId" UUID;
