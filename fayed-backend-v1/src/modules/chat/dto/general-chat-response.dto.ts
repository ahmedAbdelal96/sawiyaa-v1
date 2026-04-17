import { ApiProperty } from '@nestjs/swagger';
import {
  ConversationParticipantRole,
  MessageType,
  ModerationCaseStatus,
  ModerationReportReason,
  ModerationReportTargetType,
} from '@prisma/client';

export class GeneralChatParticipantSummaryDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: ConversationParticipantRole })
  role!: ConversationParticipantRole;
}

export class GeneralChatLatestMessageSummaryDto {
  @ApiProperty()
  messageId!: string;

  @ApiProperty({ nullable: true })
  senderUserId!: string | null;

  @ApiProperty({ enum: MessageType })
  messageType!: MessageType;

  @ApiProperty({ nullable: true })
  previewText!: string | null;

  @ApiProperty()
  sentAt!: string;
}

export class GeneralChatConversationListItemDto {
  @ApiProperty()
  conversationId!: string;

  @ApiProperty()
  conversationRef!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  linkedSessionId!: string | null;

  @ApiProperty({ type: GeneralChatParticipantSummaryDto, isArray: true })
  participants!: GeneralChatParticipantSummaryDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  latestActivityAt!: string;

  @ApiProperty({ type: GeneralChatLatestMessageSummaryDto, nullable: true })
  latestMessage!: GeneralChatLatestMessageSummaryDto | null;

  @ApiProperty()
  unreadCount!: number;

  @ApiProperty()
  hasUnread!: boolean;

  @ApiProperty({ nullable: true })
  lastReadMessageId!: string | null;

  @ApiProperty({ nullable: true })
  lastReadAt!: string | null;
}

export class GeneralChatConversationDetailItemDto
  extends GeneralChatConversationListItemDto {
  @ApiProperty()
  hasMessages!: boolean;
}

export class GeneralChatPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class GeneralChatConversationListDataDto {
  @ApiProperty({ type: GeneralChatConversationListItemDto, isArray: true })
  items!: GeneralChatConversationListItemDto[];

  @ApiProperty({ type: GeneralChatPaginationDto })
  pagination!: GeneralChatPaginationDto;
}

export class GeneralChatConversationDetailDataDto {
  @ApiProperty({ type: GeneralChatConversationDetailItemDto })
  item!: GeneralChatConversationDetailItemDto;
}

export class GeneralChatMessageAttachmentDto {
  @ApiProperty()
  fileId!: string;

  @ApiProperty()
  fileUrl!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty({ nullable: true })
  fileSize!: number | null;

  @ApiProperty({ nullable: true })
  originalName!: string | null;
}

export class GeneralChatMessageItemDto {
  @ApiProperty()
  messageId!: string;

  @ApiProperty()
  conversationId!: string;

  @ApiProperty({ nullable: true })
  senderUserId!: string | null;

  @ApiProperty({ enum: MessageType })
  messageType!: MessageType;

  @ApiProperty({ nullable: true })
  contentText!: string | null;

  @ApiProperty()
  sentAt!: string;

  @ApiProperty({ type: GeneralChatMessageAttachmentDto, isArray: true })
  attachments!: GeneralChatMessageAttachmentDto[];

  @ApiProperty()
  conversationLatestActivityAt!: string;
}

export class GeneralChatMessageDataDto {
  @ApiProperty({ type: GeneralChatMessageItemDto })
  item!: GeneralChatMessageItemDto;
}

export class GeneralChatConversationReadStateItemDto {
  @ApiProperty()
  conversationId!: string;

  @ApiProperty({ nullable: true })
  lastReadMessageId!: string | null;

  @ApiProperty({ nullable: true })
  lastReadAt!: string | null;

  @ApiProperty()
  unreadCount!: number;

  @ApiProperty()
  hasUnread!: boolean;
}

export class GeneralChatConversationReadStateDataDto {
  @ApiProperty({ type: GeneralChatConversationReadStateItemDto })
  item!: GeneralChatConversationReadStateItemDto;
}

export class GeneralChatConversationListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: GeneralChatConversationListDataDto })
  data!: GeneralChatConversationListDataDto;
}

export class GeneralChatConversationDetailSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: GeneralChatConversationDetailDataDto })
  data!: GeneralChatConversationDetailDataDto;
}

export class GeneralChatMessageSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: GeneralChatMessageDataDto })
  data!: GeneralChatMessageDataDto;
}

export class GeneralChatConversationReadStateSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: GeneralChatConversationReadStateDataDto })
  data!: GeneralChatConversationReadStateDataDto;
}

export class GeneralChatModerationReportItemDto {
  @ApiProperty()
  reportId!: string;

  @ApiProperty({ enum: ModerationReportTargetType })
  targetType!: ModerationReportTargetType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty({ enum: ModerationReportReason })
  reason!: ModerationReportReason;

  @ApiProperty({ enum: ModerationCaseStatus })
  status!: ModerationCaseStatus;

  @ApiProperty()
  createdAt!: string;
}

export class GeneralChatModerationReportDataDto {
  @ApiProperty({ type: GeneralChatModerationReportItemDto })
  item!: GeneralChatModerationReportItemDto;
}

export class GeneralChatModerationReportSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: GeneralChatModerationReportDataDto })
  data!: GeneralChatModerationReportDataDto;
}
