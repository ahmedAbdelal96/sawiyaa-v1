import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLocale } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { SLUG_REGEX } from '../types/articles.types';

export class CreateArticleCategoryDto {
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

  @ApiProperty()
  @IsString()
  @MaxLength(191)
  @Matches(SLUG_REGEX)
  slugRoot!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

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

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
