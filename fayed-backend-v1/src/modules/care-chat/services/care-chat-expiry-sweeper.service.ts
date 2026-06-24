import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { CareChatRequestRepository } from '../repositories/care-chat-request.repository';

const CARE_CHAT_EXPIRY_SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const CARE_CHAT_EXPIRY_SWEEP_INITIAL_DELAY_MS = 3 * 60 * 1000;

@Injectable()
export class CareChatExpirySweeperService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(CareChatExpirySweeperService.name);
  private intervalHandle: NodeJS.Timeout | null = null;
  private timeoutHandle: NodeJS.Timeout | null = null;
  private isSweeping = false;

  constructor(
    private readonly careChatRequestRepository: CareChatRequestRepository,
  ) {}

  onApplicationBootstrap(): void {
    this.timeoutHandle = setTimeout(() => {
      void this.sweepOnce();

      this.intervalHandle = setInterval(() => {
        void this.sweepOnce();
      }, CARE_CHAT_EXPIRY_SWEEP_INTERVAL_MS);

      this.intervalHandle.unref?.();
    }, CARE_CHAT_EXPIRY_SWEEP_INITIAL_DELAY_MS);

    this.timeoutHandle.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }

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
      this.logger.log('Care chat expiry sweep started');

      const result = await this.careChatRequestRepository.expirePendingDueRequests(
        { now },
      );

      this.logger.log(`Care chat expiry sweep completed: expired=${result.count}`);

      return result.count;
    } catch (error) {
      this.logger.error(
        `Care chat expiry sweep failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return 0;
    } finally {
      this.isSweeping = false;
    }
  }
}
