import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  MinLength,
  MaxLength,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CorporateContractStatus,
  CorporateBillingMode,
  CorporateMarket,
  CorporateCoverageType,
} from '@prisma/client';

export class CreateContractDto {
  @ApiProperty({ description: 'Contract start date', example: '2025-01-01T00:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Contract end date', example: '2025-12-31T23:59:59Z' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ enum: CorporateBillingMode, description: 'Billing mode' })
  @IsEnum(CorporateBillingMode)
  billingMode: CorporateBillingMode;

  @ApiProperty({ description: 'Currency code', example: 'EGP' })
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency: string;

  @ApiProperty({ enum: CorporateMarket, description: 'Market region' })
  @IsEnum(CorporateMarket)
  market: CorporateMarket;

  @ApiPropertyOptional({ enum: CorporateContractStatus, default: CorporateContractStatus.DRAFT })
  @IsOptional()
  @IsEnum(CorporateContractStatus)
  status?: CorporateContractStatus;

  @ApiPropertyOptional({ description: 'Additional notes as JSON' })
  @IsOptional()
  notes?: Record<string, unknown>;
}

export class UpdateContractDto {
  @ApiPropertyOptional({ description: 'Contract start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Contract end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: CorporateBillingMode })
  @IsOptional()
  @IsEnum(CorporateBillingMode)
  billingMode?: CorporateBillingMode;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ enum: CorporateMarket })
  @IsOptional()
  @IsEnum(CorporateMarket)
  market?: CorporateMarket;

  @ApiPropertyOptional({ description: 'Additional notes as JSON' })
  @IsOptional()
  notes?: Record<string, unknown>;
}

export class UpdateContractStatusDto {
  @ApiProperty({ enum: CorporateContractStatus, description: 'New status' })
  @IsEnum(CorporateContractStatus)
  status: CorporateContractStatus;
}

export class ListContractsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: CorporateContractStatus })
  @IsOptional()
  @IsEnum(CorporateContractStatus)
  status?: CorporateContractStatus;

  @ApiPropertyOptional({ default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ default: 'desc' })
  @IsOptional()
  @IsString()
  sortDirection?: 'asc' | 'desc' = 'desc';
}

export class ContractResponseDto {
  id: string;
  organizationId: string;
  startDate: Date;
  endDate: Date;
  status: CorporateContractStatus;
  billingMode: CorporateBillingMode;
  currency: string;
  market: CorporateMarket;
  notes: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  planCount?: number;
  activePlanCount?: number;
}

export class ContractListResponseDto {
  success: true;
  data: {
    items: ContractResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class ContractItemResponseDto {
  success: true;
  data: ContractResponseDto;
}