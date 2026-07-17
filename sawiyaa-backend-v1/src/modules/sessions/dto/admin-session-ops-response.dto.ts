import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PatientPackagePurchaseStatus,
  SessionMode,
  SessionPaymentCoverageType,
  SessionProvider,
  SessionStatus,
} from '@prisma/client';
import {
  SessionJoinBlockedReason,
  SessionPresentationStatus,
} from '../types/session-video.types';

class AdminSessionIdentityContactDto {
  @ApiProperty({ nullable: true })
  userId!: string | null;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty({ nullable: true })
  phone!: string | null;
}

class AdminSessionParticipantsDto {
  @ApiProperty({ type: AdminSessionIdentityContactDto })
  patient!: AdminSessionIdentityContactDto;

  @ApiProperty({ type: AdminSessionIdentityContactDto })
  practitioner!: AdminSessionIdentityContactDto;
}

class AdminSessionPackagePlanSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  sessionCount!: number;

  @ApiProperty({ nullable: true })
  discountPercent!: string | null;
}

class AdminSessionPackagePurchaseSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: PatientPackagePurchaseStatus })
  status!: PatientPackagePurchaseStatus;

  @ApiProperty({ nullable: true })
  selectedCurrencyCode!: string | null;

  @ApiProperty({ nullable: true })
  sessionCountSnapshot!: number | null;

  @ApiProperty({ nullable: true })
  patientPayableTotalSnapshot!: string | null;

  @ApiProperty({ type: AdminSessionPackagePlanSummaryDto })
  packagePlan!: AdminSessionPackagePlanSummaryDto;
}

class AdminSessionPackageEntitlementDecisionActorDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;
}

export class AdminSessionPackageEntitlementDecisionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  packagePurchaseId!: string;

  @ApiProperty({ enum: SessionStatus })
  sessionStatusSnapshot!: SessionStatus;

  @ApiProperty()
  decisionType!: string;

  @ApiProperty()
  reasonCode!: string;

  @ApiPropertyOptional({ nullable: true })
  adminNote!: string | null;

  @ApiPropertyOptional({ nullable: true })
  resultingSessionEarningReviewId!: string | null;

  @ApiProperty({ type: AdminSessionPackageEntitlementDecisionActorDto })
  decidedBy!: AdminSessionPackageEntitlementDecisionActorDto;

  @ApiProperty()
  decidedAt!: string;

  @ApiProperty()
  idempotencyKey!: string;
}

export class AdminSessionRuntimeInspectionItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    example: 'SES-2026-000123',
    description: 'Human-readable session reference code.',
  })
  sessionCode!: string;

  @ApiProperty({ enum: SessionStatus })
  status!: SessionStatus;

  @ApiProperty({ enum: SessionMode })
  sessionMode!: SessionMode;

  @ApiProperty({ nullable: true })
  scheduledStartAt!: string | null;

  @ApiProperty({ nullable: true })
  scheduledEndAt!: string | null;

  @ApiProperty({ enum: SessionProvider })
  provider!: SessionProvider;

  @ApiProperty({ nullable: true })
  providerRoomId!: string | null;

  @ApiProperty({ nullable: true })
  providerSessionRef!: string | null;

  @ApiProperty()
  canPrepareRuntime!: boolean;

  @ApiProperty()
  canJoin!: boolean;

  @ApiProperty({
    nullable: true,
    enum: [
      'SESSION_NOT_JOINABLE_STATUS',
      'SESSION_NOT_VIDEO_MODE',
      'SESSION_TIME_WINDOW_NOT_OPEN',
      'SESSION_RUNTIME_NOT_PREPARED',
      'SESSION_JOIN_WINDOW_CLOSED',
    ],
  })
  blockedReason!: SessionJoinBlockedReason | null;

  /**
   * Phase 3 — Participant identity summary (displayName + primary email +
   * primary phone) for both the patient and the practitioner. Optional
   * fields may be null when the user has no verified contact row.
   */
  @ApiProperty({ type: AdminSessionParticipantsDto })
  participants!: AdminSessionParticipantsDto;

  /**
   * Phase 3 — Lifecycle presentation status. Computed by the existing
   * presentation-status resolver.
   */
  @ApiProperty({
    enum: [
      'UPCOMING',
      'JOINABLE',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
      'ENDED',
      'UNAVAILABLE',
    ],
    nullable: true,
  })
  presentationStatus!: SessionPresentationStatus | null;

  @ApiPropertyOptional({ type: AdminSessionPackagePurchaseSummaryDto, nullable: true })
  packagePurchase!: AdminSessionPackagePurchaseSummaryDto | null;

  @ApiPropertyOptional({ type: AdminSessionPackageEntitlementDecisionDto, nullable: true })
  packageEntitlementDecision!: AdminSessionPackageEntitlementDecisionDto | null;

  @ApiProperty({ enum: SessionPaymentCoverageType })
  paymentCoverageType!: SessionPaymentCoverageType;

  @ApiPropertyOptional({ nullable: true })
  packageSessionIndex!: number | null;

  @ApiPropertyOptional({ nullable: true })
  packageSessionCount!: number | null;
}

export class AdminSessionRuntimeInspectionDataResponseDto {
  @ApiProperty({ type: AdminSessionRuntimeInspectionItemDto })
  item!: AdminSessionRuntimeInspectionItemDto;
}

export class AdminSessionRuntimeInspectionSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminSessionRuntimeInspectionDataResponseDto })
  data!: AdminSessionRuntimeInspectionDataResponseDto;
}
