import { Injectable } from '@nestjs/common';
import {
  JournalEntrySourceType,
  PaymentStatus,
  Prisma,
  ReconciliationReviewStatus,
  RefundStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class AccountingReconciliationRepository {
  constructor(private readonly prisma: PrismaService) {}

  listCapturedPayments(input: {
    from: Date;
    to: Date;
    currencyCode?: string;
    practitionerId?: string;
    query?: string;
  }) {
    const query = input.query?.trim();
    const queryMode: Prisma.QueryMode = 'insensitive';
    const paymentSearchFilters: Prisma.PaymentWhereInput[] = query
      ? [
          ...(isUuid(query) ? [{ id: query }] : []),
          { providerPaymentRef: { contains: query, mode: queryMode } },
          { providerOrderRef: { contains: query, mode: queryMode } },
          { providerCustomerRef: { contains: query, mode: queryMode } },
        ]
      : [];

    return this.prisma.payment.findMany({
      where: {
        status: {
          in: [
            PaymentStatus.CAPTURED,
            PaymentStatus.REFUND_PENDING,
            PaymentStatus.PARTIALLY_REFUNDED,
            PaymentStatus.REFUNDED,
          ],
        },
        capturedAt: {
          gte: input.from,
          lte: input.to,
        },
        currencyCode: input.currencyCode,
        practitionerId: input.practitionerId,
        ...(paymentSearchFilters.length > 0
          ? { OR: paymentSearchFilters }
          : {}),
      },
      select: {
        id: true,
        practitionerId: true,
        currencyCode: true,
        amountTotal: true,
        amountFromWallet: true,
        amountFromGateway: true,
        vatAmountSnapshot: true,
        gatewayFeeAmountSnapshot: true,
        capturedAt: true,
        metadataJson: true,
      },
    });
  }

  findCapturedPaymentById(paymentId: string) {
    return this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true },
    });
  }

  listSucceededRefunds(input: {
    from: Date;
    to: Date;
    currencyCode?: string;
    practitionerId?: string;
    query?: string;
  }) {
    const query = input.query?.trim();
    const queryMode: Prisma.QueryMode = 'insensitive';
    const refundSearchFilters: Prisma.RefundWhereInput[] = query
      ? [
          ...(isUuid(query) ? [{ id: query }, { paymentId: query }] : []),
          { providerRefundRef: { contains: query, mode: queryMode } },
          { refundReason: { contains: query, mode: queryMode } },
        ]
      : [];

    return this.prisma.refund.findMany({
      where: {
        status: RefundStatus.SUCCEEDED,
        processedAt: {
          gte: input.from,
          lte: input.to,
        },
        currencyCode: input.currencyCode,
        payment: {
          practitionerId: input.practitionerId,
        },
        ...(refundSearchFilters.length > 0 ? { OR: refundSearchFilters } : {}),
      },
      select: {
        id: true,
        paymentId: true,
        sessionId: true,
        currencyCode: true,
        amount: true,
        processedAt: true,
        metadataJson: true,
        payment: {
          select: {
            practitionerId: true,
          },
        },
      },
    });
  }

  findSucceededRefundById(refundId: string) {
    return this.prisma.refund.findFirst({
      where: {
        id: refundId,
        status: RefundStatus.SUCCEEDED,
      },
      select: { id: true },
    });
  }

  listRecordedPayouts(input: {
    from: Date;
    to: Date;
    currencyCode?: string;
    practitionerId?: string;
    query?: string;
  }) {
    const query = input.query?.trim();
    const queryMode: Prisma.QueryMode = 'insensitive';
    const payoutSearchFilters: Prisma.PractitionerSettlementPayoutWhereInput[] =
      query
        ? [
            ...(isUuid(query) ? [{ id: query }, { settlementId: query }] : []),
            { externalPayoutRef: { contains: query, mode: queryMode } },
            { notes: { contains: query, mode: queryMode } },
          ]
        : [];

    return this.prisma.practitionerSettlementPayout.findMany({
      where: {
        effectiveAt: {
          gte: input.from,
          lte: input.to,
        },
        currencyCode: input.currencyCode,
        practitionerId: input.practitionerId,
        ...(payoutSearchFilters.length > 0 ? { OR: payoutSearchFilters } : {}),
      },
      select: {
        id: true,
        practitionerId: true,
        settlementId: true,
        amountPaid: true,
        currencyCode: true,
        effectiveAt: true,
        transferFeeAmount: true,
        payoutMethodSnapshot: true,
        proof: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  findPayoutById(payoutId: string) {
    return this.prisma.practitionerSettlementPayout.findUnique({
      where: { id: payoutId },
      select: { id: true },
    });
  }

  listJournalEntriesBySources(input: {
    sourceType: JournalEntrySourceType;
    sourceIds: string[];
  }) {
    if (input.sourceIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.prisma.journalEntry.findMany({
      where: {
        sourceType: input.sourceType,
        sourceId: {
          in: input.sourceIds,
        },
      },
      select: {
        id: true,
        sourceType: true,
        sourceId: true,
        occurredAt: true,
        currencyCode: true,
        metadataJson: true,
      },
    });
  }

  listReviewsBySources(input: {
    sourceType: JournalEntrySourceType;
    sourceIds: string[];
  }) {
    if (input.sourceIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.prisma.financeReconciliationReview.findMany({
      where: {
        sourceType: input.sourceType,
        sourceId: {
          in: input.sourceIds,
        },
      },
      include: {
        reviewedByUser: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  async upsertReview(input: {
    sourceType: JournalEntrySourceType;
    sourceId: string;
    status: ReconciliationReviewStatus;
    note?: string;
    reviewerUserId: string;
  }) {
    const note = input.note?.trim() || null;

    return this.prisma.financeReconciliationReview.upsert({
      where: {
        sourceType_sourceId: {
          sourceType: input.sourceType,
          sourceId: input.sourceId,
        },
      },
      create: {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        status: input.status,
        note,
        reviewedByUserId: input.reviewerUserId,
        reviewedAt: new Date(),
      },
      update: {
        status: input.status,
        note,
        reviewedByUserId: input.reviewerUserId,
        reviewedAt: new Date(),
      },
      include: {
        reviewedByUser: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  findReviewBySource(input: {
    sourceType: JournalEntrySourceType;
    sourceId: string;
  }) {
    return this.prisma.financeReconciliationReview.findUnique({
      where: {
        sourceType_sourceId: {
          sourceType: input.sourceType,
          sourceId: input.sourceId,
        },
      },
      include: {
        reviewedByUser: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
