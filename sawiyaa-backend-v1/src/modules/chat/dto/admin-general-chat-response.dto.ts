import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationParticipantRole, ConversationStatus, MessageStatus, MessageType } from '@prisma/client';
import {
  ADMIN_GENERAL_CHAT_CONVERSATION_STATUS_VALUES,
  ADMIN_GENERAL_CHAT_MESSAGE_PREVIEW_TYPE_VALUES,
  AdminGeneralChatConversationStatus,
  AdminGeneralChatMessagePreviewType,
} from '../types/admin-general-chat.types';

export class AdminGeneralChatPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class AdminGeneralChatAttachmentSummaryDto {
  @ApiProperty()
  fileId!: string;

  @ApiProperty()
  fileUrl!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiPropertyOptional({ nullable: true })
  fileSize!: number | null;

  @ApiPropertyOptional({ nullable: true })
  originalName!: string | null;
}

export class AdminGeneralChatLockStateDto {
  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional({ nullable: true })
  disabledAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  disabledByUserId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  disabledReason!: string | null;

  @ApiPropertyOptional({ nullable: true })
  enabledAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  enabledByUserId!: string | null;
}

export class AdminGeneralChatModerationStateDto {
  @ApiProperty({ enum: ADMIN_GENERAL_CHAT_CONVERSATION_STATUS_VALUES })
  status!: AdminGeneralChatConversationStatus;

  @ApiPropertyOptional({ nullable: true, enum: ['ADMIN', 'PRACTITIONER'] })
  closedBy!: 'ADMIN' | 'PRACTITIONER' | null;

  @ApiPropertyOptional({ nullable: true })
  closedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  closeReason!: string | null;
}

export class AdminGeneralChatUserSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  displayName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;
}

export class AdminGeneralChatSessionSummaryDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  sessionCode!: string;

  @ApiPropertyOptional({ nullable: true })
  sessionDateTime!: string | null;

  @ApiProperty({ enum: ConversationStatus })
  status!: ConversationStatus;
}

export class AdminGeneralChatConversationListItemDto {
  @ApiProperty()
  conversationId!: string;

  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  sessionCode!: string;

  @ApiPropertyOptional({ nullable: true })
  patientName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  patientEmail!: string | null;

  @ApiPropertyOptional({ nullable: true })
  practitionerName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  practitionerEmail!: string | null;

  @ApiPropertyOptional({ nullable: true })
  sessionDateTime!: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastMessageAt!: string | null;

  @ApiProperty({ enum: ADMIN_GENERAL_CHAT_MESSAGE_PREVIEW_TYPE_VALUES })
  lastMessagePreviewType!: AdminGeneralChatMessagePreviewType;

  @ApiProperty()
  messagesCount!: number;

  @ApiProperty()
  attachmentsCount!: number;

  @ApiProperty({ enum: ADMIN_GENERAL_CHAT_CONVERSATION_STATUS_VALUES })
  status!: AdminGeneralChatConversationStatus;

  @ApiProperty()
  canSendMessage!: boolean;

  @ApiPropertyOptional({ nullable: true, enum: ['ADMIN', 'PRACTITIONER'] })
  closedBy!: 'ADMIN' | 'PRACTITIONER' | null;

  @ApiPropertyOptional({ nullable: true })
  closedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  closeReason!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AdminGeneralChatConversationDetailDto {
  @ApiProperty()
  conversationId!: string;

  @ApiProperty({ enum: ConversationStatus })
  conversationStatus!: ConversationStatus;

  @ApiProperty({ enum: ADMIN_GENERAL_CHAT_CONVERSATION_STATUS_VALUES })
  status!: AdminGeneralChatConversationStatus;

  @ApiProperty()
  canSendMessage!: boolean;

  @ApiProperty()
  messagesCount!: number;

  @ApiProperty()
  attachmentsCount!: number;

  @ApiProperty({ type: AdminGeneralChatUserSummaryDto })
  patient!: AdminGeneralChatUserSummaryDto;

  @ApiProperty({ type: AdminGeneralChatUserSummaryDto })
  practitioner!: AdminGeneralChatUserSummaryDto;

  @ApiProperty({ type: AdminGeneralChatSessionSummaryDto })
  session!: AdminGeneralChatSessionSummaryDto;

  @ApiProperty({ type: AdminGeneralChatModerationStateDto })
  moderationState!: AdminGeneralChatModerationStateDto;

  @ApiProperty({ type: AdminGeneralChatLockStateDto })
  adminLockState!: AdminGeneralChatLockStateDto;

  @ApiProperty({ type: AdminGeneralChatLockStateDto })
  practitionerLockState!: AdminGeneralChatLockStateDto;

  @ApiPropertyOptional({ nullable: true })
  lastMessageAt!: string | null;

  @ApiProperty({ enum: ADMIN_GENERAL_CHAT_MESSAGE_PREVIEW_TYPE_VALUES })
  lastMessagePreviewType!: AdminGeneralChatMessagePreviewType;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AdminGeneralChatMessageDto {
  @ApiProperty()
  messageId!: string;

  @ApiProperty({ enum: ConversationParticipantRole })
  senderRole!: ConversationParticipantRole;

  @ApiPropertyOptional({ nullable: true })
  senderName!: string | null;

  @ApiProperty()
  sentAt!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ enum: MessageType })
  messageType!: MessageType;

  @ApiProperty({ enum: MessageStatus })
  status!: MessageStatus;

  @ApiProperty({ type: AdminGeneralChatAttachmentSummaryDto, isArray: true })
  attachments!: AdminGeneralChatAttachmentSummaryDto[];

  @ApiPropertyOptional({ nullable: true })
  deletedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  editedAt!: string | null;
}

export class AdminGeneralChatConversationListDataDto {
  @ApiProperty({ type: AdminGeneralChatConversationListItemDto, isArray: true })
  items!: AdminGeneralChatConversationListItemDto[];

  @ApiProperty({ type: AdminGeneralChatPaginationDto })
  pagination!: AdminGeneralChatPaginationDto;
}

export class AdminGeneralChatConversationDetailDataDto {
  @ApiProperty({ type: AdminGeneralChatConversationDetailDto })
  item!: AdminGeneralChatConversationDetailDto;
}

export class AdminGeneralChatMessageListDataDto {
  @ApiProperty({ type: AdminGeneralChatMessageDto, isArray: true })
  items!: AdminGeneralChatMessageDto[];

  @ApiProperty({ type: AdminGeneralChatPaginationDto })
  pagination!: AdminGeneralChatPaginationDto;
}

export class AdminGeneralChatConversationListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminGeneralChatConversationListDataDto })
  data!: AdminGeneralChatConversationListDataDto;
}

export class AdminGeneralChatConversationDetailSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminGeneralChatConversationDetailDataDto })
  data!: AdminGeneralChatConversationDetailDataDto;
}

export class AdminGeneralChatMessageListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminGeneralChatMessageListDataDto })
  data!: AdminGeneralChatMessageListDataDto;
}

