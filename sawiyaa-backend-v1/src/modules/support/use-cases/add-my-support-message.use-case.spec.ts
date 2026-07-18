import { SupportActorRepository } from '../repositories/support-actor.repository';
import { SupportTicketRepository } from '../repositories/support-ticket.repository';
import { SupportTicketAccessPolicy } from '../policies/support-ticket-access.policy';
import { SupportPresenter } from '../presenters/support.presenter';
import { AddMySupportMessageUseCase } from './add-my-support-message.use-case';

describe('AddMySupportMessageUseCase', () => {
  const supportActorRepository = {
    findPatientProfileByUserId: jest.fn(),
    findPractitionerProfileByUserId: jest.fn(),
  } as unknown as SupportActorRepository;

  const supportTicketRepository = {
    findByOwner: jest.fn(),
    findByIdForAdmin: jest.fn(),
    addMessage: jest.fn(),
  } as unknown as SupportTicketRepository;

  const supportTicketAccessPolicy = {
    assertPatientOwnership: jest.fn(),
    assertPractitionerOwnership: jest.fn(),
  } as unknown as SupportTicketAccessPolicy;

  const supportPresenter = {
    presentUserTicketDetails: jest.fn(),
  } as unknown as SupportPresenter;

  const messagingUseCase = {
    sendMessage: jest.fn(),
  } as any;

  const useCase = new AddMySupportMessageUseCase(
    supportActorRepository,
    supportTicketRepository,
    supportTicketAccessPolicy,
    supportPresenter,
    messagingUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    messagingUseCase.sendMessage.mockReset();
  });

  it('delegates practitioner support replies to the canonical messaging use case', async () => {
    (
      supportActorRepository.findPractitionerProfileByUserId as jest.Mock
    ).mockResolvedValue({
      id: 'pr-1',
    });
    (supportTicketRepository.findByOwner as jest.Mock).mockResolvedValue({
      id: 'ticket-1',
      conversationId: 'conv-1',
    });
    (supportTicketRepository.findByIdForAdmin as jest.Mock).mockResolvedValue({
      conversation: {
        messages: [],
      },
    });
    messagingUseCase.sendMessage.mockResolvedValue({ item: { id: 'msg-1' } });
    (supportPresenter.presentUserTicketDetails as jest.Mock).mockReturnValue({
      id: 'ticket-1',
    });

    await useCase.execute({
      actorKind: 'PRACTITIONER',
      userId: 'user-pr',
      ticketId: 'ticket-1',
      payload: { message: 'hello' },
    });

    expect(messagingUseCase.sendMessage).toHaveBeenCalledWith(
      { id: 'user-pr', roles: [] },
      'conv-1',
      'hello',
      [],
      undefined,
    );
    expect(supportTicketRepository.addMessage).not.toHaveBeenCalled();
  });
});
