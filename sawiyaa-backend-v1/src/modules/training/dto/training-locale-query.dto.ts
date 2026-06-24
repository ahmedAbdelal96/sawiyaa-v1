import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLocale } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { TRAINING_DEFAULT_LOCALE } from '../types/training.types';

export class TrainingLocaleQueryDto {
  @ApiPropertyOptional({
    enum: ContentLocale,
    default: TRAINING_DEFAULT_LOCALE,
  })
  @IsOptional()
  @IsEnum(ContentLocale)
  locale: ContentLocale = TRAINING_DEFAULT_LOCALE;
}
