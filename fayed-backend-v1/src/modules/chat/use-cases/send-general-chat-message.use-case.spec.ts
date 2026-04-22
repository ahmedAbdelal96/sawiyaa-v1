import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { ValidateGeneralChatMessagePayloadService } from '../services/validate-general-chat-message-payload.service';
import { SendGeneralChatMessageUseCase } from './send-general-chat-message.use-case';

describe('SendGeneralChatMessageUseCase', () => {
  const generalChatRepository = {
    findConversationByIdInGeneralScope: jest.fn(),
    appendMessageInGeneralConversation: jest.fn(),
  } as unknown as GeneralChatRepository;

  const useCase = new SendGeneralChatMessageUseCase(
    generalChatRepository,
    new ValidateGeneralChatMessagePayloadService(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends successfully for active participant and returns persisted message', async () => {
    (
      generalChatRepository.findConversationByIdInGeneralScope as jest.Mock
    ).mockResolvedValue({
      id: 'conv_1',
      status: 'OPEN',
      participants: [{ userId: 'user_1' }],
    });
    (
      generalChatRepository.appendMessageInGeneralConversation as jest.Mock
    ).mockResolvedValue({
      message: {
        id: 'msg_1',
        conversationId: 'conv_1',
        senderUserId: 'user_1',
        messageType: 'TEXT',
        contentText: 'Hello',
        sentAt: new Date('2026-04-01T12:00:00.000Z'),
      },
      attachments: [
        {
          storageProvider: 'ref:file_1',
          fileUrl: 'https://cdn.example.com/a.pdf',
          mimeType: 'application/pdf',
          fileSize: 1200,
          originalName: 'a.pdf',
        },
      ],
      conversationLatestActivityAt: new Date('2026-04-01T12:00:00.000Z'),
    });

    const result = await useCase.execute({
      authenticatedUser: { id: 'user_1', roles: [] },
      conversationId: 'conv_1',
      dto: {
        message: 'Hello',
        attachments: [
          {
            fileId: 'file_1',
            fileUrl: 'https://cdn.example.com/a.pdf',
            mimeType: 'application/pdf',
          },
        ],
      },
    });

    expect(
      generalChatRepository.appendMessageInGeneralConversation,
    ).toHaveBeenCalled();
    expect(result.item.messageId).toBe('msg_1');
    expect(result.item.conversationLatestActivityAt).toBe(
      '2026-04-01T12:00:00.000Z',
    );
  });

  it('rejects when conversation is not found', async () => {
    (
      generalChatRepository.findConversationByIdInGeneralScope as jest.Mock
    ).mockResolvedValue(null);

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_1', roles: [] },
        conversationId: 'missing',
        dto: { message: 'Hello' },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects non-participant sender', async () => {
    (
      generalChatRepository.findConversationByIdInGeneralScope as jest.Mock
    ).mockResolvedValue({
      id: 'conv_1',
      status: 'OPEN',
      participants: [{ userId: 'user_other' }],
    });

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_1', roles: [] },
        conversationId: 'conv_1',
        dto: { message: 'Hello' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects invalid/empty message content', async () => {
    (
      generalChatRepository.findConversationByIdInGeneralScope as jest.Mock
    ).mockResolvedValue({
      id: 'conv_1',
      status: 'OPEN',
      participants: [{ userId: 'user_1' }],
    });

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_1', roles: [] },
        conversationId: 'conv_1',
        dto: { message: '   ' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects send when conversation status is terminal', async () => {
    (
      generalChatRepository.findConversationByIdInGeneralScope as jest.Mock
    ).mockResolvedValue({
      id: 'conv_1',
      status: 'CLOSED',
      participants: [{ userId: 'user_1' }],
    });

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_1', roles: [] },
        conversationId: 'conv_1',
        dto: { message: 'Hello' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
