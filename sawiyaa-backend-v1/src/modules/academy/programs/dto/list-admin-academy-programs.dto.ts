import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AcademyProgramStatus } from '@prisma/client';

export class ListAdminAcademyProgramsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 12;

  @IsOptional()
  @IsEnum(AcademyProgramStatus)
  status?: AcademyProgramStatus;

  @IsOptional()
  @IsString()
  q?: string;
}
