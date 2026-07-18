import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class SendCareChatMessageDto {
  @ApiPropertyOptional({ maxLength: 191 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  @Matches(/^[A-Za-z0-9_-]+$/)
  clientMessageId?: string;

  @ApiProperty({
    maxLength: 4000,
  })
  @IsString()
  @MaxLength(4000)
  message!: string;
}
