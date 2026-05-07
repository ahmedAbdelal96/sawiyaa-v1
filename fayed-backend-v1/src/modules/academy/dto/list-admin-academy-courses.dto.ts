import { Type } from 'class-transformer';
import { CourseStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  ACADEMY_ADMIN_DEFAULT_LIMIT,
  ACADEMY_DEFAULT_PAGE,
} from '../types/academy.types';

export class ListAdminAcademyCoursesDto {
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
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @IsOptional()
  @IsString()
  q?: string;
}
