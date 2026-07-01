import type { PrismaService } from '@common/prisma/prisma.service';
import { AvailabilityWeekStatus } from '@prisma/client';
import {
  PublicPractitionerSessionDuration,
} from '../dto/list-public-practitioners.dto';
import { PublicPractitionerReadRepository } from './public-practitioner-read.repository';

describe('PublicPractitionerReadRepository', () => {
  const prisma = {
    practitionerProfile: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    practitionerCredential: {
      count: jest.fn(),
    },
  } as unknown as PrismaService;

  const repository = new PublicPractitionerReadRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    (
      prisma.practitionerProfile.findMany as unknown as jest.Mock
    ).mockResolvedValue([]);
  });

  it('filters fee range by 30-minute resolved-currency price when duration=30', async () => {
    await repository.listPublic({
      locale: 'en',
      currencyCode: 'EGP',
      duration: PublicPractitionerSessionDuration.THIRTY,
      minSessionFee: 500,
    });

    expect(prisma.practitionerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              sessionPrice30Egp: expect.objectContaining({
                not: null,
                gte: 500,
              }),
            }),
          ]),
        }),
      }),
    );
  });

  it('filters fee range by 60-minute resolved-currency price when duration=60', async () => {
    await repository.listPublic({
      locale: 'en',
      currencyCode: 'EGP',
      duration: PublicPractitionerSessionDuration.SIXTY,
      minSessionFee: 500,
    });

    expect(prisma.practitionerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              sessionPrice60Egp: expect.objectContaining({
                not: null,
                gte: 500,
              }),
            }),
          ]),
        }),
      }),
    );
  });

  it('matches any available duration price when fee range is set without duration', async () => {
    await repository.listPublic({
      locale: 'en',
      currencyCode: 'EGP',
      minSessionFee: 500,
    });

    expect(prisma.practitionerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: [
                {
                  sessionPrice30Egp: expect.objectContaining({
                    not: null,
                    gte: 500,
                  }),
                },
                {
                  sessionPrice60Egp: expect.objectContaining({
                    not: null,
                    gte: 500,
                  }),
                },
              ],
            }),
          ]),
        }),
      }),
    );
  });

  it('filters availableToday using published availability weeks that cover the current day', async () => {
    await repository.listPublic({
      locale: 'en',
      currencyCode: 'EGP',
      availableToday: true,
    });

    expect(prisma.practitionerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          availabilityWeeks: {
            some: expect.objectContaining({
              status: AvailabilityWeekStatus.PUBLISHED,
              weekStartDate: expect.objectContaining({ lte: expect.any(Date) }),
              weekEndDate: expect.objectContaining({ gte: expect.any(Date) }),
              slots: {
                some: expect.objectContaining({
                  weekday: expect.any(String),
                }),
              },
            }),
          },
        }),
      }),
    );
  });

  it('filters availableThisWeek using published availability weeks with slots only', async () => {
    await repository.listPublic({
      locale: 'en',
      currencyCode: 'EGP',
      availableThisWeek: true,
    });

    expect(prisma.practitionerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          availabilityWeeks: {
            some: {
              status: AvailabilityWeekStatus.PUBLISHED,
              slots: {
                some: {},
              },
            },
          },
        }),
      }),
    );
  });
});
