import { SupportTicketPriority } from '@prisma/client';
import { SupportPresenter } from './support.presenter';

describe('SupportPresenter', () => {
  let presenter: SupportPresenter;

  beforeEach(() => {
    presenter = new SupportPresenter();
  });

  it('does not expose internal notes in user-facing ticket details', () => {
    const result = presenter.presentUserTicketDetails({
      id: 'ticket-1',
      ticketType: 'PAYMENT',
      subject: 'subject',
      status: 'OPEN',
      priority: SupportTicketPriority.NORMAL,
      assignedToUserId: null,
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
        participants: [{ userId: 'user-1', participantRole: 'PATIENT' }],
        messages: [
          {
            id: 'msg-1',
            senderUserId: 'user-1',
            contentText: 'hello',
            sentAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
      },
    });

    expect(
      (result as { internalNotes?: unknown }).internalNotes,
    ).toBeUndefined();
    expect(result.messages).toHaveLength(1);
  });
});
