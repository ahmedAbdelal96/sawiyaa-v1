import { Injectable } from '@nestjs/common';
import {
  PaymentEventType,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  RefundStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

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

  findById(paymentId: string) {
    return this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: this.paymentInclude,
    });
  }

  findAdminOpsById(paymentId: string) {
    return this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
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
        session: {
          select: {
            id: true,
            status: true,
            sessionMode: true,
            scheduledStartAt: true,
            scheduledEndAt: true,
            provider: true,
            providerRoomId: true,
            providerSessionRef: true,
          },
        },
        refunds: {
          orderBy: [{ requestedAt: 'desc' }],
          select: {
            id: true,
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
          },
        },
        events: {
          orderBy: [{ createdAt: 'desc' }],
          take: 15,
          select: {
            id: true,
            eventType: true,
            providerEventRef: true,
            createdAt: true,
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

  findLatestActiveBySessionId(sessionId: string) {
    return this.prisma.payment.findFirst({
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
    skip: number;
    take: number;
  }) {
    const where: Prisma.PaymentWhereInput = {
      patientId: input.patientId,
      status: input.status,
    };

    return Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: input.skip,
        take: input.take,
        include: this.paymentInclude,
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

  createEvent(
    data: Prisma.PaymentEventUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).paymentEvent.create({ data });
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

  findRefundById(refundId: string) {
    return this.prisma.refund.findUnique({
      where: { id: refundId },
    });
  }

  listRefundsByPaymentId(paymentId: string) {
    return this.prisma.refund.findMany({
      where: { paymentId },
      orderBy: [{ requestedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findActiveRefundByPaymentId(paymentId: string) {
    return this.prisma.refund.findFirst({
      where: {
        paymentId,
        status: {
          in: [RefundStatus.REQUESTED, RefundStatus.PROCESSING],
        },
      },
      orderBy: [{ requestedAt: 'desc' }],
    });
  }

  sumSucceededRefundAmountByPaymentId(paymentId: string) {
    return this.prisma.refund.aggregate({
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
    return this.getDb(tx).refund.create({ data });
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

  private readonly paymentInclude = {
    refunds: {
      select: {
        processedAt: true,
      },
      orderBy: [{ processedAt: 'desc' }],
    },
  } satisfies Prisma.PaymentInclude;
}
