import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  LedgerDirection,
  LedgerEntryType,
  PackageSettlementStatus,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  RefundDestination,
  RefundStatus,
  SessionEarningReviewDecision,
  SessionEarningReviewSourceType,
  SessionEarningReviewStatus,
  SessionPaymentCoverageType,
  SessionStatus,
  PatientPackagePurchaseStatus,
  WalletBalanceBucket,
} from '@prisma/client';
import { PaginationDto } from './financial-operations-response.dto';

export class ListAdminSessionEarningReviewsDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: SessionEarningReviewStatus })
  @IsOptional()
  @IsEnum(SessionEarningReviewStatus)
  status?: SessionEarningReviewStatus;

  @ApiPropertyOptional({ enum: SessionEarningReviewDecision })
  @IsOptional()
  @IsEnum(SessionEarningReviewDecision)
  decision?: SessionEarningReviewDecision;

  @ApiPropertyOptional({ enum: SessionEarningReviewSourceType })
  @IsOptional()
  @IsEnum(SessionEarningReviewSourceType)
  sourceType?: SessionEarningReviewSourceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @ApiPropertyOptional({ example: 'EGP' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  reviewedFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  reviewedTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === true || value === 'true' || value === '1',
  )
  @IsBoolean()
  actionRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === true || value === 'true' || value === '1',
  )
  @IsBoolean()
  finalized?: boolean;
}

export class SessionEarningReviewUserSummaryDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;
}

export class SessionEarningReviewPractitionerSummaryDto {
  @ApiProperty()
  practitionerId!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true })
  publicSlug!: string | null;

  @ApiProperty({ nullable: true })
  professionalTitle!: string | null;
}

export class SessionEarningReviewPatientSummaryDto {
  @ApiProperty()
  patientId!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;
}

export class SessionEarningReviewSessionSummaryDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  sessionCode!: string;

  @ApiProperty({ enum: SessionStatus })
  status!: SessionStatus;

  @ApiProperty({ enum: SessionPaymentCoverageType })
  paymentCoverageType!: SessionPaymentCoverageType;

  @ApiProperty({ nullable: true })
  scheduledStartAt!: string | null;

  @ApiProperty({ nullable: true })
  scheduledEndAt!: string | null;

  @ApiProperty({ nullable: true })
  completedAt!: string | null;

  @ApiProperty({ nullable: true })
  packagePurchaseId!: string | null;

  @ApiProperty({ nullable: true })
  packageSessionIndex!: number | null;

  @ApiProperty({ nullable: true })
  packageSessionCount!: number | null;
}

export class SessionEarningReviewRefundSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: RefundStatus })
  status!: RefundStatus;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty()
  requestedAt!: string;

  @ApiProperty({ nullable: true })
  processedAt!: string | null;

  @ApiProperty({ nullable: true })
  failedAt!: string | null;

  @ApiProperty({ enum: RefundDestination })
  destination!: RefundDestination;

  @ApiProperty({ nullable: true })
  refundReason!: string | null;

  @ApiProperty({ nullable: true })
  providerRefundRef!: string | null;
}

export class SessionEarningReviewLedgerEntryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: LedgerEntryType })
  entryType!: LedgerEntryType;

  @ApiProperty({ enum: LedgerDirection })
  direction!: LedgerDirection;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty({ enum: WalletBalanceBucket })
  balanceBucket!: WalletBalanceBucket;

  @ApiProperty({ nullable: true })
  referenceType!: string | null;

  @ApiProperty({ nullable: true })
  referenceId!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class SessionEarningReviewPaymentSummaryDto {
  @ApiProperty({ nullable: true })
  paymentId!: string | null;

  @ApiProperty({ enum: PaymentStatus, nullable: true })
  status!: PaymentStatus | null;

  @ApiProperty({ enum: PaymentPurpose, nullable: true })
  paymentPurpose!: PaymentPurpose | null;

  @ApiProperty({ enum: PaymentProvider, nullable: true })
  provider!: PaymentProvider | null;

  @ApiProperty({ nullable: true })
  currencyCode!: string | null;

  @ApiProperty({ nullable: true })
  amountTotal!: string | null;

  @ApiProperty({ nullable: true })
  refundedAmount!: string | null;

  @ApiProperty({ nullable: true })
  remainingEffectiveAmount!: string | null;

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

  @ApiProperty({ type: SessionEarningReviewRefundSummaryDto, isArray: true })
  refunds!: SessionEarningReviewRefundSummaryDto[];

  @ApiProperty({
    type: SessionEarningReviewLedgerEntryDto,
    isArray: true,
    nullable: true,
  })
  reversalLedgerEntries!: SessionEarningReviewLedgerEntryDto[] | null;
}

export class SessionEarningReviewPackagePurchaseSummaryDto {
  @ApiProperty({ nullable: true })
  packagePurchaseId!: string | null;

  @ApiProperty({ enum: PatientPackagePurchaseStatus, nullable: true })
  status!: PatientPackagePurchaseStatus | null;

  @ApiProperty({ nullable: true })
  titleSnapshot!: string | null;

  @ApiProperty({ nullable: true })
  slugSnapshot!: string | null;

  @ApiProperty({ nullable: true })
  sessionCountSnapshot!: number | null;

  @ApiProperty({ nullable: true })
  selectedCurrencyCode!: string | null;

  @ApiProperty({ nullable: true })
  patientPayableTotalSnapshot!: string | null;

  @ApiProperty({ nullable: true })
  practitionerFinalShareSnapshot!: string | null;

  @ApiProperty({ nullable: true })
  platformFinalShareSnapshot!: string | null;

  @ApiProperty({ nullable: true })
  paymentId!: string | null;

  @ApiProperty({ nullable: true })
  packageSettlementId!: string | null;
}

export class SessionEarningReviewPackageSettlementSummaryDto {
  @ApiProperty({ nullable: true })
  packageSettlementId!: string | null;

  @ApiProperty({ enum: PackageSettlementStatus, nullable: true })
  status!: PackageSettlementStatus | null;

  @ApiProperty({ nullable: true })
  currencyCode!: string | null;

  @ApiProperty({ nullable: true })
  sessionCount!: number | null;

  @ApiProperty({ nullable: true })
  completedSessionsCount!: number | null;

  @ApiProperty({ nullable: true })
  heldPractitionerAmount!: string | null;

  @ApiProperty({ nullable: true })
  heldPlatformAmount!: string | null;

  @ApiProperty({ nullable: true })
  releasablePractitionerAmount!: string | null;

  @ApiProperty({ nullable: true })
  releasedPractitionerAmount!: string | null;

  @ApiProperty({ nullable: true })
  normalEquivalentUsedAmount!: string | null;

  @ApiProperty({ nullable: true })
  discountAppliedAmount!: string | null;

  @ApiProperty({ nullable: true })
  reviewedAt!: string | null;

  @ApiProperty({ nullable: true })
  releasedAt!: string | null;

  @ApiProperty({ nullable: true })
  decision!: string | null;

  @ApiProperty({ nullable: true })
  notes!: string | null;
}

export class AdminSessionEarningReviewListItemDto {
  @ApiProperty()
  reviewId!: string;

  @ApiProperty({ enum: SessionEarningReviewSourceType })
  sourceType!: SessionEarningReviewSourceType;

  @ApiProperty({ enum: SessionEarningReviewStatus })
  reviewStatus!: SessionEarningReviewStatus;

  @ApiProperty({ enum: SessionEarningReviewDecision })
  reviewDecision!: SessionEarningReviewDecision;

  @ApiProperty()
  paymentAmount!: string;

  @ApiProperty()
  paymentCurrencyCode!: string;

  @ApiProperty()
  suggestedPractitionerAmount!: string;

  @ApiProperty()
  suggestedPlatformAmount!: string;

  @ApiProperty()
  suggestedCurrencyCode!: string;

  @ApiProperty({ nullable: true })
  finalPractitionerAmount!: string | null;

  @ApiProperty({ nullable: true })
  finalPlatformAmount!: string | null;

  @ApiProperty({ nullable: true })
  finalCurrencyCode!: string | null;

  @ApiProperty({ nullable: true })
  reviewedAt!: string | null;

  @ApiProperty({ nullable: true })
  approvedAt!: string | null;

  @ApiProperty({ nullable: true })
  reviewedBy!: SessionEarningReviewUserSummaryDto | null;

  @ApiProperty({ nullable: true })
  approvedBy!: SessionEarningReviewUserSummaryDto | null;

  @ApiProperty({ type: SessionEarningReviewPractitionerSummaryDto })
  practitioner!: SessionEarningReviewPractitionerSummaryDto;

  @ApiProperty({ type: SessionEarningReviewPatientSummaryDto })
  patient!: SessionEarningReviewPatientSummaryDto;

  @ApiProperty({ type: SessionEarningReviewSessionSummaryDto })
  session!: SessionEarningReviewSessionSummaryDto;

  @ApiProperty({ type: SessionEarningReviewPaymentSummaryDto, nullable: true })
  payment!: SessionEarningReviewPaymentSummaryDto | null;

  @ApiProperty({ type: SessionEarningReviewPackagePurchaseSummaryDto, nullable: true })
  packagePurchase!: SessionEarningReviewPackagePurchaseSummaryDto | null;

  @ApiProperty({ type: SessionEarningReviewPackageSettlementSummaryDto, nullable: true })
  packageSettlement!: SessionEarningReviewPackageSettlementSummaryDto | null;

  @ApiProperty()
  isActionRequired!: boolean;

  @ApiProperty()
  isFinalized!: boolean;

  @ApiProperty()
  canApprove!: boolean;

  @ApiProperty()
  canAdjust!: boolean;

  @ApiProperty()
  canReject!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AdminSessionEarningReviewDetailItemDto extends AdminSessionEarningReviewListItemDto {
  @ApiProperty({ nullable: true })
  internalReason!: string | null;

  @ApiProperty({ nullable: true })
  practitionerFacingNote!: string | null;

  @ApiProperty({ type: SessionEarningReviewLedgerEntryDto, isArray: true })
  ledgerEntries!: SessionEarningReviewLedgerEntryDto[];
}

export class AdminSessionEarningReviewListDataResponseDto {
  @ApiProperty({ type: AdminSessionEarningReviewListItemDto, isArray: true })
  items!: AdminSessionEarningReviewListItemDto[];

  @ApiProperty({ type: PaginationDto })
  pagination!: PaginationDto;

  @ApiProperty({
    type: 'object',
    properties: {
      status: { type: 'string', nullable: true },
      decision: { type: 'string', nullable: true },
      sourceType: { type: 'string', nullable: true },
      practitionerId: { type: 'string', nullable: true },
      patientId: { type: 'string', nullable: true },
      sessionId: { type: 'string', nullable: true },
      paymentId: { type: 'string', nullable: true },
      currencyCode: { type: 'string', nullable: true },
      search: { type: 'string', nullable: true },
      createdFrom: { type: 'string', nullable: true },
      createdTo: { type: 'string', nullable: true },
      reviewedFrom: { type: 'string', nullable: true },
      reviewedTo: { type: 'string', nullable: true },
      actionRequired: { type: 'boolean', nullable: true },
      finalized: { type: 'boolean', nullable: true },
    },
  })
  filters!: Record<string, string | boolean | null>;
}

export class AdminSessionEarningReviewListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminSessionEarningReviewListDataResponseDto })
  data!: AdminSessionEarningReviewListDataResponseDto;
}

export class AdminSessionEarningReviewDetailDataResponseDto {
  @ApiProperty({ type: AdminSessionEarningReviewDetailItemDto })
  item!: AdminSessionEarningReviewDetailItemDto;
}

export class AdminSessionEarningReviewDetailSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminSessionEarningReviewDetailDataResponseDto })
  data!: AdminSessionEarningReviewDetailDataResponseDto;
}
