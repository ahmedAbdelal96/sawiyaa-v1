import { SessionReviewStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { ReviewRepository } from './review.repository';

describe('ReviewRepository', () => {
  const prisma = {
    sessionReview: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  } as unknown as PrismaService;

  const repository = new ReviewRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters public list to published and countable reviews only', async () => {
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
          countsInPublicAverage: true,
          publicRatingValue: {
            not: null,
          },
        }),
      }),
    );

    expect(prisma.sessionReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { publishedAt: 'desc' },
          { submittedAt: 'desc' },
          { id: 'asc' },
        ],
        select: expect.objectContaining({
          publicRatingValue: true,
          moderationDecision: true,
        }),
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

  it('loads admin review details with patient and practitioner context', async () => {
    await repository.findById('review-1');

    expect(prisma.sessionReview.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'review-1' },
        include: expect.objectContaining({
          patient: {
            select: {
              id: true,
              displayName: true,
              user: {
                select: {
                  displayName: true,
                },
              },
            },
          },
          practitioner: {
            select: {
              id: true,
              publicSlug: true,
              user: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        }),
      }),
    );
  });
});
