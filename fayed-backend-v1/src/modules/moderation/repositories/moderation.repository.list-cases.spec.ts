import {
  ModerationCaseStatus,
  ModerationReportReason,
  ModerationReportTargetType,
  ModerationReporterRole,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { ModerationRepository } from './moderation.repository';

describe('ModerationRepository.listCases', () => {
  const prisma = {
    moderationReport: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    sessionReview: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;

  const repository = new ModerationRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies deterministic filters/query/order/pagination semantics', async () => {
    (prisma.moderationReport.findMany as jest.Mock).mockResolvedValue([
      {
        id: '00000000-0000-0000-0000-000000000001',
        targetType: ModerationReportTargetType.REVIEW,
        targetId: '00000000-0000-0000-0000-000000000111',
        reason: ModerationReportReason.ABUSE,
        status: ModerationCaseStatus.OPEN,
        reportedByRole: ModerationReporterRole.PATIENT,
        createdAt: new Date('2026-04-01T10:00:00.000Z'),
        actions: [
          {
            createdAt: new Date('2026-04-01T10:30:00.000Z'),
          },
        ],
      },
    ]);
    (prisma.moderationReport.count as jest.Mock).mockResolvedValue(1);
    (prisma.sessionReview.findUnique as jest.Mock).mockResolvedValue(null);

    await repository.listCases({
      page: 2,
      limit: 10,
      status: ModerationCaseStatus.OPEN,
      targetType: ModerationReportTargetType.REVIEW,
      reporterRole: ModerationReporterRole.PATIENT,
      reason: ModerationReportReason.ABUSE,
      createdFrom: new Date('2026-04-01T00:00:00.000Z'),
      createdTo: new Date('2026-04-30T23:59:59.000Z'),
      query: '00000000-0000-0000-0000-000000000111',
      sortBy: 'CREATED_AT',
      sortOrder: 'ASC',
    });

    expect(prisma.moderationReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        where: expect.objectContaining({
          status: ModerationCaseStatus.OPEN,
          targetType: ModerationReportTargetType.REVIEW,
          reportedByRole: ModerationReporterRole.PATIENT,
          reason: ModerationReportReason.ABUSE,
          OR: [
            { id: '00000000-0000-0000-0000-000000000111' },
            { targetId: '00000000-0000-0000-0000-000000000111' },
          ],
          createdAt: {
            gte: new Date('2026-04-01T00:00:00.000Z'),
            lte: new Date('2026-04-30T23:59:59.000Z'),
          },
        }),
      }),
    );
  });

  it('returns deterministic empty state with zero total', async () => {
    (prisma.moderationReport.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.moderationReport.count as jest.Mock).mockResolvedValue(0);

    const [items, total] = await repository.listCases({
      page: 1,
      limit: 20,
      sortBy: 'CREATED_AT',
      sortOrder: 'DESC',
    });

    expect(items).toEqual([]);
    expect(total).toBe(0);
  });
});
