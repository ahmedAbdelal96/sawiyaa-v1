import { Injectable, NotFoundException } from '@nestjs/common';
import { createReadStream } from 'fs';
import { StreamableFile } from '@nestjs/common';
import { AdminGeneralChatRepository } from '../repositories/admin-general-chat.repository';
import { GeneralChatAttachmentStorageService } from '../services/general-chat-attachment-storage.service';

@Injectable()
export class StreamAdminGeneralChatAttachmentUseCase {
  constructor(
    private readonly adminGeneralChatRepository: AdminGeneralChatRepository,
    private readonly generalChatAttachmentStorageService: GeneralChatAttachmentStorageService,
  ) {}

  async execute(input: { conversationId: string; fileId: string }) {
    const attachment =
      await this.adminGeneralChatRepository.findAttachmentForConversation({
        conversationId: input.conversationId,
        fileId: input.fileId,
      });

    if (!attachment) {
      throw new NotFoundException({
        messageKey: 'chat.errors.attachmentNotFound',
        errorCode: 'GENERAL_CHAT_ATTACHMENT_NOT_FOUND',
      });
    }

    const resolved = await this.generalChatAttachmentStorageService.resolve({
      conversationId: input.conversationId,
      fileId: input.fileId,
    });

    if (!resolved) {
      throw new NotFoundException({
        messageKey: 'chat.errors.attachmentNotFound',
        errorCode: 'GENERAL_CHAT_ATTACHMENT_NOT_FOUND',
      });
    }

    return {
      file: new StreamableFile(createReadStream(resolved.absolutePath)),
      mimeType: resolved.mimeType,
      fileSizeBytes: resolved.fileSizeBytes,
      originalFileName: resolved.originalFileName,
      attachment,
    };
  }
}

