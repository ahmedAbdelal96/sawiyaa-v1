import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ModerationCaseStatus,
  ModerationReportReason,
  ModerationReportTargetType,
  ModerationReporterRole,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum ModerationReportsSortByDto {
  CREATED_AT = 'CREATED_AT',
}

export enum ModerationReportsSortOrderDto {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class ListModerationCasesDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 20;

  @ApiPropertyOptional({ enum: ModerationCaseStatus })
  @IsOptional()
  @IsEnum(ModerationCaseStatus)
  status?: ModerationCaseStatus;

  @ApiPropertyOptional({ enum: ModerationReportTargetType })
  @IsOptional()
  @IsEnum(ModerationReportTargetType)
  targetType?: ModerationReportTargetType;

  @ApiPropertyOptional({ enum: ModerationReporterRole })
  @IsOptional()
  @IsEnum(ModerationReporterRole)
  reporterRole?: ModerationReporterRole;

  @ApiPropertyOptional({ enum: ModerationReportReason })
  @IsOptional()
  @IsEnum(ModerationReportReason)
  reason?: ModerationReportReason;

  @ApiPropertyOptional({
    description: 'Include cases created at/after this ISO datetime',
  })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({
    description: 'Include cases created at/before this ISO datetime',
  })
  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @ApiPropertyOptional({
    enum: ModerationReportsSortByDto,
    default: ModerationReportsSortByDto.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(ModerationReportsSortByDto)
  sortBy: ModerationReportsSortByDto = ModerationReportsSortByDto.CREATED_AT;

  @ApiPropertyOptional({
    enum: ModerationReportsSortOrderDto,
    default: ModerationReportsSortOrderDto.DESC,
  })
  @IsOptional()
  @IsEnum(ModerationReportsSortOrderDto)
  sortOrder: ModerationReportsSortOrderDto = ModerationReportsSortOrderDto.DESC;

  @ApiPropertyOptional({
    description:
      'Triage text query baseline. Slice 1 freezes contract; deterministic query matching is implemented in rollout depth slice 2.',
  })
  @IsOptional()
  @IsString()
  query?: string;
}
