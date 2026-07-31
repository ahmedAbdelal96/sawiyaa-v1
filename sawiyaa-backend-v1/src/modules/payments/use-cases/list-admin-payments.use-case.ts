import { Injectable } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { ListAdminPaymentsDto } from '../dto/list-admin-payments.dto';
import { sessionCodeSearchFilter } from '../../sessions/utils/session-code-search.util';

@Injectable()
export class ListAdminPaymentsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ListAdminPaymentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.query?.trim();
    const createdFrom = query.createdFrom ? new Date(query.createdFrom) : undefined;
    const createdTo = query.createdTo ? new Date(query.createdTo) : undefined;
    if (createdTo && query.createdTo && /^\d{4}-\d{2}-\d{2}$/.test(query.createdTo)) {
      createdTo.setHours(23, 59, 59, 999);
    }
    const andFilters: Prisma.PaymentWhereInput[] = [];
    if (search) {
      andFilters.push({
        OR: [
          { providerPaymentRef: { contains: search, mode: 'insensitive' } },
          { providerOrderRef: { contains: search, mode: 'insensitive' } },
          { patient: { displayName: { contains: search, mode: 'insensitive' } } },
          { patient: { user: { displayName: { contains: search, mode: 'insensitive' } } } },
          { session: { sessionCode: sessionCodeSearchFilter(search) } },
        ],
      });
    }
    if (query.refundStatus === 'NONE') andFilters.push({ refunds: { none: {} } });
    if (query.refundStatus === 'PENDING') andFilters.push({ OR: [{ status: PaymentStatus.REFUND_PENDING }, { refunds: { some: { status: { in: ['REQUESTED', 'PROCESSING'] } } } }] });
    if (query.refundStatus === 'REFUNDED') andFilters.push({ status: PaymentStatus.REFUNDED });
    if (query.refundStatus === 'PARTIALLY_REFUNDED') andFilters.push({ status: PaymentStatus.PARTIALLY_REFUNDED });
    if (query.refundStatus === 'FAILED') andFilters.push({ refunds: { some: { status: 'FAILED' } } });
    const where: Prisma.PaymentWhereInput = {
      provider: query.provider,
      status: query.status,
      currencyCode: query.currency?.trim().toUpperCase(),
      createdAt: createdFrom || createdTo ? { ...(createdFrom ? { gte: createdFrom } : {}), ...(createdTo ? { lte: createdTo } : {}) } : undefined,
      ...(andFilters.length ? { AND: andFilters } : {}),
    };
    const [payments, totalItems] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { [query.sortBy ?? 'createdAt']: query.sortDirection ?? 'desc' },
          { id: 'asc' },
        ],
        select: {
          id: true,
          provider: true,
          status: true,
          paymentPurpose: true,
          amountTotal: true,
          currencyCode: true,
          providerPaymentRef: true,
          providerOrderRef: true,
          initiatedAt: true,
          capturedAt: true,
          failedAt: true,
          createdAt: true,
          updatedAt: true,
          session: { select: { id: true, sessionCode: true, status: true } },
          patient: { select: { displayName: true, user: { select: { displayName: true } } } },
          refunds: {
            select: { status: true, amount: true, requestedAt: true, processedAt: true },
            orderBy: [{ requestedAt: 'desc' }],
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const paymentIds = payments.map((payment) => payment.id);
    const sessionIds = payments.map((payment) => payment.session?.id).filter((id): id is string => Boolean(id));
    const paymentIdBySessionId = new Map(
      payments.flatMap((payment) => payment.session ? [[payment.session.id, payment.id] as const] : []),
    );
    const reviews = paymentIds.length || sessionIds.length
      ? await this.prisma.sessionEarningReview.findMany({
          where: {
            settlementId: { not: null },
            OR: [
              ...(paymentIds.length ? [{ paymentId: { in: paymentIds } }] : []),
              ...(sessionIds.length ? [{ sessionId: { in: sessionIds } }] : []),
            ],
          },
          select: { paymentId: true, sessionId: true, settlement: { select: { id: true, status: true } } },
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        })
      : [];
    const settlementByPaymentId = new Map<string, { id: string; status: string }>();
    for (const review of reviews) {
      const paymentId = review.paymentId ?? paymentIdBySessionId.get(review.sessionId);
      if (paymentId && review.settlement && !settlementByPaymentId.has(paymentId)) {
        settlementByPaymentId.set(paymentId, review.settlement);
      }
    }

    return {
      items: payments.map((payment) => {
        const refundStatus = this.refundStatus(payment.status, payment.refunds.map((refund) => refund.status));
        return {
          id: payment.id,
          customer: payment.patient?.displayName ?? payment.patient?.user.displayName ?? null,
          paymentReference: payment.providerPaymentRef ?? payment.providerOrderRef ?? null,
          provider: payment.provider,
          amount: payment.amountTotal.toString(),
          currency: payment.currencyCode,
          paymentStatus: payment.status,
          refundStatus,
          paidAt: payment.capturedAt?.toISOString() ?? null,
          lastUpdated: payment.updatedAt.toISOString(),
          createdAt: payment.createdAt.toISOString(),
          initiatedAt: payment.initiatedAt.toISOString(),
          failedAt: payment.failedAt?.toISOString() ?? null,
          paymentPurpose: payment.paymentPurpose,
          refundCount: payment.refunds.length,
          refundedAmount: payment.refunds
            .filter((refund) => refund.status === 'SUCCEEDED')
            .reduce((sum, refund) => sum.add(refund.amount), new Prisma.Decimal(0))
            .toString(),
          session: payment.session
            ? {
                id: payment.session.id,
                sessionCode: payment.session.sessionCode,
                reference: payment.session.sessionCode,
                status: payment.session.status,
              }
            : null,
          settlement: settlementByPaymentId.get(payment.id) ?? null,
        };
      }),
      pagination: { page, limit, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / limit)) },
    };
  }

  private refundStatus(paymentStatus: PaymentStatus, statuses: string[]) {
    if (paymentStatus === PaymentStatus.REFUNDED) return 'REFUNDED';
    if (paymentStatus === PaymentStatus.PARTIALLY_REFUNDED) return 'PARTIALLY_REFUNDED';
    if (paymentStatus === PaymentStatus.REFUND_PENDING || statuses.some((status) => status === 'REQUESTED' || status === 'PROCESSING')) return 'PENDING';
    if (statuses.some((status) => status === 'SUCCEEDED')) return 'PARTIALLY_REFUNDED';
    if (statuses.some((status) => status === 'FAILED')) return 'FAILED';
    return 'NONE';
  }
}
