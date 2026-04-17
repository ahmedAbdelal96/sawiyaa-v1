import { PrismaService } from '@common/prisma/prisma.service';
import { CareChatConversationRepository } from './care-chat-conversation.repository';

describe('CareChatConversationRepository', () => {
  const prisma = {
    conversation: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  } as unknown as PrismaService;

  const repository = new CareChatConversationRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enforces CARE_APPROVED conversation type for actor-scoped reads', async () => {
    await repository.findByIdForActor({
      conversationId: 'conversation-1',
      actorType: 'PATIENT',
      profileId: 'patient-1',
    });

    expect(prisma.conversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'conversation-1',
          conversationType: 'CARE_APPROVED',
          patientId: 'patient-1',
        }),
      }),
    );
  });
});
