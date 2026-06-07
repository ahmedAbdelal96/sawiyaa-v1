import { ConversationParticipantRole } from '@prisma/client';
import { SupportActorRepository } from '../repositories/support-actor.repository';
import { SupportTicketRepository } from '../repositories/support-ticket.repository';
import { SupportTicketAccessPolicy } from '../policies/support-ticket-access.policy';
import { SupportPresenter } from '../presenters/support.presenter';
import { AddMySupportMessageUseCase } from './add-my-support-message.use-case';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';

describe('AddMySupportMessageUseCase', () => {
  const supportActorRepository = {
    findPatientProfileByUserId: jest.fn(),
    findPractitionerProfileByUserId: jest.fn(),
  } as unknown as SupportActorRepository;

  const supportTicketRepository = {
    findByOwner: jest.fn(),
    addMessage: jest.fn(),
  } as unknown as SupportTicketRepository;

  const supportTicketAccessPolicy = {
    assertPatientOwnership: jest.fn(),
    assertPractitionerOwnership: jest.fn(),
  } as unknown as SupportTicketAccessPolicy;

  const supportPresenter = {
    presentUserTicketDetails: jest.fn(),
  } as unknown as SupportPresenter;

  const notifyConversationMessageMock = jest.fn();
  const operationalNotificationService = {
    notifyConversationMessage: notifyConversationMessageMock,
  } as unknown as OperationalNotificationService;

  const useCase = new AddMySupportMessageUseCase(
    supportActorRepository,
    supportTicketRepository,
    supportTicketAccessPolicy,
    supportPresenter,
    operationalNotificationService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('notifies the other participant for practitioner support replies', async () => {
    (
      supportActorRepository.findPractitionerProfileByUserId as jest.Mock
    ).mockResolvedValue({
      id: 'pr-1',
    });
    (supportTicketRepository.findByOwner as jest.Mock).mockResolvedValue({
      id: 'ticket-1',
      conversationId: 'conv-1',
    });
    (supportTicketRepository.addMessage as jest.Mock).mockResolvedValue({
      conversation: {
        messages: [{ id: 'msg-1' }],
        participants: [
          {
            userId: 'user-pr',
            participantRole: ConversationParticipantRole.PRACTITIONER,
          },
          {
            userId: 'user-patient',
            participantRole: ConversationParticipantRole.PATIENT,
          },
        ],
      },
    });
    (supportPresenter.presentUserTicketDetails as jest.Mock).mockReturnValue({
      id: 'ticket-1',
    });

    await useCase.execute({
      actorKind: 'PRACTITIONER',
      userId: 'user-pr',
      ticketId: 'ticket-1',
      payload: { message: 'hello' },
    });

    expect(notifyConversationMessageMock).toHaveBeenCalledWith({
      lane: 'SUPPORT',
      threadId: 'ticket-1',
      messageId: 'msg-1',
      senderUserId: 'user-pr',
      participants: [
        {
          userId: 'user-pr',
          participantRole: ConversationParticipantRole.PRACTITIONER,
        },
        {
          userId: 'user-patient',
          participantRole: ConversationParticipantRole.PATIENT,
        },
      ],
    });
  });
});
