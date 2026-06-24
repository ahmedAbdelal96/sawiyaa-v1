import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { PatientPackagePurchaseRepository } from '../repositories/package-purchase.repository';
import { ExpirePackagePurchaseUseCase } from '../use-cases/expire-package-purchase.use-case';

const SWEEP_INTERVAL_MS = 60_000;
const SWEEP_BATCH_SIZE = 50;

@Injectable()
export class PackagePurchaseExpirySweeperService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private intervalHandle: NodeJS.Timeout | null = null;
  private isSweeping = false;

  constructor(
    private readonly packagePurchaseRepository: PatientPackagePurchaseRepository,
    private readonly expirePackagePurchaseUseCase: ExpirePackagePurchaseUseCase,
  ) {}

  onApplicationBootstrap(): void {
    void this.sweepOnce();

    this.intervalHandle = setInterval(() => {
      void this.sweepOnce();
    }, SWEEP_INTERVAL_MS);

    this.intervalHandle.unref?.();
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async sweepOnce(now = new Date()): Promise<number> {
    if (this.isSweeping) {
      return 0;
    }

    this.isSweeping = true;

    try {
      let expiredCount = 0;

      while (true) {
        const duePurchases =
          await this.packagePurchaseRepository.listDueForExpiry({
            now,
            take: SWEEP_BATCH_SIZE,
          });

        if (duePurchases.length === 0) {
          break;
        }

        for (const purchase of duePurchases) {
          const result = await this.expirePackagePurchaseUseCase.execute({
            purchaseId: purchase.id,
            now,
          });

          if (result.expired) {
            expiredCount += 1;
          }
        }

        if (duePurchases.length < SWEEP_BATCH_SIZE) {
          break;
        }
      }

      return expiredCount;
    } finally {
      this.isSweeping = false;
    }
  }
}
