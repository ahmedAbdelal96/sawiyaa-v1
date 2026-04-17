import {
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { AuthRequestContextService } from './auth-request-context.service';

/**
 * This middleware opportunistically hydrates request.user from access or refresh tokens.
 * Invalid tokens are ignored here so public routes keep working; guards decide when auth is mandatory.
 */
@Injectable()
export class AuthRequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthRequestContextMiddleware.name);

  constructor(
    private readonly authRequestContextService: AuthRequestContextService,
  ) {}

  async use(
    request: AuthenticatedRequest,
    _response: Response,
    next: NextFunction,
  ): Promise<void> {
    const header = request.headers.authorization;
    const bearerToken = header?.startsWith('Bearer ') ? header.slice(7) : null;
    const bodyRefreshToken =
      typeof request.body?.refreshToken === 'string'
        ? request.body.refreshToken
        : null;
    const token = bearerToken ?? bodyRefreshToken;

    if (!token) {
      next();
      return;
    }

    const tokenTypes: Array<'access' | 'refresh'> = bearerToken
      ? ['access', 'refresh']
      : ['refresh'];

    for (const tokenType of tokenTypes) {
      try {
        await this.authRequestContextService.attachUserToRequest(
          request,
          token,
          tokenType,
        );
        next();
        return;
      } catch {
        // Swallow here so public routes do not fail just because a stale token was attached.
      }
    }

    this.logger.debug('Incoming auth token could not be hydrated into request.user');
    next();
  }
}
