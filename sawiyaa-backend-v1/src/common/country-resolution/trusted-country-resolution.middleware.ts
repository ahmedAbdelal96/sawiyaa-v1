import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TrustedCountryResolutionService } from './trusted-country-resolution.service';
import { COUNTRY_CONTEXT_KEY } from '@modules/auth/utils/request-country-context.util';

@Injectable()
export class TrustedCountryResolutionMiddleware implements NestMiddleware {
  constructor(private readonly resolver: TrustedCountryResolutionService) {}

  use(request: Request, _response: Response, next: NextFunction): void {
    (request as Request & { [COUNTRY_CONTEXT_KEY]?: ReturnType<TrustedCountryResolutionService['resolve']> })[
      COUNTRY_CONTEXT_KEY
    ] = this.resolver.resolve(request);
    next();
  }
}
