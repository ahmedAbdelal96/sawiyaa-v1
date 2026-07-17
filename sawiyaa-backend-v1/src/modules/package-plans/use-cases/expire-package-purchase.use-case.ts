import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionStatus } from '@prisma/client';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';
import { SessionLifecycleService } from '@modules/sessions/services/session-lifecycle.service';
import { PatientPackagePurchaseRepository } from '../repositories/package-purchase.repository';

const EXPIREABLE_STATUSES = new Set(['PENDING_PAYMENT']);

@Injectable()
export class ExpirePackagePurchaseUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly packagePurchaseRepository: PatientPackagePurchaseRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionLifecycleService: SessionLifecycleService,
  ) {}

  async execute(input: { purchaseId: string; now?: Date }) {
    const now = input.now ?? new Date();
    const purchase = await this.packagePurchaseRepository.findById(
      input.purchaseId,
    );

    if (!purchase) {
      throw new NotFoundException({
        messageKey: 'packagePurchases.errors.notFound',
        error: 'PACKAGE_PURCHASE_NOT_FOUND',
      });
    }

    if (!EXPIREABLE_STATUSES.has(purchase.status)) {
      return {
        expired: false,
        purchase,
      };
    }

    if (!purchase.paymentExpiresAt || purchase.paymentExpiresAt > now) {
      return {
        expired: false,
        purchase,
      };
    }

    const expired = await this.prisma.$transaction(async (tx) => {
      const expiredPurchase =
        await this.packagePurchaseRepository.updateExpiryStatus(
          purchase.id,
          {
            status: 'EXPIRED',
            expiredAt: now,
          },
          tx,
        );

      const linkedSessions = expiredPurchase.sessions.filter(
        (session) => session.status === SessionStatus.PENDING_PAYMENT,
      );

      for (const session of linkedSessions) {
        await this.sessionLifecycleService.transition({
          session,
          to: SessionStatus.EXPIRED,
          at: now,
          metadata: {
            expiredAt: now.toISOString(),
            source: 'package-purchase-expiry',
            packagePurchaseId: expiredPurchase.id,
          },
          tx,
        });
      }

      return expiredPurchase;
    });

    return {
      expired: true,
      purchase: expired,
    };
  }
}
