import { SessionReviewStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { ReviewRepository } from './review.repository';

describe('ReviewRepository', () => {
  const prisma = {
    sessionReview: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  } as unknown as PrismaService;

  const repository = new ReviewRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters public list to published reviews with non-empty text only', async () => {
    await repository.listPublicPublishedReviews({
      practitionerId: 'practitioner-1',
      page: 1,
      limit: 10,
    });

    expect(prisma.sessionReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          practitionerId: 'practitioner-1',
          reviewStatus: SessionReviewStatus.PUBLISHED,
          publishedAt: {
            not: null,
          },
          hiddenAt: null,
          archivedAt: null,
          AND: [
            {
              reviewText: {
                not: null,
              },
            },
            {
              reviewText: {
                not: '',
              },
            },
          ],
        }),
      }),
    );

    expect(prisma.sessionReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ publishedAt: 'desc' }, { submittedAt: 'desc' }, { id: 'asc' }],
      }),
    );
  });

  it('applies deterministic pagination for public list', async () => {
    await repository.listPublicPublishedReviews({
      practitionerId: 'practitioner-1',
      page: 3,
      limit: 10,
    });

    expect(prisma.sessionReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      }),
    );
  });
});
