import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateOrGetGeneralChatConversationUseCase } from './create-or-get-general-chat-conversation.use-case';
import { OpenSessionGeneralChatUseCase } from './open-session-general-chat.use-case';

describe('OpenSessionGeneralChatUseCase', () => {
  const prisma = {
    session: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;

  const createOrGetGeneralChatConversationUseCase = {
    execute: jest.fn(),
  } as unknown as CreateOrGetGeneralChatConversationUseCase;

  const useCase = new OpenSessionGeneralChatUseCase(
    prisma,
    createOrGetGeneralChatConversationUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens a completed session chat in read-only mode', async () => {
    (prisma.session.findUnique as jest.Mock).mockResolvedValue({
      id: 'session_1',
      status: 'COMPLETED',
      sessionMode: 'VIDEO',
      scheduledStartAt: new Date('2026-08-02T12:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-02T12:30:00.000Z'),
      provider: 'DAILY',
      providerRoomId: 'room_1',
      providerSessionRef: 'room_1',
      patient: { userId: 'patient_1' },
      practitioner: { userId: 'practitioner_1' },
    });
    (createOrGetGeneralChatConversationUseCase.execute as jest.Mock).mockResolvedValue({
      item: {
        conversationId: 'conv_1',
        conversationRef: 'gc_1',
        conversationType: 'SYSTEM',
        status: 'OPEN',
        linkedSessionId: 'session_1',
        participants: [],
        wasCreated: false,
        chatAvailability: {
          canRead: true,
          canSend: false,
          readOnly: true,
          reason: 'SESSION_ENDED',
        },
      },
    });

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'patient_1', roles: [] },
        sessionId: 'session_1',
      }),
    ).resolves.toEqual({
      item: {
        conversationId: 'conv_1',
        conversationRef: 'gc_1',
        conversationType: 'SYSTEM',
        status: 'OPEN',
        linkedSessionId: 'session_1',
        participants: [],
        wasCreated: false,
        chatAvailability: {
          canRead: true,
          canSend: false,
          readOnly: true,
          reason: 'SESSION_ENDED',
        },
      },
    });
  });

  it('rejects non participants', async () => {
    (prisma.session.findUnique as jest.Mock).mockResolvedValue({
      id: 'session_1',
      status: 'IN_PROGRESS',
      sessionMode: 'VIDEO',
      scheduledStartAt: new Date('2026-08-02T12:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-02T12:30:00.000Z'),
      provider: 'DAILY',
      providerRoomId: 'room_1',
      providerSessionRef: 'room_1',
      patient: { userId: 'patient_1' },
      practitioner: { userId: 'practitioner_1' },
    });

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'intruder', roles: [] },
        sessionId: 'session_1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
