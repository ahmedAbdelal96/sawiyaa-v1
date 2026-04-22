import { ApiProperty } from '@nestjs/swagger';
import { NotificationCategory, NotificationStatus, UserRoleType } from '@prisma/client';
import { AdminAuditSeverity, AdminAuditSource } from './list-admin-audit-events.dto';

export class AdminAuditPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class AdminAuditActorDto {
  @ApiProperty({ nullable: true })
  userId!: string | null;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true, enum: UserRoleType })
  role!: UserRoleType | null;
}

export class AdminAuditTargetDto {
  @ApiProperty({ nullable: true })
  entityType!: string | null;

  @ApiProperty({ nullable: true })
  entityId!: string | null;
}

export class AdminAuditListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  eventFamily!: string;

  @ApiProperty({ enum: NotificationCategory })
  category!: NotificationCategory;

  @ApiProperty({ enum: AdminAuditSeverity })
  severity!: AdminAuditSeverity;

  @ApiProperty({ enum: AdminAuditSource })
  source!: AdminAuditSource;

  @ApiProperty({ enum: NotificationStatus })
  status!: NotificationStatus;

  @ApiProperty()
  occurredAt!: string;

  @ApiProperty({ type: AdminAuditActorDto })
  actor!: AdminAuditActorDto;

  @ApiProperty({ type: AdminAuditTargetDto })
  target!: AdminAuditTargetDto;
}

export class AdminAuditListDataDto {
  @ApiProperty({ type: AdminAuditListItemDto, isArray: true })
  items!: AdminAuditListItemDto[];

  @ApiProperty({ type: AdminAuditPaginationDto })
  pagination!: AdminAuditPaginationDto;
}

export class AdminAuditListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminAuditListDataDto })
  data!: AdminAuditListDataDto;
}

export class AdminAuditDetailItemDto extends AdminAuditListItemDto {
  @ApiProperty({ nullable: true })
  titleSnapshot!: string | null;

  @ApiProperty({ nullable: true })
  subjectSnapshot!: string | null;

  @ApiProperty({ nullable: true })
  bodySnapshot!: string | null;

  @ApiProperty({ nullable: true })
  suppressedReason!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AdminAuditDetailDataDto {
  @ApiProperty({ type: AdminAuditDetailItemDto })
  item!: AdminAuditDetailItemDto;
}

export class AdminAuditDetailSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminAuditDetailDataDto })
  data!: AdminAuditDetailDataDto;
}
