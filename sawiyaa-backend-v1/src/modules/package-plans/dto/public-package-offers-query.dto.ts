import { ApiPropertyOptional } from '@nestjs/swagger';
import { SessionMode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum PackageOfferSortOption {
  RECOMMENDED = 'recommended',
  HIGHEST_RATED = 'highest_rated',
  LOWEST_PRICE = 'lowest_price',
  HIGHEST_SAVINGS = 'highest_savings',
}

export class PublicPackageOffersQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by practitioner name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by practitioner specialty ID' })
  @IsOptional()
  @IsString()
  specialtyId?: string;

  @ApiPropertyOptional({ description: 'Filter by plan session count (e.g. 4, 6, 8)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sessionCount?: number;

  @ApiPropertyOptional({
    description: 'Preferred session duration in minutes (30 or 60)',
    default: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(60)
  durationMinutes?: number;

  @ApiPropertyOptional({
    enum: [SessionMode.VIDEO],
    default: SessionMode.VIDEO,
  })
  @IsOptional()
  @IsIn([SessionMode.VIDEO])
  sessionMode?: 'VIDEO';

  @ApiPropertyOptional({
    enum: PackageOfferSortOption,
    default: PackageOfferSortOption.RECOMMENDED,
  })
  @IsOptional()
  @IsEnum(PackageOfferSortOption)
  sort?: PackageOfferSortOption;
}
