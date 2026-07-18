import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ maxLength: 4000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message!: string;

  @ApiPropertyOptional({
    description: 'Opaque client-generated id used to safely retry one logical send action.',
    maxLength: 191,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'clientMessageId must be an opaque alphanumeric identifier',
  })
  clientMessageId?: string;

  @ApiPropertyOptional({ type: 'array' })
  @IsOptional()
  attachments?: Array<{
    fileId: string;
    fileUrl: string;
    mimeType: string;
    fileSize?: number;
    originalName?: string;
  }>;
}
