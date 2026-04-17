import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportTicketPriority, SupportTicketType } from '@prisma/client';
import {
  IsEnum,
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

  @ApiProperty({ example: 'Problem joining my session' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  subject!: string;

  @ApiProperty({ example: 'I see an error when trying to join the room.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  @ApiPropertyOptional({ enum: SupportTicketPriority, default: SupportTicketPriority.NORMAL })
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
