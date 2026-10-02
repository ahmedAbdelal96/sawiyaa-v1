import { SessionMapper } from './session.mapper';

describe('SessionMapper timeline projection', () => {
  it('projects structured reschedule timestamps without exposing raw metadata', () => {
    const mapper = new SessionMapper();
    const session: any = {
      id: 'session-1',
      sessionCode: 'SES-1',
      status: 'UPCOMING',
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
      scheduledStartAt: new Date('2026-08-08T12:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-08T12:30:00.000Z'),
      durationMinutes: 30,
      sessionMode: 'VIDEO',
      provider: 'NONE',
      providerRoomId: null,
      providerSessionRef: null,
      videoRoomClosedAt: null,
      videoRoomCloseReason: null,
      videoRoomCloseNote: null,
      practitioner: { id: 'practitioner-1', publicSlug: 'dr-test', user: { displayName: 'Dr Test' } },
      patient: { id: 'patient-1', user: { displayName: 'Patient Test' } },
      events: [
        {
          eventType: 'RESCHEDULED',
          occurredAt: new Date('2026-08-07T09:00:00.000Z'),
          createdAt: new Date('2026-08-07T09:00:00.000Z'),
          actorType: 'USER',
          reason: null,
          metadataJson: {
            previousStartAt: '2026-08-06T12:00:00.000Z',
            previousEndAt: '2026-08-06T12:30:00.000Z',
            newStartAt: '2026-08-08T12:00:00.000Z',
            newEndAt: '2026-08-08T12:30:00.000Z',
            internalSessionId: 'must-not-leak',
          },
        },
      ],
      payments: [],
      conversations: [],
      reviews: [],
      packagePurchase: null,
      corporateSponsorship: null,
    };

    const result = mapper.toDetails(session, new Date('2026-08-07T10:00:00.000Z')) as any;
    expect(result.timeline).toEqual([
      {
        eventType: 'RESCHEDULED',
        occurredAt: '2026-08-07T09:00:00.000Z',
        actorType: 'USER',
        reason: null,
        previousStartAt: '2026-08-06T12:00:00.000Z',
        previousEndAt: '2026-08-06T12:30:00.000Z',
        newStartAt: '2026-08-08T12:00:00.000Z',
        newEndAt: '2026-08-08T12:30:00.000Z',
      },
    ]);
    expect(JSON.stringify(result.timeline)).not.toContain('must-not-leak');
  });
});
