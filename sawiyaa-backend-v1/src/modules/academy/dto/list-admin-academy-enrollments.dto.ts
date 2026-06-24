import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AcademyEnrollmentStatus } from '@prisma/client';
import {
  ACADEMY_ADMIN_DEFAULT_LIMIT,
  ACADEMY_DEFAULT_PAGE,
} from '../types/academy.types';

export class ListAdminAcademyEnrollmentsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = ACADEMY_DEFAULT_PAGE;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(40)
  limit: number = ACADEMY_ADMIN_DEFAULT_LIMIT;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(AcademyEnrollmentStatus)
  status?: AcademyEnrollmentStatus;
}
