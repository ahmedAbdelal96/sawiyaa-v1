import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class GetAdminAccountingDashboardDto {
  @ApiPropertyOptional({
    description:
      'ISO start date used for dashboard aggregation (inclusive). Defaults to last 30 days.',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description:
      'ISO end date used for dashboard aggregation (inclusive). Defaults to now.',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description:
      'Currency code filter for dashboard aggregation. When omitted, all currencies are included.',
    minLength: 3,
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currencyCode?: string;

  @ApiPropertyOptional({
    description: 'How many recent accounting events should be included.',
    minimum: 1,
    maximum: 20,
    default: 8,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  recentLimit?: number = 8;
}
