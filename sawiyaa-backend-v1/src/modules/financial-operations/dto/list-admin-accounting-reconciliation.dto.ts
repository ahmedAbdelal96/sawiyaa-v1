import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  JournalEntrySourceType,
  ReconciliationReviewStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { ReconciliationAnomalyCode } from '../types/accounting-reconciliation.types';

export class ListAdminAccountingReconciliationDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: JournalEntrySourceType })
  @IsOptional()
  @IsEnum(JournalEntrySourceType)
  sourceType?: JournalEntrySourceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @ApiPropertyOptional({
    minLength: 3,
    maxLength: 3,
    description: 'Currency code filter (e.g. USD, EGP).',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currencyCode?: string;

  @ApiPropertyOptional({ enum: ReconciliationReviewStatus })
  @IsOptional()
  @IsEnum(ReconciliationReviewStatus)
  status?: ReconciliationReviewStatus;

  @ApiPropertyOptional({
    enum: [
      'MISSING_JOURNAL_ENTRY',
      'MISSING_PAYOUT_PROOF',
      'AMOUNT_MISMATCH',
      'MISSING_VAT_SNAPSHOT',
      'MISSING_GATEWAY_FEE_SNAPSHOT',
      'MISSING_CANCELLATION_CONTEXT',
      'MISSING_TRANSFER_FEE_SNAPSHOT',
    ],
  })
  @IsOptional()
  @IsString()
  anomalyCode?: ReconciliationAnomalyCode;

  @ApiPropertyOptional({
    description:
      'Free-text search across source ids, payment/refund/settlement references, and review notes.',
  })
  @IsOptional()
  @IsString()
  query?: string;
}
