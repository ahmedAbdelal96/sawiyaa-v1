import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { ConversationAccessPolicy } from '../policies/conversation-access.policy';
import { GeneralChatAvailabilityService } from '../services/general-chat-availability.service';
import { GeneralChatModerationStateService } from '../services/general-chat-moderation-state.service';
import { ValidateGeneralChatMessagePayloadService } from '../services/validate-general-chat-message-payload.service';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { SendGeneralChatMessageUseCase } from './send-general-chat-message.use-case';

describe('SendGeneralChatMessageUseCase', () => {
  const generalChatRepository = {
    findConversationByIdInGeneralScope: jest.fn(),
    appendMessageInGeneralConversation: jest.fn(),
  } as unknown as GeneralChatRepository;

  const notifyConversationMessageMock = jest.fn();
  const operationalNotificationService = {
    notifyConversationMessage: notifyConversationMessageMock,
  } as unknown as OperationalNotificationService;

  const useCase = new SendGeneralChatMessageUseCase(
    generalChatRepository,
    new GeneralChatAvailabilityService(new GeneralChatModerationStateService()),
    new ValidateGeneralChatMessagePayloadService(),
    new ConversationAccessPolicy(),
    operationalNotificationService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects send when admin lock makes the conversation not sendable', async () => {
    (
      generalChatRepository.findConversationByIdInGeneralScope as jest.Mock
    ).mockResolvedValue({
      id: 'conv_1',
      conversationType: 'SYSTEM',
      status: 'OPEN',
      closedAt: null,
      supportTicket: null,
      chatApprovalRequest: null,
      session: null,
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

  it('allows send when a previous admin lock was later re-enabled', async () => {
    (
      generalChatRepository.findConversationByIdInGeneralScope as jest.Mock
    ).mockResolvedValue({
      id: 'conv_1',
      conversationType: 'SYSTEM',
      status: 'OPEN',
      closedAt: null,
      supportTicket: null,
      chatApprovalRequest: null,
      session: null,
      adminSendingDisabledAt: new Date('2026-05-21T10:00:00.000Z'),
      adminSendingDisabledByUserId: 'admin',
      adminSendingDisabledReason: 'Moderation lock',
      adminSendingEnabledAt: new Date('2026-05-21T10:05:00.000Z'),
      adminSendingEnabledByUserId: 'admin',
      practitionerSendingDisabledAt: null,
      practitionerSendingDisabledByUserId: null,
      practitionerSendingDisabledReason: null,
      practitionerSendingEnabledAt: null,
      practitionerSendingEnabledByUserId: null,
      participants: [{ userId: 'user_1', participantRole: 'PRACTITIONER' }],
    });
    (
      generalChatRepository.appendMessageInGeneralConversation as jest.Mock
    ).mockResolvedValue({
      message: {
        id: 'msg_1',
        conversationId: 'conv_1',
        senderUserId: 'user_1',
        messageType: 'TEXT',
        status: 'SENT',
        contentText: 'Hello',
        sentAt: new Date('2026-05-21T10:06:00.000Z'),
        deliveredAt: null,
        readAt: null,
      },
      attachments: [],
      conversationLatestActivityAt: new Date('2026-05-21T10:06:00.000Z'),
    });

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_1', roles: [] },
        conversationId: 'conv_1',
        dto: { message: 'Hello' },
      }),
    ).resolves.toMatchObject({
      item: {
        messageId: 'msg_1',
        conversationId: 'conv_1',
        contentText: 'Hello',
      },
    });
    expect(notifyConversationMessageMock).toHaveBeenCalledWith({
      lane: 'SESSION_CHAT',
      threadId: 'conv_1',
      messageId: 'msg_1',
      senderUserId: 'user_1',
      participants: [{ userId: 'user_1', participantRole: 'PRACTITIONER' }],
    });
  });

  it('rejects send when the linked session is already ended', async () => {
    (
      generalChatRepository.findConversationByIdInGeneralScope as jest.Mock
    ).mockResolvedValue({
      id: 'conv_1',
      conversationType: 'SYSTEM',
      status: 'OPEN',
      closedAt: null,
      session: {
        status: 'COMPLETED',
        sessionMode: 'VIDEO',
        scheduledStartAt: new Date('2026-05-21T09:00:00.000Z'),
        scheduledEndAt: new Date('2026-05-21T09:30:00.000Z'),
        provider: 'DAILY',
        providerRoomId: 'room_1',
        providerSessionRef: 'https://room.daily.co/room_1',
      },
      supportTicket: null,
      chatApprovalRequest: null,
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
      participants: [{ userId: 'user_1', participantRole: 'PATIENT' }],
    });

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_1', roles: [] },
        conversationId: 'conv_1',
        dto: { message: 'Hello' },
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        errorCode: 'GENERAL_CHAT_SESSION_CHAT_READ_ONLY',
      }),
    });
    expect(notifyConversationMessageMock).not.toHaveBeenCalled();
    expect(
      generalChatRepository.appendMessageInGeneralConversation,
    ).not.toHaveBeenCalled();
  });

  it('rejects when conversation is missing', async () => {
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
      conversationType: 'SYSTEM',
      status: 'OPEN',
      closedAt: null,
      session: null,
      supportTicket: null,
      chatApprovalRequest: null,
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
