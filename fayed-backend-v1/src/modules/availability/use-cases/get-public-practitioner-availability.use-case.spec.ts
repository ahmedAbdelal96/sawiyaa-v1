import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { AvailabilityPractitionerRepository } from '../repositories/availability-practitioner.repository';
import { PractitionerAvailabilityWeekRepository } from '../repositories/practitioner-availability-week.repository';
import { AvailabilityWeekCalendarService } from '../services/availability-week-calendar.service';
import { AvailabilityWeekMapper } from '../mappers/availability-week.mapper';
import { ResolvePractitionerTimezoneService } from '../services/resolve-practitioner-timezone.service';
import { GetPublicPractitionerAvailabilityUseCase } from './get-public-practitioner-availability.use-case';

describe('GetPublicPractitionerAvailabilityUseCase', () => {
  const availabilityPractitionerRepository = {
    findByPublicSlug: jest.fn(),
  };
  const practitionerAvailabilityWeekRepository = {
    findPublishedByPractitionerAndWeekStarts: jest.fn(),
  };
  const availabilityWeekCalendarService = {
    resolveCurrentAndNextWeekWindow: jest.fn(),
  };
  const availabilityWeekMapper = new AvailabilityWeekMapper();
  const resolvePractitionerTimezoneService = {
    resolve: jest.fn().mockReturnValue('UTC'),
  };
  const publicPractitionerVisibilityPolicy = {
    evaluate: jest.fn().mockReturnValue({ isVisible: true }),
  };

  const useCase = new GetPublicPractitionerAvailabilityUseCase(
    availabilityPractitionerRepository as unknown as AvailabilityPractitionerRepository,
    practitionerAvailabilityWeekRepository as unknown as PractitionerAvailabilityWeekRepository,
    availabilityWeekCalendarService as unknown as AvailabilityWeekCalendarService,
    availabilityWeekMapper,
    resolvePractitionerTimezoneService as unknown as ResolvePractitionerTimezoneService,
    publicPractitionerVisibilityPolicy as unknown as PublicPractitionerVisibilityPolicy,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns published current and next week slots only', async () => {
    availabilityPractitionerRepository.findByPublicSlug.mockResolvedValue({
      id: 'practitioner-1',
      status: 'APPROVED',
      user: {
        status: 'ACTIVE',
        displayName: 'Dr. Example',
        timezone: 'UTC',
      },
      isPublicProfilePublished: true,
      publicSlug: 'dr-example',
      professionalTitle: 'Therapist',
      bio: 'Bio',
      specialties: [{ id: 'spec-1' }],
    });
    availabilityWeekCalendarService.resolveCurrentAndNextWeekWindow.mockReturnValue(
      {
        currentWeek: {
          startDate: new Date('2026-06-21T00:00:00.000Z'),
          endDate: new Date('2026-06-27T00:00:00.000Z'),
          startDateIso: '2026-06-21',
          endDateIso: '2026-06-27',
        },
        nextWeek: {
          startDate: new Date('2026-06-28T00:00:00.000Z'),
          endDate: new Date('2026-07-04T00:00:00.000Z'),
          startDateIso: '2026-06-28',
          endDateIso: '2026-07-04',
        },
      },
    );
    practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts.mockResolvedValue(
      [
        {
          id: 'week-current',
          weekStartDate: new Date('2026-06-21T00:00:00.000Z'),
          weekEndDate: new Date('2026-06-27T00:00:00.000Z'),
          timezone: 'UTC',
          slots: [
            {
              id: 'slot-current',
              weekday: 'SUNDAY',
              startMinuteOfDay: 600,
              endMinuteOfDay: 660,
              durationMinutes: 30,
              timezone: 'UTC',
            },
          ],
        },
        {
          id: 'week-next',
          weekStartDate: new Date('2026-06-28T00:00:00.000Z'),
          weekEndDate: new Date('2026-07-04T00:00:00.000Z'),
          timezone: 'UTC',
          slots: [
            {
              id: 'slot-current-copy',
              weekday: 'SUNDAY',
              startMinuteOfDay: 600,
              endMinuteOfDay: 660,
              durationMinutes: 30,
              timezone: 'UTC',
            },
            {
              id: 'slot-next-only',
              weekday: 'SUNDAY',
              startMinuteOfDay: 780,
              endMinuteOfDay: 840,
              durationMinutes: 30,
              timezone: 'UTC',
            },
          ],
        },
      ],
    );

    const result = await useCase.execute({
      slug: 'dr-example',
    });

    expect(practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts).toHaveBeenCalledWith(
      'practitioner-1',
      [
        new Date('2026-06-21T00:00:00.000Z'),
        new Date('2026-06-28T00:00:00.000Z'),
      ],
    );
    expect(result).toEqual({
      timezone: 'UTC',
      weeklySlots: [
        {
          id: 'slot-current',
          dayOfWeek: 0,
          weekday: 'SUNDAY',
          startMinuteOfDay: 600,
          endMinuteOfDay: 660,
          durationMinutes: 30,
          timezone: 'UTC',
          isActive: true,
          effectiveFrom: '2026-06-21',
          effectiveTo: '2026-06-27',
        },
        {
          id: 'slot-next-only',
          dayOfWeek: 0,
          weekday: 'SUNDAY',
          startMinuteOfDay: 780,
          endMinuteOfDay: 840,
          durationMinutes: 30,
          timezone: 'UTC',
          isActive: true,
          effectiveFrom: '2026-06-28',
          effectiveTo: '2026-07-04',
        },
      ],
    });
  });

  it('returns a clean empty summary when no published week exists', async () => {
    availabilityPractitionerRepository.findByPublicSlug.mockResolvedValue({
      id: 'practitioner-1',
      status: 'APPROVED',
      user: {
        status: 'ACTIVE',
        displayName: 'Dr. Example',
        timezone: 'UTC',
      },
      isPublicProfilePublished: true,
      publicSlug: 'dr-example',
      professionalTitle: 'Therapist',
      bio: 'Bio',
      specialties: [{ id: 'spec-1' }],
    });
    availabilityWeekCalendarService.resolveCurrentAndNextWeekWindow.mockReturnValue(
      {
        currentWeek: {
          startDate: new Date('2026-06-21T00:00:00.000Z'),
          endDate: new Date('2026-06-27T00:00:00.000Z'),
          startDateIso: '2026-06-21',
          endDateIso: '2026-06-27',
        },
        nextWeek: {
          startDate: new Date('2026-06-28T00:00:00.000Z'),
          endDate: new Date('2026-07-04T00:00:00.000Z'),
          startDateIso: '2026-06-28',
          endDateIso: '2026-07-04',
        },
      },
    );
    practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts.mockResolvedValue(
      [],
    );

    const result = await useCase.execute({
      slug: 'dr-example',
    });

    expect(result).toEqual({
      timezone: 'UTC',
      weeklySlots: [],
    });
  });
});
