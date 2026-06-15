import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionProvider } from '@prisma/client';

@Injectable()
export class SessionVideoProviderResolverService {
  constructor(private readonly configService: ConfigService) {}

  resolveDefaultProviderForSession(input: {
    provider: SessionProvider;
  }): SessionProvider {
    if (input.provider !== SessionProvider.NONE) {
      return input.provider;
    }

    return this.resolveDefaultProvider();
  }

  resolvePreparedProviderForSession(input: {
    provider: SessionProvider;
  }): SessionProvider {
    return this.resolveDefaultProviderForSession(input);
  }

  resolveDefaultProvider(): SessionProvider {
    const configuredProvider = this.normalizeProvider(
      this.configService.get<string>('video.defaultProvider'),
    );

    return configuredProvider ?? SessionProvider.DAILY;
  }

  private normalizeProvider(
    value: string | null | undefined,
  ): SessionProvider | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim().toUpperCase();
    // ZOOM is not supported in Phase 1 — treat it as unknown so DAILY fallback is used.
    if (normalized === 'ZOOM') {
      return null;
    }

    return Object.values(SessionProvider).includes(
      normalized as SessionProvider,
    )
      ? (normalized as SessionProvider)
      : null;
  }
}
