import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLocale } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class GetPublicPractitionerTrustBlockDto {
  @ApiPropertyOptional({ enum: ContentLocale, default: ContentLocale.ar })
  @IsOptional()
  @IsEnum(ContentLocale)
  locale: ContentLocale = ContentLocale.ar;

  @ApiPropertyOptional({ default: 3, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  reviewLimit: number = 3;

  @ApiPropertyOptional({ default: 3, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  contentLimit: number = 3;
}
