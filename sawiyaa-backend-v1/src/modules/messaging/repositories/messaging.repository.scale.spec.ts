import { MessageStatus, MessageVisibility, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { MessagingRepository } from './messaging.repository';

type SupportFixture = {
  conversationType: 'SUPPORT' | 'GENERAL';
  conversationStatus: 'OPEN' | 'CLOSED';
  ticketStatus: 'OPEN' | 'CLOSED' | 'RESOLVED';
  messages: Array<{
    id: string;
    senderUserId: string | null;
    sentAt: string;
    deletedAt?: string | null;
    visibility?: 'NORMAL' | 'INTERNAL';
  }>;
  participants: Array<{
    userId: string;
    participantRole: 'PATIENT' | 'PRACTITIONER' | 'SUPPORT_AGENT';
    isActive: boolean;
  }>;
};

function oldSupportNeedsReplySemantics(fixture: SupportFixture): boolean {
  if (
    fixture.conversationType !== 'SUPPORT' ||
    fixture.conversationStatus === 'CLOSED' ||
    fixture.ticketStatus === 'CLOSED' ||
    fixture.ticketStatus === 'RESOLVED'
  ) {
    return false;
  }

  const latest = fixture.messages
    .filter(
      (message) =>
        !message.deletedAt && (message.visibility ?? 'NORMAL') === 'NORMAL',
    )
    .sort((left, right) => {
      const sentAtOrder = right.sentAt.localeCompare(left.sentAt);
      return sentAtOrder || right.id.localeCompare(left.id);
    })[0];

  if (!latest || latest.senderUserId === null) return true;

  return fixture.participants.some(
    (participant) =>
      participant.isActive &&
      participant.userId === latest.senderUserId &&
      (participant.participantRole === 'PATIENT' ||
        participant.participantRole === 'PRACTITIONER'),
  );
}

describe('MessagingRepository scale contracts', () => {
  it('keeps support-needs-reply semantics in a database-side count', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ count: BigInt(3) }]);
    const conversationFindMany = jest.fn();
    const prisma = {
      $queryRaw: queryRaw,
      conversation: { findMany: conversationFindMany },
    } as unknown as PrismaService;
    const repository = new MessagingRepository(prisma);

    await expect(repository.countSupportNeedsReply()).resolves.toBe(3);

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(conversationFindMany).not.toHaveBeenCalled();
    const query = (queryRaw.mock.calls as Array<[Prisma.Sql]>)[0][0];
    expect(query.sql).toContain('DISTINCT ON');
    expect(query.sql).toContain('ConversationParticipant');
  });

  it('shadow-checks the old support reply classification on local fixtures', () => {
    const fixtures: SupportFixture[] = [
      {
        conversationType: 'SUPPORT',
        conversationStatus: 'OPEN',
        ticketStatus: 'OPEN',
        messages: [
          {
            id: 'patient-1',
            senderUserId: 'patient-1',
            sentAt: '2026-10-01T10:00:00.000Z',
          },
        ],
        participants: [
          { userId: 'patient-1', participantRole: 'PATIENT', isActive: true },
        ],
      },
      {
        conversationType: 'SUPPORT',
        conversationStatus: 'OPEN',
        ticketStatus: 'OPEN',
        messages: [
          {
            id: 'agent-1',
            senderUserId: 'agent-1',
            sentAt: '2026-10-01T10:00:00.000Z',
          },
        ],
        participants: [
          {
            userId: 'agent-1',
            participantRole: 'SUPPORT_AGENT',
            isActive: true,
          },
        ],
      },
      {
        conversationType: 'SUPPORT',
        conversationStatus: 'OPEN',
        ticketStatus: 'OPEN',
        messages: [],
        participants: [],
      },
      {
        conversationType: 'SUPPORT',
        conversationStatus: 'CLOSED',
        ticketStatus: 'OPEN',
        messages: [],
        participants: [],
      },
      {
        conversationType: 'SUPPORT',
        conversationStatus: 'OPEN',
        ticketStatus: 'RESOLVED',
        messages: [],
        participants: [],
      },
      {
        conversationType: 'GENERAL',
        conversationStatus: 'OPEN',
        ticketStatus: 'OPEN',
        messages: [],
        participants: [],
      },
    ];

    expect(fixtures.filter(oldSupportNeedsReplySemantics)).toHaveLength(2);
  });

  it('acknowledges a large reconnect in bounded batches without retaining all ids', async () => {
    const firstBatch = Array.from({ length: 500 }, (_, index) => ({
      id: `message-${index}`,
    }));
    const secondBatch = Array.from({ length: 500 }, (_, index) => ({
      id: `message-${index + 500}`,
    }));
    const findMany = jest
      .fn()
      .mockResolvedValueOnce(firstBatch)
      .mockResolvedValueOnce(secondBatch)
      .mockResolvedValueOnce([]);
    const updateMany = jest.fn().mockResolvedValue({ count: 500 });
    const deliveredBatches: Array<
      Array<{
        messageId: string;
        conversationId: string;
        deliveredAt: Date;
      }>
    > = [];
    const onBatch = (
      batch: Array<{
        messageId: string;
        conversationId: string;
        deliveredAt: Date;
      }>,
    ) => {
      deliveredBatches.push(batch);
    };
    const prisma = {
      message: { findMany, updateMany },
    } as unknown as PrismaService;
    const repository = new MessagingRepository(prisma);

    await expect(
      repository.markMessagesDeliveredForRecipient(
        {
          conversationId: 'conversation-1',
          recipientUserId: 'recipient-1',
          deliveredAt: new Date('2026-10-01T10:00:00.000Z'),
        },
        onBatch,
      ),
    ).resolves.toBe(1000);

    expect(findMany).toHaveBeenCalledTimes(3);
    expect(findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ take: 500 }),
    );
    expect(updateMany).toHaveBeenCalledTimes(2);
    const updateCalls = updateMany.mock.calls as Array<
      [
        {
          where: { status: MessageStatus };
          data: { status: MessageStatus };
        },
      ]
    >;
    expect(updateCalls[0][0].where.status).toBe(MessageStatus.SENT);
    expect(updateCalls[0][0].data.status).toBe(MessageStatus.DELIVERED);
    expect(deliveredBatches).toHaveLength(2);
    expect(deliveredBatches[0]).toHaveLength(500);
    expect(deliveredBatches[1]).toHaveLength(500);
    const findCalls = findMany.mock.calls as Array<
      [{ where: { visibility: MessageVisibility } }]
    >;
    expect(findCalls[0][0].where.visibility).toBe(MessageVisibility.NORMAL);
  });

  it('keeps repeated acknowledgement idempotent after the first pass', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'message-1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      message: { findMany, updateMany },
    } as unknown as PrismaService;
    const repository = new MessagingRepository(prisma);
    const input = {
      conversationId: 'conversation-1',
      recipientUserId: 'recipient-1',
      deliveredAt: new Date('2026-10-01T10:00:00.000Z'),
    };

    await repository.markMessagesDeliveredForRecipient(input);
    await repository.markMessagesDeliveredForRecipient(input);

    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledTimes(3);
  });
});
