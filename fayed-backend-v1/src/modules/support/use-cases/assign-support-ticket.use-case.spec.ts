import { BadRequestException } from '@nestjs/common';
import { SupportTicketPriority } from '@prisma/client';
import { SupportPresenter } from '../presenters/support.presenter';
import { SupportActorRepository } from '../repositories/support-actor.repository';
import { SupportTicketRepository } from '../repositories/support-ticket.repository';
import { ResolveSupportAdminActorRoleService } from '../services/resolve-support-admin-actor-role.service';
import { AssignSupportTicketUseCase } from './assign-support-ticket.use-case';

describe('AssignSupportTicketUseCase', () => {
  it('rejects assigning to non-support/admin users', async () => {
    const ticketRepository = {
      findByIdForAdmin: jest.fn().mockResolvedValue({
        id: 'ticket-1',
      }),
    } as unknown as SupportTicketRepository;

    const actorRepository = {
      isSupportAssignableUser: jest.fn().mockResolvedValue(0),
    } as unknown as SupportActorRepository;

    const useCase = new AssignSupportTicketUseCase(
      ticketRepository,
      actorRepository,
      new ResolveSupportAdminActorRoleService(),
      new SupportPresenter(),
    );

    await expect(
      useCase.execute({
        userId: 'admin-1',
        roles: ['ADMIN'] as never,
        ticketId: 'ticket-1',
        payload: {
          assignedAdminUserId: 'user-2',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('assigns ticket when assignee is valid support/admin actor', async () => {
    const ticketRepository = {
      findByIdForAdmin: jest.fn().mockResolvedValue({
        id: 'ticket-1',
      }),
      assignTicket: jest.fn().mockResolvedValue({
        id: 'ticket-1',
        ticketType: 'PAYMENT',
        subject: 'subject',
        status: 'OPEN',
        priority: SupportTicketPriority.NORMAL,
        assignedToUserId: 'user-2',
        description: 'desc',
        relatedSessionId: null,
        relatedPaymentId: null,
        relatedInstantBookingRequestId: null,
        relatedMatchingSessionId: null,
        relatedAssessmentSubmissionId: null,
        lastMessageAt: new Date('2026-01-01T00:00:00.000Z'),
        resolvedAt: null,
        closedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        conversation: {
          participants: [{ userId: 'admin-1', participantRole: 'ADMIN' }],
          messages: [],
          internalNotes: [],
        },
      }),
    } as unknown as SupportTicketRepository;

    const actorRepository = {
      isSupportAssignableUser: jest.fn().mockResolvedValue(1),
    } as unknown as SupportActorRepository;

    const useCase = new AssignSupportTicketUseCase(
      ticketRepository,
      actorRepository,
      new ResolveSupportAdminActorRoleService(),
      new SupportPresenter(),
    );

    const result = await useCase.execute({
      userId: 'admin-1',
      roles: ['ADMIN'] as never,
      ticketId: 'ticket-1',
      payload: {
        assignedAdminUserId: 'user-2',
      },
    });

    expect(result.item.assignedAdminUserId).toBe('user-2');
  });
});
