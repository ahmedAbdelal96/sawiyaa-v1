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
    this.adapters.set(dailyAdapter.provider, dailyAdapter);
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
}
