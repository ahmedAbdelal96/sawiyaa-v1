import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListAdminPaymentsDto {
  @ApiPropertyOptional({ enum: PaymentProvider })
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ enum: ['NONE', 'PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED'] })
  @IsOptional()
  @IsIn(['NONE', 'PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED'])
  refundStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  createdFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  createdTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ enum: ['createdAt', 'amountTotal'] })
  @IsOptional()
  @IsIn(['createdAt', 'amountTotal'])
  sortBy?: 'createdAt' | 'amountTotal';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
