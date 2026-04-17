import { Injectable } from '@nestjs/common';
import {
  PractitionerStatus,
  Prisma,
  SessionReviewStatus,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { buildPublicVisibleReviewWhere } from '../policies/public-review-visibility.policy';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findBySessionId(sessionId: string) {
    return this.prisma.sessionReview.findUnique({
      where: { sessionId },
    });
  }

  findById(reviewId: string) {
    return this.prisma.sessionReview.findUnique({
      where: { id: reviewId },
      include: this.adminDetailsInclude(),
    });
  }

  createReview(
    data: Prisma.SessionReviewUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionReview.create({
      data,
      include: this.adminDetailsInclude(),
    });
  }

  updateReview(
    reviewId: string,
    data: Prisma.SessionReviewUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionReview.update({
      where: { id: reviewId },
      data,
      include: this.adminDetailsInclude(),
    });
  }

  createModerationEntry(
    data: Prisma.ReviewModerationEntryUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).reviewModerationEntry.create({ data });
  }

  listPatientReviews(input: {
    patientId: string;
    page: number;
    limit: number;
    status?: SessionReviewStatus;
  }) {
    const where: Prisma.SessionReviewWhereInput = {
      patientId: input.patientId,
      ...(input.status ? { reviewStatus: input.status } : {}),
    };
    const skip = (input.page - 1) * input.limit;

    return Promise.all([
      this.prisma.sessionReview.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ createdAt: 'desc' }],
        include: this.patientDetailsInclude(),
      }),
      this.prisma.sessionReview.count({ where }),
    ]);
  }

  findPatientReviewById(reviewId: string, patientId: string) {
    return this.prisma.sessionReview.findFirst({
      where: {
        id: reviewId,
        patientId,
      },
      include: this.patientDetailsInclude(),
    });
  }

  listAdminReviews(input: {
    page: number;
    limit: number;
    status?: SessionReviewStatus;
    practitionerId?: string;
    sessionId?: string;
    needsModeration?: boolean;
  }) {
    const skip = (input.page - 1) * input.limit;
    const where: Prisma.SessionReviewWhereInput = {
      ...(input.status ? { reviewStatus: input.status } : {}),
      ...(input.practitionerId ? { practitionerId: input.practitionerId } : {}),
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      ...(input.needsModeration
        ? {
            reviewStatus: SessionReviewStatus.PENDING_MODERATION,
          }
        : {}),
    };

    return Promise.all([
      this.prisma.sessionReview.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ createdAt: 'desc' }],
        include: this.adminDetailsInclude(),
      }),
      this.prisma.sessionReview.count({ where }),
    ]);
  }

  findPublicPractitionerBySlug(slug: string) {
    return this.prisma.practitionerProfile.findFirst({
      where: {
        publicSlug: slug.trim().toLowerCase(),
        status: PractitionerStatus.APPROVED,
        isPublicProfilePublished: true,
        user: {
          status: UserStatus.ACTIVE,
          displayName: {
            not: null,
          },
        },
      },
      select: {
        id: true,
        publicSlug: true,
        user: {
          select: {
            displayName: true,
          },
        },
        ratingSummary: {
          select: {
            averageRating: true,
            totalReviews: true,
            publishedReviewsCount: true,
          },
        },
      },
    });
  }

  listPublicPublishedReviews(input: {
    practitionerId: string;
    page: number;
    limit: number;
  }) {
    const skip = (input.page - 1) * input.limit;
    const where = buildPublicVisibleReviewWhere(input.practitionerId);

    return Promise.all([
      this.prisma.sessionReview.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ publishedAt: 'desc' }, { submittedAt: 'desc' }, { id: 'asc' }],
        select: {
          id: true,
          ratingValue: true,
          reviewText: true,
          submittedAt: true,
          publishedAt: true,
        },
      }),
      this.prisma.sessionReview.count({ where }),
    ]);
  }

  aggregatePublicVisibleReviews(practitionerId: string) {
    const where = buildPublicVisibleReviewWhere(practitionerId);

    return this.prisma.sessionReview.aggregate({
      where,
      _count: {
        id: true,
      },
      _avg: {
        ratingValue: true,
      },
      _max: {
        publishedAt: true,
      },
    });
  }

  countByPractitionerAndStatuses(
    practitionerId: string,
    statuses: SessionReviewStatus[],
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionReview.count({
      where: {
        practitionerId,
        reviewStatus: {
          in: statuses,
        },
      },
    });
  }

  countByPractitionerAndStatus(
    practitionerId: string,
    status: SessionReviewStatus,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionReview.count({
      where: {
        practitionerId,
        reviewStatus: status,
      },
    });
  }

  aggregateAverageRating(
    practitionerId: string,
    statuses: SessionReviewStatus[],
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionReview.aggregate({
      where: {
        practitionerId,
        reviewStatus: {
          in: statuses,
        },
      },
      _avg: {
        ratingValue: true,
      },
      _max: {
        submittedAt: true,
      },
    });
  }

  groupRatingHistogram(
    practitionerId: string,
    statuses: SessionReviewStatus[],
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionReview.groupBy({
      by: ['ratingValue'],
      where: {
        practitionerId,
        reviewStatus: {
          in: statuses,
        },
      },
      _count: {
        ratingValue: true,
      },
    });
  }

  upsertPractitionerRatingSummary(
    practitionerId: string,
    data: {
      totalReviews: number;
      publishedReviewsCount: number;
      averageRating: number;
      rating1Count: number;
      rating2Count: number;
      rating3Count: number;
      rating4Count: number;
      rating5Count: number;
      lastReviewAt: Date | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerRatingSummary.upsert({
      where: {
        practitionerId,
      },
      create: {
        practitionerId,
        ...data,
      },
      update: data,
    });
  }

  withTransaction<T>(
    runner: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction((tx) => runner(tx));
  }

  private patientDetailsInclude() {
    return {
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
    } as const;
  }

  private adminDetailsInclude() {
    return {
      session: {
        select: {
          id: true,
          scheduledStartAt: true,
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
    } as const;
  }
}
