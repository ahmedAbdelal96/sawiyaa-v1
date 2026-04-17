import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  CommissionRuleScope,
  MarketType,
  SessionFlowType,
  SessionMode,
} from '@prisma/client';
import {
  IsBooleanString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class ListCommissionRulesDto {
  @ApiPropertyOptional({ enum: CommissionRuleScope })
  @IsOptional()
  @IsEnum(CommissionRuleScope)
  ruleScope?: CommissionRuleScope;

  @ApiPropertyOptional({ enum: MarketType })
  @IsOptional()
  @IsEnum(MarketType)
  marketType?: MarketType;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  practitionerCountryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  patientCountryId?: string;

  @ApiPropertyOptional({ description: 'Boolean string filter' })
  @IsOptional()
  @IsBooleanString()
  isActive?: string;
}
