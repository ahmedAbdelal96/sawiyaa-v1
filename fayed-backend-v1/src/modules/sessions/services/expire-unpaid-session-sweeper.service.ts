import {
  ConflictException,
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
  NotFoundException,
} from '@nestjs/common';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { SessionRepository } from '../repositories/session.repository';
import { ExpireUnpaidSessionUseCase } from '../use-cases/expire-unpaid-session.use-case';

const SWEEP_INTERVAL_MS = 60_000;
const SWEEP_BATCH_SIZE = 50;

@Injectable()
export class ExpireUnpaidSessionSweeperService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private intervalHandle: NodeJS.Timeout | null = null;
  private isSweeping = false;

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly expireUnpaidSessionUseCase: ExpireUnpaidSessionUseCase,
    private readonly logger: AppLoggerService,
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
        const dueSessions =
          await this.sessionRepository.listPendingPaymentSessionsDueForExpiry({
            now,
            take: SWEEP_BATCH_SIZE,
          });

        if (dueSessions.length === 0) {
          break;
        }

        for (const session of dueSessions) {
          try {
            await this.expireUnpaidSessionUseCase.execute({
              sessionId: session.id,
            });
            expiredCount += 1;
          } catch (error) {
            if (
              error instanceof ConflictException ||
              error instanceof NotFoundException
            ) {
              continue;
            }

            this.logger.error(
              {
                message: 'Failed to expire unpaid session during sweep',
                sessionId: session.id,
                sessionCode: session.sessionCode,
                expiresAt: session.expiresAt?.toISOString() ?? null,
                error,
              },
              undefined,
              'Sessions',
            );
          }
        }

        if (dueSessions.length < SWEEP_BATCH_SIZE) {
          break;
        }
      }

      if (expiredCount > 0) {
        this.logger.info(
          {
            message: 'Expired unpaid sessions sweep completed',
            expiredCount,
          },
          undefined,
          'Sessions',
        );
      }

      return expiredCount;
    } finally {
      this.isSweeping = false;
    }
  }
}
