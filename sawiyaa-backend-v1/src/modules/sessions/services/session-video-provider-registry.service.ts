import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionProvider } from '@prisma/client';
import { DailySessionVideoProviderAdapter } from '../providers/daily-session-video-provider.adapter';
import { SessionVideoProviderAdapter } from '../providers/session-video-provider.interface';

@Injectable()
export class SessionVideoProviderRegistryService {
  private readonly adapters = new Map<
    SessionProvider,
    SessionVideoProviderAdapter
  >();

  constructor(dailyAdapter: DailySessionVideoProviderAdapter) {
    this.register(dailyAdapter);
  }

  get(provider: SessionProvider): SessionVideoProviderAdapter {
    const adapter = this.adapters.get(provider);

    if (!adapter) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.videoProviderNotSupported',
        error: 'SESSION_VIDEO_PROVIDER_NOT_SUPPORTED',
        messageParams: { provider },
      });
    }

    return adapter;
  }

  has(provider: SessionProvider): boolean {
    return this.adapters.has(provider);
  }

  private register(adapter: SessionVideoProviderAdapter): void {
    this.adapters.set(adapter.provider, adapter);
  }
}
