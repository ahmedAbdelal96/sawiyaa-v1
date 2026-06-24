import { SessionStatus } from '@prisma/client';
import { ListPublicPractitionerAvailabilityWindowsUseCase } from './list-public-practitioner-availability-windows.use-case';

describe('ListPublicPractitionerAvailabilityWindowsUseCase', () => {
  const availabilityPractitionerRepository = {
    findByPublicSlug: jest.fn(),
  };
  const availabilitySlotRepository = {
    listActiveByPractitioner: jest.fn(),
  };
  const availabilityExceptionRepository = {
    listActiveForRange: jest.fn(),
  };
  const resolvePractitionerTimezoneService = {
    resolve: jest.fn().mockReturnValue('UTC'),
  };
  const buildAvailabilityWindowsService = {
    buildForRange: jest.fn(),
  };
  const publicPractitionerVisibilityPolicy = {
    evaluate: jest.fn().mockReturnValue({ isVisible: true }),
  };
  const prisma = {
    session: {
      findMany: jest.fn(),
    },
  };

  const useCase = new ListPublicPractitionerAvailabilityWindowsUseCase(
    availabilityPractitionerRepository as any,
    availabilitySlotRepository as any,
    availabilityExceptionRepository as any,
    resolvePractitionerTimezoneService as any,
    buildAvailabilityWindowsService as any,
    publicPractitionerVisibilityPolicy as any,
    prisma as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes overlapping blocking sessions when building public windows', async () => {
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
    availabilitySlotRepository.listActiveByPractitioner.mockResolvedValue([]);
    availabilityExceptionRepository.listActiveForRange.mockResolvedValue([]);
    prisma.session.findMany.mockResolvedValue([
      {
        scheduledStartAt: new Date('2026-04-05T08:00:00.000Z'),
        scheduledEndAt: new Date('2026-04-05T08:30:00.000Z'),
      },
    ]);
    buildAvailabilityWindowsService.buildForRange.mockReturnValue([
      {
        startsAt: '2026-04-05T08:30:00.000Z',
        endsAt: '2026-04-05T09:00:00.000Z',
        durationMinutes: 30,
      },
    ]);

    const result = await useCase.execute({
      slug: 'dr-example',
      fromUtc: new Date('2026-04-05T00:00:00.000Z'),
      toUtc: new Date('2026-04-06T00:00:00.000Z'),
    });

    expect(prisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          practitionerId: 'practitioner-1',
          OR: [
            {
              status: {
                in: [
                  SessionStatus.PENDING_PRACTITIONER_RESPONSE,
                  SessionStatus.CONFIRMED,
                  SessionStatus.UPCOMING,
                  SessionStatus.READY_TO_JOIN,
                  SessionStatus.IN_PROGRESS,
                ],
              },
            },
            {
              status: SessionStatus.PENDING_PAYMENT,
              expiresAt: {
                gt: expect.any(Date),
              },
            },
          ],
          scheduledStartAt: {
            lt: new Date('2026-04-06T00:00:00.000Z'),
          },
          scheduledEndAt: {
            gt: new Date('2026-04-05T00:00:00.000Z'),
          },
        },
      }),
    );
    expect(buildAvailabilityWindowsService.buildForRange).toHaveBeenCalledWith(
      expect.objectContaining({
        bookedSessions: [
          {
            startsAt: new Date('2026-04-05T08:00:00.000Z'),
            endsAt: new Date('2026-04-05T08:30:00.000Z'),
          },
        ],
      }),
    );
    expect(result).toEqual({
      timezone: 'UTC',
      range: {
        from: '2026-04-05T00:00:00.000Z',
        to: '2026-04-06T00:00:00.000Z',
      },
      windows: [
        {
          startsAt: '2026-04-05T08:30:00.000Z',
          endsAt: '2026-04-05T09:00:00.000Z',
          durationMinutes: 30,
        },
      ],
    });
  });
});
