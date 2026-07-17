import { Injectable } from '@nestjs/common';
import {
  PaymentStatus,
  SessionAdminDecisionType,
  SessionPaymentCoverageType,
  SessionStatus,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class ReviewSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOwnedSessionForReview(sessionId: string, patientId: string) {
    return this.prisma.session.findFirst({
      where: {
        id: sessionId,
        patientId,
      },
      select: {
        id: true,
        status: true,
        patientId: true,
        practitionerId: true,
        decisions: {
          where: { isFinal: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { decisionType: true },
        },
      },
    });
  }

  hasCapturedPaymentForSession(sessionId: string, patientId: string) {
    return this.prisma.payment.count({
      where: {
        sessionId,
        patientId,
        status: PaymentStatus.CAPTURED,
      },
      take: 1,
    });
  }

  async findReviewEligibilityFacts(sessionIds: string[]) {
    const ids = Array.from(new Set(sessionIds)).filter(Boolean);
    if (ids.length === 0) return [];

    const sessions = await this.prisma.session.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        status: true,
        paymentCoverageType: true,
        packagePurchaseId: true,
        decisions: {
          where: { isFinal: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { decisionType: true },
        },
        payments: {
          where: { status: PaymentStatus.CAPTURED },
          take: 1,
          select: { id: true },
        },
        reviews: { take: 1, select: { id: true } },
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      status: session.status,
      finalDecision: session.decisions[0]?.decisionType ?? null,
      hasValidSource:
        session.payments.length > 0 ||
        (session.paymentCoverageType === 'PACKAGE' &&
          session.packagePurchaseId !== null),
      hasReview: session.reviews.length > 0,
    }));
  }

  listEligibleSessionsForReview(input: {
    patientId: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.SessionWhereInput = {
      patientId: input.patientId,
      AND: [
        {
          OR: [
            { status: SessionStatus.COMPLETED },
            {
              decisions: {
                some: {
                  isFinal: true,
                  decisionType: SessionAdminDecisionType.MARK_COMPLETED,
                },
              },
            },
          ],
        },
        {
          reviews: { none: {} },
        },
        {
          OR: [
            {
              payments: {
                some: { status: PaymentStatus.CAPTURED },
              },
            },
            {
              paymentCoverageType: SessionPaymentCoverageType.PACKAGE,
              packagePurchaseId: { not: null },
            },
          ],
        },
      ],
    };
    const skip = (input.page - 1) * input.limit;

    return Promise.all([
      this.prisma.session.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [
          { completedAt: 'desc' },
          { scheduledStartAt: 'desc' },
          { id: 'desc' },
        ],
        select: {
          id: true,
          completedAt: true,
          scheduledStartAt: true,
          decisions: {
            where: {
              isFinal: true,
              decisionType: SessionAdminDecisionType.MARK_COMPLETED,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true },
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
        },
      }),
      this.prisma.session.count({ where }),
    ]);
  }

  isSessionCompleted(
    status: SessionStatus,
    finalManualDecision?: SessionAdminDecisionType | null,
  ) {
    return (
      status === SessionStatus.COMPLETED ||
      finalManualDecision === SessionAdminDecisionType.MARK_COMPLETED
    );
  }
}
