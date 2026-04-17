import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  CARE_CHAT_REQUEST_DECISION_VALUES,
  CareChatRequestDecision,
} from '../types/care-chat.types';

export class DecideCareChatRequestDto {
  @ApiProperty({
    enum: CARE_CHAT_REQUEST_DECISION_VALUES,
  })
  @IsIn(CARE_CHAT_REQUEST_DECISION_VALUES)
  decision!: CareChatRequestDecision;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Optional expiry used when decision=APPROVE. Defaults to 30 days from decision time.',
  })
  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  expiresAt?: string;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
