import { NotFoundException } from '@nestjs/common';
import { PractitionerMarketingPlacementRepository } from '@modules/marketing-practitioner-placements/repositories/practitioner-marketing-placement.repository';
import { PatientJourneyPatientRepository } from '../repositories/patient-journey-patient.repository';
import { PatientHomeRepository } from '../repositories/patient-home.repository';
import { GetMyPatientHomeUseCase } from './get-my-patient-home.use-case';

describe('GetMyPatientHomeUseCase', () => {
  const patientRepository = {
    findByUserId: jest.fn(),
  } as unknown as PatientJourneyPatientRepository;

  const patientHomeRepository = {
    listRecentlyVisited: jest.fn(),
    listMostBookedToday: jest.fn(),
    listTopRated: jest.fn(),
  } as unknown as PatientHomeRepository;

  const practitionerMarketingPlacementRepository = {
    listActiveHomeFeaturedPractitioners: jest.fn(),
  } as unknown as PractitionerMarketingPlacementRepository;

  const useCase = new GetMyPatientHomeUseCase(
    patientRepository,
    patientHomeRepository,
    practitionerMarketingPlacementRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws not found when patient profile does not exist', async () => {
    (patientRepository.findByUserId as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: 'missing', locale: 'ar', requestCountryIsoCode: 'EG' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns featured module and max 5 recently visited items ordered by latest first with dedupe', async () => {
    (patientRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      user: { timezone: 'Africa/Cairo' },
    });

    const now = new Date('2026-05-26T12:00:00.000Z');
    (
      practitionerMarketingPlacementRepository.listActiveHomeFeaturedPractitioners as jest.Mock
    ).mockResolvedValue([
      {
        ...buildRow('featured-1', now),
        badgeLabel: 'مميز',
      },
    ]);
    (patientHomeRepository.listRecentlyVisited as jest.Mock).mockResolvedValue([
      buildRow('slug-1', new Date('2026-05-26T12:00:00.000Z')),
      buildRow('slug-2', new Date('2026-05-26T11:50:00.000Z')),
      buildRow('slug-1', new Date('2026-05-26T11:40:00.000Z')),
      buildRow('slug-3', new Date('2026-05-26T11:30:00.000Z')),
      buildRow('slug-4', new Date('2026-05-26T11:20:00.000Z')),
      buildRow('slug-5', new Date('2026-05-26T11:10:00.000Z')),
      buildRow('slug-6', new Date('2026-05-26T11:00:00.000Z')),
    ]);
    (patientHomeRepository.listMostBookedToday as jest.Mock).mockResolvedValue([
      buildRow('booked-1', now),
    ]);
    (patientHomeRepository.listTopRated as jest.Mock).mockResolvedValue([
      buildRow('rated-1', now),
    ]);

    const result = await useCase.execute({ userId: 'user-1', locale: 'ar', requestCountryIsoCode: 'EG' });

    expect(result.featuredPractitioners.status).toBe('IMPLEMENTED');
    expect(result.featuredPractitioners.items).toHaveLength(1);
    expect(result.recentlyVisitedPractitioners.items).toHaveLength(5);
    expect(
      result.recentlyVisitedPractitioners.items.map((item) => item.slug),
    ).toEqual(['slug-1', 'slug-2', 'slug-3', 'slug-4', 'slug-5']);
    expect(result.recentlyVisitedPractitioners.items[0]?.lastViewedAt).toBe(
      now.toISOString(),
    );
    expect(result.mostBookedTodayPractitioners.status).toBe('IMPLEMENTED');
    expect(result.topRatedPractitioners.status).toBe('IMPLEMENTED');
    expect(result.mostBookedTodayPractitioners.items).toHaveLength(1);
    expect(result.topRatedPractitioners.items).toHaveLength(1);
    expect(patientHomeRepository.listMostBookedToday).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
      }),
    );
    expect(patientHomeRepository.listTopRated).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 5,
        minimumReviews: 5,
        priorReviews: 20,
      }),
    );
    expect(
      practitionerMarketingPlacementRepository.listActiveHomeFeaturedPractitioners,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 5,
      }),
    );
    expect(result.matchingCard.ctaKey).toBe('MATCHING_INTRO');
    expect(result.supportCard.ctaKey).toBe('SUPPORT_HOME');
  });
});

function buildRow(slug: string, lastViewedAt: Date) {
  return {
    practitionerId: `practitioner-${slug}`,
    slug,
    displayName: `Name ${slug}`,
    professionalTitle: 'Title',
    avatarUrl: null,
    primarySpecialty: 'Specialty',
    averageRating: 4.5,
    totalReviews: 10,
    displaySessionPrice30: 300,
    displaySessionPrice60: 500,
    isVerified: true,
    lastViewedAt,
  };
}
