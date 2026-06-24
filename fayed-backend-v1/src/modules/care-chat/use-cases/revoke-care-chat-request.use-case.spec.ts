import { ChatApprovalStatus } from '@prisma/client';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { CareChatPresenter } from '../presenters/care-chat.presenter';
import { CareChatConversationRepository } from '../repositories/care-chat-conversation.repository';
import { CareChatRequestRepository } from '../repositories/care-chat-request.repository';
import { ValidateCareChatApprovalTransitionService } from '../services/validate-care-chat-approval-transition.service';
import { RevokeCareChatRequestUseCase } from './revoke-care-chat-request.use-case';

describe('RevokeCareChatRequestUseCase', () => {
  const requestRepository = {
    findById: jest.fn(),
    withTransaction: jest.fn(),
    updateRequest: jest.fn(),
    createModerationAction: jest.fn(),
  } as unknown as CareChatRequestRepository;

  const conversationRepository = {
    updateConversationStatus: jest.fn(),
  } as unknown as CareChatConversationRepository;

  const presenter = {
    presentAdminRequestItem: jest.fn().mockReturnValue({ id: 'request-1' }),
  } as unknown as CareChatPresenter;

  const operationalNotificationService = {
    notifyCareChatRequestRevoked: jest.fn(),
  } as unknown as OperationalNotificationService;

  const useCase = new RevokeCareChatRequestUseCase(
    requestRepository,
    conversationRepository,
    new ValidateCareChatApprovalTransitionService(),
    presenter,
    operationalNotificationService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('revokes the linked conversation and notifies both participants', async () => {
    (requestRepository.findById as jest.Mock).mockResolvedValue({
      id: 'request-1',
      status: ChatApprovalStatus.APPROVED,
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
      linkedConversationId: 'conversation-1',
    });
    (requestRepository.withTransaction as jest.Mock).mockImplementation(
      async (runner: (tx: { tx: true }) => Promise<unknown>) =>
        runner({ tx: true }),
    );
    (conversationRepository.updateConversationStatus as jest.Mock).mockResolvedValue(
      null,
    );
    (requestRepository.createModerationAction as jest.Mock).mockResolvedValue(
      null,
    );
    (requestRepository.updateRequest as jest.Mock).mockResolvedValue({
      id: 'request-1',
      status: ChatApprovalStatus.REVOKED,
      patient: { id: 'patient-1', user: { displayName: 'P' } },
      practitioner: { id: 'practitioner-1', user: { displayName: 'D' } },
    });

    await useCase.execute({
      userId: 'admin-1',
      requestId: 'request-1',
      payload: { note: 'Revoked for review' },
    });

    expect(
      conversationRepository.updateConversationStatus,
    ).toHaveBeenCalledWith(
      'conversation-1',
      expect.objectContaining({
        status: 'SUSPENDED',
      }),
      expect.anything(),
    );
    expect(
      operationalNotificationService.notifyCareChatRequestRevoked,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        patientProfileId: 'patient-1',
        practitionerProfileId: 'practitioner-1',
        requestId: 'request-1',
        conversationId: 'conversation-1',
      }),
    );
  });
});
