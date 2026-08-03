import { Injectable, OnModuleInit } from '@nestjs/common';
import { SUPPORTED_LOCALES, SupportedLocale } from '../types/locale.types';
import { ConfigRuntimeService } from '@modules/config/services/config-runtime.service';

/**
 * LocaleResolverService decides which locale should be attached to the request.
 * Resolution order:
 * 1. `x-lang`
 * 2. `accept-language`
 * 3. system default locale from config
 */
@Injectable()
export class LocaleResolverService implements OnModuleInit {
  private cachedDefaultLocale: SupportedLocale = 'ar';

  constructor(private readonly configRuntimeService: ConfigRuntimeService) {}

  async onModuleInit(): Promise<void> {
    await this.refreshDefaultLocale();
  }

  async resolveLocale(
    headers: Record<string, string | string[] | undefined>,
  ): Promise<SupportedLocale> {
    const headerValue = Array.isArray(headers['x-lang'])
      ? headers['x-lang'][0]
      : headers['x-lang'];
    const headerLocale = this.normalizeLocale(headerValue);

    if (headerLocale) {
      return headerLocale;
    }

    const acceptLanguageLocale = this.resolveFromAcceptLanguage(
      headers['accept-language'],
    );

    if (acceptLanguageLocale) {
      return acceptLanguageLocale;
    }

    return this.refreshDefaultLocale();
  }

  getDefaultLocale(): SupportedLocale {
    return this.cachedDefaultLocale;
  }

  private async refreshDefaultLocale(): Promise<SupportedLocale> {
    try {
      const configuredDefault =
        await this.configRuntimeService.getRequiredString(
          'platform.defaultLocale',
        );
      this.cachedDefaultLocale =
        this.normalizeLocale(configuredDefault) ?? 'ar';
    } catch {
      // Keep the process usable while the catalog is unavailable during bootstrap.
      this.cachedDefaultLocale = 'ar';
    }

    return this.cachedDefaultLocale;
  }

  private resolveFromAcceptLanguage(
    headerValue: string | string[] | undefined,
  ): SupportedLocale | null {
    const rawValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!rawValue) {
      return null;
    }

    const candidates = rawValue
      .split(',')
      .map((item) => item.trim().split(';')[0])
      .filter(Boolean);

    for (const candidate of candidates) {
      const normalized = this.normalizeLocale(candidate);

      if (normalized) {
        return normalized;
      }
    }

    return null;
  }

  private normalizeLocale(value?: string | null): SupportedLocale | null {
    if (!value) {
      return null;
    }

    const normalized = value.toLowerCase().split('-')[0];

    return SUPPORTED_LOCALES.includes(normalized as SupportedLocale)
      ? (normalized as SupportedLocale)
      : null;
  }
}
