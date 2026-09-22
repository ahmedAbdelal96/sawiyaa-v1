import type { PrismaService } from '@common/prisma/prisma.service';
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

  it('leaves availableToday evaluation to the concrete public-window evaluator', async () => {
    await repository.listPublic({
      locale: 'en',
      currencyCode: 'EGP',
      availableToday: true,
    });

    expect(prisma.practitionerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ availabilityWeeks: expect.anything() }),
      }),
    );
  });

  it('leaves availableThisWeek evaluation to the concrete public-window evaluator', async () => {
    await repository.listPublic({
      locale: 'en',
      currencyCode: 'EGP',
      availableThisWeek: true,
    });

    expect(prisma.practitionerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ availabilityWeeks: expect.anything() }),
      }),
    );
  });

  it('combines online-now and instant-booking-enabled presence filters', async () => {
    await repository.listPublic({
      locale: 'ar',
      onlineNow: true,
      instantBookingEnabled: true,
    });

    expect(prisma.practitionerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          presence: {
            is: expect.objectContaining({
              status: 'ONLINE',
              isInstantBookingEnabled: true,
              lastSeenAtUtc: expect.objectContaining({ gte: expect.any(Date) }),
            }),
          },
        }),
      }),
    );
  });

  it('adds bilingual live professional-content matching without changing legacy or specialty branches', async () => {
    await repository.listPublic({
      locale: 'ar',
      search: 'family',
      currencyCode: 'USD',
    });

    const call = (
      prisma.practitionerProfile.findMany as unknown as jest.Mock
    ).mock.calls[0][0] as {
      where: { OR: Array<Record<string, unknown>> };
    };

    expect(call.where.OR).toEqual(
      expect.arrayContaining([
        {
          user: {
            displayName: {
              contains: 'family',
              mode: 'insensitive',
            },
          },
        },
        {
          professionalTitle: {
            contains: 'family',
            mode: 'insensitive',
          },
        },
        {
          bio: {
            contains: 'family',
            mode: 'insensitive',
          },
        },
        {
          professionalContentTranslations: {
            some: {
              locale: { in: ['ar', 'en'] },
              OR: [
                {
                  professionalTitle: {
                    contains: 'family',
                    mode: 'insensitive',
                  },
                },
                {
                  bio: {
                    contains: 'family',
                    mode: 'insensitive',
                  },
                },
              ],
            },
          },
        },
      ]),
    );
  });

  it('keeps the requested locale first while allowing the supported fallback locale', async () => {
    await repository.listPublic({
      locale: 'en',
      search: 'family',
    });

    const where = (
      prisma.practitionerProfile.findMany as unknown as jest.Mock
    ).mock.calls[0][0].where as {
      OR: Array<Record<string, unknown>>;
    };
    const translatedBranch = where.OR.find(
      (branch) => 'professionalContentTranslations' in branch,
    );

    expect(translatedBranch).toEqual(
      expect.objectContaining({
        professionalContentTranslations: expect.objectContaining({
          some: expect.objectContaining({ locale: { in: ['en', 'ar'] } }),
        }),
      }),
    );
  });
});
