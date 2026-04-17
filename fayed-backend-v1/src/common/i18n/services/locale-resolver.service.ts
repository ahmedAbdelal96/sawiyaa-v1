import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SUPPORTED_LOCALES, SupportedLocale } from '../types/locale.types';

/**
 * LocaleResolverService decides which locale should be attached to the request.
 * Resolution order:
 * 1. `x-lang`
 * 2. `accept-language`
 * 3. system default locale from config
 */
@Injectable()
export class LocaleResolverService {
  constructor(private readonly configService: ConfigService) {}

  resolveLocale(headers: Record<string, string | string[] | undefined>): SupportedLocale {
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

    return this.getDefaultLocale();
  }

  getDefaultLocale(): SupportedLocale {
    const configuredDefault = this.configService.get<string>(
      'app.defaultLocale',
      'ar',
    );

    return this.normalizeLocale(configuredDefault) ?? 'ar';
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
