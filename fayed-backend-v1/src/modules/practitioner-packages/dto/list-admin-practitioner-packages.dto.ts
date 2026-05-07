import { ApiPropertyOptional } from '@nestjs/swagger';
import { PractitionerPackageStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  PRACTITIONER_PACKAGES_DEFAULT_LIMIT,
  PRACTITIONER_PACKAGES_DEFAULT_PAGE,
  PRACTITIONER_PACKAGES_MAX_LIMIT,
} from '../types/practitioner-packages.types';

export class ListAdminPractitionerPackagesDto {
  @ApiPropertyOptional({ minimum: 1, default: PRACTITIONER_PACKAGES_DEFAULT_PAGE })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = PRACTITIONER_PACKAGES_DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: PRACTITIONER_PACKAGES_MAX_LIMIT,
    default: PRACTITIONER_PACKAGES_DEFAULT_LIMIT,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PRACTITIONER_PACKAGES_MAX_LIMIT)
  @IsOptional()
  limit?: number = PRACTITIONER_PACKAGES_DEFAULT_LIMIT;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: PractitionerPackageStatus })
  @IsOptional()
  @IsEnum(PractitionerPackageStatus)
  status?: PractitionerPackageStatus;
}
