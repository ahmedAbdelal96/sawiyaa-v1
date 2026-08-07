import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum SessionEarningReviewModerationAction {
  APPROVE_AS_IS = 'APPROVE_AS_IS',
  EDIT_AND_APPROVE = 'EDIT_AND_APPROVE',
  REJECT_PAYOUT = 'REJECT_PAYOUT',
  EXCLUDE_FROM_PAYOUT = 'EXCLUDE_FROM_PAYOUT',
}

export class ModerateSessionEarningReviewDto {
  @ApiProperty({ enum: SessionEarningReviewModerationAction })
  @IsEnum(SessionEarningReviewModerationAction)
  action!: SessionEarningReviewModerationAction;

  @ApiPropertyOptional({ maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  finalPractitionerAmount?: string;

  @ApiPropertyOptional({ maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  finalPlatformAmount?: string;

  @ApiPropertyOptional({ maxLength: 3 })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  finalCurrencyCode?: string;

  @ApiPropertyOptional({ maxLength: 32, description: 'Required for cross-currency settlement approval.' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  exchangeRate?: string;

  @ApiPropertyOptional({ maxLength: 32, description: 'Accountant-approved target Wallet amount.' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  approvedWalletCreditAmount?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  accountingAdjustmentType?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  accountingNotes?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  internalReason?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  practitionerFacingNote?: string;

  @ApiPropertyOptional({ description: 'Client idempotency key scoped to this entitlement and operation.' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  idempotencyKey?: string;
}
