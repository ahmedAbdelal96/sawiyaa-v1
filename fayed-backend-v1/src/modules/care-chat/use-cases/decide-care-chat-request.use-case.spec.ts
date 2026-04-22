import { ChatApprovalStatus } from '@prisma/client';
import { CareChatPresenter } from '../presenters/care-chat.presenter';
import { CareChatConversationRepository } from '../repositories/care-chat-conversation.repository';
import { CareChatRequestRepository } from '../repositories/care-chat-request.repository';
import { ValidateCareChatApprovalTransitionService } from '../services/validate-care-chat-approval-transition.service';
import { DecideCareChatRequestUseCase } from './decide-care-chat-request.use-case';

describe('DecideCareChatRequestUseCase', () => {
  const requestRepository = {
    findById: jest.fn(),
    withTransaction: jest.fn(),
    updateRequest: jest.fn(),
    createApprovalNoticeMessage: jest.fn(),
  } as unknown as CareChatRequestRepository;

  const conversationRepository = {
    createApprovedConversation: jest.fn(),
  } as unknown as CareChatConversationRepository;

  const presenter = {
    presentAdminRequestItem: jest.fn().mockReturnValue({ id: 'request-1' }),
  } as unknown as CareChatPresenter;

  const useCase = new DecideCareChatRequestUseCase(
    requestRepository,
    conversationRepository,
    new ValidateCareChatApprovalTransitionService(),
    presenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates conversation only when decision is approve', async () => {
    (requestRepository.findById as jest.Mock).mockResolvedValue({
      id: 'request-1',
      status: ChatApprovalStatus.PENDING,
      expiresAt: null,
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
      relatedSessionId: null,
      patient: { userId: 'patient-user-1' },
      practitioner: { userId: 'practitioner-user-1' },
    });
    (requestRepository.withTransaction as jest.Mock).mockImplementation(
      async (runner: (tx: { tx: true }) => Promise<unknown>) =>
        runner({ tx: true }),
    );
    (
      conversationRepository.createApprovedConversation as jest.Mock
    ).mockResolvedValue({
      id: 'conversation-1',
    });
    (requestRepository.updateRequest as jest.Mock).mockResolvedValue({
      id: 'request-1',
      status: ChatApprovalStatus.APPROVED,
      requestReason: null,
      internalReviewNote: null,
      relatedSessionId: null,
      linkedConversationId: 'conversation-1',
      requestedAt: new Date(),
      reviewedAt: new Date(),
      approvedAt: new Date(),
      rejectedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
      revokedAt: null,
      patient: { id: 'patient-1', user: { displayName: 'P' } },
      practitioner: { id: 'practitioner-1', user: { displayName: 'D' } },
    });

    await useCase.execute({
      userId: 'admin-1',
      requestId: 'request-1',
      payload: { decision: 'APPROVE' },
    });

    expect(
      conversationRepository.createApprovedConversation,
    ).toHaveBeenCalled();
  });

  it('does not create conversation when decision is reject', async () => {
    (requestRepository.findById as jest.Mock).mockResolvedValue({
      id: 'request-1',
      status: ChatApprovalStatus.PENDING,
      expiresAt: null,
    });
    (requestRepository.withTransaction as jest.Mock).mockImplementation(
      async (runner: (tx: { tx: true }) => Promise<unknown>) =>
        runner({ tx: true }),
    );
    (requestRepository.updateRequest as jest.Mock).mockResolvedValue({
      id: 'request-1',
      status: ChatApprovalStatus.REJECTED,
      requestReason: null,
      internalReviewNote: null,
      relatedSessionId: null,
      linkedConversationId: null,
      requestedAt: new Date(),
      reviewedAt: new Date(),
      approvedAt: null,
      rejectedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600_000),
      revokedAt: null,
      patient: { id: 'patient-1', user: { displayName: 'P' } },
      practitioner: { id: 'practitioner-1', user: { displayName: 'D' } },
    });

    await useCase.execute({
      userId: 'admin-1',
      requestId: 'request-1',
      payload: { decision: 'REJECT' },
    });

    expect(
      conversationRepository.createApprovedConversation,
    ).not.toHaveBeenCalled();
  });
});
