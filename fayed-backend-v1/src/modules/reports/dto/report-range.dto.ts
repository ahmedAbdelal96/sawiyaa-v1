import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class ReportRangeDto {
  @ApiPropertyOptional({
    description: 'ISO date-time string (inclusive lower bound).',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'ISO date-time string (inclusive upper bound).',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    minLength: 3,
    maxLength: 3,
    description: 'Optional currency code filter (e.g. USD, EGP).',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currencyCode?: string;
}

