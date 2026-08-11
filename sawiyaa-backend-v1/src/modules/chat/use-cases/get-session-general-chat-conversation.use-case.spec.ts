import { ForbiddenException } from '@nestjs/common';
import { GetSessionGeneralChatConversationUseCase } from './get-session-general-chat-conversation.use-case';

describe('GetSessionGeneralChatConversationUseCase', () => {
  const prisma = {
    session: { findUnique: jest.fn() },
  } as any;
  const repository = {
    findConversationsBySessionId: jest.fn(),
  } as any;
  const availability = {
    resolveAvailability: jest.fn(),
  } as any;
  const detail = { execute: jest.fn() } as any;
  const useCase = new GetSessionGeneralChatConversationUseCase(
    prisma,
    repository,
    availability,
    detail,
  );

  const session = {
    id: 'session-1',
    status: 'UPCOMING',
    sessionMode: 'VIDEO',
    scheduledStartAt: new Date('2026-08-02T12:00:00.000Z'),
    scheduledEndAt: new Date('2026-08-02T12:30:00.000Z'),
    provider: 'DAILY',
    providerRoomId: null,
    providerSessionRef: null,
    patient: { userId: 'patient-1' },
    practitioner: { userId: 'practitioner-1' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.session.findUnique.mockResolvedValue(session);
    repository.findConversationsBySessionId.mockResolvedValue([]);
    availability.resolveAvailability.mockReturnValue({
      canRead: true,
      canSend: false,
      readOnly: true,
      reason: 'SESSION_NOT_STARTED',
    });
  });

  it('returns a read-only empty state without creating a conversation', async () => {
    await expect(
      useCase.execute({
        authenticatedUser: { id: 'patient-1', roles: [] },
        sessionId: 'session-1',
      }),
    ).resolves.toEqual({
      item: null,
      sessionId: 'session-1',
      chatAvailability: {
        canRead: true,
        canSend: false,
        readOnly: true,
        reason: 'SESSION_NOT_STARTED',
      },
    });
  });

  it('returns the existing conversation for a participant without checking send eligibility as read access', async () => {
    repository.findConversationsBySessionId.mockResolvedValue([{ id: 'conv-1' }]);
    detail.execute.mockResolvedValue({
      item: {
        conversationId: 'conv-1',
        chatAvailability: {
          canRead: true,
          canSend: false,
          readOnly: true,
          reason: 'SESSION_ENDED',
        },
      },
    });

    const result = await useCase.execute({
      authenticatedUser: { id: 'practitioner-1', roles: [] },
      sessionId: 'session-1',
    });

    expect(result.item?.conversationId).toBe('conv-1');
    expect(detail.execute).toHaveBeenCalledWith({
      authenticatedUser: { id: 'practitioner-1', roles: [] },
      conversationId: 'conv-1',
    });
  });

  it('rejects an unrelated user before reading conversation data', async () => {
    await expect(
      useCase.execute({
        authenticatedUser: { id: 'intruder', roles: [] },
        sessionId: 'session-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.findConversationsBySessionId).not.toHaveBeenCalled();
  });

  it('does not create or resolve a second conversation when data is duplicated', async () => {
    repository.findConversationsBySessionId.mockResolvedValue([
      { id: 'conv-1' },
      { id: 'conv-2' },
    ]);

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'patient-1', roles: [] },
        sessionId: 'session-1',
      }),
    ).rejects.toThrow('Multiple canonical conversations');
    expect(detail.execute).not.toHaveBeenCalled();
  });
});
