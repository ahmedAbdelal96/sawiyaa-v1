import { GetPublicPractitionerInstantBookingAvailabilityUseCase } from './get-public-practitioner-instant-booking-availability.use-case';

describe('GetPublicPractitionerInstantBookingAvailabilityUseCase', () => {
  const practitionerRepository = { findByPublicSlug: jest.fn() };
  const eligibilityService = {
    assertPractitionerCanReceiveInstantBooking: jest.fn(),
  };
  const useCase = new GetPublicPractitionerInstantBookingAvailabilityUseCase(
    practitionerRepository as never,
    eligibilityService as never,
  );

  const practitioner = {
    id: 'practitioner-1',
    status: 'APPROVED',
    isPublicProfilePublished: true,
    publicSlug: 'dr-example',
    professionalTitle: 'Therapist',
    bio: 'Bio',
    user: { status: 'ACTIVE', displayName: 'Doctor', timezone: 'Africa/Cairo' },
    specialties: [{ specialtyId: 'specialty-1' }],
    instantBookingPrice30Usd: '31',
    instantBookingPrice60Usd: '56',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    practitionerRepository.findByPublicSlug.mockResolvedValue(practitioner);
    eligibilityService.assertPractitionerCanReceiveInstantBooking.mockResolvedValue({});
  });

  it('returns both duration buckets when the shared eligibility service allows both', async () => {
    const result = await useCase.execute({ slug: 'dr-example', locale: 'en' });

    expect(result.availableNow).toBe(true);
    expect(result.durations).toEqual({ 30: true, 60: true });
    expect(result).not.toHaveProperty('activeSessionId');
    expect(eligibilityService.assertPractitionerCanReceiveInstantBooking).toHaveBeenCalledTimes(2);
  });

  it('fails closed per duration when the shared service detects a conflict', async () => {
    eligibilityService.assertPractitionerCanReceiveInstantBooking
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('conflict'));

    const result = await useCase.execute({ slug: 'dr-example', locale: 'en' });

    expect(result).toMatchObject({
      availableNow: true,
      durations: { 30: true, 60: false },
    });
  });
});
