import { ApiProperty } from '@nestjs/swagger';
import {
  ChatApprovalStatus,
  ConversationParticipantRole,
  ConversationStatus,
} from '@prisma/client';
import {
  CARE_CHAT_ACTIVITY_STATE_VALUES,
  CARE_CHAT_REQUEST_DECISION_VALUES,
  CareChatActivityState,
  CareChatRequestDecision,
} from '../types/care-chat.types';

export class CareChatParticipantSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;
}

export class CareChatRequestItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ChatApprovalStatus })
  status!: ChatApprovalStatus;

  @ApiProperty({ nullable: true })
  reason!: string | null;

  @ApiProperty({ nullable: true })
  relatedSessionId!: string | null;

  @ApiProperty({ nullable: true })
  linkedConversationId!: string | null;

  @ApiProperty()
  requestedAt!: string;

  @ApiProperty({ nullable: true })
  reviewedAt!: string | null;

  @ApiProperty({ nullable: true })
  approvedAt!: string | null;

  @ApiProperty({ nullable: true })
  rejectedAt!: string | null;

  @ApiProperty({ nullable: true })
  expiresAt!: string | null;

  @ApiProperty({ nullable: true })
  revokedAt!: string | null;

  @ApiProperty({ type: CareChatParticipantSummaryDto })
  patient!: CareChatParticipantSummaryDto;

  @ApiProperty({ type: CareChatParticipantSummaryDto })
  practitioner!: CareChatParticipantSummaryDto;
}

export class AdminCareChatRequestItemDto extends CareChatRequestItemDto {
  @ApiProperty({ nullable: true })
  internalReviewNote!: string | null;
}

export class CareChatMessageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ConversationParticipantRole })
  senderRole!: ConversationParticipantRole;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ nullable: true })
  readAt!: string | null;
}

export class CareChatConversationDetailsDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ConversationStatus })
  status!: ConversationStatus;

  @ApiProperty({ enum: CARE_CHAT_ACTIVITY_STATE_VALUES })
  activityState!: CareChatActivityState;

  @ApiProperty()
  canSendMessage!: boolean;

  @ApiProperty({ nullable: true })
  linkedRequestId!: string | null;

  @ApiProperty({ nullable: true })
  relatedSessionId!: string | null;

  @ApiProperty({ nullable: true })
  expiresAt!: string | null;

  @ApiProperty({ nullable: true })
  closedAt!: string | null;

  @ApiProperty({ type: CareChatParticipantSummaryDto })
  patient!: CareChatParticipantSummaryDto;

  @ApiProperty({ type: CareChatParticipantSummaryDto })
  practitioner!: CareChatParticipantSummaryDto;

  @ApiProperty({ type: CareChatMessageDto, isArray: true })
  messages!: CareChatMessageDto[];
}

export class CareChatRequestPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class CareChatRequestItemDataDto {
  @ApiProperty({ type: CareChatRequestItemDto })
  item!: CareChatRequestItemDto;
}

export class CareChatRequestListDataDto {
  @ApiProperty({ type: CareChatRequestItemDto, isArray: true })
  items!: CareChatRequestItemDto[];

  @ApiProperty({ type: CareChatRequestPaginationDto })
  pagination!: CareChatRequestPaginationDto;
}

export class CareChatConversationDataDto {
  @ApiProperty({ type: CareChatConversationDetailsDto })
  item!: CareChatConversationDetailsDto;
}

export class CareChatDecisionResultDataDto {
  @ApiProperty({ enum: CARE_CHAT_REQUEST_DECISION_VALUES })
  decision!: CareChatRequestDecision;

  @ApiProperty({ type: AdminCareChatRequestItemDto })
  item!: AdminCareChatRequestItemDto;
}

export class CareChatMessageResultDataDto {
  @ApiProperty({ type: CareChatConversationDetailsDto })
  item!: CareChatConversationDetailsDto;
}

export class CareChatRequestItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: CareChatRequestItemDataDto })
  data!: CareChatRequestItemDataDto;
}

export class CareChatRequestListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: CareChatRequestListDataDto })
  data!: CareChatRequestListDataDto;
}

export class CareChatConversationSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: CareChatConversationDataDto })
  data!: CareChatConversationDataDto;
}

export class CareChatDecisionSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: CareChatDecisionResultDataDto })
  data!: CareChatDecisionResultDataDto;
}

export class AdminCareChatRequestItemDataDto {
  @ApiProperty({ type: AdminCareChatRequestItemDto })
  item!: AdminCareChatRequestItemDto;
}

export class AdminCareChatRequestListDataDto {
  @ApiProperty({ type: AdminCareChatRequestItemDto, isArray: true })
  items!: AdminCareChatRequestItemDto[];

  @ApiProperty({ type: CareChatRequestPaginationDto })
  pagination!: CareChatRequestPaginationDto;
}

export class AdminCareChatRequestItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminCareChatRequestItemDataDto })
  data!: AdminCareChatRequestItemDataDto;
}

export class AdminCareChatRequestListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminCareChatRequestListDataDto })
  data!: AdminCareChatRequestListDataDto;
}

export class CareChatMessageSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: CareChatMessageResultDataDto })
  data!: CareChatMessageResultDataDto;
}
