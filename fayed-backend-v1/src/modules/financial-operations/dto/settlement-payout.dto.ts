import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SettlementPayoutMethod, SettlementPayoutSource } from '@prisma/client';
import {
  IsDateString,
  IsIn,
  IsEnum,
  IsInt,
  Matches,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecordPractitionerSettlementPayoutDto {
  @ApiProperty({ enum: SettlementPayoutMethod })
  @IsEnum(SettlementPayoutMethod)
  payoutMethod!: SettlementPayoutMethod;

  @ApiPropertyOptional({ example: 'manual-transfer-2026-04-14' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  externalPayoutRef?: string;

  @ApiPropertyOptional({
    example: 'Manual exception payout for urgent closeout.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ example: '2026-04-14T08:33:25.512Z' })
  @IsOptional()
  @IsDateString()
  effectiveAt?: string;

  @ApiPropertyOptional({
    example: '8.00',
    description:
      'Optional transfer fee amount for this payout. Treated as platform expense in accounting.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  transferFeeAmount?: string;

  @ApiPropertyOptional({
    enum: ['PLATFORM_EXPENSE', 'DEDUCT_FROM_PRACTITIONER'],
    description:
      'Optional transfer fee treatment. Defaults to PLATFORM_EXPENSE.',
  })
  @IsOptional()
  @IsIn(['PLATFORM_EXPENSE', 'DEDUCT_FROM_PRACTITIONER'])
  transferFeeTreatment?: 'PLATFORM_EXPENSE' | 'DEDUCT_FROM_PRACTITIONER';
}

export class ListSettlementPayoutsDto {
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

  @ApiPropertyOptional({ enum: SettlementPayoutMethod })
  @IsOptional()
  @IsEnum(SettlementPayoutMethod)
  payoutMethod?: SettlementPayoutMethod;

  @ApiPropertyOptional({ enum: SettlementPayoutSource })
  @IsOptional()
  @IsEnum(SettlementPayoutSource)
  payoutSource?: SettlementPayoutSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  batchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  settlementId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdTo?: string;
}
