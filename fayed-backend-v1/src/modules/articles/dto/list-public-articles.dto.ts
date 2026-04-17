import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLocale } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ARTICLE_DEFAULT_LIMIT, ARTICLE_DEFAULT_PAGE } from '../types/articles.types';

export class ListPublicArticlesDto {
  @ApiPropertyOptional({ default: ARTICLE_DEFAULT_PAGE, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = ARTICLE_DEFAULT_PAGE;

  @ApiPropertyOptional({ default: ARTICLE_DEFAULT_LIMIT, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = ARTICLE_DEFAULT_LIMIT;

  @ApiPropertyOptional({ enum: ContentLocale, default: ContentLocale.ar })
  @IsOptional()
  @IsEnum(ContentLocale)
  locale: ContentLocale = ContentLocale.ar;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;
}
