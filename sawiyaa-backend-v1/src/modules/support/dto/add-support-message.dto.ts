import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class AddSupportMessageDto {
  @ApiPropertyOptional({ maxLength: 191 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  @Matches(/^[A-Za-z0-9_-]+$/)
  clientMessageId?: string;

  @ApiProperty({ example: 'I tried again and still cannot complete checkout.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message!: string;
}
