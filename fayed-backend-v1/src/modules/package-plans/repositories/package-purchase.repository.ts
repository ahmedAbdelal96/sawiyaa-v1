import { Injectable } from '@nestjs/common';
import { PatientPackagePurchaseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PatientPackagePurchaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  create(
    data: Prisma.PatientPackagePurchaseUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).patientPackagePurchase.create({
      data,
      include: this.purchaseInclude,
    });
  }

  listByPatient(input: {
    patientId: string;
    skip: number;
    take: number;
    tx?: Prisma.TransactionClient;
  }) {
    const db = this.getDb(input.tx);
    const where: Prisma.PatientPackagePurchaseWhereInput = {
      patientId: input.patientId,
    };

    return Promise.all([
      db.patientPackagePurchase.findMany({
        where,
        skip: input.skip,
        take: input.take,
        orderBy: [{ createdAt: 'desc' }, { updatedAt: 'desc' }],
        include: this.purchaseInclude,
      }),
      db.patientPackagePurchase.count({ where }),
    ]);
  }

  findByIdForPatient(
    input: {
      purchaseId: string;
      patientId: string;
      tx?: Prisma.TransactionClient;
    },
  ) {
    return this.getDb(input.tx).patientPackagePurchase.findFirst({
      where: {
        id: input.purchaseId,
        patientId: input.patientId,
      },
      include: this.purchaseInclude,
    });
  }

  findById(
    purchaseId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).patientPackagePurchase.findUnique({
      where: { id: purchaseId },
      include: this.purchaseInclude,
    });
  }

  findByPaymentId(
    paymentId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).patientPackagePurchase.findFirst({
      where: { paymentId },
      include: this.purchaseInclude,
    });
  }

  listDueForExpiry(input: {
    now: Date;
    take: number;
    tx?: Prisma.TransactionClient;
  }) {
    return this.getDb(input.tx).patientPackagePurchase.findMany({
      where: {
        status: PatientPackagePurchaseStatus.PENDING_PAYMENT,
        paymentExpiresAt: {
          lte: input.now,
        },
      },
      orderBy: [{ paymentExpiresAt: 'asc' }, { createdAt: 'asc' }],
      take: input.take,
      select: {
        id: true,
        patientId: true,
        status: true,
        paymentExpiresAt: true,
      },
    });
  }

  updateExpiryStatus(
    purchaseId: string,
    data: Prisma.PatientPackagePurchaseUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.updateStatus(purchaseId, data, tx);
  }

  updatePaymentInitiation(
    purchaseId: string,
    data: Prisma.PatientPackagePurchaseUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
    ) {
    return this.getDb(tx).patientPackagePurchase.update({
      where: { id: purchaseId },
      data,
      include: this.purchaseInclude,
    });
  }

  updateStatus(
    purchaseId: string,
    data: Prisma.PatientPackagePurchaseUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).patientPackagePurchase.update({
      where: { id: purchaseId },
      data,
      include: this.purchaseInclude,
    });
  }

  private readonly purchaseInclude = {
    payment: {
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
        providerCustomerRef: true,
        createdAt: true,
        initiatedAt: true,
        capturedAt: true,
        failedAt: true,
        expiredAt: true,
        metadataJson: true,
      },
    },
    practitioner: {
      select: {
        id: true,
        publicSlug: true,
        acceptsPackages: true,
        countryId: true,
        country: {
          select: {
            isoCode: true,
            currencyCode: true,
          },
        },
        user: {
          select: {
            displayName: true,
            status: true,
            timezone: true,
          },
        },
      },
    },
    packagePlan: {
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        sessionCount: true,
        discountPercent: true,
      },
    },
    sessions: {
      orderBy: [{ packageSessionIndex: 'asc' as const }, { scheduledStartAt: 'asc' as const }],
      select: {
        id: true,
        sessionCode: true,
        status: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
        durationMinutes: true,
        sessionMode: true,
        packageSessionIndex: true,
        packageSessionCount: true,
      },
    },
  } satisfies Prisma.PatientPackagePurchaseInclude;
}
