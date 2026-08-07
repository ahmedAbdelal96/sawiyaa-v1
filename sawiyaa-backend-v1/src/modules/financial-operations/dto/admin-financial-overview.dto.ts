import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class AdminFinancialOverviewQueryDto {
  @ApiPropertyOptional({ description: 'Inclusive ISO timestamp/date.' })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Exclusive ISO timestamp/date.' })
  @IsOptional()
  @IsString()
  toDate?: string;

  @ApiPropertyOptional({ example: 'EGP' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  walletStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payoutStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  practitionerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional({ enum: ['DIRECT', 'PACKAGE'] })
  @IsOptional()
  @IsIn(['DIRECT', 'PACKAGE'])
  bookingType?: 'DIRECT' | 'PACKAGE';

  @ApiPropertyOptional({ enum: ['ORIGINAL', 'REPLACEMENT'] })
  @IsOptional()
  @IsIn(['ORIGINAL', 'REPLACEMENT'])
  fulfillment?: 'ORIGINAL' | 'REPLACEMENT';
}

export type AdminFinancialOverviewScope = 'ACCOUNTING' | 'COLLECTIONS' | 'WALLET' | 'PAYOUT';

export class AdminFinancialBucketDto {
  @ApiProperty()
  currency!: string;

  @ApiProperty({ example: '125000.00' })
  amount!: string;

  @ApiProperty()
  count!: number;
}

export class AdminFinancialBalanceBucketDto extends AdminFinancialBucketDto {
  @ApiProperty()
  availableAmount!: string;

  @ApiProperty()
  lockedOrReservedAmount!: string;
}

export class AdminFinancialStatusBucketDto {
  @ApiProperty()
  status!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  count!: number;
}

export class AdminFinancialOverviewMetricsDto {
  @ApiProperty({ type: AdminFinancialBucketDto, isArray: true })
  grossPatientCollections!: AdminFinancialBucketDto[];

  @ApiProperty({ type: AdminFinancialBucketDto, isArray: true })
  patientWalletCredits!: AdminFinancialBucketDto[];

  @ApiProperty({ type: AdminFinancialBucketDto, isArray: true })
  completedServiceEconomicValue!: AdminFinancialBucketDto[];

  @ApiProperty({ type: AdminFinancialBucketDto, isArray: true })
  awaitingAccountantReview!: AdminFinancialBucketDto[];

  @ApiProperty({ type: AdminFinancialBucketDto, isArray: true })
  awaitingAccountantReviewSuggestedPractitioner!: AdminFinancialBucketDto[];

  @ApiProperty({ type: AdminFinancialBucketDto, isArray: true })
  accountantApprovedAwaitingWalletCredit!: AdminFinancialBucketDto[];

  @ApiProperty({ type: AdminFinancialBucketDto, isArray: true })
  accountantApprovedAlreadyWalletCredited!: AdminFinancialBucketDto[];

  @ApiProperty({ type: AdminFinancialBucketDto, isArray: true })
  practitionerWalletCredits!: AdminFinancialBucketDto[];

  @ApiProperty({ type: AdminFinancialBucketDto, isArray: true })
  outstandingPractitionerWalletLiability!: AdminFinancialBucketDto[];

  @ApiProperty({ type: AdminFinancialBucketDto, isArray: true })
  availableForPayout!: AdminFinancialBucketDto[];

  @ApiProperty({ type: AdminFinancialBalanceBucketDto, isArray: true })
  currentPractitionerWalletBalances!: AdminFinancialBalanceBucketDto[];

  @ApiProperty({ type: AdminFinancialBucketDto, isArray: true })
  completedExternalPractitionerPayouts!: AdminFinancialBucketDto[];

  @ApiProperty({ type: AdminFinancialBucketDto, isArray: true })
  completedExternalPayoutDebits!: AdminFinancialBucketDto[];

  @ApiProperty({ type: AdminFinancialBucketDto, isArray: true })
  pendingExternalPractitionerPayouts!: AdminFinancialBucketDto[];

  @ApiProperty({ type: AdminFinancialBucketDto, isArray: true })
  failedOrReversedExternalPayouts!: AdminFinancialBucketDto[];

  @ApiProperty({ type: AdminFinancialBucketDto, isArray: true })
  platformSuggestedShare!: AdminFinancialBucketDto[];

  @ApiProperty({ type: AdminFinancialBucketDto, isArray: true })
  platformRemainderAfterDecision!: AdminFinancialBucketDto[];

  @ApiProperty({ type: AdminFinancialBucketDto, isArray: true })
  accountingAdditions!: AdminFinancialBucketDto[];

  @ApiProperty({ type: AdminFinancialBucketDto, isArray: true })
  accountingDeductions!: AdminFinancialBucketDto[];

  @ApiProperty({ type: AdminFinancialBucketDto, isArray: true })
  rejectedOrExcludedCandidates!: AdminFinancialBucketDto[];

  @ApiProperty({ type: AdminFinancialStatusBucketDto, isArray: true })
  paymentStatusCounts!: AdminFinancialStatusBucketDto[];
}

export class AdminFinancialOverviewDataDto {
  @ApiProperty()
  asOf!: string;

  @ApiProperty({ type: AdminFinancialOverviewQueryDto })
  filters!: Record<string, string | null>;

  @ApiProperty({ type: AdminFinancialOverviewMetricsDto })
  metrics!: AdminFinancialOverviewMetricsDto;
}

export class AdminFinancialOverviewSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminFinancialOverviewDataDto })
  data!: AdminFinancialOverviewDataDto;
}
