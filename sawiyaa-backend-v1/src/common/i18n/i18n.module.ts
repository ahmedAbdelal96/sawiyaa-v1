import { Global, Module } from '@nestjs/common';
import { I18nService } from './services/i18n.service';
import { LocaleResolverService } from './services/locale-resolver.service';
import { LocaleContextMiddleware } from './services/locale-context.middleware';

@Global()
@Module({
  providers: [LocaleResolverService, I18nService, LocaleContextMiddleware],
  exports: [LocaleResolverService, I18nService, LocaleContextMiddleware],
})
export class I18nModule {}
