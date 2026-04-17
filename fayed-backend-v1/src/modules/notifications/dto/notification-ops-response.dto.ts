import { ApiProperty } from '@nestjs/swagger';
import {
  DeliveryAttemptStatus,
  NotificationCategory,
  NotificationChannel,
  NotificationStatus,
} from '@prisma/client';

export class NotificationOpsAttemptItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  attemptNumber!: number;

  @ApiProperty({ enum: DeliveryAttemptStatus })
  status!: DeliveryAttemptStatus;

  @ApiProperty({ nullable: true })
  provider!: string | null;

  @ApiProperty({ nullable: true })
  errorCode!: string | null;

  @ApiProperty({ nullable: true })
  errorMessage!: string | null;

  @ApiProperty()
  attemptedAt!: string;
}

export class NotificationOpsListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: NotificationStatus })
  status!: NotificationStatus;

  @ApiProperty({ enum: NotificationChannel })
  channel!: NotificationChannel;

  @ApiProperty({ enum: NotificationCategory })
  category!: NotificationCategory;

  @ApiProperty()
  typeSlug!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ nullable: true })
  relatedEntityType!: string | null;

  @ApiProperty({ nullable: true })
  relatedEntityId!: string | null;

  @ApiProperty({ nullable: true })
  scheduledFor!: string | null;

  @ApiProperty({ nullable: true })
  sentAt!: string | null;

  @ApiProperty({ nullable: true })
  failedAt!: string | null;

  @ApiProperty({ nullable: true })
  suppressedReason!: string | null;

  @ApiProperty()
  attemptsCount!: number;

  @ApiProperty({ nullable: true })
  latestAttemptStatus!: DeliveryAttemptStatus | null;

  @ApiProperty({ nullable: true })
  latestAttemptErrorCode!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class NotificationOpsPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class NotificationOpsListDataDto {
  @ApiProperty({ type: NotificationOpsListItemDto, isArray: true })
  items!: NotificationOpsListItemDto[];

  @ApiProperty({ type: NotificationOpsPaginationDto })
  pagination!: NotificationOpsPaginationDto;
}

export class NotificationOpsListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: NotificationOpsListDataDto })
  data!: NotificationOpsListDataDto;
}

export class NotificationOpsDetailItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: NotificationStatus })
  status!: NotificationStatus;

  @ApiProperty({ enum: NotificationChannel })
  channel!: NotificationChannel;

  @ApiProperty({ enum: NotificationCategory })
  category!: NotificationCategory;

  @ApiProperty()
  typeSlug!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ nullable: true })
  locale!: string | null;

  @ApiProperty({ nullable: true })
  titleSnapshot!: string | null;

  @ApiProperty({ nullable: true })
  subjectSnapshot!: string | null;

  @ApiProperty({ nullable: true })
  bodySnapshot!: string | null;

  @ApiProperty({ nullable: true })
  relatedEntityType!: string | null;

  @ApiProperty({ nullable: true })
  relatedEntityId!: string | null;

  @ApiProperty({ nullable: true })
  scheduledFor!: string | null;

  @ApiProperty({ nullable: true })
  sentAt!: string | null;

  @ApiProperty({ nullable: true })
  failedAt!: string | null;

  @ApiProperty({ nullable: true })
  suppressedReason!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ type: NotificationOpsAttemptItemDto, isArray: true })
  attempts!: NotificationOpsAttemptItemDto[];
}

export class NotificationOpsDetailDataDto {
  @ApiProperty({ type: NotificationOpsDetailItemDto })
  item!: NotificationOpsDetailItemDto;
}

export class NotificationOpsDetailSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: NotificationOpsDetailDataDto })
  data!: NotificationOpsDetailDataDto;
}
