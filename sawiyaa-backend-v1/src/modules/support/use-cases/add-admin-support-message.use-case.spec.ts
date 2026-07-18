import { AppRole } from '@common/enums/app-role.enum';
import { SupportPresenter } from '../presenters/support.presenter';
import { SupportTicketRepository } from '../repositories/support-ticket.repository';
import { AddAdminSupportMessageUseCase } from './add-admin-support-message.use-case';

describe('AddAdminSupportMessageUseCase', () => {
  const supportTicketRepository = {
    findByIdForAdmin: jest.fn(),
    addPublicSupportMessage: jest.fn(),
  } as unknown as SupportTicketRepository;

  const supportPresenter = {
    presentAdminTicketDetails: jest.fn(),
  } as unknown as SupportPresenter;

  const messagingUseCase = {
    sendMessage: jest.fn(),
  } as any;

  const useCase = new AddAdminSupportMessageUseCase(
    supportTicketRepository,
    supportPresenter,
    messagingUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    messagingUseCase.sendMessage.mockReset();
  });

  it('delegates an admin/support reply to the canonical messaging use case', async () => {
    (supportTicketRepository.findByIdForAdmin as jest.Mock)
      .mockResolvedValueOnce({ id: 'ticket-1', conversationId: 'conv-1' })
      .mockResolvedValueOnce({
      id: 'ticket-1',
      conversation: {
        messages: [],
      },
    });
    messagingUseCase.sendMessage.mockResolvedValue({ item: { id: 'msg-1' } });
    (supportPresenter.presentAdminTicketDetails as jest.Mock).mockReturnValue({
      id: 'ticket-1',
    });

    await useCase.execute({
      userId: 'admin-1',
      roles: [AppRole.ADMIN],
      ticketId: 'ticket-1',
      payload: { message: 'reply' },
    });

    expect(messagingUseCase.sendMessage).toHaveBeenCalledWith(
      { id: 'admin-1', roles: [AppRole.ADMIN] },
      'conv-1',
      'reply',
      [],
      undefined,
    );
    expect(supportTicketRepository.addPublicSupportMessage).not.toHaveBeenCalled();
  });
});
