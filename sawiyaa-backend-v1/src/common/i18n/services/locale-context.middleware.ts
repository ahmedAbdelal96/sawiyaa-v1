import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { LocaleResolverService } from './locale-resolver.service';

/**
 * Locale middleware resolves the request locale once and attaches it to the request context.
 * Other modules should read `request.locale` or use the `@CurrentLocale()` decorator instead of parsing headers again.
 */
@Injectable()
export class LocaleContextMiddleware implements NestMiddleware {
  constructor(private readonly localeResolverService: LocaleResolverService) {}

  async use(
    request: AuthenticatedRequest,
    _response: Response,
    next: NextFunction,
  ): Promise<void> {
    request.locale = await this.localeResolverService.resolveLocale(
      request.headers,
    );
    next();
  }
}
