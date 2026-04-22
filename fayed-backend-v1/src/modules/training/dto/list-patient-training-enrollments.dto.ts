import { ApiPropertyOptional } from '@nestjs/swagger';
import { EnrollmentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import {
  TRAINING_DEFAULT_LIMIT,
  TRAINING_DEFAULT_PAGE,
} from '../types/training.types';

export class ListPatientTrainingEnrollmentsDto {
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

  @ApiPropertyOptional({ enum: EnrollmentStatus })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;
}
