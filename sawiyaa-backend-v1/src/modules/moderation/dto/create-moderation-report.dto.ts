import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ModerationChatType,
  ModerationReportReason,
  ModerationReportTargetType,
} from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateModerationReportDto {
  @ApiProperty({ enum: ModerationReportTargetType })
  @IsEnum(ModerationReportTargetType)
  targetType!: ModerationReportTargetType;

  @ApiProperty()
  @IsUUID()
  targetId!: string;

  @ApiProperty({ enum: ModerationReportReason })
  @IsEnum(ModerationReportReason)
  reason!: ModerationReportReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({ enum: ModerationChatType })
  @IsOptional()
  @IsEnum(ModerationChatType)
  chatType?: ModerationChatType;

  @ApiPropertyOptional({
    description: 'Conversation reference for chat evidence',
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'Specific message reference for chat evidence',
  })
  @IsOptional()
  @IsUUID()
  reportedMessageId?: string;

  @ApiPropertyOptional({ description: 'User who is the subject of the report' })
  @IsOptional()
  @IsUUID()
  targetUserId?: string;
}
