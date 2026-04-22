import { Injectable, Logger } from '@nestjs/common';
import { messageCatalogs } from '../catalogs';
import { SupportedLocale } from '../types/locale.types';
import { LocaleResolverService } from './locale-resolver.service';

/**
 * I18nService is the common entry point for backend-localized messages.
 * Other modules should store message keys in code and resolve the final string through `t(...)`.
 */
@Injectable()
export class I18nService {
  private readonly logger = new Logger(I18nService.name);

  constructor(private readonly localeResolverService: LocaleResolverService) {}

  t(
    key: string,
    locale?: SupportedLocale,
    params?: Record<string, string | number>,
  ): string {
    const resolvedLocale =
      locale ?? this.localeResolverService.getDefaultLocale();
    const localizedValue =
      this.lookupKey(key, resolvedLocale) ??
      this.lookupKey(key, this.localeResolverService.getDefaultLocale());

    if (typeof localizedValue !== 'string') {
      this.logger.warn(
        `Missing translation key "${key}" for locale "${resolvedLocale}"`,
      );
      return key;
    }

    return this.interpolate(localizedValue, params);
  }

  private lookupKey(key: string, locale: SupportedLocale): unknown {
    return key.split('.').reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object') {
        return undefined;
      }

      return (current as Record<string, unknown>)[segment];
    }, messageCatalogs[locale]);
  }

  private interpolate(
    template: string,
    params?: Record<string, string | number>,
  ): string {
    if (!params) {
      return template;
    }

    return Object.entries(params).reduce((result, [key, value]) => {
      return result.replace(
        new RegExp(`{{\\s*${key}\\s*}}`, 'g'),
        String(value),
      );
    }, template);
  }
}
