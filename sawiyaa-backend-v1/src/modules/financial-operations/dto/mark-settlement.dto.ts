import { ApiPropertyOptional } from '@nestjs/swagger';
import { SettlementPayoutMethod } from '@prisma/client';
import {
  IsDateString,
  IsIn,
  IsEnum,
  Matches,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const TRANSFER_FEE_TREATMENTS = [
  'PLATFORM_EXPENSE',
  'DEDUCT_FROM_PRACTITIONER',
] as const;

export class MarkSettlementPaidDto {
  @ApiPropertyOptional({ example: 'bank-transfer-2026-04-egp' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  externalPayoutRef?: string;

  @ApiPropertyOptional({ enum: SettlementPayoutMethod })
  @IsOptional()
  @IsEnum(SettlementPayoutMethod)
  payoutMethod?: SettlementPayoutMethod;

  @ApiPropertyOptional({ example: '2026-04-14T08:33:25.512Z' })
  @IsOptional()
  @IsDateString()
  effectiveAt?: string;

  @ApiPropertyOptional({ example: 'Paid by monthly bank batch.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    example: '15.00',
    description:
      'Optional transfer fee amount to apply per payout row during batch closeout.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  transferFeeAmount?: string;

  @ApiPropertyOptional({
    enum: TRANSFER_FEE_TREATMENTS,
    description:
      'Optional transfer fee accounting treatment. Defaults to PLATFORM_EXPENSE.',
  })
  @IsOptional()
  @IsIn(TRANSFER_FEE_TREATMENTS)
  transferFeeTreatment?: (typeof TRANSFER_FEE_TREATMENTS)[number];
}

export class MarkSettlementFailedDto {
  @ApiPropertyOptional({ example: 'Bank transfer rejected.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
