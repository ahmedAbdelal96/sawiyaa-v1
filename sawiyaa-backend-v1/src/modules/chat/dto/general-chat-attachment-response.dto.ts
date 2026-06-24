import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GeneralChatAttachmentItemDto {
  @ApiProperty()
  fileId!: string;

  @ApiProperty()
  fileUrl!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty({ nullable: true })
  fileSize!: number | null;

  @ApiProperty({ nullable: true })
  originalName!: string | null;
}

export class GeneralChatAttachmentDataDto {
  @ApiProperty({ type: GeneralChatAttachmentItemDto })
  @Type(() => GeneralChatAttachmentItemDto)
  item!: GeneralChatAttachmentItemDto;
}

export class GeneralChatAttachmentSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: GeneralChatAttachmentDataDto })
  @Type(() => GeneralChatAttachmentDataDto)
  data!: GeneralChatAttachmentDataDto;
}
