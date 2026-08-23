import {
  InstantBookingRequest,
  SessionFlowType,
  SessionMode,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';
import { InstantBookingPolicyService } from './instant-booking-policy.service';
import { CreateSessionFromInstantBookingService } from './create-session-from-instant-booking.service';

describe('CreateSessionFromInstantBookingService', () => {
  it('creates an ordinary UTC session with the practitioner timezone snapshot', async () => {
    const createSession = jest.fn().mockResolvedValue({ id: 'session-1' });
    const sessionRepository = {
      createSession,
      createEvent: jest.fn().mockResolvedValue(undefined),
    } as unknown as SessionRepository;
    const prisma = {
      $transaction: jest.fn(
        async (callback: (tx: unknown) => Promise<unknown>) => callback({}),
      ),
    } as unknown as PrismaService;
    const instantBookingPolicyService = {
      paymentWindowMinutes: jest.fn().mockResolvedValue(0),
    } as unknown as InstantBookingPolicyService;
    const service = new CreateSessionFromInstantBookingService(
      prisma,
      sessionRepository,
      instantBookingPolicyService,
    );

    await service.createFromAcceptedRequest({
      request: {
        id: 'instant-request-1',
        patientId: 'patient-1',
        practitionerId: 'practitioner-1',
        preferredMode: SessionMode.VIDEO,
        requestedDurationMinutes: 30,
      } as unknown as InstantBookingRequest,
      actorUserId: 'practitioner-user-1',
      startsAtUtc: new Date('2026-08-10T07:00:00.000Z'),
      endsAtUtc: new Date('2026-08-10T07:30:00.000Z'),
      timezone: 'Africa/Cairo',
    });

    const sessionInput = createSession.mock.calls[0][0];
    expect(sessionInput).toEqual(
      expect.objectContaining({
        flowType: SessionFlowType.INSTANT,
        status: SessionStatus.PENDING_PAYMENT,
        timezoneSnapshot: 'Africa/Cairo',
      }),
    );
    expect(sessionInput.requestedStartAt).toBeInstanceOf(Date);
    expect(sessionInput.scheduledStartAt).toBeInstanceOf(Date);
    expect(sessionInput.scheduledEndAt).toEqual(
      new Date(sessionInput.scheduledStartAt.getTime() + 30 * 60_000),
    );
    expect(sessionInput.scheduledStartAt).toEqual(sessionInput.expiresAt);
    expect(createSession.mock.calls[0][2]).toBe('instant_booking');
  });
});
