import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';
import { SettlementPayoutMethod } from '@prisma/client';

export class ListPractitionerPayoutDueDto {
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

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;
}

export class ListPractitionerPayoutHistoryDto {
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

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdTo?: string;
}

export class RecordPractitionerPayoutDto {
  @ApiProperty()
  @IsUUID()
  settlementId!: string;

  @ApiProperty({ example: '1750.00' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amountPaid!: string;

  @ApiProperty({ enum: SettlementPayoutMethod })
  @IsEnum(SettlementPayoutMethod)
  payoutMethod!: SettlementPayoutMethod;

  @ApiPropertyOptional({ example: '2026-04-14T08:33:25.512Z' })
  @IsOptional()
  @IsDateString()
  payoutDate?: string;

  @ApiPropertyOptional({ example: 'manual-transfer-2026-04-14' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  externalReference?: string;

  @ApiPropertyOptional({
    example: 'Manual payout recorded against the practitioner due row.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    example: '12.50',
    description:
      'Optional payout transfer fee applied as platform expense for this payout record.',
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
