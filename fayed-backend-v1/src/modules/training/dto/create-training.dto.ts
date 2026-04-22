import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLocale, CourseType, CourseVisibility } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { TRAINING_SLUG_REGEX } from '../types/training.types';

export class CreateTrainingDto {
  @ApiProperty({ enum: ContentLocale })
  @IsEnum(ContentLocale)
  locale!: ContentLocale;

  @ApiProperty()
  @IsString()
  @MaxLength(191)
  title!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(191)
  @Matches(TRAINING_SLUG_REGEX)
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullDescription?: string;

  @ApiProperty({ enum: CourseType })
  @IsEnum(CourseType)
  courseType!: CourseType;

  @ApiPropertyOptional({
    enum: CourseVisibility,
    default: CourseVisibility.PUBLIC,
  })
  @IsOptional()
  @IsEnum(CourseVisibility)
  visibility?: CourseVisibility;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  metaDescription?: string;
}
