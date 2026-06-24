import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class SendCareChatMessageDto {
  @ApiProperty({
    maxLength: 4000,
  })
  @IsString()
  @MaxLength(4000)
  message!: string;
}
