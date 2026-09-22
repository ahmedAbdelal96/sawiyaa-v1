import { Injectable } from '@nestjs/common';
import {
  PaymentEventType,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  RefundStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  SecurityAuditActorType as AuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';
import { sanitizeFinanceAuditMetadata } from '@common/security-audit/sanitize-finance-audit-metadata.util';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  createPayment(
    data: Prisma.PaymentUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).payment.create({
      data,
      include: this.paymentInclude,
    });
  }

  findById(paymentId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).payment.findUnique({
      where: { id: paymentId },
      include: this.paymentInclude,
    });
  }

  findAdminOpsById(paymentId: string) {
    return this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        sessionId: true,
        paymentPurpose: true,
        provider: true,
        status: true,
        amountSubtotal: true,
        amountDiscount: true,
        amountTotal: true,
        amountFromWallet: true,
        amountFromGateway: true,
        currencyCode: true,
        providerPaymentRef: true,
        providerOrderRef: true,
        createdAt: true,
        initiatedAt: true,
        capturedAt: true,
        failedAt: true,
        expiredAt: true,
        metadataJson: true,
        patient: { select: { id: true, displayName: true, user: { select: { displayName: true } } } },
        patientPackagePurchase: {
          select: {
            id: true,
            titleSnapshot: true,
            planCodeSnapshot: true,
            status: true,
            packageSettlement: { select: { id: true, status: true } },
          },
        },
        academyProgramEnrollment: {
          select: {
            id: true,
            academyProgramId: true,
            status: true,
            paymentStatus: true,
            registeredAt: true,
            academyProgram: { select: { id: true, slug: true, titleAr: true, titleEn: true } },
          },
        },
        session: {
          select: {
            id: true,
            sessionCode: true,
            status: true,
            sessionMode: true,
            expiresAt: true,
            scheduledStartAt: true,
            scheduledEndAt: true,
            durationMinutes: true,
            provider: true,
            providerRoomId: true,
            providerSessionRef: true,
            practitioner: {
              select: { publicSlug: true, user: { select: { displayName: true } } },
            },
            cancellationRecord: {
              select: { cancellationAllowed: true, cancelledPaymentId: true, createdAt: true },
            },
            events: {
              orderBy: [{ createdAt: 'asc' }],
              take: 100,
              select: {
                id: true,
                eventType: true,
                occurredAt: true,
                createdAt: true,
              },
            },
          },
        },
        refunds: {
          orderBy: [{ requestedAt: 'desc' }],
          select: {
            id: true,
            paymentId: true,
            sessionId: true,
            refundType: true,
            destination: true,
            status: true,
            amount: true,
            currencyCode: true,
            requestedAt: true,
            processedAt: true,
            failedAt: true,
            customerWalletCreditedAt: true,
            refundReason: true,
            providerRefundRef: true,
            metadataJson: true,
            createdAt: true,
          },
        },
        events: {
          orderBy: [{ createdAt: 'asc' }],
          take: 100,
          select: {
            id: true,
            eventType: true,
            providerEventRef: true,
            reason: true,
            occurredAt: true,
            createdAt: true,
          },
        },
        walletEntries: {
          orderBy: [{ occurredAt: 'asc' }],
          take: 100,
          select: {
            id: true,
            entryType: true,
            direction: true,
            amount: true,
            currencyCode: true,
            occurredAt: true,
            createdAt: true,
          },
        },
        webhookReceipts: {
          orderBy: [{ receivedAt: 'asc' }],
          take: 100,
          select: {
            id: true,
            providerEventRef: true,
            receivedAt: true,
            processedAt: true,
          },
        },
        operationalExceptions: {
          orderBy: [{ createdAt: 'desc' }],
          take: 20,
          select: {
            id: true,
            type: true,
            status: true,
            provider: true,
            ownerUserId: true,
            reason: true,
            resolutionNote: true,
            createdAt: true,
            resolvedAt: true,
          },
        },
      },
    });
  }

  findBySessionId(sessionId: string) {
    return this.prisma.payment.findMany({
      where: { sessionId },
      include: this.paymentInclude,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  findLatestActiveBySessionId(
    sessionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).payment.findFirst({
      where: {
        sessionId,
        status: {
          in: [
            PaymentStatus.CREATED,
            PaymentStatus.PENDING,
            PaymentStatus.REQUIRES_ACTION,
            PaymentStatus.AUTHORIZED,
          ],
        },
      },
      include: this.paymentInclude,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  findSuccessfulBySessionId(sessionId: string) {
    return this.prisma.payment.findFirst({
      where: {
        sessionId,
        status: {
          in: [PaymentStatus.AUTHORIZED, PaymentStatus.CAPTURED],
        },
      },
      include: this.paymentInclude,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  listPatientPayments(input: {
    patientId: string;
    status?: PaymentStatus;
    search?: string;
    currencyCode?: 'EGP' | 'USD';
    dateFrom?: Date;
    dateTo?: Date;
    skip: number;
    take: number;
  }) {
    const where: Prisma.PaymentWhereInput = {
      patientId: input.patientId,
      status: input.status,
      currencyCode: input.currencyCode,
    };

    if (input.dateFrom || input.dateTo) {
      where.createdAt = {
        ...(input.dateFrom ? { gte: input.dateFrom } : {}),
        ...(input.dateTo ? { lte: input.dateTo } : {}),
      };
    }

    const search = input.search?.trim();
    if (search) {
      const searchFilters: Prisma.PaymentWhereInput[] = [
        { providerPaymentRef: { contains: search, mode: 'insensitive' } },
        { providerOrderRef: { contains: search, mode: 'insensitive' } },
        { session: { sessionCode: { contains: search, mode: 'insensitive' } } },
        {
          session: {
            practitioner: {
              user: { displayName: { contains: search, mode: 'insensitive' } },
            },
          },
        },
        {
          patientPackagePurchase: {
            titleSnapshot: { contains: search, mode: 'insensitive' },
          },
        },
        {
          patientPackagePurchase: {
            planCodeSnapshot: { contains: search, mode: 'insensitive' },
          },
        },
        {
          academyProgramEnrollment: {
            academyProgram: {
              OR: [
                { titleAr: { contains: search, mode: 'insensitive' } },
                { titleEn: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
      if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(search)) {
        searchFilters.unshift({ id: search });
      }
      where.OR = searchFilters;
    }

    return Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: input.skip,
        take: input.take,
        include: {
          ...this.paymentInclude,
          session: {
            select: {
              id: true,
              sessionCode: true,
              status: true,
              expiresAt: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.payment.count({ where }),
    ]);
  }

  updateStatus(
    paymentId: string,
    data: Prisma.PaymentUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).payment.update({
      where: { id: paymentId },
      data,
      include: this.paymentInclude,
    });
  }

  findByProviderReference(
    provider: PaymentProvider,
    providerPaymentRef: string,
  ) {
    return this.prisma.payment.findFirst({
      where: {
        provider,
        OR: [
          ...(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(providerPaymentRef)
            ? [{ id: providerPaymentRef }]
            : []),
          {
            providerPaymentRef,
          },
          {
            providerOrderRef: providerPaymentRef,
          },
          {
            metadataJson: {
              path: ['paymobSpecialReference'],
              equals: providerPaymentRef,
            },
          },
          {
            metadataJson: {
              path: ['paymobIntentionId'],
              equals: providerPaymentRef,
            },
          },
          {
            metadataJson: {
              path: ['paymobClientSecret'],
              equals: providerPaymentRef,
            },
          },
        ],
      },
      include: this.paymentInclude,
    });
  }

  findByProviderPaymentRef(
    provider: PaymentProvider,
    providerPaymentRef: string,
  ) {
    return this.prisma.payment.findUnique({
      where: {
        provider_providerPaymentRef: {
          provider,
          providerPaymentRef,
        },
      },
      include: this.paymentInclude,
    });
  }

  findEventByProviderEventRef(providerEventRef: string) {
    return this.prisma.paymentEvent.findFirst({
      where: {
        providerEventRef,
      },
    });
  }

  findWebhookReceipt(
    provider: PaymentProvider,
    providerEventRef: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).paymentWebhookReceipt.findUnique({
      where: {
        provider_providerEventRef: { provider, providerEventRef },
      },
    });
  }

  createWebhookReceipt(
    data: Prisma.PaymentWebhookReceiptUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).paymentWebhookReceipt.create({ data });
  }

  createEvent(
    data: Prisma.PaymentEventUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const actorType =
      data.actorType ??
      (data.eventType === PaymentEventType.PROVIDER_WEBHOOK_RECEIVED
        ? AuditActorType.PAYMENT_WEBHOOK
        : AuditActorType.SYSTEM);
    const sanitizedPayload =
      data.payloadJson === undefined
        ? undefined
        : sanitizeFinanceAuditMetadata(data.payloadJson);
    return this.getDb(tx).paymentEvent.create({
      data: {
        ...data,
        actorType,
        source:
          data.source ??
          (actorType === AuditActorType.PAYMENT_WEBHOOK
            ? SecurityAuditSource.PAYMENT_WEBHOOK
            : SecurityAuditSource.SYSTEM),
        payloadJson:
          sanitizedPayload === undefined
            ? undefined
            : sanitizedPayload === null
              ? Prisma.JsonNull
              : (sanitizedPayload as Prisma.InputJsonValue),
      },
    });
  }

  findLatestActiveBySessionIdInTransaction(
    sessionId: string,
    tx: Prisma.TransactionClient,
  ) {
    return this.findLatestActiveBySessionIdWithDb(sessionId, tx);
  }

  private findLatestActiveBySessionIdWithDb(sessionId: string, db: DbClient) {
    return db.payment.findFirst({
      where: {
        sessionId,
        status: {
          in: [
            PaymentStatus.CREATED,
            PaymentStatus.PENDING,
            PaymentStatus.REQUIRES_ACTION,
            PaymentStatus.AUTHORIZED,
          ],
        },
      },
      include: this.paymentInclude,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  findLatestProviderWebhookEventByPaymentId(paymentId: string) {
    return this.prisma.paymentEvent.findFirst({
      where: {
        paymentId,
        eventType: PaymentEventType.PROVIDER_WEBHOOK_RECEIVED,
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  findRefundById(refundId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).refund.findUnique({
      where: { id: refundId },
      include: { session: { select: { sessionCode: true } } },
    });
  }

  listRefundsByPaymentId(paymentId: string) {
    return this.prisma.refund.findMany({
      where: { paymentId },
      include: { session: { select: { sessionCode: true } } },
      orderBy: [{ requestedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findActiveRefundByPaymentId(
    paymentId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).refund.findFirst({
      where: {
        paymentId,
        status: {
          in: [RefundStatus.REQUESTED, RefundStatus.PROCESSING],
        },
      },
      orderBy: [{ requestedAt: 'desc' }],
    });
  }

  sumSucceededRefundAmountByPaymentId(
    paymentId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).refund.aggregate({
      where: {
        paymentId,
        status: RefundStatus.SUCCEEDED,
      },
      _sum: {
        amount: true,
      },
    });
  }

  createRefund(
    data: Prisma.RefundUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    if (!data.actorType || !data.actorUserId) {
      throw new Error('Refund creation requires explicit actor context');
    }
    return this.getDb(tx).refund.create({
      data,
    });
  }

  updateRefund(
    refundId: string,
    data: Prisma.RefundUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).refund.update({
      where: { id: refundId },
      data,
    });
  }

  createRefundEvent(
    data: Prisma.RefundEventUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).refundEvent.create({
      data: {
        ...data,
        metadataJson:
          data.metadataJson === undefined
            ? undefined
            : ((sanitizeFinanceAuditMetadata(
                data.metadataJson,
              ) as Prisma.InputJsonValue | null) ?? Prisma.JsonNull),
      },
    });
  }

  private readonly paymentInclude = {
    session: {
      select: {
        id: true,
        sessionCode: true,
        status: true,
        expiresAt: true,
      },
    },
    refunds: {
      select: {
        id: true,
        paymentId: true,
        sessionId: true,
        refundType: true,
        destination: true,
        status: true,
        amount: true,
        currencyCode: true,
        refundReason: true,
        processedAt: true,
        requestedAt: true,
        failedAt: true,
        customerWalletCreditedAt: true,
        createdAt: true,
        session: { select: { sessionCode: true } },
      },
      orderBy: [{ processedAt: 'desc' }],
    },
  } satisfies Prisma.PaymentInclude;
}
