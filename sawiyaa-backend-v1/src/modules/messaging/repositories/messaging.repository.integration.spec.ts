import {
  ConversationParticipantRole,
  ConversationStatus,
  ConversationType,
  PrismaClient,
} from '@prisma/client';
import { MessagingUseCase } from '../use-cases/messaging.use-case';
import { MessagingRepository } from './messaging.repository';

const databaseUrl = process.env.MESSAGING_IDEMPOTENCY_TEST_DATABASE_URL;

const describeIntegration = databaseUrl ? describe : describe.skip;

describeIntegration('Messaging idempotency PostgreSQL integration', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  async function createFixture() {
    const user = await prisma.user.create({ data: { displayName: 'Idempotency QA user' } });
    const conversation = await prisma.conversation.create({
      data: { conversationType: ConversationType.SYSTEM, status: ConversationStatus.OPEN },
    });
    await prisma.conversationParticipant.create({
      data: {
        conversationId: conversation.id,
        userId: user.id,
        participantRole: ConversationParticipantRole.PATIENT,
      },
    });
    return { user, conversation };
  }

  async function removeFixture(input: { userId: string; conversationId: string }) {
    await prisma.conversation.delete({ where: { id: input.conversationId } });
    await prisma.user.delete({ where: { id: input.userId } });
  }

  function createUseCase(repository: MessagingRepository) {
    const publisher = { publishNewMessage: jest.fn() };
    const notifications = { notifyConversationMessage: jest.fn().mockResolvedValue(undefined) };
    const useCase = new MessagingUseCase(
      repository,
      { canSend: jest.fn().mockReturnValue({ allowed: true }) } as never,
      { presentMessage: jest.fn((message) => ({ id: message.id, contentText: message.contentText })) } as never,
      notifications as never,
      {} as never,
      { hasPermissions: jest.fn().mockResolvedValue(true) } as never,
      publisher as never,
    );
    return { useCase, publisher };
  }

  it('deduplicates sequential exact retry and publishes once', async () => {
    const fixture = await createFixture();
    const repository = new MessagingRepository(prisma as never);
    const { useCase, publisher } = createUseCase(repository);

    try {
      const first = await useCase.sendMessage(
        { id: fixture.user.id, roles: [] } as never,
        fixture.conversation.id,
        'hello',
        [],
        'sequential-key',
      );
      const retry = await useCase.sendMessage(
        { id: fixture.user.id, roles: [] } as never,
        fixture.conversation.id,
        'hello',
        [],
        'sequential-key',
      );
      const count = await prisma.message.count({ where: { conversationId: fixture.conversation.id } });

      expect(retry.item.id).toBe(first.item.id);
      expect(count).toBe(1);
      expect(publisher.publishNewMessage).toHaveBeenCalledTimes(1);
    } finally {
      await removeFixture({ userId: fixture.user.id, conversationId: fixture.conversation.id });
    }
  });

  it('deduplicates concurrent exact retries and publishes once', async () => {
    const fixture = await createFixture();
    const repository = new MessagingRepository(prisma as never);
    const { useCase, publisher } = createUseCase(repository);

    try {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const results = await Promise.all([
          useCase.sendMessage({ id: fixture.user.id, roles: [] } as never, fixture.conversation.id, `hello-${attempt}`, [], `concurrent-${attempt}`),
          useCase.sendMessage({ id: fixture.user.id, roles: [] } as never, fixture.conversation.id, `hello-${attempt}`, [], `concurrent-${attempt}`),
        ]);
        expect(results[0].item.id).toBe(results[1].item.id);
      }

      const count = await prisma.message.count({ where: { conversationId: fixture.conversation.id } });
      expect(count).toBe(5);
      expect(publisher.publishNewMessage).toHaveBeenCalledTimes(5);
    } finally {
      await removeFixture({ userId: fixture.user.id, conversationId: fixture.conversation.id });
    }
  });

  it('persists one winner and returns a structured conflict for concurrent different payloads', async () => {
    const fixture = await createFixture();
    const repository = new MessagingRepository(prisma as never);
    const { useCase, publisher } = createUseCase(repository);

    try {
      const results = await Promise.allSettled([
        useCase.sendMessage({ id: fixture.user.id, roles: [] } as never, fixture.conversation.id, 'payload-a', [], 'conflict-key'),
        useCase.sendMessage({ id: fixture.user.id, roles: [] } as never, fixture.conversation.id, 'payload-b', [], 'conflict-key'),
      ]);
      const fulfilled = results.filter((result): result is PromiseFulfilledResult<{ item: { id: string } }> => result.status === 'fulfilled');
      const rejected = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
      const count = await prisma.message.count({ where: { conversationId: fixture.conversation.id } });

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason.response).toMatchObject({ errorCode: 'MESSAGE_IDEMPOTENCY_CONFLICT' });
      expect(count).toBe(1);
      expect(publisher.publishNewMessage).toHaveBeenCalledTimes(1);
    } finally {
      await removeFixture({ userId: fixture.user.id, conversationId: fixture.conversation.id });
    }
  });

  it('keeps scope isolation and missing-key compatibility', async () => {
    const first = await createFixture();
    const second = await createFixture();
    const otherSender = await prisma.user.create({ data: { displayName: 'Idempotency QA second sender' } });
    await prisma.conversationParticipant.create({
      data: {
        conversationId: first.conversation.id,
        userId: otherSender.id,
        participantRole: ConversationParticipantRole.PATIENT,
      },
    });
    const repository = new MessagingRepository(prisma as never);

    try {
      const senderScoped = await repository.appendMessage({
        conversationId: first.conversation.id,
        senderUserId: first.user.id,
        senderRole: ConversationParticipantRole.PATIENT,
        message: 'same key',
        clientMessageId: 'scope-key',
        clientMessagePayloadHash: 'a'.repeat(64),
      });
      const otherConversation = await repository.appendMessage({
        conversationId: second.conversation.id,
        senderUserId: second.user.id,
        senderRole: ConversationParticipantRole.PATIENT,
        message: 'same key',
        clientMessageId: 'scope-key',
        clientMessagePayloadHash: 'a'.repeat(64),
      });
      const otherSenderSameConversation = await repository.appendMessage({
        conversationId: first.conversation.id,
        senderUserId: otherSender.id,
        senderRole: ConversationParticipantRole.PATIENT,
        message: 'same key from another sender',
        clientMessageId: 'scope-key',
        clientMessagePayloadHash: 'a'.repeat(64),
      });
      const firstMissing = await repository.appendMessage({
        conversationId: first.conversation.id,
        senderUserId: first.user.id,
        senderRole: ConversationParticipantRole.PATIENT,
        message: 'legacy one',
      });
      const secondMissing = await repository.appendMessage({
        conversationId: first.conversation.id,
        senderUserId: first.user.id,
        senderRole: ConversationParticipantRole.PATIENT,
        message: 'legacy two',
      });
      const count = await prisma.message.count({ where: { conversationId: first.conversation.id } });

      expect(senderScoped.created).toBe(true);
      expect(otherConversation.created).toBe(true);
      expect(otherSenderSameConversation.created).toBe(true);
      expect(firstMissing.created).toBe(true);
      expect(secondMissing.created).toBe(true);
      expect(count).toBe(4);
    } finally {
      await removeFixture({ userId: first.user.id, conversationId: first.conversation.id });
      await removeFixture({ userId: second.user.id, conversationId: second.conversation.id });
      await prisma.user.delete({ where: { id: otherSender.id } });
    }
  });

  it('does not let a known key bypass a closed conversation policy', async () => {
    const fixture = await createFixture();
    const repository = new MessagingRepository(prisma as never);
    const publisher = { publishNewMessage: jest.fn() };
    const useCase = new MessagingUseCase(
      repository,
      { canSend: jest.fn().mockReturnValue({ allowed: false, reason: 'CONVERSATION_CLOSED' }) } as never,
      { presentMessage: jest.fn() } as never,
      { notifyConversationMessage: jest.fn() } as never,
      {} as never,
      { hasPermissions: jest.fn().mockResolvedValue(true) } as never,
      publisher as never,
    );

    try {
      await expect(useCase.sendMessage({ id: fixture.user.id, roles: [] } as never, fixture.conversation.id, 'blocked', [], 'known-key'))
        .rejects.toMatchObject({ response: { errorCode: 'MESSAGING_CONVERSATION_CLOSED' } });
      expect(publisher.publishNewMessage).not.toHaveBeenCalled();
      await expect(prisma.message.count({ where: { conversationId: fixture.conversation.id } })).resolves.toBe(0);
    } finally {
      await removeFixture({ userId: fixture.user.id, conversationId: fixture.conversation.id });
    }
  });
});
