import {
  InstantBookingRequest,
  SessionFlowType,
  SessionMode,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';
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
    const service = new CreateSessionFromInstantBookingService(
      prisma,
      sessionRepository,
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

    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        flowType: SessionFlowType.INSTANT,
        status: SessionStatus.PENDING_PAYMENT,
        requestedStartAt: new Date('2026-08-10T07:00:00.000Z'),
        scheduledStartAt: new Date('2026-08-10T07:00:00.000Z'),
        scheduledEndAt: new Date('2026-08-10T07:30:00.000Z'),
        timezoneSnapshot: 'Africa/Cairo',
      }),
      expect.anything(),
      'instant_booking',
    );
  });
});
