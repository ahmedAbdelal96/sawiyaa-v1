import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
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

export class GetAdminPractitionerPayoutBalanceDto {
  @ApiPropertyOptional({ example: 'EGP' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}

export class ListAdminPractitionerPayoutSummariesDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class ListAdminPractitionerManualPayoutsDto {
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

  @ApiPropertyOptional({ example: 'EGP' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @ApiPropertyOptional({ enum: SettlementPayoutMethod })
  @IsOptional()
  @IsEnum(SettlementPayoutMethod)
  payoutMethod?: SettlementPayoutMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdTo?: string;
}

export class RecordAdminPractitionerManualPayoutDto {
  @ApiProperty()
  @IsUUID()
  practitionerId!: string;

  @ApiProperty({ example: 'EGP' })
  @IsString()
  @MaxLength(3)
  currencyCode!: string;

  @ApiProperty({ example: '1250.00' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amountPaid!: string;

  @ApiPropertyOptional({ example: '2026-05-05T12:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ enum: SettlementPayoutMethod })
  @IsOptional()
  @IsEnum(SettlementPayoutMethod)
  paymentMethod?: SettlementPayoutMethod;

  @ApiPropertyOptional({ example: 'bank-transfer-2026-05-05-001' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  transferReference?: string;

  @ApiPropertyOptional({ example: 'Paid partially via bank transfer outside the platform.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
