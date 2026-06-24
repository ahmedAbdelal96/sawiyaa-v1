import { Prisma, SessionReviewStatus } from '@prisma/client';

/**
 * Central public visibility policy for session reviews.
 * The same review state always resolves to the same public visibility decision.
 */
export const buildPublicVisibleReviewWhere = (
  practitionerId: string,
): Prisma.SessionReviewWhereInput => ({
  practitionerId,
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
});
