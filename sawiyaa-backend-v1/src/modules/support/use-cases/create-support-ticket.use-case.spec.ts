import { SupportTicketPriority } from '@prisma/client';
import { SupportPresenter } from '../presenters/support.presenter';
import { SupportActorRepository } from '../repositories/support-actor.repository';
import { SupportTicketRepository } from '../repositories/support-ticket.repository';
import { ValidateSupportLinkedEntitiesService } from '../services/validate-support-linked-entities.service';
import { CreateSupportTicketUseCase } from './create-support-ticket.use-case';

describe('CreateSupportTicketUseCase', () => {
  it('creates patient ticket with deterministic contract', async () => {
    const actorRepository = {
      findPatientProfileByUserId: jest
        .fn()
        .mockResolvedValue({ id: 'patient-1' }),
      findPractitionerProfileByUserId: jest.fn(),
    } as unknown as SupportActorRepository;

    const ticketRepository = {
      createTicket: jest.fn().mockResolvedValue({
        id: 'ticket-1',
        ticketType: 'PAYMENT',
        subject: 'Payment problem',
        status: 'OPEN',
        priority: SupportTicketPriority.NORMAL,
        assignedToUserId: null,
        description: 'Failed checkout',
        relatedSessionId: null,
        relatedPaymentId: 'pay-1',
        relatedInstantBookingRequestId: null,
        relatedMatchingSessionId: null,
        relatedAssessmentSubmissionId: null,
        lastMessageAt: new Date('2026-01-01T00:00:00.000Z'),
        resolvedAt: null,
        closedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        conversation: {
          participants: [{ userId: 'user-1', participantRole: 'PATIENT' }],
          messages: [
            {
              id: 'msg-1',
              senderUserId: 'user-1',
              contentText: 'Failed checkout',
              sentAt: new Date('2026-01-01T00:00:00.000Z'),
            },
          ],
          internalNotes: [],
        },
      }),
    } as unknown as SupportTicketRepository;

    const linkedValidation = {
      validate: jest.fn().mockResolvedValue(undefined),
    } as unknown as ValidateSupportLinkedEntitiesService;

    const useCase = new CreateSupportTicketUseCase(
      actorRepository,
      ticketRepository,
      linkedValidation,
      new SupportPresenter(),
    );

    const result = await useCase.execute({
      actorKind: 'PATIENT',
      userId: 'user-1',
      payload: {
        category: 'PAYMENT',
        subject: 'Payment problem',
        description: 'Failed checkout',
        relatedPaymentId: 'pay-1',
      } as never,
    });

    expect(linkedValidation.validate).toHaveBeenCalledTimes(1);
    expect(ticketRepository.createTicket).toHaveBeenCalledTimes(1);
    expect(result.item.id).toBe('ticket-1');
    expect(result.item.messages).toHaveLength(1);
  });

  it('creates practitioner tickets through the same canonical creation contract', async () => {
    const actorRepository = {
      findPatientProfileByUserId: jest.fn(),
      findPractitionerProfileByUserId: jest
        .fn()
        .mockResolvedValue({ id: 'practitioner-1' }),
    } as unknown as SupportActorRepository;
    const ticketRepository = {
      createTicket: jest.fn().mockResolvedValue({
        id: 'ticket-2',
        ticketType: 'TECHNICAL',
        subject: 'Cannot join',
        status: 'OPEN',
        priority: SupportTicketPriority.NORMAL,
        assignedToUserId: null,
        description: 'Cannot join',
        relatedSessionId: null,
        relatedPaymentId: null,
        relatedInstantBookingRequestId: null,
        relatedMatchingSessionId: null,
        relatedAssessmentSubmissionId: null,
        lastMessageAt: new Date(),
        resolvedAt: null,
        closedAt: null,
        createdAt: new Date(),
        conversation: { participants: [], messages: [], internalNotes: [] },
      }),
    } as unknown as SupportTicketRepository;
    const linkedValidation = { validate: jest.fn() } as unknown as ValidateSupportLinkedEntitiesService;
    const useCase = new CreateSupportTicketUseCase(
      actorRepository,
      ticketRepository,
      linkedValidation,
      new SupportPresenter(),
    );

    await useCase.execute({
      actorKind: 'PRACTITIONER',
      userId: 'practitioner-user-1',
      payload: { category: 'TECHNICAL', description: 'Cannot join' } as never,
    });

    expect(ticketRepository.createTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        openedByUserId: 'practitioner-user-1',
        practitionerProfileId: 'practitioner-1',
        createdByRole: 'PRACTITIONER',
        subject: 'Cannot join',
      }),
    );
  });
});
