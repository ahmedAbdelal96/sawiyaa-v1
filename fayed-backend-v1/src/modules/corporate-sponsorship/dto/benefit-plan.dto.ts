import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
  IsInt,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CorporateBenefitPlanStatus,
  CorporateCoverageType,
} from '@prisma/client';

export class CreateBenefitPlanDto {
  @ApiProperty({ description: 'Plan name', example: 'Premium Health Plan' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: CorporateCoverageType, description: 'Coverage type' })
  @IsEnum(CorporateCoverageType)
  coverageType: CorporateCoverageType;

  @ApiPropertyOptional({ description: 'Discount percentage (1-100)', example: 80 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  coveragePercent?: number;

  @ApiPropertyOptional({ description: 'Maximum coverage amount per session', example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCoverageAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum total coverage across all sessions', example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTotalCoverage?: number;

  @ApiProperty({ description: 'Currency code', example: 'EGP' })
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency: string;

  @ApiPropertyOptional({ description: 'Code usage limit (V1: must be 1)', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  codeUsageLimit?: number = 1;

  @ApiPropertyOptional({ description: 'Reservation TTL in minutes (5-60)', default: 15 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(60)
  codeReservationTtlMinutes?: number = 15;

  @ApiPropertyOptional({
    enum: CorporateBenefitPlanStatus,
    default: CorporateBenefitPlanStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CorporateBenefitPlanStatus)
  status?: CorporateBenefitPlanStatus;

  @ApiPropertyOptional({ description: 'Allowed specialty IDs', type: [String] })
  @IsOptional()
  @IsArray()
  specialtyIds?: string[];

  @ApiPropertyOptional({ description: 'Allowed practitioner IDs', type: [String] })
  @IsOptional()
  @IsArray()
  practitionerIds?: string[];
}

export class UpdateBenefitPlanDto {
  @ApiPropertyOptional({ description: 'Plan name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Coverage type' })
  @IsOptional()
  @IsEnum(CorporateCoverageType)
  coverageType?: CorporateCoverageType;

  @ApiPropertyOptional({ description: 'Discount percentage (1-100)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  coveragePercent?: number;

  @ApiPropertyOptional({ description: 'Maximum coverage amount per session' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCoverageAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum total coverage across all sessions' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTotalCoverage?: number;

  @ApiPropertyOptional({ description: 'Code usage limit' })
  @IsOptional()
  @IsInt()
  @Min(1)
  codeUsageLimit?: number;

  @ApiPropertyOptional({ description: 'Reservation TTL in minutes (5-60)' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(60)
  codeReservationTtlMinutes?: number;

  @ApiPropertyOptional({ description: 'Allowed specialty IDs', type: [String] })
  @IsOptional()
  @IsArray()
  specialtyIds?: string[];

  @ApiPropertyOptional({ description: 'Allowed practitioner IDs', type: [String] })
  @IsOptional()
  @IsArray()
  practitionerIds?: string[];
}

export class UpdateBenefitPlanStatusDto {
  @ApiProperty({ enum: CorporateBenefitPlanStatus, description: 'New status' })
  @IsEnum(CorporateBenefitPlanStatus)
  status: CorporateBenefitPlanStatus;
}

export class ListBenefitPlansQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: CorporateBenefitPlanStatus })
  @IsOptional()
  @IsEnum(CorporateBenefitPlanStatus)
  status?: CorporateBenefitPlanStatus;

  @ApiPropertyOptional({ default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ default: 'desc' })
  @IsOptional()
  @IsString()
  sortDirection?: 'asc' | 'desc' = 'desc';
}

export class BenefitPlanResponseDto {
  id: string;
  contractId: string;
  name: string;
  coverageType: CorporateCoverageType;
  coveragePercent: number | null;
  maxCoverageAmount: import('@prisma/client/runtime/library').Decimal | null;
  maxTotalCoverage: import('@prisma/client/runtime/library').Decimal | null;
  currency: string;
  codeUsageLimit: number;
  codeReservationTtlMinutes: number;
  status: CorporateBenefitPlanStatus;
  createdAt: Date;
  updatedAt: Date;
  specialtyCount?: number;
  practitionerCount?: number;
}

export class BenefitPlanListResponseDto {
  success: true;
  data: {
    items: BenefitPlanResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class BenefitPlanItemResponseDto {
  success: true;
  data: BenefitPlanResponseDto;
}