import { ConversationParticipantRole, SupportTicketPriority } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SupportTicketRepository } from './support-ticket.repository';

describe('SupportTicketRepository internal notes', () => {
  it('stores an internal note without creating a message', async () => {
    const findUniqueOrThrow = jest
      .fn()
      .mockResolvedValueOnce({ id: 'ticket-1', conversationId: 'conversation-1' })
      .mockResolvedValueOnce({
        id: 'ticket-1',
        priority: SupportTicketPriority.NORMAL,
        conversation: { id: 'conversation-1', messages: [], participants: [], internalNotes: [] },
      });
    const internalNoteCreate = jest.fn().mockResolvedValue({ id: 'note-1' });
    const messageCreate = jest.fn();
    const prisma = {
      $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
        callback({
          supportTicket: { findUniqueOrThrow },
          internalConversationNote: { create: internalNoteCreate },
          supportTicketEvent: { create: jest.fn() },
          message: { create: messageCreate },
        }),
      ),
    } as unknown as PrismaService;

    await new SupportTicketRepository(prisma).addInternalNote({
      ticketId: 'ticket-1',
      actorUserId: 'admin-1',
      actorRole: ConversationParticipantRole.ADMIN,
      note: 'internal note',
    });

    expect(internalNoteCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        conversationId: 'conversation-1',
        createdByUserId: 'admin-1',
        noteText: 'internal note',
      }),
    });
    expect(messageCreate).not.toHaveBeenCalled();
  });

  it('reuses an existing open self-service ticket without creating a conversation', async () => {
    const existingTicket = { id: 'ticket-open', conversationId: 'conversation-open' };
    const queryRaw = jest.fn().mockResolvedValue([]);
    const findFirst = jest.fn().mockResolvedValue(existingTicket);
    const conversationCreate = jest.fn();
    const supportTicketCreate = jest.fn();
    const prisma = {
      $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
        callback({
          $queryRaw: queryRaw,
          supportTicket: { findFirst, create: supportTicketCreate },
          conversation: { create: conversationCreate },
        }),
      ),
    } as unknown as PrismaService;

    const result = await new SupportTicketRepository(prisma).createTicket({
      openedByUserId: 'user-1',
      createdByRole: 'PATIENT',
      actorKind: 'PATIENT',
      patientProfileId: 'patient-1',
      category: 'GENERAL',
      subject: 'Need help',
      description: 'Please help',
      priority: SupportTicketPriority.NORMAL,
    });

    expect(result).toBe(existingTicket);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(conversationCreate).not.toHaveBeenCalled();
    expect(supportTicketCreate).not.toHaveBeenCalled();
  });
});
