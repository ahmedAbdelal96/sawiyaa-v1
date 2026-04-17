import { ApiPropertyOptional } from '@nestjs/swagger';
import { SettlementPayoutMethod } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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
}

export class MarkSettlementFailedDto {
  @ApiPropertyOptional({ example: 'Bank transfer rejected.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
