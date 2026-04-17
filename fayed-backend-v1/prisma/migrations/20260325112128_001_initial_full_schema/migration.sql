-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'PENDING_APPROVAL', 'DELETED');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('PASSWORD', 'GOOGLE', 'APPLE');

-- CreateEnum
CREATE TYPE "UserRoleType" AS ENUM ('PATIENT', 'PRACTITIONER', 'ADMIN', 'SUPPORT', 'CONTENT_REVIEWER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'VERIFY_EMAIL', 'VERIFY_PHONE', 'RESET_PASSWORD');

-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "PractitionerStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PractitionerType" AS ENUM ('PSYCHOLOGIST', 'PSYCHIATRIST', 'NUTRITIONIST', 'WEIGHT_LOSS_SPECIALIST', 'COUNSELOR', 'OTHER');

-- CreateEnum
CREATE TYPE "PractitionerApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('LICENSE', 'DEGREE', 'CERTIFICATION', 'NATIONAL_ID', 'PASSPORT', 'MEMBERSHIP', 'OTHER');

-- CreateEnum
CREATE TYPE "CredentialReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AvailabilityWeekday" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- CreateEnum
CREATE TYPE "SlotType" AS ENUM ('REGULAR', 'FOLLOW_UP', 'BREAK');

-- CreateEnum
CREATE TYPE "AvailabilityExceptionType" AS ENUM ('FULL_DAY_BLOCK', 'PARTIAL_BLOCK', 'MANUAL_OVERRIDE');

-- CreateEnum
CREATE TYPE "PresenceStatus" AS ENUM ('OFFLINE', 'ONLINE', 'AWAY', 'BUSY');

-- CreateEnum
CREATE TYPE "SessionFlowType" AS ENUM ('SCHEDULED', 'INSTANT');

-- CreateEnum
CREATE TYPE "SessionMode" AS ENUM ('VIDEO', 'AUDIO', 'CHAT');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'PENDING_PRACTITIONER_RESPONSE', 'CONFIRMED', 'UPCOMING', 'READY_TO_JOIN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'EXPIRED', 'REFUND_PENDING', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SessionProvider" AS ENUM ('NONE', 'DAILY', 'ZOOM');

-- CreateEnum
CREATE TYPE "SessionEventType" AS ENUM ('SESSION_CREATED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'PRACTITIONER_ACCEPTED', 'PRACTITIONER_REJECTED', 'SESSION_CONFIRMED', 'SESSION_READY_TO_JOIN', 'PATIENT_JOINED', 'PRACTITIONER_JOINED', 'SESSION_STARTED', 'SESSION_COMPLETED', 'CANCELLED_BY_PATIENT', 'CANCELLED_BY_PRACTITIONER', 'EXPIRED_UNPAID', 'NO_SHOW_PATIENT', 'NO_SHOW_PRACTITIONER', 'PROVIDER_ROOM_CREATED', 'PROVIDER_ROOM_ENDED');

-- CreateEnum
CREATE TYPE "InstantBookingRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'CONVERTED_TO_SESSION');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('SESSION_BOOKING', 'SESSION_INSTANT_BOOKING', 'SESSION_EXTENSION', 'COURSE_ENROLLMENT', 'MANUAL_INVOICE');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'PAYMOB');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'REQUIRES_ACTION', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentEventType" AS ENUM ('PAYMENT_CREATED', 'PROVIDER_CHECKOUT_CREATED', 'PROVIDER_WEBHOOK_RECEIVED', 'PAYMENT_AUTHORIZED', 'PAYMENT_CAPTURED', 'PAYMENT_FAILED', 'PAYMENT_CANCELLED', 'PAYMENT_EXPIRED', 'REFUND_REQUESTED', 'REFUND_PROCESSED');

-- CreateEnum
CREATE TYPE "RefundType" AS ENUM ('FULL', 'PARTIAL');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('SESSION_GROSS', 'PLATFORM_COMMISSION', 'PRACTITIONER_EARNING', 'COUPON_PLATFORM_SHARE', 'COUPON_PRACTITIONER_SHARE', 'REFUND_PLATFORM_REVERSAL', 'REFUND_PRACTITIONER_REVERSAL', 'MANUAL_ADJUSTMENT', 'SETTLEMENT_PAYOUT', 'SETTLEMENT_REVERSAL');

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "WalletBalanceBucket" AS ENUM ('AVAILABLE', 'PENDING', 'RESERVED');

-- CreateEnum
CREATE TYPE "SettlementBatchStatus" AS ENUM ('DRAFT', 'GENERATED', 'FINALIZED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PractitionerSettlementStatus" AS ENUM ('DRAFT', 'READY', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommissionRuleScope" AS ENUM ('GLOBAL', 'COUNTRY_PAIR', 'SPECIALTY', 'SESSION_MODE', 'SESSION_FLOW', 'PRACTITIONER_SEGMENT');

-- CreateEnum
CREATE TYPE "MarketType" AS ENUM ('LOCAL', 'CROSS_BORDER', 'ANY');

-- CreateEnum
CREATE TYPE "CouponScope" AS ENUM ('PRACTITIONER_SESSIONS', 'PLATFORM_WIDE', 'SPECIALTY', 'CAMPAIGN');

-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'EXPIRED', 'DISABLED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ArticleVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContentLocale" AS ENUM ('ar', 'en');

-- CreateEnum
CREATE TYPE "ModerationEventType" AS ENUM ('SUBMITTED_FOR_REVIEW', 'MOVED_TO_IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED', 'CATEGORY_CHANGED', 'SLUG_CHANGED', 'UPDATED_AFTER_REVIEW');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('SUPPORT', 'CARE_APPROVED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'PENDING', 'CLOSED', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ConversationParticipantRole" AS ENUM ('PATIENT', 'PRACTITIONER', 'SUPPORT_AGENT', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'SYSTEM', 'FILE', 'IMAGE', 'NOTE_REFERENCE', 'APPROVAL_NOTICE');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "MessageVisibility" AS ENUM ('NORMAL', 'HIDDEN_FROM_PARTIES', 'INTERNAL_ONLY');

-- CreateEnum
CREATE TYPE "SupportTicketType" AS ENUM ('PAYMENT', 'SESSION', 'TECHNICAL', 'ACCOUNT', 'CONTENT', 'CHAT', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'ESCALATED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ChatApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ChatModerationReportReason" AS ENUM ('ABUSE', 'HARASSMENT', 'SPAM', 'SHARING_CONTACT_INFO', 'OUTSIDE_PLATFORM_PAYMENT', 'INAPPROPRIATE_CONTENT', 'PRIVACY_BREACH', 'OTHER');

-- CreateEnum
CREATE TYPE "ChatModerationReportStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ChatModerationActionType" AS ENUM ('MESSAGE_HIDDEN', 'MESSAGE_RESTORED', 'CONVERSATION_SUSPENDED', 'CONVERSATION_CLOSED', 'USER_WARNED', 'USER_RESTRICTED', 'APPROVAL_REVOKED', 'INTERNAL_ESCALATION');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('SECURITY', 'SESSION', 'PAYMENT', 'CONTENT', 'SUPPORT', 'CHAT', 'SYSTEM', 'TRAINING', 'MARKETING');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "DeliveryAttemptStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- CreateEnum
CREATE TYPE "ConfigKind" AS ENUM ('SETTING', 'POLICY', 'LIMIT', 'THRESHOLD', 'FEATURE_DEFAULT', 'BRANDING');

-- CreateEnum
CREATE TYPE "ConfigDataType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'STRING_ARRAY', 'NUMBER_ARRAY');

-- CreateEnum
CREATE TYPE "ConfigCategory" AS ENUM ('PLATFORM', 'BRANDING', 'LOCALE', 'SESSION', 'BOOKING', 'CANCELLATION', 'PAYMENT', 'PAYOUT', 'COUPON', 'CHAT', 'SUPPORT', 'NOTIFICATION', 'SECURITY', 'TRAINING', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ConfigScopeType" AS ENUM ('GLOBAL', 'COUNTRY', 'SPECIALTY', 'PRACTITIONER', 'ROLE', 'CHANNEL', 'ENVIRONMENT');

-- CreateEnum
CREATE TYPE "ConfigChangeAction" AS ENUM ('CREATED', 'UPDATED', 'ACTIVATED', 'DEACTIVATED', 'DELETED', 'OVERRIDE_ADDED', 'OVERRIDE_REMOVED');

-- CreateEnum
CREATE TYPE "SessionReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_MODERATION', 'PUBLISHED', 'HIDDEN', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReviewModerationAction" AS ENUM ('APPROVED', 'HIDDEN', 'REJECTED', 'RESTORED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InstructorType" AS ENUM ('OWNER', 'PRACTITIONER', 'INTERNAL_STAFF', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "InstructorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_APPROVAL');

-- CreateEnum
CREATE TYPE "CourseType" AS ENUM ('LIVE_COURSE', 'LIVE_WORKSHOP', 'LIVE_SERIES');

-- CreateEnum
CREATE TYPE "CourseDeliveryMode" AS ENUM ('EXTERNAL_LIVE_ROOM');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'DISABLED');

-- CreateEnum
CREATE TYPE "CourseVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "CourseScheduleStatus" AS ENUM ('DRAFT', 'OPEN_FOR_ENROLLMENT', 'FULL', 'STARTED', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'CANCELLED', 'REFUNDED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "EnrollmentAttendanceStatus" AS ENUM ('NOT_STARTED', 'PARTIALLY_ATTENDED', 'ATTENDED', 'MISSED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'LEFT_EARLY');

-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('MANUAL', 'PROVIDER_IMPORT', 'AUTO_ESTIMATED');

-- CreateEnum
CREATE TYPE "CourseReviewDecision" AS ENUM ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "displayName" VARCHAR(191),
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "defaultLocale" VARCHAR(10),
    "timezone" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEmail" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "email" VARCHAR(191) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPhone" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPhone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthIdentity" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerSubject" VARCHAR(191),
    "passwordHash" VARCHAR(255),
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "UserRoleType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshTokenHash" VARCHAR(255),
    "deviceId" VARCHAR(191),
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(500),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "purpose" "OtpPurpose" NOT NULL,
    "channel" "OtpChannel" NOT NULL,
    "target" VARCHAR(191) NOT NULL,
    "codeHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactorSetting" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "preferredChannel" "OtpChannel",
    "fallbackChannel" "OtpChannel",
    "enabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwoFactorSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" UUID NOT NULL,
    "isoCode" VARCHAR(3) NOT NULL,
    "slug" VARCHAR(191) NOT NULL,
    "name" VARCHAR(191) NOT NULL,
    "nativeName" VARCHAR(191),
    "phoneCode" VARCHAR(10),
    "currencyCode" VARCHAR(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Language" (
    "id" UUID NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "slug" VARCHAR(191) NOT NULL,
    "name" VARCHAR(191) NOT NULL,
    "nativeName" VARCHAR(191),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "countryId" UUID,
    "displayName" VARCHAR(191),
    "gender" VARCHAR(50),
    "dateOfBirth" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Specialty" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(191) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Specialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialtyTranslation" (
    "id" UUID NOT NULL,
    "specialtyId" UUID NOT NULL,
    "locale" "ContentLocale" NOT NULL,
    "title" VARCHAR(191) NOT NULL,
    "description" VARCHAR(1000),
    "slug" VARCHAR(191) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialtyTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PractitionerProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "countryId" UUID,
    "practitionerType" "PractitionerType" NOT NULL DEFAULT 'OTHER',
    "publicSlug" VARCHAR(191) NOT NULL,
    "professionalTitle" VARCHAR(191),
    "bio" VARCHAR(4000),
    "yearsOfExperience" INTEGER,
    "sessionPrice30" DECIMAL(18,2),
    "sessionPrice60" DECIMAL(18,2),
    "avatarUrl" VARCHAR(500),
    "coverImageUrl" VARCHAR(500),
    "status" "PractitionerStatus" NOT NULL DEFAULT 'DRAFT',
    "isOnlineToggleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isInstantBookingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PractitionerProfileLanguage" (
    "id" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "languageId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PractitionerProfileLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PractitionerSpecialty" (
    "id" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "specialtyId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PractitionerSpecialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PractitionerApplication" (
    "id" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "status" "PractitionerApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PractitionerCredential" (
    "id" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "credentialType" "CredentialType" NOT NULL,
    "fileUrl" VARCHAR(500) NOT NULL,
    "reviewStatus" "CredentialReviewStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "weekday" "AvailabilityWeekday" NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "sessionDurationMinutes" INTEGER NOT NULL,
    "slotType" "SlotType" NOT NULL DEFAULT 'REGULAR',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "instantBookingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityException" (
    "id" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "exceptionDate" DATE NOT NULL,
    "startAtUtc" TIMESTAMP(3),
    "endAtUtc" TIMESTAMP(3),
    "exceptionType" "AvailabilityExceptionType" NOT NULL,
    "reason" VARCHAR(500),
    "isBlocking" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PractitionerPresence" (
    "id" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "presenceStatus" "PresenceStatus" NOT NULL DEFAULT 'OFFLINE',
    "lastSeenAt" TIMESTAMP(3),
    "heartbeatAt" TIMESTAMP(3),
    "manualStatusEnabled" BOOLEAN NOT NULL DEFAULT true,
    "instantBookingLiveEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerPresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "flowType" "SessionFlowType" NOT NULL,
    "sessionMode" "SessionMode" NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'DRAFT',
    "requestedStartAt" TIMESTAMP(3),
    "scheduledStartAt" TIMESTAMP(3),
    "scheduledEndAt" TIMESTAMP(3),
    "joinOpenAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "timezoneSnapshot" VARCHAR(50),
    "provider" "SessionProvider" NOT NULL DEFAULT 'NONE',
    "providerRoomId" VARCHAR(191),
    "providerSessionRef" VARCHAR(191),
    "notesInternal" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionEvent" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "eventType" "SessionEventType" NOT NULL,
    "actorUserId" UUID,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstantBookingRequest" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "linkedSessionId" UUID,
    "requestedDurationMinutes" INTEGER NOT NULL,
    "preferredMode" "SessionMode" NOT NULL,
    "status" "InstantBookingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstantBookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "sessionId" UUID,
    "patientId" UUID NOT NULL,
    "practitionerId" UUID,
    "paymentPurpose" "PaymentPurpose" NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "amountSubtotal" DECIMAL(18,2) NOT NULL,
    "amountDiscount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amountTotal" DECIMAL(18,2) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "commissionRuleId" UUID,
    "commissionPlatformRatePercent" DECIMAL(5,2),
    "commissionPractitionerRatePercent" DECIMAL(5,2),
    "couponId" UUID,
    "couponCodeSnapshot" VARCHAR(64),
    "couponDiscountSnapshot" DECIMAL(18,2),
    "couponPlatformShareSnapshot" DECIMAL(5,2),
    "couponPractitionerShareSnapshot" DECIMAL(5,2),
    "providerPaymentRef" VARCHAR(191),
    "providerOrderRef" VARCHAR(191),
    "providerCustomerRef" VARCHAR(191),
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorizedAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "eventType" "PaymentEventType" NOT NULL,
    "providerEventRef" VARCHAR(191),
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "sessionId" UUID,
    "refundType" "RefundType" NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "refundReason" VARCHAR(500),
    "amount" DECIMAL(18,2) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "providerRefundRef" VARCHAR(191),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" UUID NOT NULL,
    "practitionerId" UUID,
    "sessionId" UUID,
    "paymentId" UUID,
    "settlementId" UUID,
    "entryType" "LedgerEntryType" NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "balanceBucket" "WalletBalanceBucket" NOT NULL DEFAULT 'PENDING',
    "referenceType" VARCHAR(100),
    "referenceId" VARCHAR(191),
    "description" VARCHAR(500),
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PractitionerWallet" (
    "id" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "availableBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "pendingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "reservedBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lifetimeEarned" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lifetimePaidOut" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lastLedgerEntryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementBatch" (
    "id" UUID NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "status" "SettlementBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "slug" VARCHAR(191) NOT NULL,
    "generatedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PractitionerSettlement" (
    "id" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "walletId" UUID,
    "amountGross" DECIMAL(18,2) NOT NULL,
    "amountAdjustments" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amountNet" DECIMAL(18,2) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "payoutMethodSnapshot" JSONB,
    "externalPayoutRef" VARCHAR(191),
    "status" "PractitionerSettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "notes" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(191) NOT NULL,
    "ruleName" VARCHAR(191) NOT NULL,
    "ruleScope" "CommissionRuleScope" NOT NULL,
    "marketType" "MarketType" NOT NULL DEFAULT 'ANY',
    "practitionerCountryId" UUID,
    "patientCountryId" UUID,
    "sessionFlowType" "SessionFlowType",
    "sessionMode" "SessionMode",
    "specialtyId" UUID,
    "platformRatePercent" DECIMAL(5,2) NOT NULL,
    "practitionerRatePercent" DECIMAL(5,2) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "slug" VARCHAR(191) NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "ownerPractitionerId" UUID,
    "approvedByUserId" UUID,
    "couponScope" "CouponScope" NOT NULL,
    "status" "CouponStatus" NOT NULL DEFAULT 'DRAFT',
    "discountType" "DiscountType" NOT NULL,
    "discountValue" DECIMAL(18,2) NOT NULL,
    "maxDiscountAmount" DECIMAL(18,2),
    "platformSharePercent" DECIMAL(5,2) NOT NULL,
    "practitionerSharePercent" DECIMAL(5,2) NOT NULL,
    "usageLimitTotal" INTEGER,
    "usageLimitPerPatient" INTEGER,
    "currentUsageCount" INTEGER NOT NULL DEFAULT 0,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "approvedAt" TIMESTAMP(3),
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" UUID NOT NULL,
    "couponId" UUID NOT NULL,
    "sessionId" UUID,
    "paymentId" UUID,
    "patientId" UUID NOT NULL,
    "practitionerId" UUID,
    "currencyCode" VARCHAR(3) NOT NULL,
    "grossAmount" DECIMAL(18,2) NOT NULL,
    "discountAmount" DECIMAL(18,2) NOT NULL,
    "platformDiscountShare" DECIMAL(18,2) NOT NULL,
    "practitionerDiscountShare" DECIMAL(18,2) NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleCategory" (
    "id" UUID NOT NULL,
    "parentId" UUID,
    "slugRoot" VARCHAR(191) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleCategoryTranslation" (
    "id" UUID NOT NULL,
    "articleCategoryId" UUID NOT NULL,
    "locale" "ContentLocale" NOT NULL,
    "title" VARCHAR(191) NOT NULL,
    "description" VARCHAR(500),
    "slug" VARCHAR(191) NOT NULL,
    "metaTitle" VARCHAR(191),
    "metaDescription" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleCategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" UUID NOT NULL,
    "authorUserId" UUID NOT NULL,
    "authorPractitionerId" UUID,
    "primaryCategoryId" UUID,
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "ArticleVisibility" NOT NULL DEFAULT 'PUBLIC',
    "coverImageUrl" VARCHAR(500),
    "featuredImageAlt" VARCHAR(191),
    "currentRevisionNumber" INTEGER NOT NULL DEFAULT 1,
    "lastSubmittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "scheduledPublishAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleTranslation" (
    "id" UUID NOT NULL,
    "articleId" UUID NOT NULL,
    "locale" "ContentLocale" NOT NULL,
    "title" VARCHAR(191) NOT NULL,
    "excerpt" VARCHAR(1000),
    "contentMarkdown" TEXT,
    "slug" VARCHAR(191) NOT NULL,
    "metaTitle" VARCHAR(191),
    "metaDescription" VARCHAR(300),
    "readingTimeMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleCategoryAssignment" (
    "id" UUID NOT NULL,
    "articleId" UUID NOT NULL,
    "articleCategoryId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleCategoryAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleReview" (
    "id" UUID NOT NULL,
    "articleId" UUID NOT NULL,
    "reviewerUserId" UUID NOT NULL,
    "reviewStatus" "ReviewStatus" NOT NULL,
    "reviewNote" VARCHAR(1000),
    "internalNote" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleModerationLog" (
    "id" UUID NOT NULL,
    "articleId" UUID NOT NULL,
    "actorUserId" UUID,
    "eventType" "ModerationEventType" NOT NULL,
    "note" VARCHAR(1000),
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleModerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleTag" (
    "id" UUID NOT NULL,
    "slugRoot" VARCHAR(191) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleTagTranslation" (
    "id" UUID NOT NULL,
    "articleTagId" UUID NOT NULL,
    "locale" "ContentLocale" NOT NULL,
    "title" VARCHAR(191) NOT NULL,
    "slug" VARCHAR(191) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleTagTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleTagAssignment" (
    "id" UUID NOT NULL,
    "articleId" UUID NOT NULL,
    "articleTagId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleTagAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" UUID NOT NULL,
    "conversationType" "ConversationType" NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "patientId" UUID,
    "practitionerId" UUID,
    "supportTicketId" UUID,
    "sessionId" UUID,
    "chatApprovalRequestId" UUID,
    "conversationRef" VARCHAR(64),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "participantRole" "ConversationParticipantRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "lastReadMessageId" UUID,
    "lastReadAt" TIMESTAMP(3),
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "senderUserId" UUID,
    "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "visibility" "MessageVisibility" NOT NULL DEFAULT 'NORMAL',
    "contentText" TEXT,
    "replyToMessageId" UUID,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageAttachment" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "fileUrl" VARCHAR(500) NOT NULL,
    "mimeType" VARCHAR(191) NOT NULL,
    "fileSize" INTEGER,
    "originalName" VARCHAR(191),
    "storageProvider" VARCHAR(100),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" UUID NOT NULL,
    "openedByUserId" UUID NOT NULL,
    "patientId" UUID,
    "practitionerId" UUID,
    "conversationId" UUID NOT NULL,
    "ticketType" "SupportTicketType" NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "subject" VARCHAR(191),
    "assignedToUserId" UUID,
    "publicTicketRef" VARCHAR(64),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicketTag" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(191) NOT NULL,
    "title" VARCHAR(191) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicketTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicketTagAssignment" (
    "id" UUID NOT NULL,
    "supportTicketId" UUID NOT NULL,
    "tagId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketTagAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalConversationNote" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "createdByUserId" UUID,
    "noteText" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalConversationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatApprovalRequest" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "requestedByUserId" UUID NOT NULL,
    "relatedSessionId" UUID,
    "reviewedByUserId" UUID,
    "linkedConversationId" UUID,
    "status" "ChatApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestReason" VARCHAR(1000),
    "internalReviewNote" VARCHAR(1000),
    "approvalRef" VARCHAR(64),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatModerationReport" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "messageId" UUID,
    "reportedByUserId" UUID,
    "reviewedByUserId" UUID,
    "reportReason" "ChatModerationReportReason" NOT NULL,
    "reportNote" VARCHAR(1000),
    "status" "ChatModerationReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ChatModerationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatModerationAction" (
    "id" UUID NOT NULL,
    "reportId" UUID,
    "conversationId" UUID,
    "messageId" UUID,
    "chatApprovalRequestId" UUID,
    "actedByUserId" UUID,
    "actionType" "ChatModerationActionType" NOT NULL,
    "actionNote" VARCHAR(1000),
    "actedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationType" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(191) NOT NULL,
    "displayName" VARCHAR(191) NOT NULL,
    "description" VARCHAR(500),
    "category" "NotificationCategory" NOT NULL,
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT true,
    "supportsEmail" BOOLEAN NOT NULL DEFAULT false,
    "supportsSms" BOOLEAN NOT NULL DEFAULT false,
    "supportsPush" BOOLEAN NOT NULL DEFAULT false,
    "supportsInApp" BOOLEAN NOT NULL DEFAULT true,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" UUID NOT NULL,
    "notificationTypeId" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "slug" VARCHAR(191) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystemTemplate" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "providerHint" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplateTranslation" (
    "id" UUID NOT NULL,
    "notificationTemplateId" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "subjectTemplate" VARCHAR(300),
    "titleTemplate" VARCHAR(300),
    "bodyTemplate" TEXT,
    "ctaLabel" VARCHAR(191),
    "ctaUrlTemplate" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplateTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "notificationTypeId" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "notificationTypeId" UUID NOT NULL,
    "templateId" UUID,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "locale" VARCHAR(10),
    "payloadJson" JSONB,
    "titleSnapshot" VARCHAR(300),
    "subjectSnapshot" VARCHAR(300),
    "bodySnapshot" TEXT,
    "relatedEntityType" VARCHAR(100),
    "relatedEntityId" VARCHAR(191),
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "suppressedReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDeliveryAttempt" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "provider" VARCHAR(100),
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "DeliveryAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageRef" VARCHAR(191),
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "errorCode" VARCHAR(100),
    "errorMessage" VARCHAR(1000),
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDevice" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "deviceToken" VARCHAR(500) NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "deviceId" VARCHAR(191),
    "appVersion" VARCHAR(50),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InAppNotificationFeedState" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InAppNotificationFeedState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigKeyCatalog" (
    "id" UUID NOT NULL,
    "key" VARCHAR(191) NOT NULL,
    "slug" VARCHAR(191) NOT NULL,
    "displayName" VARCHAR(191) NOT NULL,
    "description" VARCHAR(1000),
    "configKind" "ConfigKind" NOT NULL,
    "dataType" "ConfigDataType" NOT NULL,
    "category" "ConfigCategory" NOT NULL,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "supportsOverride" BOOLEAN NOT NULL DEFAULT true,
    "defaultValueJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigKeyCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigValue" (
    "id" UUID NOT NULL,
    "configKeyId" UUID NOT NULL,
    "scopeType" "ConfigScopeType" NOT NULL DEFAULT 'GLOBAL',
    "scopeRefId" UUID,
    "valueString" VARCHAR(1000),
    "valueNumber" DECIMAL(18,4),
    "valueBoolean" BOOLEAN,
    "valueJson" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigChangeLog" (
    "id" UUID NOT NULL,
    "configKeyId" UUID NOT NULL,
    "configValueId" UUID,
    "changedByUserId" UUID,
    "changeAction" "ConfigChangeAction" NOT NULL,
    "oldValueSnapshot" JSONB,
    "newValueSnapshot" JSONB,
    "reason" VARCHAR(1000),
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandThemeConfig" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(191) NOT NULL,
    "displayName" VARCHAR(191) NOT NULL,
    "brandName" VARCHAR(191),
    "logoUrl" VARCHAR(500),
    "logoDarkUrl" VARCHAR(500),
    "faviconUrl" VARCHAR(500),
    "primaryColor" VARCHAR(50),
    "secondaryColor" VARCHAR(50),
    "accentColor" VARCHAR(50),
    "successColor" VARCHAR(50),
    "warningColor" VARCHAR(50),
    "errorColor" VARCHAR(50),
    "fontFamily" VARCHAR(191),
    "borderRadiusScale" VARCHAR(50),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandThemeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(191) NOT NULL,
    "displayName" VARCHAR(191) NOT NULL,
    "description" VARCHAR(500),
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "scopeType" "ConfigScopeType" NOT NULL DEFAULT 'GLOBAL',
    "scopeRefId" UUID,
    "rolloutPercent" INTEGER,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionReview" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "ratingValue" INTEGER NOT NULL,
    "reviewTitle" VARCHAR(191),
    "reviewText" VARCHAR(4000),
    "reviewStatus" "SessionReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "hiddenAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewModerationEntry" (
    "id" UUID NOT NULL,
    "sessionReviewId" UUID NOT NULL,
    "reviewerUserId" UUID,
    "moderationAction" "ReviewModerationAction" NOT NULL,
    "moderationNote" VARCHAR(1000),
    "internalReason" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewModerationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PractitionerRatingSummary" (
    "id" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "publishedReviewsCount" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "rating1Count" INTEGER NOT NULL DEFAULT 0,
    "rating2Count" INTEGER NOT NULL DEFAULT 0,
    "rating3Count" INTEGER NOT NULL DEFAULT 0,
    "rating4Count" INTEGER NOT NULL DEFAULT 0,
    "rating5Count" INTEGER NOT NULL DEFAULT 0,
    "lastReviewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerRatingSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingInstructor" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "practitionerId" UUID,
    "instructorType" "InstructorType" NOT NULL,
    "status" "InstructorStatus" NOT NULL DEFAULT 'ACTIVE',
    "displayName" VARCHAR(191) NOT NULL,
    "bio" VARCHAR(2000),
    "avatarUrl" VARCHAR(500),
    "isOwnerDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingInstructor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseCategory" (
    "id" UUID NOT NULL,
    "slugRoot" VARCHAR(191) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseCategoryTranslation" (
    "id" UUID NOT NULL,
    "courseCategoryId" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "title" VARCHAR(191) NOT NULL,
    "description" VARCHAR(1000),
    "slug" VARCHAR(191) NOT NULL,
    "metaTitle" VARCHAR(191),
    "metaDescription" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseCategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" UUID NOT NULL,
    "primaryCategoryId" UUID,
    "primaryInstructorId" UUID,
    "slugRoot" VARCHAR(191) NOT NULL,
    "courseType" "CourseType" NOT NULL,
    "deliveryMode" "CourseDeliveryMode" NOT NULL DEFAULT 'EXTERNAL_LIVE_ROOM',
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "CourseVisibility" NOT NULL DEFAULT 'PUBLIC',
    "coverImageUrl" VARCHAR(500),
    "thumbnailUrl" VARCHAR(500),
    "priceAmount" DECIMAL(18,2),
    "currencyCode" VARCHAR(3),
    "capacityMode" VARCHAR(50),
    "maxEnrollments" INTEGER,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseTranslation" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "title" VARCHAR(191) NOT NULL,
    "shortDescription" VARCHAR(1000),
    "fullDescription" TEXT,
    "slug" VARCHAR(191) NOT NULL,
    "metaTitle" VARCHAR(191),
    "metaDescription" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseSchedule" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "scheduleCode" VARCHAR(64) NOT NULL,
    "status" "CourseScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "enrollmentOpenAt" TIMESTAMP(3),
    "enrollmentCloseAt" TIMESTAMP(3),
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "timezone" VARCHAR(50),
    "maxEnrollmentsOverride" INTEGER,
    "priceOverrideAmount" DECIMAL(18,2),
    "currencyCodeOverride" VARCHAR(3),
    "externalRoomProvider" VARCHAR(100),
    "externalRoomJoinUrl" VARCHAR(500),
    "externalRoomHostUrl" VARCHAR(500),
    "waitlistEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseSession" (
    "id" UUID NOT NULL,
    "courseScheduleId" UUID NOT NULL,
    "sessionTitle" VARCHAR(191),
    "sessionOrder" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "externalRoomProvider" VARCHAR(100),
    "externalRoomJoinUrl" VARCHAR(500),
    "externalRoomHostUrl" VARCHAR(500),
    "attendanceTrackingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "courseScheduleId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "paymentId" UUID,
    "enrollmentStatus" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentStatus" VARCHAR(50),
    "attendanceStatus" "EnrollmentAttendanceStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notesInternal" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentAttendance" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "courseSessionId" UUID NOT NULL,
    "attendanceStatus" "AttendanceStatus" NOT NULL,
    "attendanceSource" "AttendanceSource" NOT NULL DEFAULT 'MANUAL',
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "attendedMinutes" INTEGER,
    "markedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrollmentAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseApproval" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "reviewedByUserId" UUID,
    "decision" "CourseReviewDecision" NOT NULL,
    "reviewNote" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserEmail_email_key" ON "UserEmail"("email");

-- CreateIndex
CREATE INDEX "UserEmail_userId_isPrimary_idx" ON "UserEmail"("userId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "UserPhone_phone_key" ON "UserPhone"("phone");

-- CreateIndex
CREATE INDEX "UserPhone_userId_isPrimary_idx" ON "UserPhone"("userId", "isPrimary");

-- CreateIndex
CREATE INDEX "AuthIdentity_userId_provider_idx" ON "AuthIdentity"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "AuthIdentity_provider_providerSubject_key" ON "AuthIdentity"("provider", "providerSubject");

-- CreateIndex
CREATE INDEX "UserRole_role_idx" ON "UserRole"("role");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_role_key" ON "UserRole"("userId", "role");

-- CreateIndex
CREATE INDEX "UserSession_userId_revokedAt_idx" ON "UserSession"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_userId_purpose_idx" ON "OtpChallenge"("userId", "purpose");

-- CreateIndex
CREATE INDEX "OtpChallenge_target_purpose_idx" ON "OtpChallenge"("target", "purpose");

-- CreateIndex
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorSetting_userId_key" ON "TwoFactorSetting"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Country_isoCode_key" ON "Country"("isoCode");

-- CreateIndex
CREATE UNIQUE INDEX "Country_slug_key" ON "Country"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Language_code_key" ON "Language"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Language_slug_key" ON "Language"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_userId_key" ON "PatientProfile"("userId");

-- CreateIndex
CREATE INDEX "PatientProfile_countryId_idx" ON "PatientProfile"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_slug_key" ON "Specialty"("slug");

-- CreateIndex
CREATE INDEX "Specialty_isActive_sortOrder_idx" ON "Specialty"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "SpecialtyTranslation_locale_title_idx" ON "SpecialtyTranslation"("locale", "title");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialtyTranslation_specialtyId_locale_key" ON "SpecialtyTranslation"("specialtyId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialtyTranslation_locale_slug_key" ON "SpecialtyTranslation"("locale", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerProfile_userId_key" ON "PractitionerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerProfile_publicSlug_key" ON "PractitionerProfile"("publicSlug");

-- CreateIndex
CREATE INDEX "PractitionerProfile_status_practitionerType_idx" ON "PractitionerProfile"("status", "practitionerType");

-- CreateIndex
CREATE INDEX "PractitionerProfile_countryId_status_idx" ON "PractitionerProfile"("countryId", "status");

-- CreateIndex
CREATE INDEX "PractitionerProfileLanguage_languageId_idx" ON "PractitionerProfileLanguage"("languageId");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerProfileLanguage_practitionerId_languageId_key" ON "PractitionerProfileLanguage"("practitionerId", "languageId");

-- CreateIndex
CREATE INDEX "PractitionerSpecialty_specialtyId_practitionerId_idx" ON "PractitionerSpecialty"("specialtyId", "practitionerId");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerSpecialty_practitionerId_specialtyId_key" ON "PractitionerSpecialty"("practitionerId", "specialtyId");

-- CreateIndex
CREATE INDEX "PractitionerApplication_practitionerId_status_idx" ON "PractitionerApplication"("practitionerId", "status");

-- CreateIndex
CREATE INDEX "PractitionerCredential_practitionerId_reviewStatus_idx" ON "PractitionerCredential"("practitionerId", "reviewStatus");

-- CreateIndex
CREATE INDEX "PractitionerCredential_expiresAt_idx" ON "PractitionerCredential"("expiresAt");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_practitionerId_weekday_idx" ON "AvailabilitySlot"("practitionerId", "weekday");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_practitionerId_isEnabled_idx" ON "AvailabilitySlot"("practitionerId", "isEnabled");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_practitionerId_instantBookingEnabled_idx" ON "AvailabilitySlot"("practitionerId", "instantBookingEnabled");

-- CreateIndex
CREATE INDEX "AvailabilityException_practitionerId_exceptionDate_idx" ON "AvailabilityException"("practitionerId", "exceptionDate");

-- CreateIndex
CREATE INDEX "AvailabilityException_practitionerId_exceptionType_idx" ON "AvailabilityException"("practitionerId", "exceptionType");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerPresence_practitionerId_key" ON "PractitionerPresence"("practitionerId");

-- CreateIndex
CREATE INDEX "PractitionerPresence_presenceStatus_idx" ON "PractitionerPresence"("presenceStatus");

-- CreateIndex
CREATE INDEX "PractitionerPresence_instantBookingLiveEnabled_idx" ON "PractitionerPresence"("instantBookingLiveEnabled");

-- CreateIndex
CREATE INDEX "Session_patientId_status_idx" ON "Session"("patientId", "status");

-- CreateIndex
CREATE INDEX "Session_practitionerId_status_idx" ON "Session"("practitionerId", "status");

-- CreateIndex
CREATE INDEX "Session_scheduledStartAt_idx" ON "Session"("scheduledStartAt");

-- CreateIndex
CREATE INDEX "Session_scheduledEndAt_idx" ON "Session"("scheduledEndAt");

-- CreateIndex
CREATE INDEX "Session_flowType_status_idx" ON "Session"("flowType", "status");

-- CreateIndex
CREATE INDEX "Session_provider_providerRoomId_idx" ON "Session"("provider", "providerRoomId");

-- CreateIndex
CREATE INDEX "SessionEvent_sessionId_createdAt_idx" ON "SessionEvent"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "SessionEvent_eventType_createdAt_idx" ON "SessionEvent"("eventType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InstantBookingRequest_linkedSessionId_key" ON "InstantBookingRequest"("linkedSessionId");

-- CreateIndex
CREATE INDEX "InstantBookingRequest_patientId_status_idx" ON "InstantBookingRequest"("patientId", "status");

-- CreateIndex
CREATE INDEX "InstantBookingRequest_practitionerId_status_idx" ON "InstantBookingRequest"("practitionerId", "status");

-- CreateIndex
CREATE INDEX "InstantBookingRequest_requestedAt_idx" ON "InstantBookingRequest"("requestedAt");

-- CreateIndex
CREATE INDEX "InstantBookingRequest_expiresAt_idx" ON "InstantBookingRequest"("expiresAt");

-- CreateIndex
CREATE INDEX "Payment_sessionId_idx" ON "Payment"("sessionId");

-- CreateIndex
CREATE INDEX "Payment_patientId_status_idx" ON "Payment"("patientId", "status");

-- CreateIndex
CREATE INDEX "Payment_practitionerId_status_idx" ON "Payment"("practitionerId", "status");

-- CreateIndex
CREATE INDEX "Payment_provider_status_createdAt_idx" ON "Payment"("provider", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_currencyCode_status_idx" ON "Payment"("currencyCode", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_payment_provider_payment_ref" ON "Payment"("provider", "providerPaymentRef");

-- CreateIndex
CREATE INDEX "PaymentEvent_paymentId_createdAt_idx" ON "PaymentEvent"("paymentId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEvent_eventType_createdAt_idx" ON "PaymentEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "Refund_paymentId_status_idx" ON "Refund"("paymentId", "status");

-- CreateIndex
CREATE INDEX "Refund_sessionId_status_idx" ON "Refund"("sessionId", "status");

-- CreateIndex
CREATE INDEX "Refund_requestedAt_idx" ON "Refund"("requestedAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_practitionerId_effectiveAt_idx" ON "LedgerEntry"("practitionerId", "effectiveAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_practitionerId_balanceBucket_effectiveAt_idx" ON "LedgerEntry"("practitionerId", "balanceBucket", "effectiveAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_sessionId_idx" ON "LedgerEntry"("sessionId");

-- CreateIndex
CREATE INDEX "LedgerEntry_paymentId_idx" ON "LedgerEntry"("paymentId");

-- CreateIndex
CREATE INDEX "LedgerEntry_settlementId_idx" ON "LedgerEntry"("settlementId");

-- CreateIndex
CREATE INDEX "LedgerEntry_entryType_effectiveAt_idx" ON "LedgerEntry"("entryType", "effectiveAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_referenceType_referenceId_idx" ON "LedgerEntry"("referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerWallet_practitionerId_currencyCode_key" ON "PractitionerWallet"("practitionerId", "currencyCode");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementBatch_slug_key" ON "SettlementBatch"("slug");

-- CreateIndex
CREATE INDEX "SettlementBatch_status_periodYear_periodMonth_idx" ON "SettlementBatch"("status", "periodYear", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementBatch_periodYear_periodMonth_currencyCode_key" ON "SettlementBatch"("periodYear", "periodMonth", "currencyCode");

-- CreateIndex
CREATE INDEX "PractitionerSettlement_practitionerId_status_idx" ON "PractitionerSettlement"("practitionerId", "status");

-- CreateIndex
CREATE INDEX "PractitionerSettlement_paidAt_idx" ON "PractitionerSettlement"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerSettlement_batchId_practitionerId_key" ON "PractitionerSettlement"("batchId", "practitionerId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionRule_slug_key" ON "CommissionRule"("slug");

-- CreateIndex
CREATE INDEX "CommissionRule_isActive_isDefault_idx" ON "CommissionRule"("isActive", "isDefault");

-- CreateIndex
CREATE INDEX "CommissionRule_priority_startsAt_endsAt_idx" ON "CommissionRule"("priority", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "CommissionRule_practitionerCountryId_patientCountryId_idx" ON "CommissionRule"("practitionerCountryId", "patientCountryId");

-- CreateIndex
CREATE INDEX "CommissionRule_sessionFlowType_sessionMode_idx" ON "CommissionRule"("sessionFlowType", "sessionMode");

-- CreateIndex
CREATE INDEX "CommissionRule_specialtyId_idx" ON "CommissionRule"("specialtyId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_slug_key" ON "Coupon"("slug");

-- CreateIndex
CREATE INDEX "Coupon_ownerPractitionerId_status_idx" ON "Coupon"("ownerPractitionerId", "status");

-- CreateIndex
CREATE INDEX "Coupon_status_startsAt_endsAt_idx" ON "Coupon"("status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Coupon_approvedByUserId_idx" ON "Coupon"("approvedByUserId");

-- CreateIndex
CREATE INDEX "CouponRedemption_patientId_redeemedAt_idx" ON "CouponRedemption"("patientId", "redeemedAt");

-- CreateIndex
CREATE INDEX "CouponRedemption_practitionerId_redeemedAt_idx" ON "CouponRedemption"("practitionerId", "redeemedAt");

-- CreateIndex
CREATE INDEX "CouponRedemption_paymentId_idx" ON "CouponRedemption"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_coupon_redemption_coupon_session" ON "CouponRedemption"("couponId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleCategory_slugRoot_key" ON "ArticleCategory"("slugRoot");

-- CreateIndex
CREATE INDEX "ArticleCategory_isActive_sortOrder_idx" ON "ArticleCategory"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "ArticleCategory_parentId_sortOrder_idx" ON "ArticleCategory"("parentId", "sortOrder");

-- CreateIndex
CREATE INDEX "ArticleCategoryTranslation_locale_title_idx" ON "ArticleCategoryTranslation"("locale", "title");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleCategoryTranslation_locale_slug_key" ON "ArticleCategoryTranslation"("locale", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleCategoryTranslation_articleCategoryId_locale_key" ON "ArticleCategoryTranslation"("articleCategoryId", "locale");

-- CreateIndex
CREATE INDEX "Article_status_publishedAt_idx" ON "Article"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Article_primaryCategoryId_status_publishedAt_idx" ON "Article"("primaryCategoryId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "Article_authorUserId_status_idx" ON "Article"("authorUserId", "status");

-- CreateIndex
CREATE INDEX "Article_authorPractitionerId_status_idx" ON "Article"("authorPractitionerId", "status");

-- CreateIndex
CREATE INDEX "Article_visibility_status_publishedAt_idx" ON "Article"("visibility", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "Article_scheduledPublishAt_idx" ON "Article"("scheduledPublishAt");

-- CreateIndex
CREATE INDEX "Article_approvedAt_idx" ON "Article"("approvedAt");

-- CreateIndex
CREATE INDEX "ArticleTranslation_locale_title_idx" ON "ArticleTranslation"("locale", "title");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleTranslation_locale_slug_key" ON "ArticleTranslation"("locale", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleTranslation_articleId_locale_key" ON "ArticleTranslation"("articleId", "locale");

-- CreateIndex
CREATE INDEX "ArticleCategoryAssignment_articleCategoryId_articleId_idx" ON "ArticleCategoryAssignment"("articleCategoryId", "articleId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleCategoryAssignment_articleId_articleCategoryId_key" ON "ArticleCategoryAssignment"("articleId", "articleCategoryId");

-- CreateIndex
CREATE INDEX "ArticleReview_articleId_createdAt_idx" ON "ArticleReview"("articleId", "createdAt");

-- CreateIndex
CREATE INDEX "ArticleReview_reviewerUserId_createdAt_idx" ON "ArticleReview"("reviewerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ArticleReview_reviewStatus_createdAt_idx" ON "ArticleReview"("reviewStatus", "createdAt");

-- CreateIndex
CREATE INDEX "ArticleModerationLog_articleId_createdAt_idx" ON "ArticleModerationLog"("articleId", "createdAt");

-- CreateIndex
CREATE INDEX "ArticleModerationLog_actorUserId_createdAt_idx" ON "ArticleModerationLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ArticleModerationLog_eventType_createdAt_idx" ON "ArticleModerationLog"("eventType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleTag_slugRoot_key" ON "ArticleTag"("slugRoot");

-- CreateIndex
CREATE INDEX "ArticleTag_isActive_sortOrder_idx" ON "ArticleTag"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "ArticleTagTranslation_locale_title_idx" ON "ArticleTagTranslation"("locale", "title");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleTagTranslation_locale_slug_key" ON "ArticleTagTranslation"("locale", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleTagTranslation_articleTagId_locale_key" ON "ArticleTagTranslation"("articleTagId", "locale");

-- CreateIndex
CREATE INDEX "ArticleTagAssignment_articleTagId_articleId_idx" ON "ArticleTagAssignment"("articleTagId", "articleId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleTagAssignment_articleId_articleTagId_key" ON "ArticleTagAssignment"("articleId", "articleTagId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_supportTicketId_key" ON "Conversation"("supportTicketId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_chatApprovalRequestId_key" ON "Conversation"("chatApprovalRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_conversationRef_key" ON "Conversation"("conversationRef");

-- CreateIndex
CREATE INDEX "Conversation_conversationType_status_startedAt_idx" ON "Conversation"("conversationType", "status", "startedAt");

-- CreateIndex
CREATE INDEX "Conversation_patientId_status_idx" ON "Conversation"("patientId", "status");

-- CreateIndex
CREATE INDEX "Conversation_practitionerId_status_idx" ON "Conversation"("practitionerId", "status");

-- CreateIndex
CREATE INDEX "Conversation_supportTicketId_idx" ON "Conversation"("supportTicketId");

-- CreateIndex
CREATE INDEX "Conversation_chatApprovalRequestId_idx" ON "Conversation"("chatApprovalRequestId");

-- CreateIndex
CREATE INDEX "Conversation_sessionId_idx" ON "Conversation"("sessionId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_isActive_idx" ON "ConversationParticipant"("userId", "isActive");

-- CreateIndex
CREATE INDEX "ConversationParticipant_conversationId_participantRole_idx" ON "ConversationParticipant"("conversationId", "participantRole");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_sentAt_idx" ON "Message"("conversationId", "sentAt");

-- CreateIndex
CREATE INDEX "Message_senderUserId_sentAt_idx" ON "Message"("senderUserId", "sentAt");

-- CreateIndex
CREATE INDEX "Message_replyToMessageId_idx" ON "Message"("replyToMessageId");

-- CreateIndex
CREATE INDEX "Message_status_sentAt_idx" ON "Message"("status", "sentAt");

-- CreateIndex
CREATE INDEX "Message_isFlagged_sentAt_idx" ON "Message"("isFlagged", "sentAt");

-- CreateIndex
CREATE INDEX "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_conversationId_key" ON "SupportTicket"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_publicTicketRef_key" ON "SupportTicket"("publicTicketRef");

-- CreateIndex
CREATE INDEX "SupportTicket_status_priority_createdAt_idx" ON "SupportTicket"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_assignedToUserId_status_idx" ON "SupportTicket"("assignedToUserId", "status");

-- CreateIndex
CREATE INDEX "SupportTicket_openedByUserId_createdAt_idx" ON "SupportTicket"("openedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_patientId_status_idx" ON "SupportTicket"("patientId", "status");

-- CreateIndex
CREATE INDEX "SupportTicket_practitionerId_status_idx" ON "SupportTicket"("practitionerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicketTag_slug_key" ON "SupportTicketTag"("slug");

-- CreateIndex
CREATE INDEX "SupportTicketTag_isActive_sortOrder_idx" ON "SupportTicketTag"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "SupportTicketTagAssignment_tagId_supportTicketId_idx" ON "SupportTicketTagAssignment"("tagId", "supportTicketId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicketTagAssignment_supportTicketId_tagId_key" ON "SupportTicketTagAssignment"("supportTicketId", "tagId");

-- CreateIndex
CREATE INDEX "InternalConversationNote_conversationId_createdAt_idx" ON "InternalConversationNote"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "InternalConversationNote_createdByUserId_createdAt_idx" ON "InternalConversationNote"("createdByUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatApprovalRequest_linkedConversationId_key" ON "ChatApprovalRequest"("linkedConversationId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatApprovalRequest_approvalRef_key" ON "ChatApprovalRequest"("approvalRef");

-- CreateIndex
CREATE INDEX "ChatApprovalRequest_patientId_status_requestedAt_idx" ON "ChatApprovalRequest"("patientId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "ChatApprovalRequest_practitionerId_status_requestedAt_idx" ON "ChatApprovalRequest"("practitionerId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "ChatApprovalRequest_relatedSessionId_idx" ON "ChatApprovalRequest"("relatedSessionId");

-- CreateIndex
CREATE INDEX "ChatApprovalRequest_reviewedByUserId_reviewedAt_idx" ON "ChatApprovalRequest"("reviewedByUserId", "reviewedAt");

-- CreateIndex
CREATE INDEX "ChatModerationReport_conversationId_status_createdAt_idx" ON "ChatModerationReport"("conversationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ChatModerationReport_messageId_status_idx" ON "ChatModerationReport"("messageId", "status");

-- CreateIndex
CREATE INDEX "ChatModerationReport_reportedByUserId_createdAt_idx" ON "ChatModerationReport"("reportedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatModerationReport_reviewedByUserId_reviewedAt_idx" ON "ChatModerationReport"("reviewedByUserId", "reviewedAt");

-- CreateIndex
CREATE INDEX "ChatModerationAction_reportId_actedAt_idx" ON "ChatModerationAction"("reportId", "actedAt");

-- CreateIndex
CREATE INDEX "ChatModerationAction_conversationId_actedAt_idx" ON "ChatModerationAction"("conversationId", "actedAt");

-- CreateIndex
CREATE INDEX "ChatModerationAction_messageId_actedAt_idx" ON "ChatModerationAction"("messageId", "actedAt");

-- CreateIndex
CREATE INDEX "ChatModerationAction_actedByUserId_actedAt_idx" ON "ChatModerationAction"("actedByUserId", "actedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationType_slug_key" ON "NotificationType"("slug");

-- CreateIndex
CREATE INDEX "NotificationType_category_defaultEnabled_idx" ON "NotificationType"("category", "defaultEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_slug_key" ON "NotificationTemplate"("slug");

-- CreateIndex
CREATE INDEX "NotificationTemplate_notificationTypeId_channel_isActive_idx" ON "NotificationTemplate"("notificationTypeId", "channel", "isActive");

-- CreateIndex
CREATE INDEX "NotificationTemplate_isSystemTemplate_isActive_idx" ON "NotificationTemplate"("isSystemTemplate", "isActive");

-- CreateIndex
CREATE INDEX "NotificationTemplateTranslation_locale_idx" ON "NotificationTemplateTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplateTranslation_notificationTemplateId_loca_key" ON "NotificationTemplateTranslation"("notificationTemplateId", "locale");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_channel_idx" ON "NotificationPreference"("userId", "channel");

-- CreateIndex
CREATE INDEX "NotificationPreference_notificationTypeId_channel_isEnabled_idx" ON "NotificationPreference"("notificationTypeId", "channel", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_notificationTypeId_channel_key" ON "NotificationPreference"("userId", "notificationTypeId", "channel");

-- CreateIndex
CREATE INDEX "Notification_userId_status_createdAt_idx" ON "Notification"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_channel_createdAt_idx" ON "Notification"("userId", "channel", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_notificationTypeId_channel_createdAt_idx" ON "Notification"("notificationTypeId", "channel", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_scheduledFor_status_idx" ON "Notification"("scheduledFor", "status");

-- CreateIndex
CREATE INDEX "Notification_relatedEntityType_relatedEntityId_idx" ON "Notification"("relatedEntityType", "relatedEntityId");

-- CreateIndex
CREATE INDEX "Notification_readAt_idx" ON "Notification"("readAt");

-- CreateIndex
CREATE INDEX "Notification_failedAt_idx" ON "Notification"("failedAt");

-- CreateIndex
CREATE INDEX "NotificationDeliveryAttempt_notificationId_attemptNumber_idx" ON "NotificationDeliveryAttempt"("notificationId", "attemptNumber");

-- CreateIndex
CREATE INDEX "NotificationDeliveryAttempt_provider_status_attemptedAt_idx" ON "NotificationDeliveryAttempt"("provider", "status", "attemptedAt");

-- CreateIndex
CREATE INDEX "NotificationDeliveryAttempt_providerMessageRef_idx" ON "NotificationDeliveryAttempt"("providerMessageRef");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDevice_deviceToken_key" ON "NotificationDevice"("deviceToken");

-- CreateIndex
CREATE INDEX "NotificationDevice_userId_isActive_idx" ON "NotificationDevice"("userId", "isActive");

-- CreateIndex
CREATE INDEX "NotificationDevice_platform_isActive_idx" ON "NotificationDevice"("platform", "isActive");

-- CreateIndex
CREATE INDEX "NotificationDevice_lastSeenAt_idx" ON "NotificationDevice"("lastSeenAt");

-- CreateIndex
CREATE INDEX "InAppNotificationFeedState_userId_isArchived_isDismissed_idx" ON "InAppNotificationFeedState"("userId", "isArchived", "isDismissed");

-- CreateIndex
CREATE UNIQUE INDEX "InAppNotificationFeedState_notificationId_userId_key" ON "InAppNotificationFeedState"("notificationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigKeyCatalog_key_key" ON "ConfigKeyCatalog"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigKeyCatalog_slug_key" ON "ConfigKeyCatalog"("slug");

-- CreateIndex
CREATE INDEX "ConfigKeyCatalog_configKind_category_idx" ON "ConfigKeyCatalog"("configKind", "category");

-- CreateIndex
CREATE INDEX "ConfigKeyCatalog_isRequired_isSensitive_idx" ON "ConfigKeyCatalog"("isRequired", "isSensitive");

-- CreateIndex
CREATE INDEX "ConfigKeyCatalog_supportsOverride_category_idx" ON "ConfigKeyCatalog"("supportsOverride", "category");

-- CreateIndex
CREATE INDEX "ConfigValue_configKeyId_scopeType_scopeRefId_isActive_idx" ON "ConfigValue"("configKeyId", "scopeType", "scopeRefId", "isActive");

-- CreateIndex
CREATE INDEX "ConfigValue_scopeType_scopeRefId_priority_idx" ON "ConfigValue"("scopeType", "scopeRefId", "priority");

-- CreateIndex
CREATE INDEX "ConfigValue_effectiveFrom_effectiveTo_idx" ON "ConfigValue"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "ConfigValue_isActive_priority_idx" ON "ConfigValue"("isActive", "priority");

-- CreateIndex
CREATE INDEX "ConfigValue_valueBoolean_idx" ON "ConfigValue"("valueBoolean");

-- CreateIndex
CREATE INDEX "ConfigValue_valueNumber_idx" ON "ConfigValue"("valueNumber");

-- CreateIndex
CREATE INDEX "ConfigChangeLog_configKeyId_changedAt_idx" ON "ConfigChangeLog"("configKeyId", "changedAt");

-- CreateIndex
CREATE INDEX "ConfigChangeLog_configValueId_changedAt_idx" ON "ConfigChangeLog"("configValueId", "changedAt");

-- CreateIndex
CREATE INDEX "ConfigChangeLog_changedByUserId_changedAt_idx" ON "ConfigChangeLog"("changedByUserId", "changedAt");

-- CreateIndex
CREATE INDEX "ConfigChangeLog_changeAction_changedAt_idx" ON "ConfigChangeLog"("changeAction", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BrandThemeConfig_slug_key" ON "BrandThemeConfig"("slug");

-- CreateIndex
CREATE INDEX "BrandThemeConfig_isActive_idx" ON "BrandThemeConfig"("isActive");

-- CreateIndex
CREATE INDEX "FeatureFlag_isEnabled_effectiveFrom_effectiveTo_idx" ON "FeatureFlag"("isEnabled", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "FeatureFlag_scopeType_scopeRefId_idx" ON "FeatureFlag"("scopeType", "scopeRefId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_slug_scopeType_scopeRefId_key" ON "FeatureFlag"("slug", "scopeType", "scopeRefId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionReview_sessionId_key" ON "SessionReview"("sessionId");

-- CreateIndex
CREATE INDEX "SessionReview_patientId_submittedAt_idx" ON "SessionReview"("patientId", "submittedAt");

-- CreateIndex
CREATE INDEX "SessionReview_practitionerId_reviewStatus_submittedAt_idx" ON "SessionReview"("practitionerId", "reviewStatus", "submittedAt");

-- CreateIndex
CREATE INDEX "SessionReview_ratingValue_reviewStatus_idx" ON "SessionReview"("ratingValue", "reviewStatus");

-- CreateIndex
CREATE INDEX "SessionReview_publishedAt_idx" ON "SessionReview"("publishedAt");

-- CreateIndex
CREATE INDEX "SessionReview_hiddenAt_idx" ON "SessionReview"("hiddenAt");

-- CreateIndex
CREATE INDEX "ReviewModerationEntry_sessionReviewId_createdAt_idx" ON "ReviewModerationEntry"("sessionReviewId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewModerationEntry_reviewerUserId_createdAt_idx" ON "ReviewModerationEntry"("reviewerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewModerationEntry_moderationAction_createdAt_idx" ON "ReviewModerationEntry"("moderationAction", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerRatingSummary_practitionerId_key" ON "PractitionerRatingSummary"("practitionerId");

-- CreateIndex
CREATE INDEX "PractitionerRatingSummary_averageRating_publishedReviewsCou_idx" ON "PractitionerRatingSummary"("averageRating", "publishedReviewsCount");

-- CreateIndex
CREATE INDEX "TrainingInstructor_status_instructorType_idx" ON "TrainingInstructor"("status", "instructorType");

-- CreateIndex
CREATE INDEX "TrainingInstructor_userId_idx" ON "TrainingInstructor"("userId");

-- CreateIndex
CREATE INDEX "TrainingInstructor_practitionerId_idx" ON "TrainingInstructor"("practitionerId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseCategory_slugRoot_key" ON "CourseCategory"("slugRoot");

-- CreateIndex
CREATE INDEX "CourseCategory_isActive_sortOrder_idx" ON "CourseCategory"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "CourseCategoryTranslation_locale_title_idx" ON "CourseCategoryTranslation"("locale", "title");

-- CreateIndex
CREATE UNIQUE INDEX "CourseCategoryTranslation_courseCategoryId_locale_key" ON "CourseCategoryTranslation"("courseCategoryId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "CourseCategoryTranslation_locale_slug_key" ON "CourseCategoryTranslation"("locale", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Course_slugRoot_key" ON "Course"("slugRoot");

-- CreateIndex
CREATE INDEX "Course_primaryCategoryId_status_visibility_publishedAt_idx" ON "Course"("primaryCategoryId", "status", "visibility", "publishedAt");

-- CreateIndex
CREATE INDEX "Course_primaryInstructorId_status_idx" ON "Course"("primaryInstructorId", "status");

-- CreateIndex
CREATE INDEX "Course_isFeatured_status_publishedAt_idx" ON "Course"("isFeatured", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "Course_priceAmount_currencyCode_idx" ON "Course"("priceAmount", "currencyCode");

-- CreateIndex
CREATE INDEX "CourseTranslation_locale_title_idx" ON "CourseTranslation"("locale", "title");

-- CreateIndex
CREATE UNIQUE INDEX "CourseTranslation_courseId_locale_key" ON "CourseTranslation"("courseId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "CourseTranslation_locale_slug_key" ON "CourseTranslation"("locale", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "CourseSchedule_scheduleCode_key" ON "CourseSchedule"("scheduleCode");

-- CreateIndex
CREATE INDEX "CourseSchedule_courseId_status_startsAt_idx" ON "CourseSchedule"("courseId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "CourseSchedule_enrollmentOpenAt_enrollmentCloseAt_status_idx" ON "CourseSchedule"("enrollmentOpenAt", "enrollmentCloseAt", "status");

-- CreateIndex
CREATE INDEX "CourseSchedule_startsAt_endsAt_idx" ON "CourseSchedule"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "CourseSchedule_waitlistEnabled_status_idx" ON "CourseSchedule"("waitlistEnabled", "status");

-- CreateIndex
CREATE INDEX "CourseSession_courseScheduleId_startsAt_idx" ON "CourseSession"("courseScheduleId", "startsAt");

-- CreateIndex
CREATE INDEX "CourseSession_startsAt_endsAt_idx" ON "CourseSession"("startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "CourseSession_courseScheduleId_sessionOrder_key" ON "CourseSession"("courseScheduleId", "sessionOrder");

-- CreateIndex
CREATE INDEX "Enrollment_courseId_enrollmentStatus_enrolledAt_idx" ON "Enrollment"("courseId", "enrollmentStatus", "enrolledAt");

-- CreateIndex
CREATE INDEX "Enrollment_courseScheduleId_enrollmentStatus_idx" ON "Enrollment"("courseScheduleId", "enrollmentStatus");

-- CreateIndex
CREATE INDEX "Enrollment_paymentStatus_idx" ON "Enrollment"("paymentStatus");

-- CreateIndex
CREATE INDEX "Enrollment_userId_enrollmentStatus_idx" ON "Enrollment"("userId", "enrollmentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_courseScheduleId_userId_key" ON "Enrollment"("courseScheduleId", "userId");

-- CreateIndex
CREATE INDEX "EnrollmentAttendance_courseSessionId_attendanceStatus_idx" ON "EnrollmentAttendance"("courseSessionId", "attendanceStatus");

-- CreateIndex
CREATE INDEX "EnrollmentAttendance_enrollmentId_attendanceStatus_idx" ON "EnrollmentAttendance"("enrollmentId", "attendanceStatus");

-- CreateIndex
CREATE INDEX "EnrollmentAttendance_markedByUserId_checkInAt_idx" ON "EnrollmentAttendance"("markedByUserId", "checkInAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentAttendance_enrollmentId_courseSessionId_key" ON "EnrollmentAttendance"("enrollmentId", "courseSessionId");

-- CreateIndex
CREATE INDEX "CourseApproval_courseId_createdAt_idx" ON "CourseApproval"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "CourseApproval_reviewedByUserId_createdAt_idx" ON "CourseApproval"("reviewedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "CourseApproval_decision_createdAt_idx" ON "CourseApproval"("decision", "createdAt");

-- AddForeignKey
ALTER TABLE "UserEmail" ADD CONSTRAINT "UserEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPhone" ADD CONSTRAINT "UserPhone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorSetting" ADD CONSTRAINT "TwoFactorSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialtyTranslation" ADD CONSTRAINT "SpecialtyTranslation_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerProfile" ADD CONSTRAINT "PractitionerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerProfile" ADD CONSTRAINT "PractitionerProfile_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerProfileLanguage" ADD CONSTRAINT "PractitionerProfileLanguage_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerProfileLanguage" ADD CONSTRAINT "PractitionerProfileLanguage_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerSpecialty" ADD CONSTRAINT "PractitionerSpecialty_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerSpecialty" ADD CONSTRAINT "PractitionerSpecialty_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerApplication" ADD CONSTRAINT "PractitionerApplication_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerCredential" ADD CONSTRAINT "PractitionerCredential_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityException" ADD CONSTRAINT "AvailabilityException_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerPresence" ADD CONSTRAINT "PractitionerPresence_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionEvent" ADD CONSTRAINT "SessionEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstantBookingRequest" ADD CONSTRAINT "InstantBookingRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstantBookingRequest" ADD CONSTRAINT "InstantBookingRequest_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstantBookingRequest" ADD CONSTRAINT "InstantBookingRequest_linkedSessionId_fkey" FOREIGN KEY ("linkedSessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_commissionRuleId_fkey" FOREIGN KEY ("commissionRuleId") REFERENCES "CommissionRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "PractitionerSettlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerWallet" ADD CONSTRAINT "PractitionerWallet_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerSettlement" ADD CONSTRAINT "PractitionerSettlement_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "SettlementBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerSettlement" ADD CONSTRAINT "PractitionerSettlement_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerSettlement" ADD CONSTRAINT "PractitionerSettlement_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "PractitionerWallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_ownerPractitionerId_fkey" FOREIGN KEY ("ownerPractitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleCategory" ADD CONSTRAINT "ArticleCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ArticleCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleCategoryTranslation" ADD CONSTRAINT "ArticleCategoryTranslation_articleCategoryId_fkey" FOREIGN KEY ("articleCategoryId") REFERENCES "ArticleCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_authorPractitionerId_fkey" FOREIGN KEY ("authorPractitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_primaryCategoryId_fkey" FOREIGN KEY ("primaryCategoryId") REFERENCES "ArticleCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleTranslation" ADD CONSTRAINT "ArticleTranslation_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleCategoryAssignment" ADD CONSTRAINT "ArticleCategoryAssignment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleCategoryAssignment" ADD CONSTRAINT "ArticleCategoryAssignment_articleCategoryId_fkey" FOREIGN KEY ("articleCategoryId") REFERENCES "ArticleCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleReview" ADD CONSTRAINT "ArticleReview_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleModerationLog" ADD CONSTRAINT "ArticleModerationLog_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleTagTranslation" ADD CONSTRAINT "ArticleTagTranslation_articleTagId_fkey" FOREIGN KEY ("articleTagId") REFERENCES "ArticleTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleTagAssignment" ADD CONSTRAINT "ArticleTagAssignment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleTagAssignment" ADD CONSTRAINT "ArticleTagAssignment_articleTagId_fkey" FOREIGN KEY ("articleTagId") REFERENCES "ArticleTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketTagAssignment" ADD CONSTRAINT "SupportTicketTagAssignment_supportTicketId_fkey" FOREIGN KEY ("supportTicketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketTagAssignment" ADD CONSTRAINT "SupportTicketTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "SupportTicketTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalConversationNote" ADD CONSTRAINT "InternalConversationNote_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatApprovalRequest" ADD CONSTRAINT "ChatApprovalRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatApprovalRequest" ADD CONSTRAINT "ChatApprovalRequest_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatApprovalRequest" ADD CONSTRAINT "ChatApprovalRequest_relatedSessionId_fkey" FOREIGN KEY ("relatedSessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatApprovalRequest" ADD CONSTRAINT "ChatApprovalRequest_linkedConversationId_fkey" FOREIGN KEY ("linkedConversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatModerationReport" ADD CONSTRAINT "ChatModerationReport_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatModerationReport" ADD CONSTRAINT "ChatModerationReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatModerationAction" ADD CONSTRAINT "ChatModerationAction_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ChatModerationReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatModerationAction" ADD CONSTRAINT "ChatModerationAction_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatModerationAction" ADD CONSTRAINT "ChatModerationAction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatModerationAction" ADD CONSTRAINT "ChatModerationAction_chatApprovalRequestId_fkey" FOREIGN KEY ("chatApprovalRequestId") REFERENCES "ChatApprovalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationTemplate" ADD CONSTRAINT "NotificationTemplate_notificationTypeId_fkey" FOREIGN KEY ("notificationTypeId") REFERENCES "NotificationType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationTemplateTranslation" ADD CONSTRAINT "NotificationTemplateTranslation_notificationTemplateId_fkey" FOREIGN KEY ("notificationTemplateId") REFERENCES "NotificationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_notificationTypeId_fkey" FOREIGN KEY ("notificationTypeId") REFERENCES "NotificationType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_notificationTypeId_fkey" FOREIGN KEY ("notificationTypeId") REFERENCES "NotificationType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDeliveryAttempt" ADD CONSTRAINT "NotificationDeliveryAttempt_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDevice" ADD CONSTRAINT "NotificationDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InAppNotificationFeedState" ADD CONSTRAINT "InAppNotificationFeedState_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InAppNotificationFeedState" ADD CONSTRAINT "InAppNotificationFeedState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigValue" ADD CONSTRAINT "ConfigValue_configKeyId_fkey" FOREIGN KEY ("configKeyId") REFERENCES "ConfigKeyCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigChangeLog" ADD CONSTRAINT "ConfigChangeLog_configKeyId_fkey" FOREIGN KEY ("configKeyId") REFERENCES "ConfigKeyCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigChangeLog" ADD CONSTRAINT "ConfigChangeLog_configValueId_fkey" FOREIGN KEY ("configValueId") REFERENCES "ConfigValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigChangeLog" ADD CONSTRAINT "ConfigChangeLog_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionReview" ADD CONSTRAINT "SessionReview_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionReview" ADD CONSTRAINT "SessionReview_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionReview" ADD CONSTRAINT "SessionReview_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewModerationEntry" ADD CONSTRAINT "ReviewModerationEntry_sessionReviewId_fkey" FOREIGN KEY ("sessionReviewId") REFERENCES "SessionReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerRatingSummary" ADD CONSTRAINT "PractitionerRatingSummary_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingInstructor" ADD CONSTRAINT "TrainingInstructor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingInstructor" ADD CONSTRAINT "TrainingInstructor_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseCategoryTranslation" ADD CONSTRAINT "CourseCategoryTranslation_courseCategoryId_fkey" FOREIGN KEY ("courseCategoryId") REFERENCES "CourseCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_primaryCategoryId_fkey" FOREIGN KEY ("primaryCategoryId") REFERENCES "CourseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_primaryInstructorId_fkey" FOREIGN KEY ("primaryInstructorId") REFERENCES "TrainingInstructor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseTranslation" ADD CONSTRAINT "CourseTranslation_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSchedule" ADD CONSTRAINT "CourseSchedule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSession" ADD CONSTRAINT "CourseSession_courseScheduleId_fkey" FOREIGN KEY ("courseScheduleId") REFERENCES "CourseSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseScheduleId_fkey" FOREIGN KEY ("courseScheduleId") REFERENCES "CourseSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentAttendance" ADD CONSTRAINT "EnrollmentAttendance_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentAttendance" ADD CONSTRAINT "EnrollmentAttendance_courseSessionId_fkey" FOREIGN KEY ("courseSessionId") REFERENCES "CourseSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseApproval" ADD CONSTRAINT "CourseApproval_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
