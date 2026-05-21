import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum AdminGeneralChatConversationStatusFilter {
  ACTIVE = 'ACTIVE',
  SENDING_DISABLED = 'SENDING_DISABLED',
  CLOSED_BY_PRACTITIONER = 'CLOSED_BY_PRACTITIONER',
  ARCHIVED = 'ARCHIVED',
}

export enum AdminGeneralChatConversationSortBy {
  LAST_MESSAGE_AT = 'lastMessageAt',
  SESSION_DATE_TIME = 'sessionDateTime',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum AdminGeneralChatConversationSortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListAdminGeneralChatConversationsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  })
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 100) : undefined;
  })
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: AdminGeneralChatConversationStatusFilter })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim()
      ? value.trim().toUpperCase()
      : undefined,
  )
  @IsEnum(AdminGeneralChatConversationStatusFilter)
  status?: AdminGeneralChatConversationStatusFilter;

  @ApiPropertyOptional({ description: 'Patient profile id' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Practitioner profile id' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsUUID()
  practitionerId?: string;

  @ApiPropertyOptional({ description: 'Session id' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'ISO date; from session date/time' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'ISO date; to session date/time' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'When true, only include conversations with attachments',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  hasAttachmentsOnly?: boolean;

  @ApiPropertyOptional({ enum: AdminGeneralChatConversationSortBy })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim()
      ? value.trim()
      : undefined,
  )
  @IsEnum(AdminGeneralChatConversationSortBy)
  sortBy?: AdminGeneralChatConversationSortBy = AdminGeneralChatConversationSortBy.UPDATED_AT;

  @ApiPropertyOptional({ enum: AdminGeneralChatConversationSortDirection })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim()
      ? value.trim().toLowerCase()
      : undefined,
  )
  @IsEnum(AdminGeneralChatConversationSortDirection)
  sortDirection?: AdminGeneralChatConversationSortDirection =
    AdminGeneralChatConversationSortDirection.DESC;
}

