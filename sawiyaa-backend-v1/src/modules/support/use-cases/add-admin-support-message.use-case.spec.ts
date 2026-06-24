import { AppRole } from '@common/enums/app-role.enum';
import { SupportPresenter } from '../presenters/support.presenter';
import { SupportTicketRepository } from '../repositories/support-ticket.repository';
import { ResolveSupportAdminActorRoleService } from '../services/resolve-support-admin-actor-role.service';
import { AddAdminSupportMessageUseCase } from './add-admin-support-message.use-case';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';

describe('AddAdminSupportMessageUseCase', () => {
  const supportTicketRepository = {
    findByIdForAdmin: jest.fn(),
    addPublicSupportMessage: jest.fn(),
  } as unknown as SupportTicketRepository;

  const resolveSupportAdminActorRoleService = {
    resolve: jest.fn().mockReturnValue('PRACTITIONER'),
  } as unknown as ResolveSupportAdminActorRoleService;

  const supportPresenter = {
    presentAdminTicketDetails: jest.fn(),
  } as unknown as SupportPresenter;

  const notifyConversationMessageMock = jest.fn();
  const operationalNotificationService = {
    notifyConversationMessage: notifyConversationMessageMock,
  } as unknown as OperationalNotificationService;

  const useCase = new AddAdminSupportMessageUseCase(
    supportTicketRepository,
    resolveSupportAdminActorRoleService,
    supportPresenter,
    operationalNotificationService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('notifies the ticket participant after an admin/support reply', async () => {
    (supportTicketRepository.findByIdForAdmin as jest.Mock).mockResolvedValue({
      id: 'ticket-1',
    });
    (supportTicketRepository.addPublicSupportMessage as jest.Mock).mockResolvedValue({
      conversation: {
        messages: [{ id: 'msg-1' }],
        participants: [
          { userId: 'admin-1', participantRole: 'PRACTITIONER' },
          { userId: 'patient-1', participantRole: 'PATIENT' },
        ],
      },
    });
    (supportPresenter.presentAdminTicketDetails as jest.Mock).mockReturnValue({
      id: 'ticket-1',
    });

    await useCase.execute({
      userId: 'admin-1',
      roles: [AppRole.ADMIN],
      ticketId: 'ticket-1',
      payload: { message: 'reply' },
    });

    expect(notifyConversationMessageMock).toHaveBeenCalledWith({
      lane: 'SUPPORT',
      threadId: 'ticket-1',
      messageId: 'msg-1',
      senderUserId: 'admin-1',
      participants: [
        { userId: 'admin-1', participantRole: 'PRACTITIONER' },
        { userId: 'patient-1', participantRole: 'PATIENT' },
      ],
    });
  });
});
