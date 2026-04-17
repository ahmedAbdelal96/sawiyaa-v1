import { ApiProperty } from '@nestjs/swagger';
import {
  ModerationCaseActionType,
  ModerationCaseStatus,
  ModerationReportReason,
  ModerationReportTargetType,
  ModerationReporterRole,
} from '@prisma/client';
import {
  ModerationReportsSortByDto,
  ModerationReportsSortOrderDto,
} from './list-moderation-cases.dto';

export class ModerationReportItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ModerationReportTargetType })
  targetType!: ModerationReportTargetType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty({ enum: ModerationReportReason })
  reason!: ModerationReportReason;

  @ApiProperty({ nullable: true })
  note!: string | null;

  @ApiProperty({ enum: ModerationCaseStatus })
  status!: ModerationCaseStatus;

  @ApiProperty()
  createdAt!: string;
}

export class ModerationReportItemDataDto {
  @ApiProperty({ type: ModerationReportItemDto })
  item!: ModerationReportItemDto;
}

export class ModerationReportItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: ModerationReportItemDataDto })
  data!: ModerationReportItemDataDto;
}

export class ModerationTargetSnapshotDto {
  @ApiProperty()
  kind!: string;

  @ApiProperty({
    description: 'Surface-specific safe context for reviewer triage',
    additionalProperties: true,
  })
  context!: Record<string, unknown>;
}

export class ModerationQueueItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ModerationReportTargetType })
  targetType!: ModerationReportTargetType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty({ enum: ModerationReportReason })
  reason!: ModerationReportReason;

  @ApiProperty({ enum: ModerationCaseStatus })
  status!: ModerationCaseStatus;

  @ApiProperty({ enum: ModerationReporterRole })
  reporterRole!: ModerationReporterRole;

  @ApiProperty({ nullable: true })
  lastActionAt!: string | null;

  @ApiProperty({ type: ModerationTargetSnapshotDto, nullable: true })
  targetSnapshot!: ModerationTargetSnapshotDto | null;

  @ApiProperty()
  createdAt!: string;
}

export class ModerationCaseDetailDto extends ModerationQueueItemDto {
  @ApiProperty({ nullable: true })
  reporterUserId!: string | null;

  @ApiProperty({ nullable: true })
  note!: string | null;
}

export class ModerationPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class ModerationQueueFiltersDto {
  @ApiProperty({ enum: ModerationReportsSortByDto })
  sortBy!: ModerationReportsSortByDto;

  @ApiProperty({ enum: ModerationReportsSortOrderDto })
  sortOrder!: ModerationReportsSortOrderDto;

  @ApiProperty({ enum: ModerationCaseStatus, nullable: true })
  status!: ModerationCaseStatus | null;

  @ApiProperty({ enum: ModerationReportTargetType, nullable: true })
  targetType!: ModerationReportTargetType | null;

  @ApiProperty({ enum: ModerationReporterRole, nullable: true })
  reporterRole!: ModerationReporterRole | null;

  @ApiProperty({ enum: ModerationReportReason, nullable: true })
  reason!: ModerationReportReason | null;

  @ApiProperty({ nullable: true })
  createdFrom!: string | null;

  @ApiProperty({ nullable: true })
  createdTo!: string | null;

  @ApiProperty({ nullable: true })
  query!: string | null;
}

export class ModerationQueueDataDto {
  @ApiProperty({ type: ModerationQueueItemDto, isArray: true })
  items!: ModerationQueueItemDto[];

  @ApiProperty({ type: ModerationPaginationDto })
  pagination!: ModerationPaginationDto;

  @ApiProperty({ type: ModerationQueueFiltersDto })
  filters!: ModerationQueueFiltersDto;
}

export class ModerationCaseDetailDataDto {
  @ApiProperty({ type: ModerationCaseDetailDto })
  item!: ModerationCaseDetailDto;
}

export class ModerationQueueSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: ModerationQueueDataDto })
  data!: ModerationQueueDataDto;
}

export class ModerationCaseDetailSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: ModerationCaseDetailDataDto })
  data!: ModerationCaseDetailDataDto;
}

export class ModerationActionExecutionDto {
  @ApiProperty()
  actionId!: string;

  @ApiProperty({ enum: ModerationCaseActionType })
  action!: ModerationCaseActionType;

  @ApiProperty({ enum: ModerationCaseStatus })
  previousStatus!: ModerationCaseStatus;

  @ApiProperty({ enum: ModerationCaseStatus })
  nextStatus!: ModerationCaseStatus;

  @ApiProperty({ nullable: true })
  reason!: string | null;

  @ApiProperty({ nullable: true })
  note!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class ModerationActionExecutionDataDto {
  @ApiProperty({ type: ModerationCaseDetailDto })
  item!: ModerationCaseDetailDto;

  @ApiProperty({ type: ModerationActionExecutionDto })
  actionExecution!: ModerationActionExecutionDto;
}

export class ModerationActionExecutionSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: ModerationActionExecutionDataDto })
  data!: ModerationActionExecutionDataDto;
}
