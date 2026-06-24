import { BadRequestException, Injectable } from '@nestjs/common';
import {
  GeneralChatAttachmentRefDto,
  SendGeneralChatMessageDto,
} from '../dto/send-general-chat-message.dto';
import { GENERAL_CHAT_ERROR_CODES } from '../types/general-chat.types';

const ALLOWED_ATTACHMENT_MIME_PREFIXES = ['image/', 'application/pdf', 'text/'];

@Injectable()
export class ValidateGeneralChatMessagePayloadService {
  normalize(input: SendGeneralChatMessageDto) {
    const contentText = input.message.trim();
    if (!contentText) {
      throw new BadRequestException({
        messageKey: 'chat.errors.messageContentRequired',
        errorCode: GENERAL_CHAT_ERROR_CODES.messageContentRequired,
      });
    }

    const seenAttachmentRefIds = new Set<string>();
    const attachments = (input.attachments ?? []).map((attachment) => {
      this.assertAttachmentValid(attachment);

      const normalizedFileId = attachment.fileId.trim();
      if (seenAttachmentRefIds.has(normalizedFileId)) {
        throw new BadRequestException({
          messageKey: 'chat.errors.attachmentRefInvalid',
          errorCode: GENERAL_CHAT_ERROR_CODES.attachmentRefInvalid,
        });
      }
      seenAttachmentRefIds.add(normalizedFileId);

      return {
        fileId: normalizedFileId,
        fileUrl: attachment.fileUrl.trim(),
        mimeType: attachment.mimeType.trim().toLowerCase(),
        fileSize: attachment.fileSize,
        originalName: attachment.originalName?.trim(),
      };
    });

    return {
      contentText,
      attachments,
    };
  }

  private assertAttachmentValid(attachment: GeneralChatAttachmentRefDto): void {
    const mime = attachment.mimeType.trim().toLowerCase();
    const mimeAllowed = ALLOWED_ATTACHMENT_MIME_PREFIXES.some((prefix) =>
      mime.startsWith(prefix),
    );

    if (!mimeAllowed) {
      throw new BadRequestException({
        messageKey: 'chat.errors.attachmentRefInvalid',
        errorCode: GENERAL_CHAT_ERROR_CODES.attachmentRefInvalid,
      });
    }
  }
}
