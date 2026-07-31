import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportTicketPriority, SupportTicketType } from '@prisma/client';
import {
  IsEnum,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateSupportTicketDto {
  @ApiProperty({ enum: SupportTicketType })
  @IsEnum(SupportTicketType)
  category!: SupportTicketType;

  @ApiPropertyOptional({ example: 'Problem joining my session' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  subject?: string;

  @ApiProperty({ example: 'I see an error when trying to join the room.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  @ApiPropertyOptional({
    description: 'Create a separate conversation instead of reusing an open ticket.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  newConversation?: boolean;

  @ApiPropertyOptional({ description: 'Retry-safe key for one support draft submission.' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  idempotencyKey?: string;

  @ApiPropertyOptional({
    enum: SupportTicketPriority,
    default: SupportTicketPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  relatedSessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  relatedPaymentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  relatedInstantBookingRequestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  relatedMatchingSessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  relatedAssessmentSubmissionId?: string;
}
