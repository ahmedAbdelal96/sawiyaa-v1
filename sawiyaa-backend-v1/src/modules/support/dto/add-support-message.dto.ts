import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddSupportMessageDto {
  @ApiProperty({ example: 'I tried again and still cannot complete checkout.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message!: string;
}
