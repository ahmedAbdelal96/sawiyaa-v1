import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsDateString,
  IsIn,
} from 'class-validator';
import { CorporateBatchStatus } from '@prisma/client';

export class GenerateCodeBatchDto {
  @ApiProperty({ description: 'Name for this code batch' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Total number of codes to generate', minimum: 1, maximum: 100000 })
  @IsInt()
  @Min(1)
  @Max(100000)
  totalCodes: number;

  @ApiPropertyOptional({ description: 'Expiration date for all codes in this batch (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Export mode',
    enum: ['DIRECT_STREAM'],
    default: 'DIRECT_STREAM',
  })
  @IsOptional()
  @IsString()
  @IsIn(['DIRECT_STREAM'])
  exportMode?: string;
}

export class ListCodeBatchesQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: CorporateBatchStatus })
  @IsOptional()
  @IsString()
  status?: CorporateBatchStatus;

  @ApiPropertyOptional({ default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortDirection?: 'asc' | 'desc' = 'desc';
}

export class RevokeCodeBatchDto {
  @ApiPropertyOptional({ description: 'Reason for revoking this batch' })
  @IsOptional()
  @IsString()
  revokeReason?: string;
}

export class CodeBatchCodeStatusCountDto {
  @ApiProperty()
  available: number;

  @ApiProperty()
  reserved: number;

  @ApiProperty()
  used: number;

  @ApiProperty()
  revoked: number;

  @ApiProperty()
  expired: number;
}

export class CodeBatchItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  organizationName: string;

  @ApiProperty()
  companyCode: string;

  @ApiProperty()
  contractId: string;

  @ApiProperty()
  benefitPlanId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  totalCodes: number;

  @ApiProperty()
  generatedCount: number;

  @ApiPropertyOptional()
  expiresAt?: string;

  @ApiProperty()
  status: CorporateBatchStatus;

  @ApiPropertyOptional()
  exportedAt?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional()
  revokedAt?: string;

  @ApiPropertyOptional()
  revokeReason?: string;

  @ApiProperty({ type: CodeBatchCodeStatusCountDto })
  statusCounts: CodeBatchCodeStatusCountDto;
}

export class CodeBatchListResponseDto {
  @ApiProperty({ type: [CodeBatchItemResponseDto] })
  items: CodeBatchItemResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class GenerateCodeBatchResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: {
    batchId: string;
    name: string;
    totalCodes: number;
    generatedCount: number;
    status: CorporateBatchStatus;
    expiresAt?: string;
  };
}
