import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLocale } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { SLUG_REGEX } from '../types/articles.types';

export class CreateArticleDto {
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
  @Matches(SLUG_REGEX)
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  excerpt?: string;

  @ApiProperty()
  @IsString()
  content!: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  primaryCategoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialtyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  featuredImageAlt?: string;

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
