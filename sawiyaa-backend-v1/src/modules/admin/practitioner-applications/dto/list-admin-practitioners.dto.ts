import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
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

export enum AdminPractitionerSortByDto {
  RECOMMENDED = 'recommended',
  RATING = 'rating',
  EXPERIENCE = 'experience',
  NEWEST = 'newest',
  OLDEST = 'oldest',
}

export enum AdminPractitionerKindDto {
  DOCTOR = 'doctor',
  THERAPIST = 'therapist',
}

export enum AdminPractitionerGenderDto {
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
 * Admin practitioner directory query contract.
 * This intentionally does not enforce public-profile completeness.
 */
export class ListAdminPractitionersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: AdminPractitionerKindDto })
  @IsOptional()
  @IsEnum(AdminPractitionerKindDto)
  practitionerKind?: AdminPractitionerKindDto;

  @ApiPropertyOptional({ enum: AdminPractitionerGenderDto })
  @IsOptional()
  @IsEnum(AdminPractitionerGenderDto)
  gender?: AdminPractitionerGenderDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3)
  country?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsOptional()
  @IsBoolean()
  onlineNow?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ enum: AdminPractitionerSortByDto })
  @IsOptional()
  @IsEnum(AdminPractitionerSortByDto)
  sort?: AdminPractitionerSortByDto;

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
