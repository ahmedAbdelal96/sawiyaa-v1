import { NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { Readable } from 'stream';
import { GeneralChatAttachmentStorageService } from '../services/general-chat-attachment-storage.service';
import { AdminGeneralChatRepository } from '../repositories/admin-general-chat.repository';
import { StreamAdminGeneralChatAttachmentUseCase } from './stream-admin-general-chat-attachment.use-case';

jest.mock('fs', () => {
  const actualFs = jest.requireActual<typeof import('fs')>('fs');
  return {
    ...actualFs,
    createReadStream: jest.fn(),
  };
});

describe('StreamAdminGeneralChatAttachmentUseCase', () => {
  const adminGeneralChatRepository = {
    findAttachmentForConversation: jest.fn(),
  } as unknown as AdminGeneralChatRepository;

  const attachmentStorageService = {
    resolve: jest.fn(),
  } as unknown as GeneralChatAttachmentStorageService;

  const useCase = new StreamAdminGeneralChatAttachmentUseCase(
    adminGeneralChatRepository,
    attachmentStorageService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('throws when attachment does not belong to the conversation', async () => {
    (adminGeneralChatRepository.findAttachmentForConversation as jest.Mock).mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute({ conversationId: 'conv_1', fileId: 'file_1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns a safe streamable file when attachment belongs to the conversation', async () => {
    (fs.createReadStream as jest.Mock).mockReturnValue(
      Readable.from(['hello']) as never,
    );

    (adminGeneralChatRepository.findAttachmentForConversation as jest.Mock).mockResolvedValue(
      {
        fileUrl: 'https://cdn.example.com/file_1.pdf',
        mimeType: 'application/pdf',
        fileSize: 1200,
        originalName: 'note.pdf',
        storageProvider: 'ref:file_1',
        message: {
          conversationId: 'conv_1',
        },
      },
    );
    (attachmentStorageService.resolve as jest.Mock).mockResolvedValue({
      absolutePath: 'C:/tmp/file_1.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 1200,
      originalFileName: 'note.pdf',
    });

    const result = await useCase.execute({
      conversationId: 'conv_1',
      fileId: 'file_1',
    });

    expect(result.mimeType).toBe('application/pdf');
    expect(result.originalFileName).toBe('note.pdf');
    expect(fs.createReadStream).toHaveBeenCalledWith('C:/tmp/file_1.pdf');
  });
});
