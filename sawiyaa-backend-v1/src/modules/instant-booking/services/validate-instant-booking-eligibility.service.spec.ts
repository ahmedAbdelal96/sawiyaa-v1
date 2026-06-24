import { PresenceStatus, SessionMode } from '@prisma/client';
import { ValidateInstantBookingEligibilityService } from './validate-instant-booking-eligibility.service';

describe('ValidateInstantBookingEligibilityService', () => {
  const publicPractitionerVisibilityPolicy = {
    evaluate: jest.fn(),
  } as never;
  const practitionerPresenceRepository = {
    createOrGetByPractitionerProfileId: jest.fn(),
  } as never;
  const availabilitySlotRepository = {
    listActiveByPractitioner: jest.fn(),
  } as never;
  const availabilityExceptionRepository = {
    listActiveForRange: jest.fn(),
  } as never;
  const resolvePractitionerTimezoneService = {
    resolve: jest.fn(),
  } as never;
  const buildAvailabilityWindowsService = {
    buildForRange: jest.fn(),
  } as never;
  const validateSessionDurationService = {
    validate: jest.fn(),
  } as never;
  const validateSessionConflictsService = {
    assertNoPractitionerConflict: jest.fn(),
  } as never;

  const service = new ValidateInstantBookingEligibilityService(
    publicPractitionerVisibilityPolicy,
    practitionerPresenceRepository,
    availabilitySlotRepository,
    availabilityExceptionRepository,
    resolvePractitionerTimezoneService,
    buildAvailabilityWindowsService,
    validateSessionDurationService,
    validateSessionConflictsService,
  );

  const baseInput = {
    practitioner: {
      id: 'practitioner-1',
      status: 'APPROVED',
      isPublicProfilePublished: true,
      publicSlug: 'dr-youssef',
      professionalTitle: 'Therapist',
      bio: 'Bio',
      user: {
        status: 'ACTIVE',
        displayName: 'Doctor Name',
        timezone: 'Africa/Cairo',
      },
      specialties: [{ specialtyId: 'specialty-1' }],
    },
    durationMinutes: 30,
    sessionMode: SessionMode.VIDEO,
    nowUtc: new Date('2026-05-07T12:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (publicPractitionerVisibilityPolicy.evaluate as jest.Mock).mockReturnValue({
      isVisible: true,
    });
    (
      practitionerPresenceRepository.createOrGetByPractitionerProfileId as jest.Mock
    ).mockResolvedValue({
      status: PresenceStatus.ONLINE,
      isInstantBookingEnabled: true,
      lastSeenAtUtc: new Date('2026-05-07T11:59:30.000Z'),
    });
    (
      availabilitySlotRepository.listActiveByPractitioner as jest.Mock
    ).mockResolvedValue([{ id: 'slot-1' }]);
    (
      availabilityExceptionRepository.listActiveForRange as jest.Mock
    ).mockResolvedValue([]);
    (resolvePractitionerTimezoneService.resolve as jest.Mock).mockReturnValue(
      'Africa/Cairo',
    );
    (
      buildAvailabilityWindowsService.buildForRange as jest.Mock
    ).mockReturnValue([
      {
        startsAt: '2026-05-07T12:00:00.000Z',
        endsAt: '2026-05-07T12:30:00.000Z',
      },
    ]);
    (validateSessionDurationService.validate as jest.Mock).mockReturnValue(
      undefined,
    );
    (
      validateSessionConflictsService.assertNoPractitionerConflict as jest.Mock
    ).mockResolvedValue(undefined);
  });

  it('rejects stale presence even when the stored status is ONLINE', async () => {
    (
      practitionerPresenceRepository.createOrGetByPractitionerProfileId as jest.Mock
    ).mockResolvedValueOnce({
      status: PresenceStatus.ONLINE,
      isInstantBookingEnabled: true,
      lastSeenAtUtc: new Date('2026-05-07T11:55:00.000Z'),
    });

    await expect(
      service.assertPractitionerCanReceiveInstantBooking(baseInput),
    ).rejects.toMatchObject({
      response: {
        error: 'INSTANT_BOOKING_PRACTITIONER_NOT_ONLINE',
      },
    });
  });

  it('allows instant booking when presence is fresh and online', async () => {
    await expect(
      service.assertPractitionerCanReceiveInstantBooking(baseInput),
    ).resolves.toMatchObject({
      startsAtUtc: new Date('2026-05-07T12:00:00.000Z'),
      endsAtUtc: new Date('2026-05-07T12:30:00.000Z'),
      timezone: 'Africa/Cairo',
    });

    expect(resolvePractitionerTimezoneService.resolve).toHaveBeenCalledWith({
      weeklySlots: [{ id: 'slot-1' }],
      fallbackTimezone: 'Africa/Cairo',
    });
  });

  it('rejects when the instant slot is outside the current availability window', async () => {
    (
      buildAvailabilityWindowsService.buildForRange as jest.Mock
    ).mockReturnValueOnce([]);

    await expect(
      service.assertPractitionerCanReceiveInstantBooking(baseInput),
    ).rejects.toMatchObject({
      response: {
        error: 'INSTANT_BOOKING_PRACTITIONER_NOT_AVAILABLE_NOW',
      },
    });
  });

  it('rejects when a session conflict blocks the instant slot', async () => {
    (
      validateSessionConflictsService.assertNoPractitionerConflict as jest.Mock
    ).mockRejectedValueOnce(new Error('conflict'));

    await expect(
      service.assertPractitionerCanReceiveInstantBooking(baseInput),
    ).rejects.toBeInstanceOf(Error);
  });
});
