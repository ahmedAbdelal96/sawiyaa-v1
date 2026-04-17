import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CommissionRuleScope,
  MarketType,
  SessionFlowType,
  SessionMode,
} from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCommissionRuleDto {
  @ApiProperty({ example: 'egy-local-video-default' })
  @IsString()
  @MaxLength(191)
  slug!: string;

  @ApiProperty({ example: 'Egypt local video default commission' })
  @IsString()
  @MaxLength(191)
  ruleName!: string;

  @ApiProperty({ enum: CommissionRuleScope })
  @IsEnum(CommissionRuleScope)
  ruleScope!: CommissionRuleScope;

  @ApiPropertyOptional({ enum: MarketType, default: MarketType.ANY })
  @IsOptional()
  @IsEnum(MarketType)
  marketType?: MarketType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  practitionerCountryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  patientCountryId?: string;

  @ApiPropertyOptional({ enum: SessionFlowType })
  @IsOptional()
  @IsEnum(SessionFlowType)
  sessionFlowType?: SessionFlowType;

  @ApiPropertyOptional({ enum: SessionMode })
  @IsOptional()
  @IsEnum(SessionMode)
  sessionMode?: SessionMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  specialtyId?: string;

  @ApiProperty({ example: '25.00' })
  @IsNumberString()
  platformRatePercent!: string;

  @ApiProperty({ example: '75.00' })
  @IsNumberString()
  practitionerRatePercent!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2026-04-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsString()
  endsAt?: string;
}
