import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  ACADEMY_DEFAULT_LIMIT,
  ACADEMY_DEFAULT_PAGE,
} from '../types/academy.types';

export class ListPublicAcademyCoursesDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = ACADEMY_DEFAULT_PAGE;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(40)
  limit: number = ACADEMY_DEFAULT_LIMIT;

  @IsOptional()
  @IsString()
  q?: string;
}
