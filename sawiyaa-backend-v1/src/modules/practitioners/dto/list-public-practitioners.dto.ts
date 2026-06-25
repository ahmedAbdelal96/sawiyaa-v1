import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum PublicPractitionerSortBy {
  RECOMMENDED = 'recommended',
  RATING = 'rating',
  EXPERIENCE = 'experience',
}

export enum PublicPractitionerSessionDuration {
  THIRTY = 30,
  SIXTY = 60,
}

export enum PublicPractitionerKind {
  DOCTOR = 'doctor',
  THERAPIST = 'therapist',
}

export enum PublicPractitionerGender {
  MALE = 'male',
  FEMALE = 'female',
}

const toBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
};

/**
 * Public listing query DTO.
 * Public contract uses explicit query names:
 * search/specialtySlug/language/country/sort/page/limit and advanced discovery filters.
 * Legacy aliases (q/specialty/lang) are accepted internally for backward compatibility.
 */
export class ListPublicPractitionersDto {
  @ApiPropertyOptional({
    description:
      'Search in display name, professional title, bio, and specialty title',
  })
  @Transform(({ value, obj }) => value ?? obj?.q)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Specialty slug filter (public-safe identifier)',
  })
  @Transform(({ value, obj }) => value ?? obj?.specialty)
  @IsOptional()
  @IsString()
  @MaxLength(191)
  specialtySlug?: string;

  @ApiPropertyOptional({
    description: 'Specialty category slug filter (public-safe identifier)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  specialtyCategorySlug?: string;

  @ApiPropertyOptional({
    description: 'Language code filter (for example: ar, en)',
  })
  @Transform(({ value, obj }) => value ?? obj?.lang)
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @ApiPropertyOptional({
    description: 'Country ISO code filter (for example: EG, SA, AE)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  country?: string;

  @ApiPropertyOptional({
    enum: PublicPractitionerKind,
    description: 'High-level practitioner type grouping: doctor | therapist',
  })
  @IsOptional()
  @IsEnum(PublicPractitionerKind)
  practitionerKind?: PublicPractitionerKind;

  @ApiPropertyOptional({
    enum: PublicPractitionerGender,
    description: 'Practitioner gender filter',
  })
  @IsOptional()
  @IsEnum(PublicPractitionerGender)
  gender?: PublicPractitionerGender;

  @ApiPropertyOptional({
    enum: PublicPractitionerSessionDuration,
    description:
      'Session duration in minutes used for fee filtering (30 or 60)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsEnum(PublicPractitionerSessionDuration)
  duration?: PublicPractitionerSessionDuration;

  @ApiPropertyOptional({
    description: 'Filter practitioners currently online now',
  })
  @Transform(({ value }) => toBoolean(value))
  @IsOptional()
  @IsBoolean()
  onlineNow?: boolean;

  @ApiPropertyOptional({
    description: 'Filter practitioners with available slots today',
  })
  @Transform(({ value }) => toBoolean(value))
  @IsOptional()
  @IsBoolean()
  availableToday?: boolean;

  @ApiPropertyOptional({
    description: 'Filter practitioners with active weekly availability',
  })
  @Transform(({ value }) => toBoolean(value))
  @IsOptional()
  @IsBoolean()
  availableThisWeek?: boolean;

  @ApiPropertyOptional({
    description: 'Filter practitioners who accept discount coupons',
  })
  @Transform(({ value }) => toBoolean(value))
  @IsOptional()
  @IsBoolean()
  acceptsCoupon?: boolean;

  @ApiPropertyOptional({
    description: 'Filter practitioners who accept packages',
  })
  @Transform(({ value }) => toBoolean(value))
  @IsOptional()
  @IsBoolean()
  acceptsPackage?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum rating filter from 1 to 5',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({
    description: 'Minimum session fee filter',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minSessionFee?: number;

  @ApiPropertyOptional({
    description: 'Maximum session fee filter',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxSessionFee?: number;

  @ApiPropertyOptional({
    enum: PublicPractitionerSortBy,
    description:
      'Public listing sort baseline. recommended = rating desc, experience desc, createdAt asc.',
  })
  @IsOptional()
  @IsEnum(PublicPractitionerSortBy)
  sort?: PublicPractitionerSortBy;

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

  @ApiPropertyOptional({
    description: 'Language list filter (comma-separated ISO codes)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  languages?: string;

  // Legacy aliases accepted internally; hidden from the public API contract.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  specialty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  lang?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  langs?: string;
}
