import { ApiPropertyOptional } from '@nestjs/swagger';
import { PractitionerApplicationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AdminPractitionerApplicationKind } from '../types/practitioner-applications-admin.types';
import { AdminPractitionerApplicationListView } from '../types/practitioner-applications-admin.types';

/**
 * Query DTO for admin list endpoint.
 * Phase 1 keeps filtering/pagination lightweight and deterministic.
 */
export class ListPractitionerApplicationsDto {
  @ApiPropertyOptional({
    enum: AdminPractitionerApplicationListView,
    description: 'Optional list view for active queue or history',
  })
  @IsOptional()
  @IsEnum(AdminPractitionerApplicationListView)
  view?: AdminPractitionerApplicationListView;

  @ApiPropertyOptional({
    enum: AdminPractitionerApplicationKind,
    description: 'Optional kind filter for new applications or edit requests',
  })
  @IsOptional()
  @IsEnum(AdminPractitionerApplicationKind)
  kind?: AdminPractitionerApplicationKind;

  @ApiPropertyOptional({
    enum: PractitionerApplicationStatus,
    description: 'Optional status filter for practitioner applications',
  })
  @IsOptional()
  @IsEnum(PractitionerApplicationStatus)
  status?: PractitionerApplicationStatus;

  @ApiPropertyOptional({
    description: 'Optional display-name search term',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
