import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class MarkGeneralChatConversationReadDto {
  @ApiPropertyOptional({
    description:
      'Optional last visible message id to advance read cursor up to this message.',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  lastReadMessageId?: string;
}
