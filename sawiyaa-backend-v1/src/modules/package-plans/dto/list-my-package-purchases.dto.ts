import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PatientPackagePurchaseStatus } from '@prisma/client';

export class ListMyPackagePurchasesDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: PatientPackagePurchaseStatus })
  @IsOptional()
  @IsEnum(PatientPackagePurchaseStatus)
  status?: PatientPackagePurchaseStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
