import { ChatApprovalStatus, ConversationStatus } from '@prisma/client';
import { CareChatPresenter } from '../presenters/care-chat.presenter';
import { CareChatActorRepository } from '../repositories/care-chat-actor.repository';
import { CareChatConversationRepository } from '../repositories/care-chat-conversation.repository';
import { ResolveCareChatActivityStateService } from '../services/resolve-care-chat-activity-state.service';
import { ValidateCareChatSendMessageService } from '../services/validate-care-chat-send-message.service';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { SendCareChatMessageUseCase } from './send-care-chat-message.use-case';

describe('SendCareChatMessageUseCase', () => {
  const actorRepository = {
    findPatientProfileByUserId: jest.fn(),
  } as unknown as CareChatActorRepository;

  const conversationRepository = {
    findByIdForActor: jest.fn(),
    addMessage: jest.fn(),
    markRead: jest.fn(),
  } as unknown as CareChatConversationRepository;

  const presenter = {
    presentConversation: jest.fn(),
  } as unknown as CareChatPresenter;

  const notifyConversationMessageMock = jest.fn();
  const operationalNotificationService = {
    notifyConversationMessage: notifyConversationMessageMock,
  } as unknown as OperationalNotificationService;

  const useCase = new SendCareChatMessageUseCase(
    actorRepository,
    conversationRepository,
    new ValidateCareChatSendMessageService(
      new ResolveCareChatActivityStateService(),
    ),
    presenter,
    operationalNotificationService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks sending when conversation is inactive', async () => {
    (actorRepository.findPatientProfileByUserId as jest.Mock).mockResolvedValue(
      {
        id: 'patient-1',
      },
    );
    (conversationRepository.findByIdForActor as jest.Mock).mockResolvedValue({
      id: 'conversation-1',
      status: ConversationStatus.SUSPENDED,
      expiresAt: null,
      chatApprovalRequest: {
        status: ChatApprovalStatus.REVOKED,
        expiresAt: null,
      },
    });

    await expect(
      useCase.execute({
        actorType: 'PATIENT',
        userId: 'user-1',
        conversationId: 'conversation-1',
        payload: { message: 'hello' },
      }),
    ).rejects.toMatchObject({
      response: { error: 'CARE_CHAT_CONVERSATION_INACTIVE' },
    });
  });

  it('notifies the other participant after sending a care chat message', async () => {
    (actorRepository.findPatientProfileByUserId as jest.Mock).mockResolvedValue(
      {
        id: 'patient-1',
      },
    );
    (conversationRepository.findByIdForActor as jest.Mock).mockResolvedValue({
      id: 'conversation-1',
      status: ConversationStatus.OPEN,
      expiresAt: null,
      chatApprovalRequest: {
        status: ChatApprovalStatus.APPROVED,
        expiresAt: null,
      },
    });
    (conversationRepository.addMessage as jest.Mock).mockResolvedValue({
      id: 'conversation-1',
      messages: [{ id: 'msg-1' }],
      participants: [
        { userId: 'user-1', participantRole: 'PATIENT' },
        { userId: 'user-2', participantRole: 'PRACTITIONER' },
      ],
      chatApprovalRequest: {
        status: ChatApprovalStatus.APPROVED,
      },
    });
    (presenter.presentConversation as jest.Mock).mockReturnValue({
      id: 'conversation-1',
    });

    await useCase.execute({
      actorType: 'PATIENT',
      userId: 'user-1',
      conversationId: 'conversation-1',
      payload: { message: 'hello' },
    });

    expect(notifyConversationMessageMock).toHaveBeenCalledWith({
      lane: 'CARE_CHAT',
      threadId: 'conversation-1',
      messageId: 'msg-1',
      senderUserId: 'user-1',
      participants: [
        { userId: 'user-1', participantRole: 'PATIENT' },
        { userId: 'user-2', participantRole: 'PRACTITIONER' },
      ],
    });
  });
});
