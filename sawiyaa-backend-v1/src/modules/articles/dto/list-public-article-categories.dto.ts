import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLocale } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class ListPublicArticleCategoriesDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 20;

  @ApiPropertyOptional({ enum: ContentLocale, default: ContentLocale.ar })
  @IsOptional()
  @IsEnum(ContentLocale)
  locale: ContentLocale = ContentLocale.ar;
}
