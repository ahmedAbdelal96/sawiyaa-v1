import { Injectable } from '@nestjs/common';
import { Prisma, SessionEarningReviewDecision, SessionEarningReviewSourceType, SessionEarningReviewStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class SessionEarningReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findById(reviewId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).sessionEarningReview.findUnique({
      where: { id: reviewId },
    });
  }

  listAdminReviews(input: {
    where: Prisma.SessionEarningReviewWhereInput;
    skip: number;
    take: number;
    orderBy: Prisma.SessionEarningReviewOrderByWithRelationInput[];
    tx?: Prisma.TransactionClient;
  }) {
    const db = this.getDb(input.tx);

    return Promise.all([
      db.sessionEarningReview.findMany({
        where: input.where,
        skip: input.skip,
        take: input.take,
        orderBy: input.orderBy,
        select: this.adminListSelect,
      }),
      db.sessionEarningReview.count({
        where: input.where,
      }),
    ]);
  }

  findAdminReviewById(reviewId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).sessionEarningReview.findUnique({
      where: { id: reviewId },
      select: this.adminDetailSelect,
    });
  }

  findBySessionAndSourceType(input: {
    sessionId: string;
    sourceType: SessionEarningReviewSourceType;
    tx?: Prisma.TransactionClient;
  }) {
    return this.getDb(input.tx).sessionEarningReview.findUnique({
      where: {
        sessionId_sourceType: {
          sessionId: input.sessionId,
          sourceType: input.sourceType,
        },
      },
    });
  }

  listBySessionIds(input: {
    sessionIds: string[];
    sourceType?: SessionEarningReviewSourceType;
    tx?: Prisma.TransactionClient;
  }) {
    if (input.sessionIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.getDb(input.tx).sessionEarningReview.findMany({
      where: {
        sessionId: { in: input.sessionIds },
        sourceType: input.sourceType,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  createReview(
    data: Prisma.SessionEarningReviewUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionEarningReview.create({
      data,
      include: this.reviewInclude,
    });
  }

  updateReview(
    reviewId: string,
    data: Prisma.SessionEarningReviewUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionEarningReview.update({
      where: { id: reviewId },
      data,
      include: this.reviewInclude,
    });
  }

  upsertReview(
    where: {
      sessionId: string;
      sourceType: SessionEarningReviewSourceType;
    },
    create: Prisma.SessionEarningReviewUncheckedCreateInput,
    update: Prisma.SessionEarningReviewUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionEarningReview.upsert({
      where: {
        sessionId_sourceType: where,
      },
      create,
      update,
      include: this.reviewInclude,
    });
  }

  listPendingByPractitioner(practitionerId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).sessionEarningReview.findMany({
      where: {
        practitionerId,
        reviewStatus: SessionEarningReviewStatus.PENDING_REVIEW,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: this.reviewInclude,
    });
  }

  countAdminReviews(
    where: Prisma.SessionEarningReviewWhereInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionEarningReview.count({
      where,
    });
  }

  private readonly reviewInclude = {
    ledgerEntries: {
      select: {
        id: true,
        entryType: true,
        direction: true,
        amount: true,
        currencyCode: true,
        balanceBucket: true,
        referenceType: true,
        referenceId: true,
      },
      orderBy: [{ createdAt: 'asc' }],
    },
  } satisfies Prisma.SessionEarningReviewInclude;

  private readonly adminListSelect = {
    id: true,
    sessionId: true,
    paymentId: true,
    packagePurchaseId: true,
    packageSettlementId: true,
    practitionerId: true,
    patientId: true,
    sourceType: true,
    reviewStatus: true,
    reviewDecision: true,
    paymentAmount: true,
    paymentCurrencyCode: true,
    suggestedPractitionerAmount: true,
    suggestedPlatformAmount: true,
    suggestedCurrencyCode: true,
    finalPractitionerAmount: true,
    finalPlatformAmount: true,
    finalCurrencyCode: true,
    reviewedByUserId: true,
    reviewedAt: true,
    approvedByUserId: true,
    approvedAt: true,
    internalReason: true,
    practitionerFacingNote: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.SessionEarningReviewSelect;

  private readonly adminDetailSelect = {
    ...this.adminListSelect,
    ledgerEntries: {
      select: {
        id: true,
        entryType: true,
        direction: true,
        amount: true,
        currencyCode: true,
        balanceBucket: true,
        referenceType: true,
        referenceId: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    },
  } satisfies Prisma.SessionEarningReviewSelect;
}
