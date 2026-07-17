import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';
import {
  PackageSettlementStatus,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  PractitionerRecoveryActionType,
  PractitionerRecoveryReasonCode,
  PractitionerRecoveryStatus,
  RefundDestination,
  RefundStatus,
  SessionPaymentCoverageType,
  SessionEarningReviewStatus,
  SessionStatus,
  SessionEarningReviewDecision,
  SessionEarningReviewSourceType,
} from '@prisma/client';
import { PaginationDto } from './financial-operations-response.dto';

export class AdminPractitionerRecoveryQueryBaseDto {
  @ApiPropertyOptional()
  practitionerId?: string;

  @ApiPropertyOptional({ enum: PractitionerRecoveryStatus })
  status?: PractitionerRecoveryStatus;

  @ApiPropertyOptional({ enum: PractitionerRecoveryReasonCode })
  reasonCode?: PractitionerRecoveryReasonCode;

  @ApiPropertyOptional({ example: 'EGP' })
  currencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  limit?: number = 20;
}

export class ListAdminPractitionerRecoveriesDto extends AdminPractitionerRecoveryQueryBaseDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  declare page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  declare limit?: number;

  @IsOptional()
  @IsUUID()
  declare practitionerId?: string;

  @IsOptional()
  @IsEnum(PractitionerRecoveryStatus)
  declare status?: PractitionerRecoveryStatus;

  @IsOptional()
  @IsEnum(PractitionerRecoveryReasonCode)
  declare reasonCode?: PractitionerRecoveryReasonCode;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  declare currencyCode?: string;

  @IsOptional()
  @IsDateString()
  declare createdFrom?: string;

  @IsOptional()
  @IsDateString()
  declare createdTo?: string;
}

export class AdminPractitionerRecoveryUserSummaryDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;
}

export class AdminPractitionerRecoveryPractitionerSummaryDto {
  @ApiProperty()
  practitionerId!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true })
  publicSlug!: string | null;

  @ApiProperty({ nullable: true })
  professionalTitle!: string | null;
}

export class AdminPractitionerRecoverySessionSummaryDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  sessionCode!: string;

  @ApiProperty({ enum: SessionStatus, nullable: true })
  status!: SessionStatus | null;

  @ApiProperty({ enum: SessionPaymentCoverageType, nullable: true })
  paymentCoverageType!: SessionPaymentCoverageType | null;

  @ApiProperty({ nullable: true })
  scheduledStartAt!: string | null;

  @ApiProperty({ nullable: true })
  scheduledEndAt!: string | null;

  @ApiProperty({ nullable: true })
  completedAt!: string | null;
}

export class AdminPractitionerRecoveryPaymentSummaryDto {
  @ApiProperty({ nullable: true })
  paymentId!: string | null;

  @ApiProperty({ enum: PaymentStatus, nullable: true })
  status!: PaymentStatus | null;

  @ApiProperty({ enum: PaymentPurpose, nullable: true })
  paymentPurpose!: PaymentPurpose | null;

  @ApiProperty({ enum: PaymentProvider, nullable: true })
  provider!: PaymentProvider | null;

  @ApiProperty({ nullable: true })
  amountTotal!: string | null;

  @ApiProperty({ nullable: true })
  currencyCode!: string | null;

  @ApiProperty({ nullable: true })
  providerPaymentRef!: string | null;

  @ApiProperty({ nullable: true })
  providerOrderRef!: string | null;

  @ApiProperty({ nullable: true })
  initiatedAt!: string | null;

  @ApiProperty({ nullable: true })
  capturedAt!: string | null;

  @ApiProperty({ nullable: true })
  failedAt!: string | null;

  @ApiProperty({ nullable: true })
  expiredAt!: string | null;
}

export class AdminPractitionerRecoveryRefundSummaryDto {
  @ApiProperty()
  refundId!: string;

  @ApiProperty({ enum: RefundStatus })
  status!: RefundStatus;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty({ enum: RefundDestination })
  destination!: RefundDestination;

  @ApiProperty({ nullable: true })
  requestedAt!: string | null;

  @ApiProperty({ nullable: true })
  processedAt!: string | null;

  @ApiProperty({ nullable: true })
  failedAt!: string | null;

  @ApiProperty({ nullable: true })
  providerRefundRef!: string | null;
}

export class AdminPractitionerRecoverySessionEarningReviewSummaryDto {
  @ApiProperty()
  sessionEarningReviewId!: string;

  @ApiProperty({ enum: SessionEarningReviewSourceType })
  sourceType!: SessionEarningReviewSourceType;

  @ApiProperty({ enum: SessionEarningReviewDecision })
  reviewDecision!: SessionEarningReviewDecision;

  @ApiProperty({ enum: SessionEarningReviewStatus, nullable: true })
  reviewStatus!: SessionEarningReviewStatus | null;
}

export class AdminPractitionerRecoverySettlementSummaryDto {
  @ApiProperty({ nullable: true })
  settlementId!: string | null;

  @ApiProperty({ enum: PackageSettlementStatus, nullable: true })
  status!: PackageSettlementStatus | null;

  @ApiProperty({ nullable: true })
  amountNet!: string | null;

  @ApiProperty({ nullable: true })
  amountPaidTotal!: string | null;

  @ApiProperty({ nullable: true })
  currencyCode!: string | null;
}

export class AdminPractitionerRecoveryActionItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: PractitionerRecoveryActionType })
  actionType!: PractitionerRecoveryActionType;

  @ApiProperty()
  amount!: string;

  @ApiProperty({ nullable: true })
  payoutId!: string | null;

  @ApiProperty({ nullable: true })
  reason!: string | null;

  @ApiProperty({ nullable: true })
  performedBy!: AdminPractitionerRecoveryUserSummaryDto | null;

  @ApiProperty()
  createdAt!: string;
}

export class AdminPractitionerRecoveryListItemDto {
  @ApiProperty()
  recoveryId!: string;

  @ApiProperty({ type: AdminPractitionerRecoveryPractitionerSummaryDto })
  practitioner!: AdminPractitionerRecoveryPractitionerSummaryDto;

  @ApiProperty({ type: AdminPractitionerRecoverySessionSummaryDto, nullable: true })
  session!: AdminPractitionerRecoverySessionSummaryDto | null;

  @ApiProperty({ type: AdminPractitionerRecoveryPaymentSummaryDto, nullable: true })
  payment!: AdminPractitionerRecoveryPaymentSummaryDto | null;

  @ApiProperty({ type: AdminPractitionerRecoveryRefundSummaryDto, nullable: true })
  refund!: AdminPractitionerRecoveryRefundSummaryDto | null;

  @ApiProperty({
    type: AdminPractitionerRecoverySessionEarningReviewSummaryDto,
    nullable: true,
  })
  sessionEarningReview!: AdminPractitionerRecoverySessionEarningReviewSummaryDto | null;

  @ApiProperty({ type: AdminPractitionerRecoverySettlementSummaryDto, nullable: true })
  settlement!: AdminPractitionerRecoverySettlementSummaryDto | null;

  @ApiProperty({ nullable: true })
  payoutId!: string | null;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  recoveredAmount!: string;

  @ApiProperty()
  remainingAmount!: string;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty({ enum: PractitionerRecoveryStatus })
  status!: PractitionerRecoveryStatus;

  @ApiProperty({ enum: PractitionerRecoveryReasonCode })
  reasonCode!: PractitionerRecoveryReasonCode;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ nullable: true })
  resolvedAt!: string | null;
}

export class AdminPractitionerRecoveryDetailItemDto extends AdminPractitionerRecoveryListItemDto {
  @ApiProperty({ nullable: true })
  internalReason!: string | null;

  @ApiProperty({ nullable: true })
  practitionerFacingNote!: string | null;

  @ApiProperty({ type: AdminPractitionerRecoveryUserSummaryDto, nullable: true })
  createdBy!: AdminPractitionerRecoveryUserSummaryDto | null;

  @ApiProperty({ type: AdminPractitionerRecoveryUserSummaryDto, nullable: true })
  resolvedBy!: AdminPractitionerRecoveryUserSummaryDto | null;

  @ApiProperty({ type: AdminPractitionerRecoveryActionItemDto, isArray: true })
  actionHistory!: AdminPractitionerRecoveryActionItemDto[];
}

export class AdminPractitionerRecoveryListDataResponseDto {
  @ApiProperty({ type: AdminPractitionerRecoveryListItemDto, isArray: true })
  items!: AdminPractitionerRecoveryListItemDto[];

  @ApiProperty({ type: PaginationDto })
  pagination!: PaginationDto;

  @ApiProperty({ type: AdminPractitionerRecoveryQueryBaseDto })
  filters!: AdminPractitionerRecoveryQueryBaseDto;
}

export class AdminPractitionerRecoveryDetailDataResponseDto {
  @ApiProperty({ type: AdminPractitionerRecoveryDetailItemDto })
  item!: AdminPractitionerRecoveryDetailItemDto;
}

export class MarkAdminPractitionerRecoveryCollectedDto {
  @ApiProperty({ example: '25.00' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amountCollected!: string;

  @ApiProperty({ example: 'manual-collect-2026-07-13' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  idempotencyKey!: string;

  @ApiPropertyOptional({ example: 'Collected via bank transfer.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class WaiveAdminPractitionerRecoveryDto {
  @ApiProperty({ example: 'Manual finance correction after review.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;

  @ApiProperty({ example: 'manual-waive-2026-07-13' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  idempotencyKey!: string;

  @ApiPropertyOptional({ example: 'Approved by finance lead.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class AdminPractitionerRecoveryMutationResultDto {
  @ApiProperty({ type: AdminPractitionerRecoveryDetailItemDto })
  item!: AdminPractitionerRecoveryDetailItemDto;

  @ApiProperty({ nullable: true })
  wasAlreadyRecorded?: boolean;
}
