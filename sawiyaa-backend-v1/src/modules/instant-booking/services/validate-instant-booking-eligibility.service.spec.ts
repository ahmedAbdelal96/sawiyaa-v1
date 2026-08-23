import { PresenceStatus, SessionMode } from '@prisma/client';
import { ConflictException } from '@nestjs/common';
import { ValidateInstantBookingEligibilityService } from './validate-instant-booking-eligibility.service';

describe('ValidateInstantBookingEligibilityService', () => {
  const visibility = { evaluate: jest.fn() } as any;
  const presence = { createOrGetByPractitionerProfileId: jest.fn() } as any;
  const timezone = { resolve: jest.fn() } as any;
  const duration = { validate: jest.fn() } as any;
  const conflicts = { assertNoPractitionerConflict: jest.fn() } as any;
  const service = new ValidateInstantBookingEligibilityService(visibility, presence, timezone, duration, conflicts);

  const baseInput = {
    practitioner: {
      id: 'practitioner-1', status: 'APPROVED', isPublicProfilePublished: true,
      publicSlug: 'dr-youssef', professionalTitle: 'Therapist', bio: 'Bio',
      user: { status: 'ACTIVE', displayName: 'Doctor Name', timezone: 'Africa/Cairo' },
      specialties: [{ specialtyId: 'specialty-1' }],
      instantBookingPrice30Egp: '410.00', instantBookingPrice30Usd: '24.00',
      instantBookingPrice60Egp: '720.00', instantBookingPrice60Usd: '42.00',
    },
    durationMinutes: 30, sessionMode: SessionMode.VIDEO,
    nowUtc: new Date('2026-05-07T12:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    visibility.evaluate.mockReturnValue({ isVisible: true });
    presence.createOrGetByPractitionerProfileId.mockResolvedValue({ status: PresenceStatus.ONLINE, isInstantBookingEnabled: true, lastSeenAtUtc: new Date('2026-05-07T11:59:30.000Z') });
    timezone.resolve.mockReturnValue('Africa/Cairo');
    duration.validate.mockReturnValue(undefined);
    conflicts.assertNoPractitionerConflict.mockResolvedValue(undefined);
  });

  it('rejects stale online presence', async () => {
    presence.createOrGetByPractitionerProfileId.mockResolvedValueOnce({ status: PresenceStatus.ONLINE, isInstantBookingEnabled: true, lastSeenAtUtc: new Date('2026-05-07T11:55:00.000Z') });
    await expect(service.assertPractitionerCanReceiveInstantBooking(baseInput)).rejects.toMatchObject({ response: { error: 'INSTANT_BOOKING_PRACTITIONER_NOT_ONLINE' } });
  });

  it('allows instant booking with the requested instant price', async () => {
    await expect(service.assertPractitionerCanReceiveInstantBooking({ ...baseInput, currencyCode: 'EGP' })).resolves.toMatchObject({ startsAtUtc: new Date('2026-05-07T12:00:00.000Z'), endsAtUtc: new Date('2026-05-07T12:30:00.000Z') });
    expect(conflicts.assertNoPractitionerConflict).toHaveBeenCalledWith(expect.objectContaining({ practitionerId: 'practitioner-1' }));
  });

  it('rejects when the requested duration/currency instant price is missing', async () => {
    await expect(service.assertPractitionerCanReceiveInstantBooking({ ...baseInput, currencyCode: 'EGP', practitioner: { ...baseInput.practitioner, instantBookingPrice30Egp: null } })).rejects.toMatchObject({ response: { error: 'INSTANT_BOOKING_PRICE_UNAVAILABLE' } });
  });

  it('rejects busy practitioners before accepting a request', async () => {
    presence.createOrGetByPractitionerProfileId.mockResolvedValueOnce({ status: PresenceStatus.BUSY, isInstantBookingEnabled: true, lastSeenAtUtc: new Date('2026-05-07T11:59:30.000Z') });
    await expect(service.assertPractitionerCanReceiveInstantBooking(baseInput)).rejects.toMatchObject({ response: { error: 'INSTANT_BOOKING_PRACTITIONER_BUSY' } });
  });
});
