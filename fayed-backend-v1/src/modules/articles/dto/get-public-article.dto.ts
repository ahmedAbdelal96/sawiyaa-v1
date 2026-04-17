import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLocale } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class GetPublicArticleDto {
  @ApiPropertyOptional({ enum: ContentLocale, default: ContentLocale.ar })
  @IsOptional()
  @IsEnum(ContentLocale)
  locale: ContentLocale = ContentLocale.ar;
}
