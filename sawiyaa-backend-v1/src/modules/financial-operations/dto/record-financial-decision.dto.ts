import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PractitionerEarningAdjustmentType } from '@prisma/client';

export class PractitionerEarningAdjustmentItemDto {
  @ApiProperty({ enum: PractitionerEarningAdjustmentType })
  @IsEnum(PractitionerEarningAdjustmentType)
  type!: PractitionerEarningAdjustmentType;

  @ApiProperty({ example: 'BONUS' })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiProperty({ example: 'Performance bonus for high rating' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: '25.00' })
  @IsNumberString()
  amount!: string;

  @ApiProperty({ example: 'EGP' })
  @IsString()
  @IsNotEmpty()
  currencyCode!: string;

  @ApiPropertyOptional({ example: 'Approved by head accountant' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class RecordFinancialDecisionDto {
  @ApiPropertyOptional({ example: '100.00', description: 'Override base source amount' })
  @IsOptional()
  @IsNumberString()
  accountantApprovedSourceAmount?: string;

  @ApiPropertyOptional({ description: 'Mandatory reason if accountantApprovedSourceAmount differs from suggested amount' })
  @IsOptional()
  @IsString()
  overrideReason?: string;

  @ApiPropertyOptional({ type: [PractitionerEarningAdjustmentItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PractitionerEarningAdjustmentItemDto)
  adjustments?: PractitionerEarningAdjustmentItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internalReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  practitionerFacingNote?: string;

  @ApiPropertyOptional({ description: 'Client idempotency key scoped to this entitlement and operation.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  idempotencyKey?: string;
}
