import { ApiProperty } from '@nestjs/swagger';
import {
  ConversationParticipantRole,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketType,
} from '@prisma/client';

export class SupportMessageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ConversationParticipantRole })
  senderRole!: ConversationParticipantRole;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  createdAt!: string;
}

export class SupportInternalNoteDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  note!: string;

  @ApiProperty()
  createdAt!: string;
}

export class SupportTicketItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: SupportTicketType })
  category!: SupportTicketType;

  @ApiProperty()
  subject!: string;

  @ApiProperty({ enum: SupportTicketStatus })
  status!: SupportTicketStatus;

  @ApiProperty({ enum: SupportTicketPriority })
  priority!: SupportTicketPriority;

  @ApiProperty({ nullable: true })
  assignedAdminUserId!: string | null;

  @ApiProperty({ nullable: true })
  relatedSessionId!: string | null;

  @ApiProperty({ nullable: true })
  relatedPaymentId!: string | null;

  @ApiProperty({ nullable: true })
  relatedInstantBookingRequestId!: string | null;

  @ApiProperty({ nullable: true })
  relatedMatchingSessionId!: string | null;

  @ApiProperty({ nullable: true })
  relatedAssessmentSubmissionId!: string | null;

  @ApiProperty({ nullable: true })
  lastMessageAt!: string | null;

  @ApiProperty({ nullable: true })
  resolvedAt!: string | null;

  @ApiProperty({ nullable: true })
  closedAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class SupportTicketDetailsDto extends SupportTicketItemDto {
  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ type: SupportMessageDto, isArray: true })
  messages!: SupportMessageDto[];
}

export class AdminSupportTicketDetailsDto extends SupportTicketDetailsDto {
  @ApiProperty({ type: SupportInternalNoteDto, isArray: true })
  internalNotes!: SupportInternalNoteDto[];
}

export class SupportPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class SupportTicketItemDataDto {
  @ApiProperty({ type: SupportTicketDetailsDto })
  item!: SupportTicketDetailsDto;
}

export class AdminSupportTicketItemDataDto {
  @ApiProperty({ type: AdminSupportTicketDetailsDto })
  item!: AdminSupportTicketDetailsDto;
}

export class SupportTicketListDataDto {
  @ApiProperty({ type: SupportTicketItemDto, isArray: true })
  items!: SupportTicketItemDto[];

  @ApiProperty({ type: SupportPaginationDto })
  pagination!: SupportPaginationDto;
}

export class SupportTicketItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SupportTicketItemDataDto })
  data!: SupportTicketItemDataDto;
}

export class AdminSupportTicketItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminSupportTicketItemDataDto })
  data!: AdminSupportTicketItemDataDto;
}

export class SupportTicketListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SupportTicketListDataDto })
  data!: SupportTicketListDataDto;
}
