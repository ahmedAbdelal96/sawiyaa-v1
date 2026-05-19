import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, Prisma, SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { PackageSettlementService } from '../services/package-settlement.service';

@Injectable()
export class PostPackageSessionLedgerEntriesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly packageSettlementService: PackageSettlementService,
  ) {}

  async execute(input: { sessionId: string; tx?: Prisma.TransactionClient }) {
    const db = input.tx ?? this.prisma;
    const session = await db.session.findUnique({
      where: { id: input.sessionId },
      include: {
        packagePurchase: {
          include: {
            payment: {
              select: {
                id: true,
                status: true,
                currencyCode: true,
              },
            },
            packagePlan: {
              select: {
                code: true,
              },
            },
            sessions: {
              orderBy: [{ packageSessionIndex: 'asc' }],
              select: {
                id: true,
                status: true,
                packageSessionIndex: true,
                packageSessionCount: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_NOT_FOUND',
      });
    }

    if (
      session.paymentCoverageType !== 'PACKAGE' ||
      !session.packagePurchaseId
    ) {
      return {
        wasAlreadyPosted: true,
        ledgerEntries: [],
        purchase: session.packagePurchase,
      };
    }

    if (!session.packagePurchase) {
      throw new BadRequestException({
        messageKey: 'packagePurchases.errors.notFound',
        error: 'PACKAGE_PURCHASE_NOT_FOUND',
      });
    }

    if (!session.packagePurchase.payment) {
      throw new BadRequestException({
        messageKey: 'packagePurchases.errors.paymentNotCaptured',
        error: 'PACKAGE_PURCHASE_PAYMENT_NOT_CAPTURED',
      });
    }

    if (session.packagePurchase.payment.status !== PaymentStatus.CAPTURED) {
      throw new BadRequestException({
        messageKey: 'packagePurchases.errors.paymentNotCaptured',
        error: 'PACKAGE_PURCHASE_PAYMENT_NOT_CAPTURED',
      });
    }

    if (
      session.status !== SessionStatus.COMPLETED ||
      !session.packageSessionIndex ||
      !session.packageSessionCount
    ) {
      throw new BadRequestException({
        messageKey: 'sessions.errors.invalidStatusTransition',
        error: 'SESSION_PACKAGE_SESSION_NOT_COMPLETED',
      });
    }

    if (
      session.packagePurchase.status !== 'ACTIVE' &&
      session.packagePurchase.status !== 'COMPLETED'
    ) {
      throw new BadRequestException({
        messageKey: 'packagePurchases.errors.notPayable',
        error: 'PACKAGE_PURCHASE_NOT_ACTIVE',
      });
    }

    const purchase = session.packagePurchase;
    if (!purchase.payment) {
      throw new BadRequestException({
        messageKey: 'packagePurchases.errors.paymentNotCaptured',
        error: 'PACKAGE_PURCHASE_PAYMENT_NOT_CAPTURED',
      });
    }

    const completedSessions = purchase.sessions.filter(
      (linkedSession) => linkedSession.status === SessionStatus.COMPLETED,
    );

    await this.packageSettlementService.syncFromPurchase(purchase, db);

    if (
      completedSessions.length === purchase.sessions.length &&
      purchase.status !== 'COMPLETED'
    ) {
      await db.patientPackagePurchase.update({
        where: { id: purchase.id },
        data: {
          status: 'COMPLETED',
          completedAt: purchase.completedAt ?? new Date(),
        },
      });
    }

    return {
      wasAlreadyPosted: true,
      ledgerEntries: [],
      purchase,
    };
  }
}
