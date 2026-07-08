import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAcademyProgramDto {
  @IsString()
  @MinLength(2)
  @MaxLength(191)
  titleAr!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(191)
  titleEn!: string;

  @IsString()
  @MinLength(1)
  descriptionAr!: string;

  @IsString()
  @MinLength(1)
  descriptionEn!: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  slug?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsString()
  @MinLength(1)
  priceEgp!: string;

  @IsString()
  @MinLength(1)
  priceUsd!: string;

  @IsOptional()
  @IsBoolean()
  registrationOpen?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  maxSeats?: number;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;
}
