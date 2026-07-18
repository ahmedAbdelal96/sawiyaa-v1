import { AdminPractitionerDirectoryRepository } from './admin-practitioner-directory.repository';
import {
  AdminPractitionerKindDto,
  AdminPractitionerSortByDto,
} from '../dto/list-admin-practitioners.dto';

describe('AdminPractitionerDirectoryRepository', () => {
  const ratingService = {
    aggregateByPractitionerIds: jest.fn().mockResolvedValue(new Map()),
  };

  const row = (id: string, createdAt: string, yearsOfExperience = 1) => ({
    id,
    publicSlug: id,
    professionalTitle: null,
    practitionerType: 'OTHER',
    status: 'DRAFT',
    yearsOfExperience,
    createdAt: new Date(createdAt),
    avatarUrl: null,
    user: { displayName: id, emails: [{ email: `${id}@example.test` }] },
    country: { isoCode: 'EG' },
    presence: { status: 'OFFLINE', lastSeenAtUtc: null },
  });

  function createRepository(rows: unknown[]) {
    const prisma = {
      practitionerProfile: {
        findMany: jest.fn().mockResolvedValue(rows),
      },
    };

    return {
      repository: new AdminPractitionerDirectoryRepository(prisma as never, ratingService as never),
      findMany: prisma.practitionerProfile.findMany,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults to newest joining order with deterministic id tie-breaker before pagination', async () => {
    const { repository, findMany } = createRepository([
      row('a', '2026-01-01T00:00:00.000Z'),
      row('c', '2026-03-01T00:00:00.000Z'),
      row('b', '2026-02-01T00:00:00.000Z'),
    ]);

    const result = await repository.list({ skip: 1, take: 1 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(result.rows.map((item) => item.id)).toEqual(['b']);
    expect(result.total).toBe(3);
  });

  it('supports explicit newest and oldest sorting while preserving filters', async () => {
    const { repository, findMany } = createRepository([
      row('new', '2026-03-01T00:00:00.000Z'),
      row('old', '2026-01-01T00:00:00.000Z'),
    ]);

    const newest = await repository.list({
      practitionerKind: AdminPractitionerKindDto.DOCTOR,
      country: 'eg',
      onlineNow: true,
      sort: AdminPractitionerSortByDto.NEWEST,
      skip: 0,
      take: 20,
    });
    const oldest = await repository.list({
      sort: AdminPractitionerSortByDto.OLDEST,
      skip: 0,
      take: 20,
    });

    expect(findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
    );
    expect(findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
    );
    expect(newest.rows.map((item) => item.id)).toEqual(['new', 'old']);
    expect(oldest.rows.map((item) => item.id)).toEqual(['old', 'new']);
    expect(findMany.mock.calls[0][0].where).toEqual(
      expect.objectContaining({
        practitionerType: 'PSYCHIATRIST',
        country: { isoCode: { equals: 'EG', mode: 'insensitive' } },
      }),
    );
  });

  it('orders equal timestamps deterministically by id', async () => {
    const { repository } = createRepository([
      row('00000000-0000-0000-0000-000000000001', '2026-03-01T00:00:00.000Z'),
      row('00000000-0000-0000-0000-000000000099', '2026-03-01T00:00:00.000Z'),
    ]);

    const result = await repository.list({ sort: AdminPractitionerSortByDto.NEWEST, skip: 0, take: 20 });

    expect(result.rows.map((item) => item.id)).toEqual([
      '00000000-0000-0000-0000-000000000099',
      '00000000-0000-0000-0000-000000000001',
    ]);
  });
});
