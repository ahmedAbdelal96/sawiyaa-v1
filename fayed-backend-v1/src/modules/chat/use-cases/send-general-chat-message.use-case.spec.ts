import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { ConversationAccessPolicy } from '../policies/conversation-access.policy';
import { GeneralChatModerationStateService } from '../services/general-chat-moderation-state.service';
import { ValidateGeneralChatMessagePayloadService } from '../services/validate-general-chat-message-payload.service';
import { SendGeneralChatMessageUseCase } from './send-general-chat-message.use-case';

describe('SendGeneralChatMessageUseCase', () => {
  const generalChatRepository = {
    findConversationByIdInGeneralScope: jest.fn(),
    appendMessageInGeneralConversation: jest.fn(),
  } as unknown as GeneralChatRepository;

  const useCase = new SendGeneralChatMessageUseCase(
    generalChatRepository,
    new GeneralChatModerationStateService(),
    new ValidateGeneralChatMessagePayloadService(),
    new ConversationAccessPolicy(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects send when admin lock makes the conversation not sendable', async () => {
    (generalChatRepository.findConversationByIdInGeneralScope as jest.Mock).mockResolvedValue({
      id: 'conv_1',
      status: 'OPEN',
      closedAt: null,
      adminSendingDisabledAt: new Date('2026-05-21T10:00:00.000Z'),
      adminSendingDisabledByUserId: 'admin',
      adminSendingDisabledReason: 'Moderation lock',
      adminSendingEnabledAt: null,
      adminSendingEnabledByUserId: null,
      practitionerSendingDisabledAt: null,
      practitionerSendingDisabledByUserId: null,
      practitionerSendingDisabledReason: null,
      practitionerSendingEnabledAt: null,
      practitionerSendingEnabledByUserId: null,
      participants: [{ userId: 'user_1', participantRole: 'PATIENT' }],
    });

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_1', roles: [] },
        conversationId: 'conv_1',
        dto: { message: 'Hello' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when conversation is missing', async () => {
    (generalChatRepository.findConversationByIdInGeneralScope as jest.Mock).mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_1', roles: [] },
        conversationId: 'missing',
        dto: { message: 'Hello' },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects non-participant sender', async () => {
    (generalChatRepository.findConversationByIdInGeneralScope as jest.Mock).mockResolvedValue({
      id: 'conv_1',
      status: 'OPEN',
      closedAt: null,
      participants: [{ userId: 'user_other', participantRole: 'PATIENT' }],
      adminSendingDisabledAt: null,
      adminSendingDisabledByUserId: null,
      adminSendingDisabledReason: null,
      adminSendingEnabledAt: null,
      adminSendingEnabledByUserId: null,
      practitionerSendingDisabledAt: null,
      practitionerSendingDisabledByUserId: null,
      practitionerSendingDisabledReason: null,
      practitionerSendingEnabledAt: null,
      practitionerSendingEnabledByUserId: null,
    });

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_1', roles: [] },
        conversationId: 'conv_1',
        dto: { message: 'Hello' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
