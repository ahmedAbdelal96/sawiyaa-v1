import { Injectable } from '@nestjs/common';
import {
  Prisma,
  PractitionerRecoveryActionType,
  PractitionerRecoveryReasonCode,
  PractitionerRecoveryStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditActorType as AuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PractitionerRecoveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  create(
    data: Prisma.PractitionerRecoveryUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerRecovery.create({
      data,
      include: this.include,
    });
  }

  createAction(
    data: Prisma.PractitionerRecoveryActionUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    if (
      (data.actionType === PractitionerRecoveryActionType.MANUALLY_COLLECTED ||
        data.actionType === PractitionerRecoveryActionType.WAIVED) &&
      !data.performedByUserId
    ) {
      throw new Error('Manual recovery action requires an operator user');
    }
    return this.getDb(tx).practitionerRecoveryAction.create({
      data: {
        ...data,
        actorType: data.actorType ?? (data.performedByUserId ? AuditActorType.USER : AuditActorType.SYSTEM),
        actorUserId: data.actorUserId ?? data.performedByUserId ?? null,
        source: data.source ?? (data.performedByUserId ? SecurityAuditSource.HTTP_REQUEST : SecurityAuditSource.SYSTEM),
      },
      include: this.actionInclude,
    });
  }

  findById(id: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerRecovery.findUnique({
      where: { id },
      include: this.include,
    });
  }

  findByRefundId(refundId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerRecovery.findUnique({
      where: { refundId },
      include: this.include,
    });
  }

  findByIdempotencyKey(idempotencyKey: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerRecovery.findUnique({
      where: { idempotencyKey },
      include: this.include,
    });
  }

  findActionByIdempotencyKey(
    idempotencyKey: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerRecoveryAction.findUnique({
      where: { idempotencyKey },
      include: this.actionInclude,
    });
  }

  listRecoveries(input: {
    practitionerId?: string;
    currencyCode?: string;
    status?: PractitionerRecoveryStatus;
    reasonCode?: PractitionerRecoveryReasonCode;
    refundId?: string;
    paymentId?: string;
    sessionId?: string;
    createdFrom?: Date;
    createdTo?: Date;
    skip: number;
    take: number;
    tx?: Prisma.TransactionClient;
  }) {
    const db = this.getDb(input.tx);
    const where: Prisma.PractitionerRecoveryWhereInput = {
      practitionerId: input.practitionerId,
      currencyCode: input.currencyCode,
      status: input.status,
      reasonCode: input.reasonCode,
      refundId: input.refundId,
      paymentId: input.paymentId,
      sessionId: input.sessionId,
    };

    if (input.createdFrom || input.createdTo) {
      where.createdAt = {
        ...(input.createdFrom ? { gte: input.createdFrom } : {}),
        ...(input.createdTo ? { lte: input.createdTo } : {}),
      };
    }

    return Promise.all([
      db.practitionerRecovery.findMany({
        where,
        skip: input.skip,
        take: input.take,
        include: this.include,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      db.practitionerRecovery.count({ where }),
    ]);
  }

  listRecoveriesForExport(input: {
    practitionerId?: string;
    currencyCode?: string;
    status?: PractitionerRecoveryStatus;
    reasonCode?: PractitionerRecoveryReasonCode;
    refundId?: string;
    paymentId?: string;
    sessionId?: string;
    createdFrom?: Date;
    createdTo?: Date;
    tx?: Prisma.TransactionClient;
  }) {
    const db = this.getDb(input.tx);
    const where: Prisma.PractitionerRecoveryWhereInput = {
      practitionerId: input.practitionerId,
      currencyCode: input.currencyCode,
      status: input.status,
      reasonCode: input.reasonCode,
      refundId: input.refundId,
      paymentId: input.paymentId,
      sessionId: input.sessionId,
    };

    if (input.createdFrom || input.createdTo) {
      where.createdAt = {
        ...(input.createdFrom ? { gte: input.createdFrom } : {}),
        ...(input.createdTo ? { lte: input.createdTo } : {}),
      };
    }

    return db.practitionerRecovery.findMany({
      where,
      include: this.include,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
  }

  listOpenRecoveries(
    practitionerId: string,
    currencyCode: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerRecovery.findMany({
      where: {
        practitionerId,
        currencyCode,
        status: {
          in: [PractitionerRecoveryStatus.OPEN, PractitionerRecoveryStatus.PARTIALLY_RECOVERED],
        },
      },
      include: this.include,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  summarizeOutstanding(input: {
    practitionerId: string;
    currencyCode: string;
    tx?: Prisma.TransactionClient;
  }) {
    return this.getDb(input.tx).practitionerRecovery.findMany({
      where: {
        practitionerId: input.practitionerId,
        currencyCode: input.currencyCode,
        status: {
          in: [PractitionerRecoveryStatus.OPEN, PractitionerRecoveryStatus.PARTIALLY_RECOVERED],
        },
      },
      select: {
        amount: true,
        recoveredAmount: true,
        status: true,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  update(
    id: string,
    data: Prisma.PractitionerRecoveryUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerRecovery.update({
      where: { id },
      data,
      include: this.include,
    });
  }

  listActionsByRecoveryId(recoveryId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerRecoveryAction.findMany({
      where: { recoveryId },
      include: this.actionInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  listActionsByPayoutId(payoutId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerRecoveryAction.findMany({
      where: { payoutId },
      include: this.actionInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  private readonly include = {
    practitioner: {
      select: {
        id: true,
        publicSlug: true,
        professionalTitle: true,
        user: {
          select: {
            displayName: true,
          },
        },
      },
    },
    session: {
      select: {
        id: true,
        sessionCode: true,
        status: true,
        paymentCoverageType: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
        completedAt: true,
      },
    },
    payment: {
      select: {
        id: true,
        status: true,
        paymentPurpose: true,
        provider: true,
        providerPaymentRef: true,
        amountTotal: true,
        currencyCode: true,
        providerOrderRef: true,
        initiatedAt: true,
        capturedAt: true,
        failedAt: true,
        expiredAt: true,
      },
    },
    refund: {
      select: {
        id: true,
        amount: true,
        currencyCode: true,
        status: true,
        requestedAt: true,
        processedAt: true,
        paymentId: true,
      },
    },
    sessionEarningReview: {
      select: {
        id: true,
        reviewStatus: true,
        reviewDecision: true,
        sourceType: true,
      },
    },
    settlement: {
      select: {
        id: true,
        status: true,
        amountNet: true,
        amountPaidTotal: true,
        currencyCode: true,
      },
    },
    createdByUser: {
      select: {
        id: true,
        displayName: true,
      },
    },
    resolvedByUser: {
      select: {
        id: true,
        displayName: true,
      },
    },
    actions: {
      select: {
        id: true,
        actionType: true,
        amount: true,
        payoutId: true,
        reason: true,
        performedByUserId: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    },
  } satisfies Prisma.PractitionerRecoveryInclude;

  private readonly actionInclude = {
    recovery: {
      select: {
        id: true,
        practitionerId: true,
        currencyCode: true,
        status: true,
      },
    },
    performedByUser: {
      select: {
        id: true,
        displayName: true,
      },
    },
  } satisfies Prisma.PractitionerRecoveryActionInclude;
}
