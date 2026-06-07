import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PractitionerMarketingPlacementReason,
  PractitionerMarketingPlacementStatus,
  PractitionerMarketingPlacementSurface,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ListFeaturedPractitionersPlacementsDto {
  @ApiPropertyOptional({ enum: PractitionerMarketingPlacementStatus })
  @IsOptional()
  @IsEnum(PractitionerMarketingPlacementStatus)
  status?: PractitionerMarketingPlacementStatus;

  @ApiPropertyOptional({ enum: PractitionerMarketingPlacementSurface })
  @IsOptional()
  @IsEnum(PractitionerMarketingPlacementSurface)
  surface?: PractitionerMarketingPlacementSurface;

  @ApiPropertyOptional({ enum: PractitionerMarketingPlacementReason })
  @IsOptional()
  @IsEnum(PractitionerMarketingPlacementReason)
  reason?: PractitionerMarketingPlacementReason;

  @ApiPropertyOptional({
    description: 'Search by practitioner display name, title, or slug',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  practitionerSearch?: string;

  @ApiPropertyOptional({ description: 'Filter placements starting from date' })
  @IsOptional()
  @IsDateString()
  startsFrom?: string;

  @ApiPropertyOptional({ description: 'Filter placements ending to date' })
  @IsOptional()
  @IsDateString()
  endsTo?: string;

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
}

export class CreateFeaturedPractitionerPlacementDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  practitionerId: string;

  @ApiProperty({ enum: PractitionerMarketingPlacementSurface })
  @IsEnum(PractitionerMarketingPlacementSurface)
  surface: PractitionerMarketingPlacementSurface;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  startsAt: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ minimum: 1, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  priority?: number;

  @ApiPropertyOptional({ default: 'مميز' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  badgeLabelAr?: string;

  @ApiPropertyOptional({ default: 'Featured' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  badgeLabelEn?: string;

  @ApiPropertyOptional({ enum: PractitionerMarketingPlacementReason })
  @IsOptional()
  @IsEnum(PractitionerMarketingPlacementReason)
  reason?: PractitionerMarketingPlacementReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  campaignName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notesInternal?: string;

  @ApiPropertyOptional({ enum: PractitionerMarketingPlacementStatus })
  @IsOptional()
  @IsEnum(PractitionerMarketingPlacementStatus)
  status?: PractitionerMarketingPlacementStatus;
}

export class UpdateFeaturedPractitionerPlacementDto {
  @ApiPropertyOptional({ enum: PractitionerMarketingPlacementSurface })
  @IsOptional()
  @IsEnum(PractitionerMarketingPlacementSurface)
  surface?: PractitionerMarketingPlacementSurface;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  priority?: number;

  @ApiPropertyOptional({ default: 'مميز' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  badgeLabelAr?: string;

  @ApiPropertyOptional({ default: 'Featured' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  badgeLabelEn?: string;

  @ApiPropertyOptional({ enum: PractitionerMarketingPlacementReason })
  @IsOptional()
  @IsEnum(PractitionerMarketingPlacementReason)
  reason?: PractitionerMarketingPlacementReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  campaignName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notesInternal?: string;

  @ApiPropertyOptional({ enum: PractitionerMarketingPlacementStatus })
  @IsOptional()
  @IsEnum(PractitionerMarketingPlacementStatus)
  status?: PractitionerMarketingPlacementStatus;
}

export class PlacementActionNoteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
