import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLocale } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import {
  TRAINING_DEFAULT_LIMIT,
  TRAINING_DEFAULT_LOCALE,
  TRAINING_DEFAULT_PAGE,
} from '../types/training.types';

export class ListPublicTrainingsDto {
  @ApiPropertyOptional({ default: TRAINING_DEFAULT_PAGE, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = TRAINING_DEFAULT_PAGE;

  @ApiPropertyOptional({ default: TRAINING_DEFAULT_LIMIT, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = TRAINING_DEFAULT_LIMIT;

  @ApiPropertyOptional({
    enum: ContentLocale,
    default: TRAINING_DEFAULT_LOCALE,
  })
  @IsOptional()
  @IsEnum(ContentLocale)
  locale: ContentLocale = TRAINING_DEFAULT_LOCALE;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;
}
