import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationCategory } from '@prisma/client';

export class UserNotificationActionDto {
  @ApiProperty({ example: 'INTERNAL_LINK' })
  type!: 'INTERNAL_LINK';

  @ApiProperty()
  href!: string;

  @ApiPropertyOptional({ nullable: true })
  label!: string | null;
}

export class UserNotificationFeedItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  typeSlug!: string;

  @ApiProperty({ nullable: true, enum: NotificationCategory })
  category!: NotificationCategory | null;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ nullable: true })
  readAt!: string | null;

  @ApiProperty({ type: UserNotificationActionDto, nullable: true })
  action!: UserNotificationActionDto | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  payload!: Record<string, unknown>;
}

export class UserNotificationPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  hasNextPage!: boolean;

  @ApiProperty({ nullable: true })
  nextPage!: number | null;
}

export class UserNotificationFeedDataDto {
  @ApiProperty({ type: UserNotificationFeedItemDto, isArray: true })
  items!: UserNotificationFeedItemDto[];

  @ApiProperty({ type: UserNotificationPaginationDto })
  pagination!: UserNotificationPaginationDto;
}

export class UserNotificationFeedSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: UserNotificationFeedDataDto })
  data!: UserNotificationFeedDataDto;
}

export class UserUnreadNotificationCountItemDto {
  @ApiProperty()
  unreadCount!: number;
}

export class UserUnreadNotificationCountDataDto {
  @ApiProperty({ type: UserUnreadNotificationCountItemDto })
  item!: UserUnreadNotificationCountItemDto;
}

export class UserUnreadNotificationCountSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: UserUnreadNotificationCountDataDto })
  data!: UserUnreadNotificationCountDataDto;
}

export class UserNotificationReadDataDto {
  @ApiProperty({ type: UserNotificationFeedItemDto })
  item!: UserNotificationFeedItemDto;
}

export class UserNotificationReadSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: UserNotificationReadDataDto })
  data!: UserNotificationReadDataDto;
}

export class UserNotificationBulkReadItemDto {
  @ApiProperty()
  updatedCount!: number;
}

export class UserNotificationBulkReadDataDto {
  @ApiProperty({ type: UserNotificationBulkReadItemDto })
  item!: UserNotificationBulkReadItemDto;
}

export class UserNotificationBulkReadSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: UserNotificationBulkReadDataDto })
  data!: UserNotificationBulkReadDataDto;
}
