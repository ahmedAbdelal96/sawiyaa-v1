import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { CloseGeneralChatConversationUseCase } from './close-general-chat-conversation.use-case';

describe('CloseGeneralChatConversationUseCase', () => {
  const generalChatRepository = {
    findConversationByIdInGeneralScope: jest.fn(),
    updateConversationStatus: jest.fn(),
  } as unknown as GeneralChatRepository;

  const useCase = new CloseGeneralChatConversationUseCase(generalChatRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when conversation is missing', async () => {
    (generalChatRepository.findConversationByIdInGeneralScope as jest.Mock).mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_1', roles: [AppRole.PATIENT] },
        conversationId: 'missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('stamps admin moderation lock fields when admin closes the conversation', async () => {
    (generalChatRepository.findConversationByIdInGeneralScope as jest.Mock).mockResolvedValue({
      id: 'conv_1',
      status: 'OPEN',
      participants: [{ userId: 'admin-user', participantRole: 'PATIENT' }],
    });
    (generalChatRepository.updateConversationStatus as jest.Mock).mockResolvedValue({
      id: 'conv_1',
      status: 'CLOSED',
    });

    await useCase.execute({
      authenticatedUser: { id: 'admin-user', roles: [AppRole.ADMIN] },
      conversationId: 'conv_1',
    });

    expect(generalChatRepository.updateConversationStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv_1',
        data: expect.objectContaining({
          status: 'CLOSED',
          adminSendingDisabledByUserId: 'admin-user',
          adminSendingDisabledAt: expect.any(Date),
        }),
      }),
    );
  });

  it('stamps practitioner moderation lock fields when practitioner closes the conversation', async () => {
    (generalChatRepository.findConversationByIdInGeneralScope as jest.Mock).mockResolvedValue({
      id: 'conv_1',
      status: 'OPEN',
      participants: [{ userId: 'practitioner-user', participantRole: 'PRACTITIONER' }],
    });
    (generalChatRepository.updateConversationStatus as jest.Mock).mockResolvedValue({
      id: 'conv_1',
      status: 'CLOSED',
    });

    await useCase.execute({
      authenticatedUser: { id: 'practitioner-user', roles: [AppRole.PRACTITIONER] },
      conversationId: 'conv_1',
    });

    expect(generalChatRepository.updateConversationStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv_1',
        data: expect.objectContaining({
          practitionerSendingDisabledByUserId: 'practitioner-user',
          practitionerSendingDisabledAt: expect.any(Date),
        }),
      }),
    );
  });

  it('rejects patient close attempts', async () => {
    (generalChatRepository.findConversationByIdInGeneralScope as jest.Mock).mockResolvedValue({
      id: 'conv_1',
      status: 'OPEN',
      participants: [{ userId: 'patient-user', participantRole: 'PATIENT' }],
    });

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'patient-user', roles: [AppRole.PATIENT] },
        conversationId: 'conv_1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects closing an already closed conversation', async () => {
    (generalChatRepository.findConversationByIdInGeneralScope as jest.Mock).mockResolvedValue({
      id: 'conv_1',
      status: 'CLOSED',
      participants: [{ userId: 'practitioner-user', participantRole: 'PRACTITIONER' }],
    });

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'practitioner-user', roles: [AppRole.PRACTITIONER] },
        conversationId: 'conv_1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
