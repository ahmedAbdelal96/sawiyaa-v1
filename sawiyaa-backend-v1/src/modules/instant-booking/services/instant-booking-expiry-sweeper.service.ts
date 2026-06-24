import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { InstantBookingRequestRepository } from '../repositories/instant-booking-request.repository';
import { ExpireInstantBookingRequestUseCase } from '../use-cases/expire-instant-booking-request.use-case';

const SWEEP_INTERVAL_MS = 60_000;
const SWEEP_BATCH_SIZE = 50;

@Injectable()
export class InstantBookingExpirySweeperService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(InstantBookingExpirySweeperService.name);
  private intervalHandle: NodeJS.Timeout | null = null;
  private isSweeping = false;

  constructor(
    private readonly requestRepository: InstantBookingRequestRepository,
    private readonly expireInstantBookingRequestUseCase: ExpireInstantBookingRequestUseCase,
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
        const dueRequests =
          await this.requestRepository.listPendingRequestsDueForExpiry(
            now,
            SWEEP_BATCH_SIZE,
          );

        if (dueRequests.length === 0) {
          break;
        }

        for (const request of dueRequests) {
          try {
            await this.expireInstantBookingRequestUseCase.execute({
              requestId: request.id,
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
              `Failed to expire instant booking request during sweep: ${request.id}`,
              error instanceof Error ? error.stack ?? error.message : undefined,
            );
          }
        }

        if (dueRequests.length < SWEEP_BATCH_SIZE) {
          break;
        }
      }

      if (expiredCount > 0) {
        this.logger.log(
          `Expired ${expiredCount} instant booking requests during sweep`,
        );
      }

      return expiredCount;
    } finally {
      this.isSweeping = false;
    }
  }
}
