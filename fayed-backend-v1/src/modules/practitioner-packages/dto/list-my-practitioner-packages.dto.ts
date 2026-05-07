import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  PRACTITIONER_PACKAGES_DEFAULT_LIMIT,
  PRACTITIONER_PACKAGES_DEFAULT_PAGE,
  PRACTITIONER_PACKAGES_MAX_LIMIT,
} from '../types/practitioner-packages.types';

export class ListMyPractitionerPackagesDto {
  @ApiPropertyOptional({ minimum: 1, default: PRACTITIONER_PACKAGES_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = PRACTITIONER_PACKAGES_DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: PRACTITIONER_PACKAGES_MAX_LIMIT,
    default: PRACTITIONER_PACKAGES_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PRACTITIONER_PACKAGES_MAX_LIMIT)
  limit?: number = PRACTITIONER_PACKAGES_DEFAULT_LIMIT;
}
