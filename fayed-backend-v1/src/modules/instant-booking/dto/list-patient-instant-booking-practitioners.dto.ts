import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum InstantBookingDiscoveryDuration {
  THIRTY = 30,
  SIXTY = 60,
}

const normalizeCurrencyCode = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  return value.trim().toUpperCase();
};

export class ListPatientInstantBookingPractitionersDto {
  @ApiPropertyOptional({
    enum: InstantBookingDiscoveryDuration,
    description: 'Desired instant booking duration in minutes (30 or 60)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsIn([30, 60])
  duration?: InstantBookingDiscoveryDuration;

  @ApiPropertyOptional({
    description: 'Optional currency filter (EGP or USD)',
    enum: ['EGP', 'USD'],
  })
  @Transform(({ value }) => normalizeCurrencyCode(value))
  @IsOptional()
  @IsIn(['EGP', 'USD'])
  currency?: 'EGP' | 'USD';

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}
