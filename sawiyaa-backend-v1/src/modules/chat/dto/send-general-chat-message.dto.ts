import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class GeneralChatAttachmentRefDto {
  @ApiProperty({ description: 'Attachment reference id from upload subsystem' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fileId!: string;

  @ApiProperty()
  @IsUrl({ require_tld: false })
  fileUrl!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  mimeType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50_000_000)
  fileSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  originalName?: string;
}

export class SendGeneralChatMessageDto {
  @ApiPropertyOptional({ maxLength: 191 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  @Matches(/^[A-Za-z0-9_-]+$/)
  clientMessageId?: string;

  @ApiProperty({
    maxLength: 4000,
    description: 'Plain text content for general chat message',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message!: string;

  @ApiPropertyOptional({ type: GeneralChatAttachmentRefDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => GeneralChatAttachmentRefDto)
  attachments?: GeneralChatAttachmentRefDto[];
}
